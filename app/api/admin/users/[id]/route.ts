import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateUserSchema = z.object({
  role: z.enum(['ADMIN', 'MODERATOR', 'INSTRUCTOR', 'STUDENT']),
})

// PUT /api/admin/users/[id] - Update user role
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can update user roles
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can update user roles' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = updateUserSchema.parse(body)

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent user from changing their own role
    if (targetUser.id === user.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot change your own role' },
        { status: 400 }
      )
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { role: data.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_ROLE_CHANGED',
        targetType: 'User',
        targetId: params.id,
        details: {
          targetEmail: targetUser.email,
          targetName: targetUser.name,
          oldRole: targetUser.role,
          newRole: data.role,
        },
      },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User role updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('User update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can delete users
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can delete users' },
        { status: 403 }
      )
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent user from deleting themselves
    if (targetUser.id === user.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    // Check for dependencies that would prevent deletion
    const [createdCourses, instructorSections, createdAssignments] = await Promise.all([
      prisma.course.count({ where: { createdById: params.id } }),
      prisma.section.count({ where: { instructorId: params.id } }),
      prisma.assignment.count({ where: { createdById: params.id } }),
    ])

    // Prevent deletion if user has created important records
    const dependencies = []
    if (createdCourses > 0) dependencies.push(`${createdCourses} course(s)`)
    if (instructorSections > 0) dependencies.push(`${instructorSections} section(s)`)
    if (createdAssignments > 0) dependencies.push(`${createdAssignments} assignment(s)`)

    if (dependencies.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete user: they have created ${dependencies.join(', ')}. Please reassign or delete these records first.`,
        },
        { status: 400 }
      )
    }

    // Delete user (cascading deletes will handle enrollments, submissions, files, notifications)
    await prisma.user.delete({
      where: { id: params.id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_DELETED',
        targetType: 'User',
        targetId: params.id,
        details: {
          email: targetUser.email,
          name: targetUser.name,
          role: targetUser.role,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('User deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
