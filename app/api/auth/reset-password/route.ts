import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { rateLimitByIdentifier, rateLimitByIP, RateLimitPresets, logRateLimitViolation } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// POST /api/auth/reset-password - Reset password with token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = resetPasswordSchema.parse(body)

    // Apply rate limiting by IP
    const ipRateLimit = rateLimitByIP(request, 'reset-password-ip', RateLimitPresets.passwordResetConfirm)
    if (ipRateLimit) {
      logRateLimitViolation('reset-password-ip', '/api/auth/reset-password', request.headers.get('x-forwarded-for') || 'unknown')
      return ipRateLimit
    }

    // Apply rate limiting by token (prevents brute force attacks on tokens)
    const tokenRateLimit = rateLimitByIdentifier(request, 'reset-token', data.token, RateLimitPresets.passwordResetConfirm)
    if (tokenRateLimit) {
      logRateLimitViolation(`reset-token:${data.token.substring(0, 10)}...`, '/api/auth/reset-password', request.headers.get('x-forwarded-for') || 'unknown')
      return tokenRateLimit
    }

    // Find user by reset token
    const user = await prisma.user.findUnique({
      where: { resetToken: data.token },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Check if token has expired (1 hour)
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      // Clear expired token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        },
      })

      return NextResponse.json(
        { success: false, error: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_COMPLETED',
        targetType: 'User',
        targetId: user.id,
        severity: 'CRITICAL',
        category: 'SECURITY',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Reset password error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
