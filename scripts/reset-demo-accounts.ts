/**
 * Script to reset database and create demo accounts
 * Usage: npx tsx scripts/reset-demo-accounts.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
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

async function resetDemoAccounts() {
  try {
    console.log('🗑️  Deleting all existing data...\n')

    // Delete in correct order to respect foreign key constraints
    console.log('   Deleting schedules...')
    await prisma.schedule.deleteMany({})

    console.log('   Deleting lessons...')
    await prisma.lesson.deleteMany({})

    console.log('   Deleting submissions...')
    await prisma.submission.deleteMany({})

    console.log('   Deleting assignments...')
    await prisma.assignment.deleteMany({})

    console.log('   Deleting enrollments...')
    await prisma.enrollment.deleteMany({})

    console.log('   Deleting sections...')
    await prisma.section.deleteMany({})

    console.log('   Deleting courses...')
    await prisma.course.deleteMany({})

    console.log('   Deleting files...')
    await prisma.file.deleteMany({})

    console.log('   Deleting notifications...')
    await prisma.notification.deleteMany({})

    console.log('   Deleting audit logs...')
    await prisma.auditLog.deleteMany({})

    console.log('   Deleting rooms...')
    await prisma.room.deleteMany({})

    console.log('   Deleting users...')
    const deletedUsers = await prisma.user.deleteMany({})
    console.log(`   ✅ Deleted ${deletedUsers.count} users and all related data\n`)

    console.log('👥 Creating demo accounts...\n')

    // Demo accounts as shown on signin page
    const demoAccounts = [
      {
        name: 'Admin User',
        email: 'admin@educy.com',
        password: 'admin123',
        role: 'ADMIN' as const,
      },
      {
        name: 'Alice Instructor',
        email: 'alice.instructor@educy.com',
        password: 'instructor123',
        role: 'INSTRUCTOR' as const,
      },
      {
        name: 'Bob Student',
        email: 'bob.student@educy.com',
        password: 'student123',
        role: 'STUDENT' as const,
      },
    ]

    for (const account of demoAccounts) {
      const hashedPassword = await bcrypt.hash(account.password, 10)

      await prisma.user.create({
        data: {
          name: account.name,
          email: account.email,
          hashedPassword,
          role: account.role,
        },
      })

      console.log(`   ✅ ${account.role.padEnd(12)} - ${account.email.padEnd(30)} / ${account.password}`)
    }

    console.log('\n' + '─'.repeat(80))
    console.log('\n✨ Demo accounts created successfully!')
    console.log('\nYou can now sign in at http://localhost:3000/auth/signin with:')
    console.log('  • Admin:      admin@educy.com / admin123')
    console.log('  • Instructor: alice.instructor@educy.com / instructor123')
    console.log('  • Student:    bob.student@educy.com / student123')
    console.log()
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetDemoAccounts()
