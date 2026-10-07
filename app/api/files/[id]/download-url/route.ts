import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { generateDownloadUrl } from '@/lib/r2'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    // Get file from database
    const file = await prisma.file.findUnique({
      where: { id: params.id },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check if user has access to the file
    let hasAccess = false

    // 1. Owner can always download their own files
    if (file.ownerId === user.id) {
      hasAccess = true
    }

    // 2. Admins can download any file
    if (user.role === 'ADMIN') {
      hasAccess = true
    }

    // 3. Check if file is part of a submission
    if (!hasAccess) {
      const submission = await prisma.submission.findFirst({
        where: { fileKey: file.key },
        include: {
          assignment: {
            include: {
              section: true,
            },
          },
          student: true,
        },
      })

      if (submission) {
        // Student who submitted can download
        if (submission.studentId === user.id) {
          hasAccess = true
        }

        // Instructor of the section can download
        if (submission.assignment.section.instructorId === user.id) {
          hasAccess = true
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden: You do not have access to this file' }, { status: 403 })
    }

    // Generate signed download URL
    const downloadUrl = await generateDownloadUrl(file.key)

    return NextResponse.json({
      downloadUrl,
      filename: file.filename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    })
  } catch (error) {
    console.error('Error generating download URL:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    )
  }
}
