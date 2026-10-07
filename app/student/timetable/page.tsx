import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'
import { DayOfWeek } from '@prisma/client'


const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default async function StudentTimetablePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Get all enrolled sections
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id, status: 'ENROLLED' },
    include: {
      section: {
        include: {
          course: true,
          instructor: {
            select: {
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

  // Track courses with and without schedules
  const coursesWithoutSchedule: any[] = []

  enrollments.forEach((enrollment) => {
    if (enrollment.section.lessons.length > 0) {
      enrollment.section.lessons.forEach((lesson) => {
        lessonsByDay[lesson.dayOfWeek].push({
          ...lesson,
          course: enrollment.section.course,
        })
      })
    } else {
      coursesWithoutSchedule.push(enrollment)
    }
  })

  return (
    <DashboardLayout role={user.role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#5C2482]">
            My Timetable
          </h1>
          <p className="text-gray-600 mt-2">
            Your weekly class schedule • {enrollments.length} enrolled course{enrollments.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Weekly Timetable */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-[#5C2482] uppercase tracking-wider">
                    Day
                  </th>
                  <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-[#5C2482] uppercase tracking-wider">
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
                              className="flex items-start space-x-4 p-3 bg-gray-50 rounded-xl border border-gray-200"
                            >
                              <div className="flex-shrink-0">
                                <div className="text-xs sm:text-sm font-medium text-[#5C2482]">
                                  {lesson.startTime}
                                </div>
                                <div className="text-xs text-[#7B3FA3]">
                                  {lesson.endTime}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-[#5C2482]">
                                  {lesson.title}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                  {lesson.course.code} - {lesson.course.title}
                                </p>
                                {lesson.room && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    📍 {lesson.room.name}
                                    {lesson.room.location && ` (${lesson.room.location})`}
                                  </p>
                                )}
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
          </div>
        </div>

        {/* Courses Without Schedule */}
        {coursesWithoutSchedule.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-1">
                  Courses Without Schedule ({coursesWithoutSchedule.length})
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  These courses don't have scheduled class times yet. Contact your instructor for more information.
                </p>
                <div className="space-y-2">
                  {coursesWithoutSchedule.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="bg-white rounded-lg p-3 border border-yellow-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">
                              {enrollment.section.course.code}
                            </span>
                            <span className="text-xs text-gray-500">
                              {enrollment.section.term}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {enrollment.section.course.title}
                          </p>
                          {enrollment.section.course.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                              {enrollment.section.course.description}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-gray-600">Instructor</p>
                          <p className="text-sm font-medium text-gray-900">
                            {enrollment.section.instructor?.name || 'TBA'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar View Hint */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs sm:text-sm text-[#5C2482]">
            💡 <strong>Tip:</strong> You can export your timetable to your calendar app (Coming soon)
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
