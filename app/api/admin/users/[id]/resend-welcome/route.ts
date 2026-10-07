import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { sendWelcomeWithSetupEmail } from '@/lib/email'
import { createAuditLog } from '@/lib/audit'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// POST /api/admin/users/[id]/resend-welcome - Resend welcome email to PENDING user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can resend welcome emails
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only admins can resend welcome emails' },
        { status: 403 }
      )
    }

    const userId = params.id

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is PENDING (only PENDING users need welcome emails)
    if (user.status !== 'PENDING') {
      return NextResponse.json({
        success: false,
        message: `User is already ${user.status}. Only PENDING users can receive welcome emails.`,
        suggestion: user.status === 'ACTIVE'
          ? 'This user has already activated their account. Use "Forgot Password" feature if they need to reset their password.'
          : user.status === 'SUSPENDED'
          ? 'This user is suspended. Unsuspend them first before sending welcome email.'
          : 'User status does not allow welcome email.',
      }, { status: 400 })
    }

    // Check if email service is configured
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json({
        success: false,
        message: 'Email service not configured',
        error: 'RESEND_API_KEY or RESEND_FROM_EMAIL environment variables are not set.',
      }, { status: 500 })
    }

    // Check if reset token is still valid, or generate a new one
    let resetToken = user.resetToken
    let tokenWasRefreshed = false

    if (!resetToken || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      // Token expired or missing - generate new one
      resetToken = crypto.randomBytes(32).toString('hex')
      const resetTokenExpiry = new Date(Date.now() + 7 * 24 * 3600000) // 7 days

      await prisma.user.update({
        where: { id: userId },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      })

      tokenWasRefreshed = true
      console.log(`🔄 Generated new password setup token for user: ${user.email}`)
    }

    // Create password setup URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const setupUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`

    console.log(`📧 Resending welcome email to: ${user.email}`)

    // Send welcome email with password setup link
    try {
      const result = await sendWelcomeWithSetupEmail({
        to: user.email,
        userName: user.name,
        setupUrl,
        role: user.role,
      })

      // Mark user as ACTIVE and email as sent
      await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'ACTIVE',
          welcomeEmailSent: true,
          welcomeEmailSentAt: new Date(),
        },
      })

      // Create audit log
      await createAuditLog({
        userId: currentUser.id,
        action: 'WELCOME_EMAIL_RESENT',
        targetType: 'User',
        targetId: userId,
        severity: 'INFO',
        category: 'ADMIN_ACTION',
        details: {
          email: user.email,
          tokenRefreshed: tokenWasRefreshed,
          emailId: result?.id,
        },
      })

      console.log(`✅ Welcome email resent successfully to: ${user.email}`)
      console.log(`   Email ID: ${result?.id || 'unknown'}`)

      return NextResponse.json({
        success: true,
        message: 'Welcome email sent successfully. User is now ACTIVE.',
        data: {
          email: user.email,
          name: user.name,
          status: 'ACTIVE',
          emailId: result?.id,
          tokenRefreshed: tokenWasRefreshed,
        },
      })
    } catch (emailError: any) {
      console.error(`❌ Failed to send welcome email to ${user.email}`)
      console.error(`   Error: ${emailError?.message || 'Unknown error'}`)

      // Create audit log for failed attempt
      await createAuditLog({
        userId: currentUser.id,
        action: 'WELCOME_EMAIL_RESEND_FAILED',
        targetType: 'User',
        targetId: userId,
        severity: 'WARNING',
        category: 'SYSTEM',
        details: {
          email: user.email,
          error: emailError?.message || 'Unknown error',
          tokenRefreshed: tokenWasRefreshed,
        },
      })

      return NextResponse.json({
        success: false,
        message: 'Failed to send welcome email',
        error: emailError?.message || 'Email service error',
        suggestion: 'Check email service configuration and try again. The password setup link is still valid for 7 days.',
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Resend welcome email error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process welcome email resend',
        error: error?.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}
