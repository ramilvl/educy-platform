import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
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

    // Check environment variables (without exposing the actual values)
    const envStatus = {
      RESEND_API_KEY: {
        isSet: !!process.env.RESEND_API_KEY,
        length: process.env.RESEND_API_KEY?.length || 0,
        prefix: process.env.RESEND_API_KEY?.substring(0, 5) || 'NOT SET',
      },
      RESEND_FROM_EMAIL: {
        isSet: !!process.env.RESEND_FROM_EMAIL,
        value: process.env.RESEND_FROM_EMAIL || 'NOT SET (using default: noreply@educy.com)',
      },
      NEXTAUTH_URL: {
        isSet: !!process.env.NEXTAUTH_URL,
        value: process.env.NEXTAUTH_URL || 'NOT SET',
      },
      NODE_ENV: process.env.NODE_ENV,
    }

    return NextResponse.json({
      success: true,
      environment: envStatus,
      message: 'Environment variables status',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
