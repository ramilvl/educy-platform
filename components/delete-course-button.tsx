'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteCourseButtonProps {
  courseId: string
  courseCode: string
  courseTitle: string
  hasEnrollments?: boolean
}

export function DeleteCourseButton({
  courseId,
  courseCode,
  courseTitle,
  hasEnrollments = false,
}: DeleteCourseButtonProps) {
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
        alert('Course deleted successfully')
        router.push('/instructor/courses')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete course')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="px-3 py-2 sm:px-4 border border-red-600 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {deleting ? 'Deleting...' : 'Delete Course'}
    </button>
  )
}
