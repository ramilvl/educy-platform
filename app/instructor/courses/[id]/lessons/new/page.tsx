'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/dashboard-layout'
import LessonMaterialsManager, { LessonMaterial } from '@/components/lesson-materials-manager'
import { FormField } from '@/components/form-field'
import { useFormValidation } from '@/hooks/use-form-validation'
import { useAutosave } from '@/hooks/use-autosave'
import { AutosaveIndicator } from '@/components/autosave-indicator'

const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
]

interface Room {
  id: string
  name: string
  location: string | null
  capacity: number
}

interface RoomSchedule {
  id: string
  title: string
  startTime: string
  endTime: string
  course: {
    code: string
    title: string
  }
  instructor: string
}

export default function NewLessonPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomSchedule, setRoomSchedule] = useState<RoomSchedule[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [showDraftRestore, setShowDraftRestore] = useState(false)
  const { fieldErrors, generalError, setGeneralError, handleHttpError, clearAllErrors } = useFormValidation()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '10:30',
    roomId: '',
  })

  const [materials, setMaterials] = useState<LessonMaterial[]>([])

  // Autosave functionality - combine formData and materials
  const autosaveData = { formData, materials }
  const { lastSaved, isSaving, hasDraft, clearDraft, save } = useAutosave({
    key: `lesson-create-${params.id}-${session?.user?.id}`,
    data: autosaveData,
    enabled: !loading, // Disable during submission
    onRestore: (savedData) => {
      if (savedData.formData) setFormData(savedData.formData)
      if (savedData.materials) setMaterials(savedData.materials)
      setShowDraftRestore(false)
    },
  })

  // Show draft restore notification on mount if draft exists
  useEffect(() => {
    if (hasDraft) {
      setShowDraftRestore(true)
    }
  }, [hasDraft])

  // Fetch available rooms
  useEffect(() => {
    fetch('/api/admin/rooms')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRooms(data.rooms || [])
        }
      })
      .catch((err) => console.error('Failed to fetch rooms:', err))
  }, [])

  // Fetch room schedule when room or day changes
  useEffect(() => {
    if (!formData.roomId || !formData.dayOfWeek) {
      setRoomSchedule([])
      return
    }

    setLoadingSchedule(true)
    fetch(`/api/admin/rooms/availability?roomId=${formData.roomId}&dayOfWeek=${formData.dayOfWeek}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.availability && data.availability.length > 0) {
          const schedule = data.availability[0].schedule[formData.dayOfWeek] || []
          setRoomSchedule(schedule)
        } else {
          setRoomSchedule([])
        }
      })
      .catch((err) => {
        console.error('Failed to fetch room schedule:', err)
        setRoomSchedule([])
      })
      .finally(() => setLoadingSchedule(false))
  }, [formData.roomId, formData.dayOfWeek])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAllErrors()
    setLoading(true)

    try {
      const response = await fetch(`/api/sections/${params.id}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          roomId: formData.roomId || undefined,
          materialIds: materials.map(m => m.fileId || m.fileKey).filter(id => id), // Filter out undefined/null values
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle HTTP errors with field-level error parsing
        const handled = handleHttpError(response, data)
        if (!handled) {
          setGeneralError(data.error || 'Failed to create lesson')
        }
        setLoading(false)
        return
      }

      // Clear autosave draft on successful submission
      clearDraft()

      // Redirect back to course page using the courseId from the response
      const courseId = data.lesson?.section?.course?.id || data.lesson?.section?.courseId
      if (courseId) {
        router.push(`/instructor/courses/${courseId}`)
      } else {
        // Fallback: go back
        router.back()
      }
      router.refresh()
    } catch (err) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setGeneralError('Network error. Please check your internet connection and try again.')
      } else {
        setGeneralError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
      }
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  if (!session?.user) {
    return null
  }

  return (
    <DashboardLayout role={session.user.role}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#5C2482]">
            Create New Lesson
          </h1>
          <p className="mt-2 text-gray-600">
            Schedule a new class session
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
            {/* General error (system-level only) */}
            {generalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                {generalError}
              </div>
            )}

            {/* Lesson Title */}
            <FormField
              label="Lesson Title"
              required
              error={fieldErrors.title}
            >
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Introduction to Variables"
                maxLength={200}
              />
            </FormField>

            {/* Description */}
            <FormField
              label="Description"
              error={fieldErrors.description}
            >
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the lesson..."
              />
            </FormField>

            {/* Day of Week */}
            <FormField
              label="Day of Week"
              required
              error={fieldErrors.dayOfWeek}
            >
              <select
                required
                value={formData.dayOfWeek}
                onChange={(e) =>
                  setFormData({ ...formData, dayOfWeek: e.target.value })
                }
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Start Time"
                required
                error={fieldErrors.startTime}
                helpText="Format: HH:MM (e.g., 09:00)"
              >
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </FormField>

              <FormField
                label="End Time"
                required
                error={fieldErrors.endTime}
                helpText="Format: HH:MM (e.g., 10:30)"
              >
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                />
              </FormField>
            </div>

            {/* Room Selection */}
            <FormField
              label="Room (Optional)"
              error={fieldErrors.roomId}
              helpText={rooms.length === 0 ? "No rooms available. Contact an administrator to add rooms." : undefined}
            >
              <select
                value={formData.roomId}
                onChange={(e) =>
                  setFormData({ ...formData, roomId: e.target.value })
                }
              >
                <option value="">No room assigned</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} {room.location && `(${room.location})`} - Capacity:{' '}
                    {room.capacity}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Room Schedule Viewer */}
            {formData.roomId && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-blue-900">
                    Room Schedule for {DAYS_OF_WEEK.find(d => d.value === formData.dayOfWeek)?.label}
                  </h3>
                  {loadingSchedule && (
                    <span className="text-xs sm:text-sm text-blue-600">Loading...</span>
                  )}
                </div>
                {roomSchedule.length === 0 ? (
                  <p className="text-xs sm:text-sm text-blue-700">
                    ✓ This room is available all day on {DAYS_OF_WEEK.find(d => d.value === formData.dayOfWeek)?.label}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm text-blue-700 mb-2">
                      Occupied time slots:
                    </p>
                    {roomSchedule.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="bg-white rounded-lg p-3 border border-blue-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {lesson.startTime} - {lesson.endTime}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {lesson.course.code}: {lesson.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              Instructor: {lesson.instructor}
                            </p>
                          </div>
                          <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            Occupied
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Course Materials */}
            <div>
              <LessonMaterialsManager
                materials={materials}
                onMaterialsChange={setMaterials}
                disabled={loading}
              />
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
                {loading ? 'Creating...' : 'Create Lesson'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
