import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimitByIdentifier, RateLimitPresets } from '@/lib/ratelimit'
import { formatName } from '@/lib/format-name'

export const dynamic = 'force-dynamic'

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  surname: z.string().optional().nullable().transform(val => {
    if (!val || val === '') return null
    return val
  }),
  phone: z.string().optional().nullable().transform(val => {
    if (!val || val === '') return null
    return val
  }),
  expertise: z.array(z.string()).optional(),
  profileAvatarUrl: z.string().optional().nullable().transform(val => {
    if (!val || val === '') return null
    return val
  }),
})

// GET /api/profile - Get current user's profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        phone: true,
        expertise: true,
        role: true,
        status: true,
        profileAvatarUrl: true,
        createdAt: true,
        lastLogin: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

// PUT /api/profile - Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting for profile updates
    const rateLimit = rateLimitByIdentifier(
      request,
      'profile-update',
      session.user.id,
      {
        maxAttempts: 10,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Too many profile update attempts. Please try again later.',
      }
    )
    if (rateLimit) return rateLimit

    const body = await request.json()
    const data = updateProfileSchema.parse(body)

    // Build update object only with provided fields
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = formatName(data.name) || data.name
    if (data.surname !== undefined) updateData.surname = formatName(data.surname)
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.profileAvatarUrl !== undefined) updateData.profileAvatarUrl = data.profileAvatarUrl

    // Only allow instructors, moderators, and admins to update expertise
    if (data.expertise !== undefined) {
      if (!['INSTRUCTOR', 'MODERATOR', 'ADMIN'].includes(session.user.role)) {
        return NextResponse.json(
          { success: false, error: 'Only instructors, moderators, and admins can set expertise' },
          { status: 403 }
        )
      }
      updateData.expertise = data.expertise
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        phone: true,
        expertise: true,
        role: true,
        status: true,
        profileAvatarUrl: true,
        createdAt: true,
        lastLogin: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PROFILE_UPDATED',
        targetType: 'User',
        targetId: session.user.id,
        details: {
          updatedFields: Object.keys(updateData),
        },
        severity: 'INFO',
        category: 'USER_ACTION',
      },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Provide field-specific error messages
      const firstError = error.errors[0]
      let errorMessage = 'Validation error'
      const fieldErrors: Record<string, string> = {}

      // Map all Zod errors to field-level errors
      error.errors.forEach((err) => {
        const field = err.path.join('.')

        switch (field) {
          case 'name':
            fieldErrors[field] = 'Name is required'
            break
          case 'surname':
            fieldErrors[field] = 'Please enter a valid surname'
            break
          case 'phone':
            fieldErrors[field] = 'Please enter a valid phone number'
            break
          case 'expertise':
            fieldErrors[field] = 'Invalid expertise keywords'
            break
          case 'profileAvatarUrl':
            fieldErrors[field] = 'Invalid profile picture URL'
            break
          default:
            fieldErrors[field] = err.message
        }
      })

      // Use first error as general message if needed
      if (firstError) {
        const field = firstError.path.join('.')
        errorMessage = fieldErrors[field] || firstError.message
      }

      console.error('Validation error:', error.errors)
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          errors: fieldErrors, // Field-level errors for frontend
          details: error.errors,
        },
        { status: 400 }
      )
    }

    console.error('Profile update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
