import { useEffect, useState, useCallback } from 'react'

interface AutosaveOptions {
  key: string // localStorage key for this form
  data: any // form data to save
  enabled?: boolean // whether autosave is enabled
  interval?: number // save interval in milliseconds (default: 30000 = 30 seconds)
  onRestore?: (data: any) => void // callback when draft is restored
}

interface AutosaveState {
  lastSaved: Date | null
  isSaving: boolean
  hasDraft: boolean
}

/**
 * Custom hook for autosaving form data to localStorage
 *
 * Usage:
 * ```tsx
 * const { lastSaved, clearDraft, hasDraft } = useAutosave({
 *   key: 'course-create-form',
 *   data: formData,
 *   enabled: true,
 *   onRestore: (savedData) => setFormData(savedData)
 * })
 * ```
 */
export function useAutosave({
  key,
  data,
  enabled = true,
  interval = 30000, // 30 seconds
  onRestore,
}: AutosaveOptions) {
  const [state, setState] = useState<AutosaveState>({
    lastSaved: null,
    isSaving: false,
    hasDraft: false,
  })

  // Storage key with prefix
  const storageKey = `autosave_${key}`

  // Check for existing draft on mount
  useEffect(() => {
    if (!enabled) return

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const { data: savedData, timestamp } = JSON.parse(saved)
        setState(prev => ({ ...prev, hasDraft: true, lastSaved: new Date(timestamp) }))

        // Optionally restore the draft
        if (onRestore) {
          onRestore(savedData)
        }
      }
    } catch (error) {
      console.error('Failed to restore autosave draft:', error)
    }
  }, [enabled, storageKey, onRestore])

  // Save data to localStorage
  const saveDraft = useCallback(() => {
    if (!enabled) return

    try {
      setState(prev => ({ ...prev, isSaving: true }))

      const saveData = {
        data,
        timestamp: new Date().toISOString(),
      }

      localStorage.setItem(storageKey, JSON.stringify(saveData))

      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasDraft: true,
      }))
    } catch (error) {
      console.error('Failed to autosave draft:', error)
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }, [enabled, data, storageKey])

  // Auto-save on interval
  useEffect(() => {
    if (!enabled || !data) return

    const timer = setInterval(() => {
      saveDraft()
    }, interval)

    return () => clearInterval(timer)
  }, [enabled, data, interval, saveDraft])

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
      setState({
        lastSaved: null,
        isSaving: false,
        hasDraft: false,
      })
    } catch (error) {
      console.error('Failed to clear autosave draft:', error)
    }
  }, [storageKey])

  // Manually trigger save
  const save = useCallback(() => {
    saveDraft()
  }, [saveDraft])

  return {
    ...state,
    clearDraft,
    save,
  }
}
