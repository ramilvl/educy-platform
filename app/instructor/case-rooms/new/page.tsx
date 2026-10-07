'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/dashboard-layout'
import { FormField } from '@/components/form-field'
import { useFormValidation } from '@/hooks/use-form-validation'

export default function NewCaseRoomPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [sections, setSections] = useState<any[]>([])
  const { fieldErrors, generalError, setGeneralError, handleHttpError, clearAllErrors } = useFormValidation()

  const [formData, setFormData] = useState({
    sectionId: '',
    title: '',
    description: '',
    dueDate: '',
    dueTime: '23:59',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadSections()
    }
  }, [status])

  async function loadSections() {
    try {
      const response = await fetch('/api/instructor/sections')
      if (!response.ok) throw new Error('Failed to load sections')
      const data = await response.json()
      setSections(data.sections || [])
    } catch (err) {
      setGeneralError('Failed to load sections')
    } finally {
      setSectionsLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    clearAllErrors()
    setLoading(true)

    try {
      // Validate date range on frontend
      if (formData.dueDate) {
        const dueDate = new Date(formData.dueDate)
        const today = new Date()
        const twoYearsFromNow = new Date()
        twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2)

        if (dueDate > twoYearsFromNow) {
          setGeneralError('Due date cannot be more than 2 years in the future. Please select a more reasonable date.')
          setLoading(false)
          return
        }
      }

      // Combine date and time if provided
      let dueDateTimeString = null
      if (formData.dueDate) {
        dueDateTimeString = `${formData.dueDate}T${formData.dueTime}:00.000Z`
      }

      const response = await fetch('/api/case-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: formData.sectionId,
          title: formData.title,
          description: formData.description || undefined,
          dueDate: dueDateTimeString,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle HTTP errors with field-level error parsing
        const handled = handleHttpError(response, data)
        if (!handled) {
          setGeneralError(data.error || 'Failed to create case room')
        }
        setLoading(false)
        return
      }

      router.push('/instructor/case-rooms')
      router.refresh()
    } catch (err) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setGeneralError('Network error. Please check your internet connection and try again.')
      } else {
        setGeneralError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || sectionsLoading) {
    return (
      <DashboardLayout role={session?.user?.role || 'INSTRUCTOR'}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <DashboardLayout role={session?.user?.role || 'INSTRUCTOR'}>
      <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 -my-8 p-4 md:p-8 min-h-screen">
        <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Create Case Room</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">
            Set up a Padlet-style space for student case submissions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General error (system-level only) */}
          {generalError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
              {generalError}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              {/* Section Field */}
              <FormField
                label="Section"
                required
                error={fieldErrors.sectionId}
              >
                <select
                  required
                  value={formData.sectionId}
                  onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                >
                  <option value="">Select a section</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.course.code}: {section.course.title} - {section.name}
                    </option>
                  ))}
                </select>
              </FormField>

              {/* Title Field */}
              <FormField
                label="Room Title"
                required
                error={fieldErrors.title}
              >
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Week 5 Case Study Discussion"
                  maxLength={200}
                />
              </FormField>

              {/* Description Field */}
              <FormField
                label="Description (Optional)"
                error={fieldErrors.description}
              >
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide instructions and context for the case submission..."
                />
              </FormField>

              {/* Date/Time Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Due Date (Optional)"
                  error={fieldErrors.dueDate}
                  helpText="Must be within the next 2 years"
                >
                  <input
                    type="date"
                    min={today}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0]}
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </FormField>

                <FormField
                  label="Due Time"
                  error={fieldErrors.dueTime}
                >
                  <input
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                  />
                </FormField>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-bold text-blue-900 mb-2">How It Works:</h3>
            <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
              <li>• Students submit their case analyses and responses</li>
              <li>• All submissions require your approval before becoming visible</li>
              <li>• You can provide feedback on each submission</li>
              <li>• Approved posts are displayed in a Padlet-style grid</li>
              <li>• You can close the room at any time to stop new submissions</li>
            </ul>
          </div>

          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/instructor/case-rooms')}
              className="px-4 py-2 sm:px-6 sm:py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 sm:px-6 sm:py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              {loading ? 'Creating...' : 'Create Case Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </DashboardLayout>
  )
}
