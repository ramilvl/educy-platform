# Security Documentation - Educy Platform

**Last Updated:** January 15, 2026
**Version:** 1.3.0

## Overview

This document outlines the security measures implemented in the Educy educational management platform.

---

## 🔐 Authentication & Authorization

### Authentication
- **NextAuth.js** with JWT strategy
- **Session Duration:** 24 hours
- **Password Requirements:**
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
- **Password Hashing:** bcrypt with 10 rounds
- **Session Cookies:** HTTPOnly, Secure (production), SameSite=Lax

### Authorization
- **Role-Based Access Control (RBAC)** with 4 roles:
  - `ADMIN` - Full system access
  - `MODERATOR` - Enrollment and content management
  - `INSTRUCTOR` - Course and student management
  - `STUDENT` - Course access and submissions

### IDOR Protection
Resource-level authorization functions in `/lib/rbac.ts`:
- `canAccessSubmission()` - Validates submission ownership
- `canAccessAssignment()` - Validates assignment access
- `canAccessEnrollment()` - Validates enrollment access
- `canAccessCourse()` - Validates course access
- `canAccessSection()` - Validates section access
- `canAccessFile()` - Validates file ownership

---

## 🛡️ Security Measures Implemented

### 1. Input Validation
- **Zod schemas** for all API endpoints
- Type-safe request handling
- Server-side validation of all user inputs

### 2. SQL Injection Prevention
- All database queries use **Prisma ORM**
- No raw SQL queries
- Parameterized queries only

### 3. Rate Limiting
Implemented on critical endpoints:

| Endpoint | Limit | Window | Lockout |
|----------|-------|--------|---------|
| Login | 5 attempts | 15 min | 1 hour |
| Registration | 3 attempts | 1 hour | None |
| Password Reset | 3 attempts | 1 hour | None |
| Certificate Issuance | 10 attempts | 1 hour | None |
| Grade Submission | 50 attempts | 1 hour | None |
| Enrollment Actions | 30 attempts | 1 hour | None |
| Payment Recording | 20 attempts | 1 hour | None |
| User Import | 3 attempts | 1 hour | None |

**Implementation:** `/lib/ratelimit.ts` with in-memory store (upgradeable to Redis)

### 4. File Upload Security
- **Server-side file size limits:**
  - Global maximum: 100MB
  - Assignments: 50MB
  - Profile images: 5MB
  - General uploads: 10MB (default)
- **File type validation**
- **Pre-signed URLs** for secure uploads/downloads (R2 storage)
- **File ownership validation** before operations
- **Two-phase upload:** PENDING → UPLOADED status

### 5. Audit Logging
All critical actions logged to `audit_logs` table:
- User authentication (success/failure)
- Role changes
- Enrollment actions
- Grade submissions
- Certificate issuance
- Course CRUD operations
- Payment recording
- File operations

**Severity Levels:** INFO, WARNING, CRITICAL
**Categories:** SECURITY, SYSTEM, ADMIN_ACTION, USER_ACTION

### 6. Failed Login Attempt Tracking
- Logs failed login attempts with user context
- Tracks reason (user not found, invalid password)
- Severity: WARNING
- Category: SECURITY
- Enables brute force attack detection

### 7. Case Room Access Control
**Security Fix Applied (Jan 15, 2026):**
- Students can only view case room posts for courses they're enrolled in
- Instructors can only view posts for sections they teach
- Admins and moderators have full access
- **File ownership validation:** Students can only attach their own files to posts

### 8. Debug Endpoints Protection
**Security Hardening:**
- Debug endpoints (`/api/debug/**`) completely disabled in production
- No environment variable override allowed
- Development-only access for admin users

### 9. Payment Validation
**Security Fix Applied:**
- Validates studentId refers to an actual user with STUDENT role
- Prevents invalid payment records
- Prevents payments assigned to non-students

---

## ⚠️ CSRF Protection Status

### Current Implementation
NextAuth configures CSRF tokens:
```typescript
csrfToken: {
  name: `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}next-auth.csrf-token`,
  options: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  },
}
```

### Limitations
- ⚠️ **CSRF tokens are NOT currently validated** on state-changing API endpoints
- NextAuth protects its own routes, but custom API routes lack CSRF validation
- Mitigation: SameSite=Lax cookies provide some protection

