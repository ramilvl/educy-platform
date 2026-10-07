import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/case-rooms/[id] - Get case room details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const room = await prisma.caseRoom.findUnique({
      where: { id: params.id },
      include: {
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
        _count: {
          select: {
            posts: true,
          },
        },
      },
    })

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Case room not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    const isInstructor = session.user.role === 'INSTRUCTOR' && room.section.instructorId === session.user.id
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'MODERATOR'
    const isEnrolled = session.user.role === 'STUDENT' && await prisma.enrollment.findFirst({
      where: {
        userId: session.user.id,
        sectionId: room.sectionId,
        status: 'ENROLLED',
      },
    })

    if (!isInstructor && !isAdmin && !isEnrolled) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this case room' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      room,
    })
  } catch (error) {
    console.error('Case room fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch case room' },
      { status: 500 }
    )
  }
}

// PUT /api/case-rooms/[id] - Update case room
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'INSTRUCTOR' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const room = await prisma.caseRoom.findUnique({
      where: { id: params.id },
      include: { section: true },
    })

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Case room not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to update
    if (session.user.role === 'INSTRUCTOR' && room.section.instructorId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only update your own case rooms' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, dueDate, isActive } = body

    const updatedRoom = await prisma.caseRoom.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        section: {
          include: {
            course: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      room: updatedRoom,
      message: 'Case room updated successfully',
    })
  } catch (error) {
    console.error('Case room update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update case room' },
      { status: 500 }
    )
  }
}

// DELETE /api/case-rooms/[id] - Delete case room
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'INSTRUCTOR' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const room = await prisma.caseRoom.findUnique({
      where: { id: params.id },
      include: { section: true },
    })

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Case room not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to delete
    if (session.user.role === 'INSTRUCTOR' && room.section.instructorId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own case rooms' },
        { status: 403 }
      )
    }

    await prisma.caseRoom.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Case room deleted successfully',
    })
  } catch (error) {
    console.error('Case room deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete case room' },
      { status: 500 }
    )
  }
}
