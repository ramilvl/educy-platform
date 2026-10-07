import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendEnrollmentRejectedEmail } from '@/lib/email'
import { rateLimitByIdentifier, RateLimitPresets } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const rejectSchema = z.object({
  reason: z.string().optional(),
})

// POST /api/enrollments/[id]/reject - Reject enrollment request
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only instructors, moderators, and admins can reject enrollments
    if (user.role !== 'INSTRUCTOR' && user.role !== 'MODERATOR' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Rate limiting for enrollment actions
    const rateLimit = rateLimitByIdentifier(
      request,
      'enrollment-reject',
      user.id,
      RateLimitPresets.enrollmentAction
    )
    if (rateLimit) return rateLimit

    const body = await request.json().catch(() => ({}))
    const data = rejectSchema.parse(body)

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: params.id },
      include: {
        section: {
          include: {
            course: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'Enrollment request not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to reject this enrollment
    // Instructors can only reject their own sections, Moderators and Admins can reject any
    if (
      user.role === 'INSTRUCTOR' &&
      enrollment.section.instructorId !== user.id
    ) {
      return NextResponse.json(
        { success: false, error: 'You can only reject enrollments for your own sections' },
        { status: 403 }
      )
    }

    // Check if already processed
    if (enrollment.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Enrollment request has already been ${enrollment.status.toLowerCase()}` },
        { status: 409 }
      )
    }

    // Delete the enrollment request (rejected enrollments are removed)
    await prisma.enrollment.delete({
      where: { id: params.id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ENROLLMENT_REJECTED',
        targetType: 'Enrollment',
        targetId: params.id,
        details: {
          studentId: enrollment.user.id,
          studentName: enrollment.user.name,
          sectionId: enrollment.section.id,
          courseCode: enrollment.section.course.code,
          reason: data.reason,
        },
      },
    })

    // Notify student
    await prisma.notification.create({
      data: {
        userId: enrollment.user.id,
        type: 'ENROLLMENT_REJECTED',
        payload: {
          courseCode: enrollment.section.course.code,
          courseTitle: enrollment.section.course.title,
          reason: data.reason || 'No reason provided',
        },
      },
    })

    // Send email notification to student
    sendEnrollmentRejectedEmail({
      to: enrollment.user.email,
      studentName: enrollment.user.name,
      courseCode: enrollment.section.course.code,
      courseTitle: enrollment.section.course.title,
      reason: data.reason,
    }).catch((error) => {
      console.error(`Failed to send enrollment rejection email to ${enrollment.user.email}:`, error)
    })

    return NextResponse.json({
      success: true,
      message: 'Enrollment request rejected',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Enrollment rejection error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reject enrollment' },
      { status: 500 }
    )
  }
}
