import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/moderator/audit - Get audit logs for moderator
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'MODERATOR') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const skip = (page - 1) * limit

    // Fetch audit logs:
    // 1. Actions performed by this moderator
    // 2. Overrides affecting their decisions (enrollment approvals/rejections that were later changed)

    // Get moderator's own actions
    const moderatorActions = await prisma.auditLog.findMany({
      where: {
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip,
    })

    // Get enrollments that were approved/rejected by this moderator
    const moderatorEnrollmentActions = await prisma.auditLog.findMany({
      where: {
        userId: user.id,
        action: {
          in: ['ENROLLMENT_APPROVED', 'ENROLLMENT_REJECTED'],
        },
      },
      select: {
        targetId: true, // enrollment ID
      },
    })

    const enrollmentIds = moderatorEnrollmentActions.map(log => log.targetId).filter(Boolean) as string[]

    // Get override actions (other users changing those enrollments)
    const overrideActions = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['ENROLLMENT_APPROVED', 'ENROLLMENT_REJECTED', 'ENROLLMENT_REMOVED', 'SELF_UNENROLLED'],
        },
        targetId: {
          in: enrollmentIds,
        },
        userId: {
          not: user.id, // Exclude moderator's own actions
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Combine and sort all logs
    const allLogs = [...moderatorActions, ...overrideActions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Remove duplicates (same log ID)
    const uniqueLogs = Array.from(
      new Map(allLogs.map(log => [log.id, log])).values()
    ).slice(0, limit)

    // Get total count for pagination
    const totalCount = await prisma.auditLog.count({
      where: {
        OR: [
          { userId: user.id },
          {
            action: {
              in: ['ENROLLMENT_APPROVED', 'ENROLLMENT_REJECTED', 'ENROLLMENT_REMOVED', 'SELF_UNENROLLED'],
            },
            targetId: {
              in: enrollmentIds,
            },
            userId: {
              not: user.id,
            },
          },
        ],
      },
    })

    // Enrich logs with additional context
    const enrichedLogs = await Promise.all(
      uniqueLogs.map(async (log) => {
        let additionalContext: any = {}

        // For enrollment-related actions, fetch enrollment details
        if (log.targetType === 'Enrollment' && log.targetId) {
          try {
            const enrollment = await prisma.enrollment.findUnique({
              where: { id: log.targetId },
              include: {
                user: { select: { name: true, email: true } },
                section: {
                  include: {
                    course: { select: { code: true, title: true } },
                  },
                },
              },
            })
            if (enrollment) {
              additionalContext = {
                studentName: enrollment.user.name,
                studentEmail: enrollment.user.email,
                courseCode: enrollment.section.course.code,
                courseTitle: enrollment.section.course.title,
                currentStatus: enrollment.status,
              }
            }
          } catch (err) {
            // Enrollment might have been deleted
            additionalContext = { note: 'Enrollment no longer exists' }
          }
        }

        // Determine if this is an override
        const isOverride = log.userId !== user.id && enrollmentIds.includes(log.targetId || '')

        return {
          ...log,
          isOverride,
          additionalContext,
        }
      })
    )

    return NextResponse.json({
      success: true,
      logs: enrichedLogs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('Moderator audit fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
