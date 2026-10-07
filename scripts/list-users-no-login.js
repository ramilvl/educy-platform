/**
 * Script to list all users who have never logged in
 * Usage: node scripts/list-users-no-login.js
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

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

async function listUsersWithoutLogin() {
  try {
    const users = await prisma.user.findMany({
      where: {
        lastLogin: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    if (users.length === 0) {
      console.log('✨ All users have logged in at least once!')
      return
    }

    console.log(`\n📋 Users who have never logged in (${users.length} total):\n`)
    console.log('─'.repeat(100))
    console.log('NAME'.padEnd(25) + 'EMAIL'.padEnd(35) + 'ROLE'.padEnd(15) + 'CREATED')
    console.log('─'.repeat(100))

    for (const user of users) {
      const date = user.createdAt.toISOString().split('T')[0]
      console.log(
        user.name.padEnd(25) +
        user.email.padEnd(35) +
        user.role.padEnd(15) +
        date
      )
    }

    console.log('─'.repeat(100))
    console.log(`\nTo resend welcome emails to these users, run:`)
    console.log(`  node scripts/resend-welcome-emails.js --all-never-logged-in\n`)
    console.log(`Or to specific users:`)
    console.log(`  node scripts/resend-welcome-emails.js ${users.slice(0, 2).map(u => u.email).join(' ')}\n`)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

listUsersWithoutLogin()
