/**
 * Rate Limiting Utility
 *
 * Provides in-memory rate limiting for authentication and sensitive endpoints.
 * Can be upgraded to Redis-based solution for production scaling.
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitStore {
  count: number
  resetTime: number
  lockoutUntil?: number
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitStore>()

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(rateLimitStore.entries())
  for (const [key, value] of entries) {
    if (value.resetTime < now && (!value.lockoutUntil || value.lockoutUntil < now)) {
      rateLimitStore.delete(key)
    }
  }
}, 10 * 60 * 1000)

export interface RateLimitConfig {
  maxAttempts: number // Maximum attempts allowed
  windowMs: number // Time window in milliseconds
  lockoutDuration?: number // Lockout duration after exceeding max attempts (optional)
  message?: string // Custom error message
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for IP (in order of preference)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback to a default (should not happen in production)
  return 'unknown'
}

/**
 * Check if request should be rate limited
 * Returns null if allowed, or NextResponse with error if rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  identifier: string, // Unique identifier (e.g., 'login:ip', 'register:email')
  config: RateLimitConfig
): NextResponse | null {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // Check if currently locked out
  if (entry?.lockoutUntil && entry.lockoutUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockoutUntil - now) / 1000)
    return NextResponse.json(
      {
        error: config.message || 'Too many attempts. Please try again later.',
        retryAfter: remainingSeconds,
        lockout: true,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(remainingSeconds),
        },
      }
    )
  }

  // Create new entry or check existing
  if (!entry || entry.resetTime < now) {
    // New window or expired window
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return null // Allow request
  }

  // Increment count
  entry.count++

  // Check if limit exceeded
  if (entry.count > config.maxAttempts) {
    // Set lockout if configured
    if (config.lockoutDuration) {
      entry.lockoutUntil = now + config.lockoutDuration
    }

    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000)
    return NextResponse.json(
      {
        error: config.message || 'Too many attempts. Please try again later.',
        retryAfter: config.lockoutDuration
          ? Math.ceil(config.lockoutDuration / 1000)
          : resetSeconds,
        lockout: !!config.lockoutDuration,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(
            config.lockoutDuration
              ? Math.ceil(config.lockoutDuration / 1000)
              : resetSeconds
          ),
        },
      }
    )
  }

  return null // Allow request
}

/**
 * Rate limit by IP address
 */
export function rateLimitByIP(
  request: NextRequest,
  prefix: string, // e.g., 'login', 'register'
  config: RateLimitConfig
): NextResponse | null {
  const ip = getClientIP(request)
  return checkRateLimit(request, `${prefix}:${ip}`, config)
}

/**
 * Rate limit by email/identifier
 */
export function rateLimitByIdentifier(
  request: NextRequest,
  prefix: string, // e.g., 'password-reset'
  identifier: string, // e.g., email
  config: RateLimitConfig
): NextResponse | null {
  return checkRateLimit(request, `${prefix}:${identifier}`, config)
}

/**
 * Record successful attempt (reset counter)
 */
export function recordSuccess(identifier: string): void {
  rateLimitStore.delete(identifier)
}

/**
 * Clear all rate limits for a specific prefix (e.g., clear all login attempts)
 * Useful for administrative purposes or testing
 */
export function clearRateLimitsForPrefix(prefix: string): number {
  let cleared = 0
  const entries = Array.from(rateLimitStore.entries())
  for (const [key] of entries) {
    if (key.startsWith(`${prefix}:`)) {
      rateLimitStore.delete(key)
      cleared++
    }
  }
  return cleared
}

/**
 * Clear all rate limits (use with caution)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear()
}

/**
 * Preset configurations for common scenarios
 */
export const RateLimitPresets = {
  // Login: 20 attempts per 15 minutes, 15 minute lockout after exceeding
  // More lenient to avoid blocking legitimate users during testing/development
  login: {
    maxAttempts: 20,
    windowMs: 15 * 60 * 1000, // 15 minutes
    lockoutDuration: 15 * 60 * 1000, // 15 minutes (reduced from 1 hour)
    message: 'Too many login attempts. Please try again in a few minutes.',
  },

  // Registration: 3 per hour per IP
  register: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many registration attempts. Please try again later.',
  },

  // Password reset request: 3 per hour per email
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many password reset requests. Please try again later.',
  },

  // Password reset confirmation: 5 attempts per token
  passwordResetConfirm: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    lockoutDuration: 24 * 60 * 60 * 1000, // 24 hours
    message: 'Too many attempts with this reset token. Please request a new password reset.',
  },

  // API general: 100 requests per 15 minutes per IP
  api: {
    maxAttempts: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Rate limit exceeded. Please slow down.',
  },

  // Certificate issuance: 10 per hour per user
  certificateIssue: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many certificate issuance attempts. Please try again later.',
  },

  // Grade submission: 50 per hour per instructor
  gradeSubmission: {
    maxAttempts: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many grading attempts. Please try again later.',
  },

  // Enrollment actions: 30 per hour per user
  enrollmentAction: {
    maxAttempts: 30,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many enrollment actions. Please try again later.',
  },

  // Payment recording: 20 per hour per user
  paymentRecord: {
    maxAttempts: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many payment recording attempts. Please try again later.',
  },

  // User import: 3 per hour per admin
  userImport: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many user import attempts. Please try again later.',
  },
}

/**
 * Logging rate limit violations for security monitoring
 */
export function logRateLimitViolation(
  identifier: string,
  endpoint: string,
  ip: string
): void {
  console.warn(`[SECURITY] Rate limit exceeded - Endpoint: ${endpoint}, Identifier: ${identifier}, IP: ${ip}`)
}
