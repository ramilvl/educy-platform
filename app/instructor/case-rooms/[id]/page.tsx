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

export default function InstructorCaseRoomPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [room, setRoom] = useState<Room | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  const [reviewingPost, setReviewingPost] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

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

  async function handleApprove(postId: string, isApproved: boolean) {
    try {
      const response = await fetch(`/api/case-rooms/${params.id}/posts/${postId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isApproved,
          feedback: feedback || undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to process approval')

      setReviewingPost(null)
      setFeedback('')
      await loadPosts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process approval')
    }
  }

  async function toggleRoomStatus() {
    try {
      const response = await fetch(`/api/case-rooms/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !room?.isActive,
        }),
      })

      if (!response.ok) throw new Error('Failed to update room status')

      await loadRoom()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update room status')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout role={session?.user?.role || 'INSTRUCTOR'}>
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
      <DashboardLayout role={session?.user?.role || 'INSTRUCTOR'}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-red-600 mb-4">Case room not found</p>
            <button
              onClick={() => router.push('/instructor/case-rooms')}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg"
            >
              Back to Case Rooms
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const pendingPosts = posts.filter(p => p.isApproved === null)
  const approvedPosts = posts.filter(p => p.isApproved === true)
  const rejectedPosts = posts.filter(p => p.isApproved === false)

  const filteredPosts =
    filter === 'pending' ? pendingPosts :
    filter === 'approved' ? approvedPosts :
    filter === 'rejected' ? rejectedPosts :
    posts

  return (
    <DashboardLayout role={session?.user?.role || 'INSTRUCTOR'}>
      <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 -my-8 p-4 md:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center text-xs sm:text-sm text-gray-600 mb-2">
            <button onClick={() => router.push('/instructor/case-rooms')} className="hover:text-purple-600">
              Case Rooms
            </button>
            <span className="mx-2">/</span>
            <span>{room.title}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">{room.title}</h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">
                {room.section.course.code}: {room.section.course.title}
              </p>
            </div>
            <button
              onClick={toggleRoomStatus}
              className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold transition-colors ${
                room.isActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {room.isActive ? 'Close Room' : 'Reopen Room'}
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Posts</p>
            <p className="text-3xl font-bold text-gray-900">{posts.length}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 p-6 cursor-pointer" onClick={() => setFilter('pending')}>
            <p className="text-xs sm:text-sm text-yellow-700 mb-1">Pending Review</p>
            <p className="text-3xl font-bold text-yellow-700">{pendingPosts.length}</p>
          </div>
          <div className="bg-green-50 rounded-xl shadow-sm border border-green-200 p-6 cursor-pointer" onClick={() => setFilter('approved')}>
            <p className="text-xs sm:text-sm text-green-700 mb-1">Approved</p>
            <p className="text-3xl font-bold text-green-700">{approvedPosts.length}</p>
          </div>
          <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6 cursor-pointer" onClick={() => setFilter('rejected')}>
            <p className="text-xs sm:text-sm text-red-700 mb-1">Rejected</p>
            <p className="text-3xl font-bold text-red-700">{rejectedPosts.length}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Posts */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-gray-500">No posts in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className={`rounded-xl shadow-sm border-2 p-6 ${
                  post.isApproved === null ? 'bg-yellow-50 border-yellow-300' :
                  post.isApproved ? 'bg-green-50 border-green-300' :
                  'bg-red-50 border-red-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{post.student.name}</p>
                    <p className="text-xs text-gray-600">{post.student.email}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(post.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    post.isApproved === null ? 'bg-yellow-100 text-yellow-800' :
                    post.isApproved ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {post.isApproved === null ? 'PENDING' :
                     post.isApproved ? 'APPROVED' : 'REJECTED'}
                  </span>
                </div>

                <p className="text-gray-900 text-xs sm:text-sm whitespace-pre-wrap mb-4">{post.content}</p>

                {post.feedback && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-gray-700 mb-1">Your Feedback:</p>
                    <p className="text-xs text-gray-900">{post.feedback}</p>
                  </div>
                )}

                {reviewingPost === post.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={3}
                      placeholder="Optional feedback..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(post.id, true)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-bold py-2 px-4 rounded-lg transition-colors"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleApprove(post.id, false)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold py-2 px-4 rounded-lg transition-colors"
                      >
                        ✗ Reject
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setReviewingPost(null)
                        setFeedback('')
                      }}
                      className="w-full text-gray-600 hover:text-gray-800 text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : post.isApproved === null ? (
                  <button
                    onClick={() => setReviewingPost(post.id)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Review
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  )
}
