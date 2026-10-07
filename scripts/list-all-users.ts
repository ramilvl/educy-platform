/**
 * Script to list all users in the database
 * Usage: npx tsx scripts/list-all-users.ts
 */

import { PrismaClient } from '@prisma/client'
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

async function listAllUsers() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        role: 'asc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLogin: true,
      },
    })

    if (users.length === 0) {
      console.log('📭 No users found in database')
      return
    }

    console.log(`\n👥 All Users (${users.length} total):\n`)
    console.log('─'.repeat(100))
    console.log('NAME'.padEnd(25) + 'EMAIL'.padEnd(35) + 'ROLE'.padEnd(15) + 'LAST LOGIN')
    console.log('─'.repeat(100))

    for (const user of users) {
      const lastLogin = user.lastLogin
        ? user.lastLogin.toISOString().split('T')[0]
        : 'Never'

      console.log(
        user.name.padEnd(25) +
        user.email.padEnd(35) +
        user.role.padEnd(15) +
        lastLogin
      )
    }

    console.log('─'.repeat(100))
    console.log()
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

listAllUsers()
