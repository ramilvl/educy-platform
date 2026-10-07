'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/dashboard-layout'
import { useAutosave } from '@/hooks/use-autosave'
import { AutosaveIndicator } from '@/components/autosave-indicator'

const FILE_TYPES = [
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'doc', label: 'Word (.doc)' },
  { value: 'docx', label: 'Word (.docx)' },
  { value: 'txt', label: 'Text (.txt)' },
  { value: 'zip', label: 'ZIP Archive (.zip)' },
  { value: 'jpg', label: 'JPEG Image (.jpg)' },
  { value: 'png', label: 'PNG Image (.png)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'pptx', label: 'PowerPoint (.pptx)' },
]

export default function NewAssignmentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDraftRestore, setShowDraftRestore] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '23:59',
    allowedFileTypes: [] as string[],
    maxSizeBytes: 10485760, // 10MB default
  })

  // Autosave functionality
  const { lastSaved, isSaving, hasDraft, clearDraft, save } = useAutosave({
    key: `assignment-create-${params.id}-${session?.user?.id}`,
    data: formData,
    enabled: !loading, // Disable during submission
    onRestore: (savedData) => {
      setFormData(savedData)
      setShowDraftRestore(false)
    },
  })

  // Show draft restore notification on mount if draft exists
  useEffect(() => {
    if (hasDraft) {
      setShowDraftRestore(true)
    }
  }, [hasDraft])

  const handleFileTypeToggle = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedFileTypes: prev.allowedFileTypes.includes(type)
        ? prev.allowedFileTypes.filter((t) => t !== type)
        : [...prev.allowedFileTypes, type],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Combine date and time
      const dueDateTimeString = `${formData.dueDate}T${formData.dueTime}:00.000Z`

      const response = await fetch(`/api/sections/${params.id}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          dueDate: dueDateTimeString,
          allowedFileTypes: formData.allowedFileTypes,
          maxSizeBytes: formData.maxSizeBytes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create assignment')
      }

      // Clear autosave draft on successful submission
      clearDraft()

      // Redirect back to course page using the courseId from the response
      const courseId = data.assignment?.section?.course?.id || data.assignment?.section?.courseId
      if (courseId) {
        router.push(`/instructor/courses/${courseId}`)
      } else {
        // Fallback: go back
        router.back()
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!session?.user) {
    return null
  }

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0]

  return (
    <DashboardLayout role={session.user.role}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#5C2482]">
            Create New Assignment
          </h1>
          <p className="mt-2 text-gray-600">
            Set up a new assignment for students
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          {/* Draft Restore Notification */}
          {showDraftRestore && hasDraft && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">
                    Unsaved Draft Found
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-700">
                    You have an unsaved draft from a previous session. Would you like to restore it?
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDraftRestore(false)}
                  className="px-4 py-2 bg-[#5C2482] text-white text-xs sm:text-sm rounded-lg hover:bg-[#7B3FA3] transition font-medium"
                >
                  Use Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearDraft()
                    setShowDraftRestore(false)
                  }}
                  className="px-4 py-2 border border-blue-300 text-blue-700 text-xs sm:text-sm rounded-lg hover:bg-blue-100 transition"
                >
                  Start Fresh
                </button>
              </div>
            </div>
          )}

          {/* Autosave Indicator */}
          <div className="mb-4">
            <AutosaveIndicator
              lastSaved={lastSaved}
              isSaving={isSaving}
              hasDraft={hasDraft}
              onClearDraft={clearDraft}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Assignment Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
              >
                Assignment Title *
              </label>
              <input
                type="text"
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Project 1: Portfolio Website"
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={5}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Provide detailed instructions for the assignment..."
              />
            </div>

            {/* Due Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="dueDate"
                  className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
                >
                  Due Date *
                </label>
                <input
                  type="date"
                  id="dueDate"
                  required
                  min={today}
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="dueTime"
                  className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
                >
                  Due Time *
                </label>
                <input
                  type="time"
                  id="dueTime"
                  required
                  value={formData.dueTime}
                  onChange={(e) =>
                    setFormData({ ...formData, dueTime: e.target.value })
                  }
                  className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Allowed File Types */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Allowed File Types (Optional)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {FILE_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.allowedFileTypes.includes(type.value)}
                      onChange={() => handleFileTypeToggle(type.value)}
                      className="w-4 h-4 text-[#5C2482] border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs sm:text-sm text-gray-700">
                      {type.label}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs sm:text-sm text-gray-500">
                Leave unchecked to allow all file types
              </p>
            </div>

            {/* Max File Size */}
            <div>
              <label
                htmlFor="maxSize"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
              >
                Maximum File Size *
              </label>
              <select
                id="maxSize"
                required
                value={formData.maxSizeBytes}
                onChange={(e) =>
                  setFormData({ ...formData, maxSizeBytes: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5242880}>5 MB</option>
                <option value={10485760}>10 MB</option>
                <option value={20971520}>20 MB</option>
                <option value={52428800}>50 MB</option>
                <option value={104857600}>100 MB</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c] disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                {loading ? 'Creating...' : 'Create Assignment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
