import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'
import Link from 'next/link'

export default async function AdminCourseDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  if (user.role !== 'ADMIN') {
    redirect('/unauthorized')
  }

  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          surname: true,
          email: true,
          role: true,
        },
      },
      sections: {
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              surname: true,
              email: true,
            },
          },
          lessons: {
            orderBy: [
              { dayOfWeek: 'asc' },
              { startTime: 'asc' },
            ],
            include: {
              room: true,
            },
          },
          enrollments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                  email: true,
                },
              },
            },
            where: {
              status: 'ENROLLED',
            },
          },
          _count: {
            select: {
              enrollments: true,
              lessons: true,
              assignments: true,
            },
          },
        },
        orderBy: {
          term: 'desc',
        },
      },
    },
  })

  if (!course) {
    notFound()
  }

  const totalSections = course.sections.length
  const totalEnrollments = course.sections.reduce(
    (sum, section) => sum + section._count.enrollments,
    0
  )
  const totalLessons = course.sections.reduce(
    (sum, section) => sum + section._count.lessons,
    0
  )
  const totalAssignments = course.sections.reduce(
    (sum, section) => sum + section._count.assignments,
    0
  )

  // Get unique instructors across all sections
  const uniqueInstructors = new Map()
  course.sections.forEach((section) => {
    if (section.instructor) {
      uniqueInstructors.set(section.instructor.id, section.instructor)
    }
  })

  return (
    <DashboardLayout role={user.role}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/admin/courses"
              className="text-sm text-[#5C2482] hover:underline mb-2 inline-block"
            >
              ← Back to Courses
            </Link>
            <h1 className="text-3xl font-bold text-[#5C2482]">
              {course.title}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block px-3 py-1 text-sm font-semibold bg-purple-100 text-purple-800 rounded">
                {course.code}
              </span>
              <span className="inline-block px-3 py-1 text-sm font-semibold bg-gray-100 text-gray-700 rounded">
                {course.term}
              </span>
            </div>
          </div>
        </div>

        {/* Course Information */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-[#5C2482] mb-4">
            Course Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Description</p>
              <p className="text-gray-900">
                {course.description || 'No description provided'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Created By</p>
              <p className="text-gray-900 font-medium">
                {course.createdBy?.name} {course.createdBy?.surname}
              </p>
              <p className="text-sm text-gray-600">{course.createdBy?.email}</p>
              <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded mt-1">
                {course.createdBy?.role}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Created At</p>
              <p className="text-gray-900">
                {new Date(course.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Visibility</p>
              <span className={`inline-block px-3 py-1 text-sm font-semibold rounded ${
                course.visibility
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {course.visibility ? 'Visible' : 'Hidden'}
              </span>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-600">Sections</p>
            <p className="text-3xl font-bold text-[#5C2482] mt-2">{totalSections}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-600">Total Enrollments</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{totalEnrollments}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-600">Lessons</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{totalLessons}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-600">Assignments</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">{totalAssignments}</p>
          </div>
        </div>

        {/* Instructors */}
        {uniqueInstructors.size > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-[#5C2482] mb-4">
              Instructors ({uniqueInstructors.size})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(uniqueInstructors.values()).map((instructor) => (
                <div
                  key={instructor.id}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <p className="font-medium text-gray-900">
                    {instructor.name} {instructor.surname}
                  </p>
                  <p className="text-sm text-gray-600">{instructor.email}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#5C2482]">
              Sections ({totalSections})
            </h2>
          </div>
          <div className="p-6">
            {course.sections.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  No sections created for this course yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {course.sections.map((section) => (
                  <div
                    key={section.id}
                    className="border border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-block px-3 py-1 text-sm font-semibold bg-purple-100 text-purple-800 rounded">
                            {section.term}
                          </span>
                          <span className="text-sm text-gray-600">
                            Capacity: {section._count.enrollments}/{section.capacity}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Section {section.term}
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Instructor</p>
                        <p className="font-medium text-gray-900">
                          {section.instructor
                            ? `${section.instructor.name} ${section.instructor.surname || ''}`
                            : 'Not assigned'}
                        </p>
                        {section.instructor && (
                          <p className="text-sm text-gray-600">{section.instructor.email}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Enrollments</p>
                        <p className="font-medium text-gray-900">
                          {section._count.enrollments} students
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Content</p>
                        <p className="font-medium text-gray-900">
                          {section._count.lessons} lessons, {section._count.assignments} assignments
                        </p>
                      </div>
                    </div>

                    {/* Lessons */}
                    {section.lessons.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Schedule ({section.lessons.length} lessons)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {section.lessons.slice(0, 4).map((lesson) => (
                            <div
                              key={lesson.id}
                              className="text-sm bg-gray-50 p-2 rounded"
                            >
                              <span className="font-medium">{lesson.dayOfWeek}</span>
                              {' - '}
                              {lesson.startTime} to {lesson.endTime}
                              {lesson.room && (
                                <span className="text-gray-600"> • {lesson.room.name}</span>
                              )}
                            </div>
                          ))}
                          {section.lessons.length > 4 && (
                            <p className="text-xs text-gray-500 col-span-2">
                              ... and {section.lessons.length - 4} more lessons
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Enrolled Students Preview */}
                    {section.enrollments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Enrolled Students (showing {Math.min(5, section.enrollments.length)} of {section.enrollments.length})
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {section.enrollments.slice(0, 5).map((enrollment) => (
                            <div
                              key={enrollment.id}
                              className="text-sm bg-gray-50 p-2 rounded"
                            >
                              {enrollment.user.name} {enrollment.user.surname}
                              <span className="text-gray-600 text-xs ml-2">
                                {enrollment.user.email}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Admin Actions Notice */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔧</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                Admin Course Management
              </h3>
              <p className="text-sm text-purple-800 mb-3">
                As an administrator, you have full oversight of this course. Currently available actions:
              </p>
              <ul className="list-disc list-inside text-sm text-purple-800 space-y-1">
                <li>View all course details and sections</li>
                <li>Monitor enrollments and instructors</li>
                <li>Track course content (lessons, assignments)</li>
              </ul>
              <p className="text-sm text-purple-700 mt-3">
                <strong>Note:</strong> Direct course editing and instructor reassignment features are coming soon.
                Contact the course creator or instructor for immediate changes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
