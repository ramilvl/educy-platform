import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimitByIdentifier, RateLimitPresets } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const createPaymentSchema = z.object({
  studentId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  paymentMonth: z.string().datetime(),
  status: z.enum(['pending', 'paid', 'paused', 'cancelled']),
  statusReason: z.string().optional(),
  paidAt: z.string().datetime().optional(),
  paymentMethod: z.string().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
})

// POST /api/payments - Record new payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'INSTRUCTOR')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting for payment recording
    const rateLimit = rateLimitByIdentifier(
      request,
      'payment-record',
      session.user.id,
      RateLimitPresets.paymentRecord
    )
    if (rateLimit) return rateLimit

    const body = await request.json()
    const data = createPaymentSchema.parse(body)

    // Validate student exists and has STUDENT role
    const student = await prisma.user.findUnique({
      where: { id: data.studentId },
      select: { id: true, role: true, name: true },
    })

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      )
    }

    if (student.role !== 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Invalid student ID - user is not a student' },
        { status: 400 }
      )
    }

    const payment = await prisma.payment.create({
      data: {
        studentId: data.studentId,
        amount: data.amount,
        currency: data.currency,
        paymentMonth: new Date(data.paymentMonth),
        status: data.status,
        statusReason: data.statusReason,
        paidAt: data.paidAt ? new Date(data.paidAt) : null,
        paymentMethod: data.paymentMethod,
        receiptUrl: data.receiptUrl,
        notes: data.notes,
        recordedById: session.user.id,
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
      payment,
      message: 'Payment recorded successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Payment creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}

// GET /api/payments - List payments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const month = searchParams.get('month')
    const status = searchParams.get('status')

    let where: any = {}

    if (session.user.role === 'STUDENT') {
      where.studentId = session.user.id
    } else if (session.user.role === 'INSTRUCTOR') {
      // Instructors can only see payments for students enrolled in their sections
      const enrollments = await prisma.enrollment.findMany({
        where: {
          section: { instructorId: session.user.id },
          status: 'ENROLLED',
        },
        select: { userId: true },
        distinct: ['userId'],
      })
      const studentIds = enrollments.map((e) => e.userId)
      where.studentId = studentId && studentIds.includes(studentId)
        ? studentId
        : { in: studentIds }
    } else if (studentId) {
      // ADMIN and MODERATOR can filter by any studentId
      where.studentId = studentId
    }

    if (month) {
      const startOfMonth = new Date(month)
      const endOfMonth = new Date(startOfMonth)
      endOfMonth.setMonth(endOfMonth.getMonth() + 1)

      where.paymentMonth = {
        gte: startOfMonth,
        lt: endOfMonth,
      }
    }

    if (status) {
      where.status = status
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { paymentMonth: 'desc' },
    })

    return NextResponse.json({
      success: true,
      payments,
    })
  } catch (error) {
    console.error('Payment fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
