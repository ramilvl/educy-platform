'use client'

import { useState, useEffect } from 'react'

interface Student {
  id: string
  name: string
  email: string
  _count: {
    enrollments: number
  }
}

interface AddStudentsDialogProps {
  isOpen: boolean
  onClose: () => void
  sectionId: string
  onSuccess: () => void
}

export function AddStudentsDialog({
  isOpen,
  onClose,
  sectionId,
  onSuccess,
}: AddStudentsDialogProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      setMessage(null)
      fetchStudents()
    }
  }, [isOpen, search, sectionId])

  // Auto-clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        sectionId: sectionId,
        ...(search && { search }),
      })

      const response = await fetch(`/api/students/all?${params}`)
      const data = await response.json()

      if (data.success) {
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error('Failed to fetch students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (studentId: string) => {
    setEnrolling(studentId)
    try {
      const response = await fetch(`/api/sections/${sectionId}/enroll-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({
          type: 'success',
          text: data.message || 'Student enrolled successfully!'
        })
        // Remove enrolled student from list
        setStudents(students.filter((s) => s.id !== studentId))
        onSuccess()
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to enroll student'
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#5C2482]">Add Students</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Search and enroll students in your course
          </p>

          {/* Toast Message */}
          {message && (
            <div
              className={`mt-4 rounded-xl border-2 p-3 animate-in slide-in-from-top-2 ${
                message.type === 'success'
                  ? 'bg-green-50 border-green-500 text-green-900'
                  : 'bg-red-50 border-red-500 text-red-900'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0">
                  {message.type === 'success' ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#5C2482]"
          />
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5C2482]"></div>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? 'Try adjusting your search'
                  : 'All students are already enrolled in this course'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#5C2482]">{student.name}</p>
                    <p className="text-sm text-gray-600 truncate">{student.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Currently enrolled in {student._count.enrollments} course
                      {student._count.enrollments !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEnroll(student.id)}
                    disabled={enrolling === student.id}
                    className="ml-4 px-4 py-2 bg-[#F95B0E] hover:bg-[#d94f0c] text-white rounded-xl transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm flex-shrink-0"
                  >
                    {enrolling === student.id ? 'Enrolling...' : 'Enroll'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
