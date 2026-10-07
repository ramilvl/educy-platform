import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Debug endpoints are completely disabled in production
    // No environment variable can override this for security
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Not Found' },
        { status: 404 }
      )
    }

    // Only allow admins to access this endpoint in development
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { testEmail } = body

    if (!testEmail) {
      return NextResponse.json({ error: 'testEmail is required' }, { status: 400 })
    }

    // Environment info
    const envInfo = {
      RESEND_API_KEY_SET: !!process.env.RESEND_API_KEY,
      RESEND_API_KEY_PREFIX: process.env.RESEND_API_KEY?.substring(0, 5) || 'NOT SET',
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'NOT SET (using default)',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    }

    console.log('🔍 Testing email with environment:', envInfo)

    // Attempt to send test email
    try {
      const result = await sendPasswordResetEmail({
        to: testEmail,
        userName: 'Test User',
        resetUrl: 'https://example.com/test-reset-url',
      })

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully!',
        environment: envInfo,
        emailResult: result,
      })
    } catch (emailError: any) {
      console.error('❌ Email sending failed:', emailError)

      return NextResponse.json({
        success: false,
        message: 'Email sending failed',
        environment: envInfo,
        error: {
          message: emailError.message,
          name: emailError.name,
          resendError: emailError.resendError,
          statusCode: emailError.statusCode,
          stack: emailError.stack,
        },
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('❌ Test endpoint error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
