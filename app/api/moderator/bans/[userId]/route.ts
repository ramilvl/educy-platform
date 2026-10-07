import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/moderator/bans/[userId] - Check if user has active ban
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Anyone can check ban status (used in case rooms, etc.)
    const activeBan = await prisma.commentBan.findFirst({
      where: {
        userId: params.userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
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
        expiresAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      isBanned: !!activeBan,
      ban: activeBan || null,
    })
  } catch (error) {
    console.error('Ban check error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check ban status' },
      { status: 500 }
    )
  }
}

// DELETE /api/moderator/bans/[userId] - Lift active ban (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only admins can lift comment bans' },
        { status: 403 }
      )
    }

    // Find active ban
    const activeBan = await prisma.commentBan.findFirst({
      where: {
        userId: params.userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!activeBan) {
      return NextResponse.json(
        { success: false, error: 'No active ban found for this user' },
        { status: 404 }
      )
    }

    // Deactivate ban
    const updatedBan = await prisma.commentBan.update({
      where: { id: activeBan.id },
      data: { isActive: false },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'COMMENT_BAN_LIFTED',
        targetType: 'User',
        targetId: params.userId,
        details: {
          banId: activeBan.id,
          targetUserName: activeBan.user.name,
          targetUserEmail: activeBan.user.email,
          originalExpiresAt: activeBan.expiresAt.toISOString(),
          liftedAt: new Date().toISOString(),
        },
        severity: 'INFO',
        category: 'USER_ACTION',
      },
    })

    // Notify the user
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: 'GENERAL',
        payload: {
          title: 'Comment Ban Lifted',
          message: 'Your comment ban has been lifted by an administrator. You can now comment again.',
          banId: activeBan.id,
          action: 'COMMENT_BAN_LIFTED',
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Comment ban lifted successfully',
      ban: updatedBan,
    })
  } catch (error) {
    console.error('Ban lift error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to lift ban' },
      { status: 500 }
    )
  }
}
