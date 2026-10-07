import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { DayOfWeek } from '@prisma/client'

export const dynamic = 'force-dynamic'

const updateLessonSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  dayOfWeek: z.enum([
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ]).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  roomId: z.string().uuid().optional().nullable(),
  materialIds: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(), // Content aging: archive support
})

// GET /api/sections/[id]/lessons/[lessonId] - Get single lesson
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; lessonId: string } }
) {
  try {
    const user = await requireInstructor()

    // Find lesson with section verification
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.lessonId },
      include: {
        room: true,
        section: {
          include: {
            course: true,
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 }
      )
    }

    // Verify access
    if (lesson.section.instructorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      lesson,
    })
  } catch (error) {
    console.error('Lesson fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lesson' },
      { status: 500 }
    )
  }
}

// PATCH /api/sections/[id]/lessons/[lessonId] - Update lesson
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; lessonId: string } }
) {
  try {
    const user = await requireInstructor()
    const body = await request.json()
    const data = updateLessonSchema.parse(body)

    // Find existing lesson
    const existingLesson = await prisma.lesson.findUnique({
      where: { id: params.lessonId },
      include: {
        section: {
          include: {
            course: true,
          },
        },
      },
    })

    if (!existingLesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 }
      )
    }

    // Verify access
    if (existingLesson.section.instructorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Validate time range if both times are provided
    const startTime = data.startTime ?? existingLesson.startTime
    const endTime = data.endTime ?? existingLesson.endTime
    if (startTime >= endTime) {
      return NextResponse.json(
        { success: false, error: 'Start time must be before end time' },
        { status: 400 }
      )
    }

    // Check room availability if room is being changed
    const roomId = data.roomId !== undefined ? data.roomId : existingLesson.roomId
    const dayOfWeek = (data.dayOfWeek ?? existingLesson.dayOfWeek) as DayOfWeek

    if (roomId) {
      const roomExists = await prisma.room.findUnique({
        where: { id: roomId },
      })

      if (!roomExists) {
        return NextResponse.json(
          { success: false, error: 'Room not found' },
          { status: 404 }
        )
      }

      // Check for room conflicts (excluding the current lesson)
      const conflictingLessons = await prisma.lesson.findMany({
        where: {
          id: { not: params.lessonId }, // Exclude current lesson
          roomId: roomId,
          dayOfWeek: dayOfWeek,
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gte: endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } },
              ],
            },
          ],
        },
        include: {
          section: {
            include: {
              course: true,
            },
          },
        },
      })

      if (conflictingLessons.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Room is already booked for this time slot',
            conflicts: conflictingLessons.map(l => ({
              course: l.section.course.code,
              title: l.title,
              time: `${l.startTime}-${l.endTime}`,
            })),
          },
          { status: 409 }
        )
      }
    }

    // Update lesson
    const updatedLesson = await prisma.lesson.update({
      where: { id: params.lessonId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dayOfWeek && { dayOfWeek: data.dayOfWeek as DayOfWeek }),
        ...(data.startTime && { startTime: data.startTime }),
        ...(data.endTime && { endTime: data.endTime }),
        ...(data.roomId !== undefined && { roomId: data.roomId }),
        ...(data.materialIds !== undefined && { materialIds: data.materialIds }),
        ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
      },
      include: {
        room: true,
        section: {
          include: {
            course: true,
          },
        },
      },
    })

    // Create audit log
    const action = data.isArchived ? 'LESSON_ARCHIVED' : 'LESSON_UPDATED'
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action,
        targetType: 'Lesson',
        targetId: updatedLesson.id,
        details: {
          title: updatedLesson.title,
          course: existingLesson.section.course.code,
          changes: data,
        },
        severity: data.isArchived ? 'WARNING' : 'INFO',
      },
    })

    return NextResponse.json({
      success: true,
      lesson: updatedLesson,
      message: 'Lesson updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        )
      }
    }

    console.error('Lesson update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update lesson' },
      { status: 500 }
    )
  }
}

// DELETE /api/sections/[id]/lessons/[lessonId] - Delete lesson
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; lessonId: string } }
) {
  try {
    const user = await requireInstructor()

    // Find lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.lessonId },
      include: {
        section: {
          include: {
            course: true,
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 }
      )
    }

    // Verify access
    if (lesson.section.instructorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete lesson
    await prisma.lesson.delete({
      where: { id: params.lessonId },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LESSON_DELETED',
        targetType: 'Lesson',
        targetId: params.lessonId,
        details: {
          title: lesson.title,
          course: lesson.section.course.code,
        },
        severity: 'WARNING',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Lesson deleted successfully',
    })
  } catch (error) {
    console.error('Lesson deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete lesson' },
      { status: 500 }
    )
  }
}
