# Test Value Analysis

Analyze tests for quality and value. Evaluates whether tests provide meaningful regression protection.

## Usage

```
/test-value-analysis              # Analyze all new/changed tests (vs main)
/test-value-analysis <path>       # Analyze tests at specific path
```

---

## Step 1: Identify Test Files

**If path argument provided:**
```bash
# Glob for test files at the specified path
find <path> -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx"
```

**Otherwise (no path):**
```bash
# Find all test files changed since main branch
git diff --name-only main...HEAD | grep -E '\.(test|spec)\.(ts|tsx)$'
```

If no test files found:
```
## Test Value Analysis

No test files found to analyze.

**Tip**: Run `/test-value-analysis src/components/MyComponent` to analyze specific tests.
```

---

## Step 2: Read and Analyze Each Test File

For each test file found, use the Read tool to examine the file content.

### Evaluation Criteria

For **each test case** (each `it()` or `test()` block), evaluate:

| Criterion | HIGH Value | MEDIUM Value | LOW Value (Issue) |
|-----------|------------|--------------|-------------------|
| **AAA Pattern** | Clear Arrange-Act-Assert structure | Implied structure | No clear structure |
| **Meaningful Assertions** | Asserts specific values/behavior | Asserts something | Only `toBeDefined()`, `toBeTruthy()`, or none |
| **Tests Behavior** | Verifies outcomes and side effects | Verifies calls happened | Only verifies existence |
| **Test Name** | "should X when Y" - describes behavior | Describes something | Vague ("test1", "works", "handles") |
| **No Duplicates** | Unique test purpose | Slight overlap | Same thing tested elsewhere |
| **Edge Cases** | Covers errors, boundaries, null | Some coverage | Only happy path |
| **Maintainability** | Simple, focused, readable | Somewhat complex | Overly complex or brittle |

### Blocking Issues (Must Fix)

Flag as **BLOCKING** if:
- Test has NO meaningful assertion (only `toBeDefined()`, `toBeTruthy()`, `toBeNull()`, or no `expect()`)
- Test is exact duplicate of another test (same assertions on same behavior)
- Test name is completely non-descriptive (e.g., "test1", "it works", "handles case")
- Test has no assertions at all

### Warnings (Should Review)

Flag as **WARNING** if:
- Assertion could be stronger (e.g., `toHaveBeenCalled()` without checking arguments)
- Test name could be more descriptive
- Similar tests that might be consolidated
- Missing edge case coverage (only happy path tested)
- Test is overly complex (multiple unrelated assertions)

---

## Step 3: Generate Report

Output structured analysis:

