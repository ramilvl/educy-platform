import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/students/all - Get all students for enrollment purposes
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only instructors, moderators, and admins can view all students
    if (!['INSTRUCTOR', 'MODERATOR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get search query for filtering
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const sectionId = searchParams.get('sectionId')

    let whereCondition: any = {
      role: 'STUDENT',
      status: 'ACTIVE',
    }

    // Add search filter if provided
    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    // If sectionId provided, exclude students already enrolled in that section
    if (sectionId) {
      whereCondition.enrollments = {
        none: {
          sectionId: sectionId,
          status: { in: ['ENROLLED', 'PENDING'] },
        },
      }
    }

    const students = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            enrollments: {
              where: { status: 'ENROLLED' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
      take: 100, // Limit to 100 students for performance
    })

    return NextResponse.json({
      success: true,
      students,
    })
  } catch (error) {
    console.error('Failed to fetch students:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}
