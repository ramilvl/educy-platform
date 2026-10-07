'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/dashboard-layout'
import { ResponsiveTableWithHint } from '@/components/responsive-table'
import Link from 'next/link'

type User = {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'MODERATOR' | 'INSTRUCTOR' | 'STUDENT'
  createdAt: string
  lastLogin: string | null
  _count: {
    enrollments: number
    instructorSections: number
    createdCourses: number
  }
}

export default function UsersManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newRole, setNewRole] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated or not admin
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

  // Fetch users
  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers()
    }
  }, [session])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      const data = await response.json()

      if (data.success) {
        setUsers(data.users)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleEditRole = (user: User) => {
    setEditingUser(user)
    setNewRole(user.role)
    setError(null)
  }

  const handleSaveRole = async () => {
    if (!editingUser || !newRole) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchUsers()
        setEditingUser(null)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to update user role')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete user "${user.name}" (${user.email})?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        await fetchUsers()
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('Failed to delete user')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      case 'MODERATOR':
        return 'bg-purple-100 text-purple-800'
      case 'INSTRUCTOR':
        return 'bg-blue-100 text-blue-800'
      case 'STUDENT':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role={session?.user?.role || 'ADMIN'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#5C2482]">
              User Management
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
              Manage user accounts and roles
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Link
              href="/admin/users/import"
              className="px-4 py-2 sm:px-6 sm:py-3 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c] transition shadow-lg font-medium text-center text-sm sm:text-base"
            >
              📊 Bulk Import
            </Link>
            <Link
              href="/admin/users/create"
              className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-lg font-medium text-center text-sm sm:text-base"
            >
              + Create User
            </Link>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <ResponsiveTableWithHint>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity
                    </th>
                    <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-4 py-2 sm:px-6 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-[#5C2482]">
                            {user.name}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-600">
                          {user.role === 'STUDENT' && (
                            <span>{user._count.enrollments} enrollments</span>
                          )}
                          {user.role === 'INSTRUCTOR' && (
                            <span>
                              {user._count.instructorSections} sections,{' '}
                              {user._count.createdCourses} courses
                            </span>
                          )}
                          {(user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                            <span>Admin user</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium space-x-2">
                        {user.id !== session?.user?.id && (
                          <>
                            <button
                              onClick={() => handleEditRole(user)}
                              className="text-[#5C2482] hover:text-blue-900"
                            >
                              Edit Role
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {user.id === session?.user?.id && (
                          <span className="text-gray-400 text-xs">(You)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTableWithHint>
          )}
        </div>
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-[#5C2482] mb-4">
              Change User Role
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-600 mb-2">
                User: <strong>{editingUser.name}</strong> ({editingUser.email})
              </p>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Current role: <strong>{editingUser.role}</strong>
              </p>

              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                New Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="STUDENT" className="text-gray-900 bg-white">Student</option>
                <option value="INSTRUCTOR" className="text-gray-900 bg-white">Instructor</option>
                <option value="MODERATOR" className="text-gray-900 bg-white">Moderator</option>
                <option value="ADMIN" className="text-gray-900 bg-white">Admin</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null)
                  setError(null)
                }}
                disabled={submitting}
                className="flex-1 px-3 py-2 sm:px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                disabled={submitting || newRole === editingUser.role}
                className="flex-1 px-3 py-2 sm:px-4 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c] disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
