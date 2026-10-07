import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import DashboardLayout from '@/components/dashboard-layout'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getInstructorExams() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return []
  }

  try {
    const exams = await prisma.exam.findMany({
      where: {
        section: {
          instructorId: session.user.id,
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
      },
      orderBy: { startTime: 'desc' },
    })

    return exams
  } catch (error) {
    console.error('Failed to fetch instructor exams:', error)
    return []
  }
}

export default async function InstructorExamsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['INSTRUCTOR', 'ADMIN'].includes(session.user.role)) {
    redirect('/auth/signin')
  }

  const exams = await getInstructorExams()
  const now = new Date()

  const activeExams = exams.filter((exam: any) =>
    new Date(exam.startTime) <= now && new Date(exam.endTime) > now
  )
  const upcomingExams = exams.filter((exam: any) => new Date(exam.startTime) > now)
  const pastExams = exams.filter((exam: any) => new Date(exam.endTime) <= now)

  return (
    <DashboardLayout role={session.user.role}>
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 -my-8 p-4 md:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Exams</h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600">Manage your timed exams and view results</p>
          </div>
          <Link
            href="/instructor/exams/new"
            className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors inline-flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Exam
          </Link>
        </div>

        {/* Active Exams */}
        {activeExams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-green-800 mb-4">Active Exams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeExams.map((exam: any) => (
                <Link
                  key={exam.id}
                  href={`/instructor/exams/${exam.id}`}
                  className="bg-green-50 border-2 border-green-300 rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex-1">{exam.title}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
                      ACTIVE
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600 mb-4">
                    {exam.section.course.code}: {exam.section.course.title}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium text-gray-900">{exam.durationMinutes} min</span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Questions:</span>
                      <span className="font-medium text-gray-900">{exam._count.questions}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Attempts:</span>
                      <span className="font-medium text-gray-900">{exam._count.examAttempts}</span>
                    </div>
                    <div className="text-xs text-red-600 font-medium mt-3">
                      Closes: {new Date(exam.endTime).toLocaleString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Exams */}
        {upcomingExams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-blue-800 mb-4">Upcoming Exams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingExams.map((exam: any) => (
                <Link
                  key={exam.id}
                  href={`/instructor/exams/${exam.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex-1">{exam.title}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                      UPCOMING
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600 mb-4">
                    {exam.section.course.code}: {exam.section.course.title}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Opens:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(exam.startTime).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium text-gray-900">{exam.durationMinutes} min</span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Questions:</span>
                      <span className="font-medium text-gray-900">{exam._count.questions}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Past Exams */}
        {pastExams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Past Exams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastExams.map((exam: any) => (
                <Link
                  key={exam.id}
                  href={`/instructor/exams/${exam.id}`}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex-1">{exam.title}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700 ml-2">
                      CLOSED
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600 mb-4">
                    {exam.section.course.code}: {exam.section.course.title}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Attempts:</span>
                      <span className="font-medium text-gray-900">{exam._count.examAttempts}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Closed:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(exam.endTime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {exams.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-20 h-20 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No exams yet</h3>
            <p className="text-gray-600 mb-6">Create your first timed exam to get started</p>
            <Link
              href="/instructor/exams/new"
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Exam
            </Link>
          </div>
        )}
      </div>
    </div>
    </DashboardLayout>
  )
}
