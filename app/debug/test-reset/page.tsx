'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function TestPasswordResetPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [testEmail, setTestEmail] = useState('')
  const [envResult, setEnvResult] = useState<any>(null)
  const [emailResult, setEmailResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>
  }

  if (!session?.user || session.user.role !== 'ADMIN') {
    router.push('/auth/signin')
    return null
  }

  const checkEnvironment = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/debug/env-check')
      const data = await res.json()
      setEnvResult(data)
    } catch (error) {
      setEnvResult({ error: 'Failed to fetch environment status' })
    } finally {
      setLoading(false)
    }
  }

  const testEmail_send = async () => {
    if (!testEmail) {
      alert('Please enter a test email address')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/debug/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail }),
      })
      const data = await res.json()
      setEmailResult(data)
    } catch (error) {
      setEmailResult({ error: 'Failed to send test email' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-2xl font-bold text-[#5C2482] mb-4">
            Password Reset Diagnostics (Admin Only)
          </h1>
          <p className="text-gray-600 mb-6">
            This page helps diagnose password reset email issues in production.
          </p>

          {/* Environment Check */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#5C2482] mb-3">
              1. Check Environment Variables
            </h2>
            <button
              onClick={checkEnvironment}
              disabled={loading}
              className="px-3 py-2 sm:px-4 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c] transition disabled:bg-gray-300"
            >
              {loading ? 'Checking...' : 'Check Environment'}
            </button>

            {envResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(envResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Email Test */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#5C2482] mb-3">
              2. Test Email Sending
            </h2>
            <div className="space-y-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter your email to test"
                className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C2482]"
              />
              <button
                onClick={testEmail_send}
                disabled={loading || !testEmail}
                className="px-3 py-2 sm:px-4 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c] transition disabled:bg-gray-300"
              >
                {loading ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>

            {emailResult && (
              <div className={`mt-4 p-4 rounded-xl ${
                emailResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <h3 className={`font-semibold mb-2 ${
                  emailResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {emailResult.success ? '✅ Success' : '❌ Failed'}
                </h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(emailResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h3 className="font-semibold text-blue-800 mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside text-xs sm:text-sm text-blue-700 space-y-1">
              <li>First, click "Check Environment" to verify variables are set</li>
              <li>Then, enter your email and click "Send Test Email"</li>
              <li>Check the results to see what error is occurring</li>
              <li>If successful, check your email inbox (and spam folder)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
