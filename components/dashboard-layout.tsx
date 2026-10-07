'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode, useState } from 'react'
import { RoleName } from '@prisma/client'

interface DashboardLayoutProps {
  children: ReactNode
  role: RoleName
}

// Icon components
const icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  rooms: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  auditLogs: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  courses: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  assignments: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  schedule: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  enrollments: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  certificates: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  content: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  exams: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  caseRooms: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  ),
  payments: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  profile: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
}

const navigationByRole: Record<
  RoleName,
  Array<{
    name: string
    href: string
    icon: ReactNode
  }>
> = {
  ADMIN: [
    { name: 'Dashboard', href: '/admin', icon: icons.dashboard },
    { name: 'Users', href: '/admin/users', icon: icons.users },
    { name: 'Courses', href: '/admin/courses', icon: icons.courses },
    { name: 'Rooms', href: '/admin/rooms', icon: icons.rooms },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: icons.auditLogs },
    { name: 'Analytics', href: '/admin/analytics', icon: icons.dashboard },
    { name: 'Settings', href: '/admin/settings', icon: icons.settings },
    { name: 'Profile', href: '/profile', icon: icons.profile },
  ],
  INSTRUCTOR: [
    { name: 'Dashboard', href: '/instructor', icon: icons.dashboard },
    { name: 'Courses', href: '/instructor/courses', icon: icons.courses },
    { name: 'Assignments', href: '/instructor/assignments', icon: icons.assignments },
    { name: 'Exams', href: '/instructor/exams', icon: icons.exams },
    { name: 'Case Rooms', href: '/instructor/case-rooms', icon: icons.caseRooms },
    { name: 'Payments', href: '/instructor/payments', icon: icons.payments },
    { name: 'Content', href: '/instructor/content', icon: icons.content },
    { name: 'Schedule', href: '/instructor/schedule', icon: icons.schedule },
    { name: 'Certificates', href: '/instructor/certificates', icon: icons.certificates },
    { name: 'Profile', href: '/profile', icon: icons.profile },
  ],
  MODERATOR: [
    { name: 'Dashboard', href: '/moderator', icon: icons.dashboard },
    { name: 'Enrollments', href: '/moderator/enrollments', icon: icons.enrollments },
    { name: 'Courses', href: '/moderator/courses', icon: icons.courses },
    { name: 'Schedule', href: '/moderator/schedule', icon: icons.schedule },
    { name: 'Attendance', href: '/moderator/attendance', icon: icons.users },
    { name: 'Profile', href: '/profile', icon: icons.profile },
  ],
  STUDENT: [
    { name: 'Dashboard', href: '/student/dashboard', icon: icons.dashboard },
    { name: 'Courses', href: '/student/courses', icon: icons.courses },
    { name: 'Timetable', href: '/student/timetable', icon: icons.schedule },
    { name: 'Assignments', href: '/student/assignments', icon: icons.assignments },
    { name: 'Exams', href: '/student/exams', icon: icons.exams },
    { name: 'Case Rooms', href: '/student/case-rooms', icon: icons.caseRooms },
    { name: 'Certificates', href: '/student/certificates', icon: icons.certificates },
    { name: 'Profile', href: '/profile', icon: icons.profile },
  ],
}

function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const navigation = navigationByRole[role]
  const { data: session } = useSession()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false) // Mobile sidebar state

  // Initialize collapsed state from localStorage
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })

  // Toggle collapsed state and save to localStorage
  const toggleCollapsed = () => {
    const newState = !collapsed
    setCollapsed(newState)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', String(newState))
    }
  }

  // Prevent body scroll when mobile sidebar is open
  if (typeof window !== 'undefined') {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed and Persistent */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-gradient-to-b from-[#5C2482] to-[#7B3FA3] shadow-2xl transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-purple-400/30">
            {!collapsed ? (
              <Link
                href="/dashboard"
                className="text-2xl font-bold text-white"
              >
                Educy
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="text-2xl font-bold text-white mx-auto"
              >
                E
              </Link>
            )}
            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:bg-white/10 rounded-lg p-2"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Info */}
          <div className={`px-4 py-4 border-b border-purple-400/30 ${collapsed ? 'lg:px-2' : ''}`}>
            {/* Mobile & Expanded Desktop: Show full user info */}
            <div className={collapsed ? 'lg:hidden' : ''}>
              <div className="flex items-center space-x-3">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'Profile'}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                    {session?.user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {session?.user?.name} {session?.user?.surname}
                  </p>
                  <p className="text-xs text-purple-200 truncate">
                    {session?.user?.email}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#F95B0E] text-white">
                  {session?.user?.role}
                </span>
              </div>
            </div>
            {/* Collapsed Desktop: Show only avatar */}
            {collapsed && (
              <div className="hidden lg:flex justify-center">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'Profile'}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                    title={`${session?.user?.name} ${session?.user?.surname || ''} (${session?.user?.role})`}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold" title={`${session?.user?.name} ${session?.user?.surname || ''} (${session?.user?.role})`}>
                    {session?.user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2 px-3 sidebar-scrollbar">
            <div className="space-y-0.5">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center ${
                      collapsed ? 'lg:justify-center lg:px-0' : 'px-3'
                    } py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-white text-[#5C2482] shadow-lg'
                        : 'text-purple-100 hover:bg-white/10 hover:text-white'
                    }`}
                    title={collapsed ? item.name : ''}
                  >
                    <span className={isActive ? 'text-[#5C2482]' : ''}>{item.icon}</span>
                    {!collapsed && <span className="ml-3">{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-purple-400/30">
            {/* Mobile: Sign out only */}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="lg:hidden w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium text-purple-100 hover:bg-white/10 hover:text-white transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>

            {/* Desktop: Sign out + Collapse toggle */}
            <div className={`hidden lg:flex ${collapsed ? 'flex-col gap-2' : 'items-center justify-between gap-2'}`}>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className={`flex items-center ${collapsed ? 'justify-center w-full' : 'justify-center'} p-2 rounded-lg text-sm font-medium text-purple-100 hover:bg-white/10 hover:text-white transition-colors duration-200`}
                title="Sign Out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {!collapsed && <span className="ml-2">Sign Out</span>}
              </button>

              <button
                onClick={toggleCollapsed}
                className={`flex items-center ${collapsed ? 'justify-center w-full' : 'justify-center'} p-2 rounded-lg text-purple-100 hover:bg-white/10 hover:text-white transition-colors duration-200`}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg
                  className={`w-5 h-5 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Mobile Top Bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/dashboard" className="text-xl font-bold text-[#5C2482]">
            Educy
          </Link>
          <div className="w-10" /> {/* Spacer for balance */}
        </div>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
