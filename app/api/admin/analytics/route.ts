import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/analytics - Get platform analytics and metrics
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can view analytics
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can view analytics' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '7d' // 7d, 30d, 90d, 1y, all

    // Calculate date range
    let startDate: Date | undefined
    const now = new Date()
    if (period === '7d') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    else if (period === '30d') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    else if (period === '90d') startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    else if (period === '1y') startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    const dateFilter = startDate ? { gte: startDate } : undefined

    // Fetch all analytics data in parallel
    const [
      // User metrics
      totalUsers,
      usersByRole,
      recentUsers,

      // Course metrics
      totalCourses,
      totalSections,

      // Enrollment metrics
      totalEnrollments,
      enrollmentsByStatus,
      recentEnrollments,

      // Assignment metrics
      totalAssignments,
      recentAssignments,

      // Submission metrics
      totalSubmissions,
      gradedSubmissions,
      pendingSubmissions,
      avgGrade,
      recentSubmissions,

      // Activity metrics
      totalAuditLogs,
      recentActivity,
      activityByAction,

      // File metrics
      totalFiles,
      totalStorageBytes,

      // Notification metrics
      totalNotifications,
      unreadNotifications,
    ] = await Promise.all([
      // Users
      prisma.user.count(),
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.user.count({ where: { createdAt: dateFilter } }),

      // Courses
      prisma.course.count(),
      prisma.section.count(),

      // Enrollments
      prisma.enrollment.count(),
      prisma.enrollment.groupBy({ by: ['status'], _count: true }),
      prisma.enrollment.count({ where: { enrolledAt: dateFilter } }),

      // Assignments
      prisma.assignment.count(),
      prisma.assignment.count({ where: { createdAt: dateFilter } }),

      // Submissions
      prisma.submission.count(),
      prisma.submission.count({ where: { grade: { not: null } } }),
      prisma.submission.count({ where: { grade: null } }),
      prisma.submission.aggregate({ _avg: { grade: true }, where: { grade: { not: null } } }),
      prisma.submission.count({ where: { submittedAt: dateFilter } }),

      // Activity
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: dateFilter } }),
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        where: { createdAt: dateFilter },
        orderBy: { _count: { action: 'desc' } },
        take: 10
      }),

      // Files
      prisma.file.count(),
      prisma.file.aggregate({ _sum: { sizeBytes: true } }),

      // Notifications
      prisma.notification.count(),
      prisma.notification.count({ where: { readAt: null } }),
    ])

    // Calculate daily activity for the period
    let dailyActivity: any[] = []
    if (startDate) {
      const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))

      // Build date keys and query each day's count
      const activityMap = new Map<string, number>()
      const dayBoundaries: { key: string; gte: Date; lt: Date }[] = []
      for (let i = 0; i < daysDiff; i++) {
        const dayStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
        const dateKey = dayStart.toISOString().split('T')[0]
        activityMap.set(dateKey, 0)
        dayBoundaries.push({ key: dateKey, gte: dayStart, lt: dayEnd })
      }

      const dayCounts = await Promise.all(
        dayBoundaries.map(({ key, gte, lt }) =>
          prisma.auditLog.count({ where: { createdAt: { gte, lt } } }).then(count => ({ key, count }))
        )
      )

      for (const { key, count } of dayCounts) {
        activityMap.set(key, count)
      }

      dailyActivity = Array.from(activityMap.entries()).map(([date, count]) => ({
        date,
        count
      }))
    }

    // Get most active users
    const mostActiveUsers = await prisma.auditLog.groupBy({
      by: ['userId'],
      _count: true,
      where: {
        userId: { not: null },
        createdAt: dateFilter
      },
      orderBy: { _count: { userId: 'desc' } },
      take: 10
    })

    const activeUsersWithDetails = await Promise.all(
      mostActiveUsers
        .filter(u => u.userId)
        .map(async (u) => {
          const userData = await prisma.user.findUnique({
            where: { id: u.userId! },
            select: { name: true, email: true, role: true }
          })
          return {
            ...userData,
            activityCount: u._count
          }
        })
    )

    return NextResponse.json({
      success: true,
      period,
      analytics: {
        users: {
          total: totalUsers,
          byRole: usersByRole.map(r => ({ role: r.role, count: r._count })),
          recent: recentUsers,
        },
        courses: {
          total: totalCourses,
          totalSections: totalSections,
        },
        enrollments: {
          total: totalEnrollments,
          byStatus: enrollmentsByStatus.map(e => ({ status: e.status, count: e._count })),
          recent: recentEnrollments,
        },
        assignments: {
          total: totalAssignments,
          recent: recentAssignments,
        },
        submissions: {
          total: totalSubmissions,
          graded: gradedSubmissions,
          pending: pendingSubmissions,
          avgGrade: avgGrade._avg.grade || 0,
          recent: recentSubmissions,
        },
        activity: {
          total: totalAuditLogs,
          recent: recentActivity,
          byAction: activityByAction.map(a => ({ action: a.action, count: a._count })),
          daily: dailyActivity,
          topUsers: activeUsersWithDetails,
        },
        files: {
          total: totalFiles,
          totalStorageBytes: totalStorageBytes._sum.sizeBytes || 0,
          totalStorageMB: Math.round((totalStorageBytes._sum.sizeBytes || 0) / 1024 / 1024),
        },
        notifications: {
          total: totalNotifications,
          unread: unreadNotifications,
        },
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
