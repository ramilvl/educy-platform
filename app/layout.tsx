import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/providers/session-provider'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#5C2482',
}

export const metadata: Metadata = {
  title: {
    default: 'Educy - Course Management System',
    template: '%s | Educy',
  },
  description: 'Modern course management application for students, instructors, and administrators. Manage courses, assignments, schedules, and more.',
  keywords: ['education', 'course management', 'LMS', 'learning', 'assignments', 'timetable'],
  authors: [{ name: 'Educy' }],
  creator: 'Educy',
  publisher: 'Educy',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.svg', type: 'image/svg+xml' },
    ],
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Educy - Course Management System',
    description: 'Modern course management application for students, instructors, and administrators.',
    siteName: 'Educy',
  },
  twitter: {
    card: 'summary',
    title: 'Educy - Course Management System',
    description: 'Modern course management application for students, instructors, and administrators.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
