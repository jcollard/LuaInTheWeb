# Issue Eval

Evaluate an issue to estimate priority, effort, type, and make it more actionable.

**Invoked by**: `/issue <number> eval`

**Input**: Issue number from `$ARGUMENTS`

**NOTE**: This mode is for evaluation ONLY. It NEVER leads to implementation. After evaluation, STOP and wait for user to choose actions. If user wants to implement, they must run `/issue <number> begin` separately.

---

## Step 1: Fetch and Display Issue

Fetch the full issue details:

```bash
gh issue view <number> --json number,title,body,labels,state,createdAt
```

Display the current state:

```
## Evaluating Issue #<number>: <title>

**Current Labels**: <labels or "None">
**State**: <state>
**Created**: <date>

### Current Description
<full body>
```

---

## Step 2: Analyze and Estimate Fields

Carefully read the issue and estimate:

### Priority (P0-Critical to P3-Low)

| Priority | Criteria |
|----------|----------|
| P0-Critical | System broken, security issue, data loss, blocks all users |
| P1-High | Major functionality broken, significant user impact, blocking other work |
| P2-Medium | Important but not urgent, noticeable user impact, should be done soon |
| P3-Low | Nice to have, minor improvement, can wait |

### Effort (T-shirt sizing)

| Effort | Criteria |
|--------|----------|
| XS | < 1 hour, trivial change, single file |
| S | 1-4 hours, simple change, 1-3 files |
| M | Half day to full day, moderate complexity, multiple files |
| L | 2-3 days, significant work, architectural consideration |
| XL | Week+, major feature, multiple components, needs planning |

### Type

| Type | Indicators |
|------|------------|
| Bug | Something is broken, unexpected behavior, error, regression |
| Feature | New functionality, new capability, user-facing addition |
| Tech Debt | Code quality, refactoring, cleanup, performance, dependencies |
| Docs | Documentation, README, comments, examples |

---

## Step 3: Assess Issue Clarity

Determine if the issue is actionable as written:

**Clear Issue Indicators:**
- Specific problem or goal described
- Steps to reproduce (for bugs)
- Acceptance criteria or definition of done
- Relevant file paths or code references
- Enough context to start work

**Unclear Issue Indicators:**
- Vague or ambiguous description
- Missing steps to reproduce
- Multiple unrelated concerns bundled together
- No clear success criteria
- Missing context about where/how

---

## Step 4: Formulate Response

Output the evaluation:

```
## Issue Evaluation: #<number>

### Estimated Fields

| Field | Estimate | Reasoning |
|-------|----------|-----------|
| **Priority** | <P0-P3> | <brief reason based on impact/urgency> |
| **Effort** | <XS-XL> | <brief reason based on scope/complexity> |
| **Type** | <type> | <brief reason based on content> |
```

---

## Step 5: Make Issue Concrete (if needed)

If the issue description could be improved, suggest a more concrete version:

```
### Suggested Improvements

The issue could be made more actionable. Here's a suggested revision:

---

<rewritten issue body that is clearer and more actionable>

---
```

**Guidelines for rewriting:**
- Keep the original intent
- Add structure (problem, solution, acceptance criteria)
- Be specific about what needs to change
- Include relevant file paths if known
- Add steps to reproduce for bugs
- Only rewrite if it genuinely adds value - skip this section if the issue is already clear

---

## Step 6: Questions (Only If Genuinely Needed)

**IMPORTANT**: Only include this section if there are genuine ambiguities that would block implementation. Do NOT ask questions just to fill this section.

If questions are needed:

```
### Questions

Before this issue can be worked on, the following should be clarified:

1. <genuine question about scope, approach, or requirements>
2. <another question if needed>
```

Examples of valid questions:
- "Should the fix maintain backward compatibility with existing saved data?"
- "Is this a user-facing change that needs documentation?"
- "Which browsers need to be supported?"

Do NOT ask obvious questions or questions whose answers are in the issue.

---

## Step 7: Concerns (Only If Real)

**IMPORTANT**: Only include this section if there are genuine concerns that should be considered. Do NOT manufacture concerns.

If concerns exist:

```
### Concerns

⚠️ <genuine concern about approach, risk, or trade-off>
```

Examples of valid concerns:
- "This change might affect performance in the hot path"
- "The proposed approach could break existing integrations"
- "This duplicates functionality in <other component>"

---

## Step 8: Suggestions (Only If Valuable)

**IMPORTANT**: Only include this section if you have genuinely useful suggestions. Do NOT add suggestions just to have something.

If suggestions exist:

```
### Suggestions

💡 <actionable suggestion that adds value>
```

Examples of valid suggestions:
- "Consider combining this with issue #X which addresses the same area"
- "The <existing utility> could be extended to handle this case"
- "Adding a test for the edge case mentioned would prevent regression"

---

## Step 9: Offer to Apply Changes and STOP

End with available actions and **STOP immediately**:

```
---

**Actions available:**
- **Apply estimates**: I can update the issue's project fields with these estimates
- **Update description**: I can apply the suggested improvements to the issue body
- **Add labels**: I can add appropriate labels based on the type

Would you like me to apply any of these changes?
```

**IMPORTANT**: After displaying this message, STOP and wait for user response. Do NOT proceed to implementation.

---

## Step 10: Applying Changes (if requested)

If user wants to apply estimates, update the project board fields:

```bash
# Get project item ID
gh project item-list 3 --owner jcollard --format json

# Update Priority field (field ID: PVTSSF_lADOCQkuPc4A4Q2PzgfZvgI)
gh project item-edit --project-id <project-id> --id <item-id> --field-id PVTSSF_lADOCQkuPc4A4Q2PzgfZvgI --single-select-option-id <priority-option-id>

# Update Effort field
gh project item-edit --project-id <project-id> --id <item-id> --field-id <effort-field-id> --single-select-option-id <effort-option-id>

# Update Type field
gh project item-edit --project-id <project-id> --id <item-id> --field-id <type-field-id> --single-select-option-id <type-option-id>
```

If user wants to update the description:

```bash
gh issue edit <number> --body "<updated body>"
```

If user wants to add labels:

```bash
gh issue edit <number> --add-label "<type>"
```
