/**
 * Cleanup Script: Remove test users imported during testing
 * Keeps only the demo/example accounts
 */

import { prisma } from '../lib/prisma'

const TEST_USERS_TO_DELETE = [
  'john.doe@example.com',
  'jane.smith@example.com',
  'mike.johnson@example.com',
  'sarah.williams@example.com',
  'ismetsemedov@gmail.com',
  'Nail@gmail.com',
]

const DEMO_ACCOUNTS = [
  'admin@educy.com',
  'alice.instructor@educy.com',
  'bob.student@educy.com',
  'moderator@educy.com',
]

async function main() {
  console.log('🗑️  Cleaning up test user accounts...\n')

  // Show users to be deleted
  const usersToDelete = await prisma.user.findMany({
    where: {
      email: {
        in: TEST_USERS_TO_DELETE,
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  })

  if (usersToDelete.length === 0) {
    console.log('✅ No test users found to delete')
    return
  }

  console.log(`Found ${usersToDelete.length} test users to delete:\n`)
  usersToDelete.forEach((user) => {
    console.log(`  - ${user.email} (${user.name}, ${user.role})`)
  })

  // Delete the users
  console.log('\n🗑️  Deleting users...')

  const result = await prisma.user.deleteMany({
    where: {
      email: {
        in: TEST_USERS_TO_DELETE,
      },
    },
  })

  console.log(`\n✅ Deleted ${result.count} test users\n`)

  // Show remaining users
  const remainingUsers = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      role: true,
      status: true,
    },
    orderBy: {
      email: 'asc',
    },
  })

  console.log(`📊 Remaining users in database (${remainingUsers.length} total):\n`)
  remainingUsers.forEach((user) => {
    const isDemoAccount = DEMO_ACCOUNTS.includes(user.email)
    console.log(`  ${isDemoAccount ? '🔑' : '  '} ${user.email.padEnd(30)} | ${user.name.padEnd(20)} | ${user.role.padEnd(10)} | ${user.status}`)
  })

  console.log('\n✅ Cleanup complete!')
}

main()
  .catch((error) => {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
