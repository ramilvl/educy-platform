import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { generateUploadUrl, generateFileKey, validateFileType, validateFileSize } from '@/lib/r2'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// SECURITY: Server-side file size limits - cannot be overridden by client
const FILE_SIZE_LIMITS = {
  GLOBAL_MAX: 104857600, // 100MB absolute maximum
  DEFAULT_MAX: 10485760, // 10MB default for general uploads
  ASSIGNMENT: 52428800, // 50MB for assignments
  LESSON: 52428800, // 50MB for lesson materials
  PROFILE: 5242880, // 5MB for profile images
} as const

const uploadUrlSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().positive(),
  allowedTypes: z.array(z.string()).optional(),
  prefix: z.string().optional(),
  context: z.enum(['assignment', 'profile', 'general', 'lesson']).optional().default('general'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const data = uploadUrlSchema.parse(body)

    // SECURITY: Enforce server-side file size limits based on context
    // Client cannot override these limits
    const contextLimits = {
      assignment: FILE_SIZE_LIMITS.ASSIGNMENT,
      lesson: FILE_SIZE_LIMITS.LESSON,
      profile: FILE_SIZE_LIMITS.PROFILE,
      general: FILE_SIZE_LIMITS.DEFAULT_MAX,
    }
    const maxSizeBytes = contextLimits[data.context]

    // Check against global maximum
    if (data.sizeBytes > FILE_SIZE_LIMITS.GLOBAL_MAX) {
      return NextResponse.json(
        { error: `File size exceeds global maximum of ${FILE_SIZE_LIMITS.GLOBAL_MAX / 1048576}MB` },
        { status: 400 }
      )
    }

    // Check against context-specific limit
    if (data.sizeBytes > maxSizeBytes) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${maxSizeBytes / 1048576}MB for ${data.context} uploads` },
        { status: 400 }
      )
    }

    // Validate file type if allowedTypes is provided
    if (data.allowedTypes && !validateFileType(data.filename, data.allowedTypes)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed types: ${data.allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Generate unique file key
    const fileKey = generateFileKey(user.id, data.filename, data.prefix)

    // Generate signed upload URL
    const uploadUrl = await generateUploadUrl(fileKey, data.contentType)

    // Create file record in database with PENDING status
    const file = await prisma.file.create({
      data: {
        ownerId: user.id,
        key: fileKey,
        filename: data.filename,
        mimeType: data.contentType,
        sizeBytes: data.sizeBytes,
        status: 'PENDING', // Will be updated to UPLOADED after successful upload
      },
    })

    // Get public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileKey}`

    return NextResponse.json({
      uploadUrl,
      fileId: file.id,
      fileKey,
      publicUrl, // Include public URL for client
    })
  } catch (error) {
    console.error('Error generating upload URL:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
