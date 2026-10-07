'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'
import { format } from 'date-fns'

interface Enrollment {
  id: string
  user: {
    id: string
    name: string
    email: string
  }
  enrolledAt: string
  certificate: {
    id: string
    certificateNumber: string
    issuedAt: string
  } | null
}

interface Section {
  id: string
  term: string
  course: {
    code: string
    title: string
  }
  _count: {
    enrollments: number
  }
  enrollments: Enrollment[]
}

export default function InstructorCertificatesPage() {
  const { data: session, status } = useSession()
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [issuing, setIssuing] = useState<string | null>(null)
  const [issueDialog, setIssueDialog] = useState<{ isOpen: boolean; enrollment: Enrollment; section: Section } | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSections()
    }
  }, [status])

  // Auto-clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/instructor/sections?includeCertificates=true')
      const data = await response.json()

      if (data.success) {
        setSections(data.sections || [])
      }
    } catch (error) {
      console.error('Failed to fetch sections:', error)
    } finally {
      setLoading(false)
    }
  }

  const openIssueDialog = (enrollment: Enrollment, section: Section) => {
    setIssueDialog({ isOpen: true, enrollment, section })
  }

  const closeIssueDialog = () => {
    setIssueDialog(null)
  }

  const confirmIssueCertificate = async () => {
    if (!issueDialog) return

    const enrollmentId = issueDialog.enrollment.id
    setIssuing(enrollmentId)
    setMessage(null)
    closeIssueDialog()

    try {
      const response = await fetch('/api/certificates/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enrollmentId }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({
          type: 'success',
          text: 'Certificate issued successfully! The student will receive an email notification.'
        })
        fetchSections() // Refresh the list
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to issue certificate'
        })
      }
    } catch (error) {
      console.error('Error issuing certificate:', error)
      setMessage({
        type: 'error',
        text: 'Network error. Please check your connection and try again.'
      })
    } finally {
      setIssuing(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout role={session?.user?.role || 'INSTRUCTOR'}>
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
            Issue Certificates
          </h1>
          <p className="mt-2 text-gray-600">
            Manage and issue certificates to students who have completed your courses
          </p>
        </div>

        {/* Toast Message */}
        {message && (
          <div
            className={`fixed top-4 right-4 z-50 max-w-md rounded-xl shadow-2xl border-2 p-4 animate-in slide-in-from-top-5 ${
              message.type === 'success'
                ? 'bg-green-50 border-green-500 text-green-900'
                : 'bg-red-50 border-red-500 text-red-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {message.type === 'success' ? (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{message.text}</p>
              </div>
              <button
                onClick={() => setMessage(null)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {sections.length === 0 ? (
          <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-gray-500">
              You don't have any sections yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <div
                key={section.id}
                className="bg-white rounded-xl shadow border border-gray-200"
              >
                {/* Section Header */}
                <div className="bg-gradient-to-r from-[#5C2482] to-[#7B3FA3] px-6 py-4 text-white rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">
                        {section.course.code} - {section.course.title}
                      </h3>
                      <p className="text-purple-100 text-xs sm:text-sm mt-1">
                        {section.term} • {section._count.enrollments} students
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enrolled Students */}
                <div className="overflow-x-auto">
                  {section.enrollments.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      No enrolled students
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Enrolled
                          </th>
                          <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Certificate Status
                          </th>
                          <th className="px-4 py-2 sm:px-6 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {section.enrollments.map((enrollment) => (
                          <tr key={enrollment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-xs sm:text-sm font-medium text-[#5C2482]">
                                  {enrollment.user.name}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-500">
                                  {enrollment.user.email}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                              {format(new Date(enrollment.enrolledAt), 'MMM d, yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {enrollment.certificate ? (
                                <div>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Issued
                                  </span>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {format(new Date(enrollment.certificate.issuedAt), 'MMM d, yyyy')}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Not Issued
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                              {enrollment.certificate ? (
                                <a
                                  href={`/verify/${enrollment.certificate.certificateNumber}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#5C2482] hover:underline"
                                >
                                  View Certificate
                                </a>
                              ) : (
                                <button
                                  onClick={() => openIssueDialog(enrollment, section)}
                                  disabled={issuing === enrollment.id}
                                  className="px-3 py-1.5 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c] disabled:opacity-50 disabled:cursor-not-allowed transition text-xs font-medium"
                                >
                                  {issuing === enrollment.id ? 'Issuing...' : 'Issue Certificate'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Issue Certificate Confirmation Dialog */}
        {issueDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5C2482] to-[#7B3FA3] flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-[#5C2482]">
                    Issue Certificate
                  </h3>
                </div>
                <p className="text-gray-600">
                  You are about to issue a completion certificate for:
                </p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-5 mb-6 border border-purple-200">
                <div className="mb-4 pb-4 border-b border-purple-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#5C2482] flex items-center justify-center text-white font-bold text-lg">
                      {issueDialog.enrollment.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">
                        {issueDialog.enrollment.user.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {issueDialog.enrollment.user.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-700">
                    <svg className="w-4 h-4 mr-2 text-[#5C2482]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="font-medium">Course:</span>
                    <span className="ml-2">{issueDialog.section.course.code} - {issueDialog.section.course.title}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <svg className="w-4 h-4 mr-2 text-[#5C2482]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Term:</span>
                    <span className="ml-2">{issueDialog.section.term}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <svg className="w-4 h-4 mr-2 text-[#5C2482]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Enrolled:</span>
                    <span className="ml-2">{format(new Date(issueDialog.enrollment.enrolledAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-green-900">
                    <p className="font-medium mb-1">Certificate Will Be Issued</p>
                    <p>The student will receive an email with their certificate and it will be available for verification on the public portal.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeIssueDialog}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmIssueCertificate}
                  disabled={issuing !== null}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#5C2482] to-[#7B3FA3] text-white rounded-xl hover:from-[#7B3FA3] hover:to-[#5C2482] disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-lg"
                >
                  {issuing ? 'Issuing...' : 'Issue Certificate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
