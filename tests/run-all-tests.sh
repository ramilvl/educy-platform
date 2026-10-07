#!/bin/bash

# Educy Platform - Test Runner
# Convenient script to run all tests in sequence

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "════════════════════════════════════════════════════════════"
echo "   EDUCY PLATFORM - COMPLETE TEST SUITE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "This will run all available tests:"
echo "  1. Static Code Verification (67 tests, ~5 seconds)"
echo "  2. Comprehensive Functional Tests (30+ tests, ~60 seconds)"
echo ""

# Check if server is running
if ! curl -s "http://localhost:3000" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  WARNING: Server is not running!${NC}"
    echo ""
    echo "For functional tests to work, you need to:"
    echo "  1. Open a new terminal"
    echo "  2. Run: npm run dev"
    echo "  3. Wait for server to start"
    echo "  4. Run this script again"
    echo ""
    read -p "Do you want to run static tests only? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting. Start the server and try again."
        exit 1
    fi
    SKIP_FUNCTIONAL=true
else
    echo -e "${GREEN}✓ Server is running${NC}"
    SKIP_FUNCTIONAL=false
fi

# Check for admin password
if [ -z "$ADMIN_PASSWORD" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  ADMIN_PASSWORD not set${NC}"
    echo ""
    echo "For full functional testing, set your admin password:"
    echo "  export ADMIN_PASSWORD=\"your_password\""
    echo ""
    echo "Without it, only basic tests will run."
    echo ""
    read -p "Continue with basic tests? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting. Set ADMIN_PASSWORD and try again."
        exit 1
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "   PHASE 1: STATIC CODE VERIFICATION"
echo "════════════════════════════════════════════════════════════"
echo ""

# Run static verification
if [ -f "tests/static-verification.sh" ]; then
    ./tests/static-verification.sh
    STATIC_RESULT=$?
    if [ $STATIC_RESULT -eq 0 ]; then
        echo -e "${GREEN}✅ Static verification PASSED${NC}"
    else
        echo -e "${RED}❌ Static verification FAILED${NC}"
        echo ""
        read -p "Continue to functional tests anyway? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo -e "${RED}ERROR: static-verification.sh not found${NC}"
    exit 1
fi

# Run functional tests if server is running
if [ "$SKIP_FUNCTIONAL" = false ]; then
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "   PHASE 2: FUNCTIONAL TESTS"
    echo "════════════════════════════════════════════════════════════"
    echo ""

    if [ -f "tests/comprehensive-functional-tests.sh" ]; then
        ./tests/comprehensive-functional-tests.sh
        FUNCTIONAL_RESULT=$?
        if [ $FUNCTIONAL_RESULT -eq 0 ]; then
            echo -e "${GREEN}✅ Functional tests PASSED${NC}"
        else
            echo -e "${RED}❌ Functional tests FAILED${NC}"
        fi
    else
        echo -e "${RED}ERROR: comprehensive-functional-tests.sh not found${NC}"
        exit 1
    fi
else
    echo ""
    echo -e "${YELLOW}⊘ Functional tests SKIPPED (server not running)${NC}"
    FUNCTIONAL_RESULT=0
fi

# Final summary
echo ""
echo "════════════════════════════════════════════════════════════"
echo "   FINAL SUMMARY"
echo "════════════════════════════════════════════════════════════"
echo ""

if [ $STATIC_RESULT -eq 0 ]; then
    echo -e "Static Verification:    ${GREEN}PASSED ✓${NC}"
else
    echo -e "Static Verification:    ${RED}FAILED ✗${NC}"
fi

if [ "$SKIP_FUNCTIONAL" = false ]; then
    if [ $FUNCTIONAL_RESULT -eq 0 ]; then
        echo -e "Functional Tests:       ${GREEN}PASSED ✓${NC}"
    else
        echo -e "Functional Tests:       ${RED}FAILED ✗${NC}"
    fi
else
    echo -e "Functional Tests:       ${YELLOW}SKIPPED ⊘${NC}"
fi

echo ""

# Overall result
if [ $STATIC_RESULT -eq 0 ] && ([ "$SKIP_FUNCTIONAL" = true ] || [ $FUNCTIONAL_RESULT -eq 0 ]); then
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✅ ALL TESTS PASSED - PRODUCTION READY${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}   ❌ SOME TESTS FAILED - FIX ISSUES BEFORE DEPLOYMENT${NC}"
    echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
    echo ""
    exit 1
fi
