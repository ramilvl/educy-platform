import { NextRequest, NextResponse } from 'next/server'
import { requireInstructor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { DayOfWeek } from '@prisma/client'

export const dynamic = 'force-dynamic'

const createLessonSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  dayOfWeek: z.enum([
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ]),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  roomId: z.string().uuid().optional(),
  materialIds: z.array(z.string()).optional().default([]),
})

// POST /api/sections/[id]/lessons - Create lesson
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInstructor()
    const body = await request.json()
    const data = createLessonSchema.parse(body)

    // Verify section exists and user is instructor
    const section = await prisma.section.findUnique({
      where: { id: params.id },
      include: {
        course: true,
      },
    })

    if (!section) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      )
    }

    if (section.instructorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You are not the instructor of this section' },
        { status: 403 }
      )
    }

    // Validate time range
    if (data.startTime >= data.endTime) {
      return NextResponse.json(
        { success: false, error: 'Start time must be before end time' },
        { status: 400 }
      )
    }

    // Check room availability if roomId provided
    if (data.roomId) {
      const roomExists = await prisma.room.findUnique({
        where: { id: data.roomId },
      })

      if (!roomExists) {
        return NextResponse.json(
          { success: false, error: 'Room not found' },
          { status: 404 }
        )
      }

      // Check for room conflicts (same room, same day, overlapping time)
      const conflictingLessons = await prisma.lesson.findMany({
        where: {
          roomId: data.roomId,
          dayOfWeek: data.dayOfWeek as DayOfWeek,
          OR: [
            {
              AND: [
                { startTime: { lte: data.startTime } },
                { endTime: { gt: data.startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: data.endTime } },
                { endTime: { gte: data.endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: data.startTime } },
                { endTime: { lte: data.endTime } },
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

    // Create lesson
    const lesson = await prisma.lesson.create({
      data: {
        sectionId: params.id,
        title: data.title,
        description: data.description,
        dayOfWeek: data.dayOfWeek as DayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        roomId: data.roomId,
        materialIds: data.materialIds || [],
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
        action: 'LESSON_CREATED',
        targetType: 'Lesson',
        targetId: lesson.id,
        details: {
          title: lesson.title,
          course: section.course.code,
          dayOfWeek: data.dayOfWeek,
          time: `${data.startTime}-${data.endTime}`,
        },
      },
    })

    return NextResponse.json({
      success: true,
      lesson,
      message: 'Lesson created successfully',
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
          case 'title':
            if (err.code === 'too_small') {
              fieldErrors[field] = 'Lesson title is required'
            } else if (err.code === 'too_big') {
              fieldErrors[field] = 'Lesson title must be less than 200 characters'
            } else {
              fieldErrors[field] = 'Please enter a valid lesson title'
            }
            break
          case 'dayOfWeek':
            fieldErrors[field] = 'Please select a valid day of the week'
            break
          case 'startTime':
            fieldErrors[field] = 'Start time must be in HH:MM format (e.g., 09:00)'
            break
          case 'endTime':
            fieldErrors[field] = 'End time must be in HH:MM format (e.g., 10:30)'
            break
          case 'roomId':
            fieldErrors[field] = 'Invalid room selected'
            break
          case 'materialIds':
            fieldErrors[field] = 'Invalid course materials. Please check your uploaded files and links.'
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

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        )
      }
    }

    console.error('Lesson creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create lesson' },
      { status: 500 }
    )
  }
}

// GET /api/sections/[id]/lessons - List lessons for section
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInstructor()

    // Verify section exists and user has access
    const section = await prisma.section.findUnique({
      where: { id: params.id },
    })

    if (!section) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      )
    }

    if (section.instructorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const lessons = await prisma.lesson.findMany({
      where: { sectionId: params.id },
      include: {
        room: true,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      lessons,
    })
  } catch (error) {
    console.error('Lessons fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lessons' },
      { status: 500 }
    )
  }
}
