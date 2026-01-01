# AI Contributor Quick Start

**For Claude Code and other AI assistants working on this project.**

---

## Orientation (Read First)

| Document | What You'll Learn |
|----------|-------------------|
| `ARCHITECTURE.md` | Codebase structure, data flow |
| `README.md` | Project overview, features |
| `.claude/README.md` | Navigation guide for .claude/ directory |
| `.claude/TODO-combat-rules-gap-analysis.md` | Current gaps to implement |

---

## Current Active Work

Check `.claude/AR-208-combat-ui-enhancements.md` for the latest active task.

---

## Key Commands

```bash
npm test              # Run all 392 tests
npm run test:smoke    # Fast smoke tests
npm start             # Start server on :3000
npm run cleanup:all   # Kill zombie processes
```

---

## Before Making Changes

1. **Read the file first** - Use Read tool before editing
2. **Run tests** - `npm test` should pass before and after
3. **British spelling** - "armour", "colour", "defence"
4. **No floating point credits** - Use integers only
5. **Follow existing patterns** - Check similar code first

---

## Directory Quick Reference

| Path | Contents |
|------|----------|
| `lib/` | Server-side logic |
| `lib/socket-handlers/ops/` | Role-specific handlers |
| `public/operations/` | Client UI |
| `public/operations/role-panels/` | Per-role UI modules |
| `data/ships/v2/` | Ship templates (JSON) |
| `tests/` | Jest test suites |

---

## Common Tasks

### Add crew role action
1. `lib/socket-handlers/ops/{role}.js` - Add handler
2. `public/operations/role-panels/{role}.js` - Add UI
3. `tests/unit/ops-{role}.test.js` - Add test

### Fix combat rule
1. Check `lib/combat-engine.js`
2. Check `.claude/TODO-combat-rules-gap-analysis.md`
3. Write test first, then implement

### Add ship template
1. Create JSON in `data/ships/v2/`
2. Follow schema in `data/ships/v2/ship-template-v2.schema.json`

---

## What NOT to Do

- Don't create new documentation files unprompted
- Don't refactor code beyond what's asked
- Don't add features the user didn't request
- Don't commit without running tests

---

## Questions?

If unclear about requirements, use `AskUserQuestion` tool to clarify.

---

**Last Updated:** 2025-12-31
