/**
 * Script to cleanup old PENDING files
 * Usage: npx tsx scripts/cleanup-pending-files.ts
 */

import { PrismaClient, FileStatus } from '@prisma/client'
import { deleteFile } from '../lib/r2'
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

// Delete files older than 24 hours in PENDING status
const CLEANUP_THRESHOLD_HOURS = 24

async function cleanupPendingFiles() {
  try {
    const thresholdDate = new Date()
    thresholdDate.setHours(thresholdDate.getHours() - CLEANUP_THRESHOLD_HOURS)

    console.log(`🧹 Cleaning up PENDING files older than ${CLEANUP_THRESHOLD_HOURS} hours...`)
    console.log(`   Threshold: ${thresholdDate.toISOString()}\n`)

    // Find old pending files
    const pendingFiles = await prisma.file.findMany({
      where: {
        status: FileStatus.PENDING,
        uploadedAt: {
          lt: thresholdDate,
        },
      },
    })

    if (pendingFiles.length === 0) {
      console.log('✨ No pending files to cleanup')
      return
    }

    console.log(`Found ${pendingFiles.length} pending files to cleanup:\n`)

    let deletedCount = 0
    let failedCount = 0

    for (const file of pendingFiles) {
      try {
        // Try to delete from R2 (may not exist)
        try {
          await deleteFile(file.key)
          console.log(`   ✅ Deleted from R2: ${file.filename}`)
        } catch (r2Error) {
          // File may not exist in R2, that's okay
          console.log(`   ⚠️  Not in R2 (expected): ${file.filename}`)
        }

        // Delete database record
        await prisma.file.delete({
          where: { id: file.id },
        })

        console.log(`   ✅ Deleted from DB: ${file.filename}`)
        deletedCount++
      } catch (error: any) {
        console.error(`   ❌ Failed to delete: ${file.filename} - ${error.message}`)
        failedCount++
      }
    }

    console.log('\n' + '─'.repeat(60))
    console.log('\n📊 Cleanup Summary:')
    console.log(`   Total pending files: ${pendingFiles.length}`)
    console.log(`   Successfully deleted: ${deletedCount}`)
    console.log(`   Failed: ${failedCount}`)
    console.log(`\n✨ Cleanup complete!`)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupPendingFiles()
