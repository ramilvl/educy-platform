import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createPostSchema = z.object({
  content: z.string().min(1),
  fileKeys: z.array(z.string()).default([]),
})

// POST /api/case-rooms/[id]/posts - Create new post
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createPostSchema.parse(body)

    const room = await prisma.caseRoom.findUnique({
      where: { id: params.id },
      include: { section: true },
    })

    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: session.user.id,
        sectionId: room.sectionId,
        status: 'ENROLLED',
      },
    })

    if (!enrollment) {
      return NextResponse.json({ success: false, error: 'Not enrolled' }, { status: 403 })
    }

    // Validate file ownership - students can only attach their own files
    if (data.fileKeys && data.fileKeys.length > 0) {
      const files = await prisma.file.findMany({
        where: {
          key: { in: data.fileKeys },
          ownerId: session.user.id,
        },
      })

      if (files.length !== data.fileKeys.length) {
        return NextResponse.json(
          { success: false, error: 'Invalid file references - you can only attach your own files' },
          { status: 403 }
        )
      }
    }

    const post = await prisma.casePost.create({
      data: {
        roomId: params.id,
        studentId: session.user.id,
        content: data.content,
        fileKeys: data.fileKeys,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      post,
      message: 'Post created successfully',
    })
  } catch (error) {
    console.error('Post creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create post' },
      { status: 500 }
    )
  }
}

// GET /api/case-rooms/[id]/posts - Get all posts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Verify case room exists and get section info
    const room = await prisma.caseRoom.findUnique({
      where: { id: params.id },
      include: { section: true },
    })

    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }

    // Check enrollment for students - only enrolled students can view posts
    if (session.user.role === 'STUDENT') {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: session.user.id,
          sectionId: room.sectionId,
          status: 'ENROLLED',
        },
      })

      if (!enrollment) {
        return NextResponse.json(
          { success: false, error: 'Not enrolled in this course' },
          { status: 403 }
        )
      }
    }
    // Instructors can view if they teach the section
    else if (session.user.role === 'INSTRUCTOR') {
      if (room.section.instructorId !== session.user.id) {
        return NextResponse.json(
          { success: false, error: 'You do not teach this course' },
          { status: 403 }
        )
      }
    }
    // Admins and moderators can view all

    const posts = await prisma.casePost.findMany({
      where: { roomId: params.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      posts,
    })
  } catch (error) {
    console.error('Posts fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}
