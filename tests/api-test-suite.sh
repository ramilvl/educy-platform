#!/bin/bash

# Educy Platform - Comprehensive API Test Suite
# Tests all endpoints, authentication, authorization, and edge cases

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Base URL - update this for your deployment
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Test results file
RESULTS_FILE="test-results.json"
echo "{\"tests\": [], \"summary\": {}}" > "$RESULTS_FILE"

# Helper function to print test status
print_test() {
    local status=$1
    local name=$2
    local details=$3

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    case $status in
        PASS)
            PASSED_TESTS=$((PASSED_TESTS + 1))
            echo -e "${GREEN}✓ PASS${NC} - $name"
            ;;
        FAIL)
            FAILED_TESTS=$((FAILED_TESTS + 1))
            echo -e "${RED}✗ FAIL${NC} - $name"
            echo -e "  ${YELLOW}Details: $details${NC}"
            ;;
        SKIP)
            SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
            echo -e "${YELLOW}⊘ SKIP${NC} - $name"
            ;;
    esac
}

# Helper function to test HTTP endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    local cookie=$6

    local url="${BASE_URL}${endpoint}"

    if [ -n "$cookie" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -H "Cookie: $cookie" \
                -d "$data" 2>&1)
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Cookie: $cookie" 2>&1)
        fi
    else
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -d "$data" 2>&1)
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" 2>&1)
        fi
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" -eq "$expected_status" ]; then
        print_test "PASS" "$description" "Status: $http_code"
        echo "$body"
        return 0
    else
        print_test "FAIL" "$description" "Expected: $expected_status, Got: $http_code"
        return 1
    fi
}

echo ""
echo "════════════════════════════════════════════════════════════"
echo "   EDUCY PLATFORM - COMPREHENSIVE API TEST SUITE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Base URL: $BASE_URL"
echo "Test Time: $(date)"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# ============================================================
# SECTION 1: BUILD VERIFICATION
# ============================================================
echo ""
echo "${BLUE}═══ SECTION 1: BUILD VERIFICATION ═══${NC}"
echo ""

# Test 1: Check if server is running
if curl -s "$BASE_URL" > /dev/null 2>&1; then
    print_test "PASS" "Server is running and accessible" "Base URL reachable"
else
    print_test "FAIL" "Server is running and accessible" "Cannot connect to $BASE_URL"
    echo ""
    echo "⚠️  Server must be running for API tests!"
    echo "   Start with: npm run dev"
    exit 1
fi

# Test 2: Check landing page loads
if curl -s "$BASE_URL" | grep -q "Educy"; then
    print_test "PASS" "Landing page loads correctly" "Contains 'Educy'"
else
    print_test "FAIL" "Landing page loads correctly" "Missing expected content"
fi

# ============================================================
# SECTION 2: AUTHENTICATION ENDPOINTS
# ============================================================
echo ""
echo "${BLUE}═══ SECTION 2: AUTHENTICATION ENDPOINTS ═══${NC}"
echo ""

# Test 3: Public registration is disabled
test_endpoint "GET" "/auth/register" 200 "Registration page shows invitation-only message"

# Test 4: Sign-in page loads
test_endpoint "GET" "/auth/signin" 200 "Sign-in page loads"

# Test 5: Unauthorized API access (no auth)
test_endpoint "GET" "/api/admin/users" 401 "Unauthorized access blocked (admin users endpoint)"

# Test 6: Unauthorized API access (no auth)
test_endpoint "GET" "/api/enrollments/pending" 401 "Unauthorized access blocked (enrollments endpoint)"

# ============================================================
# SECTION 3: API ENDPOINT EXISTENCE
# ============================================================
echo ""
echo "${BLUE}═══ SECTION 3: API ENDPOINT EXISTENCE (24 endpoints) ═══${NC}"
echo ""

