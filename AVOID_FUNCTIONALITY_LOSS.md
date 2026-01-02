# How to Avoid Functionality Loss During Compilation Fixes

## Quick Reference

### ❌ What NOT to Do
```typescript
// DON'T: Remove code to fix errors
- const result = await complexOperation();
+ // const result = await complexOperation(); // TODO: Fix later

// DON'T: Stub out functionality
- const data = await fetchFromAPI();
+ const data = { success: true }; // Simplified

// DON'T: Use 'any' to bypass types
- const result: ComplexType = process(data);
+ const result: any = process(data);

// DON'T: Remove error handling
- try { await operation(); } catch (e) { handle(e); }
+ await operation(); // Removed try/catch
```

### ✅ What TO Do
```typescript
// DO: Fix types properly
- const result = await operation();
+ const result: ResultType = await operation();

// DO: Add proper type guards
- const data = getData();
+ const data = getData();
+ if (!isValidData(data)) throw new Error('Invalid data');

// DO: Convert types correctly
- const result = transform(data);
+ const result = transform(data as SourceType);

// DO: Preserve all logic
- const processed = await step1().then(step2).then(step3);
+ const temp = await step1();
+ const intermediate = await step2(temp);
+ const processed = await step3(intermediate);
```

## Automated Verification

### Before Every Commit:
```bash
# Run verification script
./scripts/verify-no-functionality-loss.sh

# If it fails, review and fix
# Never commit if verification fails
```

### What It Checks:
1. ✓ No stub returns
2. ✓ Async operations preserved
3. ✓ Function calls intact
4. ✓ No 'any' types added
5. ✓ Error handling preserved
6. ✓ Loops maintained
7. ✓ No simplified implementations

## Manual Review Checklist

Before committing compilation fixes:

- [ ] Read the original code and understand what it does
- [ ] Identify the root cause of the type error
- [ ] Fix the types, not the logic
- [ ] Verify all function calls are still present
- [ ] Verify all async operations are still async
- [ ] Verify all error handling is intact
- [ ] Run the verification script
- [ ] Test the functionality manually if possible
- [ ] Document the fix in commit message

## Common Patterns

### Pattern 1: Type Mismatch
```typescript
// Error: Type 'X' is not assignable to type 'Y'

// ✅ Solution: Add proper conversion
const value: Y = convertXToY(getData());

// ✅ Solution: Use type assertion with validation
const value = getData() as Y;
if (!isValidY(value)) throw new Error('Invalid type');
```

### Pattern 2: Missing Properties
```typescript
// Error: Property 'foo' is missing

// ✅ Solution: Add the property
const data = { ...baseData, foo: defaultValue };

// ✅ Solution: Make it optional in type
interface Data {
  foo?: string;
}
```

### Pattern 3: Async Iterator
```typescript
// Error: AsyncIterator must have [Symbol.asyncIterator]

// ✅ Solution: Wrap properly
const iterable = {
  [Symbol.asyncIterator]: () => generator
};
for await (const item of iterable) { ... }
```

## Red Flags

If you see yourself doing any of these, STOP:

🚩 Removing await keywords
🚩 Removing function calls
🚩 Adding TODO comments about functionality
🚩 Using 'any' type
🚩 Returning mock/stub data
🚩 Commenting out code
🚩 Simplifying complex logic
🚩 Removing error handling

## When in Doubt

1. **Ask for help** - Don't guess
2. **Use @ts-expect-error** temporarily with full explanation
3. **Create a detailed TODO** with context
4. **Never stub functionality** even "temporarily"

## Resources

- [COMPILATION_FIX_GUIDELINES.md](./COMPILATION_FIX_GUIDELINES.md) - Full guidelines
- [VERIFICATION_SETUP.md](./docs/VERIFICATION_SETUP.md) - Setup instructions
- [MIGRATION_VERIFICATION_REPORT.md](./MIGRATION_VERIFICATION_REPORT.md) - Example report

## Summary

**Golden Rule:** If fixing a type error requires changing the logic, you're doing it wrong.

**Process:**
1. Understand the code
2. Understand the error
3. Fix types to match logic
4. Verify functionality preserved
5. Run automated checks
6. Commit with clear message

**Remember:** Type errors are about types, not about functionality. Fix the types, preserve the functionality.
