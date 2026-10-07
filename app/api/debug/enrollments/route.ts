import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/debug/enrollments - Debug enrollment data
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Debug endpoints are completely disabled in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Not Found' },
        { status: 404 }
      )
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get all enrollments for this user with full data
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: user.id,
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
      userId: user.id,
      userRole: user.role,
      totalEnrollments: enrollments.length,
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
      fullData: enrollments, // Include full data for debugging
    })
  } catch (error) {
    console.error('Debug enrollment error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch debug data', details: String(error) },
      { status: 500 }
    )
  }
}
