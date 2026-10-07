'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MdLock } from 'react-icons/md'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('Password reset successfully! Redirecting to sign in...')
        setTimeout(() => {
          router.push('/auth/signin')
        }, 2000)
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex bg-gradient-to-b from-[#5C2482] to-white">
        <div className="w-1/2 hidden md:flex items-center justify-center bg-gradient-to-br from-[#5C2482] to-[#8B4AB8] rounded-br-[100px]">
          <img src="/login.png" className="w-3/5 h-3/5 object-contain" alt="Error" />
        </div>
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-white rounded-tl-[100px] p-8">
          <div className="text-red-500 text-6xl mb-6">❌</div>
          <h1 className="text-[#5C2482] text-3xl font-semibold mb-4">Invalid Reset Link</h1>
          <p className="text-gray-600 text-center mb-8 max-w-md">
            This password reset link is invalid or has expired.
          </p>
          <Link
            href="/auth/forgot-password"
            className="bg-[#F95B0E] hover:bg-[#d94f0c] text-white px-8 py-3 rounded-xl text-lg font-medium transition"
          >
            Request New Link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-[#5C2482] to-white">
      {/* LEFT SIDE */}
      <div className="w-1/2 hidden md:flex items-center justify-center bg-gradient-to-br from-[#5C2482] to-[#8B4AB8] rounded-br-[100px]">
        <img src="/login.png" className="w-3/5 h-3/5 object-contain" alt="Reset Password" />
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-white rounded-tl-[100px] p-8">
        <h1 className="text-[#5C2482] text-4xl font-semibold mb-4">
          Reset Password
        </h1>
        <p className="text-gray-600 text-center mb-10 max-w-md">
          Enter your new password below
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

          {/* NEW PASSWORD */}
          <div className="flex flex-col gap-2">
            <label className="text-[#5C2482] font-medium">New Password</label>
            <div className="relative flex items-center">
              <MdLock className="absolute left-3 text-[#5C2482] text-xl" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                className="w-full h-12 border border-gray-300 rounded-xl pl-10 pr-10 text-black"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              {showPassword ? (
                <AiOutlineEye
                  className="absolute right-3 text-[#5C2482] text-xl cursor-pointer"
                  onClick={() => setShowPassword(false)}
                />
              ) : (
                <AiOutlineEyeInvisible
                  className="absolute right-3 text-[#5C2482] text-xl cursor-pointer"
                  onClick={() => setShowPassword(true)}
                />
              )}
            </div>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="flex flex-col gap-2">
            <label className="text-[#5C2482] font-medium">Confirm Password</label>
            <div className="relative flex items-center">
              <MdLock className="absolute left-3 text-[#5C2482] text-xl" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                className="w-full h-12 border border-gray-300 rounded-xl pl-10 pr-10 text-black"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
              {showConfirmPassword ? (
                <AiOutlineEye
                  className="absolute right-3 text-[#5C2482] text-xl cursor-pointer"
                  onClick={() => setShowConfirmPassword(false)}
                />
              ) : (
                <AiOutlineEyeInvisible
                  className="absolute right-3 text-[#5C2482] text-xl cursor-pointer"
                  onClick={() => setShowConfirmPassword(true)}
                />
              )}
            </div>
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-3/5 mx-auto bg-[#F95B0E] hover:bg-[#d94f0c] text-white h-12 rounded-xl text-lg font-medium mt-4 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#5C2482] to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5C2482] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
