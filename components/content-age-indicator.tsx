'use client'

import {
  getContentAgeStatus,
  getContentAgeLabel,
  getContentReviewMessage,
  CONTENT_AGE_COLORS,
  type ContentAgeStatus,
} from '@/lib/content-aging'

interface ContentAgeIndicatorProps {
  updatedAt: Date | string
  createdAt?: Date | string
  contentType?: 'lesson' | 'assignment' | 'announcement'
  showMessage?: boolean
  compact?: boolean
  className?: string
}

export function ContentAgeIndicator({
  updatedAt,
  createdAt,
  contentType = 'lesson',
  showMessage = false,
  compact = false,
  className = '',
}: ContentAgeIndicatorProps) {
  const status = getContentAgeStatus(updatedAt)
  const { updatedLabel, createdLabel } = getContentAgeLabel(updatedAt, createdAt)
  const message = getContentReviewMessage(status, contentType)
  const colors = CONTENT_AGE_COLORS[status]

  if (compact) {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors.badge} ${className}`}>
        {status === 'recent' && '✓'}
        {status === 'aging' && '⏰'}
        {status === 'outdated' && '⚠️'}
        <span className="ml-1">{updatedLabel}</span>
      </span>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Age Status Badge */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
          {status === 'recent' && '✓ Recent'}
          {status === 'aging' && '⏰ Aging'}
          {status === 'outdated' && '⚠️ Outdated'}
        </span>
        <span className="text-xs text-gray-500">
          Last updated {updatedLabel}
        </span>
      </div>

      {/* Created Date (if provided) */}
      {createdLabel && (
        <p className="text-xs text-gray-500">
          Created {createdLabel}
        </p>
      )}

      {/* Review Message */}
      {showMessage && message && (
        <div className={`text-sm p-3 rounded-lg border ${colors.bg} ${colors.border} ${colors.text}`}>
          {message}
        </div>
      )}
    </div>
  )
}

interface ContentAgeStatsProps {
  stats: {
    total: number
    recent: number
    aging: number
    outdated: number
    needsReview: number
  }
  className?: string
}

export function ContentAgeStats({ stats, className = '' }: ContentAgeStatsProps) {
  const percentage = (count: number) => {
    if (stats.total === 0) return '0%'
    return `${Math.round((count / stats.total) * 100)}%`
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-600">Total</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
      </div>

      <div className="bg-green-50 rounded-xl shadow border border-green-200 p-4">
        <p className="text-sm font-medium text-green-700">Recent</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-2xl font-bold text-green-900">{stats.recent}</p>
          <p className="text-sm text-green-600">{percentage(stats.recent)}</p>
        </div>
      </div>

      <div className="bg-yellow-50 rounded-xl shadow border border-yellow-200 p-4">
        <p className="text-sm font-medium text-yellow-700">Aging</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-2xl font-bold text-yellow-900">{stats.aging}</p>
          <p className="text-sm text-yellow-600">{percentage(stats.aging)}</p>
        </div>
      </div>

      <div className="bg-red-50 rounded-xl shadow border border-red-200 p-4">
        <p className="text-sm font-medium text-red-700">Outdated</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-2xl font-bold text-red-900">{stats.outdated}</p>
          <p className="text-sm text-red-600">{percentage(stats.outdated)}</p>
        </div>
      </div>
    </div>
  )
}
