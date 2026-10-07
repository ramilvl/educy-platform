'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/dashboard-layout'

interface SystemSettings {
  id: string
  platformName: string
  platformLogoUrl: string | null
  systemEmailFrom: string | null
  systemEmailName: string | null
  passwordMinLength: number
  passwordRequireUpper: boolean
  passwordRequireLower: boolean
  passwordRequireNumber: boolean
  passwordRequireSpecial: boolean
  maxUploadSizeMB: number
  enableCaseRooms: boolean
  enableExams: boolean
  enableCertificates: boolean
  enablePayments: boolean
  maxEnrollmentsPerStudent: number | null
  createdAt: string
  updatedAt: string
}

export default function SystemSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    platformName: '',
    platformLogoUrl: '',
    systemEmailFrom: '',
    systemEmailName: '',
    passwordMinLength: 8,
    passwordRequireUpper: true,
    passwordRequireLower: true,
    passwordRequireNumber: true,
    passwordRequireSpecial: false,
    maxUploadSizeMB: 10,
    enableCaseRooms: true,
    enableExams: true,
    enableCertificates: true,
    enablePayments: true,
    maxEnrollmentsPerStudent: 5,
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push('/auth/signin')
      return
    }
    if (session.user.role !== 'ADMIN') {
      router.push('/unauthorized')
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchSettings()
    }
  }, [session])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/system-settings')
      const data = await response.json()

      if (data.success) {
        setSettings(data.settings)
        setFormData({
          platformName: data.settings.platformName || '',
          platformLogoUrl: data.settings.platformLogoUrl || '',
          systemEmailFrom: data.settings.systemEmailFrom || '',
          systemEmailName: data.settings.systemEmailName || '',
          passwordMinLength: data.settings.passwordMinLength || 8,
          passwordRequireUpper: data.settings.passwordRequireUpper ?? true,
          passwordRequireLower: data.settings.passwordRequireLower ?? true,
          passwordRequireNumber: data.settings.passwordRequireNumber ?? true,
          passwordRequireSpecial: data.settings.passwordRequireSpecial ?? false,
          maxUploadSizeMB: data.settings.maxUploadSizeMB || 10,
          enableCaseRooms: data.settings.enableCaseRooms ?? true,
          enableExams: data.settings.enableExams ?? true,
          enableCertificates: data.settings.enableCertificates ?? true,
          enablePayments: data.settings.enablePayments ?? true,
          maxEnrollmentsPerStudent: data.settings.maxEnrollmentsPerStudent ?? 5,
        })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      setMessage({ type: 'error', text: 'Failed to load system settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          platformLogoUrl: formData.platformLogoUrl || null,
          systemEmailFrom: formData.systemEmailFrom || null,
          systemEmailName: formData.systemEmailName || null,
          maxEnrollmentsPerStudent: formData.maxEnrollmentsPerStudent || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
        setSettings(data.settings)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout role={session?.user?.role || 'ADMIN'}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#5C2482]"></div>
            <p className="mt-2 text-gray-600">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role={session?.user?.role || 'ADMIN'}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#5C2482]">System Settings</h1>
          <p className="mt-2 text-gray-600">Configure platform-wide settings and features</p>
        </div>

        {message && (
          <div
            className={`rounded-xl p-4 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform Identity */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Platform Identity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Name
                </label>
                <input
                  type="text"
                  value={formData.platformName}
                  onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent text-gray-900 bg-white"
                  placeholder="Educy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={formData.platformLogoUrl}
                  onChange={(e) => setFormData({ ...formData, platformLogoUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent text-gray-900 bg-white"
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
          </div>

          {/* Email Configuration */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Email From
                </label>
                <input
                  type="email"
                  value={formData.systemEmailFrom}
                  onChange={(e) => setFormData({ ...formData, systemEmailFrom: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent text-gray-900 bg-white"
                  placeholder="noreply@educy.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Email Name
                </label>
                <input
                  type="text"
                  value={formData.systemEmailName}
                  onChange={(e) => setFormData({ ...formData, systemEmailName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent text-gray-900 bg-white"
                  placeholder="Educy Platform"
                />
              </div>
            </div>
          </div>

          {/* Password Policy */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Password Policy</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Password Length
                </label>
                <input
                  type="number"
                  min={6}
                  max={20}
                  value={formData.passwordMinLength}
                  onChange={(e) => {
                    const value = e.target.value
                    // Allow empty value during typing, will validate on blur
                    if (value === '') {
                      setFormData({ ...formData, passwordMinLength: 0 })
                    } else {
                      const num = parseInt(value)
                      if (!isNaN(num)) {
                        setFormData({ ...formData, passwordMinLength: num })
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // On blur, ensure we have a valid value
                    const value = parseInt(e.target.value)
                    if (isNaN(value) || value < 6) {
                      setFormData({ ...formData, passwordMinLength: 8 })
                    }
                  }}
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent text-gray-900 bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">Recommended: 8-12 characters</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.passwordRequireUpper}
                    onChange={(e) => setFormData({ ...formData, passwordRequireUpper: e.target.checked })}
                    className="w-5 h-5 text-[#5C2482] border-gray-300 rounded focus:ring-[#5C2482]"
                  />
                  <span className="text-sm text-gray-700">Require uppercase letter</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.passwordRequireLower}
                    onChange={(e) => setFormData({ ...formData, passwordRequireLower: e.target.checked })}
                    className="w-5 h-5 text-[#5C2482] border-gray-300 rounded focus:ring-[#5C2482]"
                  />
                  <span className="text-sm text-gray-700">Require lowercase letter</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.passwordRequireNumber}
                    onChange={(e) => setFormData({ ...formData, passwordRequireNumber: e.target.checked })}
                    className="w-5 h-5 text-[#5C2482] border-gray-300 rounded focus:ring-[#5C2482]"
                  />
                  <span className="text-sm text-gray-700">Require number</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.passwordRequireSpecial}
                    onChange={(e) => setFormData({ ...formData, passwordRequireSpecial: e.target.checked })}
                    className="w-5 h-5 text-[#5C2482] border-gray-300 rounded focus:ring-[#5C2482]"
                  />
                  <span className="text-sm text-gray-700">Require special character</span>
                </label>
              </div>
            </div>
          </div>

          {/* Storage Settings */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Storage Settings</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Upload Size (MB)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={formData.maxUploadSizeMB}
                onChange={(e) => setFormData({ ...formData, maxUploadSizeMB: parseInt(e.target.value) || 10 })}
                className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent text-gray-900 bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum file size allowed for uploads (1-100 MB)</p>
            </div>
          </div>

          {/* Enrollment Limits */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Enrollment Limits</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Enrollments Per Student
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={formData.maxEnrollmentsPerStudent || ''}
                onChange={(e) => setFormData({ ...formData, maxEnrollmentsPerStudent: parseInt(e.target.value) || 0 })}
                className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent text-gray-900 bg-white"
                placeholder="Leave empty for unlimited"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of active courses a student can enroll in simultaneously. Leave empty or 0 for unlimited.
              </p>
            </div>
          </div>

          {/* Feature Flags */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Feature Toggles</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enable or disable platform features. Disabled features will be hidden from all users.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.enableCaseRooms}
                  onChange={(e) => setFormData({ ...formData, enableCaseRooms: e.target.checked })}
                  className="w-5 h-5 text-[#5C2482] border-gray-300 rounded focus:ring-[#5C2482]"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Case Rooms</span>
                  <p className="text-xs text-gray-500">Collaborative discussion spaces</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.enableExams}
                  onChange={(e) => setFormData({ ...formData, enableExams: e.target.checked })}
                  className="w-5 h-5 text-[#5C2482] border-gray-300 rounded focus:ring-[#5C2482]"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Exams</span>
                  <p className="text-xs text-gray-500">Online examinations and quizzes</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.enableCertificates}
                  onChange={(e) => setFormData({ ...formData, enableCertificates: e.target.checked })}
                  className="w-5 h-5 text-[#5C2482] border-gray-300 rounded focus:ring-[#5C2482]"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Certificates</span>
                  <p className="text-xs text-gray-500">Course completion certificates</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.enablePayments}
                  onChange={(e) => setFormData({ ...formData, enablePayments: e.target.checked })}
                  className="w-5 h-5 text-[#5C2482] border-gray-300 rounded focus:ring-[#5C2482]"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Payments</span>
                  <p className="text-xs text-gray-500">Payment tracking and records</p>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#5C2482] text-white rounded-xl hover:bg-[#7B3FA3] disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
