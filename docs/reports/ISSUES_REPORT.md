# Educy Platform - Issues Analysis Report

**Generated:** 2026-01-12
**Status:** Comprehensive analysis complete
**Total Issues Found:** 18

---

## Executive Summary

The Educy platform is largely well-built with good security practices, but several critical issues were identified that could impact functionality, security, and user experience. The most severe issues relate to the incomplete MODERATOR role implementation and potential data integrity problems with file uploads.

---

## Critical Issues (Priority 1)

### 1. Missing MODERATOR Portal Implementation
**Severity:** CRITICAL
**Category:** Missing Features
**Impact:** Users with MODERATOR role cannot access their designated interface

**Details:**
- MODERATOR role exists in database schema (`prisma/schema.prisma:15`)
- MODERATOR has defined permissions in RBAC system (`lib/rbac.ts:18-22`)
- Dashboard redirects MODERATOR to `/admin` (`app/dashboard/page.tsx:19`)
- BUT: No `/app/moderator/` pages exist
- AND: No `/app/api/moderator/` routes exist
- TypeScript build errors confirm missing files (`.next/types/app/moderator/`)

**Affected Files:**
- `app/moderator/page.tsx` - MISSING
- `app/moderator/enrollments/page.tsx` - MISSING
- `app/moderator/courses/page.tsx` - MISSING
- `app/api/moderator/enrollments/route.ts` - MISSING
- `app/api/moderator/courses/route.ts` - MISSING

**Fix:**
Create MODERATOR portal with:
1. Main dashboard page (`app/moderator/page.tsx`)
2. Enrollments management page (`app/moderator/enrollments/page.tsx`)
3. Courses view page (`app/moderator/courses/page.tsx`)
4. API routes for enrollment approval/rejection
5. Update middleware to protect `/moderator/*` routes

---

### 2. File Upload Creates Orphaned Database Records
**Severity:** CRITICAL
**Category:** Data Integrity
**Impact:** Database pollution, storage inconsistency

**Details:**
File record is created in database BEFORE the file is actually uploaded to R2 storage.

**Location:** `app/api/files/upload-url/route.ts:48-56`

```typescript
// Create file record in database
const file = await prisma.file.create({
  data: {
    ownerId: user.id,
    key: fileKey,
    filename: data.filename,
    mimeType: data.contentType,
    sizeBytes: data.sizeBytes,
  },
})

return NextResponse.json({
  uploadUrl,
  fileId: file.id,
  fileKey,
})
```

**Problem Scenarios:**
1. User gets presigned URL and file record is created
2. User never uploads the file (closes browser, network error, etc.)
3. Database now contains orphaned file record pointing to non-existent file
4. Over time, database fills with phantom files

**Fix:**
Two-phase approach:
1. Create file record with `status: 'PENDING'`
2. Add webhook or callback endpoint to confirm upload
3. Mark file as `status: 'UPLOADED'` after successful upload
4. Add cleanup job to delete PENDING files older than 24 hours

**Alternative Fix:**
Create file record AFTER successful upload confirmation.

---

### 3. Middleware Doesn't Protect /moderator Routes
**Severity:** HIGH
**Category:** Security
**Impact:** Authorization bypass potential

**Details:**
Middleware configuration only protects specific role-based routes but omits `/moderator`.

**Location:** `middleware.ts:40-50`

```typescript
export const config = {
  matcher: [
    '/admin/:path*',
    '/instructor/:path*',
    '/student/:path*',
    '/dashboard/:path*',
    '/api/admin/:path*',
    '/api/instructor/:path*',
    '/api/student/:path*',
  ],
}
```

**Missing:**
- `/moderator/:path*`
- `/api/moderator/:path*`

**Fix:**
Add moderator routes to middleware matcher and role check.

---

## High Priority Issues

### 4. MODERATOR Role Inconsistently Checked
**Severity:** HIGH
**Category:** Authorization
**Impact:** Permission bypass

**Details:**
`/api/enrollments/pending` route checks for INSTRUCTOR and ADMIN but comment says "Moderators and admins".

**Location:** `app/api/enrollments/pending/route.ts:16-21`

```typescript
// Only instructors and admins can view pending enrollments
if (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN') {
  return NextResponse.json(
    { success: false, error: 'Forbidden' },
    { status: 403 }
  )
}
```

