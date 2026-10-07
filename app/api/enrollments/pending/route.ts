import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/enrollments/pending - List pending enrollment requests
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only instructors, moderators, and admins can view pending enrollments
    if (user.role !== 'INSTRUCTOR' && user.role !== 'MODERATOR' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    let enrollments

    if (user.role === 'INSTRUCTOR') {
      // Instructors only see pending enrollments for their sections
      enrollments = await prisma.enrollment.findMany({
        where: {
          status: 'PENDING',
          section: {
            instructorId: user.id,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profileAvatarUrl: true,
            },
          },
          section: {
            include: {
              course: true,
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      })
    } else {
      // Moderators and admins see all pending enrollments
      enrollments = await prisma.enrollment.findMany({
        where: {
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profileAvatarUrl: true,
            },
          },
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
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      })
    }

    return NextResponse.json({
      success: true,
      enrollments,
    })
  } catch (error) {
    console.error('Fetch pending enrollments error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending enrollments' },
      { status: 500 }
    )
  }
}
