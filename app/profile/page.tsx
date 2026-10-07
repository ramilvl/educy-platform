'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'
import { FormField } from '@/components/form-field'
import { useFormValidation } from '@/hooks/use-form-validation'

interface UserProfile {
  id: string
  email: string
  name: string
  surname: string | null
  phone: string | null
  expertise: string[]
  role: string
  status: string
  profileAvatarUrl: string | null
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const { fieldErrors, generalError, setGeneralError, handleHttpError, clearAllErrors } = useFormValidation()

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    expertise: [] as string[],
    profileAvatarUrl: '',
  })

  const [newExpertise, setNewExpertise] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [nameError, setNameError] = useState('')
  const [surnameError, setSurnameError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  // Validate name/surname: only letters and spaces
  const validateName = (value: string): boolean => {
    // Allow letters (A-Z, a-z, including accented characters), spaces, hyphens, and apostrophes
    // This regex is ES5 compatible and covers most Latin-based alphabets
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿğəıöüçşĞƏİÖÜÇŞ\s'-]+$/
    return nameRegex.test(value)
  }

  // Validate phone: only numbers, +, -, and spaces
  const validatePhone = (value: string): boolean => {
    // Allow numbers, +, -, and spaces
    const phoneRegex = /^[0-9+\-\s]+$/
    return phoneRegex.test(value)
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      const data = await response.json()

      if (data.success) {
        setProfile(data.user)
        setFormData({
          name: data.user.name || '',
          surname: data.user.surname || '',
          phone: data.user.phone || '',
          expertise: data.user.expertise || [],
          profileAvatarUrl: data.user.profileAvatarUrl || '',
        })
        if (data.user.profileAvatarUrl) {
          setAvatarPreview(data.user.profileAvatarUrl)
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' })
      return
    }

    setAvatarFile(file)
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    clearAllErrors()
    setNameError('')
    setSurnameError('')
    setPhoneError('')

    // Validate name
    const trimmedName = formData.name.trim()
    if (!trimmedName) {
      setNameError('Name is required')
      setSaving(false)
      return
    }
    if (!validateName(trimmedName)) {
      setNameError('Name can only contain letters, spaces, hyphens, and apostrophes')
      setSaving(false)
      return
    }

    // Validate surname if provided
    const trimmedSurname = formData.surname.trim()
    if (trimmedSurname && !validateName(trimmedSurname)) {
      setSurnameError('Surname can only contain letters, spaces, hyphens, and apostrophes')
      setSaving(false)
      return
    }

    // Validate phone if provided
    const trimmedPhone = formData.phone.trim()
    if (trimmedPhone) {
      if (!validatePhone(trimmedPhone)) {
        setPhoneError('Phone number can only contain numbers, +, -, and spaces')
        setSaving(false)
        return
      }
      if (trimmedPhone.length > 20) {
        setPhoneError('Phone number must be 20 characters or less')
        setSaving(false)
        return
      }
    }

    try {
      let avatarUrl = formData.profileAvatarUrl

      // Upload avatar if selected
      if (avatarFile) {
        setUploading(true)
        try {
          // Get signed upload URL
          const urlResponse = await fetch('/api/files/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: avatarFile.name,
              contentType: avatarFile.type,
              sizeBytes: avatarFile.size,
              context: 'profile',
            }),
          })

          const urlData = await urlResponse.json()
          if (!urlResponse.ok) throw new Error(urlData.error || 'Failed to get upload URL')

          // Upload to R2
          const uploadResponse = await fetch(urlData.uploadUrl, {
            method: 'PUT',
            body: avatarFile,
            headers: {
              'Content-Type': avatarFile.type,
            },
          })

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload profile picture to storage')
          }

          // Confirm upload
          const confirmResponse = await fetch(`/api/files/${urlData.fileId}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })

          if (!confirmResponse.ok) {
            throw new Error('Failed to confirm file upload')
          }

          // Use public URL from upload response
          avatarUrl = urlData.publicUrl
        } catch (err) {
          console.error('Avatar upload error:', err)
          throw new Error('Failed to upload profile picture')
        } finally {
          setUploading(false)
        }
      }

      // Build update payload - only include expertise for instructors/moderators/admins
      const updatePayload: any = {
        name: trimmedName,
        surname: trimmedSurname,
        phone: trimmedPhone,
        profileAvatarUrl: avatarUrl,
      }

      // Only include expertise for authorized roles
      if (isInstructorRole) {
        updatePayload.expertise = formData.expertise
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle HTTP errors with field-level error parsing
        const handled = handleHttpError(response, data)
        if (!handled) {
          setMessage({ type: 'error', text: data.error || 'Failed to update profile' })
        }
        setSaving(false)
        return
      }

      if (data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        setProfile(data.user)
        setFormData({
          name: data.user.name || '',
          surname: data.user.surname || '',
          phone: data.user.phone || '',
          expertise: data.user.expertise || [],
          profileAvatarUrl: data.user.profileAvatarUrl || '',
        })
        setAvatarFile(null)
        // Update session to reflect new profile data
        await updateSession({
          name: data.user.name,
          surname: data.user.surname,
          image: data.user.profileAvatarUrl,
        })
        // Force a fresh fetch of profile data
        await fetchProfile()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' })
      }
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setMessage({ type: 'error', text: 'Network error. Please check your internet connection and try again.' })
      } else {
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update profile' })
      }
      setSaving(false)
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  const handleAddExpertise = () => {
    if (newExpertise.trim() && !formData.expertise.includes(newExpertise.trim())) {
      setFormData({
        ...formData,
        expertise: [...formData.expertise, newExpertise.trim()],
      })
      setNewExpertise('')
    }
  }

  const handleRemoveExpertise = (keyword: string) => {
    setFormData({
      ...formData,
      expertise: formData.expertise.filter(k => k !== keyword),
    })
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session?.user) {
    redirect('/auth/signin')
  }

  const isInstructorRole = ['INSTRUCTOR', 'MODERATOR', 'ADMIN'].includes(profile?.role || '')

  return (
    <DashboardLayout role={session.user.role}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#5C2482]">Profile Settings</h1>
          <p className="mt-2 text-gray-600">Manage your personal information</p>
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

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-6">
          {/* Profile Picture */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Picture</h2>
            <div className="flex items-center gap-6">
              {/* Avatar Preview */}
              <div className="flex-shrink-0">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-[#5C2482]"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[#5C2482] flex items-center justify-center text-white text-3xl font-bold">
                    {formData.name ? formData.name[0].toUpperCase() : '?'}
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload New Picture
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent text-gray-900 bg-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: Square image, max 5MB (JPG, PNG, GIF)
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    setNameError('')
                  }}
                  onBlur={() => {
                    const trimmed = formData.name.trim()
                    if (trimmed && !validateName(trimmed)) {
                      setNameError('Name can only contain letters, spaces, hyphens, and apostrophes')
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-gray-900 bg-white ${
                    nameError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-[#5C2482]'
                  }`}
                />
                {nameError && (
                  <p className="text-xs sm:text-sm text-red-600 mt-1">{nameError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surname
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={formData.surname}
                  onChange={(e) => {
                    setFormData({ ...formData, surname: e.target.value })
                    setSurnameError('')
                  }}
                  onBlur={() => {
                    const trimmed = formData.surname.trim()
                    if (trimmed && !validateName(trimmed)) {
                      setSurnameError('Surname can only contain letters, spaces, hyphens, and apostrophes')
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-gray-900 bg-white ${
                    surnameError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-[#5C2482]'
                  }`}
                />
                {surnameError && (
                  <p className="text-xs sm:text-sm text-red-600 mt-1">{surnameError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  maxLength={20}
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value })
                    setPhoneError('')
                  }}
                  onBlur={() => {
                    const trimmed = formData.phone.trim()
                    if (trimmed && !validatePhone(trimmed)) {
                      setPhoneError('Phone number can only contain numbers, +, -, and spaces')
                    } else if (trimmed && trimmed.length > 20) {
                      setPhoneError('Phone number must be 20 characters or less')
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-gray-900 bg-white placeholder:text-gray-400 ${
                    phoneError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-[#5C2482]'
                  }`}
                  placeholder="+1234567890"
                />
                {phoneError && (
                  <p className="text-xs sm:text-sm text-red-600 mt-1">{phoneError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Only numbers, +, -, and spaces allowed (max 20 characters)</p>
              </div>
            </div>
          </div>

          {/* Expertise (for instructors, moderators, admins) */}
          {isInstructorRole && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Subject Expertise
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Add keywords about your subject expertise. This helps students and administrators find instructors by topic.
              </p>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newExpertise}
                    onChange={(e) => setNewExpertise(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddExpertise()
                      }
                    }}
                    placeholder="e.g., Mathematics, Physics, Computer Science"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C2482] focus:border-transparent text-gray-900 bg-white placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddExpertise}
                    className="px-4 py-2 bg-[#5C2482] text-white rounded-lg hover:bg-[#7B3FA3] transition"
                  >
                    Add
                  </button>
                </div>

                {formData.expertise.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.expertise.map((keyword) => (
                      <span
                        key={keyword}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => handleRemoveExpertise(keyword)}
                          className="hover:text-purple-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Account Information (read-only) */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <input
                  type="text"
                  disabled
                  value={profile?.role || ''}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Status
                </label>
                <input
                  type="text"
                  disabled
                  value={profile?.status || ''}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-6 py-3 bg-[#5C2482] text-white rounded-lg hover:bg-[#7B3FA3] disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
            >
              {uploading ? 'Uploading Picture...' : saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
