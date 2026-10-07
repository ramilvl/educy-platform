import { PrismaClient } from '@prisma/client'
import { sendPasswordResetEmail } from '../lib/email'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function testPasswordReset() {
  try {
    console.log('🔍 Testing Password Reset Email Functionality\n')

    // Check environment variables
    console.log('📋 Environment Variables:')
    console.log('  RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set')
    console.log('  RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || 'Using default: noreply@educy.com')
    console.log('  NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'Using default: http://localhost:3000')
    console.log()

    // Get a test user
    const user = await prisma.user.findFirst({
      where: {
        email: {
          not: undefined
        }
      }
    })

    if (!user) {
      console.error('❌ No users found in database')
      return
    }

    console.log(`📧 Testing with user: ${user.email}`)
    console.log(`   Name: ${user.name}`)
    console.log()

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour

    console.log('🔑 Generated reset token:', resetToken.substring(0, 16) + '...')
    console.log('⏰ Token expires:', resetTokenExpiry.toISOString())
    console.log()

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    console.log('💾 Saved token to database')
    console.log()

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`

    console.log('🔗 Reset URL:', resetUrl.substring(0, 80) + '...')
    console.log()

    // Try to send email
    console.log('📤 Attempting to send password reset email...')
    try {
      const result = await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetUrl,
      })

      console.log('✅ Email sent successfully!')
      console.log('   Result:', JSON.stringify(result, null, 2))
    } catch (emailError: any) {
      console.error('❌ Failed to send email:')
      console.error('   Error:', emailError.message)
      if (emailError.resendError) {
        console.error('   Resend Error:', JSON.stringify(emailError.resendError, null, 2))
      }
      console.error('   Full error:', emailError)
    }

    // Clean up - remove the test token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: null,
        resetTokenExpiry: null,
      },
    })
    console.log()
    console.log('🧹 Cleaned up test token from database')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPasswordReset()
