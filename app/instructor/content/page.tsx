import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { requireInstructor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/dashboard-layout'
import {
  getContentAgeStats,
  groupByStatus,
  sortByAge,
  getContentStatus,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  getDaysSinceUpdate,
  getUpdateRecommendation,
} from '@/lib/content-aging'
import Link from 'next/link'

export default async function InstructorContentReviewPage() {
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

  // Fetch all content for the instructor
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
      description: true,
      updatedAt: true,
      section: {
        select: {
          id: true,
          course: {
            select: {
              id: true,
              code: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'asc', // Oldest first
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
      description: true,
      updatedAt: true,
      section: {
        select: {
          id: true,
          course: {
            select: {
              id: true,
              code: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'asc', // Oldest first
    },
  })

  const allAnnouncements = await prisma.announcement.findMany({
    where: {
      section: {
        instructorId: userId,
      },
      isArchived: false,
    },
    select: {
      id: true,
      title: true,
      content: true,
      updatedAt: true,
      section: {
        select: {
          id: true,
          course: {
            select: {
              id: true,
              code: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'asc', // Oldest first
    },
  })

  // Combine all content
  const allContent = [
    ...allLessons.map((l) => ({ ...l, type: 'lesson' as const })),
    ...allAssignments.map((a) => ({ ...a, type: 'assignment' as const })),
    ...allAnnouncements.map((a) => ({ ...a, type: 'announcement' as const })),
  ]

  const contentStats = getContentAgeStats(allContent)
  const groupedContent = groupByStatus(allContent)

  return (
    <DashboardLayout role={session.user.role}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#5C2482]">
            Content Review Center
          </h1>
          <p className="mt-2 text-xs sm:text-sm sm:text-base text-gray-600">
            Monitor and update your course content to ensure it stays current and relevant
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4 md:p-6">
            <div className="text-center">
              <p className="text-xs sm:text-xs sm:text-sm font-medium text-gray-600">Total Content</p>
              <p className="text-2xl sm:text-3xl font-bold text-[#5C2482] mt-2">
                {contentStats.total}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow border border-green-200 p-4 md:p-6">
            <div className="text-center">
              <p className="text-xs sm:text-xs sm:text-sm font-medium text-green-700">Fresh & Current</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-2">
                {contentStats.fresh + contentStats.current}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl shadow border border-yellow-200 p-4 md:p-6">
            <div className="text-center">
              <p className="text-xs sm:text-xs sm:text-sm font-medium text-yellow-700">Aging</p>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-600 mt-2">
                {contentStats.aging}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl shadow border border-red-200 p-4 md:p-6">
            <div className="text-center">
              <p className="text-xs sm:text-xs sm:text-sm font-medium text-red-700">Outdated</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-2">
                {contentStats.outdated}
              </p>
            </div>
          </div>
        </div>

        {/* Needs Review Alert */}
        {contentStats.needsReview > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl shadow border-2 border-yellow-300 p-4 md:p-6">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-2 md:p-3 rounded-full bg-yellow-100 flex-shrink-0">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-semibold text-yellow-900">
                  Action Required
                </h3>
                <p className="text-xs md:text-xs sm:text-sm text-yellow-700 mt-1">
                  You have <strong>{contentStats.needsReview}</strong> content item{contentStats.needsReview !== 1 ? 's' : ''} that need{contentStats.needsReview === 1 ? 's' : ''} review and updates.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Sections by Status */}
        {(['outdated', 'aging', 'current', 'fresh'] as const).map((status) => {
          const items = groupedContent[status]
          if (items.length === 0) return null

          return (
            <div key={status} className="bg-white rounded-xl shadow border border-gray-200">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-xl md:text-2xl">{getStatusIcon(status)}</span>
                    <h2 className="text-lg md:text-xl font-semibold text-[#5C2482]">
                      {getStatusLabel(status)} Content
                    </h2>
                    <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-xs sm:text-sm font-medium ${getStatusColor(status)}`}>
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4 md:p-6">
                <div className="space-y-3 md:space-y-4">
                  {items.map((item) => {
                    const daysSinceUpdate = getDaysSinceUpdate(item.updatedAt)
                    const itemStatus = getContentStatus(item.updatedAt)
                    const recommendation = getUpdateRecommendation(itemStatus)

                    return (
                      <div
                        key={item.id}
                        className="border border-gray-200 rounded-xl p-4 md:p-5 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between gap-3 md:gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 md:gap-3 flex-wrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize flex-shrink-0 ${
                                item.type === 'lesson' ? 'bg-blue-100 text-blue-700' :
                                item.type === 'assignment' ? 'bg-purple-100 text-purple-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {item.type}
                              </span>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900 text-xs sm:text-sm md:text-base break-words">
                                  {item.title}
                                </h3>
                                {item.section && (
                                  <p className="text-xs md:text-xs sm:text-sm text-gray-600 mt-1">
                                    {item.section.course.code}: {item.section.course.title}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-xs sm:text-sm">
                              <div className="flex items-center gap-1 md:gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-gray-600">
                                  Last updated {daysSinceUpdate} day{daysSinceUpdate !== 1 ? 's' : ''} ago
                                </span>
                              </div>
                              <div className="flex items-center gap-1 md:gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-gray-600 text-xs">
                                  {new Date(item.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {(itemStatus === 'aging' || itemStatus === 'outdated') && (
                              <div className="mt-3 flex items-start gap-2 p-2 md:p-3 bg-yellow-50 rounded-lg">
                                <svg className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <p className="text-xs md:text-xs sm:text-sm text-yellow-800">{recommendation}</p>
                              </div>
                            )}
                          </div>

                          <Link
                            href={
                              item.type === 'lesson' && item.section
                                ? `/instructor/courses/${item.section.id}/lessons/${item.id}/edit`
                                : item.type === 'assignment'
                                ? `/instructor/assignments/${item.id}`
                                : item.section
                                ? `/instructor/courses/${item.section.course.id}`
                                : '#'
                            }
                            className="px-3 md:px-3 py-2 sm:px-4 border border-[#5C2482] text-[#5C2482] rounded-xl hover:bg-[#5C2482] hover:text-white transition text-xs md:text-xs sm:text-sm font-medium flex-shrink-0"
                          >
                            {itemStatus === 'aging' || itemStatus === 'outdated' ? 'Update Now' : 'View'}
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}

        {/* Empty State */}
        {allContent.length === 0 && (
          <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center">
            <div className="text-5xl md:text-6xl mb-4">📚</div>
            <p className="text-base md:text-lg text-gray-500">
              No content found. Create your first lesson or assignment to get started!
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
