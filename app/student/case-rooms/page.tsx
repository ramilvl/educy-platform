'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import DashboardLayout from '@/components/dashboard-layout'
import ScrollToTop from '@/components/scroll-to-top'

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
  _count: {
    posts: number
  }
}

export default function StudentCaseRoomsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadRooms()
    }
  }, [status])

  async function loadRooms() {
    try {
      const response = await fetch('/api/case-rooms')
      if (!response.ok) throw new Error('Failed to load rooms')
      const data = await response.json()
      setRooms(data.rooms || [])
    } catch (err) {
      console.error('Failed to load rooms:', err)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const now = new Date()
  const activeRooms = rooms.filter((room) => room.isActive)
  const closedRooms = rooms.filter((room) => !room.isActive)

  return (
    <DashboardLayout role={session?.user?.role || 'STUDENT'}>
      <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 -my-8 p-4 md:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
        <div className="mb-8 mt-[15px]">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Case Rooms</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">Share your case submissions and get feedback</p>
        </div>

        {/* Active Rooms */}
        {activeRooms.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-purple-800 mb-4">Active Rooms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRooms.map((room) => {
                const dueDate = room.dueDate ? new Date(room.dueDate) : null
                const isOverdue = dueDate && dueDate < now
                const isDueSoon = dueDate && !isOverdue && (dueDate.getTime() - now.getTime()) < 86400000 * 2

                return (
                  <Link
                    key={room.id}
                    href={`/student/case-rooms/${room.id}`}
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 flex-1">{room.title}</h3>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ml-2">
                        OPEN
                      </span>
                    </div>

                    {room.description && (
                      <p className="text-xs sm:text-sm text-gray-600 mb-4 line-clamp-2">{room.description}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        {room.section.course.code}: {room.section.course.title}
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        {room._count.posts} {room._count.posts === 1 ? 'post' : 'posts'}
                      </div>
                    </div>

                    {dueDate && (
                      <div className={`flex items-center text-xs sm:text-sm font-medium ${
                        isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-gray-600'
                      }`}>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {isOverdue ? 'Overdue: ' : 'Due: '}{dueDate.toLocaleDateString()}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Closed Rooms */}
        {closedRooms.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Closed Rooms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {closedRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/student/case-rooms/${room.id}`}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex-1">{room.title}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700 ml-2">
                      CLOSED
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {room.section.course.code}
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      {room._count.posts} {room._count.posts === 1 ? 'post' : 'posts'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {rooms.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-20 h-20 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No case rooms available</h3>
            <p className="text-gray-600">Your instructor hasn't created any case rooms yet</p>
          </div>
        )}
        </div>
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </DashboardLayout>
  )
}
