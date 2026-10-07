'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'

interface CertificateData {
  id: string
  certificateNumber: string
  studentName: string
  courseCode: string
  courseTitle: string
  courseDescription: string | null
  instructorName: string
  completionDate: string
  issuedAt: string
  issuedByName: string | null
  issuedByRole: string | null
}

export default function VerifyCertificatePage({ params }: { params: { certificateNumber: string } }) {
  const [certificate, setCertificate] = useState<CertificateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCertificate()
  }, [])

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false)
      }
    }

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showShareMenu])

  // Update meta tags for social sharing when certificate loads
  useEffect(() => {
    if (certificate) {
      const url = getVerificationUrl()
      const title = `Certificate of Achievement - ${certificate.courseTitle}`
      const description = `${certificate.studentName} has successfully completed ${certificate.courseCode}: ${certificate.courseTitle} at Educy`

      // Update document title
      document.title = title

      // Update or create meta tags
      const updateMetaTag = (property: string, content: string, isProperty = true) => {
        const attribute = isProperty ? 'property' : 'name'
        let element = document.querySelector(`meta[${attribute}="${property}"]`) as HTMLMetaElement
        if (!element) {
          element = document.createElement('meta')
          element.setAttribute(attribute, property)
          document.head.appendChild(element)
        }
        element.content = content
      }

      // Open Graph tags
      updateMetaTag('og:title', title)
      updateMetaTag('og:description', description)
      updateMetaTag('og:url', url)
      updateMetaTag('og:type', 'website')
      updateMetaTag('og:site_name', 'Educy')
      updateMetaTag('og:image', `${window.location.origin}/api/og-certificate?id=${certificate.certificateNumber}`)

      // Twitter Card tags
      updateMetaTag('twitter:card', 'summary_large_image', false)
      updateMetaTag('twitter:title', title, false)
      updateMetaTag('twitter:description', description, false)
      updateMetaTag('twitter:image', `${window.location.origin}/api/og-certificate?id=${certificate.certificateNumber}`, false)

      // Standard meta tags
      updateMetaTag('description', description, false)
    }
  }, [certificate])

  const fetchCertificate = async () => {
    try {
      const response = await fetch(`/api/certificates/verify/${params.certificateNumber}`)
      const data = await response.json()

      if (data.success) {
        setCertificate(data.certificate)
      } else {
        setError(data.error || 'Certificate not found')
      }
    } catch (err) {
      setError('Failed to verify certificate')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const getVerificationUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/verify/${params.certificateNumber}`
    }
    return `https://educy.vercel.app/verify/${params.certificateNumber}`
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getVerificationUrl())
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      alert('Failed to copy link')
    }
  }

  const handleShareLinkedIn = () => {
    const url = getVerificationUrl()
    const text = `I've successfully completed ${certificate?.courseTitle} (${certificate?.courseCode}) at Educy! View my certificate:`
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      '_blank',
      'width=600,height=600'
    )
  }

  const handleShareTwitter = () => {
    const url = getVerificationUrl()
    const text = `I've successfully completed ${certificate?.courseTitle} (${certificate?.courseCode}) at Educy! 🎓`
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank',
      'width=600,height=600'
    )
  }

  const handleShareFacebook = () => {
    const url = getVerificationUrl()
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank',
      'width=600,height=600'
    )
  }

  const handleShareEmail = () => {
    const url = getVerificationUrl()
    const subject = `My ${certificate?.courseTitle} Certificate from Educy`
    const body = `I've successfully completed ${certificate?.courseTitle} (${certificate?.courseCode}) at Educy!\n\nView my verified certificate: ${url}`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#5C2482]"></div>
          <p className="mt-4 text-gray-600">Verifying certificate...</p>
        </div>
      </div>
    )
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Certificate Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'The certificate you are looking for does not exist or has been revoked.'}
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 sm:px-6 sm:py-3 bg-[#5C2482] text-white rounded-xl hover:bg-[#7B3FA3] transition font-medium"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }

          html, body {
            width: 297mm;
            height: 210mm;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden;
          }

          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .certificate-container {
            width: 297mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            box-shadow: none !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
          }

          .certificate-container > div {
            padding: 15mm 20mm !important;
            height: 100% !important;
            box-sizing: border-box !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }

        @media screen {
          .certificate-container {
            min-height: 600px;
          }
        }

        /* Decorative line animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .certificate-container {
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white print:bg-white print:m-0 print:p-0">
        {/* Header - Hide on print */}
        <div className="no-print bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
            <div className="flex items-center justify-between flex-wrap gap-2 md:gap-0">
              <div className="flex items-center gap-2 md:gap-4">
                <Link href="/" className="text-xl md:text-2xl font-bold text-[#5C2482]">
                  Educy
                </Link>
                <span className="hidden sm:inline text-gray-300">|</span>
                <span className="hidden sm:inline text-xs sm:text-sm md:text-base text-gray-600">Certificate Verification</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                {/* Share Button with Dropdown */}
                <div className="relative" ref={shareMenuRef}>
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="px-3 md:px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium flex items-center gap-1 md:gap-2 text-xs sm:text-sm md:text-base"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span className="hidden sm:inline">Share</span>
                  </button>

                  {showShareMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                      <div className="p-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500 px-2 py-1">Share this certificate</p>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={handleShareLinkedIn}
                          className="w-full flex items-center gap-3 px-3 py-2 sm:px-4.5 hover:bg-blue-50 rounded-lg transition text-left"
                        >
                          <svg className="w-5 h-5 text-[#0077B5]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                          </svg>
                          <span className="text-xs sm:text-sm font-medium text-gray-700">Share on LinkedIn</span>
                        </button>
                        <button
                          onClick={handleShareTwitter}
                          className="w-full flex items-center gap-3 px-3 py-2 sm:px-4.5 hover:bg-blue-50 rounded-lg transition text-left"
                        >
                          <svg className="w-5 h-5 text-[#1DA1F2]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                          </svg>
                          <span className="text-xs sm:text-sm font-medium text-gray-700">Share on Twitter</span>
                        </button>
                        <button
                          onClick={handleShareFacebook}
                          className="w-full flex items-center gap-3 px-3 py-2 sm:px-4.5 hover:bg-blue-50 rounded-lg transition text-left"
                        >
                          <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          <span className="text-xs sm:text-sm font-medium text-gray-700">Share on Facebook</span>
                        </button>
                        <button
                          onClick={handleShareEmail}
                          className="w-full flex items-center gap-3 px-3 py-2 sm:px-4.5 hover:bg-gray-50 rounded-lg transition text-left"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs sm:text-sm font-medium text-gray-700">Share via Email</span>
                        </button>
                        <div className="border-t border-gray-100 my-2"></div>
                        <button
                          onClick={handleCopyLink}
                          className="w-full flex items-center gap-3 px-3 py-2 sm:px-4.5 hover:bg-gray-50 rounded-lg transition text-left"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs sm:text-sm font-medium text-gray-700">
                            {copySuccess ? '✓ Link Copied!' : 'Copy Link'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handlePrint}
                  className="px-3 md:px-6 py-2 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c] transition font-medium flex items-center gap-1 md:gap-2 text-xs sm:text-sm md:text-base"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span className="hidden sm:inline">Print / PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate - Landscape Layout */}
        <div className="py-8 px-4 print:p-0 print:m-0">
          <div className="max-w-[1400px] mx-auto">
            <div className="certificate-container bg-white shadow-2xl print:shadow-none relative overflow-hidden">
              {/* Elegant Border Frame with Pattern */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Ornate Corner Decorations */}
                <svg className="absolute top-0 left-0 w-24 h-24 text-[#5C2482]" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M0,0 L100,0 L100,15 L15,15 L15,100 L0,100 Z" opacity="0.12"/>
                  <circle cx="15" cy="15" r="10" opacity="0.2"/>
                  <circle cx="25" cy="25" r="4" opacity="0.15"/>
                  <path d="M0,20 Q20,20 20,0" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.2"/>
                </svg>
                <svg className="absolute top-0 right-0 w-24 h-24 text-[#F95B0E]" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M100,0 L0,0 L0,15 L85,15 L85,100 L100,100 Z" opacity="0.12"/>
                  <circle cx="85" cy="15" r="10" opacity="0.2"/>
                  <circle cx="75" cy="25" r="4" opacity="0.15"/>
                  <path d="M100,20 Q80,20 80,0" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.2"/>
                </svg>
                <svg className="absolute bottom-0 left-0 w-24 h-24 text-[#F95B0E]" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M0,100 L100,100 L100,85 L15,85 L15,0 L0,0 Z" opacity="0.12"/>
                  <circle cx="15" cy="85" r="10" opacity="0.2"/>
                  <circle cx="25" cy="75" r="4" opacity="0.15"/>
                  <path d="M0,80 Q20,80 20,100" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.2"/>
                </svg>
                <svg className="absolute bottom-0 right-0 w-24 h-24 text-[#5C2482]" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M100,100 L0,100 L0,85 L85,85 L85,0 L100,0 Z" opacity="0.12"/>
                  <circle cx="85" cy="85" r="10" opacity="0.2"/>
                  <circle cx="75" cy="75" r="4" opacity="0.15"/>
                  <path d="M100,80 Q80,80 80,100" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.2"/>
                </svg>

                {/* Triple Border with Gold Accent */}
                <div className="absolute inset-3 border-[4px] border-[#5C2482] rounded-sm opacity-15"></div>
                <div className="absolute inset-5 border-[2px] border-[#F95B0E] rounded-sm opacity-12"></div>
                <div className="absolute inset-7 border border-gray-300 rounded-sm opacity-20"></div>

                {/* Decorative Pattern Background */}
                <div className="absolute inset-0 opacity-[0.02]" style={{
                  backgroundImage: 'radial-gradient(circle, #5C2482 1px, transparent 1px)',
                  backgroundSize: '30px 30px'
                }}></div>
              </div>

              {/* Main Content - Landscape Layout */}
              <div className="relative px-20 py-10 print:px-16 print:py-8 flex flex-col justify-between print:h-full" style={{ minHeight: '210mm' }}>
                {/* Header */}
                <div className="text-center mb-6">
                  {/* Logo and Institution */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="text-5xl">🎓</div>
                    <div className="text-left">
                      <h2 className="text-3xl font-bold text-[#5C2482] tracking-tight">Educy</h2>
                      <p className="text-xs text-gray-500 uppercase tracking-widest">Learning Platform</p>
                    </div>
                  </div>

                  {/* Certificate Title */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-4 mb-2">
                      <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#5C2482] to-transparent"></div>
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-white font-bold text-xs tracking-wider">VERIFIED CERTIFICATE</span>
                      </div>
                      <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#5C2482] to-transparent"></div>
                    </div>

                    <h1 className="text-4xl font-serif font-bold text-[#5C2482] tracking-wide" style={{ letterSpacing: '0.05em' }}>
                      Certificate of Achievement
                    </h1>

                    <div className="flex items-center justify-center gap-2">
                      <div className="h-1 w-16 bg-[#5C2482] rounded-full"></div>
                      <div className="h-1 w-8 bg-[#F95B0E] rounded-full"></div>
                      <div className="h-1 w-16 bg-[#5C2482] rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Main Certificate Content */}
                <div className="flex-1 flex flex-col justify-center space-y-8">
                  {/* Recipient Information */}
                  <div className="text-center space-y-4">
                    <p className="text-base text-gray-600 font-medium">This certificate is proudly presented to</p>

                    <div className="py-4">
                      <h2 className="text-5xl font-serif font-bold text-[#5C2482] mb-2" style={{ letterSpacing: '0.02em' }}>
                        {certificate.studentName}
                      </h2>
                      <div className="h-0.5 w-96 mx-auto bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
                    </div>

                    <p className="text-base text-gray-600 font-medium">for successfully completing the course</p>
                  </div>

                  {/* Course Information - Centered Card */}
                  <div className="max-w-3xl mx-auto w-full">
                    <div className="relative bg-gradient-to-br from-purple-50 via-white to-orange-50 rounded-2xl p-8 shadow-lg border-2 border-[#5C2482]/20">
                      {/* Decorative Corner Accent */}
                      <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-[#5C2482] rounded-tl-2xl opacity-30"></div>
                      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-[#F95B0E] rounded-br-2xl opacity-30"></div>

                      <div className="text-center space-y-3">
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-3xl font-bold text-[#5C2482] bg-white px-3 py-2 sm:px-4 rounded-xl shadow-sm">
                            {certificate.courseCode}
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{certificate.courseTitle}</h3>
                        {certificate.courseDescription && (
                          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-xl mx-auto">
                            {certificate.courseDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Achievement Statement */}
                  <p className="text-center text-xs sm:text-sm text-gray-600 italic max-w-2xl mx-auto">
                    In recognition of outstanding dedication, perseverance, and successful mastery
                    of the comprehensive course curriculum and learning objectives
                  </p>
                </div>

                {/* Footer - Signature and Details */}
                <div className="space-y-6">
                  {/* Signature Row */}
                  <div className="grid grid-cols-3 gap-8 items-end">
                    {/* Date */}
                    <div className="text-center">
                      <div className="mb-2">
                        <p className="text-lg font-bold text-[#5C2482]">
                          {format(new Date(certificate.completionDate), 'MMMM d, yyyy')}
                        </p>
                      </div>
                      <div className="h-px bg-gray-400 w-full mb-1"></div>
                      <p className="text-xs text-gray-600 font-medium">Date of Completion</p>
                    </div>

                    {/* Signature */}
                    <div className="text-center">
                      <div className="mb-2 h-12 flex items-center justify-center">
                        <div className="text-3xl font-dancing text-[#5C2482] italic" style={{ fontFamily: 'cursive' }}>
                          {certificate.issuedByName || 'Educy'}
                        </div>
                      </div>
                      <div className="h-px bg-gray-400 w-full mb-1"></div>
                      <p className="text-xs text-gray-600 font-medium">
                        {certificate.issuedByRole || 'Authorized Signatory'}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {certificate.instructorName} - Instructor
                      </p>
                    </div>

                    {/* QR Code for Verification */}
                    <div className="text-center">
                      <div className="mb-2 flex items-center justify-center">
                        <div className="p-2 bg-white rounded-lg border-2 border-[#5C2482] shadow-sm">
                          <QRCodeSVG
                            value={getVerificationUrl()}
                            size={64}
                            level="H"
                            includeMargin={false}
                            fgColor="#5C2482"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">Scan to Verify</p>
                    </div>
                  </div>

                  {/* Certificate Metadata */}
                  <div className="pt-4 border-t-2 border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Certificate ID:</span>
                        <span className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          {certificate.certificateNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Issued:</span>
                        <span className="text-xs font-semibold text-gray-700">
                          {format(new Date(certificate.issuedAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        <span>Verify at: </span>
                        <span className="font-mono text-[#5C2482]">educy.vercel.app/verify</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Hide on print */}
        <div className="no-print text-center py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#5C2482] hover:text-[#7B3FA3] font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Homepage
          </Link>
        </div>
      </div>
    </>
  )
}
