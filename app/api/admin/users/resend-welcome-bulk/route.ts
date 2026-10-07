import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { sendWelcomeWithSetupEmail } from '@/lib/email'
import { createAuditLog } from '@/lib/audit'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Rate limiting for bulk email sending
const EMAIL_RATE_LIMIT_MS = 600 // 600ms between emails
const MAX_BULK_RESEND = 50 // Maximum users to resend in one request

// Helper to add delay between emails
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// POST /api/admin/users/resend-welcome-bulk - Resend welcome emails to all or selected PENDING users
export async function POST(request: NextRequest) {
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

    // Check if email service is configured
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json({
        success: false,
        message: 'Email service not configured',
        error: 'RESEND_API_KEY or RESEND_FROM_EMAIL environment variables are not set.',
      }, { status: 500 })
    }

    // Parse request body to get optional user IDs filter
    let userIds: string[] | undefined
    try {
      const body = await request.json()
      userIds = body.userIds // Optional array of user IDs to resend to
    } catch {
      // No body or invalid JSON - resend to all PENDING users
    }

    // Find PENDING users
    const pendingUsers = await prisma.user.findMany({
      where: {
        status: 'PENDING',
        ...(userIds && userIds.length > 0 ? { id: { in: userIds } } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        resetToken: true,
        resetTokenExpiry: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    if (pendingUsers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No PENDING users found',
        suggestion: userIds && userIds.length > 0
          ? 'The specified users are not in PENDING status or do not exist.'
          : 'All users have already been activated.',
      }, { status: 404 })
    }

    // Check batch size limit
    if (pendingUsers.length > MAX_BULK_RESEND) {
      return NextResponse.json({
        success: false,
        message: `Too many users to process (${pendingUsers.length} found)`,
        error: `Maximum ${MAX_BULK_RESEND} users per bulk resend to prevent timeouts.`,
        suggestion: `Process users in smaller batches or use the single resend endpoint.`,
        pendingCount: pendingUsers.length,
        maxAllowed: MAX_BULK_RESEND,
      }, { status: 400 })
    }

    console.log(`📧 Starting bulk welcome email resend for ${pendingUsers.length} PENDING users...`)

    let successCount = 0
    let failureCount = 0
    const results: Array<{ email: string; success: boolean; error?: string }> = []

    // Process each user
    for (let i = 0; i < pendingUsers.length; i++) {
      const user = pendingUsers[i]

      try {
        // Check if reset token is still valid, or generate a new one
        let resetToken = user.resetToken
        let tokenWasRefreshed = false

        if (!resetToken || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
          // Token expired or missing - generate new one
          resetToken = crypto.randomBytes(32).toString('hex')
          const resetTokenExpiry = new Date(Date.now() + 7 * 24 * 3600000) // 7 days

          await prisma.user.update({
            where: { id: user.id },
            data: {
              resetToken,
              resetTokenExpiry,
            },
          })

          tokenWasRefreshed = true
          console.log(`🔄 Generated new password setup token for: ${user.email}`)
        }

        // Create password setup URL
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const setupUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`

        console.log(`📧 Sending welcome email ${i + 1}/${pendingUsers.length}: ${user.email}`)

        // Send welcome email
        const result = await sendWelcomeWithSetupEmail({
          to: user.email,
          userName: user.name,
          setupUrl,
          role: user.role,
        })

        // Mark user as ACTIVE and email as sent
        await prisma.user.update({
          where: { id: user.id },
          data: {
            status: 'ACTIVE',
            welcomeEmailSent: true,
            welcomeEmailSentAt: new Date(),
          },
        })

        console.log(`✅ Welcome email sent: ${user.email}`)
        successCount++
        results.push({ email: user.email, success: true })

        // Rate limiting: Wait between emails
        if (i < pendingUsers.length - 1) {
          await delay(EMAIL_RATE_LIMIT_MS)
        }
      } catch (emailError: any) {
        console.error(`❌ Failed to send welcome email to ${user.email}`)
        console.error(`   Error: ${emailError?.message || 'Unknown error'}`)

        failureCount++
        results.push({
          email: user.email,
          success: false,
          error: emailError?.message || 'Unknown error',
        })

        // User stays PENDING - can try again later
      }
    }

    // Create audit log
    await createAuditLog({
      userId: currentUser.id,
      action: 'WELCOME_EMAIL_BULK_RESEND',
      targetType: 'User',
      severity: failureCount > 0 ? 'WARNING' : 'INFO',
      category: 'ADMIN_ACTION',
      details: {
        totalUsers: pendingUsers.length,
        successCount,
        failureCount,
        results,
      },
    })

    console.log(`✅ Bulk resend complete: ${successCount} succeeded, ${failureCount} failed`)

    // Return results
    if (successCount === 0) {
      return NextResponse.json({
        success: false,
        message: `Failed to send all ${failureCount} welcome emails`,
        totalUsers: pendingUsers.length,
        successCount: 0,
        failureCount,
        results,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: successCount === pendingUsers.length
        ? `Successfully sent welcome emails to all ${successCount} users`
        : `Sent ${successCount} welcome emails with ${failureCount} failures`,
      totalUsers: pendingUsers.length,
      successCount,
      failureCount,
      results,
      warning: failureCount > 0 ? `${failureCount} users remain PENDING due to email failures` : undefined,
    })
  } catch (error: any) {
    console.error('Bulk resend welcome email error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process bulk welcome email resend',
        error: error?.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}
