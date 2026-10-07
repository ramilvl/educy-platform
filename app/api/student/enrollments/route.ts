import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/student/enrollments - Get student's enrolled courses
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

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: user.id,
        status: 'ENROLLED',
      },
      include: {
        section: {
          include: {
            course: true,
            instructor: { select: { name: true, email: true } },
            _count: {
              select: { enrollments: true },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      enrollments,
    })
  } catch (error) {
    console.error('Student enrollments fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch enrollments' },
      { status: 500 }
    )
  }
}
