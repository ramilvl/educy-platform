'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/dashboard-layout'

interface Post {
  id: string
  content: string
  fileKeys: string[]
  isApproved: boolean | null
  feedback: string | null
  createdAt: string
  student: {
    id: string
    name: string
    email: string
  }
  approvedBy: {
    id: string
    name: string
  } | null
  approvedAt: string | null
}

interface Room {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  isActive: boolean
  section: {
    course: {
      code: string
      title: string
    }
  }
}

export default function CaseRoomPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [room, setRoom] = useState<Room | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newPost, setNewPost] = useState({
    content: '',
    fileKeys: [] as string[],
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadRoom()
      loadPosts()
    }
  }, [status, params.id])

  async function loadRoom() {
    try {
      const response = await fetch(`/api/case-rooms/${params.id}`)
      if (!response.ok) throw new Error('Failed to load room')
      const data = await response.json()
      setRoom(data.room)
    } catch (err) {
      setError('Failed to load room')
    } finally {
      setLoading(false)
    }
  }

  async function loadPosts() {
    try {
      const response = await fetch(`/api/case-rooms/${params.id}/posts`)
      if (!response.ok) throw new Error('Failed to load posts')
      const data = await response.json()
      setPosts(data.posts || [])
    } catch (err) {
      console.error('Failed to load posts:', err)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newPost.content.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/case-rooms/${params.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      })

      if (!response.ok) throw new Error('Failed to submit post')

      setNewPost({ content: '', fileKeys: [] })
      await loadPosts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit post')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading case room...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!room) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-red-600 mb-4">Case room not found</p>
            <button
              onClick={() => router.push('/student/case-rooms')}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg"
            >
              Back to Case Rooms
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const myPosts = posts.filter(p => p.student.id === session?.user?.id)
  const otherApprovedPosts = posts.filter(
    p => p.student.id !== session?.user?.id && p.isApproved === true
  )

  const dueDate = room.dueDate ? new Date(room.dueDate) : null
  const now = new Date()
  const isOverdue = dueDate && dueDate < now

  return (
    <DashboardLayout role={session?.user?.role || 'STUDENT'}>
      <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 -my-8 p-4 md:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center text-xs sm:text-sm text-gray-600 mb-2">
            <button onClick={() => router.push('/student/case-rooms')} className="hover:text-purple-600">
              Case Rooms
            </button>
            <span className="mx-2">/</span>
            <span>{room.title}</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">{room.title}</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">
            {room.section.course.code}: {room.section.course.title}
          </p>
          {room.description && (
            <p className="text-xs sm:text-sm md:text-base text-gray-700 mt-2">{room.description}</p>
          )}
        </div>

        {/* Status Banner */}
        <div className={`rounded-xl p-4 mb-6 ${
          !room.isActive ? 'bg-gray-50 border-2 border-gray-300' :
          isOverdue ? 'bg-red-50 border-2 border-red-300' :
          'bg-green-50 border-2 border-green-300'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-bold text-gray-900">
                {!room.isActive && '⚫ Closed'}
                {room.isActive && !isOverdue && '🟢 Open for Submissions'}
                {room.isActive && isOverdue && '🔴 Overdue'}
              </p>
              {dueDate && (
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Due: {dueDate.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Submission Form */}
        {room.isActive && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Submit Your Post</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Your Response *
                </label>
                <textarea
                  required
                  rows={6}
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Share your case analysis, thoughts, and insights..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>Note:</strong> Your post will be visible to others only after instructor approval.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !newPost.content.trim()}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Post'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* My Posts */}
        {myPosts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Submissions ({myPosts.length})</h2>
            <div className="space-y-4">
              {myPosts.map((post) => (
                <div
                  key={post.id}
                  className={`rounded-xl shadow-sm border-2 p-6 ${
                    post.isApproved === null ? 'bg-yellow-50 border-yellow-300' :
                    post.isApproved ? 'bg-green-50 border-green-300' :
                    'bg-red-50 border-red-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-xs text-gray-600">{new Date(post.createdAt).toLocaleString()}</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      post.isApproved === null ? 'bg-yellow-100 text-yellow-800' :
                      post.isApproved ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {post.isApproved === null ? '⏳ Pending Review' :
                       post.isApproved ? '✓ Approved' : '✗ Rejected'}
                    </span>
                  </div>

                  <p className="text-gray-900 whitespace-pre-wrap mb-4">{post.content}</p>

                  {post.feedback && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Instructor Feedback:</p>
                      <p className="text-xs sm:text-sm text-gray-900">{post.feedback}</p>
                      {post.approvedBy && (
                        <p className="text-xs text-gray-500 mt-2">
                          - {post.approvedBy.name} ({new Date(post.approvedAt!).toLocaleDateString()})
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Approved Posts (Padlet-style grid) */}
        {otherApprovedPosts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Approved Posts ({otherApprovedPosts.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherApprovedPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{post.student.name}</p>
                      <p className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Approved
                    </span>
                  </div>

                  <p className="text-gray-900 text-xs sm:text-sm whitespace-pre-wrap line-clamp-6">{post.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {posts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-gray-500">No posts yet. Be the first to submit!</p>
          </div>
        )}
      </div>
    </div>
    </DashboardLayout>
  )
}
