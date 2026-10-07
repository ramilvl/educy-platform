const { Resend } = require('resend')
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

const resend = new Resend(process.env.RESEND_API_KEY)

async function testEmail() {
  try {
    console.log('Testing Resend email...')
    console.log('FROM:', process.env.RESEND_FROM_EMAIL)
    console.log('API Key:', process.env.RESEND_API_KEY ? 'Set (hidden)' : 'NOT SET')

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@educy.com',
      to: ['ismetsemedov@gmail.com'],
      subject: 'Test Email from Educy',
      html: '<h1>Test Email</h1><p>If you receive this, Resend is working correctly!</p>',
    })

    if (error) {
      console.error('❌ Email failed:', error)
      return
    }

    console.log('✅ Email sent successfully!')
    console.log('Email ID:', data.id)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testEmail()
