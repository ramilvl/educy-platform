import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const tabSwitchSchema = z.object({
  eventType: z.enum(['visibility_hidden', 'visibility_visible', 'blur', 'focus']),
  timestamp: z.string().datetime().optional(),
})

// POST /api/assignments/[id]/tab-switch - Log a tab switch event
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = tabSwitchSchema.parse(body)

    // Verify assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
    })

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Find existing submission if any
    const submission = await prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: params.id,
          studentId: session.user.id,
        },
      },
    })

    // Create tab switch log
    const tabSwitch = await prisma.tabSwitch.create({
      data: {
        assignmentId: params.id,
        studentId: session.user.id,
        submissionId: submission?.id,
        eventType: data.eventType,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      tabSwitch,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Tab switch logging error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log tab switch' },
      { status: 500 }
    )
  }
}

// GET /api/assignments/[id]/tab-switch - Get tab switch events for an assignment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    // Only instructors and admins can view other students' tab switches
    if (studentId && studentId !== session.user.id) {
      if (session.user.role !== 'INSTRUCTOR' && session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        )
      }

      // Verify instructor has access to this assignment
      const assignment = await prisma.assignment.findUnique({
        where: { id: params.id },
        include: {
          section: {
            select: {
              instructorId: true,
            },
          },
        },
      })

      if (
        !assignment ||
        (assignment.section.instructorId !== session.user.id &&
          session.user.role !== 'ADMIN')
      ) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    const tabSwitches = await prisma.tabSwitch.findMany({
      where: {
        assignmentId: params.id,
        ...(studentId ? { studentId } : { studentId: session.user.id }),
      },
      orderBy: {
        timestamp: 'asc',
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      tabSwitches,
      count: tabSwitches.length,
    })
  } catch (error) {
    console.error('Tab switch fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tab switches' },
      { status: 500 }
    )
  }
}
