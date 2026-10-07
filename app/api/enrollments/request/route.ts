import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const enrollmentRequestSchema = z.object({
  sectionId: z.string(),
})

// POST /api/enrollments/request - Request enrollment in a section
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only students can request enrollment
    if (user.role !== 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Only students can request enrollment' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = enrollmentRequestSchema.parse(body)

    // Use transaction to prevent race conditions with capacity check
    const enrollment = await prisma.$transaction(async (tx) => {
      // Check enrollment limit from system settings (if available)
      // Wrapped in try-catch to handle missing column during migration
      try {
        const settings = await tx.systemSettings.findFirst()
        if (settings?.maxEnrollmentsPerStudent) {
          const activeEnrollments = await tx.enrollment.count({
            where: {
              userId: user.id,
              status: 'ENROLLED',
            },
          })

          if (activeEnrollments >= settings.maxEnrollmentsPerStudent) {
            throw new Error(`You have reached the maximum of ${settings.maxEnrollmentsPerStudent} active course enrollments. Please complete or withdraw from a course before enrolling in another.`)
          }
        }
      } catch (settingsError) {
        // If settings query fails (e.g., column doesn't exist yet), skip the check
        console.error('System settings check skipped:', settingsError instanceof Error ? settingsError.message : 'Unknown error')
        // Continue without enrollment limit check
      }

      // Get section details within transaction
      const section = await tx.section.findUnique({
        where: { id: data.sectionId },
        include: {
          course: true,
        },
      })

      if (!section) {
        throw new Error('Section not found')
      }

      // Check if already enrolled or pending
      const existing = await tx.enrollment.findUnique({
        where: {
          userId_sectionId: {
            userId: user.id,
            sectionId: data.sectionId,
          },
        },
      })

      if (existing) {
        if (existing.status === 'ENROLLED') {
          throw new Error('You are already enrolled in this section')
        } else if (existing.status === 'PENDING') {
          throw new Error('You already have a pending enrollment request for this section')
        }
      }

      // Check capacity atomically within transaction
      const enrolledCount = await tx.enrollment.count({
        where: {
          sectionId: data.sectionId,
          status: 'ENROLLED',
        },
      })

      if (enrolledCount >= section.capacity) {
        throw new Error('Section is at full capacity')
      }

      // Create enrollment request
      const newEnrollment = await tx.enrollment.create({
        data: {
          userId: user.id,
          sectionId: data.sectionId,
          status: 'PENDING',
          enrolledById: user.id, // Student is enrolling themselves
        },
        include: {
          section: {
            include: {
              course: true,
              instructor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      return newEnrollment
    })

    // Get section info for notification (outside transaction)
    const section = enrollment.section

    // Create audit log (non-critical, don't fail request if this fails)
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'ENROLLMENT_REQUESTED',
          targetType: 'Enrollment',
          targetId: enrollment.id,
          details: {
            sectionId: data.sectionId,
            courseCode: section.course.code,
          },
        },
      })
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError)
      // Continue - audit log failure shouldn't block enrollment
    }

    // Notify instructor (non-critical, don't fail request if this fails)
    try {
      await prisma.notification.create({
        data: {
          userId: section.instructorId,
          type: 'GENERAL',
          payload: {
            message: `New enrollment request from ${user.name} for ${section.course.code}`,
            enrollmentId: enrollment.id,
            studentName: user.name,
            courseCode: section.course.code,
          },
        },
      })
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError)
      // Continue - notification failure shouldn't block enrollment
    }

    return NextResponse.json({
      success: true,
      enrollment,
      message: 'Enrollment request submitted successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    // Handle custom errors from transaction
    if (error instanceof Error) {
      if (error.message === 'Section not found') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        )
      }
      if (
        error.message.includes('already enrolled') ||
        error.message.includes('pending enrollment') ||
        error.message.includes('full capacity') ||
        error.message.includes('maximum') ||
        error.message.includes('reached the maximum')
      ) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 409 }
        )
      }
    }

    console.error('Enrollment request error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name,
    })
    return NextResponse.json(
      { success: false, error: 'Failed to submit enrollment request' },
      { status: 500 }
    )
  }
}
