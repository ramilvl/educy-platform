import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { requireInstructor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/dashboard-layout'
import { CourseActions } from '@/components/course-actions'
import Link from 'next/link'

export default async function InstructorCoursesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  try {
    await requireInstructor()
  } catch {
    redirect('/unauthorized')
  }

  const userId = session.user.id

  // Fetch instructor's sections with course details
  const sections = await prisma.section.findMany({
    where: { instructorId: userId },
    include: {
      course: true,
      enrollments: {
        where: { status: 'ENROLLED' },
        select: { id: true },
      },
      _count: {
        select: {
          assignments: true,
          lessons: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <DashboardLayout role={session.user.role}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#5C2482]">
              My Courses
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              Manage your courses and sections
            </p>
          </div>
          <Link
            href="/instructor/courses/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-[#F95B0E] to-[#e05a0e] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-semibold text-sm sm:text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Course
          </Link>
        </div>

        {/* Courses List */}
        {sections.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 sm:p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#5C2482]/10 to-[#F95B0E]/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-[#5C2482]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                No courses yet
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-8">
                Get started by creating your first course and begin teaching students.
              </p>
              <Link
                href="/instructor/courses/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F95B0E] to-[#e05a0e] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Course
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#5C2482]/20 transition-all duration-200 overflow-hidden"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#5C2482] to-[#7B3FA3] rounded-xl flex items-center justify-center text-white font-bold text-sm">
                            {section.course.code.substring(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/instructor/courses/${section.course.id}`}
                              className="group block"
                            >
                              <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-[#5C2482] transition-colors line-clamp-1">
                                {section.course.code}: {section.course.title}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-gradient-to-r from-[#5C2482]/10 to-[#7B3FA3]/10 text-[#5C2482] rounded-full border border-[#5C2482]/20">
                                {section.term}
                              </span>
                              <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-full border border-blue-200">
                                Section #{section.id.substring(0, 8)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {section.course.description && (
                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-4">
                            {section.course.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="font-semibold text-blue-900">{section.enrollments.length}</span>
                            <span className="text-blue-600">/ {section.capacity}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="font-semibold text-green-900">{section._count.lessons}</span>
                            <span className="text-green-600">lessons</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 rounded-lg">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="font-semibold text-purple-900">{section._count.assignments}</span>
                            <span className="text-purple-600">tasks</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <CourseActions
                          courseId={section.course.id}
                          courseCode={section.course.code}
                          courseTitle={section.course.title}
                          hasEnrollments={section.enrollments.length > 0}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>
    </DashboardLayout>
  )
}
