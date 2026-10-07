import { RoleName } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  [RoleName.ADMIN]: [
    'manage_users',
    'manage_roles',
    'manage_rooms',
    'manage_courses',
    'manage_sections',
    'manage_enrollments',
    'view_audit_logs',
    'manage_settings',
    'view_reports',
  ],
  [RoleName.MODERATOR]: [
    'manage_enrollments',
    'manage_content',
    'view_courses',
  ],
  [RoleName.INSTRUCTOR]: [
    'create_courses',
    'manage_own_courses',
    'create_lessons',
    'create_assignments',
    'grade_submissions',
    'view_enrollments',
    'manage_schedules',
  ],
  [RoleName.STUDENT]: [
    'view_courses',
    'enroll_courses',
    'view_timetable',
    'submit_assignments',
    'view_grades',
  ],
}

// Helper function to check if a role has a specific permission
export function hasPermission(role: RoleName, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

// Helper function to check if a role has any of the specified permissions
export function hasAnyPermission(role: RoleName, permissions: string[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission))
}

// Helper function to check if a role has all of the specified permissions
export function hasAllPermissions(role: RoleName, permissions: string[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission))
}

// Get current session with role
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

// Middleware helpers for API routes
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireRole(allowedRoles: RoleName[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden: Insufficient permissions')
  }
  return user
}

export async function requirePermission(permission: string) {
  const user = await requireAuth()
  if (!hasPermission(user.role, permission)) {
    throw new Error(`Forbidden: Missing permission '${permission}'`)
  }
  return user
}

// Check if user is admin
export async function requireAdmin() {
  return requireRole([RoleName.ADMIN])
}

// Check if user is instructor
export async function requireInstructor() {
  return requireRole([RoleName.INSTRUCTOR, RoleName.ADMIN])
}

// Check if user is moderator or admin
export async function requireModerator() {
  return requireRole([RoleName.MODERATOR, RoleName.ADMIN])
}

// ==============================================================================
// Resource-specific Authorization Helpers (IDOR Protection)
// ==============================================================================

import { prisma } from './prisma'

/**
 * Check if user can access a specific submission
 * Rules: Student can only access their own submissions, Instructors can access submissions for their courses, Admins can access all
 */
export async function canAccessSubmission(userId: string, userRole: RoleName, submissionId: string): Promise<boolean> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        include: {
          section: {
            select: { instructorId: true }
          }
        }
      }
    }
  })

  if (!submission) return false

  // Admin can access all
  if (userRole === RoleName.ADMIN) return true

  // Student can only access their own
  if (userRole === RoleName.STUDENT) {
    return submission.studentId === userId
  }

  // Instructor can access submissions for their sections
  if (userRole === RoleName.INSTRUCTOR) {
    return submission.assignment.section.instructorId === userId
  }

  return false
}

/**
 * Check if user can access a specific assignment
 * Rules: Students can access assignments they're enrolled in, Instructors can access their own assignments, Admins can access all
 */
export async function canAccessAssignment(userId: string, userRole: RoleName, assignmentId: string): Promise<boolean> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      section: {
        select: {
          instructorId: true,
          enrollments: {
            select: { userId: true, status: true }
          }
        }
      }
    }
  })

  if (!assignment) return false

  // Admin can access all
  if (userRole === RoleName.ADMIN) return true

  // Instructor can access their own assignments
  if (userRole === RoleName.INSTRUCTOR) {
    return assignment.section.instructorId === userId
  }

  // Student can access if enrolled
  if (userRole === RoleName.STUDENT) {
    return assignment.section.enrollments.some(
      e => e.userId === userId && e.status === 'ENROLLED'
    )
  }

  return false
}

/**
 * Check if user can modify a specific assignment
 * Rules: Only instructors who own the assignment and admins
 */
export async function canModifyAssignment(userId: string, userRole: RoleName, assignmentId: string): Promise<boolean> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      section: {
        select: { instructorId: true }
      }
    }
  })

  if (!assignment) return false

  // Admin can modify all
  if (userRole === RoleName.ADMIN) return true

  // Instructor can modify their own
  if (userRole === RoleName.INSTRUCTOR) {
    return assignment.section.instructorId === userId || assignment.createdById === userId
  }

  return false
}

/**
 * Check if user can access an enrollment
 * Rules: Student can access their own, Instructors can access enrollments for their sections, Moderators/Admins can access all
 */
export async function canAccessEnrollment(userId: string, userRole: RoleName, enrollmentId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      section: {
        select: { instructorId: true }
      }
    }
  })

  if (!enrollment) return false

  // Admin and Moderator can access all
  if (userRole === RoleName.ADMIN || userRole === RoleName.MODERATOR) return true

  // Instructor can access enrollments for their sections
  if (userRole === RoleName.INSTRUCTOR) {
    return enrollment.section.instructorId === userId
  }

  // Student can access their own
  if (userRole === RoleName.STUDENT) {
    return enrollment.userId === userId
  }

  return false
}

/**
 * Check if user can access a course
 */
export async function canAccessCourse(userId: string, userRole: RoleName, courseId: string): Promise<boolean> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        select: {
          instructorId: true,
          enrollments: {
            select: { userId: true }
          }
        }
      }
    }
  })

  if (!course) return false

  // Admin can access all
  if (userRole === RoleName.ADMIN || userRole === RoleName.MODERATOR) return true

  // Instructor can access if they teach any section
  if (userRole === RoleName.INSTRUCTOR) {
    return course.sections.some(s => s.instructorId === userId) || course.createdById === userId
  }

  // Student can access if enrolled in any section
  if (userRole === RoleName.STUDENT) {
    return course.sections.some(s =>
      s.enrollments.some(e => e.userId === userId)
    )
  }

  return false
}

/**
 * Check if user can access a section
 */
export async function canAccessSection(userId: string, userRole: RoleName, sectionId: string): Promise<boolean> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      enrollments: {
        select: { userId: true, status: true }
      }
    }
  })

  if (!section) return false

  // Admin and Moderator can access all
  if (userRole === RoleName.ADMIN || userRole === RoleName.MODERATOR) return true

  // Instructor can access their own sections
  if (userRole === RoleName.INSTRUCTOR) {
    return section.instructorId === userId
  }

  // Student can access if enrolled
  if (userRole === RoleName.STUDENT) {
    return section.enrollments.some(
      e => e.userId === userId && e.status === 'ENROLLED'
    )
  }

  return false
}

/**
 * Check if user can access a file
 */
export async function canAccessFile(userId: string, userRole: RoleName, fileId: string): Promise<boolean> {
  const file = await prisma.file.findUnique({
    where: { id: fileId }
  })

  if (!file) return false

  // Admin can access all
  if (userRole === RoleName.ADMIN) return true

  // User can access their own files
  return file.ownerId === userId
}

/**
 * Generic authorization error response
 */
export function forbiddenResponse(message: string = 'You do not have permission to access this resource') {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Unauthorized error response
 */
export function unauthorizedResponse(message: string = 'Authentication required') {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Not found error response
 */
export function notFoundResponse(message: string = 'Resource not found') {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}
