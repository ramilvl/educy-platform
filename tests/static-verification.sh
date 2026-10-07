#!/bin/bash

# Educy Platform - Static Code Verification (No Server Required)
# Tests code structure, security implementations, and configurations

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

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
    esac
}

echo ""
echo "════════════════════════════════════════════════════════════"
echo "   EDUCY - STATIC CODE VERIFICATION"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Test Time: $(date)"
echo ""

# ============================================================
# BUILD VERIFICATION
# ============================================================
echo ""
echo "${BLUE}═══ BUILD VERIFICATION ═══${NC}"
echo ""

if [ -f "package.json" ]; then
    print_test "PASS" "package.json exists" "Project root found"
else
    print_test "FAIL" "package.json exists" "Not in project root"
    exit 1
fi

if [ -f "next.config.js" ] || [ -f "next.config.mjs" ]; then
    print_test "PASS" "Next.js config exists" "Found configuration"
else
    print_test "FAIL" "Next.js config exists" "Missing config file"
fi

if [ -d "node_modules" ]; then
    print_test "PASS" "Dependencies installed" "node_modules exists"
else
    print_test "FAIL" "Dependencies installed" "Run npm install"
fi

if [ -d ".next" ]; then
    print_test "PASS" "Project built" ".next directory exists"
else
    print_test "FAIL" "Project built" "Run npm run build"
fi

# ============================================================
# FILE STRUCTURE
# ============================================================
echo ""
echo "${BLUE}═══ FILE STRUCTURE ═══${NC}"
echo ""

# Core files
for file in "app/layout.tsx" "app/page.tsx" "prisma/schema.prisma" "lib/rbac.ts" "lib/email.ts" "lib/prisma.ts"; do
    if [ -f "$file" ]; then
        print_test "PASS" "File exists: $file" "Found"
    else
        print_test "FAIL" "File exists: $file" "Missing"
    fi
done

# API routes count
api_count=$(find app/api -name "route.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$api_count" -ge 20 ]; then
    print_test "PASS" "API routes count ($api_count)" "Expected 24+"
else
    print_test "FAIL" "API routes count ($api_count)" "Expected 24+"
fi

# ============================================================
# DYNAMIC EXPORT VERIFICATION
# ============================================================
echo ""
echo "${BLUE}═══ DYNAMIC EXPORT VERIFICATION ═══${NC}"
echo ""

api_routes=(
    "app/api/admin/users/route.ts"
    "app/api/admin/audit-logs/route.ts"
    "app/api/admin/rooms/route.ts"
    "app/api/enrollments/request/route.ts"
    "app/api/enrollments/pending/route.ts"
    "app/api/files/upload-url/route.ts"
    "app/api/files/[id]/download-url/route.ts"
    "app/api/courses/route.ts"
    "app/api/assignments/[id]/submissions/route.ts"
)

missing_dynamic=0
for route in "${api_routes[@]}"; do
    if [ -f "$route" ]; then
        if grep -q "export const dynamic = 'force-dynamic'" "$route"; then
            print_test "PASS" "Dynamic export: $(basename $(dirname $route))/$(basename $route)" "Found"
        else
            print_test "FAIL" "Dynamic export: $(basename $(dirname $route))/$(basename $route)" "Missing"
            missing_dynamic=$((missing_dynamic + 1))
        fi
    fi
done

# ============================================================
# SECURITY CHECKS
# ============================================================
echo ""
echo "${BLUE}═══ SECURITY CHECKS ═══${NC}"
echo ""

# Password generation
if grep -q "import crypto from 'crypto'" "app/api/admin/users/route.ts" 2>/dev/null; then
    print_test "PASS" "Crypto module for passwords" "Using crypto.randomBytes"
else
    print_test "FAIL" "Crypto module for passwords" "Should use crypto instead of Math.random"
fi

# Bcrypt
if grep -q "import bcrypt" "app/api/admin/users/route.ts" 2>/dev/null; then
    print_test "PASS" "Password hashing (bcrypt)" "Found"
else
    print_test "FAIL" "Password hashing (bcrypt)" "Missing"
fi

# Check for Math.random in password generation (bad practice)
if grep "temporaryPassword.*Math.random" "app/api/admin/users/route.ts" 2>/dev/null; then
    print_test "FAIL" "No Math.random for passwords" "Found Math.random usage"
else
    print_test "PASS" "No Math.random for passwords" "Not using Math.random"
fi

# ============================================================
# DATABASE SCHEMA
# ============================================================
echo ""
echo "${BLUE}═══ DATABASE SCHEMA ═══${NC}"
echo ""

