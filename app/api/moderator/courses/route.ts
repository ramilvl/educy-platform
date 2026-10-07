import { NextRequest, NextResponse } from 'next/server'
import { requireModerator } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/moderator/courses - List all courses for moderators
export async function GET(request: NextRequest) {
  try {
    await requireModerator()

    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')

    const courses = await prisma.course.findMany({
      where: {
        ...(term && { term }),
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        sections: {
          include: {
            instructor: {
              select: {
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    console.error('Courses fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}
