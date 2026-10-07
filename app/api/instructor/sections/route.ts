import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const includeCertificates = searchParams.get('includeCertificates') === 'true'

    // Get all sections the instructor is teaching
    const sections = await prisma.section.findMany({
      where: { instructorId: user.id },
      include: {
        course: {
          select: {
            code: true,
            title: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
        enrollments: includeCertificates ? {
          where: { status: 'ENROLLED' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            certificate: {
              select: {
                id: true,
                certificateNumber: true,
                issuedAt: true,
              },
            },
          },
          orderBy: { enrolledAt: 'asc' },
        } : false,
      },
      orderBy: [
        { term: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({
      success: true,
      sections,
    })
  } catch (error) {
    console.error('Error fetching sections:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sections' },
      { status: 500 }
    )
  }
}
