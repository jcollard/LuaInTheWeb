# MVP Implementation Plan

This directory contains planning documents for the LuaInTheWeb MVP implementation.

## Documents

| Document | Description |
|----------|-------------|
| [overview.md](overview.md) | High-level summary of all MVP items |
| [dependencies.md](dependencies.md) | Dependency graph and execution order |
| [workstreams.md](workstreams.md) | Parallel workstreams and merge strategy |
| [consolidation.md](consolidation.md) | Issues to consolidate and why |

## Quick Reference

### MVP Scope
- **In Scope**: Issues #12, #33, #14, #20, #26, #82
- **Optional**: Issue #25 (Git support) - nice-to-have, not required
- **Tech Debt**: Issues #51, #70, #71, #72 - workflow improvements

> **Note**: #100 has been consolidated into #33

### Recommended Execution Order
1. **Foundation Work** (Sequential): #12 → #33
2. **Parallel Streams**:
   - Stream A: #82 (Menu Bar Epic - 6 sub-issues: #106-#111)
   - Stream B: #14 (Terminal Epic - 4 sub-issues: #102-#105) → #20 → #26

### Issue Breakdown
| Epic | Sub-Issues |
|------|------------|
| #14 Terminal | #102, #103, #104, #105 |
| #82 Menu Bar | #106, #107, #108, #109, #110, #111 |

### Estimated Complexity
| Effort | Issues |
|--------|--------|
| XS-S | #12 |
| M | #33 |
| L | #26 |
| XL (Epic) | #14, #20 |
| M-L (Epic) | #82 |
