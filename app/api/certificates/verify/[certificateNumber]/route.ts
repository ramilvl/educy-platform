import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { certificateNumber: string } }
) {
  try {
    const { certificateNumber } = params

    if (!certificateNumber) {
      return NextResponse.json({ success: false, error: 'Certificate number is required' }, { status: 400 })
    }

    // Find certificate (public verification - no auth required)
    const certificate = await prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        section: {
          include: {
            course: {
              select: {
                code: true,
                title: true,
                description: true,
              },
            },
            instructor: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        issuedBy: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    })

    if (!certificate) {
      return NextResponse.json({ success: false, error: 'Certificate not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        studentName: certificate.user.name,
        courseCode: certificate.section.course.code,
        courseTitle: certificate.section.course.title,
        courseDescription: certificate.section.course.description,
        instructorName: certificate.section.instructor.name,
        completionDate: certificate.completionDate,
        issuedAt: certificate.issuedAt,
        issuedByName: certificate.issuedBy?.name,
        issuedByRole: certificate.issuedBy?.role,
      },
    })
  } catch (error) {
    console.error('Error verifying certificate:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify certificate' },
      { status: 500 }
    )
  }
}