### Recommendation
**FUTURE ENHANCEMENT:** Implement CSRF middleware for all POST/PUT/DELETE/PATCH endpoints.

**Why not implemented yet:**
- Requires careful coordination with Next.js App Router
- Need to ensure compatibility with API route handlers
- Should be implemented before handling sensitive financial transactions

**Workaround:**
- All API routes require authentication
- SameSite cookie policy provides partial protection
- HTTPS enforced in production

---

## 🔒 Password Security

### Storage
- **bcrypt hashing** with 10 rounds
- No plaintext passwords stored
- Optional password field (for imported users pending activation)

### Reset Tokens
- Generated using `crypto.randomBytes(32)`
- Hashed before storage
- 1-hour expiration
- Single-use only (deleted after successful reset)

### Email Enumeration Prevention
- Generic error messages on password reset
- No disclosure of account existence
- Rate limiting prevents enumeration attacks

---

## 📊 Security Headers

### Production Headers
Set via Next.js configuration:
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## 🚨 Security Incident Response

### Monitoring
- Failed login attempts logged with severity WARNING
- Audit logs track all critical actions
- Rate limit violations logged to console

### Recommended Monitoring Setup
1. Set up log aggregation (e.g., DataDog, Sentry)
2. Alert on:
   - Multiple failed login attempts from same IP
   - Unusual rate limit violations
   - CRITICAL severity audit logs
   - Role changes
   - Admin account creation

### Incident Response
1. **Identify:** Check audit logs for unusual activity
2. **Contain:** Suspend affected accounts if needed
3. **Investigate:** Review audit trail
4. **Remediate:** Reset passwords, revoke sessions
5. **Document:** Update this document with lessons learned

---

## 🔍 Security Testing Checklist

### Manual Testing
- [ ] IDOR vulnerabilities (try accessing other users' resources)
- [ ] Rate limiting (exceed limits on each endpoint)
- [ ] File upload (attempt oversized/invalid files)
- [ ] Authentication bypass attempts
- [ ] Privilege escalation (student trying admin endpoints)
- [ ] SQL injection (special characters in inputs)
- [ ] XSS (script injection attempts)

### Automated Testing
- [ ] OWASP ZAP security scan
- [ ] npm audit (dependency vulnerabilities)
- [ ] Snyk scan
- [ ] SonarQube code analysis

---

## 📋 Security Improvements Implemented (Jan 15, 2026)

### Critical Fixes
1. ✅ **Case Room Enrollment Bypass** - Added enrollment verification in GET /api/case-rooms/[id]/posts
2. ✅ **File Ownership Validation** - Validate file ownership in case room posts
3. ✅ **Debug Endpoints** - Completely disabled in production (no override)

### High Priority Fixes
4. ✅ **Rate Limiting** - Added to 5 critical endpoints (certificates, grading, enrollments, payments)
5. ✅ **Payment Validation** - Validate studentId is an actual STUDENT
6. ✅ **File Size Limits** - Server-side enforcement, no client override
7. ✅ **Failed Login Logging** - Track all failed authentication attempts

---

## 🎯 Future Security Enhancements

### Short-term (1-2 weeks)
- [ ] Implement CSRF token validation middleware
- [ ] Role-based session durations (shorter for admins)
- [ ] Strengthen password requirements (12+ chars, special characters)
- [ ] Implement password strength meter (zxcvbn)

### Medium-term (1 month)
- [ ] Add security headers middleware
- [ ] Implement Content Security Policy
- [ ] Add API request signing
- [ ] Implement anomaly detection

### Long-term (Strategic)
- [ ] Move to Redis-based rate limiting
- [ ] Implement Web Application Firewall (WAF)
- [ ] Regular penetration testing
- [ ] Bug bounty program
- [ ] Security awareness training for developers

---

## 📞 Security Contact

For security issues, please report to:
- **GitHub Security Advisories:** https://github.com/[your-repo]/security/advisories
- **Email:** security@educy.com (if applicable)

**Please do NOT open public issues for security vulnerabilities.**

---

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)
- [Prisma Security](https://www.prisma.io/docs/guides/security)

---

**Document Maintained By:** Development Team
**Review Frequency:** Quarterly or after major security changes
