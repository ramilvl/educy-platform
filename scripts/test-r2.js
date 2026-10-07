const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const fs = require('fs')
const path = require('path')

// Load .env file manually
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim()
    }
  })
}

async function testR2() {
  console.log('\n=== Testing R2 Configuration ===\n')

  // Check environment variables
  console.log('Checking environment variables...')
  const requiredVars = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_ENDPOINT',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL'
  ]

  const missing = requiredVars.filter(v => !process.env[v])
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '))
    process.exit(1)
  }

  console.log('✅ All R2 environment variables are set')
  console.log('   - Endpoint:', process.env.R2_ENDPOINT)
  console.log('   - Bucket:', process.env.R2_BUCKET_NAME)
  console.log('   - Public URL:', process.env.R2_PUBLIC_URL)

  // Configure R2 client
  console.log('\nConfiguring R2 client...')
  const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })

  console.log('✅ R2 client configured')

  // Test generating upload URL
  console.log('\nTesting signed URL generation...')
  try {
    const testKey = `test/${Date.now()}-test.txt`
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: testKey,
      ContentType: 'text/plain',
    })

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
    console.log('✅ Successfully generated signed upload URL')
    console.log('   Test key:', testKey)
    console.log('   URL length:', signedUrl.length, 'characters')

    // Test uploading to the signed URL
    console.log('\nTesting actual upload to R2...')
    const testContent = 'This is a test file uploaded at ' + new Date().toISOString()

    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      body: testContent,
      headers: {
        'Content-Type': 'text/plain',
      },
    })

    if (uploadResponse.ok) {
      console.log('✅ Successfully uploaded test file to R2')
      console.log('   Status:', uploadResponse.status)
      console.log('   Public URL would be:', `${process.env.R2_PUBLIC_URL}/${testKey}`)
    } else {
      console.error('❌ Upload failed')
      console.error('   Status:', uploadResponse.status)
      console.error('   Status Text:', uploadResponse.statusText)
      const errorText = await uploadResponse.text()
      console.error('   Error:', errorText)
    }

  } catch (error) {
    console.error('❌ Error during R2 test:', error.message)
    if (error.stack) {
      console.error('\nStack trace:', error.stack)
    }
    process.exit(1)
  }

  console.log('\n=== R2 Test Complete ===\n')
}

testR2().catch(console.error)
