import { ReactNode, ButtonHTMLAttributes } from 'react'
import Link from 'next/link'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg'

interface BaseButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
}

interface ButtonProps extends BaseButtonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  href?: never
  children: ReactNode
}

interface LinkButtonProps extends BaseButtonProps {
  href: string
  children: ReactNode
  disabled?: never
  onClick?: never
  type?: never
}

type ButtonComponentProps = ButtonProps | LinkButtonProps

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[#F95B0E] text-white hover:bg-[#d94f0c] shadow-sm',
  secondary: 'bg-[#5C2482] text-white hover:bg-[#7B3FA3] shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  ghost: 'border-2 border-[#5C2482] text-[#5C2482] hover:bg-[#5C2482] hover:text-white',
  success: 'bg-green-600 text-white hover:bg-green-700 shadow-sm',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs sm:text-sm',
  md: 'px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base',
  lg: 'px-6 py-3 sm:px-8 sm:py-3.5 text-base sm:text-lg',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  href,
  ...props
}: ButtonComponentProps) {
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-xl
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F95B0E]
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ')

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {children}
      </Link>
    )
  }

  return (
    <button className={baseClasses} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
}
