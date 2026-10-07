import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/rbac'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateRoomSchema = z.object({
  name: z.string().trim().min(1, 'Room name is required').max(100, 'Room name must be 100 characters or less').optional(),
  location: z.string().trim().optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(1000, 'Capacity cannot exceed 1000').optional(),
  resources: z.record(z.any()).optional(),
})

// PUT /api/admin/rooms/[id] - Update room
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

    // Only admins can update rooms
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can update rooms' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = updateRoomSchema.parse(body)

    // Check if room exists
    const existingRoom = await prisma.room.findUnique({
      where: { id: params.id },
    })

    if (!existingRoom) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      )
    }

    // If updating name, check if new name is already taken
    if (data.name && data.name !== existingRoom.name) {
      const nameExists = await prisma.room.findUnique({
        where: { name: data.name },
      })

      if (nameExists) {
        return NextResponse.json(
          { success: false, error: 'A room with this name already exists' },
          { status: 409 }
        )
      }
    }

    // Update room
    const room = await prisma.room.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.capacity && { capacity: data.capacity }),
        ...(data.resources !== undefined && { resources: data.resources }),
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ROOM_UPDATED',
        targetType: 'Room',
        targetId: room.id,
        details: {
          name: room.name,
          changes: data,
        },
      },
    })

    return NextResponse.json({
      success: true,
      room,
      message: 'Room updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Room update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update room' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/rooms/[id] - Delete room
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

    // Only admins can delete rooms
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can delete rooms' },
        { status: 403 }
      )
    }

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            lessons: true,
          },
        },
      },
    })

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      )
    }

    // Check if room is assigned to any lessons
    if (room._count.lessons > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete room: it is assigned to ${room._count.lessons} lesson(s)` },
        { status: 409 }
      )
    }

    // Delete room
    await prisma.room.delete({
      where: { id: params.id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ROOM_DELETED',
        targetType: 'Room',
        targetId: params.id,
        details: {
          name: room.name,
          capacity: room.capacity,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Room deleted successfully',
    })
  } catch (error) {
    console.error('Room deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete room' },
      { status: 500 }
    )
  }
}