Line 52 comment says "Moderators and admins see all pending enrollments" but MODERATOR isn't actually checked.

**Fix:**
```typescript
if (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
  return NextResponse.json(
    { success: false, error: 'Forbidden' },
    { status: 403 }
  )
}
```

OR use the helper:
```typescript
const user = await requireRole([RoleName.INSTRUCTOR, RoleName.MODERATOR, RoleName.ADMIN])
```

---

### 5. Missing Database Indexes on Frequently Queried Fields
**Severity:** HIGH
**Category:** Performance
**Impact:** Slow queries as data grows

**Details:**
Several fields are queried frequently but lack indexes:

**Missing Indexes:**
1. `Enrollment.status` - Filtered in multiple queries
2. `Section.term` - Filtered for course listings
3. `Section.instructorId` - Used for instructor course filtering
4. `Assignment.dueDate` - Used for sorting/filtering assignments
5. `Notification.readAt` - Used to find unread notifications
6. `AuditLog.action` - Used for filtering logs
7. `AuditLog.severity` - Used for filtering critical logs
8. `File.ownerId` - Used to find user's files

**Fix:**
Add indexes to `schema.prisma`:

```prisma
model Enrollment {
  // ...
  @@unique([userId, sectionId])
  @@index([status])
  @@index([sectionId, status])
}

model Section {
  // ...
  @@index([term])
  @@index([instructorId])
  @@index([courseId, term])
}

model Assignment {
  // ...
  @@index([sectionId])
  @@index([dueDate])
}

model Notification {
  // ...
  @@index([userId, readAt])
}

model AuditLog {
  // ...
  @@index([action])
  @@index([severity])
  @@index([userId])
  @@index([createdAt])
}

model File {
  // ...
  @@index([ownerId])
}
```

---

## Medium Priority Issues

### 6. No Rate Limiting on Email Sending
**Severity:** MEDIUM
**Category:** Security / Resource Management
**Impact:** Email abuse, rate limit exhaustion

**Details:**
Discovered during bulk import - Resend API has 2 emails/second limit but code doesn't handle this.

**Location:** `lib/email.ts`, `app/api/admin/users/import/route.ts:189-211`

**Evidence:**
During bulk import, hit rate limit: "Too many requests. You can only make 2 requests per second."

**Fix:**
Add rate limiting middleware or delay between emails:
```typescript
// In bulk import
for (let i = 0; i < users.length; i++) {
  await sendWelcomeEmail(...)
  if (i < users.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 600)) // 600ms delay = <2/sec
  }
}
```

---

### 7. No Validation of materialIds Array in Lesson
**Severity:** MEDIUM
**Category:** Data Integrity
**Impact:** Broken references

**Details:**
Lesson model has `materialIds String[]` but there's no validation that these IDs exist in File table.

**Location:** `prisma/schema.prisma:151`, `app/api/sections/[id]/lessons/route.ts`

**Problem:**
- Can add non-existent file IDs
- Files can be deleted while still referenced
- No foreign key constraint

**Fix:**
Either:
1. Create junction table `LessonMaterial` with proper foreign keys
2. Add validation in API route to check file existence
3. Add cleanup when files are deleted

---

### 8. Assignment Submission Doesn't Verify File Ownership
**Severity:** MEDIUM
**Category:** Security
**Impact:** Students could submit other users' files

**Details:**
When submitting assignment with `fileKey`, there's no check that the file belongs to the submitting student.

**Location:** `app/api/assignments/[id]/submissions/route.ts:60-66`

```typescript
const submission = await prisma.submission.create({
  data: {
    assignmentId: params.id,
    studentId: user.id,
    fileKey: data.fileKey, // No ownership check!
    text: data.text,
  },
  // ...
})
```

**Fix:**
```typescript
if (data.fileKey) {
  const file = await prisma.file.findUnique({
    where: { key: data.fileKey },
  })

  if (!file || file.ownerId !== user.id) {
    return NextResponse.json(
      { success: false, error: 'File not found or access denied' },
      { status: 403 }
    )
  }
}
```

---

### 9. No Check for Past Due Date on Assignment Submission
**Severity:** MEDIUM
**Category:** Business Logic
**Impact:** Late submissions not tracked

**Details:**
Students can submit assignments after due date with no warning or flag.

**Location:** `app/api/assignments/[id]/submissions/route.ts:59`

