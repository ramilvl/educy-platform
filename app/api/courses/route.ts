import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createCourseSchema = z.object({
  code: z.string().min(2).max(20).transform((val) => val.trim().toUpperCase()),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  term: z.string().min(3).max(50),
  visibility: z.boolean().default(true),
  // Section details
  capacity: z.number().int().min(1).max(500).default(30),
})

// POST /api/courses - Create course with initial section
export async function POST(request: NextRequest) {
  try {
    const user = await requireInstructor()
    const body = await request.json()
    const data = createCourseSchema.parse(body)

    // Create course and section in a transaction
    const course = await prisma.course.create({
      data: {
        code: data.code,
        title: data.title,
        description: data.description,
        term: data.term,
        visibility: data.visibility,
        createdById: user.id,
        sections: {
          create: {
            instructorId: user.id,
            capacity: data.capacity,
            term: data.term,
          },
        },
      },
      include: {
        sections: true,
        createdBy: {
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
        action: 'COURSE_CREATED',
        targetType: 'Course',
        targetId: course.id,
        details: {
          code: course.code,
          title: course.title,
        },
      },
    })

    return NextResponse.json({
      success: true,
      course,
      message: 'Course created successfully',
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

      // Unique constraint violation (duplicate course code)
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { success: false, error: 'Course code already exists' },
          { status: 409 }
        )
      }
    }

    console.error('Course creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create course' },
      { status: 500 }
    )
  }
}

// GET /api/courses - List courses (filtered by role)
export async function GET(request: NextRequest) {
  try {
    const user = await requireInstructor()
    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')

    // Instructors see only their courses
    const courses = await prisma.course.findMany({
      where: {
        ...(term && { term }),
        sections: {
          some: {
            instructorId: user.id,
          },
        },
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        sections: {
          where: {
            instructorId: user.id,
          },
          include: {
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      courses,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Courses fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}
