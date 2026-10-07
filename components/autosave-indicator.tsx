'use client'

import { useEffect, useState } from 'react'

interface AutosaveIndicatorProps {
  lastSaved: Date | null
  isSaving: boolean
  hasDraft: boolean
  onRestoreDraft?: () => void
  onClearDraft?: () => void
}

export function AutosaveIndicator({
  lastSaved,
  isSaving,
  hasDraft,
  onRestoreDraft,
  onClearDraft,
}: AutosaveIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>('')

  // Update time ago every second
  useEffect(() => {
    if (!lastSaved) {
      setTimeAgo('')
      return
    }

    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000)

      if (seconds < 5) {
        setTimeAgo('just now')
      } else if (seconds < 60) {
        setTimeAgo(`${seconds} seconds ago`)
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60)
        setTimeAgo(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`)
      } else {
        const hours = Math.floor(seconds / 3600)
        setTimeAgo(`${hours} ${hours === 1 ? 'hour' : 'hours'} ago`)
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 1000)

    return () => clearInterval(interval)
  }, [lastSaved])

  if (!hasDraft && !isSaving) {
    return null
  }

  return (
    <div className="flex items-center gap-3 text-xs sm:text-sm">
      {isSaving ? (
        <div className="flex items-center gap-2 text-gray-600">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Saving draft...</span>
        </div>
      ) : lastSaved ? (
        <div className="flex items-center gap-2 text-green-600">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>Draft saved {timeAgo}</span>
        </div>
      ) : null}

      {hasDraft && onRestoreDraft && (
        <button
          type="button"
          onClick={onRestoreDraft}
          className="text-[#5C2482] hover:text-[#7B3FA3] font-medium transition"
        >
          Restore draft
        </button>
      )}

      {hasDraft && onClearDraft && (
        <button
          type="button"
          onClick={onClearDraft}
          className="text-gray-500 hover:text-gray-700 transition"
        >
          Clear draft
        </button>
      )}
    </div>
  )
}
