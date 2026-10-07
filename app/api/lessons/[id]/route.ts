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
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  roomId: z.string().uuid().nullable().optional(),
})

// GET /api/lessons/[id] - Get lesson details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInstructor()

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: {
        room: true,
        section: {
          include: {
            course: true,
            instructor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
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

    // Check access
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

// PUT /api/lessons/[id] - Update lesson
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInstructor()
    const body = await request.json()
    const data = updateLessonSchema.parse(body)

    // Check if lesson exists and user has access
    const existingLesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: {
        section: true,
      },
    })

    if (!existingLesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 }
      )
    }

    if (existingLesson.section.instructorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Validate time range if both provided
    const startTime = data.startTime || existingLesson.startTime
    const endTime = data.endTime || existingLesson.endTime

    if (startTime >= endTime) {
      return NextResponse.json(
        { success: false, error: 'Start time must be before end time' },
        { status: 400 }
      )
    }

    // Check room conflicts if room or time changed
    if (data.roomId !== undefined || data.dayOfWeek || data.startTime || data.endTime) {
      const roomId = data.roomId === null ? null : (data.roomId || existingLesson.roomId)
      const dayOfWeek = (data.dayOfWeek as DayOfWeek) || existingLesson.dayOfWeek

      if (roomId) {
        const conflictingLessons = await prisma.lesson.findMany({
          where: {
            roomId,
            dayOfWeek,
            id: { not: params.id }, // Exclude current lesson
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
        })

        if (conflictingLessons.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'Room is already booked for this time slot',
              conflicts: conflictingLessons,
            },
            { status: 409 }
          )
        }
      }
    }

    // Update lesson
    const lesson = await prisma.lesson.update({
      where: { id: params.id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dayOfWeek && { dayOfWeek: data.dayOfWeek as DayOfWeek }),
        ...(data.startTime && { startTime: data.startTime }),
        ...(data.endTime && { endTime: data.endTime }),
        ...(data.roomId !== undefined && { roomId: data.roomId }),
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
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LESSON_UPDATED',
        targetType: 'Lesson',
        targetId: lesson.id,
        details: {
          changes: data,
        },
      },
    })

    return NextResponse.json({
      success: true,
      lesson,
      message: 'Lesson updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Lesson update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update lesson' },
      { status: 500 }
    )
  }
}

// DELETE /api/lessons/[id] - Delete lesson
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInstructor()

    // Check if lesson exists and user has access
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
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

    if (lesson.section.instructorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete lesson (cascade will delete schedules)
    await prisma.lesson.delete({
      where: { id: params.id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LESSON_DELETED',
        targetType: 'Lesson',
        targetId: params.id,
        details: {
          title: lesson.title,
          course: lesson.section.course.code,
        },
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
