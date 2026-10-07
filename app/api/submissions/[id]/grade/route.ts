import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendGradeReceivedEmail } from '@/lib/email'
import { rateLimitByIdentifier, RateLimitPresets } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const gradeSubmissionSchema = z.object({
  grade: z.number().min(0).max(100),
  feedback: z.string().optional(),
})

// PUT /api/submissions/[id]/grade - Grade submission
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInstructor()

    // Rate limiting for grade submission
    const rateLimit = rateLimitByIdentifier(
      request,
      'grade-submission',
      user.id,
      RateLimitPresets.gradeSubmission
    )
    if (rateLimit) return rateLimit

    const body = await request.json()
    const data = gradeSubmissionSchema.parse(body)

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      include: {
        assignment: {
          include: {
            section: {
              include: {
                course: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Check if user is instructor of this section
    if (submission.assignment.section.instructorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Update submission with grade
    const gradedSubmission = await prisma.submission.update({
      where: { id: params.id },
      data: {
        grade: data.grade,
        feedback: data.feedback,
        gradedAt: new Date(),
      },
      include: {
        assignment: {
          include: {
            section: {
              include: {
                course: true,
              },
            },
          },
        },
        student: {
          select: {
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
        action: 'ASSIGNMENT_GRADED',
        targetType: 'Submission',
        targetId: params.id,
        details: {
          grade: data.grade,
          studentName: submission.student.name,
          assignment: submission.assignment.title,
        },
      },
    })

    // Create notification for student
    await prisma.notification.create({
      data: {
        userId: submission.studentId,
        type: 'GRADE_RECEIVED',
        payload: {
          submissionId: params.id,
          assignmentTitle: submission.assignment.title,
          courseCode: submission.assignment.section.course.code,
          grade: data.grade,
        },
      },
    })

    // Send email notification to student
    sendGradeReceivedEmail({
      to: submission.student.email,
      studentName: submission.student.name,
      assignmentTitle: submission.assignment.title,
      courseCode: submission.assignment.section.course.code,
      grade: data.grade,
      feedback: data.feedback,
      assignmentId: submission.assignment.id,
    }).catch((error) => {
      console.error(`Failed to send grade email to ${submission.student.email}:`, error)
    })

    return NextResponse.json({
      success: true,
      submission: gradedSubmission,
      message: 'Submission graded successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Grading error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to grade submission' },
      { status: 500 }
    )
  }
}
