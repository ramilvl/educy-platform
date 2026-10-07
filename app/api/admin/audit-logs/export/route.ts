import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/audit-logs/export - Export audit logs to CSV or JSON
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can export audit logs
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can export audit logs' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'csv'
    const action = searchParams.get('action')
    const targetType = searchParams.get('targetType')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const where: any = {}
    if (action) where.action = action
    if (targetType) where.targetType = targetType
    if (userId) where.userId = userId
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    // Fetch all matching logs
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000, // Limit to prevent massive exports
    })

    if (format === 'json') {
      // Export as JSON
      return NextResponse.json({
        success: true,
        data: logs,
        exportedAt: new Date().toISOString(),
        totalRecords: logs.length,
      })
    } else {
      // Export as CSV
      const csvRows = [
        // Header
        ['Timestamp', 'User Email', 'User Name', 'User Role', 'Action', 'Target Type', 'Target ID', 'Details']
      ]

      // Data rows
      for (const log of logs) {
        csvRows.push([
          new Date(log.createdAt).toISOString(),
          log.user?.email || 'System',
          log.user?.name || 'System',
          log.user?.role || 'N/A',
          log.action,
          log.targetType || '',
          log.targetId || '',
          log.details ? JSON.stringify(log.details) : ''
        ])
      }

      // Convert to CSV string
      const csvContent = csvRows
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      // Return CSV file
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }
  } catch (error) {
    console.error('Audit logs export error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export audit logs' },
      { status: 500 }
    )
  }
}
