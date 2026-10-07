import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireInstructor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createExamSchema = z.object({
  sectionId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  durationMinutes: z.number().min(1).max(480),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isGroupExam: z.boolean().default(false),
  questions: z.array(z.object({
    questionText: z.string().min(1),
    questionType: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay']),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().optional(),
    points: z.number().min(0).default(1),
    orderIndex: z.number().min(0),
  })).min(1),
})

// POST /api/exams - Create new exam
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await requireInstructor()
    const body = await request.json()
    const data = createExamSchema.parse(body)

    // Verify instructor has access to section
    const section = await prisma.section.findUnique({
      where: { id: data.sectionId },
    })

    if (!section || (section.instructorId !== user.id && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Validate time range
    if (new Date(data.startTime) >= new Date(data.endTime)) {
      return NextResponse.json(
        { success: false, error: 'End time must be after start time' },
        { status: 400 }
      )
    }

    // Create exam with questions
    const exam = await prisma.exam.create({
      data: {
        sectionId: data.sectionId,
        title: data.title,
        description: data.description,
        durationMinutes: data.durationMinutes,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        isGroupExam: data.isGroupExam,
        createdById: user.id,
        questions: {
          create: data.questions.map(q => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            points: q.points,
            orderIndex: q.orderIndex,
          })),
        },
      },
      include: {
        questions: true,
        section: {
          include: {
            course: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      exam,
      message: 'Exam created successfully',
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
          case 'sectionId':
            fieldErrors[field] = 'Please select a valid section'
            break
          case 'title':
            if (err.code === 'too_small') {
              fieldErrors[field] = 'Exam title is required'
            } else if (err.code === 'too_big') {
              fieldErrors[field] = 'Exam title must be less than 200 characters'
            } else {
              fieldErrors[field] = 'Please enter a valid exam title'
            }
            break
          case 'durationMinutes':
            fieldErrors[field] = 'Duration must be between 1 and 480 minutes'
            break
          case 'startTime':
            fieldErrors[field] = 'Please enter a valid start date and time'
            break
          case 'endTime':
            fieldErrors[field] = 'Please enter a valid end date and time'
            break
          case 'questions':
            fieldErrors[field] = 'At least one question is required'
            break
          default:
            if (field.startsWith('questions.')) {
              const questionIndex = field.split('.')[1]
              const subField = field.split('.').slice(2).join('.')
              fieldErrors[field] = `Question ${parseInt(questionIndex) + 1}: ${err.message}`
            } else {
              fieldErrors[field] = err.message
            }
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

    console.error('Exam creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create exam' },
      { status: 500 }
    )
  }
}

// GET /api/exams - List exams
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sectionId = searchParams.get('sectionId')

    let where: any = {}

    if (session.user.role === 'INSTRUCTOR') {
      where.section = { instructorId: session.user.id }
    } else if (session.user.role === 'STUDENT') {
      where.section = {
        enrollments: {
          some: {
            userId: session.user.id,
            status: 'ENROLLED',
          },
        },
      }
    }

    if (sectionId) {
      where.sectionId = sectionId
    }

    const exams = await prisma.exam.findMany({
      where,
      include: {
        section: {
          include: {
            course: true,
          },
        },
        _count: {
          select: {
            questions: true,
            examAttempts: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    })

    return NextResponse.json({
      success: true,
      exams,
    })
  } catch (error) {
    console.error('Exam fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exams' },
      { status: 500 }
    )
  }
}
