import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/student/assignments - Get all assignments for logged-in student
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get all enrollments for this student
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: session.user.id,
        status: 'ENROLLED',
      },
      select: {
        sectionId: true,
      },
    })

    const sectionIds = enrollments.map((e) => e.sectionId)

    // Get all assignments for these sections
    const assignments = await prisma.assignment.findMany({
      where: {
        sectionId: {
          in: sectionIds,
        },
      },
      include: {
        section: {
          include: {
            course: {
              select: {
                code: true,
                title: true,
              },
            },
          },
        },
        submissions: {
          where: {
            studentId: session.user.id,
          },
          select: {
            id: true,
            submittedAt: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      assignments: assignments.map((a: any) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        section: a.section,
        submission: a.submissions[0] || null,
      })),
    })
  } catch (error) {
    console.error('Student assignments fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}
