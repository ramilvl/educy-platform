/**
 * Script to resend welcome emails to users who didn't receive them
 * Usage: npx tsx scripts/resend-welcome-emails.ts <email1> <email2> ...
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { generatePassword } from '../lib/password'
import { sendWelcomeEmail } from '../lib/email'
import * as fs from 'fs'
import * as path from 'path'

// Load .env manually
const envPath = path.join(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    process.env[key.trim()] = valueParts.join('=').trim()
  }
})

const prisma = new PrismaClient()

async function resendWelcomeEmails() {
  try {
    // Get emails from command line arguments
    const emails = process.argv.slice(2)

    if (emails.length === 0) {
      console.log('Usage: npx tsx scripts/resend-welcome-emails.ts <email1> <email2> ...')
      console.log('\nExample:')
      console.log('  npx tsx scripts/resend-welcome-emails.ts user1@example.com user2@example.com')
      console.log('\nOr resend to all users who never logged in:')
      console.log('  npx tsx scripts/resend-welcome-emails.ts --all-never-logged-in')
      process.exit(0)
    }

    let users = []

    // Check if --all-never-logged-in flag is used
    if (emails[0] === '--all-never-logged-in') {
      console.log('📧 Finding all users who have never logged in...\n')
      users = await prisma.user.findMany({
        where: {
          lastLogin: null,
        },
      })
      console.log(`Found ${users.length} users who have never logged in\n`)
    } else {
      // Find users by email
      console.log(`📧 Looking up ${emails.length} users...\n`)
      users = await prisma.user.findMany({
        where: {
          email: {
            in: emails,
          },
        },
      })

      if (users.length === 0) {
        console.log('❌ No users found with the provided emails')
        process.exit(1)
      }

      if (users.length < emails.length) {
        const foundEmails = users.map(u => u.email)
        const notFound = emails.filter(e => !foundEmails.includes(e))
        console.log(`⚠️  Warning: Could not find users: ${notFound.join(', ')}\n`)
      }
    }

    let sent = 0
    let failed = 0

    for (const user of users) {
      try {
        // Generate new temporary password
        const newPassword = generatePassword(12)
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update user's password
        await prisma.user.update({
          where: { id: user.id },
          data: { hashedPassword },
        })

        console.log(`👤 ${user.name} (${user.email})`)
        console.log(`   New password: ${newPassword}`)

        // Send welcome email
        await sendWelcomeEmail({
          to: user.email,
          userName: user.name,
          temporaryPassword: newPassword,
          role: user.role,
        })

        console.log(`   ✅ Welcome email sent successfully\n`)
        sent++
      } catch (error: any) {
        console.log(`   ❌ Failed to send email: ${error.message}\n`)
        failed++
      }
    }

    console.log('─'.repeat(60))
    console.log(`\n📊 Summary:`)
    console.log(`   Total users: ${users.length}`)
    console.log(`   Emails sent: ${sent}`)
    console.log(`   Failed: ${failed}`)
    console.log(`\n✨ Done!`)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resendWelcomeEmails()
