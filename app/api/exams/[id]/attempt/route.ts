import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const submitAnswerSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    answer: z.string(),
  })),
})

// POST /api/exams/[id]/attempt - Start new attempt
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'STUDENT') {
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

    // Check if student is enrolled
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: session.user.id,
        sectionId: exam.sectionId,
        status: 'ENROLLED',
      },
    })

    if (!enrollment) {
      return NextResponse.json({ success: false, error: 'Not enrolled in this course' }, { status: 403 })
    }

    // Check if exam is available
    const now = new Date()
    if (now < exam.startTime || now > exam.endTime) {
      return NextResponse.json(
        { success: false, error: 'Exam is not currently available' },
        { status: 400 }
      )
    }

    // Check if already attempted
    const existingAttempt = await prisma.examAttempt.findUnique({
      where: {
        examId_studentId: {
          examId: params.id,
          studentId: session.user.id,
        },
      },
    })

    if (existingAttempt) {
      return NextResponse.json(
        { success: false, error: 'Already attempted this exam', attempt: existingAttempt },
        { status: 400 }
      )
    }

    // Create new attempt
    const attempt = await prisma.examAttempt.create({
      data: {
        examId: params.id,
        studentId: session.user.id,
        startedAt: new Date(),
        timeRemaining: exam.durationMinutes * 60, // Convert to seconds
      },
      include: {
        exam: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                questionText: true,
                questionType: true,
                options: true,
                points: true,
                orderIndex: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      attempt,
      message: 'Exam started successfully',
    })
  } catch (error) {
    console.error('Exam attempt error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start exam' },
      { status: 500 }
    )
  }
}

// PATCH /api/exams/[id]/attempt - Submit answers
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = submitAnswerSchema.parse(body)

    const attempt = await prisma.examAttempt.findUnique({
      where: {
        examId_studentId: {
          examId: params.id,
          studentId: session.user.id,
        },
      },
      include: {
        exam: {
          include: {
            questions: true,
          },
        },
      },
    })

    if (!attempt) {
      return NextResponse.json({ success: false, error: 'No active attempt found' }, { status: 404 })
    }

    if (attempt.isCompleted) {
      return NextResponse.json({ success: false, error: 'Exam already submitted' }, { status: 400 })
    }

    // Calculate time elapsed
    const timeElapsed = Math.floor((new Date().getTime() - attempt.startedAt.getTime()) / 1000)
    const durationSeconds = attempt.exam.durationMinutes * 60

    if (timeElapsed > durationSeconds) {
      return NextResponse.json({ success: false, error: 'Time limit exceeded' }, { status: 400 })
    }

    // Auto-grade answers
    let totalPoints = 0
    let earnedPoints = 0

    const answerRecords = await Promise.all(
      data.answers.map(async (ans) => {
        const question = attempt.exam.questions.find(q => q.id === ans.questionId)
        if (!question) return null

        totalPoints += question.points

        let isCorrect: boolean | null = null
        let points: number | null = null

        // Auto-grade for multiple choice and true/false
        if (question.questionType === 'multiple_choice' || question.questionType === 'true_false') {
          isCorrect = ans.answer.trim().toLowerCase() === question.correctAnswer?.trim().toLowerCase()
          points = isCorrect ? question.points : 0
          earnedPoints += points
        }

        return prisma.examAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId: attempt.id,
              questionId: ans.questionId,
            },
          },
          create: {
            attemptId: attempt.id,
            questionId: ans.questionId,
            answer: ans.answer,
            isCorrect,
            points,
          },
          update: {
            answer: ans.answer,
            isCorrect,
            points,
          },
        })
      })
    )

    // Update attempt
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        submittedAt: new Date(),
        isCompleted: true,
        score,
        timeRemaining: Math.max(0, durationSeconds - timeElapsed),
      },
      include: {
        answers: {
          include: {
            question: true,
          },
        },
        exam: {
          include: {
            questions: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      attempt: updatedAttempt,
      score,
      message: 'Exam submitted successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Exam submission error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit exam' },
      { status: 500 }
    )
  }
}