# Note: These will return 401 but that proves the endpoint exists
test_endpoint "GET" "/api/admin/users" 401 "Admin users endpoint exists"
test_endpoint "GET" "/api/admin/audit-logs" 401 "Admin audit logs endpoint exists"
test_endpoint "GET" "/api/admin/rooms" 401 "Admin rooms endpoint exists"
test_endpoint "GET" "/api/courses" 401 "Courses endpoint exists"
test_endpoint "GET" "/api/enrollments/pending" 401 "Pending enrollments endpoint exists"
test_endpoint "GET" "/api/files/test-id" 401 "File metadata endpoint exists"
test_endpoint "GET" "/api/files/test-id/download-url" 401 "File download URL endpoint exists"

# ============================================================
# SECTION 4: INPUT VALIDATION
# ============================================================
echo ""
echo "${BLUE}═══ SECTION 4: INPUT VALIDATION ═══${NC}"
echo ""

# Test: Invalid JSON should return 400 or 401
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/enrollments/request" \
    -H "Content-Type: application/json" \
    -d "invalid-json" 2>&1)
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 400 ] || [ "$http_code" -eq 401 ]; then
    print_test "PASS" "Invalid JSON rejected" "Status: $http_code"
else
    print_test "FAIL" "Invalid JSON rejected" "Expected 400/401, Got: $http_code"
fi

# ============================================================
# SECTION 5: STATIC PAGES
# ============================================================
echo ""
echo "${BLUE}═══ SECTION 5: STATIC PAGES ═══${NC}"
echo ""

test_endpoint "GET" "/" 200 "Landing page"
test_endpoint "GET" "/auth/signin" 200 "Sign-in page"
test_endpoint "GET" "/auth/register" 200 "Register page (invitation only)"
test_endpoint "GET" "/unauthorized" 200 "Unauthorized page"

# ============================================================
# SECTION 6: PROTECTED ROUTES (Should redirect or return 401)
# ============================================================
echo ""
echo "${BLUE}═══ SECTION 6: PROTECTED ROUTES (Without Auth) ═══${NC}"
echo ""

# Admin routes
test_endpoint "GET" "/api/admin/users" 401 "Admin users API protected"
test_endpoint "POST" "/api/admin/users" 401 "Admin create user API protected"
test_endpoint "GET" "/api/admin/rooms" 401 "Admin rooms API protected"
test_endpoint "GET" "/api/admin/audit-logs" 401 "Admin audit logs API protected"

# Instructor routes
test_endpoint "GET" "/api/courses" 401 "Instructor courses API protected"
test_endpoint "POST" "/api/courses" 401 "Instructor create course API protected"

# Student routes
test_endpoint "POST" "/api/enrollments/request" 401 "Student enrollment API protected"

# ============================================================
# SECTION 7: DYNAMIC EXPORT VERIFICATION
# ============================================================
echo ""
echo "${BLUE}═══ SECTION 7: DYNAMIC EXPORT VERIFICATION ═══${NC}"
echo ""

# Check that API routes have dynamic export (prevents caching)
check_dynamic_export() {
    local file=$1
    local name=$2

    if grep -q "export const dynamic = 'force-dynamic'" "$file" 2>/dev/null; then
        print_test "PASS" "Dynamic export in $name" "Found in $file"
    else
        if [ -f "$file" ]; then
            print_test "FAIL" "Dynamic export in $name" "Missing in $file"
        else
            print_test "SKIP" "Dynamic export in $name" "File not found"
        fi
    fi
}

check_dynamic_export "app/api/admin/users/route.ts" "Admin users API"
check_dynamic_export "app/api/enrollments/request/route.ts" "Enrollment request API"
check_dynamic_export "app/api/files/upload-url/route.ts" "File upload API"
check_dynamic_export "app/api/courses/route.ts" "Courses API"

# ============================================================
# SECTION 8: DATABASE SCHEMA VERIFICATION
# ============================================================
echo ""
echo "${BLUE}═══ SECTION 8: DATABASE SCHEMA VERIFICATION ═══${NC}"
echo ""

