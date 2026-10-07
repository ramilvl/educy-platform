import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/files/[id]/confirm - Confirm successful upload
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    // Get file record
    const file = await prisma.file.findUnique({
      where: { id: params.id },
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Only file owner can confirm upload
    if (file.ownerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You do not have permission to confirm this upload' },
        { status: 403 }
      )
    }

    // Update file status to UPLOADED
    const updatedFile = await prisma.file.update({
      where: { id: params.id },
      data: { status: 'UPLOADED' },
    })

    return NextResponse.json({
      success: true,
      file: updatedFile,
    })
  } catch (error) {
    console.error('Error confirming upload:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to confirm upload' },
      { status: 500 }
    )
  }
}
