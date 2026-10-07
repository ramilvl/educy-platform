import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { auditLog } from '@/lib/audit'
import { sendWelcomeWithSetupEmail } from '@/lib/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Maximum users per import to prevent timeouts
const MAX_IMPORT_BATCH_SIZE = 100
const EMAIL_RATE_LIMIT_MS = 600 // 600ms between emails

type UserRow = {
  name: string
  email: string
  role: 'ADMIN' | 'MODERATOR' | 'INSTRUCTOR' | 'STUDENT'
}

type ProgressUpdate = {
  type: 'progress' | 'error' | 'complete' | 'phase'
  phase?: 'validation' | 'creating_users' | 'sending_emails' | 'complete'
  current?: number
  total?: number
  currentUser?: string
  status?: string
  message?: string
  success?: number
  failed?: number
  errors?: any[]
  timeElapsed?: number
}

// Helper to create SSE message
function createSSEMessage(data: ProgressUpdate): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

// Helper to add delay between emails (rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// POST /api/admin/users/import-stream - Streaming bulk import with progress updates
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  const startTime = Date.now()

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial message
        controller.enqueue(encoder.encode(createSSEMessage({
          type: 'progress',
          phase: 'validation',
          message: 'Starting import process...',
          timeElapsed: 0
        })))

        const user = await getCurrentUser()

        if (!user) {
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'error',
            message: 'Unauthorized',
          })))
          controller.close()
          return
        }

        // Only admins can import users
        if (user.role !== 'ADMIN') {
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'error',
            message: 'Forbidden: Only admins can import users',
          })))
          controller.close()
          return
        }

        // ============================================
        // PRE-IMPORT VALIDATION
        // ============================================
        controller.enqueue(encoder.encode(createSSEMessage({
          type: 'progress',
          phase: 'validation',
          message: 'Validating email service configuration...',
          timeElapsed: Date.now() - startTime
        })))

        // Check email service configuration
        if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'error',
            message: 'Email service not configured. Please configure RESEND_API_KEY and RESEND_FROM_EMAIL environment variables.',
          })))
          controller.close()
          return
        }

        // Parse the uploaded file
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'error',
            message: 'No file uploaded',
          })))
          controller.close()
          return
        }

        controller.enqueue(encoder.encode(createSSEMessage({
          type: 'progress',
          phase: 'validation',
          message: `Parsing file: ${file.name}...`,
          timeElapsed: Date.now() - startTime
        })))

        // Read file buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Parse Excel/CSV file
        let workbook: XLSX.WorkBook
        try {
          workbook = XLSX.read(buffer, { type: 'buffer' })
        } catch (error) {
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'error',
            message: 'Failed to parse file. Please ensure it is a valid Excel or CSV file.',
          })))
          controller.close()
          return
        }

        // Get the first sheet
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]

        // Convert to JSON
        const data: any[] = XLSX.utils.sheet_to_json(sheet)

        if (data.length === 0) {
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'error',
            message: 'The file is empty or has no valid data',
          })))
          controller.close()
          return
        }

        // Check batch size limit
        if (data.length > MAX_IMPORT_BATCH_SIZE) {
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'error',
            message: `File contains too many users (${data.length} rows). Maximum ${MAX_IMPORT_BATCH_SIZE} users per import.`,
          })))
          controller.close()
          return
        }

        controller.enqueue(encoder.encode(createSSEMessage({
          type: 'progress',
          phase: 'validation',
          message: `Validating ${data.length} users...`,
          total: data.length,
          timeElapsed: Date.now() - startTime
        })))

        // Check for required columns
        if (data.length > 0) {
          const firstRow = data[0]
          const hasName = 'name' in firstRow
          const hasEmail = 'email' in firstRow
          const hasRole = 'role' in firstRow

          if (!hasName || !hasEmail || !hasRole) {
            const missing = []
            if (!hasName) missing.push('name')
            if (!hasEmail) missing.push('email')
            if (!hasRole) missing.push('role')

            controller.enqueue(encoder.encode(createSSEMessage({
              type: 'error',
              message: `Missing required columns: ${missing.join(', ')}`,
            })))
            controller.close()
            return
          }
        }

        // Validate and process users
        const validUsers: UserRow[] = []
        const errors: any[] = []
        const validRoles = ['ADMIN', 'MODERATOR', 'INSTRUCTOR', 'STUDENT']

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const rowNumber = i + 2

          // Validate required fields
          if (!row.name || !row.email || !row.role) {
            const missingFields = []
            if (!row.name) missingFields.push('name')
            if (!row.email) missingFields.push('email')
            if (!row.role) missingFields.push('role')

            errors.push({
              row: rowNumber,
              email: row.email || 'Not provided',
              error: `Missing required field(s): ${missingFields.join(', ')}`,
            })
            continue
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          const emailStr = row.email.toString().trim()

          if (!emailRegex.test(emailStr)) {
            errors.push({
              row: rowNumber,
              email: emailStr,
              error: 'Invalid email format',
            })
            continue
          }

          // Validate role
          const roleUpper = row.role.toString().toUpperCase()
          if (!validRoles.includes(roleUpper)) {
            errors.push({
              row: rowNumber,
              email: row.email,
              error: `Invalid role "${row.role}"`,
            })
            continue
          }

          validUsers.push({
            name: row.name.toString().trim(),
            email: row.email.toString().trim().toLowerCase(),
            role: roleUpper as any,
          })
        }

        // Check for duplicate emails in the file
        const emailCounts = new Map<string, number>()
        const firstOccurrence = new Map<string, number>()

        validUsers.forEach((user, index) => {
          const count = emailCounts.get(user.email) || 0
          emailCounts.set(user.email, count + 1)

          if (count === 0) {
            firstOccurrence.set(user.email, index + 2)
          } else if (count > 0) {
            errors.push({
              row: index + 2,
              email: user.email,
              error: 'Duplicate email in file',
            })
          }
        })

        // Remove duplicates from valid users
        const uniqueValidUsers = validUsers.filter(
          (user, index) => emailCounts.get(user.email) === 1 || validUsers.findIndex(u => u.email === user.email) === index
        )

        if (uniqueValidUsers.length === 0) {
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'error',
            message: 'No valid users to import',
            errors,
          })))
          controller.close()
          return
        }

        // ============================================
        // PHASE 1: Create all users in database
        // ============================================
        controller.enqueue(encoder.encode(createSSEMessage({
          type: 'phase',
          phase: 'creating_users',
          message: `Creating ${uniqueValidUsers.length} user accounts...`,
          total: uniqueValidUsers.length,
          timeElapsed: Date.now() - startTime
        })))

        let imported = 0
        const importErrors: any[] = []
        const createdUsers: Array<{ id: string; email: string; name: string; resetToken: string; role: string }> = []

        for (let i = 0; i < uniqueValidUsers.length; i++) {
          const userData = uniqueValidUsers[i]

          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'progress',
            phase: 'creating_users',
            current: i + 1,
            total: uniqueValidUsers.length,
            currentUser: userData.email,
            status: `Creating user account...`,
            timeElapsed: Date.now() - startTime
          })))

          try {
            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
              where: { email: userData.email },
            })

            if (existingUser) {
              importErrors.push({
                row: validUsers.findIndex(u => u.email === userData.email) + 2,
                email: userData.email,
                error: 'Email already exists in database',
              })
              continue
            }

            // Generate reset token for password setup
            const resetToken = crypto.randomBytes(32).toString('hex')
            const resetTokenExpiry = new Date(Date.now() + 7 * 24 * 3600000) // 7 days

            // Create user with PENDING status
            const createdUser = await prisma.user.create({
              data: {
                name: userData.name,
                email: userData.email,
                hashedPassword: null,
                role: userData.role,
                status: 'PENDING',
                resetToken,
                resetTokenExpiry,
                welcomeEmailSent: false,
              },
            })

            createdUsers.push({
              id: createdUser.id,
              email: createdUser.email,
              name: createdUser.name,
              resetToken,
              role: userData.role,
            })

            imported++
          } catch (error: any) {
            importErrors.push({
              row: validUsers.findIndex(u => u.email === userData.email) + 2,
              email: userData.email,
              error: 'Failed to create user in database',
            })
          }
        }

        // ============================================
        // PHASE 2: Send welcome emails
        // ============================================
        controller.enqueue(encoder.encode(createSSEMessage({
          type: 'phase',
          phase: 'sending_emails',
          message: `Sending welcome emails to ${createdUsers.length} users...`,
          total: createdUsers.length,
          timeElapsed: Date.now() - startTime
        })))

        let emailsSent = 0

        for (let i = 0; i < createdUsers.length; i++) {
          const userInfo = createdUsers[i]

          // Calculate estimated time remaining
          const avgTimePerEmail = EMAIL_RATE_LIMIT_MS
          const remaining = createdUsers.length - i
          const estimatedSeconds = Math.ceil((remaining * avgTimePerEmail) / 1000)

          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'progress',
            phase: 'sending_emails',
            current: i + 1,
            total: createdUsers.length,
            currentUser: userInfo.email,
            status: `Sending welcome email... (~${estimatedSeconds}s remaining)`,
            success: emailsSent,
            failed: i - emailsSent,
            timeElapsed: Date.now() - startTime
          })))

          try {
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
            const resetUrl = `${baseUrl}/auth/reset-password?token=${userInfo.resetToken}`

            const result = await sendWelcomeWithSetupEmail({
              to: userInfo.email,
              userName: userInfo.name,
              setupUrl: resetUrl,
              role: userInfo.role,
            })

            // Mark user as ACTIVE and email as sent
            await prisma.user.update({
              where: { id: userInfo.id },
              data: {
                status: 'ACTIVE',
                welcomeEmailSent: true,
                welcomeEmailSentAt: new Date(),
              },
            })

            emailsSent++

            // Rate limiting: Wait between emails
            if (i < createdUsers.length - 1) {
              await delay(EMAIL_RATE_LIMIT_MS)
            }
          } catch (emailError: any) {
            // User stays PENDING - can resend email later
            console.error(`Failed to send email to ${userInfo.email}:`, emailError)
          }
        }

        // Combine all errors
        const allErrors = [...errors, ...importErrors]
        const failed = allErrors.length

        // Create audit log
        await auditLog.userCreated(user.id, 'BULK_IMPORT', {
          imported,
          failed,
          totalRows: data.length,
        })

        // Send completion message
        const totalTime = Math.ceil((Date.now() - startTime) / 1000)
        const pendingUsers = imported - emailsSent

        controller.enqueue(encoder.encode(createSSEMessage({
          type: 'complete',
          phase: 'complete',
          message: imported === uniqueValidUsers.length
            ? `Successfully imported all ${imported} users in ${totalTime}s`
            : `Imported ${imported} users with ${failed} errors in ${totalTime}s`,
          success: emailsSent,
          failed: pendingUsers,
          errors: allErrors.length > 0 ? allErrors : undefined,
          timeElapsed: Date.now() - startTime
        })))

        controller.close()
      } catch (error: any) {
        console.error('Streaming import error:', error)
        controller.enqueue(encoder.encode(createSSEMessage({
          type: 'error',
          message: error.message || 'Failed to process bulk import',
        })))
        controller.close()
      }
    },
  })

  // Return streaming response with SSE headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
