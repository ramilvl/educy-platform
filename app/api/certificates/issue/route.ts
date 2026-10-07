import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { rateLimitByIdentifier, RateLimitPresets } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only instructors and admins can issue certificates
    if (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Rate limiting for certificate issuance
    const rateLimit = rateLimitByIdentifier(
      request,
      'certificate-issue',
      user.id,
      RateLimitPresets.certificateIssue
    )
    if (rateLimit) return rateLimit

    const { enrollmentId } = await request.json()

    if (!enrollmentId) {
      return NextResponse.json({ success: false, error: 'Enrollment ID is required' }, { status: 400 })
    }

    // Verify the enrollment exists and is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: true,
        section: {
          include: {
            course: true,
            instructor: true,
          },
        },
        certificate: true,
      },
    })

    if (!enrollment) {
      return NextResponse.json({ success: false, error: 'Enrollment not found' }, { status: 404 })
    }

    if (enrollment.status !== 'ENROLLED') {
      return NextResponse.json({ success: false, error: 'Student must be enrolled to receive a certificate' }, { status: 400 })
    }

    // Check if certificate already exists
    if (enrollment.certificate) {
      return NextResponse.json({ success: false, error: 'Certificate already issued for this enrollment' }, { status: 400 })
    }

    // Verify instructor owns this section (if user is instructor)
    if (user.role === 'INSTRUCTOR' && enrollment.section.instructorId !== user.id) {
      return NextResponse.json({ success: false, error: 'You can only issue certificates for your own sections' }, { status: 403 })
    }

    // Create certificate
    const certificate = await prisma.certificate.create({
      data: {
        userId: enrollment.userId,
        sectionId: enrollment.sectionId,
        enrollmentId: enrollment.id,
        completionDate: new Date(),
        issuedById: user.id,
      },
      include: {
        user: true,
        section: {
          include: {
            course: true,
          },
        },
      },
    })

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'CERTIFICATE_ISSUED',
      targetType: 'Certificate',
      targetId: certificate.id,
      details: {
        studentId: enrollment.userId,
        studentName: enrollment.user.name,
        courseCode: enrollment.section.course.code,
        courseTitle: enrollment.section.course.title,
        certificateNumber: certificate.certificateNumber,
      },
      severity: 'INFO',
      category: 'ADMIN_ACTION',
    })

    return NextResponse.json({
      success: true,
      certificate,
    })
  } catch (error) {
    console.error('Error issuing certificate:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to issue certificate' },
      { status: 500 }
    )
  }
}
