import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { requireAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/dashboard-layout'
import Link from 'next/link'

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  // Fetch system statistics
  const [totalUsers, totalCourses, totalSections, totalEnrollments, totalRooms, recentAuditLogs] =
    await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.section.count(),
      prisma.enrollment.count({ where: { status: 'ENROLLED' } }),
      prisma.room.count(),
      prisma.auditLog.findMany({
        where: {
          OR: [
            { severity: 'CRITICAL' },
            { severity: 'WARNING' }
          ]
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

  // Get user counts by role
  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: true,
  })

  const roleStats = usersByRole.reduce(
    (acc, { role, _count }) => {
      acc[role] = _count
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <DashboardLayout role={session.user.role}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#5C2482]">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            System overview and management
          </p>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/admin/users"
            className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition group"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <svg
                  className="w-6 h-6 text-[#5C2482]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Total Users
                </p>
                <p className="text-2xl font-bold text-[#5C2482] group-hover:text-[#5C2482]">
                  {totalUsers}
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/courses"
            className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition group"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Total Courses
                </p>
                <p className="text-2xl font-bold text-[#5C2482] group-hover:text-green-600">
                  {totalCourses}
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/rooms"
            className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition group"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Total Rooms
                </p>
                <p className="text-2xl font-bold text-[#5C2482] group-hover:text-purple-600">
                  {totalRooms}
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/moderator/enrollments"
            className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition group"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Active Enrollments
                </p>
                <p className="text-2xl font-bold text-[#5C2482] group-hover:text-orange-600">
                  {totalEnrollments}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* User Stats by Role */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#5C2482]">
              Users by Role
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-3xl font-bold text-[#5C2482]">
                  {roleStats.ADMIN || 0}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Admins</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-3xl font-bold text-green-600">
                  {roleStats.INSTRUCTOR || 0}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Instructors</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-3xl font-bold text-purple-600">
                  {roleStats.MODERATOR || 0}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Moderators</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-3xl font-bold text-orange-600">
                  {roleStats.STUDENT || 0}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Students</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#5C2482]">
              Quick Actions
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/admin/users"
                className="flex items-center justify-center px-6 py-4 border-2 border-gray-200 rounded-xl hover:shadow-md transition group"
              >
                <svg
                  className="w-6 h-6 text-gray-400 group-hover:text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <span className="ml-3 font-medium text-[#5C2482]">
                  Manage Users
                </span>
              </Link>

              <Link
                href="/admin/rooms"
                className="flex items-center justify-center px-6 py-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 transition group"
              >
                <svg
                  className="w-6 h-6 text-gray-400 group-hover:text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <span className="ml-3 font-medium text-[#5C2482]">
                  Manage Rooms
                </span>
              </Link>

              <Link
                href="/admin/audit-logs"
                className="flex items-center justify-center px-6 py-4 border-2 border-gray-200 rounded-xl hover:border-green-500 transition group"
              >
                <svg
                  className="w-6 h-6 text-gray-400 group-hover:text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="ml-3 font-medium text-[#5C2482]">
                  View Audit Logs
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-[#5C2482]">
                Recent Important Activity
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Critical and warning events (excluding routine logins)
              </p>
            </div>
            <Link
              href="/admin/audit-logs"
              className="text-xs sm:text-sm text-[#5C2482] hover:underline"
            >
              View All →
            </Link>
          </div>
          <div className="p-6">
            {recentAuditLogs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No recent activity
              </p>
            ) : (
              <div className="space-y-3">
                {recentAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start space-x-3 text-xs sm:text-sm p-3 border border-gray-200 rounded-xl"
                  >
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#5C2482]">
                        <span className="font-medium">
                          {log.user?.name || 'System'}
                        </span>{' '}
                        - {log.action}
                      </p>
                      {log.targetType && (
                        <p className="text-gray-600 text-xs mt-1">
                          Target: {log.targetType} ({log.targetId})
                        </p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
