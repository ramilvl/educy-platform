import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/exams/[id] - Get exam details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
      include: {
        section: {
          include: {
            course: true,
          },
        },
        questions: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            questionText: true,
            questionType: true,
            options: true,
            points: true,
            orderIndex: true,
            // Don't include correctAnswer for students
            ...(session.user.role === 'INSTRUCTOR' || session.user.role === 'ADMIN'
              ? { correctAnswer: true }
              : {}),
          },
        },
        examAttempts: {
          where: {
            studentId: session.user.id,
          },
          include: {
            answers: true,
          },
        },
      },
    })

    if (!exam) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 })
    }

    // Check access
    if (session.user.role === 'STUDENT') {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: session.user.id,
          sectionId: exam.sectionId,
          status: 'ENROLLED',
        },
      })

      if (!enrollment) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
    } else if (session.user.role === 'INSTRUCTOR') {
      if (exam.section.instructorId !== session.user.id) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({
      success: true,
      exam,
    })
  } catch (error) {
    console.error('Exam fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exam' },
      { status: 500 }
    )
  }
}

// DELETE /api/exams/[id] - Delete exam
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
      include: {
        section: true,
      },
    })

    if (!exam) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 })
    }

    // Check access
    if (exam.section.instructorId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await prisma.exam.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Exam deleted successfully',
    })
  } catch (error) {
    console.error('Exam deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete exam' },
      { status: 500 }
    )
  }
}
