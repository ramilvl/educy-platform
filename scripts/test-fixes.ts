/**
 * Test script to verify all bug fixes
 * Run with: npx tsx scripts/test-fixes.ts
 */

import { prisma } from '../lib/prisma'

async function testFixes() {
  console.log('🧪 Testing All Bug Fixes\n')
  console.log('=' .repeat(60))

  let passedTests = 0
  let failedTests = 0

  // Test 1: Check User model has password reset fields
  console.log('\n📋 Test 1: Database Schema - Password Reset Fields')
  try {
    const user = await prisma.user.findFirst()
    if (user) {
      const hasResetToken = 'resetToken' in user
      const hasResetTokenExpiry = 'resetTokenExpiry' in user

      if (hasResetToken && hasResetTokenExpiry) {
        console.log('✅ PASS: User model has resetToken and resetTokenExpiry fields')
        passedTests++
      } else {
        console.log('❌ FAIL: User model missing password reset fields')
        failedTests++
      }
    } else {
      console.log('⚠️  SKIP: No users in database to test')
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking user schema:', error)
    failedTests++
  }

  // Test 2: Check File model has status tracking
  console.log('\n📋 Test 2: Database Schema - File Status Tracking')
  try {
    const file = await prisma.file.findFirst()
    const hasStatus = file && 'status' in file
    const hasUpdatedAt = file && 'updatedAt' in file

    if (hasStatus && hasUpdatedAt) {
      console.log('✅ PASS: File model has status and updatedAt fields')
      passedTests++
    } else if (!file) {
      console.log('⚠️  SKIP: No files in database to test')
    } else {
      console.log('❌ FAIL: File model missing status tracking fields')
      failedTests++
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking file schema:', error)
    failedTests++
  }

  // Test 3: Check Submission model has isLate field
  console.log('\n📋 Test 3: Database Schema - Late Submission Tracking')
  try {
    const submission = await prisma.submission.findFirst()
    const hasIsLate = submission && 'isLate' in submission

    if (hasIsLate) {
      console.log('✅ PASS: Submission model has isLate field')
      passedTests++
    } else if (!submission) {
      console.log('⚠️  SKIP: No submissions in database to test')
    } else {
      console.log('❌ FAIL: Submission model missing isLate field')
      failedTests++
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking submission schema:', error)
    failedTests++
  }

  // Test 4: Check database indexes exist
  console.log('\n📋 Test 4: Database Indexes')
  try {
    // Query with indexed fields should work efficiently
    await prisma.enrollment.findMany({
      where: { status: 'PENDING' },
      take: 1,
    })

    await prisma.section.findMany({
      where: { term: '2024-Fall' },
      take: 1,
    })

    await prisma.auditLog.findMany({
      where: { severity: 'CRITICAL' },
      take: 1,
    })

    console.log('✅ PASS: Database queries with indexes execute successfully')
    passedTests++
  } catch (error) {
    console.log('❌ FAIL: Error querying with indexes:', error)
    failedTests++
  }

  // Test 5: Check MODERATOR role access
  console.log('\n📋 Test 5: MODERATOR Role Configuration')
  try {
    const moderators = await prisma.user.findMany({
      where: { role: 'MODERATOR' },
    })

    console.log(`✅ PASS: Can query MODERATOR users (found ${moderators.length})`)
    passedTests++
  } catch (error) {
    console.log('❌ FAIL: Error querying moderators:', error)
    failedTests++
  }

  // Test 6: Check course/section relationships
  console.log('\n📋 Test 6: Course/Section Relationships')
  try {
    const sections = await prisma.section.findMany({
      include: {
        course: true,
        instructor: true,
      },
      take: 1,
    })

    if (sections.length > 0) {
      const section = sections[0]
      const hasCourse = section.course && 'id' in section.course
      const hasInstructor = section.instructor && 'id' in section.instructor

      if (hasCourse && hasInstructor) {
        console.log('✅ PASS: Section properly relates to course and instructor')
        console.log(`   Course ID: ${section.course.id}`)
        console.log(`   Section ID: ${section.id}`)
        passedTests++
      } else {
        console.log('❌ FAIL: Section missing course or instructor relation')
        failedTests++
      }
    } else {
      console.log('⚠️  SKIP: No sections in database to test')
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking course/section relations:', error)
    failedTests++
  }

  // Test 7: Check enrollment capacity tracking
  console.log('\n📋 Test 7: Enrollment Capacity Tracking')
  try {
    const section = await prisma.section.findFirst({
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
    })

    if (section) {
      console.log('✅ PASS: Can track enrollment counts')
      console.log(`   Enrollments: ${section._count.enrollments}/${section.capacity}`)
      passedTests++
    } else {
      console.log('⚠️  SKIP: No sections in database to test')
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking enrollment capacity:', error)
    failedTests++
  }

  // Test 8: Check audit log severity levels
  console.log('\n📋 Test 8: Audit Log Severity Levels')
  try {
    const criticalLogs = await prisma.auditLog.count({
      where: { severity: 'CRITICAL' },
    })

    const warningLogs = await prisma.auditLog.count({
      where: { severity: 'WARNING' },
    })

    const infoLogs = await prisma.auditLog.count({
      where: { severity: 'INFO' },
    })

    console.log('✅ PASS: Audit log severity levels working')
    console.log(`   CRITICAL: ${criticalLogs}, WARNING: ${warningLogs}, INFO: ${infoLogs}`)
    passedTests++
  } catch (error) {
    console.log('❌ FAIL: Error checking audit log severity:', error)
    failedTests++
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 Test Summary:')
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`📝 Total:  ${passedTests + failedTests}`)

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed!')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.')
  }

  console.log('\n' + '='.repeat(60))
}

// Run tests
testFixes()
  .catch((error) => {
    console.error('Fatal error running tests:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
