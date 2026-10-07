'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'

interface AuditLog {
  id: string
  userId: string | null
  user: {
    id: string
    name: string
    email: string
    role: string
  } | null
  action: string
  targetType: string | null
  targetId: string | null
  details: any
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  category: string | null
  createdAt: string
  isOverride: boolean
  additionalContext: any
}

export default function ModeratorAuditPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'MODERATOR' && session?.user?.role !== 'ADMIN') {
        router.push('/dashboard')
      } else {
        fetchAuditLogs()
      }
    }
  }, [status, page, session])

  async function fetchAuditLogs() {
    setLoading(true)
    try {
      const response = await fetch(`/api/moderator/audit?page=${page}&limit=50`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs)
        setTotalPages(data.pagination.totalPages)
        setTotalCount(data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout role={session?.user?.role || 'MODERATOR'}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading audit logs...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes('APPROVED')) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    } else if (action.includes('REJECTED')) {
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    } else if (action.includes('REMOVED') || action.includes('DELETED')) {
      return (
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  return (
    <DashboardLayout role={session?.user?.role || 'MODERATOR'}>
      <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 -my-8 p-4 md:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
              Audit & Traceability
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600">
              Read-only view of your actions and related overrides
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">About This Audit Log</h3>
                <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
                  <li>• <strong>Your Actions:</strong> All enrollment approvals, rejections, and related decisions</li>
                  <li>• <strong>Overrides:</strong> Changes made by admins or system to your decisions</li>
                  <li>• <strong>Protection:</strong> This log is immutable and protects you from blame shifting</li>
                  <li>• <strong>Read-Only:</strong> You cannot edit, delete, or hide any entries</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Audit Records</p>
              <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
            </div>
            <div className="bg-purple-50 rounded-xl shadow-sm border border-purple-200 p-6">
              <p className="text-xs sm:text-sm text-purple-700 mb-1">Your Actions</p>
              <p className="text-3xl font-bold text-purple-700">
                {logs.filter(l => !l.isOverride).length}
              </p>
            </div>
            <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-200 p-6">
              <p className="text-xs sm:text-sm text-orange-700 mb-1">Overrides Detected</p>
              <p className="text-3xl font-bold text-orange-700">
                {logs.filter(l => l.isOverride).length}
              </p>
            </div>
          </div>

          {/* Audit Log Entries */}
          {logs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`bg-white rounded-xl shadow-sm border-2 p-4 md:p-6 ${
                    log.isOverride ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                  }`}
                >
                  {/* Override Badge */}
                  {log.isOverride && (
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-800 border border-orange-300 rounded-full text-xs font-bold">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        OVERRIDE - Action by {log.user?.role || 'System'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {getActionIcon(log.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header Row */}
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm md:text-base">
                            {log.action.replace(/_/g, ' ')}
                          </h3>
                          <p className="text-xs text-gray-600">
                            by {log.user?.name || 'System'} ({log.user?.role || 'SYSTEM'})
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                      </div>

                      {/* Additional Context */}
                      {log.additionalContext && Object.keys(log.additionalContext).length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                          {log.additionalContext.studentName && (
                            <p className="text-xs sm:text-sm text-gray-900">
                              <strong>Student:</strong> {log.additionalContext.studentName} ({log.additionalContext.studentEmail})
                            </p>
                          )}
                          {log.additionalContext.courseCode && (
                            <p className="text-xs sm:text-sm text-gray-900">
                              <strong>Course:</strong> {log.additionalContext.courseCode}: {log.additionalContext.courseTitle}
                            </p>
                          )}
                          {log.additionalContext.currentStatus && (
                            <p className="text-xs sm:text-sm text-gray-900">
                              <strong>Current Status:</strong> {log.additionalContext.currentStatus}
                            </p>
                          )}
                          {log.additionalContext.note && (
                            <p className="text-xs sm:text-sm text-gray-600 italic">
                              {log.additionalContext.note}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Details */}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <details className="text-xs sm:text-sm">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                            View Details
                          </summary>
                          <pre className="mt-2 bg-gray-100 border border-gray-300 rounded p-3 overflow-x-auto text-xs">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}

                      {/* Footer */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>
                          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                        {log.category && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                            {log.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
