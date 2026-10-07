import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import DashboardLayout from '@/components/dashboard-layout'
import ScrollToTop from '@/components/scroll-to-top'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function StudentExamsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'STUDENT') {
    redirect('/auth/signin')
  }

  const exams = await prisma.exam.findMany({
    where: {
      section: {
        enrollments: {
          some: {
            userId: session.user.id,
            status: 'ENROLLED',
          },
        },
      },
    },
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
      examAttempts: {
        where: { studentId: session.user.id },
        select: {
          id: true,
          isCompleted: true,
          score: true,
          submittedAt: true,
        },
      },
    },
    orderBy: { startTime: 'desc' },
  })

  const now = new Date()

  // Attach existing attempt to each exam
  const examsWithAttempt = exams.map((exam) => ({
    ...exam,
    existingAttempt: exam.examAttempts[0] || null,
  }))

  const upcomingExams = examsWithAttempt.filter((exam) => new Date(exam.startTime) > now)
  const activeExams = examsWithAttempt.filter(
    (exam) => new Date(exam.startTime) <= now && new Date(exam.endTime) > now
  )
  const pastExams = examsWithAttempt.filter((exam) => new Date(exam.endTime) <= now)

  return (
    <DashboardLayout role={session.user.role}>
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 -my-8 p-4 md:p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
        <div className="mb-8 mt-[15px]">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">My Exams</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">View and take your scheduled exams</p>
        </div>

        {/* Active Exams */}
        {activeExams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-green-800 mb-4">Active Exams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeExams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-green-50 border-2 border-green-300 rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {exam.section.course.code}: {exam.section.course.title}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ACTIVE
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Duration: {exam.durationMinutes} minutes
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {exam._count.questions} questions
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-red-600 font-medium">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Closes: {new Date(exam.endTime).toLocaleString()}
                    </div>
                  </div>

                  {exam.existingAttempt ? (
                    exam.existingAttempt.isCompleted ? (
                      <div className="text-xs sm:text-sm text-green-700 font-medium">
                        ✓ Completed - Score: {exam.existingAttempt.score?.toFixed(1)}%
                      </div>
                    ) : (
                      <Link
                        href={`/student/exams/${exam.id}`}
                        className="block w-full text-center bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                      >
                        Continue Exam
                      </Link>
                    )
                  ) : (
                    <Link
                      href={`/student/exams/${exam.id}`}
                      className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                    >
                      Start Exam
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Exams */}
        {upcomingExams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-blue-800 mb-4">Upcoming Exams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingExams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white border border-gray-200 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {exam.section.course.code}: {exam.section.course.title}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      UPCOMING
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Opens: {new Date(exam.startTime).toLocaleString()}
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Duration: {exam.durationMinutes} minutes
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {exam._count.questions} questions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Exams */}
        {pastExams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Past Exams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastExams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {exam.section.course.code}: {exam.section.course.title}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                      CLOSED
                    </span>
                  </div>

                  {exam.existingAttempt?.isCompleted && (
                    <div className="space-y-2">
                      <div className="text-xs sm:text-sm text-gray-600">
                        Your Score: <span className="text-lg font-bold text-gray-900">
                          {exam.existingAttempt.score?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Submitted: {new Date(exam.existingAttempt.submittedAt!).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {exams.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">No exams available</p>
          </div>
        )}
      </div>
    </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </DashboardLayout>
  )
}
