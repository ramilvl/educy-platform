import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import DashboardLayout from '@/components/dashboard-layout'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getExamDetails(id: string, userId: string) {
  try {
    const exam = await prisma.exam.findFirst({
      where: {
        id,
        section: {
          instructorId: userId,
        },
      },
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
                surname: true,
                email: true,
              },
            },
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    return exam
  } catch (error) {
    console.error('Error fetching exam:', error)
    return null
  }
}

export default async function ExamDetailsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['INSTRUCTOR', 'ADMIN'].includes(session.user.role)) {
    redirect('/auth/signin')
  }

  const exam = await getExamDetails(params.id, session.user.id)

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">Exam not found</p>
          <Link
            href="/instructor/exams"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Back to Exams
          </Link>
        </div>
      </div>
    )
  }

  const now = new Date()
  const startTime = new Date(exam.startTime)
  const endTime = new Date(exam.endTime)
  const isActive = now >= startTime && now < endTime
  const isPast = now >= endTime
  const isUpcoming = now < startTime

  const attempts = exam.examAttempts || []
  const completedAttempts = attempts.filter((a: any) => a.isCompleted)
  const inProgressAttempts = attempts.filter((a: any) => !a.isCompleted)

  const totalPoints = exam.questions.reduce((sum: number, q: any) => sum + q.points, 0)
  const averageScore = completedAttempts.length > 0
    ? completedAttempts.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / completedAttempts.length
    : 0

  return (
    <DashboardLayout role={session.user.role}>
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 -my-8 p-4 md:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center text-xs sm:text-sm text-gray-600 mb-2">
            <Link href="/instructor/exams" className="hover:text-blue-600">
              Exams
            </Link>
            <span className="mx-2">/</span>
            <span>{exam.title}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">{exam.title}</h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">
                {exam.section.course.code}: {exam.section.course.title}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={`/api/exams/${exam.id}/export`}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </a>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`rounded-xl p-4 mb-6 ${
          isActive ? 'bg-green-50 border-2 border-green-300' :
          isUpcoming ? 'bg-blue-50 border-2 border-blue-300' :
          'bg-gray-50 border-2 border-gray-300'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-bold text-gray-900">
                {isActive && '🟢 Active Now'}
                {isUpcoming && '🔵 Upcoming'}
                {isPast && '⚫ Closed'}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {isActive && `Closes ${endTime.toLocaleString()}`}
                {isUpcoming && `Opens ${startTime.toLocaleString()}`}
                {isPast && `Closed ${endTime.toLocaleString()}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs sm:text-sm text-gray-600">Duration</p>
              <p className="font-bold text-gray-900">{exam.durationMinutes} minutes</p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Questions</p>
            <p className="text-3xl font-bold text-gray-900">{exam.questions.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Points</p>
            <p className="text-3xl font-bold text-gray-900">{totalPoints}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-3xl font-bold text-green-600">{completedAttempts.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Average Score</p>
            <p className="text-3xl font-bold text-blue-600">{averageScore.toFixed(1)}%</p>
          </div>
        </div>

        {/* In Progress Attempts */}
        {inProgressAttempts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">In Progress ({inProgressAttempts.length})</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="space-y-2">
                {inProgressAttempts.map((attempt: any) => (
                  <div key={attempt.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {exam.isGroupExam ? `Group ${attempt.group?.name}` : attempt.student?.name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Started {new Date(attempt.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      In Progress
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Completed Attempts */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Completed Attempts ({completedAttempts.length})
          </h2>

          {completedAttempts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">No completed attempts yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student/Group
                      </th>
                      <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time Taken
                      </th>
                      <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {completedAttempts.map((attempt: any) => {
                      const startedAt = new Date(attempt.startedAt)
                      const submittedAt = new Date(attempt.submittedAt)
                      const timeTakenMinutes = Math.floor((submittedAt.getTime() - startedAt.getTime()) / 60000)

                      return (
                        <tr key={attempt.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">
                                {exam.isGroupExam ? `Group ${attempt.group?.name}` : attempt.student?.name}
                              </p>
                              {!exam.isGroupExam && (
                                <p className="text-xs sm:text-sm text-gray-600">{attempt.student?.email}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs sm:text-sm text-gray-600">
                            {submittedAt.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-xs sm:text-sm text-gray-600">
                            {timeTakenMinutes} min
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <span className={`text-lg font-bold ${
                                (attempt.score || 0) >= 80 ? 'text-green-600' :
                                (attempt.score || 0) >= 60 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {attempt.score?.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Link
                              href={`/instructor/exams/${exam.id}/attempts/${attempt.id}`}
                              className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium"
                            >
                              View Details →
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Questions Preview */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Questions Preview</h2>
          <div className="space-y-4">
            {exam.questions
              .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
              .map((question: any, index: number) => (
                <div key={question.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-xs sm:text-sm mr-3 flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-gray-900 font-medium">{question.questionText}</p>
                        <span className="ml-4 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 flex-shrink-0">
                          {question.points} {question.points === 1 ? 'point' : 'points'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-2">
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                          {question.questionType.replace('_', ' ').toUpperCase()}
                        </span>
                        {question.questionType === 'multiple_choice' && (
                          <span className="text-green-600">
                            ✓ Correct: {question.correctAnswer}
                          </span>
                        )}
                        {question.questionType === 'true_false' && (
                          <span className="text-green-600">
                            ✓ Correct: {question.correctAnswer}
                          </span>
                        )}
                      </div>
                      {question.questionType === 'multiple_choice' && (
                        <div className="mt-2 space-y-1">
                          {question.options.map((option: string, oIndex: number) => (
                            <div
                              key={oIndex}
                              className={`text-xs sm:text-sm p-2 rounded ${
                                option === question.correctAnswer
                                  ? 'bg-green-50 text-green-800 font-medium'
                                  : 'bg-gray-50 text-gray-700'
                              }`}
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  )
}
