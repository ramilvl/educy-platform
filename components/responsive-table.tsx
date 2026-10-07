/**
 * Responsive Table Wrapper
 *
 * Makes tables responsive on mobile by adding horizontal scroll
 * Fixes GitHub issues #76, #77, #79 - tables not fully visible on mobile
 */

import { ReactNode } from 'react'

interface ResponsiveTableProps {
  children: ReactNode
  className?: string
}

export function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
  return (
    <div className="w-full overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className={`overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 sm:rounded-lg ${className}`}>
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Responsive Table with scroll hint
 * Shows a subtle hint on mobile that table is scrollable
 */
export function ResponsiveTableWithHint({ children, className = '' }: ResponsiveTableProps) {
  return (
    <div className="relative">
      {/* Scroll hint for mobile */}
      <div className="block sm:hidden mb-2 text-xs text-gray-500 italic">
        👉 Scroll horizontally to see all columns
      </div>

      <div className="w-full overflow-x-auto -mx-4 sm:mx-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div className="inline-block min-w-full align-middle">
          <div className={`overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 sm:rounded-lg ${className}`}>
            {children}
          </div>
        </div>
      </div>

      {/* Right edge gradient hint on mobile */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none sm:hidden" />
    </div>
  )
}
