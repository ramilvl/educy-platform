import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateCourseSchema = z.object({
  code: z.string().min(2).max(20).transform((val) => val.trim().toUpperCase()).optional(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  term: z.string().min(3).max(50).optional(),
  visibility: z.boolean().optional(),
  capacity: z.number().int().min(1).max(500).optional(),
})

// GET /api/courses/[id] - Get course details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInstructor()

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sections: {
          include: {
            instructor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                enrollments: true,
                lessons: true,
                assignments: true,
              },
            },
          },
        },
      },
    })

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      )
    }

    // Check if user is instructor of any section
    const hasAccess = course.sections.some(
      (section) => section.instructorId === user.id
    )

    if (!hasAccess && course.createdById !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this course' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      course,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Course fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch course' },
      { status: 500 }
    )
  }
}

// PUT /api/courses/[id] - Update course
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInstructor()
    const body = await request.json()
    const data = updateCourseSchema.parse(body)

    // Check if course exists and user has access
    const existingCourse = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        sections: {
          where: {
            instructorId: user.id,
          },
        },
      },
    })

    if (!existingCourse) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      )
    }

    if (
      existingCourse.createdById !== user.id &&
      existingCourse.sections.length === 0 &&
      user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to edit this course' },
        { status: 403 }
      )
    }

    // Update course (exclude capacity from course-level update)
    const { capacity, ...courseData } = data
    const course = await prisma.course.update({
      where: { id: params.id },
      data: courseData,
      include: {
        sections: true,
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    // Update section capacity if provided
    if (capacity !== undefined) {
      const userSection = existingCourse.sections[0]
      if (userSection) {
        await prisma.section.update({
          where: { id: userSection.id },
          data: { capacity },
        })
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'COURSE_UPDATED',
        targetType: 'Course',
        targetId: course.id,
        details: {
          changes: data,
        },
      },
    })

    return NextResponse.json({
      success: true,
      course,
      message: 'Course updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Course update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update course' },
      { status: 500 }
    )
  }
}

// DELETE /api/courses/[id] - Delete course
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInstructor()

    // Check if course exists and user has access
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        sections: {
          include: {
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
        },
      },
    })

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      )
    }

    if (course.createdById !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only course creator or admin can delete' },
        { status: 403 }
      )
    }

    // Delete all enrollments in all sections first to allow course deletion
    const sectionIds = course.sections.map((s) => s.id)
    if (sectionIds.length > 0) {
      await prisma.enrollment.deleteMany({
        where: { sectionId: { in: sectionIds } },
      })
    }

    // Delete course (cascade will delete sections, lessons, etc.)
    await prisma.course.delete({
      where: { id: params.id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'COURSE_DELETED',
        targetType: 'Course',
        targetId: params.id,
        details: {
          code: course.code,
          title: course.title,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Course deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete course' },
      { status: 500 }
    )
  }
}
