#!/bin/bash
# Migration Pre-Check Script
# Run BEFORE renaming traveller-combat-vtt -> traveller-starship-operations-vtt
# Validates current state and counts references to update

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PUBLIC_REPO=~/software/traveller-combat-vtt
PRIVATE_REPO=~/software/traveller-VTT-private
OLD_NAME="traveller-combat-vtt"

echo "========================================"
echo "Migration Pre-Check: $OLD_NAME"
echo "========================================"
echo ""

ERRORS=0

# Check directories exist
echo -n "Checking public repo exists... "
if [ -d "$PUBLIC_REPO" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC} - $PUBLIC_REPO not found"
    ((ERRORS++))
fi

echo -n "Checking private repo exists... "
if [ -d "$PRIVATE_REPO" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC} - $PRIVATE_REPO not found"
    ((ERRORS++))
fi

# Check git status
echo ""
echo "Git Status (public repo):"
git -C "$PUBLIC_REPO" status --short 2>/dev/null || echo "  (could not get status)"

echo ""
echo "Git Status (private repo):"
git -C "$PRIVATE_REPO" status --short 2>/dev/null || echo "  (could not get status)"

# Count references in public repo
echo ""
echo "Counting references in public repo..."
PUBLIC_FILES=$(grep -rl "$OLD_NAME" "$PUBLIC_REPO" --include="*.md" --include="*.json" --include="*.js" --include="*.toml" 2>/dev/null | wc -l)
PUBLIC_REFS=$(grep -r "$OLD_NAME" "$PUBLIC_REPO" --include="*.md" --include="*.json" --include="*.js" --include="*.toml" 2>/dev/null | wc -l)
echo "  Files with references: $PUBLIC_FILES"
echo "  Total references: $PUBLIC_REFS"

# Count references in private repo
echo ""
echo "Counting references in private repo..."
PRIVATE_FILES=$(grep -rl "$OLD_NAME" "$PRIVATE_REPO" --include="*.md" --include="*.json" 2>/dev/null | wc -l)
PRIVATE_REFS=$(grep -r "$OLD_NAME" "$PRIVATE_REPO" --include="*.md" --include="*.json" 2>/dev/null | wc -l)
echo "  Files with references: $PRIVATE_FILES"
echo "  Total references: $PRIVATE_REFS"

# List files to update
echo ""
echo "Files to update in public repo:"
grep -rl "$OLD_NAME" "$PUBLIC_REPO" --include="*.md" --include="*.json" --include="*.js" --include="*.toml" 2>/dev/null | sed "s|$PUBLIC_REPO/||" | sort || echo "  (none found)"

echo ""
echo "Files to update in private repo:"
grep -rl "$OLD_NAME" "$PRIVATE_REPO" --include="*.md" --include="*.json" 2>/dev/null | sed "s|$PRIVATE_REPO/||" | sort || echo "  (none found)"

# Check for running processes
echo ""
echo -n "Checking for running node processes on port 3000... "
if lsof -i :3000 >/dev/null 2>&1; then
    echo -e "${YELLOW}WARNING${NC} - processes running"
    echo "  Run: npm run cleanup:all"
else
    echo -e "${GREEN}OK${NC} - port 3000 clear"
fi

# Check symlinks
echo ""
echo -n "Checking .claude symlink in public repo... "
if [ -L "$PUBLIC_REPO/.claude" ]; then
    TARGET=$(readlink "$PUBLIC_REPO/.claude")
    echo -e "${GREEN}OK${NC} - points to $TARGET"
else
    echo -e "${YELLOW}NOTE${NC} - not a symlink or doesn't exist"
fi

# Summary
echo ""
echo "========================================"
echo "SUMMARY"
echo "========================================"
echo "Total files to update: $((PUBLIC_FILES + PRIVATE_FILES))"
echo "Total references: $((PUBLIC_REFS + PRIVATE_REFS))"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}PRE-CHECK FAILED${NC} - $ERRORS errors"
    exit 1
else
    echo -e "${GREEN}PRE-CHECK PASSED${NC}"
    echo ""
    echo "Ready to proceed with migration."
    exit 0
fi
