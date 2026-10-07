import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor, getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateAssignmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  allowedFileTypes: z.array(z.string()).optional(),
  maxSizeBytes: z.number().int().min(1).max(104857600).optional(),
})

// GET /api/assignments/[id] - Get assignment details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
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
            enrollments: {
              where: {
                userId: user.id,
                status: 'ENROLLED',
              },
            },
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Check access - allow instructor, admin, or enrolled students
    const isInstructor = assignment.section.instructorId === user.id
    const isAdmin = user.role === 'ADMIN'
    const isEnrolledStudent = assignment.section.enrollments.length > 0

    if (!isInstructor && !isAdmin && !isEnrolledStudent) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this assignment' },
        { status: 403 }
      )
    }

    // If student, include their submission
    let studentSubmission = null
    if (user.role === 'STUDENT') {
      studentSubmission = await prisma.submission.findUnique({
        where: {
          assignmentId_studentId: {
            assignmentId: params.id,
            studentId: user.id,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      assignment,
      submission: studentSubmission,
    })
  } catch (error) {
    console.error('Assignment fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assignment' },
      { status: 500 }
    )
  }
}

// PUT /api/assignments/[id] - Update assignment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInstructor()
    const body = await request.json()
    const data = updateAssignmentSchema.parse(body)

    // Check if assignment exists and user has access
    const existingAssignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      include: {
        section: true,
      },
    })

    if (!existingAssignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    if (existingAssignment.section.instructorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Validate due date if provided
    if (data.dueDate) {
      const dueDate = new Date(data.dueDate)
      if (dueDate < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Due date must be in the future' },
          { status: 400 }
        )
      }
    }

    // Update assignment
    const assignment = await prisma.assignment.update({
      where: { id: params.id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
        ...(data.allowedFileTypes && { allowedFileTypes: data.allowedFileTypes }),
        ...(data.maxSizeBytes && { maxSizeBytes: data.maxSizeBytes }),
      },
      include: {
        section: {
          include: {
            course: true,
          },
        },
        createdBy: {
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
        action: 'ASSIGNMENT_UPDATED',
        targetType: 'Assignment',
        targetId: assignment.id,
        details: {
          changes: data,
        },
      },
    })

    return NextResponse.json({
      success: true,
      assignment,
      message: 'Assignment updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Assignment update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update assignment' },
      { status: 500 }
    )
  }
}

// DELETE /api/assignments/[id] - Delete assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInstructor()

    // Check if assignment exists and user has access
    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      include: {
        section: {
          include: {
            course: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    if (assignment.section.instructorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Warn if there are submissions
    if (assignment._count.submissions > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete assignment with ${assignment._count.submissions} submissions`,
        },
        { status: 409 }
      )
    }

    // Delete assignment (cascade will delete submissions)
    await prisma.assignment.delete({
      where: { id: params.id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ASSIGNMENT_DELETED',
        targetType: 'Assignment',
        targetId: params.id,
        details: {
          title: assignment.title,
          course: assignment.section.course.code,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted successfully',
    })
  } catch (error) {
    console.error('Assignment deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete assignment' },
      { status: 500 }
    )
  }
}
