import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'
import { DayOfWeek } from '@prisma/client'

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default async function InstructorSchedulePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  if (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN') {
    redirect('/unauthorized')
  }

  // Get all sections instructor is teaching
  const sections = await prisma.section.findMany({
    where: { instructorId: user.id },
    include: {
      course: true,
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
        },
      })
    })
  })

  const totalLessons = sections.reduce((sum, section) => sum + section.lessons.length, 0)
  const totalStudents = sections.reduce((sum, section) => sum + section._count.enrollments, 0)

  return (
    <DashboardLayout role={user.role}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#5C2482]">
            Teaching Schedule
          </h1>
          <p className="text-gray-600 mt-2">
            Your weekly teaching timetable
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📚</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Sections
                </p>
                <p className="text-2xl font-semibold text-[#5C2482]">
                  {sections.length}
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
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Weekly Lessons
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
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Total Students
                </p>
                <p className="text-2xl font-semibold text-[#5C2482]">
                  {totalStudents}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Timetable */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-[#5C2482]">
              Weekly Schedule
            </h2>
          </div>
          <div className="overflow-x-auto">
            {sections.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <span className="text-3xl">📅</span>
                </div>
                <p className="text-gray-500 text-lg">
                  No sections assigned yet
                </p>
                <p className="text-gray-400 text-xs sm:text-sm mt-2">
                  Contact your administrator to get teaching sections assigned
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Day
                    </th>
                    <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Classes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {DAYS.map((day, index) => (
                    <tr key={day} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-[#5C2482]">
                        {DAY_NAMES[index]}
                      </td>
                      <td className="px-6 py-4">
                        {lessonsByDay[day].length === 0 ? (
                          <span className="text-xs sm:text-sm text-gray-400">
                            No classes
                          </span>
                        ) : (
                          <div className="space-y-3">
                            {lessonsByDay[day].map((lesson) => (
                              <div
                                key={lesson.id}
                                className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200"
                              >
                                <div className="flex-shrink-0">
                                  <div className="text-xs sm:text-sm font-semibold text-blue-900">
                                    {lesson.startTime}
                                  </div>
                                  <div className="text-xs text-blue-700">
                                    {lesson.endTime}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm font-semibold text-[#5C2482]">
                                    {lesson.title}
                                  </p>
                                  <p className="text-xs sm:text-sm text-gray-700 mt-1">
                                    {lesson.course.code} - {lesson.course.title}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Term: {lesson.section.term}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2">
                                    {lesson.room && (
                                      <span className="text-xs text-gray-500">
                                        📍 {lesson.room.name}
                                        {lesson.room.location && ` (${lesson.room.location})`}
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-500">
                                      👥 {lesson.section.enrollmentCount} students
                                    </span>
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

        {/* Calendar Export Hint */}
        {sections.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs sm:text-sm text-blue-800">
              💡 <strong>Tip:</strong> You can export your teaching schedule to your calendar app (Coming soon)
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
