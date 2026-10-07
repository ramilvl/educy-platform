import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/student/courses/available - Get available courses for enrollment
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Only students can access this endpoint' },
        { status: 403 }
      )
    }

    // Get available courses (not enrolled)
    const courses = await prisma.course.findMany({
      where: {
        visibility: true,
        sections: {
          some: {
            enrollments: {
              none: {
                userId: user.id,
                status: { in: ['ENROLLED', 'PENDING'] },
              },
            },
          },
        },
      },
      include: {
        sections: {
          where: {
            enrollments: {
              none: {
                userId: user.id,
                status: { in: ['ENROLLED', 'PENDING'] },
              },
            },
          },
          include: {
            instructor: { select: { name: true } },
            _count: {
              select: {
                enrollments: {
                  where: {
                    status: 'ENROLLED',
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      courses,
    })
  } catch (error) {
    console.error('Available courses fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available courses' },
      { status: 500 }
    )
  }
}
