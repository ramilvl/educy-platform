import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/moderator/user-activity/[userId] - View user activity history
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'MODERATOR' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only moderators and admins can view user activity' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const skip = (page - 1) * limit
    const actionType = searchParams.get('actionType')
    const severity = searchParams.get('severity')

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Build where clause for audit logs
    const where: any = {
      userId: params.userId,
    }

    if (actionType) {
      where.action = actionType
    }

    if (severity && ['INFO', 'WARNING', 'CRITICAL'].includes(severity)) {
      where.severity = severity
    }

    // Fetch user's audit logs
    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip,
      }),
      prisma.auditLog.count({ where }),
    ])

    // Get user's enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: params.userId },
      include: {
        section: {
          include: {
            course: {
              select: {
                code: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    })

    // Get user's submissions
    const submissions = await prisma.submission.findMany({
      where: { studentId: params.userId },
      include: {
        assignment: {
          select: {
            title: true,
            dueDate: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
      take: 20,
    })

    // Get reports filed against this user
    const reportsReceived = await prisma.userReport.findMany({
      where: { reportedUserId: params.userId },
      include: {
        reportedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get comment bans received
    const bansReceived = await prisma.commentBan.findMany({
      where: { userId: params.userId },
      include: {
        bannedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get active ban status
    const activeBan = await prisma.commentBan.findFirst({
      where: {
        userId: params.userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    return NextResponse.json({
      success: true,
      user: targetUser,
      activity: {
        auditLogs,
        enrollments,
        submissions,
        reportsReceived,
        bansReceived,
        activeBan: activeBan || null,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('User activity fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user activity' },
      { status: 500 }
    )
  }
}
