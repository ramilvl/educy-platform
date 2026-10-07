'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/dashboard-layout'
import Link from 'next/link'

export default function CreateUserPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    role: 'STUDENT' as 'ADMIN' | 'MODERATOR' | 'INSTRUCTOR' | 'STUDENT',
    sendEmail: true,
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ password: string; emailSent?: boolean; emailError?: string | null } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess({
          password: data.temporaryPassword,
          emailSent: data.emailSent,
          emailError: data.emailError
        })
        // Reset form
        setFormData({
          name: '',
          surname: '',
          email: '',
          role: 'STUDENT',
          sendEmail: true,
        })
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <DashboardLayout role='ADMIN'>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role={session?.user?.role || 'ADMIN'}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/admin/users"
            className="text-[#5C2482] hover:underline mb-4 inline-block"
          >
            ← Back to Users
          </Link>
          <h1 className="text-3xl font-bold text-[#5C2482]">
            Create New User
          </h1>
          <p className="mt-2 text-gray-600">
            Add a new user to the system. They will receive login credentials via email.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              ✅ User Created Successfully!
            </h3>
            <p className="text-green-800 mb-4">
              {success.emailSent
                ? '✉️ An email with login credentials has been sent to the user.'
                : success.emailError
                  ? `⚠️ User created but email failed to send: ${success.emailError}. Please share the password below manually.`
                  : 'User created. Make sure to save the temporary password below:'}
            </p>
            <div className="bg-white p-4 rounded border border-green-300">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">
                <strong>Temporary Password:</strong>
              </p>
              <p className="font-mono text-lg text-[#5C2482] bg-gray-100 p-2 rounded">
                {success.password}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                ⚠️ Save this password - it won't be shown again!
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setSuccess(null)}
                className="px-3 py-2 sm:px-4 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c]"
              >
                Create Another User
              </button>
              <Link
                href="/admin/users"
                className="px-3 py-2 sm:px-4 border border-green-600 text-green-600 rounded-xl hover:bg-green-50"
              >
                Back to Users List
              </Link>
            </div>
          </div>
        )}

        {/* Form */}
        {!success && (
          <div className="bg-white rounded-xl shadow p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Surname
                  </label>
                  <input
                    type="text"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as typeof formData.role,
                    })
                  }
                  className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="STUDENT">Student</option>
                  <option value="INSTRUCTOR">Instructor</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Select the appropriate role for this user
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={formData.sendEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, sendEmail: e.target.checked })
                  }
                  className="w-4 h-4 text-[#5C2482] border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="sendEmail"
                  className="ml-2 text-xs sm:text-sm text-gray-700"
                >
                  Send welcome email with login credentials
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>ℹ️ Note:</strong> A random temporary password will be generated
                  automatically. The user should change it after first login.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Creating User...' : 'Create User'}
                </button>
                <Link
                  href="/admin/users"
                  className="px-4 py-2 sm:px-6 sm:py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
