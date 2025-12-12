# Documentation Guide - What & When to Document

## Purpose

Claude instances have ZERO memory between sessions. Documentation is the ONLY way to maintain context, decisions, and practices across sessions.

## When to Document

### ✅ ALWAYS Document:

1. **Architectural decisions**
   - Why React over vanilla
   - State management approach
   - File structure rationale

2. **Developer preferences**
   - Working style (Bruce: CLI-first)
   - Communication preferences
   - Technical background

3. **Project status**
   - What's complete, in-progress, pending
   - Current blockers
   - Next steps

4. **Complex debugging solutions**
   - Root cause analysis
   - Why the fix works
   - How to detect if it breaks again

5. **Non-obvious technical choices**
   - "Why did we use useCallback here?"
   - "Why copy CSS to src/ instead of importing from public/?"

6. **Git workflow and practices**
   - Tagging strategy
   - Commit message format
   - When to use bisect

### ❌ DON'T Document:

1. **Obvious code patterns**
   - Standard React component structure
   - Common TypeScript patterns
   - Self-explanatory variable names

2. **Temporary decisions**
   - "Using placeholder text for now"
   - Interim solutions that will change

3. **Implementation details already in code**
   - Function logic (use comments instead)
   - Component structure (self-documenting)

## How Much to Document

### Minimum Viable Documentation

**For each coding session, update AT LEAST:**
1. **MIGRATION-STATUS.md** - What was completed
2. **DEVELOPMENT-PRACTICES.md** - If new practices adopted
3. **Git tags** - For completed milestones

**Estimated overhead:** 5-10 minutes per session

### Comprehensive Documentation

**For major milestones or complex work:**
1. All of the above, plus:
2. Architecture decision records (if applicable)
3. Troubleshooting guides for recurring issues
4. Updated README with new features

**Estimated overhead:** 15-30 minutes per major milestone

## Document Lifecycle

### When to Create New Docs

**Create a new document when:**
- New major component/system added
- Architectural pattern introduced
- Complex feature requires explanation
- Recurring issue needs troubleshooting guide

**File naming:**
- `COMPONENT-NAME.md` - For specific components
- `SYSTEM-NAME.md` - For architectural systems
- `TROUBLESHOOTING-ISSUE.md` - For recurring problems

### When to Update Existing Docs

**Update when:**
- Project status changes (MIGRATION-STATUS.md)
- Practices evolve (DEVELOPMENT-PRACTICES.md)
- Developer context changes (rare for DEVELOPER-CONTEXT.md)
- Decisions change or are refined

### When to Archive/Delete Docs

**Archive when:**
- Document no longer relevant (e.g., vanilla-specific docs after migration)
- Move to `docs/archive/` instead of deleting

**Delete when:**
- Temporary decision docs after permanent solution
- Duplicate information consolidated elsewhere

## Documentation Standards

### Format

**All docs should have:**
```markdown
# Title

Brief 1-2 sentence summary

## Section Headers

Clear hierarchy with ##, ###

## Code Examples

```bash
# With syntax highlighting
git tag -a v0.1
```

## Lists

- Bullet points for items
- Checkboxes for TODOs: [ ] or [x]

## Dates

Include "Last Updated: YYYY-MM-DD" at bottom for status docs
```

### Writing Style

**For Claude instances:**
- Be explicit, not implicit
- Include WHY, not just WHAT
- Provide examples
- Link to relevant code/commits
- Assume zero prior knowledge

**For humans:**
- Concise but complete
- Scannable (headers, bullets)
- Context-aware (link to related docs)

## Core Documentation Set

### Essential Files (maintain these)

1. **DEVELOPMENT-PRACTICES.md** - How we work
2. **DEVELOPER-CONTEXT.md** - Who we're working with
3. **MIGRATION-STATUS.md** - Where we are
4. **DOCUMENTATION-GUIDE.md** - This file

### Optional Files (create as needed)

- **ARCHITECTURE.md** - System design
- **TROUBLESHOOTING.md** - Common issues
- **API.md** - API documentation
- **CONTRIBUTING.md** - For external contributors

## Meta-Documentation

### This Guide Should Be Updated When:

- New documentation best practice discovered
- Documentation strategy changes
- File structure changes
- New recurring documentation need identified

### Overhead Budget

**Target:** 10-15% of coding time
- Too little: Context loss between sessions
- Too much: Diminishing returns

**Typical session:**
- 1 hour coding → 6-9 minutes documentation
- 4 hours coding → 24-36 minutes documentation

### Measuring Effectiveness

**Good indicators:**
- New session starts quickly (< 5 min context loading)
- Decisions don't get re-litigated
- Practices remain consistent
- No "why did we do this?" questions

**Bad indicators:**
- Spending 20+ minutes re-understanding codebase
- Repeating same debates
- Re-discovering same solutions
- Confusion about project state

## Templates

### Session Update Template

```markdown
## Session Date: YYYY-MM-DD

**Completed:**
- [x] Item 1
- [x] Item 2

**In Progress:**
- [ ] Item 3

**Blockers:**
- None / List blockers

**Decisions Made:**
- Decision 1: Rationale
- Decision 2: Rationale

**Next Session:**
- [ ] TODO 1
- [ ] TODO 2

**Git Tags Created:**
- v0.X-description
```

### Decision Record Template

```markdown
# Decision: [Title]

**Date:** YYYY-MM-DD
**Status:** Accepted / Rejected / Superseded
**Deciders:** Bruce + Claude

## Context

What's the situation requiring a decision?

## Decision

What we decided to do.

## Rationale

Why this decision was made.
- Pro 1
- Pro 2
- Con 1 (acceptable because...)

## Alternatives Considered

- Alternative 1: Why not chosen
- Alternative 2: Why not chosen

## Consequences

What follows from this decision?
- Positive consequence 1
- Negative consequence 1

## Review Date

When should we revisit this? (Optional)
```

---

**Last Updated:** 2025-11-15
**Next Review:** When documentation practice changes
