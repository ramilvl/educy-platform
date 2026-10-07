'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import DashboardLayout from '@/components/dashboard-layout'

interface Assignment {
  id: string
  title: string
  dueDate: string
  section: {
    course: {
      code: string
      title: string
    }
  }
  submission?: {
    id: string
    submittedAt: string
  }
}

interface Exam {
  id: string
  title: string
  startTime: string
  endTime: string
  durationMinutes: number
  section: {
    course: {
      code: string
      title: string
    }
  }
  existingAttempt?: {
    isCompleted: boolean
  }
}

interface CaseRoom {
  id: string
  title: string
  dueDate: string | null
  isActive: boolean
  section: {
    course: {
      code: string
      title: string
    }
  }
}

export default function StudentDashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [caseRooms, setCaseRooms] = useState<CaseRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadDashboardData()
    }
  }, [status])

  async function loadDashboardData() {
    try {
      // Load assignments
      const assignmentsRes = await fetch('/api/student/assignments')
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json()
        setAssignments(data.assignments || [])
      }

      // Load exams
      const examsRes = await fetch('/api/exams')
      if (examsRes.ok) {
        const data = await examsRes.json()
        setExams(data.exams || [])
      }

      // Load case rooms
      const caseRoomsRes = await fetch('/api/case-rooms')
      if (caseRoomsRes.ok) {
        const data = await caseRoomsRes.json()
        setCaseRooms(data.rooms || [])
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // This week's assignments
  const thisWeekAssignments = assignments.filter(a => {
    const dueDate = new Date(a.dueDate)
    return dueDate <= weekFromNow && !a.submission
  })

  // Overdue assignments
  const overdueAssignments = assignments.filter(a => {
    const dueDate = new Date(a.dueDate)
    return dueDate < now && !a.submission
  })

  // Active exams
  const activeExams = exams.filter(e => {
    const startTime = new Date(e.startTime)
    const endTime = new Date(e.endTime)
    return startTime <= now && endTime > now && !e.existingAttempt?.isCompleted
  })

  // Upcoming exams (this week)
  const upcomingExams = exams.filter(e => {
    const startTime = new Date(e.startTime)
    return startTime > now && startTime <= weekFromNow
  })

  // Active case rooms
  const activeCaseRooms = caseRooms.filter(c => c.isActive)

  // Recently submitted assignments (last 7 days)
  const recentlySubmitted = assignments.filter(a => {
    if (!a.submission) return false
    const submittedDate = new Date(a.submission.submittedAt)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return submittedDate >= sevenDaysAgo
  })

  return (
    <DashboardLayout role={session?.user?.role || 'STUDENT'}>
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 -my-8 p-4 md:p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 mt-[15px]">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'Student'}
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">
            Here's what you need to focus on this week
          </p>
        </div>

        {/* Overdue Section - Non-punitive */}
        {overdueAssignments.length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 mb-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-orange-900 mb-2">
                  Pending Work ({overdueAssignments.length})
                </h2>
                <p className="text-xs sm:text-sm text-orange-800 mb-4">
                  These assignments have passed their due date. You can still submit them.
                </p>
                <div className="space-y-2">
                  {overdueAssignments.slice(0, 3).map((assignment) => (
                    <Link
                      key={assignment.id}
                      href={`/student/assignments/${assignment.id}`}
                      className="block bg-white rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{assignment.title}</p>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {assignment.section.course.code}: {assignment.section.course.title}
                          </p>
                        </div>
                        <span className="text-xs text-orange-600 font-medium">
                          {Math.ceil((now.getTime() - new Date(assignment.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days ago
                        </span>
                      </div>
                    </Link>
                  ))}
                  {overdueAssignments.length > 3 && (
                    <Link href="/student/assignments" className="block text-center text-xs sm:text-sm text-orange-700 hover:text-orange-800 font-medium pt-2">
                      View all {overdueAssignments.length} pending assignments →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Exams - Urgent */}
        {activeExams.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-red-900 mb-4">🔴 Active Exams - Take Now</h2>
            <div className="space-y-3">
              {activeExams.map((exam) => (
                <Link
                  key={exam.id}
                  href={`/student/exams/${exam.id}`}
                  className="block bg-white rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{exam.title}</p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {exam.section.course.code} • {exam.durationMinutes} minutes
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                        ACTIVE
                      </span>
                      <p className="text-xs text-red-600 mt-1">
                        Closes: {new Date(exam.endTime).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* This Week's Work */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assignments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900 truncate min-w-0 flex-1">📝 Assignments This Week</h2>
              <Link href="/student/assignments" className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap flex-shrink-0">
                View all →
              </Link>
            </div>

            {thisWeekAssignments.length === 0 ? (
              <p className="text-gray-500 text-xs sm:text-sm">No assignments due this week</p>
            ) : (
              <div className="space-y-3">
                {thisWeekAssignments.slice(0, 4).map((assignment) => (
                  <Link
                    key={assignment.id}
                    href={`/student/assignments/${assignment.id}`}
                    className="block border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900 text-xs sm:text-sm">{assignment.title}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {assignment.section.course.code}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
                {thisWeekAssignments.length > 4 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    +{thisWeekAssignments.length - 4} more
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Exams */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900 truncate min-w-0 flex-1">📊 Upcoming Exams</h2>
              <Link href="/student/exams" className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap flex-shrink-0">
                View all →
              </Link>
            </div>

            {upcomingExams.length === 0 ? (
              <p className="text-gray-500 text-xs sm:text-sm">No exams scheduled this week</p>
            ) : (
              <div className="space-y-3">
                {upcomingExams.slice(0, 4).map((exam) => (
                  <div
                    key={exam.id}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <p className="font-medium text-gray-900 text-xs sm:text-sm">{exam.title}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {exam.section.course.code} • {exam.durationMinutes} min
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Opens: {new Date(exam.startTime).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Case Rooms */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900 truncate min-w-0 flex-1">💬 Case Discussions</h2>
              <Link href="/student/case-rooms" className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap flex-shrink-0">
                View all →
              </Link>
            </div>

            {activeCaseRooms.length === 0 ? (
              <p className="text-gray-500 text-xs sm:text-sm">No active case discussions</p>
            ) : (
              <div className="space-y-3">
                {activeCaseRooms.slice(0, 4).map((room) => (
                  <Link
                    key={room.id}
                    href={`/student/case-rooms/${room.id}`}
                    className="block border border-gray-200 rounded-lg p-3 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900 text-xs sm:text-sm">{room.title}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {room.section.course.code}
                    </p>
                    {room.dueDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Due: {new Date(room.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recently Submitted */}
          {recentlySubmitted.length > 0 && (
            <div className="bg-green-50 rounded-xl shadow-sm border border-green-200 p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900 truncate min-w-0 flex-1">✅ Recently Submitted</h2>
                <Link href="/student/assignments" className="text-xs sm:text-sm text-green-600 hover:text-green-800 whitespace-nowrap flex-shrink-0">
                  View all →
                </Link>
              </div>

              <div className="space-y-2">
                {recentlySubmitted.slice(0, 3).map((assignment) => (
                  <Link
                    key={assignment.id}
                    href={`/student/assignments/${assignment.id}`}
                    className="block bg-white rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-xs sm:text-sm">{assignment.title}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {assignment.section.course.code}
                        </p>
                      </div>
                      <div className="text-right ml-2">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Submitted
                        </span>
                        {assignment.submission && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(assignment.submission.submittedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
                {recentlySubmitted.length > 3 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    +{recentlySubmitted.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-sm border border-blue-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">⚡ Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href="/student/courses"
                className="block bg-white rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <p className="font-medium text-gray-900 text-xs sm:text-sm">Browse Courses</p>
                <p className="text-xs text-gray-600">Enroll in new courses</p>
              </Link>
              <Link
                href="/student/timetable"
                className="block bg-white rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <p className="font-medium text-gray-900 text-xs sm:text-sm">My Timetable</p>
                <p className="text-xs text-gray-600">View your schedule</p>
              </Link>
              <Link
                href="/student/certificates"
                className="block bg-white rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <p className="font-medium text-gray-900 text-xs sm:text-sm">My Certificates</p>
                <p className="text-xs text-gray-600">View earned certificates</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {thisWeekAssignments.length === 0 && upcomingExams.length === 0 && activeCaseRooms.length === 0 && overdueAssignments.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200 mb-[10px]">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600">You have no upcoming tasks this week</p>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  )
}
