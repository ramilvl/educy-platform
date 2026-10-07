'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'

interface Section {
  id: string
  name: string
  course: {
    id: string
    code: string
    title: string
  }
}

interface Course {
  id: string
  code: string
  title: string
}

export default function BulkNotificationPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sections, setSections] = useState<Section[]>([])
  const [courses, setCourses] = useState<Course[]>([])

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    recipientType: '',
    sectionId: '',
    courseId: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      if (!['ADMIN', 'MODERATOR', 'INSTRUCTOR'].includes(session?.user?.role || '')) {
        router.push('/dashboard')
      } else {
        loadData()
      }
    }
  }, [status, session])

  async function loadData() {
    setLoading(true)
    try {
      // Load sections for instructors
      if (session?.user?.role === 'INSTRUCTOR') {
        const sectionsResponse = await fetch('/api/instructor/sections')
        const sectionsData = await sectionsResponse.json()
        if (sectionsData.success) {
          setSections(sectionsData.sections || [])
        }
      }

      // Load courses for instructors/moderators/admins
      if (['ADMIN', 'MODERATOR', 'INSTRUCTOR'].includes(session?.user?.role || '')) {
        const coursesResponse = await fetch('/api/courses')
        const coursesData = await coursesResponse.json()
        if (coursesData.success) {
          setCourses(coursesData.courses || [])
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSending(true)

    try {
      if (!formData.recipientType) {
        throw new Error('Please select recipient type')
      }

      const payload: any = {
        title: formData.title,
        message: formData.message,
        recipientType: formData.recipientType,
      }

      if (formData.recipientType === 'SECTION' && formData.sectionId) {
        payload.sectionId = formData.sectionId
      }

      if (formData.recipientType === 'COURSE_ALL_SECTIONS' && formData.courseId) {
        payload.courseId = formData.courseId
      }

      const response = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send notification')
      }

      setSuccess(data.message || 'Notification sent successfully!')
      setFormData({
        title: '',
        message: '',
        recipientType: '',
        sectionId: '',
        courseId: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSending(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const getRecipientOptions = () => {
    const role = session?.user?.role

    if (role === 'ADMIN') {
      return [
        { value: 'ALL_MODERATORS', label: 'All Moderators' },
        { value: 'ALL_INSTRUCTORS', label: 'All Instructors' },
        { value: 'COURSE_ALL_SECTIONS', label: 'All Students in Course' },
      ]
    }

    if (role === 'MODERATOR') {
      return [
        { value: 'ALL_INSTRUCTORS', label: 'All Instructors' },
        { value: 'COURSE_ALL_SECTIONS', label: 'All Students in Course' },
      ]
    }

    if (role === 'INSTRUCTOR') {
      return [
        { value: 'SECTION', label: 'Students in Specific Section' },
        { value: 'COURSE_ALL_SECTIONS', label: 'All Students in Course' },
      ]
    }

    return []
  }

  return (
    <DashboardLayout role={session?.user?.role || 'STUDENT'}>
      <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 -my-8 p-4 md:p-8 min-h-screen">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
              Send Bulk Notification
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600">
              Send important information to multiple recipients at once
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-blue-800">
                  Use this feature to send important announcements, updates, or reminders to groups of users. Recipients will receive the notification in their notification center.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
                  {success}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[#5C2482] focus:border-transparent"
                  placeholder="e.g., Important Update"
                  maxLength={200}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[#5C2482] focus:border-transparent"
                  placeholder="Enter your message here..."
                />
              </div>

              {/* Recipient Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipients *
                </label>
                <select
                  required
                  value={formData.recipientType}
                  onChange={(e) => setFormData({ ...formData, recipientType: e.target.value, sectionId: '', courseId: '' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[#5C2482] focus:border-transparent"
                >
                  <option value="">Select recipient group</option>
                  {getRecipientOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Selection (for SECTION type) */}
              {formData.recipientType === 'SECTION' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Section *
                  </label>
                  <select
                    required
                    value={formData.sectionId}
                    onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[#5C2482] focus:border-transparent"
                  >
                    <option value="">Select a section</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>
                        {section.course.code}: {section.course.title} ({section.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Course Selection (for COURSE_ALL_SECTIONS type) */}
              {formData.recipientType === 'COURSE_ALL_SECTIONS' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Course *
                  </label>
                  <select
                    required
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[#5C2482] focus:border-transparent"
                  >
                    <option value="">Select a course</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.code}: {course.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-3 bg-[#5C2482] text-white rounded-lg hover:bg-[#7B3FA3] disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
                >
                  {sending ? 'Sending...' : 'Send Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
