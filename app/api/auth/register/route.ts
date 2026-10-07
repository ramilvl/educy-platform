import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { rateLimitByIP, RateLimitPresets, logRateLimitViolation } from '@/lib/ratelimit'
import { handleError, AppError, ErrorCode } from '@/lib/errors'

export const dynamic = 'force-dynamic'

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password is too long'),
})

// Allowed email domains (configure via environment or leave empty to allow all)
const ALLOWED_EMAIL_DOMAINS = process.env.ALLOWED_EMAIL_DOMAINS?.split(',').map(d => d.trim()) || []

// Check if registration is disabled
const REGISTRATION_DISABLED = process.env.DISABLE_PUBLIC_REGISTRATION === 'true'

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitByIP(request, 'register', RateLimitPresets.register)
  if (rateLimitResult) {
    logRateLimitViolation('register', '/api/auth/register', request.headers.get('x-forwarded-for') || 'unknown')
    return rateLimitResult
  }

  try {
    // Check if public registration is disabled
    if (REGISTRATION_DISABLED) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        'Public registration is disabled. Please contact an administrator for account creation.'
      )
    }

    const body = await request.json()
    const data = registerSchema.parse(body)

    // Validate email domain if restrictions are configured
    if (ALLOWED_EMAIL_DOMAINS.length > 0) {
      const emailDomain = data.email.split('@')[1]
      if (!ALLOWED_EMAIL_DOMAINS.includes(emailDomain)) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          `Registration is only allowed for email addresses from: ${ALLOWED_EMAIL_DOMAINS.join(', ')}`
        )
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      // Log failed registration attempt
      await prisma.auditLog.create({
        data: {
          action: 'REGISTRATION_FAILED_DUPLICATE_EMAIL',
          targetType: 'User',
          details: { email: data.email, reason: 'Email already registered' },
          severity: 'WARNING',
          category: 'SECURITY',
        },
      })

      throw new AppError(
        ErrorCode.CONFLICT,
        'An account with this email already exists. Please sign in or use password reset if you forgot your password.'
      )
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(data.password)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number.'
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Create user (ALWAYS force STUDENT role - prevent role escalation)
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        hashedPassword,
        role: 'STUDENT', // SECURITY: Always force STUDENT role, never trust client input
        status: 'ACTIVE', // Can be set to PENDING if email verification is required
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    // Log successful registration
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        targetType: 'User',
        targetId: user.id,
        details: {
          email: user.email,
          role: user.role,
          status: user.status,
          registrationIp: request.headers.get('x-forwarded-for') || 'unknown',
        },
        severity: 'INFO',
        category: 'USER_ACTION',
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully. You can now sign in.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    return handleError(error, 'UserRegistration')
  }
}
