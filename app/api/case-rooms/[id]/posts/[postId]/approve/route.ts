import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireInstructor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const approveSchema = z.object({
  isApproved: z.boolean(),
  feedback: z.string().optional(),
})

// POST /api/case-rooms/[id]/posts/[postId]/approve - Approve/reject post
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; postId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await requireInstructor()
    const body = await request.json()
    const data = approveSchema.parse(body)

    const post = await prisma.casePost.findUnique({
      where: { id: params.postId },
      include: {
        room: {
          include: {
            section: true,
          },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
    }

    if (post.room.section.instructorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const updatedPost = await prisma.casePost.update({
      where: { id: params.postId },
      data: {
        isApproved: data.isApproved,
        approvedById: user.id,
        approvedAt: new Date(),
        feedback: data.feedback,
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
      post: updatedPost,
      message: data.isApproved ? 'Post approved' : 'Post rejected',
    })
  } catch (error) {
    console.error('Approval error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process approval' },
      { status: 500 }
    )
  }
}
