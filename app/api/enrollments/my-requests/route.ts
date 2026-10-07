import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/enrollments/my-requests - Get current user's enrollment requests (all statuses)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get all enrollment requests for this user
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: user.id,
      },
      include: {
        section: {
          include: {
            course: true,
            instructor: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      enrollments: enrollments.map((e) => ({
        id: e.id,
        status: e.status,
        enrolledAt: e.enrolledAt,
        sectionId: e.sectionId,
        courseCode: e.section.course.code,
        courseTitle: e.section.course.title,
        instructor: e.section.instructor.name,
        term: e.section.term,
      })),
    })
  } catch (error) {
    console.error('My requests error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch enrollment requests' },
      { status: 500 }
    )
  }
}
