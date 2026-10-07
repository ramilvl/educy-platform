import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { sendEnrollmentApprovedEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// POST /api/sections/[id]/enroll-student - Instructor/moderator directly enrolls a student
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only instructors, moderators, and admins can directly enroll students
    if (!['INSTRUCTOR', 'MODERATOR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Only instructors, moderators, and admins can enroll students' },
        { status: 403 }
      )
    }

    const { studentId } = await request.json()

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Student ID is required' }, { status: 400 })
    }

    // Get section with course and instructor info
    const section = await prisma.section.findUnique({
      where: { id: params.id },
      include: {
        course: true,
        instructor: { select: { name: true, email: true } },
        _count: {
          select: { enrollments: { where: { status: 'ENROLLED' } } },
        },
      },
    })

    if (!section) {
      return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 })
    }

    // Check if user has permission to enroll students in this section
    const hasPermission =
      user.role === 'ADMIN' ||
      user.role === 'MODERATOR' ||
      (user.role === 'INSTRUCTOR' && section.instructorId === user.id)

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to enroll students in this section' },
        { status: 403 }
      )
    }

    // Check if student exists and is actually a student
    const student = await prisma.user.findUnique({
      where: { id: studentId },
    })

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 })
    }

    if (student.role !== 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'User is not a student' },
        { status: 400 }
      )
    }

    // Check if already enrolled or pending
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId: studentId,
        sectionId: params.id,
        status: { in: ['ENROLLED', 'PENDING'] },
      },
    })

    if (existingEnrollment) {
      return NextResponse.json(
        { success: false, error: 'Student is already enrolled or has a pending request' },
        { status: 400 }
      )
    }

    // Check capacity
    if (section._count.enrollments >= section.capacity) {
      return NextResponse.json(
        { success: false, error: 'Section is at full capacity' },
        { status: 400 }
      )
    }

    // Create enrollment directly with ENROLLED status (bypass approval)
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: studentId,
        sectionId: params.id,
        status: 'ENROLLED',
        enrolledAt: new Date(),
        enrolledById: user.id, // Track who enrolled this student
      },
      include: {
        user: { select: { name: true, email: true } },
        section: {
          include: {
            course: true,
            instructor: { select: { name: true, email: true } },
          },
        },
      },
    })

    // Log enrollment action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DIRECT_ENROLLMENT_CREATED',
        targetType: 'Enrollment',
        targetId: enrollment.id,
        details: {
          studentId: studentId,
          studentName: enrollment.user.name,
          sectionId: params.id,
          courseCode: section.course.code,
          enrolledBy: user.name,
          enrolledByRole: user.role,
        },
        severity: 'INFO',
        category: 'USER_ACTION',
      },
    })

    // Send approval email to student
    try {
      await sendEnrollmentApprovedEmail({
        to: enrollment.user.email,
        studentName: enrollment.user.name,
        courseCode: enrollment.section.course.code,
        courseTitle: enrollment.section.course.title,
        courseId: enrollment.section.course.id,
      })
    } catch (emailError) {
      console.error('Failed to send enrollment approval email:', emailError)
      // Continue anyway - enrollment succeeded
    }

    return NextResponse.json({
      success: true,
      enrollment,
      message: `${enrollment.user.name} has been successfully enrolled in ${section.course.code}`,
    })
  } catch (error) {
    console.error('Direct enrollment error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to enroll student' },
      { status: 500 }
    )
  }
}
