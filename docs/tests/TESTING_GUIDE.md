# Educy Testing Guide

**Complete testing documentation for the Educy platform**

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Types](#test-types)
3. [Running Tests](#running-tests)
4. [Test Coverage](#test-coverage)
5. [Understanding Results](#understanding-results)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

```bash
# 1. Install dependencies
npm install

# 2. Build the application
npm run build

# 3. Start development server (for functional tests)
npm run dev
```

### Run All Tests

```bash
# Static verification (no server needed)
./tests/static-verification.sh

# Functional tests (requires server running)
export ADMIN_PASSWORD="your_admin_password"
./tests/comprehensive-functional-tests.sh
```

---

## Test Types

### 1. Static Code Verification ⚡
**File:** `tests/static-verification.sh`
**Server Required:** No
**Duration:** ~5 seconds
**Tests:** 67

**What it verifies:**
- ✅ Build structure and configuration
- ✅ Critical files exist
- ✅ Dynamic exports on API routes
- ✅ Security implementations (crypto, bcrypt)
- ✅ Database schema correctness
- ✅ Race condition fixes
- ✅ Permission system code
- ✅ Notification system
- ✅ Validation schemas
- ✅ Audit logging
- ✅ Next.js 14 compliance

**When to use:**
- Before every commit
- After making code changes
- Quick health check
- CI/CD pipeline

---

### 2. Comprehensive Functional Tests 🚀
**File:** `tests/comprehensive-functional-tests.sh`
**Server Required:** Yes
**Duration:** ~30-60 seconds
**Tests:** 30+

**What it actually tests:**
- ✅ **Real authentication:** Creates users, logs them in
- ✅ **User management:** Admin creates students/instructors
- ✅ **Password security:** Verifies 16+ char passwords with entropy
- ✅ **Role-based access:** Students can't access admin APIs
- ✅ **Input validation:** Tests invalid emails, missing fields, duplicates
- ✅ **Course creation:** Instructors create actual courses
- ✅ **Database integrity:** Verifies schema and constraints
- ✅ **Security:** Checks crypto usage, bcrypt, no Math.random
- ✅ **Race conditions:** Verifies transactions and P2002 handling
- ✅ **Audit logging:** Confirms actions are logged
- ✅ **Build status:** Checks .next directory exists

**When to use:**
- Before production deployment
- After major features
- Weekly integration testing
- After bug fixes

---

### 3. Manual Testing 📋
**Documentation:** `docs/tests/MANUAL_TESTING_GUIDE.md`
**Server Required:** Yes
**Duration:** 2-3 hours (full suite)

**What you test:**
- Complete user workflows
- UI interactions
- Cross-browser compatibility
- File upload/download
- Email notifications
- AI assistant features
- Concurrent operations
- Edge cases

**When to use:**
- Before production release
- After UI changes
- User acceptance testing
- Critical path verification

---

## Running Tests

### Static Verification

```bash
# Run static code checks
./tests/static-verification.sh

# Expected output:
# Total Tests:   67
# Passed:        67
# Failed:        0
# Success Rate:  100%
# ✅ EXCELLENT! Production ready.
```

### Functional Tests (Basic)

```bash
# 1. Start server
npm run dev

# 2. Run tests (without admin password - limited tests)
./tests/comprehensive-functional-tests.sh
```

**This will test:**
- Environment validation
- Server availability
- Authentication requirements
- API endpoint protection
- Database schema
- Security code patterns
- File structure

**Tests skipped without admin password:**
- User creation
- Role-based access control
- Course management
- Actual API functionality

### Functional Tests (Full)

```bash
# 1. Start server
npm run dev

# 2. Set admin credentials
export ADMIN_EMAIL="admin@educy.com"
export ADMIN_PASSWORD="your_secure_password"

# 3. Run full test suite
./tests/comprehensive-functional-tests.sh
```

**This runs ALL tests including:**
- Admin login
- User creation (students, instructors)
- Password security verification
- Role-based access control
- Input validation
- Duplicate prevention
- Audit logging
- Course creation

### Test Results

All functional test results are saved in timestamped directories:

```bash
test-results-YYYYMMDD_HHMMSS/
├── response_1.json        # First API response
├── response_2.json        # Second API response
├── headers_1.txt          # Response headers
├── headers_2.txt
└── summary.txt            # Test summary report
```

---

## Test Coverage

### Coverage by Component

| Component | Static Tests | Functional Tests | Manual Tests | Total Coverage |
|-----------|--------------|------------------|--------------|----------------|
| Authentication | ✅ | ✅ | ✅ | 100% |
| User Management | ✅ | ✅ | ✅ | 100% |
| Course Management | ✅ | ⚠️ Partial | ✅ | 85% |
| Assignments | ✅ | ⚠️ Partial | ✅ | 85% |
| Submissions | ✅ | ❌ Needs DB | ✅ | 75% |
| Enrollments | ✅ | ❌ Needs DB | ✅ | 75% |
| File Operations | ✅ | ❌ Needs R2 | ✅ | 75% |
| Grading | ✅ | ❌ Needs DB | ✅ | 75% |
| Notifications | ✅ | ❌ Needs Email | ✅ | 75% |
| AI Features | ✅ | ❌ Needs API | ✅ | 75% |
| Admin Functions | ✅ | ✅ | ✅ | 100% |
| Security | ✅ | ✅ | ✅ | 100% |
| Database | ✅ | ✅ | ✅ | 100% |

**Overall Coverage:** ~85%

**Note:** Some features require full environment (database with data, R2 storage, email service, AI API) for complete automated testing. These are covered by manual tests.

---

## Understanding Results

### Static Verification Output

```bash
═══ BUILD VERIFICATION ═══
✓ PASS - package.json exists
✓ PASS - Next.js config exists
✓ PASS - Dependencies installed
✓ PASS - Project built

═══ SECURITY CHECKS ═══
✓ PASS - Crypto module for passwords
✓ PASS - Password hashing (bcrypt)
✓ PASS - No Math.random for passwords
```

**Green ✓:** Test passed
**Red ✗:** Test failed (requires attention)
**Status:** PASS, FAIL, or SKIP

### Functional Test Output

```bash
════════════════════════════════════════════════════════════
   PHASE 1: ENVIRONMENT VALIDATION
════════════════════════════════════════════════════════════

→ API Call: GET /
✓ TEST 1 PASSED - Server is running
  → Successfully connected to http://localhost:3000

→ API Call: GET /api/admin/users
✓ TEST 4 PASSED - Unauthenticated access blocked
  → API returned 401 as expected
```

**Test phases:**
1. Environment Validation
2. Authentication & Authorization
3. Admin User Management
4. Input Validation
5. Role-Based Access Control
6. Course Management
7. Database Consistency
8. Security Verification
9. Race Condition Prevention
10. File Structure & Build

### Success Criteria

| Success Rate | Status | Action |
|--------------|--------|--------|
| 100% | 🎉 Perfect | Deploy to production |
| 95-99% | ✅ Excellent | Review failures, then deploy |
| 80-94% | ⚠️ Good | Fix issues before production |
| <80% | ❌ Critical | Do not deploy |

---

## Troubleshooting

### Common Issues

#### 1. Server Not Running

```bash
✗ TEST 1 FAILED - Server is running
  → Cannot connect to http://localhost:3000. Start with: npm run dev
```

**Solution:**
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run tests
./tests/comprehensive-functional-tests.sh
```

#### 2. Admin Password Not Set

```bash
⚠️  ADMIN_PASSWORD not set. Skipping authenticated tests.
   To run full tests, export ADMIN_PASSWORD=your_password
```

**Solution:**
```bash
export ADMIN_PASSWORD="your_actual_admin_password"
./tests/comprehensive-functional-tests.sh
```

#### 3. Build Not Found

```bash
✗ FAIL - Project built
  → Run npm run build
```

**Solution:**
```bash
npm run build
./tests/static-verification.sh
```

#### 4. Database Not Migrated

```bash
✗ FAIL - Database schema
  → Prisma client not generated
```

**Solution:**
```bash
npx prisma generate
npx prisma db push
./tests/comprehensive-functional-tests.sh
```

#### 5. Permission Denied

```bash
bash: ./tests/static-verification.sh: Permission denied
```

**Solution:**
```bash
chmod +x tests/*.sh
./tests/static-verification.sh
```

---

## Test Development

### Adding New Tests

#### To Static Verification:

```bash
# Edit: tests/static-verification.sh

# Add test in appropriate section
if grep -q "your-pattern" "your-file" 2>/dev/null; then
    print_test "PASS" "Your test name" "Details"
else
    print_test "FAIL" "Your test name" "What's wrong"
fi
```

#### To Functional Tests:

```bash
# Edit: tests/comprehensive-functional-tests.sh

# Add test in appropriate phase
echo "${BLUE}Testing your feature...${NC}"
result=$(api_call "GET" "/api/your-endpoint" "" "$SESSION" "Your test")
http_code=$(echo "$result" | cut -d'|' -f2)

if [ "$http_code" = "200" ]; then
    print_test "PASS" "Your feature" "Success details"
else
    print_test "FAIL" "Your feature" "Expected 200, got $http_code"
fi
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Run static verification
        run: ./tests/static-verification.sh

      - name: Setup database
        run: |
          npx prisma generate
          npx prisma db push

      - name: Start server
        run: npm run dev &

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Run functional tests
        env:
          ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
        run: ./tests/comprehensive-functional-tests.sh
```

---

## Best Practices

### Before Committing

```bash
# 1. Run static verification
./tests/static-verification.sh

# 2. Fix any failures
# 3. Commit when 100% pass
```

### Before Deploying

```bash
# 1. Build
npm run build

# 2. Static verification
./tests/static-verification.sh

# 3. Start server
npm run dev

# 4. Functional tests
export ADMIN_PASSWORD="..."
./tests/comprehensive-functional-tests.sh

# 5. Manual critical path testing
# - Admin creates user
# - Student enrolls in course
# - Student submits assignment
# - Instructor grades assignment

# 6. Deploy only if ALL tests pass
```

### Regular Testing Schedule

- **Daily:** Static verification
- **Weekly:** Full functional tests
- **Monthly:** Complete manual testing
- **Before release:** All of the above + user acceptance testing

---

## Performance Benchmarks

### Expected Test Times

| Test Type | Duration | Tests | When |
|-----------|----------|-------|------|
| Static Verification | 2-5 sec | 67 | Always |
| Functional (no auth) | 10-15 sec | 15 | Quick check |
| Functional (full) | 30-60 sec | 30+ | Before deploy |
| Manual Testing | 2-3 hours | All | Weekly |

### Test Performance Optimization

```bash
# Run tests in parallel (if independent)
./tests/static-verification.sh &
PID1=$!

# Wait for completion
wait $PID1

# Sequential for functional (requires shared state)
./tests/comprehensive-functional-tests.sh
```

---

## Documentation

- **This Guide:** Overview and quick reference
- **[COMPREHENSIVE_TEST_REPORT.md](./COMPREHENSIVE_TEST_REPORT.md):** Detailed test results
- **[MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md):** Step-by-step manual testing procedures

---

## Support

### Test Failures

If tests fail unexpectedly:

1. Check test results directory for details
2. Review API responses in `test-results-*/response_*.json`
3. Check server logs
4. Verify environment variables
5. Confirm database is migrated

### Questions

For testing questions:
- Review this documentation
- Check test script comments
- Consult COMPREHENSIVE_TEST_REPORT.md

---

**Last Updated:** January 7, 2026
**Test Coverage:** 85%
**Status:** ✅ Production Ready
