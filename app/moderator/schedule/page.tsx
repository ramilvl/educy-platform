import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'
import { DayOfWeek } from '@prisma/client'

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default async function ModeratorSchedulePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  if (user.role !== 'MODERATOR' && user.role !== 'ADMIN') {
    redirect('/unauthorized')
  }

  // Get ALL sections in the system (moderators oversee all sections)
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
      lessons: {
        include: {
          room: true,
        },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' },
        ],
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

  // Organize lessons by day
  const lessonsByDay: Record<DayOfWeek, Array<any>> = {
    MONDAY: [],
    TUESDAY: [],
    WEDNESDAY: [],
    THURSDAY: [],
    FRIDAY: [],
    SATURDAY: [],
    SUNDAY: [],
  }

  sections.forEach((section) => {
    section.lessons.forEach((lesson) => {
      lessonsByDay[lesson.dayOfWeek].push({
        ...lesson,
        course: section.course,
        section: {
          id: section.id,
          term: section.term,
          enrollmentCount: section._count.enrollments,
          capacity: section.capacity,
          instructor: section.instructor,
        },
      })
    })
  })

  const totalSections = sections.length
  const totalLessons = sections.reduce((sum, section) => sum + section.lessons.length, 0)
  const totalStudents = sections.reduce((sum, section) => sum + section._count.enrollments, 0)
  const sectionsWithoutSchedule = sections.filter(s => s.lessons.length === 0)

  return (
    <DashboardLayout role={user.role}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#5C2482]">
            System-wide Schedule
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor all scheduled classes across the system (Read-only)
          </p>
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
                  <span className="text-2xl">📅</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-600">
                  Total Lessons
                </p>
                <p className="text-2xl font-semibold text-[#5C2482]">
                  {totalLessons}
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
                  Total Students
                </p>
                <p className="text-2xl font-semibold text-[#5C2482]">
                  {totalStudents}
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
                  No Schedule
                </p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {sectionsWithoutSchedule.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Timetable */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#5C2482]">
                Weekly Schedule Overview
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
                  <span className="text-3xl">📅</span>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Day
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Classes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {DAYS.map((day, index) => (
                    <tr key={day} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#5C2482]">
                        {DAY_NAMES[index]}
                        <div className="text-xs text-gray-500 font-normal">
                          {lessonsByDay[day].length} {lessonsByDay[day].length === 1 ? 'class' : 'classes'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {lessonsByDay[day].length === 0 ? (
                          <span className="text-sm text-gray-400">
                            No classes scheduled
                          </span>
                        ) : (
                          <div className="space-y-3">
                            {lessonsByDay[day].map((lesson) => (
                              <div
                                key={lesson.id}
                                className="flex items-start space-x-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
                              >
                                <div className="flex-shrink-0">
                                  <div className="text-sm font-semibold text-blue-900">
                                    {lesson.startTime}
                                  </div>
                                  <div className="text-xs text-blue-700">
                                    {lesson.endTime}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-[#5C2482]">
                                    {lesson.title}
                                  </p>
                                  <p className="text-sm text-gray-700 mt-1">
                                    {lesson.course.code} - {lesson.course.title}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                                    <span>📖 Term: {lesson.section.term}</span>
                                    {lesson.room && (
                                      <span>
                                        📍 {lesson.room.name}
                                        {lesson.room.location && ` (${lesson.room.location})`}
                                      </span>
                                    )}
                                    <span>
                                      👥 {lesson.section.enrollmentCount}/{lesson.section.capacity} students
                                    </span>
                                  </div>
                                  <div className="mt-2 text-xs text-gray-500">
                                    👨‍🏫 Instructor: {lesson.section.instructor?.name || 'TBA'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sections Without Schedule Warning */}
        {sectionsWithoutSchedule.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-1">
                  Sections Without Schedule ({sectionsWithoutSchedule.length})
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  These sections don't have scheduled class times yet. Instructors should add lessons to complete the schedule.
                </p>
                <div className="space-y-2">
                  {sectionsWithoutSchedule.slice(0, 5).map((section) => (
                    <div
                      key={section.id}
                      className="bg-white rounded-lg p-3 border border-yellow-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">
                              {section.course.code}
                            </span>
                            <span className="text-xs text-gray-500">
                              {section.term}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {section.course.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            👨‍🏫 {section.instructor?.name || 'No instructor assigned'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            👥 {section._count.enrollments}/{section.capacity} students enrolled
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {sectionsWithoutSchedule.length > 5 && (
                    <p className="text-xs text-yellow-700 text-center pt-2">
                      ... and {sectionsWithoutSchedule.length - 5} more sections
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Note:</strong> As a moderator, you have read-only access to view all scheduled classes.
            You cannot edit schedules, but you can monitor class distribution and identify scheduling conflicts.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
