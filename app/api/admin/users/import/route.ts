import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { auditLog } from '@/lib/audit'
import { sendWelcomeWithSetupEmail } from '@/lib/email'
import crypto from 'crypto'
import { formatName } from '@/lib/format-name'

export const dynamic = 'force-dynamic'

// Maximum users per import to prevent timeouts
const MAX_IMPORT_BATCH_SIZE = 100
const EMAIL_RATE_LIMIT_MS = 600 // 600ms between emails (max ~1.6 emails/sec)

type UserRow = {
  name: string
  email: string
  role: 'ADMIN' | 'MODERATOR' | 'INSTRUCTOR' | 'STUDENT'
}

type ImportError = {
  row: number
  email: string
  error: string
  suggestion?: string
}

// POST /api/admin/users/import - Bulk import users from Excel/CSV file
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can import users
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only admins can import users' },
        { status: 403 }
      )
    }

    // ============================================
    // PRE-IMPORT VALIDATION (Issue #38)
    // ============================================
    console.log('🔍 Pre-import validation starting...')

    // 1. Check email service configuration
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured')
      return NextResponse.json({
        success: false,
        message: 'Email service not configured. Cannot send welcome emails.',
        error: 'RESEND_API_KEY environment variable is not set. Please configure it in your deployment settings before importing users.',
        suggestion: 'Add RESEND_API_KEY to your environment variables and redeploy.',
      }, { status: 500 })
    }

    if (!process.env.RESEND_FROM_EMAIL) {
      console.error('❌ RESEND_FROM_EMAIL not configured')
      return NextResponse.json({
        success: false,
        message: 'Email sender not configured. Cannot send welcome emails.',
        error: 'RESEND_FROM_EMAIL environment variable is not set.',
        suggestion: 'Add RESEND_FROM_EMAIL to your environment variables and redeploy.',
      }, { status: 500 })
    }

    console.log('✅ Email service configuration validated')
    console.log(`   FROM: ${process.env.RESEND_FROM_EMAIL}`)
    console.log(`   API Key: ${process.env.RESEND_API_KEY.substring(0, 8)}...`)

    // Parse the uploaded file
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse Excel/CSV file
    let workbook: XLSX.WorkBook
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' })
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Failed to parse file. Please ensure it is a valid Excel or CSV file.' },
        { status: 400 }
      )
    }

    // Get the first sheet
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    // Convert to JSON
    const data: any[] = XLSX.utils.sheet_to_json(sheet)

    if (data.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'The file is empty or has no valid data',
        error: 'No rows found in the Excel/CSV file. Make sure the first row contains headers (name, email, role) and subsequent rows contain user data.',
        suggestion: 'Download the template file and fill it with user data.',
      }, { status: 400 })
    }

    // 2. Check batch size limit (Issue #40)
    if (data.length > MAX_IMPORT_BATCH_SIZE) {
      console.error(`❌ File has ${data.length} users, exceeds limit of ${MAX_IMPORT_BATCH_SIZE}`)
      return NextResponse.json({
        success: false,
        message: `File contains too many users (${data.length} rows)`,
        error: `Maximum ${MAX_IMPORT_BATCH_SIZE} users per import to prevent timeouts.`,
        suggestion: `Split your file into smaller batches of ${MAX_IMPORT_BATCH_SIZE} users or less.`,
        rowCount: data.length,
        maxAllowed: MAX_IMPORT_BATCH_SIZE,
      }, { status: 400 })
    }

    console.log(`✅ File validated: ${data.length} rows to process`)

    // 3. Check for required columns
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

        return NextResponse.json({
          success: false,
          message: 'Missing required columns in Excel file',
          error: `Required columns not found: ${missing.join(', ')}`,
          suggestion: 'Make sure the first row has column headers: name, email, role (case-sensitive)',
          foundColumns: Object.keys(firstRow),
        }, { status: 400 })
      }
    }

    console.log('✅ Required columns validated (name, email, role)')

    // Validate and process users
    const validUsers: UserRow[] = []
    const errors: ImportError[] = []
    const validRoles = ['ADMIN', 'MODERATOR', 'INSTRUCTOR', 'STUDENT']

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNumber = i + 2 // +2 because Excel rows start at 1 and we have a header

      // Validate required fields (Issue #42 - Better error messages)
      if (!row.name || !row.email || !row.role) {
        const missingFields = []
        if (!row.name) missingFields.push('name')
        if (!row.email) missingFields.push('email')
        if (!row.role) missingFields.push('role')

        errors.push({
          row: rowNumber,
          email: row.email || 'Not provided',
          error: `Missing required field(s): ${missingFields.join(', ')}`,
          suggestion: 'All three fields (name, email, role) are required for each user',
        })
        continue
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const emailStr = row.email.toString().trim()

      if (!emailRegex.test(emailStr)) {
        let suggestion = 'Email must be in format: user@domain.com'

        // Provide specific suggestions based on common errors
        if (!emailStr.includes('@')) {
          suggestion = 'Email is missing @ symbol'
        } else if (!emailStr.includes('.')) {
          suggestion = 'Email is missing domain extension (.com, .org, etc)'
        } else if (emailStr.startsWith('@')) {
          suggestion = 'Email is missing username before @'
        } else if (emailStr.endsWith('@')) {
          suggestion = 'Email is missing domain after @'
        }

        errors.push({
          row: rowNumber,
          email: emailStr,
          error: 'Invalid email format',
          suggestion,
        })
        continue
      }

      // Validate role
      const roleUpper = row.role.toString().toUpperCase()
      if (!validRoles.includes(roleUpper)) {
        // Suggest closest match
        let suggestion = `Must be one of: ${validRoles.join(', ')}`
        if (roleUpper.includes('TEACH')) {
          suggestion = 'Did you mean INSTRUCTOR?'
        } else if (roleUpper.includes('STUDENT') || roleUpper === 'PUPIL') {
          suggestion = 'Use STUDENT (uppercase)'
        } else if (roleUpper.includes('MOD')) {
          suggestion = 'Did you mean MODERATOR?'
        }

        errors.push({
          row: rowNumber,
          email: row.email,
          error: `Invalid role "${row.role}"`,
          suggestion,
        })
        continue
      }

      // Format name with proper capitalization and whitespace cleaning
      const formattedName = formatName(row.name.toString())

      validUsers.push({
        name: formattedName || row.name.toString().trim(), // Fallback to trimmed if formatting returns null
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
        firstOccurrence.set(user.email, index + 2) // Store first row number
      } else if (count > 0) {
        errors.push({
          row: index + 2,
          email: user.email,
          error: 'Duplicate email in file',
          suggestion: `Email already appears in row ${firstOccurrence.get(user.email)}. Each email must be unique.`,
        })
      }
    })

    // Remove duplicates from valid users
    const uniqueValidUsers = validUsers.filter(
      (user, index) => emailCounts.get(user.email) === 1 || validUsers.findIndex(u => u.email === user.email) === index
    )

    // ============================================
    // TWO-PHASE IMPORT (Issue #36, #41)
    // Phase 1: Create all users with reset tokens
    // Phase 2: Send emails and activate
    // ============================================

    console.log('🔄 Starting two-phase import...')

    let imported = 0
    let emailsSent = 0
    const importErrors: ImportError[] = []
    const createdUsers: Array<{ id: string; email: string; name: string; resetToken: string; role: string }> = []

    // Helper to add delay between emails (rate limiting)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // PHASE 1: Create all users in database with PENDING status
    console.log('📝 Phase 1: Creating user accounts...')

    for (let i = 0; i < uniqueValidUsers.length; i++) {
      const userData = uniqueValidUsers[i]
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
            suggestion: `User with this email already exists (Name: ${existingUser.name}, Role: ${existingUser.role}). Use a different email or update the existing user.`,
          })
          continue
        }

        // Generate reset token for password setup
        const resetToken = crypto.randomBytes(32).toString('hex')
        const resetTokenExpiry = new Date(Date.now() + 7 * 24 * 3600000) // 7 days

        // Create user with PENDING status
        // No password yet - user will set it via reset link
        const createdUser = await prisma.user.create({
          data: {
            name: userData.name,
            email: userData.email,
            hashedPassword: null, // No password yet
            role: userData.role,
            status: 'PENDING', // User is pending until they set password
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
        console.log(`✅ Created user ${i + 1}/${uniqueValidUsers.length}: ${userData.email}`)
      } catch (error: any) {
        console.error(`❌ Failed to create user: ${userData.email}`, error)
        importErrors.push({
          row: validUsers.findIndex(u => u.email === userData.email) + 2,
          email: userData.email,
          error: 'Failed to create user in database',
          suggestion: error.message || 'Database error occurred',
        })
      }
    }

    console.log(`✅ Phase 1 complete: Created ${imported} users`)

    // PHASE 2: Send welcome emails with password setup links
    console.log('📧 Phase 2: Sending welcome emails...')

    for (let i = 0; i < createdUsers.length; i++) {
      const userInfo = createdUsers[i]

      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const resetUrl = `${baseUrl}/auth/reset-password?token=${userInfo.resetToken}`

        console.log(`📧 Sending welcome email to: ${userInfo.email} (${i + 1}/${createdUsers.length})`)

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

        console.log(`✅ Welcome email sent: ${userInfo.email}`)
        console.log(`   Email ID: ${result?.id || 'unknown'}`)
        emailsSent++

        // Rate limiting: Wait between emails to avoid hitting provider limits
        if (i < createdUsers.length - 1) {
          await delay(EMAIL_RATE_LIMIT_MS)
        }
      } catch (emailError: any) {
        console.error(`❌ Failed to send welcome email to ${userInfo.email}`)
        console.error(`   Error: ${emailError?.message || 'Unknown error'}`)

        // User stays PENDING - can resend email later via #37 feature
        // Password setup link is still valid for 7 days
      }
    }

    console.log(`✅ Phase 2 complete: Sent ${emailsSent} welcome emails`)
    console.log(`ℹ️  Users with failed emails remain PENDING and can be activated later`)

    // Combine all errors
    const allErrors = [...errors, ...importErrors]
    const failed = allErrors.length

    // Create audit log
    await auditLog.userCreated(user.id, 'BULK_IMPORT', {
      imported,
      failed,
      totalRows: data.length,
    })

    // Return results
    if (imported === 0 && failed > 0) {
      // Check if all errors are due to existing users
      const allExistingUsers = allErrors.every(e => e.error.includes('already exists'))

      return NextResponse.json({
        success: false,
        message: allExistingUsers
          ? `All ${failed} users already exist in the database. No new users were imported.`
          : `Import failed. All ${failed} users had errors.`,
        imported: 0,
        failed,
        emailsSent: 0,
        errors: allErrors,
        allExistingUsers,
      })
    }

    const pendingUsers = imported - emailsSent

    let emailMessage = ''
    if (emailsSent === imported) {
      emailMessage = 'All users activated - welcome emails sent successfully.'
    } else if (emailsSent > 0) {
      emailMessage = `${emailsSent} users activated, ${pendingUsers} users pending (email failed - can resend later).`
    } else {
      emailMessage = `All ${imported} users created but emails failed to send. Users are PENDING and need welcome emails resent.`
    }

    return NextResponse.json({
      success: true,
      message: imported === uniqueValidUsers.length
        ? `Successfully imported all ${imported} users. ${emailMessage}`
        : `Imported ${imported} users with ${failed} errors. ${emailMessage}`,
      imported,
      failed,
      emailsSent,
      pendingUsers,
      errors: allErrors.length > 0 ? allErrors : undefined,
      warning: pendingUsers > 0 ? `${pendingUsers} users remain PENDING - they need welcome emails resent to activate their accounts.` : undefined,
    })
  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process bulk import' },
      { status: 500 }
    )
  }
}
