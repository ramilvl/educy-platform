'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { MdEmail } from 'react-icons/md'

function ForgotPasswordForm() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(data.message || 'Password reset instructions have been sent to your email.')
        setEmail('')
      } else {
        setError(data.error || 'Failed to process request')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#5C2482] to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-[#5C2482] to-white">
      {/* LEFT SIDE */}
      <div className="w-1/2 hidden md:flex items-center justify-center bg-gradient-to-br from-[#5C2482] to-[#8B4AB8] rounded-br-[100px]">
        <img
          src="/login.png"
          className="w-3/5 h-3/5 object-contain"
          alt="Reset Password"
          onError={(e) => {
            console.error('Image failed to load')
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-white rounded-tl-[100px] p-8">
        <h1 className="text-[#5C2482] text-4xl font-semibold mb-4">
          Forgot Password?
        </h1>
        <p className="text-gray-600 text-center mb-10 max-w-md">
          Enter your email address and we'll send you instructions to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-6">
          {message && (
            <div className="text-green-600 bg-green-50 px-4 py-3 rounded-lg text-xs sm:text-sm border border-green-200">
              {message}
            </div>
          )}

          {error && (
            <div className="text-red-600 bg-red-50 px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}

          {/* EMAIL */}
          <div className="flex flex-col gap-2">
            <label className="text-[#5C2482] font-medium">Email</label>
            <div className="relative flex items-center">
              <MdEmail className="absolute left-3 text-[#5C2482] text-xl" />
              <input
                type="email"
                placeholder="Enter Email"
                className="w-full h-12 border border-gray-300 rounded-xl pl-10 pr-4 text-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-3/5 mx-auto bg-[#F95B0E] hover:bg-[#d94f0c] text-white h-12 rounded-xl text-lg font-medium mt-4 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <Link
            href="/auth/signin"
            className="text-center text-xs sm:text-sm text-gray-500 hover:text-[#5C2482] transition"
          >
            ← Back to Sign In
          </Link>
        </form>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#5C2482] to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  )
}
