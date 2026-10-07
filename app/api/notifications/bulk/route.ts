import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const bulkNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  recipientType: z.enum(['ALL_MODERATORS', 'ALL_INSTRUCTORS', 'SECTION', 'COURSE_ALL_SECTIONS']),
  sectionId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
})

// POST /api/notifications/bulk - Send bulk notifications
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = bulkNotificationSchema.parse(body)

    // Authorization checks based on user role and recipient type
    if (data.recipientType === 'ALL_MODERATORS') {
      if (user.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Only admins can send notifications to all moderators' },
          { status: 403 }
        )
      }
    }

    if (data.recipientType === 'ALL_INSTRUCTORS') {
      if (!['ADMIN', 'MODERATOR'].includes(user.role)) {
        return NextResponse.json(
          { success: false, error: 'Only admins and moderators can send notifications to all instructors' },
          { status: 403 }
        )
      }
    }

    if (data.recipientType === 'SECTION' || data.recipientType === 'COURSE_ALL_SECTIONS') {
      if (!['ADMIN', 'MODERATOR', 'INSTRUCTOR'].includes(user.role)) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    let recipientIds: string[] = []

    // Get recipient IDs based on type
    switch (data.recipientType) {
      case 'ALL_MODERATORS': {
        const moderators = await prisma.user.findMany({
          where: {
            role: 'MODERATOR',
            status: 'ACTIVE',
          },
          select: { id: true },
        })
        recipientIds = moderators.map(m => m.id)
        break
      }

      case 'ALL_INSTRUCTORS': {
        const instructors = await prisma.user.findMany({
          where: {
            role: 'INSTRUCTOR',
            status: 'ACTIVE',
          },
          select: { id: true },
        })
        recipientIds = instructors.map(i => i.id)
        break
      }

      case 'SECTION': {
        if (!data.sectionId) {
          return NextResponse.json(
            { success: false, error: 'Section ID required for SECTION recipient type' },
            { status: 400 }
          )
        }

        const section = await prisma.section.findUnique({
          where: { id: data.sectionId },
          include: {
            enrollments: {
              where: {
                status: 'ENROLLED',
              },
              select: {
                userId: true,
              },
            },
          },
        })

        if (!section) {
          return NextResponse.json(
            { success: false, error: 'Section not found' },
            { status: 404 }
          )
        }

        // Check if user is instructor of this section (or admin/moderator)
        if (user.role === 'INSTRUCTOR' && section.instructorId !== user.id) {
          return NextResponse.json(
            { success: false, error: 'You are not the instructor of this section' },
            { status: 403 }
          )
        }

        recipientIds = section.enrollments.map(e => e.userId)
        break
      }

      case 'COURSE_ALL_SECTIONS': {
        if (!data.courseId) {
          return NextResponse.json(
            { success: false, error: 'Course ID required for COURSE_ALL_SECTIONS recipient type' },
            { status: 400 }
          )
        }

        const sections = await prisma.section.findMany({
          where: { courseId: data.courseId },
          include: {
            enrollments: {
              where: {
                status: 'ENROLLED',
              },
              select: {
                userId: true,
              },
            },
          },
        })

        if (sections.length === 0) {
          return NextResponse.json(
            { success: false, error: 'No sections found for this course' },
            { status: 404 }
          )
        }

        // Check if user is instructor of at least one section (or admin/moderator)
        if (user.role === 'INSTRUCTOR') {
          const isInstructor = sections.some(s => s.instructorId === user.id)
          if (!isInstructor) {
            return NextResponse.json(
              { success: false, error: 'You are not an instructor of this course' },
              { status: 403 }
            )
          }
        }

        // Get unique user IDs from all sections
        const userIds = new Set<string>()
        sections.forEach(section => {
          section.enrollments.forEach(enrollment => {
            userIds.add(enrollment.userId)
          })
        })
        recipientIds = Array.from(userIds)
        break
      }
    }

    if (recipientIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No recipients found for this notification' },
        { status: 400 }
      )
    }

    // Create notifications for all recipients
    await prisma.notification.createMany({
      data: recipientIds.map(recipientId => ({
        userId: recipientId,
        type: 'GENERAL',
        payload: {
          title: data.title,
          message: data.message,
          sentBy: user.name,
          sentByRole: user.role,
          sentAt: new Date().toISOString(),
          recipientType: data.recipientType,
        },
      })),
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'BULK_NOTIFICATION_SENT',
        targetType: 'Notification',
        details: {
          title: data.title,
          recipientType: data.recipientType,
          recipientCount: recipientIds.length,
          sectionId: data.sectionId,
          courseId: data.courseId,
        },
        severity: 'INFO',
        category: 'USER_ACTION',
      },
    })

    return NextResponse.json({
      success: true,
      recipientCount: recipientIds.length,
      message: `Notification sent to ${recipientIds.length} recipient(s)`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Bulk notification error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send bulk notification' },
      { status: 500 }
    )
  }
}
