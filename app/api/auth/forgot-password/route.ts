import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'
import { rateLimitByIdentifier, rateLimitByIP, RateLimitPresets, logRateLimitViolation } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

// POST /api/auth/forgot-password - Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = forgotPasswordSchema.parse(body)

    // Apply rate limiting by IP
    const ipRateLimit = rateLimitByIP(request, 'forgot-password-ip', RateLimitPresets.passwordReset)
    if (ipRateLimit) {
      logRateLimitViolation('forgot-password-ip', '/api/auth/forgot-password', request.headers.get('x-forwarded-for') || 'unknown')
      return ipRateLimit
    }

    // Apply rate limiting by email (prevents targeted attacks on specific accounts)
    const emailRateLimit = rateLimitByIdentifier(request, 'forgot-password', data.email, RateLimitPresets.passwordReset)
    if (emailRateLimit) {
      logRateLimitViolation(`forgot-password:${data.email}`, '/api/auth/forgot-password', request.headers.get('x-forwarded-for') || 'unknown')
      // Return same generic message to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      })
    }

    // Generate secure reset token (32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`

    // Send password reset email
    try {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetUrl,
      })
    } catch (emailError: any) {
      console.error('❌ Failed to send password reset email:', {
        email: user.email,
        error: emailError?.message,
        name: emailError?.name,
        resendError: emailError?.resendError,
        statusCode: emailError?.statusCode,
        fullError: emailError,
      })
      // Don't fail the request if email fails - token is still valid
      // But in development, we might want to see the error
      if (process.env.NODE_ENV === 'development') {
        console.error('Full email error stack:', emailError)
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        targetType: 'User',
        targetId: user.id,
        severity: 'INFO',
        category: 'SECURITY',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      )
    }

    console.error('Forgot password error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}
