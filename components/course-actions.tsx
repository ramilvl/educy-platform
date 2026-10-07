'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface CourseActionsProps {
  courseId: string
  courseCode: string
  courseTitle: string
  hasEnrollments?: boolean
}

export function CourseActions({
  courseId,
  courseCode,
  courseTitle,
  hasEnrollments = false,
}: CourseActionsProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (hasEnrollments) {
      alert('Cannot delete course with active enrollments. Please remove all students first.')
      return
    }

    const confirmed = confirm(
      `Are you sure you want to delete "${courseCode}: ${courseTitle}"?\n\nThis action cannot be undone and will delete all lessons, assignments, and related data.`
    )

    if (!confirmed) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete course')
      }

      if (data.success) {
        router.refresh()
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete course')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <Link
        href={`/instructor/courses/${courseId}`}
        className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold text-[#5C2482] border-2 border-[#5C2482] rounded-xl hover:bg-[#5C2482] hover:text-white transition-all duration-200"
      >
        Manage
      </Link>
      <Link
        href={`/instructor/courses/${courseId}/edit`}
        className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold bg-gradient-to-r from-[#F95B0E] to-[#e05a0e] text-white rounded-xl hover:shadow-lg transition-all duration-200"
      >
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold border-2 border-red-600 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  )
}
