'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LeaveCourseButtonProps {
  enrollmentId: string
  courseCode: string
  courseTitle: string
}

export function LeaveCourseButton({
  enrollmentId,
  courseCode,
  courseTitle,
}: LeaveCourseButtonProps) {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleLeave = async () => {
    setLeaving(true)
    try {
      const response = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to leave course')
      }

      if (data.success) {
        setShowModal(false)
        router.refresh()
      }
    } catch (error) {
      console.error('Leave course error:', error)
      alert(error instanceof Error ? error.message : 'Failed to leave course')
    } finally {
      setLeaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={leaving}
        className="px-3 py-1.5 text-xs font-semibold border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Leave Course
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in duration-200">
            {/* Icon */}
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Leave Course?
            </h3>

            {/* Course Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">{courseCode}</p>
              <p className="text-sm text-gray-600">{courseTitle}</p>
            </div>

            {/* Warning Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> You will need to re-enroll and wait for approval to access this course again.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={leaving}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {leaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Leaving...
                  </span>
                ) : (
                  'Leave Course'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
