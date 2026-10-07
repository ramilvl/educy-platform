import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const applyBanSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(10).max(500),
  durationHours: z.number().min(1).max(168), // Max 7 days
})

// POST /api/moderator/bans - Apply a temporary comment ban
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'MODERATOR') {
      return NextResponse.json(
        { success: false, error: 'Only moderators can apply comment bans' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = applyBanSchema.parse(body)

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, name: true, email: true, role: true, status: true },
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent banning admins or moderators
    if (['ADMIN', 'MODERATOR'].includes(targetUser.role)) {
      return NextResponse.json(
        { success: false, error: 'Cannot ban administrators or moderators' },
        { status: 403 }
      )
    }

    // Prevent self-banning
    if (data.userId === user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot ban yourself' },
        { status: 400 }
      )
    }

    // Check if user already has an active ban
    const existingBan = await prisma.commentBan.findFirst({
      where: {
        userId: data.userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (existingBan) {
      return NextResponse.json(
        {
          success: false,
          error: 'User already has an active comment ban',
          existingBan: {
            expiresAt: existingBan.expiresAt,
            reason: existingBan.reason,
          },
        },
        { status: 409 }
      )
    }

    // Calculate expiry time
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + data.durationHours)

    // Create ban
    const ban = await prisma.commentBan.create({
      data: {
        userId: data.userId,
        bannedById: user.id,
        reason: data.reason,
        durationHours: data.durationHours,
        expiresAt,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        bannedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'COMMENT_BAN_APPLIED',
        targetType: 'User',
        targetId: data.userId,
        details: {
          banId: ban.id,
          targetUserName: targetUser.name,
          targetUserEmail: targetUser.email,
          reason: data.reason,
          durationHours: data.durationHours,
          expiresAt: expiresAt.toISOString(),
        },
        severity: 'WARNING',
        category: 'USER_ACTION',
      },
    })

    // Notify the banned user
    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: 'GENERAL',
        payload: {
          title: 'Temporary Comment Ban Applied',
          message: `You have been temporarily banned from commenting for ${data.durationHours} hours. Reason: ${data.reason}`,
          banId: ban.id,
          reason: data.reason,
          durationHours: data.durationHours,
          expiresAt: expiresAt.toISOString(),
          action: 'COMMENT_BAN_APPLIED',
        },
      },
    })

    // Notify admins
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      select: { id: true },
    })

    await Promise.all(
      admins.map((admin) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'GENERAL',
            payload: {
              title: 'Comment Ban Applied',
              message: `Moderator ${user.name} has applied a ${data.durationHours}-hour comment ban to ${targetUser.name}`,
              banId: ban.id,
              targetUserId: targetUser.id,
              targetUserName: targetUser.name,
              moderatorName: user.name,
              reason: data.reason,
              durationHours: data.durationHours,
              action: 'COMMENT_BAN_APPLIED',
            },
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      ban,
      message: `Comment ban applied successfully. User banned until ${expiresAt.toLocaleString()}`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Comment ban application error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to apply comment ban' },
      { status: 500 }
    )
  }
}

// GET /api/moderator/bans - View comment bans
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'MODERATOR' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only moderators and admins can view bans' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    // Moderators see only bans they applied, admins see all
    if (user.role === 'MODERATOR') {
      where.bannedById = user.id
    }

    if (activeOnly) {
      where.isActive = true
      where.expiresAt = {
        gt: new Date(),
      }
    }

    const [bans, total] = await Promise.all([
      prisma.commentBan.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
            },
          },
          bannedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip,
      }),
      prisma.commentBan.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      bans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Bans fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bans' },
      { status: 500 }
    )
  }
}