**Current Behavior:**
Submission is accepted regardless of due date.

**Fix:**
```typescript
const isLate = new Date() > new Date(assignment.dueDate)

const submission = await prisma.submission.create({
  data: {
    assignmentId: params.id,
    studentId: user.id,
    fileKey: data.fileKey,
    text: data.text,
    isLate, // Add this field to schema
  },
})

if (isLate) {
  return NextResponse.json({
    success: true,
    submission,
    message: 'Assignment submitted successfully (LATE)',
    warning: 'This submission is past the due date',
  })
}
```

---

### 10. Enrollment Capacity Check Race Condition
**Severity:** MEDIUM
**Category:** Concurrency
**Impact:** Section over-enrollment (mitigated by transaction)

**Details:**
While the enrollment request uses a transaction, there's still a potential window between count and create.

**Location:** `app/api/enrollments/request/route.ts:32-99`

**Current Code:**
```typescript
const enrolledCount = await tx.enrollment.count({
  where: {
    sectionId: data.sectionId,
    status: 'ENROLLED',
  },
})

if (enrolledCount >= section.capacity) {
  throw new Error('Section is at full capacity')
}
```

**Status:** PARTIALLY MITIGATED
Transaction helps but not foolproof with concurrent requests.

**Better Fix:**
Use Prisma's atomic operations or database constraints:
```sql
ALTER TABLE enrollments ADD CONSTRAINT check_capacity
  CHECK ((SELECT COUNT(*) FROM enrollments WHERE section_id = section_id AND status = 'ENROLLED') <= (SELECT capacity FROM sections WHERE id = section_id));
```

---

### 11. Generic API Routes Not Protected by Middleware
**Severity:** MEDIUM
**Category:** Security
**Impact:** Potential unauthorized access

**Details:**
Middleware only protects role-specific API routes, leaving generic endpoints exposed.

**Location:** `middleware.ts:40-50`

**Unprotected routes:**
- `/api/courses/*`
- `/api/sections/*`
- `/api/lessons/*`
- `/api/assignments/*`
- `/api/submissions/*`
- `/api/files/*`
- `/api/enrollments/*`
- `/api/ai/*`

**Status:** LOW RISK
Each endpoint has `getCurrentUser()` or `requireAuth()` checks internally.

**Recommendation:**
Add catch-all to middleware for peace of mind:
```typescript
matcher: [
  '/admin/:path*',
  '/instructor/:path*',
  '/student/:path*',
  '/moderator/:path*',
  '/dashboard/:path*',
  '/api/*', // Protect all API routes
]
```

---

## Low Priority Issues

### 12. No Email Validation on User Creation
**Severity:** LOW
**Category:** Data Validation
**Impact:** Invalid emails in database

**Details:**
Basic regex used but doesn't catch all invalid emails.

**Location:** `app/api/admin/users/import/route.ts:104`

**Current:**
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

**Better:**
Use Zod's email validator or more robust regex.

---

### 13. Password Generation Uses Math.random for Shuffling
**Severity:** LOW
**Category:** Security (Minor)
**Impact:** Slightly reduced entropy

**Details:**
Password generation uses crypto for main generation but Math.random for shuffle.

**Location:** `lib/password.ts:28`

**Fix:**
Use crypto for entire generation:
```typescript
import crypto from 'crypto'

// Use crypto.randomInt for shuffling too
```

**Note:** Impact is minimal since main generation is cryptographically secure.

---

### 14. No Pagination on List Endpoints
**Severity:** LOW
**Category:** Performance
**Impact:** Slow responses with large datasets

**Details:**
API endpoints return all results without pagination:
- `/api/admin/users` - Returns all users
- `/api/enrollments/pending` - Returns all pending enrollments
- `/api/assignments/[id]/submissions` - Returns all submissions

**Fix:**
Add pagination parameters:
```typescript
const page = parseInt(searchParams.get('page') || '1')
const limit = parseInt(searchParams.get('limit') || '50')
const skip = (page - 1) * limit

const users = await prisma.user.findMany({
  skip,
  take: limit,
  // ...
})

const total = await prisma.user.count()

return NextResponse.json({
  data: users,
  pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  },
})
```

---

### 15. Missing Viewport Export in Root Layout
**Severity:** LOW
**Category:** Next.js 14 Compliance
**Impact:** Console warnings

**Details:**
Next.js 14 requires viewport metadata exported separately.

