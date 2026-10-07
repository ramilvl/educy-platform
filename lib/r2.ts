import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Configure R2 client (S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME!
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!

/**
 * Generate a signed URL for uploading a file to R2
 * @param key - The file key/path in R2
 * @param contentType - The MIME type of the file
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 */
export async function generateUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn })
  return signedUrl
}

/**
 * Generate a signed URL for downloading a file from R2
 * @param key - The file key/path in R2
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 */
export async function generateDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn })
  return signedUrl
}

/**
 * Delete a file from R2
 * @param key - The file key/path in R2
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await r2Client.send(command)
}

/**
 * Get public URL for a file (if R2 public URL is configured)
 * @param key - The file key/path in R2
 */
export function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`
}

/**
 * Generate a unique file key for storage
 * @param userId - The user ID
 * @param filename - The original filename
 * @param prefix - Optional prefix (e.g., 'assignments', 'materials')
 */
export function generateFileKey(userId: string, filename: string, prefix?: string): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const basePath = prefix ? `${prefix}/${userId}` : userId
  return `${basePath}/${timestamp}-${sanitizedFilename}`
}

/**
 * Validate file type against allowed types
 * @param filename - The filename
 * @param allowedTypes - Array of allowed file extensions (e.g., ['pdf', 'docx'])
 */
export function validateFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase()
  if (!extension) return false
  return allowedTypes.includes(extension)
}

/**
 * Validate file size
 * @param sizeBytes - File size in bytes
 * @param maxSizeBytes - Maximum allowed size in bytes
 */
export function validateFileSize(sizeBytes: number, maxSizeBytes: number): boolean {
  return sizeBytes <= maxSizeBytes
}

export { r2Client }
