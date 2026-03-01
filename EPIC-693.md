# Epic #693: Code Analytics — Complexity Scoring and Duplication Detection

## Overview

Add monorepo-wide code quality analytics focusing on **complexity scoring** and **cross-package duplication detection**. Currently, only `lua-learning-website` and `lua-runtime` have ESLint configs with basic cyclomatic complexity rules. Four packages (`shell-core`, `canvas-runtime`, `ansi-shared`, `export`) have no ESLint at all. There is no duplication detection anywhere.

### Goals
- Consistent complexity rules across all 6 packages
- Cognitive complexity scoring via `eslint-plugin-sonarjs`
- Cross-package duplication detection via `jscpd`
- CI integration for visibility on PRs

## Sub-Issues

| # | Title | Depends On | Status | Branch | PR |
|---|-------|------------|--------|--------|----|
| 1 | Extend ESLint to all packages | — | ✅ Done | epic-693 | — |
| 2 | Add cognitive complexity scoring | 1 | ⏳ Pending | — | — |
| 3 | Add cross-package duplication detection | — | ⏳ Pending | — | — |
| 4 | CI integration | 2, 3 | ⏳ Pending | — | — |

### Dependency Graph

```
Sub-issue 1 ──► Sub-issue 2 ──┐
                               ├──► Sub-issue 4
Sub-issue 3 ──────────────────┘
```

Sub-issues 1 and 3 can be worked in parallel. Sub-issue 2 depends on 1. Sub-issue 4 depends on 2 and 3.

## Architecture Decisions

- **ESLint thresholds**: Match existing `lua-learning-website` config — `complexity: warn at 15`, `max-depth: warn at 4`, `max-params: warn at 5`, `max-lines-per-function: warn at 200`
- **Cognitive complexity**: Use `eslint-plugin-sonarjs` with `sonarjs/cognitive-complexity` warn at 15
- **Duplication detection**: Use `jscpd` — supports TypeScript, configurable thresholds, cross-directory scanning, JSON/HTML reports, `.jscpdignore`
- **Intentional duplication exclusions**: canvas-runtime ↔ export runtime pairing, ANSI subsystem shared logic
- **CI integration**: Integrate into `scripts/ci-local.js` (no `.github/workflows/ci.yml` exists — CI runs locally). May also add a GitHub Actions workflow for PR reporting.
- **Existing overrides**: Preserve existing ESLint overrides in `lua-runtime` and `lua-learning-website`. High-complexity files (CanvasController.ts, useAnsiEditor.ts, useLayerState.ts) should appear as complexity hotspots, not be suppressed.

## Key Files

- `packages/shell-core/` — needs ESLint config
- `packages/canvas-runtime/` — needs ESLint config
- `packages/ansi-shared/` — needs ESLint config (if it exists)
- `packages/export/` — needs ESLint config
- `packages/lua-runtime/eslint.config.js` — existing ESLint config
- `lua-learning-website/eslint.config.js` — existing ESLint config
- `scripts/ci-local.js` — CI integration target
- `package.json` (root) — root-level npm scripts

## Open Questions

1. **CI approach**: Should sub-issue 4 add a GitHub Actions workflow, integrate into `ci-local.js`, or both?
2. **`ansi-shared` package**: Need to verify if this package exists and its structure.
3. **Root lint script**: Does `npm run lint` at root already aggregate package lints, or does it need to be created/updated?

## Progress Log

| Date | Event |
|------|-------|
| 2026-03-01 | Epic created, worktree set up, tracking file initialized |
| 2026-03-01 | Sub-issue 1 complete: ESLint + complexity rules in all 6 packages, root lint script, ci-local.js updated |