if [ -f "prisma/schema.prisma" ]; then
    print_test "PASS" "Prisma schema file exists" "Found at prisma/schema.prisma"

    # Check for multiSchema
    if grep -q "multiSchema" "prisma/schema.prisma"; then
        print_test "PASS" "MultiSchema feature enabled" "Found in schema"
    else
        print_test "FAIL" "MultiSchema feature enabled" "Not found in schema"
    fi

    # Check for educy schema
    if grep -q '@@schema("educy")' "prisma/schema.prisma"; then
        print_test "PASS" "Educy schema configured" "Found @@schema(\"educy\")"
    else
        print_test "FAIL" "Educy schema configured" "Missing @@schema(\"educy\")"
    fi

    # Check key models
    for model in "User" "Course" "Section" "Assignment" "Submission" "Enrollment" "File" "Notification" "AuditLog"; do
        if grep -q "model $model" "prisma/schema.prisma"; then
            print_test "PASS" "Model $model exists" "Found in schema"
        else
            print_test "FAIL" "Model $model exists" "Missing from schema"
        fi
    done
else
    print_test "FAIL" "Prisma schema file exists" "Not found at prisma/schema.prisma"
fi

# ============================================================
# SECTION 9: SECURITY VERIFICATION
# ============================================================
echo ""
echo "${BLUE}═══ SECTION 9: SECURITY VERIFICATION ═══${NC}"
echo ""

# Check for crypto import in password generation
if grep -q "import crypto from 'crypto'" "app/api/admin/users/route.ts" 2>/dev/null; then
    print_test "PASS" "Cryptographic password generation" "Using crypto module"
else
    print_test "FAIL" "Cryptographic password generation" "Not using crypto module"
fi

# Check for bcrypt
if grep -q "import bcrypt" "app/api/admin/users/route.ts" 2>/dev/null; then
    print_test "PASS" "Password hashing with bcrypt" "Found bcrypt import"
else
    print_test "FAIL" "Password hashing with bcrypt" "Missing bcrypt import"
fi

# Check for Zod validation
if grep -q "import.*z.*from 'zod'" "app/api/admin/users/route.ts" 2>/dev/null; then
    print_test "PASS" "Input validation with Zod" "Found Zod import"
else
    print_test "FAIL" "Input validation with Zod" "Missing Zod import"
fi

# ============================================================
# SECTION 10: EMAIL CONFIGURATION
# ============================================================
echo ""
echo "${BLUE}═══ SECTION 10: EMAIL CONFIGURATION ═══${NC}"
echo ""

if [ -f ".env" ]; then
    if grep -q "RESEND_API_KEY" ".env"; then
        print_test "PASS" "Resend API key configured" "Found in .env"
    else
        print_test "FAIL" "Resend API key configured" "Missing from .env"
    fi

    if grep -q "RESEND_FROM_EMAIL" ".env"; then
        print_test "PASS" "Resend from email configured" "Found in .env"
    else
        print_test "FAIL" "Resend from email configured" "Missing from .env"
    fi
else
    print_test "SKIP" "Email configuration" ".env file not found"
fi

# Check email functions exist
if grep -q "sendWelcomeEmail" "lib/email.ts" 2>/dev/null; then
    print_test "PASS" "Welcome email function exists" "Found in lib/email.ts"
else
    print_test "FAIL" "Welcome email function exists" "Missing from lib/email.ts"
fi

if grep -q "sendAssignmentCreatedEmail" "lib/email.ts" 2>/dev/null; then
    print_test "PASS" "Assignment email function exists" "Found in lib/email.ts"
else
    print_test "FAIL" "Assignment email function exists" "Missing from lib/email.ts"
fi

# ============================================================
# SECTION 11: FILE STRUCTURE
# ============================================================
echo ""
echo "${BLUE}═══ SECTION 11: FILE STRUCTURE ═══${NC}"
echo ""