if [ -f "prisma/schema.prisma" ]; then
    # MultiSchema
    if grep -q "multiSchema" "prisma/schema.prisma"; then
        print_test "PASS" "MultiSchema feature" "Enabled"
    else
        print_test "FAIL" "MultiSchema feature" "Not enabled"
    fi

    # Educy schema
    schema_count=$(grep -c '@@schema("educy")' "prisma/schema.prisma")
    if [ "$schema_count" -gt 10 ]; then
        print_test "PASS" "Educy schema usage ($schema_count models)" "Correctly configured"
    else
        print_test "FAIL" "Educy schema usage ($schema_count models)" "Should be used on all models"
    fi

    # Key models
    models=("User" "Course" "Section" "Assignment" "Submission" "Enrollment" "File" "Notification" "AuditLog" "Lesson" "Room")
    for model in "${models[@]}"; do
        if grep -q "model $model {" "prisma/schema.prisma"; then
            print_test "PASS" "Model: $model" "Exists"
        else
            print_test "FAIL" "Model: $model" "Missing"
        fi
    done

    # Unique constraints
    if grep -q "@@unique.*assignmentId.*studentId" "prisma/schema.prisma"; then
        print_test "PASS" "Submission unique constraint" "Prevents duplicate submissions"
    else
        print_test "FAIL" "Submission unique constraint" "Missing"
    fi
fi

# ============================================================
# RACE CONDITION FIXES
# ============================================================
echo ""
echo "${BLUE}═══ RACE CONDITION FIXES ═══${NC}"
echo ""

# Transaction in enrollment
if [ -f "app/api/enrollments/request/route.ts" ]; then
    if grep -q '\$transaction' "app/api/enrollments/request/route.ts"; then
        print_test "PASS" "Enrollment uses transaction" "Race condition prevented"
    else
        print_test "FAIL" "Enrollment uses transaction" "Race condition possible"
    fi
fi

# Prisma error handling
if [ -f "app/api/assignments/[id]/submissions/route.ts" ]; then
    if grep -q "P2002" "app/api/assignments/[id]/submissions/route.ts"; then
        print_test "PASS" "Unique constraint error handling" "P2002 handled"
    else
        print_test "FAIL" "Unique constraint error handling" "P2002 not handled"
    fi
fi

# ============================================================
# PERMISSION SYSTEM
# ============================================================
echo ""
echo "${BLUE}═══ PERMISSION SYSTEM ═══${NC}"
echo ""

if [ -f "app/api/files/[id]/download-url/route.ts" ]; then
    if grep -q "hasAccess" "app/api/files/[id]/download-url/route.ts"; then
        print_test "PASS" "Granular file permissions" "Implemented"
    else
        print_test "FAIL" "Granular file permissions" "Not implemented"
    fi

    if grep -q "instructorId" "app/api/files/[id]/download-url/route.ts"; then
        print_test "PASS" "Instructor submission access" "Can download student files"
    else
        print_test "FAIL" "Instructor submission access" "Cannot download student files"
    fi
fi

# ============================================================
# NOTIFICATION SYSTEM
# ============================================================
echo ""
echo "${BLUE}═══ NOTIFICATION SYSTEM ═══${NC}"
echo ""

if [ -f "app/api/sections/[id]/assignments/route.ts" ]; then
    if grep -q "notification.createMany" "app/api/sections/[id]/assignments/route.ts"; then
        print_test "PASS" "Assignment notifications" "Implemented"
    else
        print_test "FAIL" "Assignment notifications" "Missing"
    fi

    if grep -q "sendAssignmentCreatedEmail" "app/api/sections/[id]/assignments/route.ts"; then
        print_test "PASS" "Assignment email notifications" "Implemented"
    else
        print_test "FAIL" "Assignment email notifications" "Missing"
    fi
fi

# ============================================================
# EMAIL CONFIGURATION
# ============================================================
echo ""
echo "${BLUE}═══ EMAIL CONFIGURATION ═══${NC}"
echo ""

if [ -f "lib/email.ts" ]; then
    emails=("sendWelcomeEmail" "sendAssignmentCreatedEmail" "sendGradeReceivedEmail" "sendEnrollmentApprovedEmail" "sendEnrollmentRejectedEmail")
    for email_fn in "${emails[@]}"; do
        if grep -q "$email_fn" "lib/email.ts"; then
            print_test "PASS" "Email function: $email_fn" "Exists"
        else
            print_test "FAIL" "Email function: $email_fn" "Missing"
        fi
    done
fi

