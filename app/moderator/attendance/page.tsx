import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'

export default async function ModeratorAttendancePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  if (user.role !== 'MODERATOR' && user.role !== 'ADMIN') {
    redirect('/unauthorized')
  }

  // Get enrollment statistics (temporary measure until attendance tracking is implemented)
  const sections = await prisma.section.findMany({
    include: {
      course: true,
      instructor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
    orderBy: [
      { term: 'desc' },
      { course: { code: 'asc' } },
    ],
  })

  const totalSections = sections.length
  const totalEnrolledStudents = sections.reduce((sum, section) => sum + section._count.enrollments, 0)
  const fullSections = sections.filter(s => s._count.enrollments >= s.capacity).length
  const emptySections = sections.filter(s => s._count.enrollments === 0).length

  // Calculate capacity utilization
  const totalCapacity = sections.reduce((sum, section) => sum + section.capacity, 0)
  const capacityUtilization = totalCapacity > 0
    ? Math.round((totalEnrolledStudents / totalCapacity) * 100)
    : 0

  return (
    <DashboardLayout role={user.role}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#5C2482]">
            Attendance & Enrollment
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor student enrollment and attendance across all sections (Read-only)
          </p>
        </div>

        {/* Feature Notice */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🚧</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Attendance Tracking Coming Soon
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                Full attendance tracking functionality is currently under development. This will include:
              </p>
              <ul className="list-disc list-inside text-sm text-blue-800 space-y-1 mb-3">
                <li>Daily attendance recording for each lesson</li>
                <li>Attendance statistics and reports</li>
                <li>Automatic alerts for low attendance</li>
                <li>Student attendance history and trends</li>
              </ul>
              <p className="text-sm text-blue-700">
                For now, you can view enrollment statistics below.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📚</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-600">
                  Total Sections
                </p>
                <p className="text-2xl font-semibold text-[#5C2482]">
                  {totalSections}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-600">
                  Enrolled Students
                </p>
                <p className="text-2xl font-semibold text-[#5C2482]">
                  {totalEnrolledStudents}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-600">
                  Capacity Used
                </p>
                <p className="text-2xl font-semibold text-[#5C2482]">
                  {capacityUtilization}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🔴</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-600">
                  Full Sections
                </p>
                <p className="text-2xl font-semibold text-red-600">
                  {fullSections}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enrollment Overview */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#5C2482]">
                Enrollment Overview by Section
              </h2>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Read-only
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            {sections.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <span className="text-3xl">📋</span>
                </div>
                <p className="text-gray-500 text-lg">
                  No sections in the system yet
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Sections will appear here once instructors create them
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Term
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Instructor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enrollment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sections.map((section) => {
                    const enrollmentPercentage = Math.round((section._count.enrollments / section.capacity) * 100)
                    const isFull = section._count.enrollments >= section.capacity
                    const isEmpty = section._count.enrollments === 0
                    const isLow = enrollmentPercentage < 30 && !isEmpty

                    return (
                      <tr key={section.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-semibold text-[#5C2482]">
                              {section.course.code}
                            </div>
                            <div className="text-sm text-gray-600">
                              {section.course.title}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            {section.term}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {section.instructor?.name || 'TBA'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-900">
                              {section._count.enrollments} / {section.capacity}
                            </span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                              <div
                                className={`h-2 rounded-full ${
                                  isFull ? 'bg-red-500' :
                                  isLow ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(enrollmentPercentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {enrollmentPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isFull && (
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                              Full
                            </span>
                          )}
                          {isEmpty && (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                              Empty
                            </span>
                          )}
                          {isLow && (
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
                              Low
                            </span>
                          )}
                          {!isFull && !isEmpty && !isLow && (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                              Good
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Empty Sections Warning */}
        {emptySections > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-700">
              <strong>⚠️ Note:</strong> There are {emptySections} section{emptySections !== 1 ? 's' : ''} with zero enrollments.
              These may need attention from instructors or administrators.
            </p>
          </div>
        )}

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Note:</strong> As a moderator, you have read-only access to view enrollment statistics.
            Full attendance tracking will be available soon, allowing you to monitor student participation in real-time.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
