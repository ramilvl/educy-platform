'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PendingEnrollmentActionsProps {
  enrollmentId: string
}

export function PendingEnrollmentActions({ enrollmentId }: PendingEnrollmentActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  const handleApprove = async () => {
    setLoading('approve')
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/approve`, { method: 'POST' })
      if (res.ok) router.refresh()
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    setLoading('reject')
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/reject`, { method: 'POST' })
      if (res.ok) router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        disabled={loading !== null}
        className="px-4 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
      >
        {loading === 'approve' ? 'Approving...' : 'Approve'}
      </button>
      <button
        onClick={handleReject}
        disabled={loading !== null}
        className="px-4 py-2 border border-red-300 text-red-700 text-sm rounded-xl hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading === 'reject' ? 'Rejecting...' : 'Reject'}
      </button>
    </div>
  )
}
