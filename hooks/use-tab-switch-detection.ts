import { useEffect, useRef } from 'react'

interface TabSwitchDetectionOptions {
  assignmentId: string
  enabled?: boolean
  onTabSwitch?: (eventType: string) => void
}

/**
 * Hook to detect tab switching and log it for academic integrity
 * Tracks visibility changes and window blur/focus events
 */
export function useTabSwitchDetection({
  assignmentId,
  enabled = true,
  onTabSwitch,
}: TabSwitchDetectionOptions) {
  const lastEventRef = useRef<string | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled || !assignmentId) return

    const logTabSwitch = async (eventType: string) => {
      // Debounce to avoid logging duplicate events
      if (lastEventRef.current === eventType) return

      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Debounce the event
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/assignments/${assignmentId}/tab-switch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              eventType,
              timestamp: new Date().toISOString(),
            }),
          })

          if (response.ok) {
            lastEventRef.current = eventType
            onTabSwitch?.(eventType)
          }
        } catch (error) {
          console.error('Failed to log tab switch:', error)
        }
      }, 300) // 300ms debounce
    }

    // Track visibility changes (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logTabSwitch('visibility_hidden')
      } else {
        logTabSwitch('visibility_visible')
      }
    }

    // Track window blur/focus (switching to another application)
    const handleBlur = () => {
      logTabSwitch('blur')
    }

    const handleFocus = () => {
      logTabSwitch('focus')
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [assignmentId, enabled, onTabSwitch])
}

/**
 * Get tab switch statistics for a student
 */
export async function getTabSwitchStats(assignmentId: string, studentId?: string) {
  try {
    const url = studentId
      ? `/api/assignments/${assignmentId}/tab-switch?studentId=${studentId}`
      : `/api/assignments/${assignmentId}/tab-switch`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Failed to fetch tab switch data')
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Unknown error')
    }

    const { tabSwitches } = data

    // Calculate statistics
    const hiddenEvents = tabSwitches.filter(
      (t: any) => t.eventType === 'visibility_hidden' || t.eventType === 'blur'
    )

    const visibleEvents = tabSwitches.filter(
      (t: any) => t.eventType === 'visibility_visible' || t.eventType === 'focus'
    )

    return {
      totalSwitches: hiddenEvents.length,
      events: tabSwitches,
      hiddenEvents: hiddenEvents.length,
      visibleEvents: visibleEvents.length,
      firstSwitch: hiddenEvents[0]?.timestamp,
      lastSwitch: hiddenEvents[hiddenEvents.length - 1]?.timestamp,
    }
  } catch (error) {
    console.error('Error fetching tab switch stats:', error)
    return {
      totalSwitches: 0,
      events: [],
      hiddenEvents: 0,
      visibleEvents: 0,
      firstSwitch: null,
      lastSwitch: null,
    }
  }
}
