import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const fileReportSchema = z.object({
  reportedUserId: z.string().uuid(),
  reason: z.string().min(10).max(1000),
  evidence: z.string().optional(),
})

// POST /api/moderator/reports - File a user report
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'MODERATOR') {
      return NextResponse.json(
        { success: false, error: 'Only moderators can file user reports' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = fileReportSchema.parse(body)

    // Verify reported user exists
    const reportedUser = await prisma.user.findUnique({
      where: { id: data.reportedUserId },
      select: { id: true, name: true, email: true, role: true, status: true },
    })

    if (!reportedUser) {
      return NextResponse.json(
        { success: false, error: 'Reported user not found' },
        { status: 404 }
      )
    }

    // Prevent reporting admins
    if (reportedUser.role === 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Cannot report administrators' },
        { status: 403 }
      )
    }

    // Prevent self-reporting
    if (data.reportedUserId === user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot report yourself' },
        { status: 400 }
      )
    }

    // Create report
    const report = await prisma.userReport.create({
      data: {
        reportedById: user.id,
        reportedUserId: data.reportedUserId,
        reason: data.reason,
        evidence: data.evidence,
        status: 'PENDING',
      },
      include: {
        reportedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REPORTED',
        targetType: 'User',
        targetId: data.reportedUserId,
        details: {
          reportId: report.id,
          reportedUserName: reportedUser.name,
          reportedUserEmail: reportedUser.email,
          reason: data.reason,
        },
        severity: 'WARNING',
        category: 'USER_ACTION',
      },
    })

    // Notify admins about the report
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      select: { id: true },
    })

    await Promise.all(
      admins.map((admin) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'GENERAL',
            payload: {
              title: 'New User Report Filed',
              message: `Moderator ${user.name} has filed a report against ${reportedUser.name}`,
              reportId: report.id,
              reportedUserId: reportedUser.id,
              reportedUserName: reportedUser.name,
              moderatorName: user.name,
              action: 'USER_REPORT_FILED',
            },
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      report,
      message: 'Report filed successfully. Admins have been notified.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('User report filing error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to file report' },
      { status: 500 }
    )
  }
}

// GET /api/moderator/reports - View filed reports
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'MODERATOR' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only moderators and admins can view reports' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    // Moderators see only their own reports, admins see all
    if (user.role === 'MODERATOR') {
      where.reportedById = user.id
    }

    if (status && ['PENDING', 'REVIEWED', 'DISMISSED', 'ACTIONED'].includes(status)) {
      where.status = status
    }

    const [reports, total] = await Promise.all([
      prisma.userReport.findMany({
        where,
        include: {
          reportedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          reportedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip,
      }),
      prisma.userReport.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Reports fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}
