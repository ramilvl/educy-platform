import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// DELETE /api/enrollments/[id] - Remove student from course
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get enrollment with section and course info
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { name: true, email: true } },
        enrolledBy: { select: { id: true, name: true, email: true, role: true } },
        section: {
          include: {
            course: true,
            instructor: { select: { name: true, email: true } },
          },
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json({ success: false, error: 'Enrollment not found' }, { status: 404 })
    }

    // Check if user has permission:
    // - Students can only remove their own enrollments
    // - Instructors can remove students from their sections
    // - Moderators and admins can remove any enrollment
    const isOwnEnrollment = enrollment.userId === user.id
    const isInstructor = user.role === 'INSTRUCTOR' && enrollment.section.instructorId === user.id
    const isModeratorOrAdmin = user.role === 'ADMIN' || user.role === 'MODERATOR'

    const hasPermission = isOwnEnrollment || isInstructor || isModeratorOrAdmin

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to remove this enrollment' },
        { status: 403 }
      )
    }

    // Delete the enrollment
    await prisma.enrollment.delete({
      where: { id: params.id },
    })

    // Log unenrollment action
    const action = isOwnEnrollment ? 'SELF_UNENROLLED' : 'ENROLLMENT_REMOVED'
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action,
        targetType: 'Enrollment',
        targetId: enrollment.id,
        details: {
          studentId: enrollment.userId,
          studentName: enrollment.user.name,
          sectionId: enrollment.sectionId,
          courseCode: enrollment.section.course.code,
          removedBy: user.name,
          removedByRole: user.role,
          selfUnenrolled: isOwnEnrollment,
        },
        severity: isOwnEnrollment ? 'INFO' : 'WARNING',
        category: 'USER_ACTION',
      },
    })

    // Notify instructor if student left on their own
    if (isOwnEnrollment) {
      await prisma.notification.create({
        data: {
          userId: enrollment.section.instructorId,
          type: 'GENERAL',
          payload: {
            title: 'Student Left Course',
            message: `${enrollment.user.name} has withdrawn from ${enrollment.section.course.code}: ${enrollment.section.course.title}`,
            courseCode: enrollment.section.course.code,
            courseTitle: enrollment.section.course.title,
            studentName: enrollment.user.name,
            studentEmail: enrollment.user.email,
            enrollmentId: params.id,
          },
        },
      })

      // Notify all moderators and admins
      const moderatorsAndAdmins = await prisma.user.findMany({
        where: {
          role: {
            in: ['MODERATOR', 'ADMIN'],
          },
          status: 'ACTIVE',
        },
        select: {
          id: true,
        },
      })

      await Promise.all(
        moderatorsAndAdmins.map((moderator) =>
          prisma.notification.create({
            data: {
              userId: moderator.id,
              type: 'GENERAL',
              payload: {
                title: 'Student Withdrew from Course',
                message: `${enrollment.user.name} withdrew from ${enrollment.section.course.code}: ${enrollment.section.course.title}`,
                courseCode: enrollment.section.course.code,
                courseTitle: enrollment.section.course.title,
                studentName: enrollment.user.name,
                studentEmail: enrollment.user.email,
                instructorName: enrollment.section.instructor.name,
                enrollmentId: params.id,
                action: 'STUDENT_WITHDRAWAL',
              },
            },
          })
        )
      )

      // Notify the person who enrolled this student (if different from student and not already notified)
      if (enrollment.enrolledBy && enrollment.enrolledBy.id !== enrollment.userId && enrollment.enrolledBy.id !== enrollment.section.instructorId) {
        await prisma.notification.create({
          data: {
            userId: enrollment.enrolledBy.id,
            type: 'GENERAL',
            payload: {
              title: 'Student You Enrolled Left Course',
              message: `${enrollment.user.name}, whom you enrolled in ${enrollment.section.course.code}: ${enrollment.section.course.title}, has withdrawn from the course`,
              courseCode: enrollment.section.course.code,
              courseTitle: enrollment.section.course.title,
              studentName: enrollment.user.name,
              studentEmail: enrollment.user.email,
              enrollmentId: params.id,
              action: 'ENROLLED_STUDENT_WITHDRAWAL',
            },
          },
        })
      }
    }

    const message = isOwnEnrollment
      ? `You have successfully left ${enrollment.section.course.code}`
      : `${enrollment.user.name} has been removed from ${enrollment.section.course.code}`

    return NextResponse.json({
      success: true,
      message,
    })
  } catch (error) {
    console.error('Unenrollment error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove student from course' },
      { status: 500 }
    )
  }
}
