import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/users/search - Search for users by email or name
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only moderators and admins can search for users
    if (!['MODERATOR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Only moderators and admins can search for users' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const name = searchParams.get('name')

    if (!email && !name) {
      return NextResponse.json(
        { success: false, error: 'Please provide email or name parameter' },
        { status: 400 }
      )
    }

    let foundUser = null

    if (email) {
      foundUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      })
    } else if (name) {
      const users = await prisma.user.findMany({
        where: {
          name: {
            contains: name,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
        take: 10,
      })

      return NextResponse.json({
        success: true,
        users,
      })
    }

    if (!foundUser && email) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: foundUser,
    })
  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to search for user' },
      { status: 500 }
    )
  }
}
