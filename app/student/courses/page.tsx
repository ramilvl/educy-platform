'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'
import { LeaveCourseButton } from '@/components/leave-course-button'
import ScrollToTop from '@/components/scroll-to-top'

interface Course {
  id: string
  code: string
  title: string
  description: string | null
  sections: Section[]
}

interface Section {
  id: string
  term: string
  capacity: number
  instructor: {
    name: string
  }
  _count: {
    enrollments: number
  }
}

interface Enrollment {
  id: string
  section: {
    id: string
    term: string
    capacity: number
    instructor: {
      name: string
      email: string
    }
    course: {
      id: string
      code: string
      title: string
      description: string | null
    }
    _count: {
      enrollments: number
    }
  }
}

interface Certificate {
  id: string
  sectionId: string
  certificateNumber: string
}

export default function StudentCoursesPage() {
  const { data: session, status } = useSession()
  const [enrolledCourses, setEnrolledCourses] = useState<Enrollment[]>([])
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [pendingSections, setPendingSections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [enrollDialog, setEnrollDialog] = useState<{ isOpen: boolean; section: any; course: any } | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCourses()
    }
  }, [status])

  const fetchCourses = async () => {
    try {
      const [enrolledRes, availableRes, pendingRes, certificatesRes] = await Promise.all([
        fetch('/api/student/enrollments'),
        fetch('/api/student/courses/available'),
        fetch('/api/enrollments/my-requests'),
        fetch('/api/student/certificates'),
      ])

      const enrolledData = await enrolledRes.json()
      const availableData = await availableRes.json()
      const pendingData = await pendingRes.json()
      const certificatesData = await certificatesRes.json()

      if (enrolledData.success) {
        setEnrolledCourses(enrolledData.enrollments || [])
      }

      if (availableData.success) {
        setAvailableCourses(availableData.courses || [])
      }

      if (certificatesData.success) {
        setCertificates(certificatesData.certificates || [])
      }

      // Track pending section IDs
      if (pendingData.success && pendingData.enrollments) {
        const pending = new Set<string>(
          pendingData.enrollments
            .filter((e: any) => e.status === 'PENDING')
            .map((e: any) => e.sectionId as string)
        )
        setPendingSections(pending)
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const openEnrollDialog = (section: any, course: any) => {
    setEnrollDialog({ isOpen: true, section, course })
  }

  const closeEnrollDialog = () => {
    setEnrollDialog(null)
  }

  const confirmEnroll = async () => {
    if (!enrollDialog) return

    const sectionId = enrollDialog.section.id
    setEnrolling(sectionId)
    setMessage(null)
    closeEnrollDialog()

    try {
      const response = await fetch('/api/enrollments/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sectionId }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({
          type: 'success',
          text: 'Enrollment request submitted successfully! You will be notified once the instructor approves your request.'
        })
        fetchCourses() // Refresh the course list
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to submit enrollment request'
        })
      }
    } catch (error) {
      console.error('Enrollment error:', error)
      setMessage({
        type: 'error',
        text: 'Network error. Please check your connection and try again.'
      })
    } finally {
      setEnrolling(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Split courses into ongoing and completed
  const certificateSectionIds = new Set(certificates.map(cert => cert.sectionId))
  const ongoingCourses = enrolledCourses.filter(enrollment => !certificateSectionIds.has(enrollment.section.id))
  const completedCourses = enrolledCourses.filter(enrollment => certificateSectionIds.has(enrollment.section.id))

  return (
    <DashboardLayout role={session.user.role}>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#5C2482]">
            My Courses
          </h1>
          <p className="mt-2 text-gray-600">
            {ongoingCourses.length} ongoing, {completedCourses.length} completed
          </p>
        </div>

        {/* Toast Message */}
        {message && (
          <div
            className={`fixed top-4 right-4 z-50 max-w-md rounded-xl shadow-2xl border-2 p-4 animate-in slide-in-from-top-5 ${
              message.type === 'success'
                ? 'bg-green-50 border-green-500 text-green-900'
                : 'bg-red-50 border-red-500 text-red-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {message.type === 'success' ? (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{message.text}</p>
              </div>
              <button
                onClick={() => setMessage(null)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Ongoing Courses */}
        <div>
          <h2 className="text-2xl font-semibold text-[#5C2482] mb-4">
            🎯 Ongoing Courses ({ongoingCourses.length})
          </h2>

          {ongoingCourses.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-600 text-lg mb-2 font-medium">No courses yet</p>
              <p className="text-gray-500 text-sm">
                Browse available courses below to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {ongoingCourses.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#5C2482]/20 transition-all duration-200"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between mb-3">
                      <span className="inline-block px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-[#5C2482]/10 to-[#7B3FA3]/10 text-[#5C2482] rounded-full border border-[#5C2482]/20">
                        {enrollment.section.course.code}
                      </span>
                      <div className="flex flex-col items-end gap-2">
                        <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Enrolled
                        </span>
                        <LeaveCourseButton
                          enrollmentId={enrollment.id}
                          courseCode={enrollment.section.course.code}
                          courseTitle={enrollment.section.course.title}
                        />
                      </div>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                      {enrollment.section.course.title}
                    </h3>
                    {enrollment.section.course.description && (
                      <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-2">
                        {enrollment.section.course.description}
                      </p>
                    )}
                    <div className="space-y-2 pt-4 border-t border-gray-100">
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium">{enrollment.section.instructor.name}</span>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {enrollment.section.term}
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {enrollment.section._count.enrollments}/{enrollment.section.capacity} students
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Courses */}
        {completedCourses.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-[#5C2482] mb-4">
              ✅ Completed Courses ({completedCourses.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {completedCourses.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-sm border-2 border-green-200 hover:shadow-xl transition-all duration-200"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between mb-3">
                      <span className="inline-block px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-green-600/10 to-green-700/10 text-green-700 rounded-full border border-green-300">
                        {enrollment.section.course.code}
                      </span>
                      <span className="flex items-center gap-1 text-green-700 text-xs font-semibold bg-green-100 px-3 py-1.5 rounded-full">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Completed
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                      {enrollment.section.course.title}
                    </h3>
                    {enrollment.section.course.description && (
                      <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-2">
                        {enrollment.section.course.description}
                      </p>
                    )}
                    <div className="space-y-2 pt-4 border-t border-green-100">
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium">{enrollment.section.instructor.name}</span>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {enrollment.section.term}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Courses */}
        {availableCourses.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-[#5C2482] mb-6">
              Available Courses
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {availableCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-200"
                >
                  <div className="p-5 sm:p-6">
                    <div className="mb-3">
                      <span className="inline-block px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 rounded-full border border-blue-200">
                        {course.code}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-2">
                        {course.description}
                      </p>
                    )}
                    <div className="space-y-2 text-xs sm:text-sm pt-4 border-t border-gray-100">
                      {course.sections.map((section) => (
                        <div
                          key={section.id}
                          className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl border border-gray-200/50"
                        >
                          <div className="flex-1 min-w-0 mr-3">
                            <p className="text-gray-900 font-medium truncate">
                              {section.instructor.name}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                              <span>{section.term}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {section._count.enrollments}/{section.capacity}
                              </span>
                            </p>
                          </div>
                          <button
                            onClick={() => openEnrollDialog(section, course)}
                            disabled={
                              section._count.enrollments >= section.capacity ||
                              enrolling === section.id ||
                              pendingSections.has(section.id)
                            }
                            className={`px-3 py-1.5 text-white rounded-lg transition text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                              pendingSections.has(section.id)
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : 'bg-[#F95B0E] hover:bg-[#d94f0c] shadow-sm'
                            }`}
                          >
                            {enrolling === section.id
                              ? 'Enrolling...'
                              : pendingSections.has(section.id)
                              ? 'Pending'
                              : section._count.enrollments >= section.capacity
                              ? 'Full'
                              : 'Enroll'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enrollment Confirmation Dialog */}
        {enrollDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-[#5C2482] mb-2">
                  Confirm Enrollment
                </h3>
                <p className="text-gray-600">
                  You are about to request enrollment in the following course:
                </p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-5 mb-6 border border-purple-200">
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 text-xs font-semibold bg-[#5C2482] text-white rounded-full">
                    {enrollDialog.course.code}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">
                  {enrollDialog.course.title}
                </h4>
                {enrollDialog.course.description && (
                  <p className="text-sm text-gray-600 mb-4">
                    {enrollDialog.course.description}
                  </p>
                )}
                <div className="space-y-2 pt-3 border-t border-purple-200">
                  <div className="flex items-center text-sm text-gray-700">
                    <svg className="w-4 h-4 mr-2 text-[#5C2482]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium">Instructor:</span>
                    <span className="ml-2">{enrollDialog.section.instructor.name}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <svg className="w-4 h-4 mr-2 text-[#5C2482]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Term:</span>
                    <span className="ml-2">{enrollDialog.section.term}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <svg className="w-4 h-4 mr-2 text-[#5C2482]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="font-medium">Enrolled:</span>
                    <span className="ml-2">{enrollDialog.section._count.enrollments}/{enrollDialog.section.capacity} students</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-blue-900">
                    Your enrollment request will be sent to the instructor for approval. You will receive a notification once your request is reviewed.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={closeEnrollDialog}
                  className="flex-1 px-4 sm:px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEnroll}
                  disabled={enrolling !== null}
                  className="flex-1 px-4 sm:px-6 py-3 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c] disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-lg text-sm sm:text-base"
                >
                  {enrolling ? 'Submitting...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </DashboardLayout>
  )
}
