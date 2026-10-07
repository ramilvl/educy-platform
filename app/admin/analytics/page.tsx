'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/dashboard-layout'

type Analytics = {
  users: {
    total: number
    byRole: Array<{ role: string; count: number }>
    recent: number
  }
  courses: {
    total: number
    totalSections: number
  }
  enrollments: {
    total: number
    byStatus: Array<{ status: string; count: number }>
    recent: number
  }
  assignments: {
    total: number
    recent: number
  }
  submissions: {
    total: number
    graded: number
    pending: number
    avgGrade: number
    recent: number
  }
  activity: {
    total: number
    recent: number
    byAction: Array<{ action: string; count: number }>
    daily: Array<{ date: string; count: number }>
    topUsers: Array<{ name: string; email: string; role: string; activityCount: number }>
  }
  files: {
    total: number
    totalStorageBytes: number
    totalStorageMB: number
  }
  notifications: {
    total: number
    unread: number
  }
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('7d')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push('/auth/signin')
      return
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR') {
      router.push('/unauthorized')
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.role === 'ADMIN' || session?.user?.role === 'MODERATOR') {
      fetchAnalytics()
    }
  }, [session, period])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/analytics?period=${period}`)
      const data = await response.json()

      if (data.success) {
        setAnalytics(data.analytics)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading || !analytics) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role={session?.user?.role || 'ADMIN'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#5C2482]">
              Platform Analytics
            </h1>
            <p className="mt-2 text-gray-600">
              Comprehensive metrics and insights
            </p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 sm:px-4 border border-gray-300 rounded-xl"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Users */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs sm:text-sm">Total Users</p>
                <p className="text-3xl font-bold mt-2">{analytics.users.total}</p>
                <p className="text-blue-100 text-xs sm:text-sm mt-2">+{analytics.users.recent} recent</p>
              </div>
              <div className="text-4xl opacity-50">👥</div>
            </div>
          </div>

          {/* Courses */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs sm:text-sm">Total Courses</p>
                <p className="text-3xl font-bold mt-2">{analytics.courses.total}</p>
                <p className="text-purple-100 text-xs sm:text-sm mt-2">{analytics.courses.totalSections} sections</p>
              </div>
              <div className="text-4xl opacity-50">📚</div>
            </div>
          </div>

          {/* Enrollments */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs sm:text-sm">Enrollments</p>
                <p className="text-3xl font-bold mt-2">{analytics.enrollments.total}</p>
                <p className="text-green-100 text-xs sm:text-sm mt-2">+{analytics.enrollments.recent} recent</p>
              </div>
              <div className="text-4xl opacity-50">✅</div>
            </div>
          </div>

          {/* Submissions */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs sm:text-sm">Submissions</p>
                <p className="text-3xl font-bold mt-2">{analytics.submissions.total}</p>
                <p className="text-orange-100 text-xs sm:text-sm mt-2">{analytics.submissions.pending} pending</p>
              </div>
              <div className="text-4xl opacity-50">📝</div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users by Role */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-[#5C2482] mb-4">Users by Role</h2>
            <div className="space-y-3">
              {analytics.users.byRole.map((roleData) => {
                const percentage = (roleData.count / analytics.users.total) * 100
                return (
                  <div key={roleData.role}>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="text-gray-600">{roleData.role}</span>
                      <span className="text-[#5C2482] font-medium">
                        {roleData.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#F95B0E] h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Submissions Stats */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-[#5C2482] mb-4">Submission Statistics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                <span className="text-gray-700">Graded</span>
                <span className="text-2xl font-bold text-green-600">
                  {analytics.submissions.graded}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-xl">
                <span className="text-gray-700">Pending</span>
                <span className="text-2xl font-bold text-yellow-600">
                  {analytics.submissions.pending}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                <span className="text-gray-700">Average Grade</span>
                <span className="text-2xl font-bold text-[#5C2482]">
                  {analytics.submissions.avgGrade.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Metrics */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-[#5C2482] mb-4">System Activity</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-gray-600 text-xs sm:text-sm">Total Activity</p>
              <p className="text-3xl font-bold text-[#5C2482] mt-2">
                {analytics.activity.total.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-600 text-xs sm:text-sm">Recent Activity</p>
              <p className="text-3xl font-bold text-[#5C2482] mt-2">
                {analytics.activity.recent.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-600 text-xs sm:text-sm">Activity Types</p>
              <p className="text-3xl font-bold text-[#5C2482] mt-2">
                {analytics.activity.byAction.length}
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <h3 className="text-lg font-semibold text-[#5C2482] mb-3">Top Actions</h3>
          <div className="space-y-2">
            {analytics.activity.byAction.slice(0, 10).map((action, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-xs sm:text-sm text-gray-700">{action.action}</span>
                <span className="text-xs sm:text-sm font-bold text-[#5C2482]">
                  {action.count} times
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Active Users */}
        {analytics.activity.topUsers.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-[#5C2482] mb-4">Most Active Users</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-medium text-gray-500">Rank</th>
                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-medium text-gray-500">Email</th>
                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-medium text-gray-500">Role</th>
                    <th className="text-right py-3 px-4 text-xs sm:text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.activity.topUsers.map((user, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-[#5C2482]">{index + 1}</td>
                      <td className="py-3 px-4 text-[#5C2482] font-medium">{user.name}</td>
                      <td className="py-3 px-4 text-gray-600">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-[#5C2482] font-bold">
                        {user.activityCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Storage & Files */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-[#5C2482] mb-2">Total Files</h3>
            <p className="text-4xl font-bold text-[#5C2482]">
              {analytics.files.total}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-[#5C2482] mb-2">Storage Used</h3>
            <p className="text-4xl font-bold text-purple-600">
              {analytics.files.totalStorageMB} MB
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-[#5C2482] mb-2">Notifications</h3>
            <p className="text-4xl font-bold text-green-600">
              {analytics.notifications.total}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mt-2">
              {analytics.notifications.unread} unread
            </p>
          </div>
        </div>

        {/* Enrollments by Status */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-[#5C2482] mb-4">Enrollments by Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.enrollments.byStatus.map((statusData) => (
              <div key={statusData.status} className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">{statusData.status}</p>
                <p className="text-2xl font-bold text-[#5C2482]">{statusData.count}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {((statusData.count / analytics.enrollments.total) * 100).toFixed(1)}% of total
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Activity Chart */}
        {analytics.activity.daily.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-[#5C2482] mb-4">Daily Activity</h2>
            <div className="flex items-end justify-between h-48 gap-1">
              {analytics.activity.daily.map((day, index) => {
                const maxCount = Math.max(...analytics.activity.daily.map(d => d.count))
                const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 rounded-t hover:bg-[#F95B0E] transition-all"
                      style={{ height: `${height}%` }}
                      title={`${day.date}: ${day.count} actions`}
                    ></div>
                    <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                      {new Date(day.date).getDate()}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
