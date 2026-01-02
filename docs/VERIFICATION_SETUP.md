# Pre-commit Hook to Prevent Functionality Loss

To automatically verify no functionality is lost during compilation fixes:

## Installation

```bash
# Copy the pre-commit hook
cp scripts/verify-no-functionality-loss.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Manual Verification

Before committing any compilation fixes:

```bash
# Stage your changes
git add packages/team-ai-agent/src/execution/AIExecutionEngine.ts

# Run verification
./scripts/verify-no-functionality-loss.sh

# If passed, commit
git commit -m "fix(types): Add proper type annotations - functionality preserved"
```

## What Gets Checked

1. **Stub Returns** - Detects `return { success: true }` or empty objects
2. **Removed Async Operations** - Ensures await calls aren't removed
3. **Removed Function Calls** - Verifies function calls are preserved
4. **Added 'any' Types** - Warns about type safety bypasses
5. **Stub Comments** - Finds TODO/FIXME/STUB markers
6. **Removed Error Handling** - Ensures try/catch blocks remain
7. **Removed Loops** - Verifies iteration logic is intact
8. **Simplified Implementations** - Detects comments indicating stubs

## Example Output

```
🔍 Verifying No Functionality Loss...
======================================

1. Checking for stub returns...
✓ No stub returns found

2. Checking for removed async operations...
✓ Async operations preserved

3. Checking for removed function calls...
✓ Function calls preserved

4. Checking for added 'any' types...
✓ No 'any' types added

5. Checking for stub comments...
✓ No stub comments found

6. Checking for removed error handling...
✓ Error handling preserved

7. Checking for removed loops...
✓ Loops preserved

8. Checking for simplified implementations...
✓ No simplified implementations

======================================
✅ PASSED: No functionality loss detected!
```

## If Verification Fails

The script will exit with code 1 and show warnings. Review each warning:

- If it's a false positive, document in commit message
- If it's real functionality loss, fix the code properly
- Never bypass the check by removing the hook

## Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/verify-functionality.yml
name: Verify No Functionality Loss

on: [pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 2
      - name: Verify no functionality loss
        run: |
          git diff HEAD~1 HEAD > /tmp/changes.diff
          ./scripts/verify-no-functionality-loss.sh
```

## Best Practices

1. **Run before every commit** with compilation fixes
2. **Review warnings carefully** - they indicate potential issues
3. **Document false positives** in commit messages
4. **Never stub functionality** to fix compilation errors
5. **Ask for help** if you can't fix types without changing logic
