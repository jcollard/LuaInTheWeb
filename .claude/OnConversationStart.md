# Project Context

This file is automatically injected at the start of each Claude Code session.

## Project Overview

LuaInTheWeb is a web-based Lua learning and practice platform that allows users to learn and execute Lua code directly in their browsers.

**Tech Stack:** React 19 + TypeScript 5.9 + Vite 7 + wasmoon (WebAssembly Lua)

## Project Structure

```
lua-learning-website/
├── src/
│   ├── components/     # React components (LuaPlayground, LuaRepl, BashTerminal)
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript type definitions
│   └── __tests__/      # Test files
├── public/             # Static assets
└── package.json        # Dependencies
```

## Documentation

Reference these docs for detailed information (do not load entire files unless needed):

- **Developer Guide**: [docs/README.md](docs/README.md)
- **Getting Started**: [docs/getting-started.md](docs/getting-started.md)
- **Architecture**: [docs/architecture.md](docs/architecture.md)
- **Coding Standards**: [docs/coding-standards.md](docs/coding-standards.md)
- **Testing Guide**: [docs/testing.md](docs/testing.md)
- **Contributing**: [docs/contributing.md](docs/contributing.md)

## Roadmap

- **Current Plans**: [roadmap/README.md](roadmap/README.md)
- **Plan Template**: [roadmap/_template.md](roadmap/_template.md)

For new features, create a plan in the roadmap directory before implementation.

## Development Practices

### Conventions

- **Python**: Always use `python` (not `python3`) for scripts
- **Timestamps**: When updating dates in files, use `date` command to get current timestamp

### Code Architecture

- **UI Components are PURE**: No business logic in UI components - only props, event wiring, and rendering
- **Logic in Hooks**: Extract all business logic into custom hooks for testability
- **CSS Modules**: Use CSS modules for style isolation; REUSE existing modules before creating new ones
- **Strict TypeScript**: No `any`, explicit types, prefer interfaces

See [docs/coding-standards.md](docs/coding-standards.md) for detailed guidelines.

### TDD is MANDATORY

This project follows strict Test-Driven Development with the **Red-Green-Refactor-Mutate** cycle:

1. **RED**: Write a failing test FIRST
2. **GREEN**: Write minimum code to pass
3. **REFACTOR**: Improve while tests pass
4. **MUTATE**: Run scoped mutation tests immediately

Use `/tdd` command for detailed TDD guidelines.

### Mutation Testing (Per Item)

Tests must be verified with mutation testing **immediately after each implementation item** - do NOT batch until the end.

```bash
# Run scoped mutation tests on new files
npm run test:mutation:scope "src/components/NewFeature/**"
```

Use `/mutation-test` command for mutation testing guidelines.

### E2E Testing (At Milestones)

E2E tests are written at **MILESTONE** checkpoints when user flows are complete, not after every item.

Use `/milestone` command when a user-visible flow is ready for E2E testing.

### Before Completing Each Implementation Item

- [ ] Tests written BEFORE implementation (RED)
- [ ] Minimum code to pass (GREEN)
- [ ] Code refactored (REFACTOR)
- [ ] **Scoped mutation tests pass: `npm run test:mutation:scope "path/to/files/**"`**
- [ ] **Mutation score >= 80% on new files**

### At Each MILESTONE Checkpoint

- [ ] E2E test page created (if needed)
- [ ] E2E tests written for completed user flow
- [ ] E2E tests pass: `npm run test:e2e`

### Before Completing Any Plan

- [ ] All tests pass: `npm run test`
- [ ] Full mutation score > 80%: `npm run test:mutation`
- [ ] Linting passes: `npm run lint`
- [ ] All E2E tests pass: `npm run test:e2e`

## Commands

**CRITICAL: All npm commands MUST be run from the `lua-learning-website` directory, NOT the root `LuaInTheWeb` directory.**

```bash
# ALWAYS change to the correct directory first
cd lua-learning-website

npm run dev                  # Start development server
npm run test                 # Run tests
npm run test:watch           # Watch mode
npm run test:mutation        # Full mutation testing (end of plan)
npm run test:mutation:scope "path/**"  # Scoped mutation testing (per item)
npm run build                # Build for production
npm run lint                 # Run linter
npm run test:e2e             # Run E2E tests (Playwright)
```

The project has this structure:
```
LuaInTheWeb/              # Git repository root (DO NOT run npm commands here)
└── lua-learning-website/ # Application directory (RUN npm commands here)
    ├── package.json
    ├── src/
    └── ...
```

## Special Commands

### Roadmap Workflow
- `/prepare-plan` - Prepare next draft plan for implementation (applies TDD, structure, E2E milestones)
- `/review-plan` - Review current plan for compliance before starting
- `/begin` - Create task list and begin implementation (includes mutation + E2E checkpoints)
- `/milestone` - **NEW**: E2E checkpoint when a user flow is complete

### Development Guidelines
- `/tdd` - Inject TDD guidelines (Red-Green-Refactor-Mutate cycle)
- `/new-feature` - Inject new feature development guidelines
- `/e2e` - Inject E2E testing guidelines
- `/mutation-test` - Inject mutation testing guidelines (scoped + full)
- `/code-review` - Inject code review checklist

## Continuation Policy
- NEVER stop to ask "Do you want to continue?" or "Should I proceed?"
- Work through the ENTIRE task list until completion
- If context gets full, auto-compact and continue working
- Only stop for actual blockers (missing info, errors, ambiguity)
- Avoid using bash commands that are not present in @settings.local.json or @.claude/settings.json 
- When you finish. Create another comprehensive ToDo Task List with remaining items and continue until there is nothing left to complete.