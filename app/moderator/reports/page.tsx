'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
}

interface Report {
  id: string
  reportedUserId: string
  reason: string
  evidence?: string
  status: string
  createdAt: string
  reportedUser: User
}

interface Ban {
  id: string
  userId: string
  reason: string
  durationHours: number
  expiresAt: string
  isActive: boolean
  createdAt: string
  user: User
}

export default function ModeratorReportsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'file-report' | 'view-reports' | 'apply-ban' | 'view-bans'>('file-report')

  // File Report State
  const [userEmail, setUserEmail] = useState('')
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState('')
  const [filing, setFiling] = useState(false)
  const [fileMessage, setFileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // View Reports State
  const [reports, setReports] = useState<Report[]>([])
  const [reportsPage, setReportsPage] = useState(1)
  const [reportsTotalPages, setReportsTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  // Apply Ban State
  const [banUserEmail, setBanUserEmail] = useState('')
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState(24)
  const [applyingBan, setApplyingBan] = useState(false)
  const [banMessage, setBanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // View Bans State
  const [bans, setBans] = useState<Ban[]>([])
  const [bansPage, setBansPage] = useState(1)
  const [bansTotalPages, setBansTotalPages] = useState(1)
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'MODERATOR') {
        router.push('/dashboard')
      } else {
        setLoading(false)
        if (activeTab === 'view-reports') {
          loadReports()
        } else if (activeTab === 'view-bans') {
          loadBans()
        }
      }
    }
  }, [status, session, router])

  useEffect(() => {
    if (!loading) {
      if (activeTab === 'view-reports') {
        loadReports()
      } else if (activeTab === 'view-bans') {
        loadBans()
      }
    }
  }, [activeTab, reportsPage, statusFilter, bansPage, activeOnlyFilter])

  async function loadReports() {
    try {
      const params = new URLSearchParams({
        page: reportsPage.toString(),
        limit: '10',
      })
      if (statusFilter) {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/moderator/reports?${params}`)
      const data = await response.json()

      if (data.success) {
        setReports(data.reports)
        setReportsTotalPages(data.pagination.totalPages)
      }
    } catch (err) {
      console.error('Failed to load reports:', err)
    }
  }

  async function loadBans() {
    try {
      const params = new URLSearchParams({
        page: bansPage.toString(),
        limit: '10',
        activeOnly: activeOnlyFilter.toString(),
      })

      const response = await fetch(`/api/moderator/bans?${params}`)
      const data = await response.json()

      if (data.success) {
        setBans(data.bans)
        setBansTotalPages(data.pagination.totalPages)
      }
    } catch (err) {
      console.error('Failed to load bans:', err)
    }
  }

  async function handleFileReport(e: React.FormEvent) {
    e.preventDefault()
    setFileMessage(null)
    setFiling(true)

    try {
      // First, find user by email
      const userResponse = await fetch(`/api/users/search?email=${encodeURIComponent(userEmail)}`)
      const userData = await userResponse.json()

      if (!userData.success || !userData.user) {
        throw new Error('User not found with this email')
      }

      const response = await fetch('/api/moderator/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: userData.user.id,
          reason,
          evidence: evidence || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to file report')
      }

      setFileMessage({ type: 'success', text: data.message })
      setUserEmail('')
      setReason('')
      setEvidence('')
    } catch (err) {
      setFileMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to file report',
      })
    } finally {
      setFiling(false)
    }
  }

  async function handleApplyBan(e: React.FormEvent) {
    e.preventDefault()
    setBanMessage(null)
    setApplyingBan(true)

    try {
      // First, find user by email
      const userResponse = await fetch(`/api/users/search?email=${encodeURIComponent(banUserEmail)}`)
      const userData = await userResponse.json()

      if (!userData.success || !userData.user) {
        throw new Error('User not found with this email')
      }

      const response = await fetch('/api/moderator/bans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.user.id,
          reason: banReason,
          durationHours: banDuration,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply ban')
      }

      setBanMessage({ type: 'success', text: data.message })
      setBanUserEmail('')
      setBanReason('')
      setBanDuration(24)
    } catch (err) {
      setBanMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to apply ban',
      })
    } finally {
      setApplyingBan(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout role={session?.user?.role || 'MODERATOR'}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role={session?.user?.role || 'MODERATOR'}>
      <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 -my-8 p-4 md:p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
              User Reports & Bans
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600">
              Report policy violations and manage temporary comment bans
            </p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-t-xl border-b border-gray-200 p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('file-report')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'file-report'
                    ? 'bg-[#5C2482] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                File Report
              </button>
              <button
                onClick={() => setActiveTab('view-reports')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'view-reports'
                    ? 'bg-[#5C2482] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                View Reports
              </button>
              <button
                onClick={() => setActiveTab('apply-ban')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'apply-ban'
                    ? 'bg-[#5C2482] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Apply Ban
              </button>
              <button
                onClick={() => setActiveTab('view-bans')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'view-bans'
                    ? 'bg-[#5C2482] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                View Bans
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 p-6">
            {/* File Report Tab */}
            {activeTab === 'file-report' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">File User Report</h2>
                <form onSubmit={handleFileReport} className="space-y-4">
                  {fileMessage && (
                    <div
                      className={`px-4 py-3 rounded-lg ${
                        fileMessage.type === 'success'
                          ? 'bg-green-50 border border-green-200 text-green-600'
                          : 'bg-red-50 border border-red-200 text-red-600'
                      }`}
                    >
                      {fileMessage.text}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Report * (min 10 characters)
                    </label>
                    <textarea
                      required
                      rows={4}
                      minLength={10}
                      maxLength={1000}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent"
                      placeholder="Describe the policy violation..."
                    />
                    <p className="text-xs text-gray-500 mt-1">{reason.length}/1000 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Evidence (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={evidence}
                      onChange={(e) => setEvidence(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent"
                      placeholder="Any additional evidence or context..."
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={filing}
                      className="px-6 py-3 bg-[#5C2482] text-white rounded-lg hover:bg-[#7B3FA3] disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
                    >
                      {filing ? 'Filing Report...' : 'File Report'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* View Reports Tab */}
            {activeTab === 'view-reports' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">My Filed Reports</h2>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      setReportsPage(1)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="REVIEWED">Reviewed</option>
                    <option value="DISMISSED">Dismissed</option>
                    <option value="ACTIONED">Actioned</option>
                  </select>
                </div>

                <div className="space-y-4">
                  {reports.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No reports found</p>
                  ) : (
                    reports.map((report) => (
                      <div
                        key={report.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{report.reportedUser.name}</p>
                            <p className="text-sm text-gray-600">{report.reportedUser.email}</p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              report.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-700'
                                : report.status === 'REVIEWED'
                                ? 'bg-blue-100 text-blue-700'
                                : report.status === 'DISMISSED'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {report.status}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-2">{report.reason}</p>
                        {report.evidence && (
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <strong>Evidence:</strong> {report.evidence}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Filed on {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {reportsTotalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      onClick={() => setReportsPage((p) => Math.max(1, p - 1))}
                      disabled={reportsPage === 1}
                      className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-700">
                      Page {reportsPage} of {reportsTotalPages}
                    </span>
                    <button
                      onClick={() => setReportsPage((p) => Math.min(reportsTotalPages, p + 1))}
                      disabled={reportsPage === reportsTotalPages}
                      className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Apply Ban Tab */}
            {activeTab === 'apply-ban' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Apply Temporary Comment Ban</h2>
                <form onSubmit={handleApplyBan} className="space-y-4">
                  {banMessage && (
                    <div
                      className={`px-4 py-3 rounded-lg ${
                        banMessage.type === 'success'
                          ? 'bg-green-50 border border-green-200 text-green-600'
                          : 'bg-red-50 border border-red-200 text-red-600'
                      }`}
                    >
                      {banMessage.text}
                    </div>
                  )}

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Comment bans are temporary and automatically expire. Maximum duration is 7 days (168 hours).
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={banUserEmail}
                      onChange={(e) => setBanUserEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ban Duration (hours) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={168}
                      value={banDuration}
                      onChange={(e) => setBanDuration(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">1-168 hours (max 7 days)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Ban * (min 10 characters)
                    </label>
                    <textarea
                      required
                      rows={4}
                      minLength={10}
                      maxLength={500}
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent"
                      placeholder="Reason for applying the comment ban..."
                    />
                    <p className="text-xs text-gray-500 mt-1">{banReason.length}/500 characters</p>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={applyingBan}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
                    >
                      {applyingBan ? 'Applying Ban...' : 'Apply Comment Ban'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* View Bans Tab */}
            {activeTab === 'view-bans' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Applied Comment Bans</h2>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={activeOnlyFilter}
                      onChange={(e) => {
                        setActiveOnlyFilter(e.target.checked)
                        setBansPage(1)
                      }}
                      className="rounded"
                    />
                    Active Only
                  </label>
                </div>

                <div className="space-y-4">
                  {bans.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No bans found</p>
                  ) : (
                    bans.map((ban) => {
                      const isExpired = new Date(ban.expiresAt) < new Date()
                      const isActive = ban.isActive && !isExpired

                      return (
                        <div
                          key={ban.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-gray-900">{ban.user.name}</p>
                              <p className="text-sm text-gray-600">{ban.user.email}</p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                isActive
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {isActive ? 'ACTIVE' : 'EXPIRED'}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">{ban.reason}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <p>
                              <strong>Duration:</strong> {ban.durationHours} hours
                            </p>
                            <p>
                              <strong>Expires:</strong> {new Date(ban.expiresAt).toLocaleString()}
                            </p>
                            <p>
                              <strong>Applied:</strong> {new Date(ban.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Pagination */}
                {bansTotalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      onClick={() => setBansPage((p) => Math.max(1, p - 1))}
                      disabled={bansPage === 1}
                      className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-700">
                      Page {bansPage} of {bansTotalPages}
                    </span>
                    <button
                      onClick={() => setBansPage((p) => Math.min(bansTotalPages, p + 1))}
                      disabled={bansPage === bansTotalPages}
                      className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