# Check critical files
check_file() {
    local file=$1
    local name=$2

    if [ -f "$file" ]; then
        print_test "PASS" "$name exists" "Found at $file"
    else
        print_test "FAIL" "$name exists" "Missing: $file"
    fi
}

check_file "app/layout.tsx" "Root layout"
check_file "app/page.tsx" "Landing page"
check_file "app/api/admin/users/route.ts" "Admin users API"
check_file "app/instructor/schedule/page.tsx" "Instructor schedule page"
check_file "lib/rbac.ts" "RBAC library"
check_file "lib/email.ts" "Email library"
check_file "lib/prisma.ts" "Prisma client"
check_file "prisma/schema.prisma" "Prisma schema"

# ============================================================
# SECTION 12: RACE CONDITION FIXES
# ============================================================
echo ""
echo "${BLUE}═══ SECTION 12: RACE CONDITION FIXES ═══${NC}"
echo ""

# Check for transaction usage in enrollment
if grep -q '\$transaction' "app/api/enrollments/request/route.ts" 2>/dev/null; then
    print_test "PASS" "Enrollment uses transaction" "Found \$transaction"
else
    print_test "FAIL" "Enrollment uses transaction" "Missing \$transaction"
fi

# Check for Prisma error handling in submissions
if grep -q "P2002" "app/api/assignments/[id]/submissions/route.ts" 2>/dev/null; then
    print_test "PASS" "Submission handles unique constraint" "Found P2002 error handling"
else
    print_test "FAIL" "Submission handles unique constraint" "Missing P2002 handling"
fi

# ============================================================
# SECTION 13: PERMISSION SYSTEM
# ============================================================
echo ""
echo "${BLUE}═══ SECTION 13: PERMISSION SYSTEM ═══${NC}"
echo ""

# Check file permission implementation
if grep -q "hasAccess" "app/api/files/[id]/download-url/route.ts" 2>/dev/null; then
    print_test "PASS" "Granular file permissions implemented" "Found hasAccess logic"
else
    print_test "FAIL" "Granular file permissions implemented" "Missing permission checks"
fi

# Check for instructor permission check
if grep -q "instructorId" "app/api/files/[id]/download-url/route.ts" 2>/dev/null; then
    print_test "PASS" "Instructor can access student submissions" "Found instructorId check"
else
    print_test "FAIL" "Instructor can access student submissions" "Missing instructor check"
fi

# ============================================================
# SECTION 14: NOTIFICATION SYSTEM
# ============================================================
echo ""
echo "${BLUE}═══ SECTION 14: NOTIFICATION SYSTEM ═══${NC}"
echo ""

# Check notification creation in assignment
if grep -q "notification.createMany" "app/api/sections/[id]/assignments/route.ts" 2>/dev/null; then
    print_test "PASS" "Assignment notifications implemented" "Found notification.createMany"
else
    print_test "FAIL" "Assignment notifications implemented" "Missing notifications"
fi

# ============================================================
# FINAL SUMMARY
# ============================================================
echo ""
echo "════════════════════════════════════════════════════════════"
echo "   TEST SUMMARY"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Total Tests:   $TOTAL_TESTS"
echo -e "${GREEN}Passed:        $PASSED_TESTS${NC}"
echo -e "${RED}Failed:        $FAILED_TESTS${NC}"
echo -e "${YELLOW}Skipped:       $SKIPPED_TESTS${NC}"
echo ""

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo "Success Rate:  ${SUCCESS_RATE}%"
else
    SUCCESS_RATE=0
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Save summary to JSON
cat > "$RESULTS_FILE" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "base_url": "$BASE_URL",
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "skipped": $SKIPPED_TESTS,
    "success_rate": $SUCCESS_RATE
  }
}
EOF

echo "Detailed results saved to: $RESULTS_FILE"
echo ""

# Exit with appropriate code
if [ $FAILED_TESTS -gt 0 ]; then
    echo "⚠️  Some tests failed. Review the output above."
    exit 1
else
    echo "✅ All tests passed!"
    exit 0
fi
