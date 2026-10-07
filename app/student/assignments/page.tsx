import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'
import Link from 'next/link'


export default async function StudentAssignmentsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Get all assignments for enrolled courses
  const assignments = await prisma.assignment.findMany({
    where: {
      section: {
        enrollments: {
          some: {
            userId: user.id,
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
      submissions: {
        where: { studentId: user.id },
      },
    },
    orderBy: { dueDate: 'desc' },
  })

  const now = new Date()
  const upcoming = assignments.filter(a => a.dueDate >= now && a.submissions.length === 0)
  const submitted = assignments.filter(a => a.submissions.length > 0)
  const overdue = assignments.filter(a => a.dueDate < now && a.submissions.length === 0)

  return (
    <DashboardLayout role={user.role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#5C2482]">
            Assignments
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your course assignments and submissions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-yellow-800">
                  Pending
                </p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">
                  {upcoming.length}
                </p>
              </div>
              <div className="text-3xl">⏳</div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-800">
                  Submitted
                </p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {submitted.length}
                </p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-red-800">
                  Overdue
                </p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  {overdue.length}
                </p>
              </div>
              <div className="text-3xl">⚠️</div>
            </div>
          </div>
        </div>

        {/* Upcoming Assignments */}
        {upcoming.length > 0 && (
          <div className="bg-white rounded-xl shadow border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-[#5C2482]">
                Upcoming Assignments
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {upcoming.map((assignment) => {
                const daysUntilDue = Math.ceil(
                  (assignment.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                )
                return (
                  <div
                    key={assignment.id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-[#5C2482]">
                          {assignment.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          {assignment.section.course.code} - {assignment.section.course.title}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-2">
                          {assignment.description}
                        </p>
                        <div className="flex items-center mt-3 space-x-4 text-xs sm:text-sm">
                          <span className={`font-medium ${daysUntilDue <= 3 ? 'text-red-600' : 'text-gray-600'}`}>
                            Due: {assignment.dueDate.toLocaleDateString()}
                            {daysUntilDue <= 3 && ` (${daysUntilDue} ${daysUntilDue === 1 ? 'day' : 'days'} left)`}
                          </span>
                          <span className="text-gray-500">
                            Allowed: {assignment.allowedFileTypes.join(', ')}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/student/assignments/${assignment.id}`}
                        className="ml-4 px-3 py-2 sm:px-4 bg-[#F95B0E] hover:bg-[#d94f0c] text-white rounded-xl transition font-medium"
                      >
                        Submit
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Submitted Assignments */}
        {submitted.length > 0 && (
          <div className="bg-white rounded-xl shadow border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-[#5C2482]">
                Submitted Assignments
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {submitted.map((assignment) => {
                const submission = assignment.submissions[0]
                return (
                  <div
                    key={assignment.id}
                    className="border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-[#5C2482]">
                          {assignment.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          {assignment.section.course.code} - {assignment.section.course.title}
                        </p>
                        <div className="flex items-center mt-3 space-x-4 text-xs sm:text-sm">
                          <span className="text-gray-600">
                            Submitted: {submission.submittedAt.toLocaleDateString()}
                          </span>
                          {submission.grade !== null && (
                            <span className="font-medium text-green-600">
                              Grade: {submission.grade}%
                            </span>
                          )}
                        </div>
                        {submission.feedback && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs sm:text-sm">
                            <p className="font-medium text-[#5C2482]">
                              Instructor Feedback:
                            </p>
                            <p className="text-gray-700 mt-1">
                              {submission.feedback}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {submission.grade !== null ? (
                          <span className="px-3 py-2 sm:px-4 bg-green-100 text-green-800 rounded-lg font-medium">
                            Graded
                          </span>
                        ) : (
                          <span className="px-3 py-2 sm:px-4 bg-yellow-100 text-yellow-800 rounded-lg font-medium">
                            Pending Review
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Overdue Assignments */}
        {overdue.length > 0 && (
          <div className="bg-white rounded-xl shadow border-2 border-red-200">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50">
              <h2 className="text-2xl font-semibold text-red-900">
                Overdue Assignments
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {overdue.map((assignment) => (
                <div
                  key={assignment.id}
                  className="border border-red-200 rounded-xl p-4 bg-red-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-[#5C2482]">
                        {assignment.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {assignment.section.course.code} - {assignment.section.course.title}
                      </p>
                      <p className="text-xs sm:text-sm text-red-600 mt-2 font-medium">
                        Due date passed: {assignment.dueDate.toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      href={`/student/assignments/${assignment.id}`}
                      className="ml-4 px-3 py-2 sm:px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium"
                    >
                      Submit Late
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {assignments.length === 0 && (
          <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-500">
              No assignments yet. Check back later!
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
