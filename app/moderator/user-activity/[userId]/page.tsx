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
  createdAt: string
}

interface AuditLog {
  id: string
  action: string
  targetType: string
  targetId: string
  details: any
  severity: string
  createdAt: string
}

interface Enrollment {
  id: string
  status: string
  enrolledAt: string
  section: {
    name: string
    course: {
      code: string
      title: string
    }
  }
}

interface Submission {
  id: string
  status: string
  submittedAt: string
  assignment: {
    title: string
    dueDate: string
  }
}

interface Report {
  id: string
  reason: string
  evidence?: string
  status: string
  createdAt: string
  reportedBy: {
    id: string
    name: string
    role: string
  }
}

interface Ban {
  id: string
  reason: string
  durationHours: number
  expiresAt: string
  isActive: boolean
  createdAt: string
  bannedBy: {
    id: string
    name: string
    role: string
  }
}

interface Activity {
  auditLogs: AuditLog[]
  enrollments: Enrollment[]
  submissions: Submission[]
  reportsReceived: Report[]
  bansReceived: Ban[]
  activeBan: Ban | null
}

export default function UserActivityPage({ params }: { params: { userId: string } }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [activeTab, setActiveTab] = useState<'audit' | 'enrollments' | 'submissions' | 'reports' | 'bans'>('audit')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'MODERATOR' && session?.user?.role !== 'ADMIN') {
        router.push('/dashboard')
      } else {
        loadActivity()
      }
    }
  }, [status, session, router])

  async function loadActivity() {
    setLoading(true)
    try {
      const response = await fetch(`/api/moderator/user-activity/${params.userId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load activity')
      }

      setUser(data.user)
      setActivity(data.activity)
    } catch (err) {
      console.error('Failed to load activity:', err)
      alert(err instanceof Error ? err.message : 'Failed to load activity')
      router.push('/moderator/reports')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading || !user || !activity) {
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
            <button
              onClick={() => router.back()}
              className="mb-4 text-[#5C2482] hover:underline flex items-center gap-1"
            >
              ← Back
            </button>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {user.name}
                  </h1>
                  <p className="text-gray-600 mb-1">{user.email}</p>
                  <div className="flex gap-2 items-center">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {user.role}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        user.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.status}
                    </span>
                    {activity.activeBan && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        COMMENT BANNED
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {activity.activeBan && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>Active Comment Ban:</strong> {activity.activeBan.reason}
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Expires: {new Date(activity.activeBan.expiresAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-t-xl border-b border-gray-200 p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'audit'
                    ? 'bg-[#5C2482] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Audit Logs ({activity.auditLogs.length})
              </button>
              <button
                onClick={() => setActiveTab('enrollments')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'enrollments'
                    ? 'bg-[#5C2482] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Enrollments ({activity.enrollments.length})
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'submissions'
                    ? 'bg-[#5C2482] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Submissions ({activity.submissions.length})
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'reports'
                    ? 'bg-[#5C2482] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Reports ({activity.reportsReceived.length})
              </button>
              <button
                onClick={() => setActiveTab('bans')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'bans'
                    ? 'bg-[#5C2482] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Bans ({activity.bansReceived.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 p-6">
            {/* Audit Logs Tab */}
            {activeTab === 'audit' && (
              <div className="space-y-3">
                {activity.auditLogs.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No audit logs found</p>
                ) : (
                  activity.auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{log.action}</p>
                          <p className="text-sm text-gray-600">
                            {log.targetType} {log.targetId && `(${log.targetId.substring(0, 8)}...)`}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            log.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-700'
                              : log.severity === 'ERROR'
                              ? 'bg-orange-100 text-orange-700'
                              : log.severity === 'WARNING'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {log.severity}
                        </span>
                      </div>
                      {log.details && (
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Enrollments Tab */}
            {activeTab === 'enrollments' && (
              <div className="space-y-3">
                {activity.enrollments.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No enrollments found</p>
                ) : (
                  activity.enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {enrollment.section.course.code}: {enrollment.section.course.title}
                          </p>
                          <p className="text-sm text-gray-600">Section: {enrollment.section.name}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            enrollment.status === 'ENROLLED'
                              ? 'bg-green-100 text-green-700'
                              : enrollment.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {enrollment.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Enrolled on {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Submissions Tab */}
            {activeTab === 'submissions' && (
              <div className="space-y-3">
                {activity.submissions.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No submissions found</p>
                ) : (
                  activity.submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{submission.assignment.title}</p>
                          <p className="text-sm text-gray-600">
                            Due: {new Date(submission.assignment.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            submission.status === 'GRADED'
                              ? 'bg-green-100 text-green-700'
                              : submission.status === 'SUBMITTED'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {submission.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Submitted on {new Date(submission.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="space-y-3">
                {activity.reportsReceived.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No reports filed against this user</p>
                ) : (
                  activity.reportsReceived.map((report) => (
                    <div
                      key={report.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            Filed by {report.reportedBy.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {report.reportedBy.role}
                          </p>
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
            )}

            {/* Bans Tab */}
            {activeTab === 'bans' && (
              <div className="space-y-3">
                {activity.bansReceived.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No comment bans received</p>
                ) : (
                  activity.bansReceived.map((ban) => {
                    const isExpired = new Date(ban.expiresAt) < new Date()
                    const isActive = ban.isActive && !isExpired

                    return (
                      <div
                        key={ban.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              Banned by {ban.bannedBy.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {ban.bannedBy.role}
                            </p>
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
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
