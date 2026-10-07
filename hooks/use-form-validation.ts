import { useState } from 'react'

/**
 * Field-level errors map
 * Example: { email: 'Email is required', password: 'Password must be at least 8 characters' }
 */
export type FieldErrors = Record<string, string>

/**
 * Hook for managing form validation state with field-level errors
 * Provides methods to set/clear errors and a general error message
 */
export function useFormValidation() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState<string>('')

  /**
   * Set error for a specific field
   */
  const setFieldError = (field: string, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }))
  }

  /**
   * Clear error for a specific field
   */
  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      const updated = { ...prev }
      delete updated[field]
      return updated
    })
  }

  /**
   * Set multiple field errors at once (e.g., from API response)
   */
  const setAllFieldErrors = (errors: FieldErrors) => {
    setFieldErrors(errors)
  }

  /**
   * Clear all field errors
   */
  const clearAllErrors = () => {
    setFieldErrors({})
    setGeneralError('')
  }

  /**
   * Parse API error response and extract field-level errors
   * Handles various error formats from backend
   */
  const parseApiError = (error: any, defaultMessage = 'An error occurred') => {
    // Clear previous errors
    clearAllErrors()

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      setGeneralError('Network error. Please check your internet connection and try again.')
      return
    }

    // Handle error objects with response data
    if (error.response?.data) {
      const data = error.response.data

      // Check for field-level errors
      if (data.errors && typeof data.errors === 'object') {
        setFieldErrors(data.errors)
        return
      }

      // Check for validation error details (Zod format)
      if (data.details && Array.isArray(data.details)) {
        const errors: FieldErrors = {}
        data.details.forEach((detail: any) => {
          const field = detail.path?.join('.') || 'unknown'
          errors[field] = detail.message
        })
        setFieldErrors(errors)
        return
      }

      // Single error message
      if (data.error) {
        setGeneralError(data.error)
        return
      }
    }

    // Handle simple error messages
    if (error.message) {
      setGeneralError(error.message)
      return
    }

    // Fallback
    setGeneralError(defaultMessage)
  }

  /**
   * Handle API response errors based on status code
   * Returns true if error was handled, false otherwise
   */
  const handleHttpError = (response: Response, data: any): boolean => {
    clearAllErrors()

    // Field-level errors from backend
    if (data.errors && typeof data.errors === 'object') {
      setFieldErrors(data.errors)
      return true
    }

    // Validation error details (Zod format)
    if (data.details && Array.isArray(data.details)) {
      const errors: FieldErrors = {}
      data.details.forEach((detail: any) => {
        const field = detail.path?.join('.') || 'unknown'
        errors[field] = detail.message
      })
      setFieldErrors(errors)
      return true
    }

    // Status-specific errors (system-level)
    switch (response.status) {
      case 401:
        setGeneralError('Session expired. Please log in again.')
        return true
      case 403:
        setGeneralError(data.error || 'You do not have permission to perform this action.')
        return true
      case 404:
        setGeneralError(data.error || 'Resource not found.')
        return true
      case 409:
        setGeneralError(data.error || 'Conflict: This action cannot be completed.')
        return true
      case 500:
      case 502:
      case 503:
        setGeneralError('Server error. Please try again later or contact support if the problem persists.')
        return true
      default:
        if (data.error) {
          setGeneralError(data.error)
          return true
        }
        return false
    }
  }

  return {
    fieldErrors,
    generalError,
    setFieldError,
    clearFieldError,
    setAllFieldErrors,
    setGeneralError,
    clearAllErrors,
    parseApiError,
    handleHttpError,
    hasErrors: Object.keys(fieldErrors).length > 0 || !!generalError,
  }
}
