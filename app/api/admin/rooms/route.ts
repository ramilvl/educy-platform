import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/rbac'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createRoomSchema = z.object({
  name: z.string().trim().min(1, 'Room name is required').max(100, 'Room name must be 100 characters or less'),
  location: z.string().trim().optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(1000, 'Capacity cannot exceed 1000'),
  resources: z.record(z.any()).optional(), // Object with any structure for resources
})

// GET /api/admin/rooms - List all rooms (accessible by instructors for selection)
export async function GET(request: NextRequest) {
  try {
    // Allow any authenticated user to view rooms for selection
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const rooms = await prisma.room.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      rooms,
    })
  } catch (error) {
    console.error('Rooms fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rooms' },
      { status: 500 }
    )
  }
}

// POST /api/admin/rooms - Create new room
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can create rooms
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can create rooms' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = createRoomSchema.parse(body)

    // Check if room name already exists
    const existingRoom = await prisma.room.findUnique({
      where: { name: data.name },
    })

    if (existingRoom) {
      return NextResponse.json(
        { success: false, error: 'A room with this name already exists' },
        { status: 409 }
      )
    }

    // Create room
    const room = await prisma.room.create({
      data: {
        name: data.name,
        location: data.location,
        capacity: data.capacity,
        resources: data.resources || {},
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ROOM_CREATED',
        targetType: 'Room',
        targetId: room.id,
        details: {
          name: room.name,
          capacity: room.capacity,
        },
      },
    })

    return NextResponse.json({
      success: true,
      room,
      message: 'Room created successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Room creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create room' },
      { status: 500 }
    )
  }
}
