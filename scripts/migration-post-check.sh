#!/bin/bash
# Migration Post-Check Script
# Run AFTER renaming traveller-combat-vtt -> traveller-starship-operations-vtt
# Verifies all references updated and new names present

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

NEW_REPO=~/software/traveller-starship-operations-vtt
PRIVATE_REPO=~/software/traveller-VTT-private
OLD_NAME="traveller-combat-vtt"
NEW_NAME="traveller-starship-operations-vtt"

echo "========================================"
echo "Migration Post-Check: $NEW_NAME"
echo "========================================"
echo ""

ERRORS=0
WARNINGS=0

# Check new directory exists
echo -n "Checking new directory exists... "
if [ -d "$NEW_REPO" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC} - $NEW_REPO not found"
    ((ERRORS++))
fi

# Check old directory does NOT exist
echo -n "Checking old directory removed... "
if [ -d ~/software/traveller-combat-vtt ]; then
    echo -e "${RED}FAIL${NC} - old directory still exists"
    ((ERRORS++))
else
    echo -e "${GREEN}OK${NC}"
fi

# Check for remaining old references in public repo
echo ""
echo "Checking for remaining old references in public repo..."
OLD_REFS_PUBLIC=$(grep -r "$OLD_NAME" "$NEW_REPO" --include="*.md" --include="*.json" --include="*.js" --include="*.toml" 2>/dev/null | grep -v "scripts/migration" | wc -l)
if [ "$OLD_REFS_PUBLIC" -gt 0 ]; then
    echo -e "${RED}FAIL${NC} - $OLD_REFS_PUBLIC references to '$OLD_NAME' still exist:"
    grep -rn "$OLD_NAME" "$NEW_REPO" --include="*.md" --include="*.json" --include="*.js" --include="*.toml" 2>/dev/null | grep -v "scripts/migration" | head -20
    ((ERRORS++))
else
    echo -e "${GREEN}OK${NC} - no old references found"
fi

# Check for remaining old references in private repo
echo ""
echo "Checking for remaining old references in private repo..."
OLD_REFS_PRIVATE=$(grep -r "$OLD_NAME" "$PRIVATE_REPO" --include="*.md" --include="*.json" 2>/dev/null | grep -v "REPO-RENAME-PLAN.md" | wc -l)
if [ "$OLD_REFS_PRIVATE" -gt 0 ]; then
    echo -e "${RED}FAIL${NC} - $OLD_REFS_PRIVATE references to '$OLD_NAME' still exist:"
    grep -rn "$OLD_NAME" "$PRIVATE_REPO" --include="*.md" --include="*.json" 2>/dev/null | grep -v "REPO-RENAME-PLAN.md" | head -20
    ((ERRORS++))
else
    echo -e "${GREEN}OK${NC} - no old references found"
fi

# Check for new references (should exist)
echo ""
echo -n "Checking new references exist in public repo... "
NEW_REFS_PUBLIC=$(grep -r "$NEW_NAME" "$NEW_REPO" --include="*.md" --include="*.json" --include="*.js" --include="*.toml" 2>/dev/null | wc -l)
if [ "$NEW_REFS_PUBLIC" -gt 0 ]; then
    echo -e "${GREEN}OK${NC} - $NEW_REFS_PUBLIC references found"
else
    echo -e "${RED}FAIL${NC} - no new references found"
    ((ERRORS++))
fi

# Check fly.toml has correct app name
echo ""
echo -n "Checking fly.toml app name... "
if grep -q "app = '$NEW_NAME'" "$NEW_REPO/fly.toml" 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC} - fly.toml doesn't have correct app name"
    ((ERRORS++))
fi

# Check git remote
echo ""
echo -n "Checking git remote URL... "
REMOTE_URL=$(git -C "$NEW_REPO" remote get-url origin 2>/dev/null || echo "")
if echo "$REMOTE_URL" | grep -q "$NEW_NAME"; then
    echo -e "${GREEN}OK${NC} - $REMOTE_URL"
else
    echo -e "${RED}FAIL${NC} - remote still points to old name: $REMOTE_URL"
    ((ERRORS++))
fi

# Check symlinks still work
echo ""
echo -n "Checking .claude symlink resolves... "
if [ -L "$NEW_REPO/.claude" ] && [ -e "$NEW_REPO/.claude" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}WARNING${NC} - symlink broken or missing"
    ((WARNINGS++))
fi

# Check package.json exists (basic sanity)
echo ""
echo -n "Checking package.json exists... "
if [ -f "$NEW_REPO/package.json" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC} - package.json not found"
    ((ERRORS++))
fi

# Try running npm test
echo ""
echo "Running npm test..."
if npm test --prefix "$NEW_REPO" >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC} - tests pass"
else
    echo -e "${RED}FAIL${NC} - tests failed"
    ((ERRORS++))
fi

# Check production URL (if network available)
echo ""
echo -n "Checking production URL... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$NEW_NAME.fly.dev/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}OK${NC} - HTTP $HTTP_CODE"
elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${YELLOW}SKIP${NC} - network unavailable or app not deployed"
    ((WARNINGS++))
else
    echo -e "${YELLOW}WARNING${NC} - HTTP $HTTP_CODE"
    ((WARNINGS++))
fi

# Summary
echo ""
echo "========================================"
echo "SUMMARY"
echo "========================================"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}POST-CHECK FAILED${NC}"
    echo "Fix the errors above before continuing."
    exit 1
else
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}POST-CHECK PASSED WITH WARNINGS${NC}"
    else
        echo -e "${GREEN}POST-CHECK PASSED${NC}"
    fi
    echo ""
    echo "Migration verified. Safe to destroy old Fly.io app if not already done."
    exit 0
fi
