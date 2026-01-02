#!/bin/bash
# verify-no-functionality-loss.sh
# Run this script before committing compilation fixes

set -e

echo "🔍 Verifying No Functionality Loss..."
echo "======================================"

WARNINGS=0

# Check for stub returns
echo ""
echo "1. Checking for stub returns..."
if git diff --cached | grep -E "return \{ success: true \}|return \{\}|return null" | grep -v "test\|spec"; then
  echo "⚠️  WARNING: Found potential stub returns!"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✓ No stub returns found"
fi

# Check for removed async operations
echo ""
echo "2. Checking for removed async operations..."
REMOVED_AWAITS=$(git diff --cached | grep -E "^-.*await " | wc -l)
ADDED_AWAITS=$(git diff --cached | grep -E "^\+.*await " | wc -l)
if [ $REMOVED_AWAITS -gt $ADDED_AWAITS ]; then
  echo "⚠️  WARNING: Removed $REMOVED_AWAITS await calls, only added $ADDED_AWAITS!"
  git diff --cached | grep -E "^-.*await "
  WARNINGS=$((WARNINGS + 1))
else
  echo "✓ Async operations preserved"
fi

# Check for removed function calls
echo ""
echo "3. Checking for removed function calls..."
REMOVED_CALLS=$(git diff --cached | grep -E "^-.*\w+\(" | grep -v "^-.*//\|^-.*\*" | wc -l)
ADDED_CALLS=$(git diff --cached | grep -E "^\+.*\w+\(" | grep -v "^\+.*//\|^\+.*\*" | wc -l)
if [ $REMOVED_CALLS -gt 0 ] && [ $REMOVED_CALLS -gt $ADDED_CALLS ]; then
  echo "⚠️  WARNING: Removed $REMOVED_CALLS function calls, only added $ADDED_CALLS!"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✓ Function calls preserved"
fi

# Check for added 'any' types
echo ""
echo "4. Checking for added 'any' types..."
if git diff --cached | grep -E "^\+.*: any[^A-Za-z]" | grep -v "test\|spec\|@ts-"; then
  echo "⚠️  WARNING: Added 'any' types (should be avoided)!"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✓ No 'any' types added"
fi

# Check for TODO/FIXME/STUB comments
echo ""
echo "5. Checking for stub comments..."
if git diff --cached | grep -E "^\+.*(TODO|FIXME|STUB|TEMPORARY|PLACEHOLDER).*[Ff]unctionality"; then
  echo "⚠️  WARNING: Found TODO/FIXME/STUB comments about functionality!"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✓ No stub comments found"
fi

# Check for removed error handling
echo ""
echo "6. Checking for removed error handling..."
REMOVED_CATCHES=$(git diff --cached | grep -E "^-.*catch" | wc -l)
ADDED_CATCHES=$(git diff --cached | grep -E "^\+.*catch" | wc -l)
if [ $REMOVED_CATCHES -gt $ADDED_CATCHES ]; then
  echo "⚠️  WARNING: Removed $REMOVED_CATCHES catch blocks, only added $ADDED_CATCHES!"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✓ Error handling preserved"
fi

# Check for removed loops
echo ""
echo "7. Checking for removed loops..."
REMOVED_LOOPS=$(git diff --cached | grep -E "^-.*for (await )?\(" | wc -l)
ADDED_LOOPS=$(git diff --cached | grep -E "^\+.*for (await )?\(" | wc -l)
if [ $REMOVED_LOOPS -gt $ADDED_LOOPS ]; then
  echo "⚠️  WARNING: Removed $REMOVED_LOOPS loops, only added $ADDED_LOOPS!"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✓ Loops preserved"
fi

# Check for simplified implementations
echo ""
echo "8. Checking for simplified implementations..."
if git diff --cached | grep -E "^\+.*// Simplified|^\+.*// Stub|^\+.*// Mock"; then
  echo "⚠️  WARNING: Found comments indicating simplified/stub implementations!"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✓ No simplified implementations"
fi

# Summary
echo ""
echo "======================================"
if [ $WARNINGS -eq 0 ]; then
  echo "✅ PASSED: No functionality loss detected!"
  exit 0
else
  echo "❌ FAILED: Found $WARNINGS potential functionality losses!"
  echo ""
  echo "Please review the warnings above and ensure:"
  echo "  1. All original functionality is preserved"
  echo "  2. Type fixes don't change business logic"
  echo "  3. No stub/mock implementations"
  echo ""
  echo "If these warnings are false positives, document why in commit message."
  exit 1
fi
