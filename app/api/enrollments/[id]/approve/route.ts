import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { sendEnrollmentApprovedEmail } from '@/lib/email'
import { rateLimitByIdentifier, RateLimitPresets } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

// POST /api/enrollments/[id]/approve - Approve enrollment request
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only instructors, moderators, and admins can approve enrollments
    if (user.role !== 'INSTRUCTOR' && user.role !== 'MODERATOR' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Rate limiting for enrollment actions
    const rateLimit = rateLimitByIdentifier(
      request,
      'enrollment-approve',
      user.id,
      RateLimitPresets.enrollmentAction
    )
    if (rateLimit) return rateLimit

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

    // Check if user has permission to approve this enrollment
    // Instructors can only approve their own sections, Moderators and Admins can approve any
    if (
      user.role === 'INSTRUCTOR' &&
      enrollment.section.instructorId !== user.id
    ) {
      return NextResponse.json(
        { success: false, error: 'You can only approve enrollments for your own sections' },
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

    // Update enrollment status
    const approvedEnrollment = await prisma.enrollment.update({
      where: { id: params.id },
      data: {
        status: 'ENROLLED',
        enrolledById: user.id, // Track who approved the enrollment
      },
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ENROLLMENT_APPROVED',
        targetType: 'Enrollment',
        targetId: params.id,
        details: {
          studentId: enrollment.user.id,
          studentName: enrollment.user.name,
          sectionId: enrollment.section.id,
          courseCode: enrollment.section.course.code,
        },
      },
    })

    // Notify student
    await prisma.notification.create({
      data: {
        userId: enrollment.user.id,
        type: 'ENROLLMENT_APPROVED',
        payload: {
          enrollmentId: params.id,
          courseCode: enrollment.section.course.code,
          courseTitle: enrollment.section.course.title,
          sectionId: enrollment.section.id,
        },
      },
    })

    // Send email notification to student
    sendEnrollmentApprovedEmail({
      to: enrollment.user.email,
      studentName: enrollment.user.name,
      courseCode: enrollment.section.course.code,
      courseTitle: enrollment.section.course.title,
      courseId: enrollment.section.course.id,
    }).catch((error) => {
      console.error(`Failed to send enrollment approval email to ${enrollment.user.email}:`, error)
    })

    return NextResponse.json({
      success: true,
      enrollment: approvedEnrollment,
      message: 'Enrollment approved successfully',
    })
  } catch (error) {
    console.error('Enrollment approval error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to approve enrollment' },
      { status: 500 }
    )
  }
}
