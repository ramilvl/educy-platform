import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { clearAllRateLimits, clearRateLimitsForPrefix } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

// POST /api/debug/clear-rate-limits - Clear rate limits (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Only admins can clear rate limits
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { prefix } = body

    let cleared = 0
    if (prefix) {
      // Clear rate limits for specific prefix (e.g., 'login', 'login-email')
      cleared = clearRateLimitsForPrefix(prefix)
    } else {
      // Clear all rate limits
      clearAllRateLimits()
      cleared = -1 // Indicator that all were cleared
    }

    return NextResponse.json({
      success: true,
      message: prefix
        ? `Cleared ${cleared} rate limit entries for prefix: ${prefix}`
        : 'Cleared all rate limits',
      cleared,
    })
  } catch (error) {
    console.error('Clear rate limits error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clear rate limits' },
      { status: 500 }
    )
  }
}

// GET /api/debug/clear-rate-limits - Get info about this endpoint
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - Admin access required' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    success: true,
    info: {
      endpoint: '/api/debug/clear-rate-limits',
      method: 'POST',
      access: 'ADMIN only',
      usage: {
        clearAll: 'POST with empty body or no prefix',
        clearPrefix: 'POST with { "prefix": "login" }',
      },
      availablePrefixes: [
        'login',
        'login-email',
        'register',
        'password-reset',
        'password-reset-confirm',
      ],
    },
  })
}
