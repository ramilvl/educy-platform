'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface EnrolledStudent {
  id: string
  enrolledAt: Date | string
  user: {
    name: string
    email: string
  }
}

interface EnrolledStudentsListProps {
  enrollments: EnrolledStudent[]
}

export function EnrolledStudentsList({ enrollments }: EnrolledStudentsListProps) {
  const router = useRouter()
  const [removing, setRemoving] = useState<string | null>(null)

  const handleRemoveStudent = async (enrollmentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from this course?`)) {
      return
    }

    setRemoving(enrollmentId)
    try {
      const response = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        router.refresh()
      } else {
        alert(data.error || 'Failed to remove student')
      }
    } catch (error) {
      console.error('Error removing student:', error)
      alert('Failed to remove student from course')
    } finally {
      setRemoving(null)
    }
  }

  if (enrollments.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">
        No students enrolled yet.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {enrollments.map((enrollment) => (
        <div
          key={enrollment.id}
          className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition relative"
        >
          <p className="font-medium text-[#5C2482] pr-8">
            {enrollment.user.name}
          </p>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {enrollment.user.email}
          </p>
          <p className="text-xs text-gray-500 mt-2 mb-3">
            Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <button
            onClick={() => handleRemoveStudent(enrollment.id, enrollment.user.name)}
            disabled={removing === enrollment.id}
            className="absolute top-3 right-3 p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Remove student"
          >
            {removing === enrollment.id ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>
      ))}
    </div>
  )
}
