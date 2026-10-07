'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/dashboard-layout'
import Link from 'next/link'

type ImportResult = {
  success: boolean
  message: string
  imported?: number
  failed?: number
  error?: string
  suggestion?: string
  errors?: Array<{
    row: number
    email: string
    error: string
    suggestion?: string
  }>
}

type ProgressState = {
  phase: 'validation' | 'creating_users' | 'sending_emails' | 'complete' | null
  current: number
  total: number
  currentUser: string
  status: string
  success: number
  failed: number
  timeElapsed: number
  message: string
}

export default function BulkUserImportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState<ProgressState | null>(null)

  if (status === 'loading') {
    return (
      <DashboardLayout role={'ADMIN'}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session?.user) {
    router.push('/auth/signin')
    return null
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR') {
    router.push('/unauthorized')
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ]

      if (!validTypes.includes(selectedFile.type) &&
          !selectedFile.name.endsWith('.xlsx') &&
          !selectedFile.name.endsWith('.xls') &&
          !selectedFile.name.endsWith('.csv')) {
        alert('Please select a valid Excel (.xlsx, .xls) or CSV file')
        return
      }

      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first')
      return
    }

    setUploading(true)
    setResult(null)
    setProgress({
      phase: null,
      current: 0,
      total: 0,
      currentUser: '',
      status: 'Starting...',
      success: 0,
      failed: 0,
      timeElapsed: 0,
      message: 'Initializing import...'
    })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/users/import-stream', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok || !response.body) {
        throw new Error('Failed to start import')
      }

      // Read the streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let importSucceeded = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })

        // Process all complete SSE messages in buffer
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || '' // Keep incomplete message in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6))

              if (data.type === 'progress' || data.type === 'phase') {
                setProgress({
                  phase: data.phase || null,
                  current: data.current || 0,
                  total: data.total || 0,
                  currentUser: data.currentUser || '',
                  status: data.status || data.message || '',
                  success: data.success || 0,
                  failed: data.failed || 0,
                  timeElapsed: data.timeElapsed || 0,
                  message: data.message || ''
                })
              } else if (data.type === 'complete') {
                setResult({
                  success: true,
                  message: data.message || 'Import completed successfully',
                  imported: data.success,
                  failed: data.failed,
                  errors: data.errors
                })
                importSucceeded = true
                setProgress(null)
              } else if (data.type === 'error') {
                setResult({
                  success: false,
                  message: data.message || 'Import failed',
                  error: data.message,
                  errors: data.errors
                })
                setProgress(null)
              }
            } catch (e) {
              console.error('Failed to parse SSE message:', e)
            }
          }
        }
      }

      // Clear file after successful completion
      if (importSucceeded) {
        setFile(null)
        const fileInput = document.getElementById('file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      }
    } catch (error) {
      console.error('Upload error:', error)
      setResult({
        success: false,
        message: 'Failed to upload file. Please try again.',
      })
      setProgress(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <DashboardLayout role={session.user.role}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#5C2482]">
              Bulk User Import
            </h1>
            <p className="mt-2 text-gray-600">
              Import multiple users from an Excel or CSV file
            </p>
          </div>
          <Link
            href="/admin/users"
            className="px-3 py-2 sm:px-4 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition"
          >
            Back to Users
          </Link>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-blue-800">
                Instructions
              </h3>
              <div className="mt-2 text-xs sm:text-sm text-blue-700">
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    Download the template file below and fill it with user data
                  </li>
                  <li>
                    Required columns: <strong>name</strong>, <strong>email</strong>, <strong>role</strong>
                  </li>
                  <li>
                    Valid roles: <code className="bg-blue-100 px-1 rounded">ADMIN</code>,
                    <code className="bg-blue-100 px-1 rounded ml-1">MODERATOR</code>,
                    <code className="bg-blue-100 px-1 rounded ml-1">INSTRUCTOR</code>,
                    <code className="bg-blue-100 px-1 rounded ml-1">STUDENT</code>
                  </li>
                  <li>
                    <strong>Passwords are automatically generated</strong> - secure random passwords will be created for each user
                  </li>
                  <li>
                    <strong>Welcome emails are sent automatically</strong> - each user will receive their login credentials via email
                  </li>
                  <li>
                    Duplicate emails will be skipped and reported in the results
                  </li>
                  <li>
                    <strong>Maximum 100 users per import</strong> - For larger batches, split into multiple files
                  </li>
                  <li>
                    Upload the completed file (supports .xlsx, .xls, or .csv formats)
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-green-800">
                Secure Password Management
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-green-700">
                For security reasons, you do not need to provide passwords in the Excel file.
                The system will automatically generate secure, random passwords for each user and
                send them via email. Users will be prompted to change their password on first login.
              </p>
            </div>
          </div>
        </div>

        {/* Template Download */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-[#5C2482] mb-4">
            Download Template
          </h2>
          <p className="text-gray-600 mb-4">
            Download this template file, <strong>replace the example emails with real user emails</strong>, and upload it below.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
            <p className="text-xs sm:text-sm text-yellow-800">
              ⚠️ <strong>Important:</strong> The template contains example emails like "student@yourdomain.com".
              You must replace these with real, unique email addresses before uploading.
            </p>
          </div>
          <a
            href="/templates/bulk-user-import-template.xlsx"
            download="bulk-user-import-template.xlsx"
            className="inline-flex items-center px-3 py-2 sm:px-4 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c] transition"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Template (Excel)
          </a>
          <p className="text-xs text-gray-500 mt-2">
            Excel file with example data and proper formatting
          </p>
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-[#5C2482] mb-4">
            Upload File
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Select Excel or CSV file
              </label>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={handleFileChange}
                className="block w-full text-xs sm:text-sm text-[#5C2482] border border-gray-300 rounded-xl cursor-pointer bg-gray-50 focus:outline-none"
              />
            </div>

            {file && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs sm:text-sm text-gray-600">
                  Selected file: <span className="font-medium text-[#5C2482]">{file.name}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Size: {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`w-full px-4 py-3 rounded-xl transition font-medium ${
                !file || uploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#F95B0E] text-white hover:bg-[#d94f0c]'
              }`}
            >
              {uploading ? (
                <span className="flex items-center justify-center">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </span>
              ) : (
                'Upload and Import Users'
              )}
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        {progress && uploading && (
          <div className="bg-white rounded-xl shadow p-6 border-2 border-[#5C2482]">
            <div className="space-y-4">
              {/* Phase Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5C2482]"></div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#5C2482]">
                      {progress.phase === 'validation' && '🔍 Validating File'}
                      {progress.phase === 'creating_users' && '👥 Creating User Accounts'}
                      {progress.phase === 'sending_emails' && '📧 Sending Welcome Emails'}
                      {!progress.phase && '⏳ Starting Import'}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">{progress.message}</p>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  {Math.ceil(progress.timeElapsed / 1000)}s elapsed
                </div>
              </div>

              {/* Progress Bar */}
              {progress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="font-medium text-gray-700">
                      {progress.current} / {progress.total} users
                    </span>
                    <span className="text-[#5C2482] font-semibold">
                      {Math.round((progress.current / progress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#5C2482] to-[#F95B0E] h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Current User */}
              {progress.currentUser && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-xs sm:text-sm text-gray-700">
                    <span className="font-medium">Current:</span>{' '}
                    <span className="text-[#5C2482]">{progress.currentUser}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{progress.status}</p>
                </div>
              )}

              {/* Counters */}
              {(progress.success > 0 || progress.failed > 0) && (
                <div className="flex gap-4 pt-2">
                  {progress.success > 0 && (
                    <div className="flex items-center gap-2 text-green-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">{progress.success} succeeded</span>
                    </div>
                  )}
                  {progress.failed > 0 && (
                    <div className="flex items-center gap-2 text-orange-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">{progress.failed} pending</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className={`rounded-xl shadow p-6 ${
            result.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {result.success ? (
                  <svg className="h-6 w-6 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-lg font-medium ${
                  result.success
                    ? 'text-green-800'
                    : 'text-red-800'
                }`}>
                  {result.success ? 'Import Successful' : 'Import Failed'}
                </h3>
                <div className={`mt-2 text-xs sm:text-sm ${
                  result.success
                    ? 'text-green-700'
                    : 'text-red-700'
                }`}>
                  <p>{result.message}</p>

                  {/* Show detailed error and suggestion if provided */}
                  {result.error && (
                    <div className="mt-3 p-3 bg-white rounded border border-red-300">
                      <p className="font-medium text-red-800">Error Details:</p>
                      <p className="mt-1 text-red-700">{result.error}</p>
                      {result.suggestion && (
                        <p className="mt-2 text-blue-700">
                          <strong>💡 Suggestion:</strong> {result.suggestion}
                        </p>
                      )}
                    </div>
                  )}

                  {result.imported !== undefined && result.failed !== undefined && (
                    <div className="mt-3 p-3 bg-white rounded border border-green-200">
                      <p className="font-medium">Import Summary:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Successfully imported: {result.imported} users</li>
                        <li>Failed: {result.failed} users</li>
                      </ul>
                    </div>
                  )}

                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium mb-2">
                        Errors ({result.errors.length}):
                        {result.errors.filter(e => e.error.includes('already exists')).length > 0 && (
                          <span className="ml-2 text-xs font-normal">
                            ({result.errors.filter(e => e.error.includes('already exists')).length} already exist)
                          </span>
                        )}
                      </p>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {result.errors.map((error, index) => (
                          <div key={index} className="p-3 bg-white rounded text-xs border border-gray-200">
                            <p className="font-medium text-gray-800">
                              <strong>Row {error.row}:</strong> {error.email}
                            </p>
                            <p className={`mt-1 ${
                              error.error.includes('already exists')
                                ? 'text-orange-600'
                                : 'text-red-600'
                            }`}>
                              ❌ {error.error}
                            </p>
                            {error.suggestion && (
                              <p className="mt-2 text-blue-600">
                                💡 {error.suggestion}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      {result.errors.filter(e => e.error.includes('already exists')).length === result.errors.length && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs text-blue-700">
                            💡 <strong>Tip:</strong> All errors are due to existing users. Remove these emails from your file or use different email addresses for testing.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {result.success && result.imported && result.imported > 0 && (
                  <div className="mt-4">
                    <Link
                      href="/admin/users"
                      className="inline-flex items-center px-3 py-2 sm:px-4 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c] transition text-xs sm:text-sm"
                    >
                      View All Users
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
