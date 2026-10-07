import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { requireInstructor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/dashboard-layout'
import Link from 'next/link'
import GradeSubmissionForm from './grade-form'

export default async function AssignmentGradingPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  try {
    await requireInstructor()
  } catch {
    redirect('/unauthorized')
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: params.id },
    include: {
      section: {
        include: {
          course: true,
        },
      },
      submissions: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          tabSwitches: {
            orderBy: { timestamp: 'asc' },
          },
        },
        orderBy: { submittedAt: 'desc' },
      },
    },
  })

  if (!assignment) {
    notFound()
  }

  // Check access
  if (assignment.section.instructorId !== session.user.id && session.user.role !== 'ADMIN') {
    redirect('/unauthorized')
  }

  const gradedCount = assignment.submissions.filter((s) => s.grade !== null).length
  const ungradedCount = assignment.submissions.length - gradedCount

  return (
    <DashboardLayout role={session.user.role}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            href={`/instructor/courses/${assignment.section.courseId}`}
            className="text-xs sm:text-sm text-[#5C2482] hover:underline mb-2 inline-block"
          >
            ← Back to course
          </Link>
          <h1 className="text-3xl font-bold text-[#5C2482]">
            {assignment.title}
          </h1>
          <p className="mt-2 text-gray-600">
            {assignment.section.course.code}: {assignment.section.course.title}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Due: {new Date(assignment.dueDate).toLocaleString()}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-600">
              Total Submissions
            </p>
            <p className="text-3xl font-bold text-[#5C2482] mt-2">
              {assignment.submissions.length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-600">
              Pending Grading
            </p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {ungradedCount}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-600">
              Graded
            </p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {gradedCount}
            </p>
          </div>
        </div>

        {/* Submissions List */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#5C2482]">
              Submissions
            </h2>
          </div>
          <div className="p-6">
            {assignment.submissions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No submissions yet
              </p>
            ) : (
              <div className="space-y-4">
                {assignment.submissions.map((submission) => {
                  const tabSwitchEvents = submission.tabSwitches.filter(
                    (ts) => ts.eventType === 'visibility_hidden' || ts.eventType === 'blur'
                  )
                  const hasTabSwitches = tabSwitchEvents.length > 0

                  return (
                    <div
                      key={submission.id}
                      className={`border rounded-xl p-4 ${
                        hasTabSwitches ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-[#5C2482]">
                              {submission.student.name}
                            </h3>
                            {hasTabSwitches && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                ⚠️ {tabSwitchEvents.length} tab {tabSwitchEvents.length === 1 ? 'switch' : 'switches'}
                              </span>
                            )}
                            {submission.isLate && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                LATE
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            {submission.student.email}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Submitted: {new Date(submission.submittedAt).toLocaleString()}
                          </p>
                        </div>
                      <div className="text-right">
                        {submission.grade !== null ? (
                          <div>
                            <span className="text-2xl font-bold text-green-600">
                              {submission.grade}%
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              Graded {new Date(submission.gradedAt!).toLocaleDateString()}
                            </p>
                          </div>
                        ) : (
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs sm:text-sm font-medium rounded-full">
                            Not Graded
                          </span>
                        )}
                      </div>
                    </div>

                    {submission.text && (
                      <div className="mb-4 p-3 bg-gray-50 rounded">
                        <p className="text-xs sm:text-sm text-gray-700">
                          {submission.text}
                        </p>
                      </div>
                    )}

                    {submission.fileKey && (
                      <div className="mb-4">
                        <a
                          href={`/api/files/${submission.fileKey}/download-url`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs sm:text-sm text-[#5C2482] hover:underline"
                        >
                          📎 Download Submission
                        </a>
                      </div>
                    )}

                    {hasTabSwitches && (
                      <details className="mb-4">
                        <summary className="cursor-pointer text-xs sm:text-sm font-medium text-yellow-800 hover:text-yellow-900 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          View Tab Switch Log ({tabSwitchEvents.length} events)
                        </summary>
                        <div className="mt-3 p-3 bg-white border border-yellow-200 rounded-lg">
                          <p className="text-xs text-gray-600 mb-2">
                            This student switched tabs or windows during the assignment. Review timestamps below:
                          </p>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {tabSwitchEvents.map((event, idx) => (
                              <div key={event.id} className="text-xs text-gray-700 py-1 px-2 bg-gray-50 rounded flex items-center justify-between">
                                <span>
                                  {idx + 1}. {event.eventType === 'visibility_hidden' ? 'Tab hidden' : 'Window lost focus'}
                                </span>
                                <span className="text-gray-500">
                                  {new Date(event.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    )}

                    <GradeSubmissionForm submission={submission} />
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
