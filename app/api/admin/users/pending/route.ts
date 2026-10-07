import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/users/pending - Get all PENDING users (users waiting for welcome email)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can view PENDING users
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only admins can view PENDING users' },
        { status: 403 }
      )
    }

    // Get all PENDING users
    const pendingUsers = await prisma.user.findMany({
      where: {
        status: 'PENDING',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        resetTokenExpiry: true,
        welcomeEmailSent: true,
        welcomeEmailSentAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate token status for each user
    const pendingUsersWithStatus = pendingUsers.map(user => {
      const now = new Date()
      const isTokenExpired = user.resetTokenExpiry ? user.resetTokenExpiry < now : true
      const isTokenValid = !isTokenExpired

      return {
        ...user,
        tokenStatus: isTokenValid ? 'VALID' : 'EXPIRED',
        tokenExpiresAt: user.resetTokenExpiry,
        needsNewToken: isTokenExpired,
      }
    })

    // Count users by token status
    const validTokenCount = pendingUsersWithStatus.filter(u => u.tokenStatus === 'VALID').length
    const expiredTokenCount = pendingUsersWithStatus.filter(u => u.tokenStatus === 'EXPIRED').length

    return NextResponse.json({
      success: true,
      data: pendingUsersWithStatus,
      summary: {
        total: pendingUsers.length,
        validTokens: validTokenCount,
        expiredTokens: expiredTokenCount,
      },
      message: pendingUsers.length > 0
        ? `Found ${pendingUsers.length} PENDING users awaiting activation`
        : 'No PENDING users found - all users have been activated',
    })
  } catch (error: any) {
    console.error('Get PENDING users error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve PENDING users',
        error: error?.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}
