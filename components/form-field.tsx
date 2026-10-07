import React from 'react'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  helpText?: string
  children: React.ReactNode
  className?: string
}

/**
 * Reusable form field component with built-in error display
 * Shows field label, input, error message, and optional help text
 */
export function FormField({
  label,
  error,
  required = false,
  helpText,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Clone children to add error styling */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const errorClasses = error
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'

          const baseClasses = 'w-full px-3 py-2 sm:px-4 rounded-xl text-gray-900 bg-white border focus:outline-none focus:ring-2'

          return React.cloneElement(child as React.ReactElement<any>, {
            className: `${baseClasses} ${errorClasses} ${child.props.className || ''}`,
          })
        }
        return child
      })}

      {/* Error message */}
      {error && (
        <div className="mt-1 flex items-start gap-1.5">
          <svg
            className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-xs sm:text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Help text */}
      {!error && helpText && (
        <p className="mt-1 text-xs sm:text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  )
}
