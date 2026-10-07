import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireInstructor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/exams/[id]/export - Export exam results to CSV (Excel-compatible)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await requireInstructor()

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
        },
        examAttempts: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            group: {
              include: {
                members: {
                  include: {
                    student: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
            answers: {
              include: {
                question: true,
              },
            },
            individualScores: {
              include: {
                student: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    })

    if (!exam) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 })
    }

    // Check access
    if (exam.section.instructorId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Generate CSV
    const headers = [
      'Student Name',
      'Student Email',
      'Group',
      'Started At',
      'Submitted At',
      'Time Taken (minutes)',
      'Score',
      'Status',
      ...exam.questions.map((q, idx) => `Q${idx + 1} (${q.points}pts)`),
    ]

    if (exam.isGroupExam) {
      headers.push('Individual Score', 'Individual Feedback')
    }

    const rows = exam.examAttempts.map(attempt => {
      const timeTaken = attempt.submittedAt
        ? Math.floor((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 60000)
        : 'N/A'

      const row = [
        attempt.student?.name || 'Group Submission',
        attempt.student?.email || '',
        attempt.group?.name || 'Individual',
        attempt.startedAt.toLocaleString(),
        attempt.submittedAt?.toLocaleString() || 'Not submitted',
        timeTaken,
        attempt.score?.toFixed(2) || 'N/A',
        attempt.isCompleted ? 'Completed' : 'In Progress',
      ]

      // Add question answers
      exam.questions.forEach(question => {
        const answer = attempt.answers.find(a => a.questionId === question.id)
        if (answer) {
          const answerText = answer.answer || 'No answer'
          const pointsText = answer.points !== null ? ` (${answer.points}/${question.points})` : ''
          row.push(answerText + pointsText)
        } else {
          row.push('No answer')
        }
      })

      // Add individual scores for group exams
      if (exam.isGroupExam && attempt.student) {
        const individualScore = attempt.individualScores.find(s => s.studentId === attempt.student?.id)
        row.push(
          individualScore?.score?.toFixed(2) || 'Not graded',
          individualScore?.feedback || ''
        )
      }

      return row
    })

    // If group exam, also add rows for individual group members
    if (exam.isGroupExam) {
      exam.examAttempts.forEach(attempt => {
        if (attempt.group) {
          attempt.individualScores.forEach(score => {
            const row = [
              score.student.name,
              score.student.email,
              attempt.group!.name,
              attempt.startedAt.toLocaleString(),
              attempt.submittedAt?.toLocaleString() || 'Not submitted',
              'N/A',
              attempt.score?.toFixed(2) || 'N/A',
              attempt.isCompleted ? 'Completed' : 'In Progress',
              ...Array(exam.questions.length).fill('See group submission'),
              score.score.toFixed(2),
              score.feedback || '',
            ]
            rows.push(row)
          })
        }
      })
    }

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    // Return as downloadable file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="exam-${exam.title.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.csv"`,
      },
    })
  } catch (error) {
    console.error('Exam export error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export exam results' },
      { status: 500 }
    )
  }
}
