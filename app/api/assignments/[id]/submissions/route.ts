import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSubmissionSchema = z.object({
  fileKey: z.string().optional(),
  text: z.string().optional(),
}).refine(data => data.fileKey || data.text, {
  message: "Either fileKey or text must be provided for submission"
})

// POST /api/assignments/[id]/submissions - Submit assignment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createSubmissionSchema.parse(body)

    // Verify file ownership if fileKey is provided
    if (data.fileKey) {
      const file = await prisma.file.findUnique({
        where: { key: data.fileKey },
      })

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'File not found' },
          { status: 404 }
        )
      }

      if (file.ownerId !== user.id) {
        return NextResponse.json(
          { success: false, error: 'You do not own this file' },
          { status: 403 }
        )
      }

      // Check if file upload was confirmed
      if (file.status !== 'UPLOADED') {
        return NextResponse.json(
          { success: false, error: 'File upload is not yet confirmed. Please complete the upload first.' },
          { status: 400 }
        )
      }
    }

    // Get assignment
    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      include: {
        section: {
          include: {
            course: true,
            enrollments: {
              where: {
                userId: user.id,
                status: 'ENROLLED',
              },
            },
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 })
    }

    // Check if student is enrolled
    if (user.role === 'STUDENT' && assignment.section.enrollments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'You are not enrolled in this course' },
        { status: 403 }
      )
    }

    // Check if submission is late
    const now = new Date()
    const dueDate = new Date(assignment.dueDate)
    const isLate = now > dueDate

    // Create submission (unique constraint will prevent duplicates)
    const submission = await prisma.submission.create({
      data: {
        assignmentId: params.id,
        studentId: user.id,
        fileKey: data.fileKey,
        text: data.text,
        isLate,
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
        action: 'ASSIGNMENT_SUBMITTED',
        targetType: 'Submission',
        targetId: submission.id,
        details: {
          assignmentId: params.id,
          course: assignment.section.course.code,
        },
      },
    })

    // Prepare response with late warning if applicable
    const message = isLate
      ? 'Assignment submitted successfully (LATE)'
      : 'Assignment submitted successfully'

    const warning = isLate
      ? 'This submission is past the due date and may be subject to late penalties'
      : undefined

    return NextResponse.json({
      success: true,
      submission,
      message,
      ...(warning && { warning }),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    // Handle Prisma unique constraint violation (duplicate submission)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'You have already submitted this assignment' },
        { status: 409 }
      )
    }

    console.error('Submission creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit assignment' },
      { status: 500 }
    )
  }
}

// GET /api/assignments/[id]/submissions - List submissions (instructor only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      include: {
        section: true,
      },
    })

    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 })
    }

    // Only instructor can view all submissions
    if (assignment.section.instructorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const submissions = await prisma.submission.findMany({
      where: { assignmentId: params.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      submissions,
    })
  } catch (error) {
    console.error('Submissions fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch submissions' },
      { status: 500 }
    )
  }
}
