'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/dashboard-layout'
import LessonMaterialsManager, { LessonMaterial } from '@/components/lesson-materials-manager'

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

interface Lesson {
  id: string
  title: string
  description: string | null
  dayOfWeek: string
  startTime: string
  endTime: string
  roomId: string | null
  materialIds: string[]
  section: {
    id: string
    course: {
      id: string
      code: string
      title: string
    }
  }
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

export default function EditLessonPage({ params }: { params: { id: string; lessonId: string } }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [roomSchedule, setRoomSchedule] = useState<RoomSchedule[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '10:30',
    roomId: '',
  })

  const [materials, setMaterials] = useState<LessonMaterial[]>([])

  // Fetch lesson data
  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const response = await fetch(`/api/sections/${params.id}/lessons/${params.lessonId}`)
        const data = await response.json()

        if (data.success && data.lesson) {
          setLesson(data.lesson)
          setFormData({
            title: data.lesson.title,
            description: data.lesson.description || '',
            dayOfWeek: data.lesson.dayOfWeek,
            startTime: data.lesson.startTime,
            endTime: data.lesson.endTime,
            roomId: data.lesson.roomId || '',
          })
          // Load existing materials (simplified - just IDs/keys)
          if (data.lesson.materialIds && data.lesson.materialIds.length > 0) {
            const loadedMaterials: LessonMaterial[] = data.lesson.materialIds.map((id: string) => ({
              fileId: id.startsWith('http') ? '' : id,
              fileKey: id,
              filename: id.includes('/') ? id.split('/').pop() || id : id,
              url: id.startsWith('http') ? id : `https://pub-f850e88d52e84edba2e5b82a80ba3126.r2.dev/${id}`,
              type: id.startsWith('http') ? 'link' : 'file',
            }))
            setMaterials(loadedMaterials)
          }
        } else {
          setError('Failed to load lesson')
        }
      } catch (err) {
        setError('Failed to load lesson')
      } finally {
        setFetching(false)
      }
    }

    fetchLesson()
  }, [params.id, params.lessonId])

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
          // Filter out the current lesson from the schedule
          const filteredSchedule = schedule.filter((l: RoomSchedule) => l.id !== params.lessonId)
          setRoomSchedule(filteredSchedule)
        } else {
          setRoomSchedule([])
        }
      })
      .catch((err) => {
        console.error('Failed to fetch room schedule:', err)
        setRoomSchedule([])
      })
      .finally(() => setLoadingSchedule(false))
  }, [formData.roomId, formData.dayOfWeek, params.lessonId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/sections/${params.id}/lessons/${params.lessonId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          roomId: formData.roomId || null,
          materialIds: materials.map(m => m.fileId || m.fileKey),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update lesson')
      }

      // Redirect back to course page
      const courseId = lesson?.section?.course?.id
      if (courseId) {
        router.push(`/instructor/courses/${courseId}`)
      } else {
        router.back()
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/sections/${params.id}/lessons/${params.lessonId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete lesson')
      }

      // Redirect back to course page
      const courseId = lesson?.section?.course?.id
      if (courseId) {
        router.push(`/instructor/courses/${courseId}`)
      } else {
        router.back()
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!session?.user) {
    return null
  }

  if (fetching) {
    return (
      <DashboardLayout role={session.user.role}>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role={session.user.role}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#5C2482]">
            Edit Lesson
          </h1>
          {lesson && (
            <p className="mt-2 text-gray-600">
              {lesson.section.course.code}: {lesson.section.course.title}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Lesson Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
              >
                Lesson Title *
              </label>
              <input
                type="text"
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Introduction to Variables"
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
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of the lesson..."
              />
            </div>

            {/* Day of Week */}
            <div>
              <label
                htmlFor="dayOfWeek"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
              >
                Day of Week *
              </label>
              <select
                id="dayOfWeek"
                required
                value={formData.dayOfWeek}
                onChange={(e) =>
                  setFormData({ ...formData, dayOfWeek: e.target.value })
                }
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="startTime"
                  className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
                >
                  Start Time *
                </label>
                <input
                  type="time"
                  id="startTime"
                  required
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="endTime"
                  className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
                >
                  End Time *
                </label>
                <input
                  type="time"
                  id="endTime"
                  required
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Room Selection */}
            <div>
              <label
                htmlFor="roomId"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
              >
                Room (Optional)
              </label>
              <select
                id="roomId"
                value={formData.roomId}
                onChange={(e) =>
                  setFormData({ ...formData, roomId: e.target.value })
                }
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No room assigned</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} {room.location && `(${room.location})`} - Capacity:{' '}
                    {room.capacity}
                  </option>
                ))}
              </select>
              {rooms.length === 0 && (
                <p className="mt-1 text-xs sm:text-sm text-yellow-600">
                  No rooms available. Contact an administrator to add rooms.
                </p>
              )}
            </div>

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
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-2 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 transition"
              >
                Delete Lesson
              </button>
              <div className="flex items-center space-x-4">
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
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-red-600 mb-4">
                Delete Lesson?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this lesson? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
