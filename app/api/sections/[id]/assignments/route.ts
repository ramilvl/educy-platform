import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendAssignmentCreatedEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const createAssignmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  dueDate: z.string().datetime(),
  allowedFileTypes: z.array(z.string()).default([]),
  maxSizeBytes: z.number().int().min(1).max(104857600).default(10485760), // Default 10MB
})

// POST /api/sections/[id]/assignments - Create assignment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInstructor()
    const body = await request.json()
    const data = createAssignmentSchema.parse(body)

    // Verify section exists and user is instructor
    const section = await prisma.section.findUnique({
      where: { id: params.id },
      include: {
        course: true,
      },
    })

    if (!section) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      )
    }

    if (section.instructorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You are not the instructor of this section' },
        { status: 403 }
      )
    }

    // Validate due date is in the future
    const dueDate = new Date(data.dueDate)
    if (dueDate < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Due date must be in the future' },
        { status: 400 }
      )
    }

    // Create assignment
    const assignment = await prisma.assignment.create({
      data: {
        sectionId: params.id,
        title: data.title,
        description: data.description,
        dueDate,
        allowedFileTypes: data.allowedFileTypes,
        maxSizeBytes: data.maxSizeBytes,
        createdById: user.id,
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
        action: 'ASSIGNMENT_CREATED',
        targetType: 'Assignment',
        targetId: assignment.id,
        details: {
          title: assignment.title,
          course: section.course.code,
          dueDate: data.dueDate,
        },
      },
    })

    // Create notifications for enrolled students
    const enrolledStudents = await prisma.enrollment.findMany({
      where: {
        sectionId: params.id,
        status: 'ENROLLED',
      },
      select: {
        userId: true,
      },
    })

    // Create notifications
    if (enrolledStudents.length > 0) {
      await prisma.notification.createMany({
        data: enrolledStudents.map((enrollment) => ({
          userId: enrollment.userId,
          type: 'ASSIGNMENT_CREATED',
          payload: {
            assignmentId: assignment.id,
            title: assignment.title,
            courseCode: section.course.code,
            dueDate: data.dueDate,
          },
        })),
      })

      // Send email notifications to all enrolled students
      const studentsWithEmails = await prisma.user.findMany({
        where: {
          id: { in: enrolledStudents.map((e) => e.userId) },
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      })

      // Send emails in background (don't await to avoid blocking)
      studentsWithEmails.forEach((student) => {
        sendAssignmentCreatedEmail({
          to: student.email,
          studentName: student.name,
          assignmentTitle: assignment.title,
          courseCode: section.course.code,
          dueDate: dueDate,
          assignmentId: assignment.id,
        }).catch((error) => {
          console.error(`Failed to send email to ${student.email}:`, error)
        })
      })
    }

    return NextResponse.json({
      success: true,
      assignment,
      message: 'Assignment created successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        )
      }
    }

    console.error('Assignment creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create assignment' },
      { status: 500 }
    )
  }
}

// GET /api/sections/[id]/assignments - List assignments for section
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInstructor()

    // Verify section exists and user has access
    const section = await prisma.section.findUnique({
      where: { id: params.id },
    })

    if (!section) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      )
    }

    if (section.instructorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const assignments = await prisma.assignment.findMany({
      where: { sectionId: params.id },
      include: {
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
      orderBy: { dueDate: 'desc' },
    })

    return NextResponse.json({
      success: true,
      assignments,
    })
  } catch (error) {
    console.error('Assignments fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}
