import { prisma } from './prisma'
import { AuditLogSeverity } from '@prisma/client'

export type AuditCategory = 'SECURITY' | 'SYSTEM' | 'ADMIN_ACTION' | 'USER_ACTION'

/**
 * Create an audit log entry with severity and category
 */
export async function createAuditLog({
  userId,
  action,
  targetType,
  targetId,
  details,
  severity = 'INFO' as AuditLogSeverity,
  category,
}: {
  userId?: string
  action: string
  targetType?: string
  targetId?: string
  details?: any
  severity?: AuditLogSeverity
  category?: AuditCategory
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        targetType,
        targetId,
        details,
        severity,
        category,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw - audit logging should never break the main flow
  }
}

/**
 * Determine severity based on action type
 */
export function getSeverityForAction(action: string): AuditLogSeverity {
  // CRITICAL actions - important system changes
  if (
    action.includes('ROLE_CHANGED') ||
    action.includes('DELETED') ||
    action.includes('PERMISSION') ||
    action.includes('SYSTEM_ERROR') ||
    action.includes('INTEGRATION_FAILURE') ||
    action.includes('DATA_INCONSISTENCY')
  ) {
    return 'CRITICAL'
  }

  // WARNING actions - potential issues
  if (
    action.includes('FAILED') ||
    action.includes('RETRY') ||
    action.includes('TIMEOUT') ||
    action.includes('WARNING') ||
    action.includes('REJECTED')
  ) {
    return 'WARNING'
  }

  // INFO - regular operations
  return 'INFO'
}

/**
 * Determine category based on action type
 */
export function getCategoryForAction(action: string): AuditCategory {
  if (action.includes('LOGIN') || action.includes('LOGOUT') || action.includes('AUTH')) {
    return 'SECURITY'
  }

  if (
    action.includes('ERROR') ||
    action.includes('FAILURE') ||
    action.includes('SYSTEM') ||
    action.includes('INTEGRATION')
  ) {
    return 'SYSTEM'
  }

  if (
    action.includes('ROLE') ||
    action.includes('PERMISSION') ||
    action.includes('CREATED') ||
    action.includes('DELETED') ||
    action.includes('ROOM')
  ) {
    return 'ADMIN_ACTION'
  }

  return 'USER_ACTION'
}

/**
 * Quick log functions for common operations
 */
export const auditLog = {
  // Security events
  userLogin: (userId: string, details?: any) =>
    createAuditLog({
      userId,
      action: 'USER_LOGIN',
      severity: 'INFO',
      category: 'SECURITY',
      details,
    }),

  userLogout: (userId: string) =>
    createAuditLog({
      userId,
      action: 'USER_LOGOUT',
      severity: 'INFO',
      category: 'SECURITY',
    }),

  failedLogin: (email: string, details?: any) =>
    createAuditLog({
      action: 'LOGIN_FAILED',
      severity: 'WARNING',
      category: 'SECURITY',
      details: { email, ...details },
    }),

  // Admin actions
  userCreated: (adminId: string, targetUserId: string, details?: any) =>
    createAuditLog({
      userId: adminId,
      action: 'USER_CREATED',
      targetType: 'User',
      targetId: targetUserId,
      severity: 'CRITICAL',
      category: 'ADMIN_ACTION',
      details,
    }),

  userRoleChanged: (adminId: string, targetUserId: string, details?: any) =>
    createAuditLog({
      userId: adminId,
      action: 'USER_ROLE_CHANGED',
      targetType: 'User',
      targetId: targetUserId,
      severity: 'CRITICAL',
      category: 'ADMIN_ACTION',
      details,
    }),

  userDeleted: (adminId: string, targetUserId: string, details?: any) =>
    createAuditLog({
      userId: adminId,
      action: 'USER_DELETED',
      targetType: 'User',
      targetId: targetUserId,
      severity: 'CRITICAL',
      category: 'ADMIN_ACTION',
      details,
    }),

  roomCreated: (adminId: string, roomId: string, details?: any) =>
    createAuditLog({
      userId: adminId,
      action: 'ROOM_CREATED',
      targetType: 'Room',
      targetId: roomId,
      severity: 'CRITICAL',
      category: 'ADMIN_ACTION',
      details,
    }),

  roomDeleted: (adminId: string, roomId: string, details?: any) =>
    createAuditLog({
      userId: adminId,
      action: 'ROOM_DELETED',
      targetType: 'Room',
      targetId: roomId,
      severity: 'CRITICAL',
      category: 'ADMIN_ACTION',
      details,
    }),

  // System events
  systemError: (error: string, details?: any) =>
    createAuditLog({
      action: 'SYSTEM_ERROR',
      severity: 'CRITICAL',
      category: 'SYSTEM',
      details: { error, ...details },
    }),

  integrationFailure: (service: string, details?: any) =>
    createAuditLog({
      action: 'INTEGRATION_FAILURE',
      severity: 'CRITICAL',
      category: 'SYSTEM',
      details: { service, ...details },
    }),

  performanceWarning: (operation: string, details?: any) =>
    createAuditLog({
      action: 'PERFORMANCE_WARNING',
      severity: 'WARNING',
      category: 'SYSTEM',
      details: { operation, ...details },
    }),

  // User actions
  enrollmentRequested: (userId: string, sectionId: string, details?: any) =>
    createAuditLog({
      userId,
      action: 'ENROLLMENT_REQUESTED',
      targetType: 'Section',
      targetId: sectionId,
      severity: 'INFO',
      category: 'USER_ACTION',
      details,
    }),

  enrollmentApproved: (instructorId: string, enrollmentId: string, details?: any) =>
    createAuditLog({
      userId: instructorId,
      action: 'ENROLLMENT_APPROVED',
      targetType: 'Enrollment',
      targetId: enrollmentId,
      severity: 'INFO',
      category: 'USER_ACTION',
      details,
    }),

  enrollmentRejected: (instructorId: string, enrollmentId: string, details?: any) =>
    createAuditLog({
      userId: instructorId,
      action: 'ENROLLMENT_REJECTED',
      targetType: 'Enrollment',
      targetId: enrollmentId,
      severity: 'WARNING',
      category: 'USER_ACTION',
      details,
    }),

  assignmentGraded: (instructorId: string, submissionId: string, details?: any) =>
    createAuditLog({
      userId: instructorId,
      action: 'ASSIGNMENT_GRADED',
      targetType: 'Submission',
      targetId: submissionId,
      severity: 'INFO',
      category: 'USER_ACTION',
      details,
    }),
}
