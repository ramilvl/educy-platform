import { NextRequest, NextResponse } from 'next/server'
import { requireModerator } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/moderator/stats - Get moderator dashboard statistics
export async function GET(request: NextRequest) {
  try {
    await requireModerator()

    const [pendingEnrollments, totalEnrollments, totalCourses] = await Promise.all([
      prisma.enrollment.count({
        where: { status: 'PENDING' },
      }),
      prisma.enrollment.count(),
      prisma.course.count(),
    ])

    return NextResponse.json({
      success: true,
      stats: {
        pendingEnrollments,
        totalEnrollments,
        totalCourses,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    console.error('Stats fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
