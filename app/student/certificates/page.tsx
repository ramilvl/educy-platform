'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'
import Link from 'next/link'
import { format } from 'date-fns'
import ScrollToTop from '@/components/scroll-to-top'

interface Certificate {
  id: string
  certificateNumber: string
  completionDate: string
  issuedAt: string
  section: {
    term: string
    course: {
      code: string
      title: string
      description: string | null
    }
    instructor: {
      name: string
      email: string
    }
  }
  issuedBy: {
    name: string
    email: string
  } | null
}

export default function StudentCertificatesPage() {
  const { data: session, status } = useSession()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCertificates()
    }
  }, [status])

  const fetchCertificates = async () => {
    try {
      const response = await fetch('/api/student/certificates')
      const data = await response.json()

      if (data.success) {
        setCertificates(data.certificates || [])
      }
    } catch (error) {
      console.error('Failed to fetch certificates:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyVerificationLink = (certificateNumber: string) => {
    const verificationUrl = `${window.location.origin}/verify/${certificateNumber}`
    navigator.clipboard.writeText(verificationUrl)
    alert('Verification link copied to clipboard!')
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

  return (
    <DashboardLayout role={session.user.role}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#5C2482]">
            My Certificates
          </h1>
          <p className="mt-2 text-gray-600">
            View and share your course completion certificates
          </p>
        </div>

        {certificates.length === 0 ? (
          <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">🎓</div>
            <p className="text-gray-500 text-lg">
              You haven't earned any certificates yet.
            </p>
            <p className="text-gray-400 text-xs sm:text-sm mt-2">
              Complete your enrolled courses to receive certificates
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {certificates.map((certificate) => (
              <div
                key={certificate.id}
                className="bg-white rounded-xl shadow border border-gray-200 hover:shadow-xl transition overflow-hidden"
              >
                {/* Certificate Header - Purple gradient */}
                <div className="bg-gradient-to-r from-[#5C2482] to-[#7B3FA3] px-6 py-8 text-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-4xl">🎓</span>
                        <h2 className="text-2xl font-bold">
                          Certificate of Completion
                        </h2>
                      </div>
                      <p className="text-purple-100 text-xs sm:text-sm">
                        This certifies that <strong>{session.user.name}</strong> has successfully completed
                      </p>
                    </div>
                  </div>
                </div>

                {/* Certificate Body */}
                <div className="p-6">
                  <div className="border-l-4 border-[#5C2482] pl-4 mb-6">
                    <h3 className="text-2xl font-bold text-[#5C2482] mb-1">
                      {certificate.section.course.code}
                    </h3>
                    <p className="text-xl text-gray-700">
                      {certificate.section.course.title}
                    </p>
                    {certificate.section.course.description && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-2">
                        {certificate.section.course.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Completion Date
                      </p>
                      <p className="text-xs sm:text-sm text-gray-700">
                        {format(new Date(certificate.completionDate), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Issued Date
                      </p>
                      <p className="text-xs sm:text-sm text-gray-700">
                        {format(new Date(certificate.issuedAt), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Instructor
                      </p>
                      <p className="text-xs sm:text-sm text-gray-700">
                        {certificate.section.instructor.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Term
                      </p>
                      <p className="text-xs sm:text-sm text-gray-700">
                        {certificate.section.term}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Certificate ID
                        </p>
                        <p className="text-xs sm:text-sm font-mono text-gray-700">
                          {certificate.certificateNumber}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/verify/${certificate.certificateNumber}`}
                          target="_blank"
                          className="px-3 py-2 sm:px-4 bg-[#5C2482] text-white rounded-xl hover:bg-[#7B3FA3] transition text-xs sm:text-sm font-medium"
                        >
                          View Certificate
                        </Link>
                        <button
                          onClick={() => copyVerificationLink(certificate.certificateNumber)}
                          className="px-3 py-2 sm:px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-xs sm:text-sm font-medium"
                        >
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </DashboardLayout>
  )
}