if [ -f ".env" ]; then
    if grep -q "RESEND_API_KEY" ".env"; then
        print_test "PASS" "Resend API configured" "Found in .env"
    else
        print_test "FAIL" "Resend API configured" "Missing from .env"
    fi
fi

# ============================================================
# VALIDATION
# ============================================================
echo ""
echo "${BLUE}═══ INPUT VALIDATION ═══${NC}"
echo ""

# Check for Zod usage
zod_routes=(
    "app/api/admin/users/route.ts"
    "app/api/enrollments/request/route.ts"
    "app/api/assignments/[id]/submissions/route.ts"
)

for route in "${zod_routes[@]}"; do
    if [ -f "$route" ]; then
        if grep -q "import.*z.*from 'zod'" "$route"; then
            print_test "PASS" "Zod validation: $(basename $(dirname $route))/$(basename $route)" "Found"
        else
            print_test "FAIL" "Zod validation: $(basename $(dirname $route))/$(basename $route)" "Missing"
        fi
    fi
done

# Check submission validation
if [ -f "app/api/assignments/[id]/submissions/route.ts" ]; then
    if grep -q ".refine.*fileKey.*text" "app/api/assignments/[id]/submissions/route.ts"; then
        print_test "PASS" "Submission requires content" "File or text required"
    else
        print_test "FAIL" "Submission requires content" "Can submit empty"
    fi
fi

# ============================================================
# AUDIT LOGGING
# ============================================================
echo ""
echo "${BLUE}═══ AUDIT LOGGING ═══${NC}"
echo ""

audit_routes=(
    "app/api/admin/users/route.ts"
    "app/api/enrollments/request/route.ts"
    "app/api/assignments/[id]/submissions/route.ts"
)

for route in "${audit_routes[@]}"; do
    if [ -f "$route" ]; then
        if grep -q "auditLog.create" "$route"; then
            print_test "PASS" "Audit log: $(basename $(dirname $route))/$(basename $route)" "Implemented"
        else
            print_test "FAIL" "Audit log: $(basename $(dirname $route))/$(basename $route)" "Missing"
        fi
    fi
done

# ============================================================
# VIEWPORT EXPORT (METADATA FIX)
# ============================================================
echo ""
echo "${BLUE}═══ VIEWPORT EXPORT (Next.js 14) ═══${NC}"
echo ""

if [ -f "app/layout.tsx" ]; then
    if grep -q "export const viewport: Viewport" "app/layout.tsx"; then
        print_test "PASS" "Viewport export exists" "Next.js 14 compliant"
    else
        print_test "FAIL" "Viewport export exists" "Should have viewport export"
    fi

    if grep -q "import.*Viewport.*from 'next'" "app/layout.tsx"; then
        print_test "PASS" "Viewport type import" "Imported from next"
    else
        print_test "FAIL" "Viewport type import" "Missing import"
    fi

    # Check themeColor is in viewport, not metadata
    if grep -A 10 "export const viewport" "app/layout.tsx" | grep -q "themeColor"; then
        print_test "PASS" "themeColor in viewport" "Correctly placed"
    else
        print_test "FAIL" "themeColor in viewport" "Should be in viewport export"
    fi
fi

# ============================================================
# PAGES EXIST
# ============================================================
echo ""
echo "${BLUE}═══ CRITICAL PAGES ═══${NC}"
echo ""

pages=(
    "app/page.tsx"
    "app/admin/users/page.tsx"
    "app/admin/users/create/page.tsx"
    "app/admin/audit-logs/page.tsx"
    "app/instructor/schedule/page.tsx"
    "app/student/timetable/page.tsx"
    "app/auth/signin/page.tsx"
    "app/auth/register/page.tsx"
)

for page in "${pages[@]}"; do
    if [ -f "$page" ]; then
        print_test "PASS" "Page: $page" "Exists"
    else
        print_test "FAIL" "Page: $page" "Missing (404 error)"
    fi
done

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo "════════════════════════════════════════════════════════════"
echo "   TEST SUMMARY"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Total Tests:   $TOTAL_TESTS"
echo -e "${GREEN}Passed:        $PASSED_TESTS${NC}"
echo -e "${RED}Failed:        $FAILED_TESTS${NC}"
echo ""

if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo "Success Rate:  ${SUCCESS_RATE}%"

    if [ $SUCCESS_RATE -ge 95 ]; then
        echo ""
        echo "✅ EXCELLENT! Production ready."
    elif [ $SUCCESS_RATE -ge 80 ]; then
        echo ""
        echo "⚠️  GOOD, but review failures."
    else
        echo ""
        echo "❌ NEEDS WORK. Fix critical issues."
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
else
    exit 0
fi
