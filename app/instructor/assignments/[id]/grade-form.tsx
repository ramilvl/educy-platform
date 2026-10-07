'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Submission {
  id: string
  grade: number | null
  feedback: string | null
  text: string | null
}

export default function GradeSubmissionForm({ submission }: { submission: Submission }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [grade, setGrade] = useState(submission.grade?.toString() || '')
  const [feedback, setFeedback] = useState(submission.feedback || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/submissions/${submission.id}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: parseFloat(grade),
          feedback: feedback || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to grade submission')
      }

      setIsEditing(false)
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!isEditing && submission.grade !== null) {
    return (
      <div className="border-t border-gray-200 pt-4 mt-4">
        {submission.feedback && (
          <div className="mb-3">
            <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Feedback:
            </p>
            <p className="text-xs sm:text-sm text-gray-600">
              {submission.feedback}
            </p>
          </div>
        )}
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs sm:text-sm text-[#5C2482] hover:underline"
        >
          Edit Grade
        </button>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="border-t border-gray-200 pt-4 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Grade (0-100) *
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            required
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="85"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Feedback (Optional)
          </label>
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Great work!"
          />
        </div>
      </div>
      <div className="flex items-center space-x-3 mt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-2 sm:px-4 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c] disabled:opacity-50 transition text-xs sm:text-sm font-medium"
        >
          {loading ? 'Saving...' : 'Save Grade'}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={() => {
              setIsEditing(false)
              setGrade(submission.grade?.toString() || '')
              setFeedback(submission.feedback || '')
            }}
            className="px-3 py-2 sm:px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-xs sm:text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
    </>
  )
}
