'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/dashboard-layout'
import { useTabSwitchDetection } from '@/hooks/use-tab-switch-detection'

interface Assignment {
  id: string
  title: string
  description: string | null
  dueDate: string
  allowedFileTypes: string[]
  maxSizeBytes: number
  section: {
    course: {
      code: string
      title: string
    }
  }
}

export default function SubmitAssignmentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [tabSwitchCount, setTabSwitchCount] = useState(0)

  // Enable tab switch detection for academic integrity
  useTabSwitchDetection({
    assignmentId: params.id,
    enabled: true,
    onTabSwitch: (eventType) => {
      if (eventType === 'visibility_hidden' || eventType === 'blur') {
        setTabSwitchCount((prev) => prev + 1)
      }
    },
  })

  useEffect(() => {
    // Fetch assignment details
    fetch(`/api/assignments/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAssignment(data.assignment)
        }
      })
      .catch((err) => console.error('Failed to fetch assignment:', err))
  }, [params.id])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file size
    if (assignment && selectedFile.size > assignment.maxSizeBytes) {
      setError(`File size exceeds limit of ${(assignment.maxSizeBytes / 1048576).toFixed(0)}MB`)
      return
    }

    // Validate file type
    if (assignment && assignment.allowedFileTypes.length > 0) {
      const extension = selectedFile.name.split('.').pop()?.toLowerCase()
      if (!extension || !assignment.allowedFileTypes.includes(extension)) {
        setError(`File type .${extension} not allowed. Allowed types: ${assignment.allowedFileTypes.join(', ')}`)
        return
      }
    }

    setError('')
    setFile(selectedFile)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let fileKey: string | undefined

      // Upload file if selected
      if (file) {
        setUploading(true)

        // Get signed upload URL
        const urlResponse = await fetch('/api/files/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            sizeBytes: file.size,
            context: 'assignment',
          }),
        })

        const urlData = await urlResponse.json()
        if (!urlResponse.ok) throw new Error(urlData.error || 'Failed to get upload URL')

        // Upload to R2
        const uploadResponse = await fetch(urlData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        })

        if (!uploadResponse.ok) {
          console.error('R2 upload failed:', uploadResponse.status, uploadResponse.statusText)
          throw new Error('File upload to storage failed. Please check your connection and try again.')
        }

        fileKey = urlData.fileKey

        // Confirm file upload
        const confirmResponse = await fetch(`/api/files/${urlData.fileId}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        const confirmData = await confirmResponse.json()
        if (!confirmResponse.ok) {
          console.error('File confirmation failed:', confirmResponse.status, confirmData)
          throw new Error(confirmData.error || 'Failed to confirm file upload. Please try again.')
        }

        setUploading(false)
      }

      // Submit assignment
      const response = await fetch(`/api/assignments/${params.id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileKey,
          text: text || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Submission failed:', response.status, data)

        // Provide more specific error messages based on status code
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.')
        } else if (response.status === 403) {
          throw new Error('You do not have permission to submit this assignment. Make sure you are enrolled in the course.')
        } else if (response.status === 409) {
          throw new Error('You have already submitted this assignment.')
        } else if (response.status === 400 && data.error) {
          throw new Error(data.error)
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later or contact support if the problem persists.')
        } else {
          throw new Error(data.error || 'Failed to submit assignment. Please try again.')
        }
      }

      router.push('/student/assignments')
      router.refresh()
    } catch (err) {
      console.error('Assignment submission error:', err)

      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.')
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  if (!session?.user || !assignment) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5C2482] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const dueDate = new Date(assignment.dueDate)
  const isOverdue = dueDate < new Date()

  return (
    <DashboardLayout role={session.user.role}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#5C2482]">
            Submit Assignment
          </h1>
          <p className="mt-2 text-gray-600">
            {assignment.section.course.code}: {assignment.section.course.title}
          </p>
        </div>

        {/* Tab Switch Monitoring Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-blue-800">
                <strong>Academic Integrity Notice:</strong> Tab switching is being monitored for this assignment.
                Switching tabs or windows may be flagged for review by your instructor.
                {tabSwitchCount > 0 && (
                  <span className="ml-2 text-blue-700">
                    ({tabSwitchCount} {tabSwitchCount === 1 ? 'switch' : 'switches'} detected)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Assignment Details */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#5C2482] mb-4">
            {assignment.title}
          </h2>
          {assignment.description && (
            <p className="text-gray-700 mb-4 whitespace-pre-wrap">
              {assignment.description}
            </p>
          )}
          <div className="flex items-center space-x-6 text-xs sm:text-sm">
            <div>
              <span className="text-gray-600">Due: </span>
              <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}>
                {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString()}
              </span>
            </div>
            {assignment.allowedFileTypes.length > 0 && (
              <div>
                <span className="text-gray-600">Allowed: </span>
                <span className="text-gray-900">
                  {assignment.allowedFileTypes.join(', ')}
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-600">Max size: </span>
              <span className="text-gray-900">
                {(assignment.maxSizeBytes / 1048576).toFixed(0)}MB
              </span>
            </div>
          </div>
        </div>

        {/* Submission Form */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {isOverdue && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
                ⚠️ This assignment is overdue. Late submissions may receive reduced credit.
              </div>
            )}

            {/* File Upload */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[#5C2482] mb-2">
                Upload File {assignment.allowedFileTypes.length > 0 && '(Required)'}
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#5C2482] focus:border-[#5C2482]"
                accept={assignment.allowedFileTypes.length > 0 ? assignment.allowedFileTypes.map(t => `.${t}`).join(',') : undefined}
              />
              {file && (
                <p className="mt-2 text-xs sm:text-sm text-green-600">
                  ✓ Selected: {file.name} ({(file.size / 1048576).toFixed(2)}MB)
                </p>
              )}
            </div>

            {/* Text Submission */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[#5C2482] mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#5C2482] focus:border-[#5C2482]"
                placeholder="Add any comments or notes about your submission..."
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
                disabled={loading || uploading}
                className="px-6 py-2 bg-[#F95B0E] hover:bg-[#d94f0c] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                {uploading ? 'Uploading...' : loading ? 'Submitting...' : 'Submit Assignment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
