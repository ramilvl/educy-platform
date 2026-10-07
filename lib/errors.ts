/**
 * Centralized Error Handling
 *
 * Provides safe error responses to clients while logging detailed errors server-side.
 * Prevents information disclosure in production environments.
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

/**
 * Error codes for consistent error handling
 */
export enum ErrorCode {
  // Client errors (4xx)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Generic error messages that don't expose internal details
 */
const SAFE_ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: 'Authentication required. Please sign in.',
  [ErrorCode.FORBIDDEN]: 'You do not have permission to perform this action.',
  [ErrorCode.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCode.BAD_REQUEST]: 'Invalid request. Please check your input.',
  [ErrorCode.VALIDATION_ERROR]: 'Validation failed. Please check your input.',
  [ErrorCode.CONFLICT]: 'This action conflicts with existing data.',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
  [ErrorCode.INTERNAL_ERROR]: 'An internal error occurred. Please try again later.',
  [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Please try again later.',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'An external service error occurred. Please try again later.',
}

/**
 * HTTP status codes for error codes
 */
const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
}

/**
 * Application error class
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Log error securely (detailed logging server-side only)
 */
function logError(error: any, context?: string): void {
  const timestamp = new Date().toISOString()
  const contextStr = context ? `[${context}]` : ''

  console.error(`[ERROR ${timestamp}] ${contextStr}`, {
    message: error.message,
    name: error.name,
    code: error.code,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    details: error.details,
  })
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError): NextResponse {
  logError(error, 'VALIDATION')

  // In development, return detailed validation errors
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json(
      {
        error: SAFE_ERROR_MESSAGES[ErrorCode.VALIDATION_ERROR],
        code: ErrorCode.VALIDATION_ERROR,
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
      { status: 400 }
    )
  }

  // In production, return generic message
  return NextResponse.json(
    {
      error: SAFE_ERROR_MESSAGES[ErrorCode.VALIDATION_ERROR],
      code: ErrorCode.VALIDATION_ERROR,
    },
    { status: 400 }
  )
}

/**
 * Handle Prisma database errors
 */
function handlePrismaError(error: any): NextResponse {
  logError(error, 'DATABASE')

  // Check for specific Prisma error types
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'A record with this information already exists.',
          code: ErrorCode.CONFLICT,
        },
        { status: 409 }
      )
    }

    // Record not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          error: SAFE_ERROR_MESSAGES[ErrorCode.NOT_FOUND],
          code: ErrorCode.NOT_FOUND,
        },
        { status: 404 }
      )
    }
  }

  // Generic database error
  return NextResponse.json(
    {
      error: SAFE_ERROR_MESSAGES[ErrorCode.DATABASE_ERROR],
      code: ErrorCode.DATABASE_ERROR,
    },
    { status: 500 }
  )
}

/**
 * Handle AppError instances
 */
function handleAppError(error: AppError): NextResponse {
  logError(error, 'APP')

  const statusCode = ERROR_STATUS_CODES[error.code]

  // In development, include details
  if (process.env.NODE_ENV === 'development' && error.details) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: statusCode }
    )
  }

  // In production, only return safe message
  return NextResponse.json(
    {
      error: error.message || SAFE_ERROR_MESSAGES[error.code],
      code: error.code,
    },
    { status: statusCode }
  )
}

/**
 * Handle generic errors
 */
function handleGenericError(error: Error): NextResponse {
  logError(error, 'GENERIC')

  // In development, include error message
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json(
      {
        error: error.message,
        code: ErrorCode.INTERNAL_ERROR,
        stack: error.stack,
      },
      { status: 500 }
    )
  }

  // In production, return generic message
  return NextResponse.json(
    {
      error: SAFE_ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR],
      code: ErrorCode.INTERNAL_ERROR,
    },
    { status: 500 }
  )
}

/**
 * Main error handler - use this in try/catch blocks
 *
 * @example
 * try {
 *   // Your code
 * } catch (error) {
 *   return handleError(error, 'UserCreation')
 * }
 */
export function handleError(error: unknown, context?: string): NextResponse {
  // Handle different error types
  if (error instanceof AppError) {
    return handleAppError(error)
  }

  if (error instanceof ZodError) {
    return handleZodError(error)
  }

  // Check if it's a Prisma error
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError
  ) {
    return handlePrismaError(error)
  }

  // Handle generic errors
  if (error instanceof Error) {
    return handleGenericError(error)
  }

  // Unknown error type
  logError({ message: 'Unknown error type', error }, context)
  return NextResponse.json(
    {
      error: SAFE_ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR],
      code: ErrorCode.INTERNAL_ERROR,
    },
    { status: 500 }
  )
}

/**
 * Quick error response helpers
 */
export const errorResponse = {
  unauthorized: (message?: string) =>
    NextResponse.json(
      {
        error: message || SAFE_ERROR_MESSAGES[ErrorCode.UNAUTHORIZED],
        code: ErrorCode.UNAUTHORIZED,
      },
      { status: 401 }
    ),

  forbidden: (message?: string) =>
    NextResponse.json(
      {
        error: message || SAFE_ERROR_MESSAGES[ErrorCode.FORBIDDEN],
        code: ErrorCode.FORBIDDEN,
      },
      { status: 403 }
    ),

  notFound: (message?: string) =>
    NextResponse.json(
      {
        error: message || SAFE_ERROR_MESSAGES[ErrorCode.NOT_FOUND],
        code: ErrorCode.NOT_FOUND,
      },
      { status: 404 }
    ),

  badRequest: (message?: string) =>
    NextResponse.json(
      {
        error: message || SAFE_ERROR_MESSAGES[ErrorCode.BAD_REQUEST],
        code: ErrorCode.BAD_REQUEST,
      },
      { status: 400 }
    ),

  conflict: (message?: string) =>
    NextResponse.json(
      {
        error: message || SAFE_ERROR_MESSAGES[ErrorCode.CONFLICT],
        code: ErrorCode.CONFLICT,
      },
      { status: 409 }
    ),
}
