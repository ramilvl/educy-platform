import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

// GET /api/admin/rooms/availability - Get room availability schedule
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const dayOfWeek = searchParams.get('dayOfWeek')

    // Build where clause
    const where: any = {}
    if (roomId) {
      where.roomId = roomId
    }
    if (dayOfWeek) {
      where.dayOfWeek = dayOfWeek
    }

    // Fetch all lessons with room assignments
    const lessons = await prisma.lesson.findMany({
      where,
      include: {
        room: true,
        section: {
          include: {
            course: {
              select: {
                code: true,
                title: true,
              },
            },
            instructor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { roomId: 'asc' },
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    })

    // Group lessons by room
    const roomSchedules: Record<string, any> = {}

    lessons.forEach((lesson) => {
      if (!lesson.room) return

      if (!roomSchedules[lesson.room.id]) {
        roomSchedules[lesson.room.id] = {
          room: {
            id: lesson.room.id,
            name: lesson.room.name,
            location: lesson.room.location,
            capacity: lesson.room.capacity,
          },
          schedule: {},
        }
      }

      if (!roomSchedules[lesson.room.id].schedule[lesson.dayOfWeek]) {
        roomSchedules[lesson.room.id].schedule[lesson.dayOfWeek] = []
      }

      roomSchedules[lesson.room.id].schedule[lesson.dayOfWeek].push({
        id: lesson.id,
        title: lesson.title,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        course: {
          code: lesson.section.course.code,
          title: lesson.section.course.title,
        },
        instructor: lesson.section.instructor.name,
      })
    })

    return NextResponse.json({
      success: true,
      availability: Object.values(roomSchedules),
    })
  } catch (error) {
    console.error('Room availability fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch room availability' },
      { status: 500 }
    )
  }
}
