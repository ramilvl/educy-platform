import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { requireInstructor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/dashboard-layout'
import { getContentAgeStats, filterByAgeStatus } from '@/lib/content-aging'
import Link from 'next/link'

export default async function InstructorDashboard() {
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

  // Fetch instructor's courses/sections
  const sections = await prisma.section.findMany({
    where: { instructorId: userId },
    include: {
      course: true,
      _count: {
        select: {
          enrollments: true,
          assignments: true,
          lessons: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch assignments from instructor's sections
  const assignments = await prisma.assignment.findMany({
    where: {
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
      _count: {
        select: {
          submissions: true,
        },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 5,
  })

  // Fetch recent submissions for grading
  const recentSubmissions = await prisma.submission.findMany({
    where: {
      assignment: {
        section: {
          instructorId: userId,
        },
      },
      grade: null, // Ungraded submissions
    },
    include: {
      assignment: {
        include: {
          section: {
            include: {
              course: true,
            },
          },
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
    take: 10,
  })

  // Fetch all content for aging analysis
  const allLessons = await prisma.lesson.findMany({
    where: {
      section: {
        instructorId: userId,
      },
      isArchived: false,
    },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      section: {
        select: {
          id: true,
          course: {
            select: {
              code: true,
              title: true,
            },
          },
        },
      },
    },
  })

  const allAssignments = await prisma.assignment.findMany({
    where: {
      section: {
        instructorId: userId,
      },
      isArchived: false,
    },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      section: {
        select: {
          id: true,
          course: {
            select: {
              code: true,
              title: true,
            },
          },
        },
      },
    },
  })

  // Combine all content for aging stats
  const allContent = [...allLessons, ...allAssignments].map((item) => ({
    ...item,
    type: 'lessons' in allLessons && allLessons.includes(item as any) ? 'lesson' : 'assignment',
  }))

  const contentStats = getContentAgeStats(allContent)
  const outdatedContent = filterByAgeStatus(allContent, ['outdated', 'aging']).slice(0, 5)

  return (
    <DashboardLayout role={session.user.role}>
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 -my-8 p-4 md:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#5C2482]">
            Instructor Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {session.user.name}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <svg className="w-6 h-6 text-[#5C2482]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-xs sm:text-sm font-medium text-[#5C2482]">
                  Total Sections
                </p>
                <p className="text-2xl font-bold text-[#5C2482]">
                  {sections.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-xs sm:text-sm font-medium text-[#5C2482]">
                  Total Students
                </p>
                <p className="text-2xl font-bold text-[#5C2482]">
                  {sections.reduce((sum, s) => sum + s._count.enrollments, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-xs sm:text-sm font-medium text-[#5C2482]">
                  Active Assignments
                </p>
                <p className="text-2xl font-bold text-[#5C2482]">
                  {assignments.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-xs sm:text-sm font-medium text-[#5C2482]">
                  Pending Grading
                </p>
                <p className="text-2xl font-bold text-[#5C2482]">
                  {recentSubmissions.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Aging Alert */}
        {contentStats.needsReview > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl shadow border-2 border-yellow-200">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-yellow-100">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-yellow-900">
                      Content Review Needed
                    </h3>
                    <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                      You have <strong>{contentStats.needsReview}</strong> content item{contentStats.needsReview !== 1 ? 's' : ''} that may need updating
                      ({contentStats.outdated} outdated, {contentStats.aging} aging)
                    </p>
                    {outdatedContent.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {outdatedContent.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between bg-white/60 rounded-lg p-3">
                            <div>
                              <p className="font-medium text-gray-900 text-xs sm:text-sm">
                                {item.title}
                              </p>
                              <p className="text-xs text-gray-600">
                                {item.section.course.code} • Last updated{' '}
                                {new Date(item.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                              ⏰ Needs review
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Link
                  href="/instructor/content"
                  className="px-3 py-2 sm:px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl transition font-medium text-xs sm:text-sm flex-shrink-0"
                >
                  Review Content
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* My Sections */}
        <div className="bg-white rounded-xl shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-[#5C2482]">
              My Sections
            </h2>
            <Link
              href="/instructor/courses/new"
              className="px-3 py-2 sm:px-4 bg-[#F95B0E] hover:bg-[#d94f0c] text-white rounded-xl transition font-medium"
            >
              Create New Course
            </Link>
          </div>
          <div className="p-6">
            {sections.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  No sections yet. Create your first course to get started!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sections.map((section) => (
                  <Link
                    key={section.id}
                    href={`/instructor/courses/${section.course.id}`}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition group"
                  >
                    <h3 className="font-semibold text-[#5C2482]">
                      {section.course.code}: {section.course.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {section.term}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>{section._count.enrollments} students</span>
                      <span>{section._count.lessons} lessons</span>
                      <span>{section._count.assignments} assignments</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Submissions */}
        <div className="bg-white rounded-xl shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-[#5C2482]">
              Pending Submissions
            </h2>
          </div>
          <div className="p-6">
            {recentSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  No pending submissions to grade.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-xl"
                  >
                    <div>
                      <h3 className="font-medium text-[#5C2482]">
                        {submission.assignment.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {submission.assignment.section.course.code} • Submitted by{' '}
                        {submission.student.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(submission.submittedAt).toLocaleDateString()} at{' '}
                        {new Date(submission.submittedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <Link
                      href={`/instructor/assignments/${submission.assignmentId}`}
                      className="px-3 py-2 sm:px-4 bg-[#F95B0E] hover:bg-[#d94f0c] text-white rounded-xl transition font-medium"
                    >
                      Grade
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </DashboardLayout>
  )
}
