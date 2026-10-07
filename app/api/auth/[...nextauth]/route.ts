import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByIP, rateLimitByIdentifier, RateLimitPresets, logRateLimitViolation } from '@/lib/ratelimit'

const handler = NextAuth(authOptions)

// Wrap NextAuth handler with rate limiting for POST requests (login/auth)
async function POST(
  request: NextRequest,
  context: { params: { nextauth: string[] } }
) {
  // Only rate limit credential login attempts (not session checks)
  const url = new URL(request.url)
  const isCredentialProvider = url.pathname.includes('callback/credentials')

  if (isCredentialProvider) {
    // Apply rate limiting by IP for login attempts
    const rateLimitResult = rateLimitByIP(request, 'login', RateLimitPresets.login)
    if (rateLimitResult) {
      logRateLimitViolation('login', '/api/auth/[...nextauth]', request.headers.get('x-forwarded-for') || 'unknown')
      return rateLimitResult
    }

    // Also rate limit by email if provided in body
    try {
      const contentType = request.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const body = await request.json()
        if (body?.email) {
          const emailRateLimit = rateLimitByIdentifier(request, 'login-email', body.email, RateLimitPresets.login)
          if (emailRateLimit) {
            logRateLimitViolation(`login-email:${body.email}`, '/api/auth/[...nextauth]', request.headers.get('x-forwarded-for') || 'unknown')
            return emailRateLimit
          }
        }
        // Reconstruct request with body for NextAuth
        const newRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(body),
        })
        return handler(newRequest as any, context as any)
      }
    } catch (e) {
      // If body parsing fails, continue without email-based rate limiting
    }
  }

  return handler(request as any, context as any)
}

async function GET(
  request: NextRequest,
  context: { params: { nextauth: string[] } }
) {
  return handler(request as any, context as any)
}

export { GET, POST }