**Location:** `app/layout.tsx`

**Fix:**
```typescript
export const viewport = {
  width: 'device-width',
  initialScale: 1,
}
```

---

### 16. No Soft Delete for Critical Entities
**Severity:** LOW
**Category:** Data Management
**Impact:** Accidental data loss

**Details:**
Users, courses, enrollments use hard delete. No recovery possible.

**Fix:**
Add soft delete:
```prisma
model User {
  // ...
  deletedAt DateTime?

  @@index([deletedAt])
}
```

Filter out deleted records:
```typescript
where: { deletedAt: null }
```

---

### 17. Lesson Time Stored as String Instead of Time Type
**Severity:** LOW
**Category:** Data Modeling
**Impact:** Potential formatting inconsistencies

**Location:** `prisma/schema.prisma:147-148`

```prisma
startTime   String     // Format: "HH:MM"
endTime     String     // Format: "HH:MM"
```

**Issue:**
No type enforcement, could store "10:30 AM", "22:30", "630pm" inconsistently.

**Fix:**
Either:
1. Use `DateTime` with date set to epoch
2. Add validation in API routes
3. Use PostgreSQL `TIME` type

---

### 18. No Environment Variable Validation on Startup
**Severity:** LOW
**Category:** Configuration
**Impact:** Runtime errors

**Details:**
App doesn't validate required environment variables on startup.

**Fix:**
Create `lib/env.ts`:
```typescript
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  R2_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_ENDPOINT: z.string().url(),
  R2_BUCKET_NAME: z.string(),
  R2_PUBLIC_URL: z.string().url(),
  GEMINI_API_KEY: z.string(),
  RESEND_API_KEY: z.string(),
  RESEND_FROM_EMAIL: z.string().email(),
})

export const env = envSchema.parse(process.env)
```

---

## Summary by Severity

| Severity | Count | Issues |
|----------|-------|--------|
| **Critical** | 3 | Missing MODERATOR portal, orphaned file records, unprotected routes |
| **High** | 2 | Inconsistent role checks, missing database indexes |
| **Medium** | 6 | Rate limiting, file validation, business logic gaps |
| **Low** | 7 | Minor security, validation, and UX improvements |

---

## Recommended Action Plan

### Phase 1 (Immediate - Week 1)
1. ✅ Create MODERATOR portal pages and routes
2. ✅ Fix file upload orphan record issue
3. ✅ Add moderator routes to middleware
4. ✅ Fix MODERATOR role checks in enrollment routes

### Phase 2 (Short-term - Week 2)
5. ✅ Add database indexes
6. ✅ Add rate limiting to email sending
7. ✅ Add file ownership validation
8. ✅ Add late submission tracking

### Phase 3 (Medium-term - Month 1)
9. ✅ Add pagination to list endpoints
10. ✅ Implement soft delete for critical entities
11. ✅ Add environment variable validation
12. ✅ Improve password generation

### Phase 4 (Long-term - Backlog)
13. Create comprehensive test suite
14. Add monitoring and alerting
15. Implement audit log retention policy
16. Add email notification preferences

---

## Positive Findings

Despite the issues identified, the codebase demonstrates many **good practices**:

✅ **Excellent Security Foundation**
- NextAuth.js for authentication
- bcrypt for password hashing
- JWT session management
- Input validation with Zod on all routes
- SQL injection prevention via Prisma ORM
- Comprehensive RBAC system

✅ **Good Architecture**
- Well-organized file structure
- Separation of concerns (lib/, app/, components/)
- Type safety with TypeScript strict mode
- Transaction usage for critical operations
- Comprehensive audit logging

✅ **Production-Ready Features**
- Force dynamic routes (no caching issues)
- Error handling throughout
- Unique constraints prevent duplicates
- Cascade deletes for data cleanup

---

## Conclusion

The Educy platform has a **solid foundation** with good security practices and architecture. The critical issues identified are primarily **missing implementations** (MODERATOR portal) and **data integrity concerns** (file uploads) rather than fundamental security vulnerabilities.

**Overall Assessment:** Production-ready with recommended fixes applied
**Risk Level:** MEDIUM (mitigated to LOW after Phase 1 fixes)
**Code Quality:** HIGH (7.5/10)

Priority should be given to completing the MODERATOR role implementation and fixing the file upload flow before launching to production.
