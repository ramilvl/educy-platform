import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { sendWelcomeEmail } from '@/lib/email'
import crypto from 'crypto'
import { formatName } from '@/lib/format-name'

export const dynamic = 'force-dynamic'

const createUserSchema = z.object({
  name: z.string().min(1).max(200),
  surname: z.string().optional().nullable().transform(val => {
    if (!val || val === '') return null
    return val
  }),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MODERATOR', 'INSTRUCTOR', 'STUDENT']),
  sendEmail: z.boolean().default(true),
})

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can view all users
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can view users' },
        { status: 403 }
      )
    }

    // Pagination parameters
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50'))) // Cap at 100
    const skip = (page - 1) * limit

    // Fetch paginated users and total count in parallel
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          lastLogin: true,
          _count: {
            select: {
              enrollments: true,
              instructorSections: true,
              createdCourses: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ])

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can create users
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can create users' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = createUserSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Generate cryptographically secure temporary password (16 characters)
    const temporaryPassword = crypto.randomBytes(12).toString('base64').slice(0, 16)
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10)

    // Format name and surname (capitalize, clean whitespace)
    const formattedName = formatName(data.name)
    const formattedSurname = formatName(data.surname)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name: formattedName || data.name, // Fallback to original if formatting returns null
        surname: formattedSurname,
        email: data.email,
        hashedPassword,
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_CREATED',
        targetType: 'User',
        targetId: newUser.id,
        details: {
          createdUserEmail: newUser.email,
          createdUserName: newUser.name,
          createdUserRole: newUser.role,
        },
      },
    })

    // Send welcome email with credentials
    let emailSent = false
    let emailError = null

    if (data.sendEmail) {
      try {
        await sendWelcomeEmail({
          to: newUser.email,
          userName: newUser.name,
          temporaryPassword,
          role: newUser.role,
        })
        emailSent = true
        console.log(`✅ Welcome email sent successfully to ${newUser.email}`)
      } catch (error: any) {
        emailError = error?.message || 'Unknown error'
        console.error(`❌ Failed to send welcome email to ${newUser.email}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      temporaryPassword: temporaryPassword, // Return password so admin can share it if email fails
      emailSent,
      emailError,
      message: emailSent
        ? 'User created successfully and welcome email sent'
        : data.sendEmail
          ? 'User created successfully but email failed to send. Please share the password manually.'
          : 'User created successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('User creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
