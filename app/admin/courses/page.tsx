import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'
import Link from 'next/link'

export default async function AdminCoursesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  if (user.role !== 'ADMIN') {
    redirect('/unauthorized')
  }

  // Get all courses with detailed information
  const courses = await prisma.course.findMany({
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      sections: {
        include: {
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
              lessons: true,
            },
          },
        },
      },
      _count: {
        select: {
          sections: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Calculate course statistics
  const totalCourses = courses.length
  const totalSections = courses.reduce((sum, course) => sum + course._count.sections, 0)
  const totalEnrollments = courses.reduce((sum, course) =>
    sum + course.sections.reduce((sSum, section) => sSum + section._count.enrollments, 0), 0
  )
  const coursesWithoutSections = courses.filter(c => c._count.sections === 0).length

  return (
    <DashboardLayout role={user.role}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#5C2482]">
              Course Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage all courses, sections, and instructors across the system
            </p>
          </div>
        </div>

        {/* Statistics */}
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
                  Total Courses
                </p>
                <p className="text-2xl font-semibold text-[#5C2482]">
                  {totalCourses}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📖</span>
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
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-600">
                  Enrollments
                </p>
                <p className="text-2xl font-semibold text-[#5C2482]">
                  {totalEnrollments}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-600">
                  No Sections
                </p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {coursesWithoutSections}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Courses Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <h2 className="text-lg font-semibold text-[#5C2482]">
              All Courses
            </h2>
          </div>
          <div className="overflow-x-auto">
            {courses.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <span className="text-3xl">📚</span>
                </div>
                <p className="text-gray-500 text-lg">
                  No courses in the system yet
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Courses will appear here once instructors create them
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
                      Creator
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sections
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enrollments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courses.map((course) => {
                    const totalCourseEnrollments = course.sections.reduce(
                      (sum, section) => sum + section._count.enrollments,
                      0
                    )

                    return (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded">
                                {course.code}
                              </span>
                              <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded">
                                {course.term}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-[#5C2482]">
                              {course.title}
                            </div>
                            {course.description && (
                              <div className="text-xs text-gray-600 mt-1 line-clamp-1">
                                {course.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {course.createdBy?.name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {course.createdBy?.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {course._count.sections}
                          </span>
                          {course._count.sections === 0 && (
                            <div className="text-xs text-yellow-600 mt-1">
                              No sections
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {totalCourseEnrollments}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            across all sections
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link
                            href={`/admin/courses/${course.id}`}
                            className="text-[#5C2482] hover:text-[#7B3FA3] font-medium"
                          >
                            View Details →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Courses Without Sections Warning */}
        {coursesWithoutSections > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-1">
                  Courses Without Sections ({coursesWithoutSections})
                </h3>
                <p className="text-sm text-yellow-800">
                  These courses don't have any sections yet. Instructors should create sections to make these courses available to students.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Admin Course Management:</strong> As an admin, you have full oversight of all courses.
            You can view course details, monitor sections, and track enrollments. To edit courses or manage instructors,
            navigate to the course detail page.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