```
## Test Value Analysis

**Files Analyzed**: <count>
**Total Tests**: <count>
**Blocking Issues**: <count>
**Warnings**: <count>

---

### Summary by File

| File | Tests | High | Medium | Low | Issues |
|------|-------|------|--------|-----|--------|
| useFeature.test.ts | 5 | 3 | 1 | 1 | 1 blocking |
| Component.test.tsx | 8 | 7 | 1 | 0 | 1 warning |

---

### Blocking Issues (Must Fix)

These issues indicate tests that provide little to no value and should be improved:

#### 1. `useFeature.test.ts:23` - No meaningful assertion

```typescript
it('should work', () => {
  const result = useFeature()
  expect(result).toBeDefined()  // LOW VALUE - only checks existence
})
```

**Problem**: `toBeDefined()` only verifies the hook returns something, not that it returns the correct thing.

**Fix**: Assert specific properties and values:
```typescript
it('should return initial state with default values', () => {
  const result = useFeature()
  expect(result.isActive).toBe(false)
  expect(result.data).toEqual([])
  expect(result.error).toBeNull()
})
```

#### 2. `Component.test.tsx:45` - Duplicate test

```typescript
it('handles click', () => {  // Line 45
  // Same assertions as test on line 28
})
```

**Problem**: This test verifies the same behavior as the test at line 28.

**Fix**: Remove the duplicate, or differentiate what each test verifies.

---

### Warnings (Should Review)

These tests could be improved but are not blocking:

#### 1. `useHook.test.ts:67` - Weak assertion

```typescript
it('calls the callback', () => {
  const callback = vi.fn()
  doSomething(callback)
  expect(callback).toHaveBeenCalled()  // Could verify arguments
})
```

**Suggestion**: Verify the callback was called with expected arguments:
```typescript
expect(callback).toHaveBeenCalledWith(expectedArg1, expectedArg2)
```

#### 2. `utils.test.ts:12` - Vague test name

```typescript
it('handles input', () => { ... })
```

**Suggestion**: Be specific about what input and expected outcome:
```typescript
it('should return empty array when input is null', () => { ... })
```

---

### High-Value Tests (Commendable)

These tests demonstrate good testing practices:

- `useFeature.test.ts:45`: "should update state when action dispatched"
  - Clear AAA structure
  - Specific value assertions
  - Descriptive name

- `Component.test.tsx:78`: "should display error message when API fails"
  - Tests error handling path
  - Verifies user-visible behavior
  - Good regression protection

---

### Coverage Gaps

Based on the code being tested, consider adding tests for:

- [ ] Error handling when <specific condition>
- [ ] Edge case: empty input
- [ ] Edge case: maximum values
- [ ] Cleanup/unmount behavior

---

### Recommendations

1. **Strengthen weak assertions**: Replace `toBeDefined()` with specific value checks
2. **Improve test names**: Use "should [behavior] when [condition]" format
3. **Remove duplicates**: Consolidate tests that verify the same behavior
4. **Add edge cases**: Ensure error paths and boundaries are tested
```

---

## Step 4: Provide Actionable Guidance

After the report, provide clear next steps:

**If blocking issues found:**
```
---

## Action Required

Found **<count> blocking issues** that should be fixed.

Low-value tests waste maintenance time and provide false confidence.
Fix the blocking issues above, then run `/test-value-analysis` again to verify.
```

**If only warnings:**
```
---

## Recommendations

Found **<count> warnings** that could be improved.

These tests provide some value but could be stronger. Consider addressing
the suggestions above during your next refactoring pass.
```

**If no issues:**
```
---

## All Tests Pass Analysis

All **<count> tests** demonstrate good testing practices.

- Clear AAA patterns
- Meaningful assertions
- Descriptive names
- Good coverage
```

---

## Examples

### Example: Blocking Issue - No Meaningful Assertion

```typescript
// BAD - Low value
it('should return result', () => {
  const result = calculateTotal([1, 2, 3])
  expect(result).toBeDefined()
})

// GOOD - High value
it('should sum all numbers in array', () => {
  const result = calculateTotal([1, 2, 3])
  expect(result).toBe(6)
})
```

### Example: Blocking Issue - Duplicate Test

```typescript
// Test 1 at line 25
it('opens the modal', () => {
  fireEvent.click(button)
  expect(modal).toBeVisible()
})

// Test 2 at line 45 - DUPLICATE
it('shows modal on click', () => {
  fireEvent.click(button)
  expect(modal).toBeVisible()
})
```

### Example: Warning - Weak Callback Assertion

```typescript
// WEAK
expect(onSubmit).toHaveBeenCalled()

// STRONG
expect(onSubmit).toHaveBeenCalledWith({
  name: 'John',
  email: 'john@example.com'
})
expect(onSubmit).toHaveBeenCalledTimes(1)
```

### Example: Warning - Vague Test Name

```typescript
// BAD
it('handles error', () => { ... })
it('works correctly', () => { ... })
it('test case 1', () => { ... })

// GOOD
it('should display error toast when API returns 500', () => { ... })
it('should calculate total with tax for valid cart items', () => { ... })
it('should disable submit button when form is invalid', () => { ... })
```
