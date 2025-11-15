# Development Practices

## Version Control Strategy

### Git Tagging Convention
Tag every milestone with semantic versioning for migration phases:

```bash
v0.1-migration-infrastructure    # Current: Infrastructure complete
v0.2-migration-basic-ui          # Next: Basic UI functional
v0.3-migration-combat-core       # Core combat mechanics
v0.4-migration-feature-parity    # Full vanilla feature parity
```

**When to tag:**
- After completing a major feature/phase
- Before starting risky refactoring
- When tests pass and code is stable
- At natural rollback points

**Tag format:**
```bash
git tag -a v0.X-description -m "Detailed description of state"
```

### Git Bisect for Debugging

**Primary debugging workflow when something breaks:**

1. **Don't analyze code first** - use bisect to find WHEN it broke
2. **Binary search through history:**
   ```bash
   git bisect start
   git bisect bad                    # Current state is broken
   git bisect good v0.1-migration-infrastructure
   # Test at each midpoint
   npm run build && npm run dev
   # Mark good/bad until exact commit found
   ```
3. **Once found:** Analyze that specific commit's changes
4. **Much faster** than guessing or analyzing current code

### Atomic Commits

**One logical change per commit:**
- ✅ "Add ShipCard component"
- ✅ "Fix CSS import path for Vite"
- ❌ "Update multiple components and fix bugs" (too broad)

**Why:**
- Easy to revert specific changes
- Git bisect works better
- Clear history
- Cherry-pick specific features

### Commit Messages

**Format:**
```
type: Brief description (50 chars)

Longer explanation of WHY this change was made.
What problem does it solve? What was the alternative?

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** feat, fix, refactor, docs, test, chore

## Debugging Practices

### CLI-First Diagnostics

**Always use command-line tools before asking for manual testing:**

```bash
# Test HTTP endpoints
curl -s http://localhost:5173/ | head -20
curl -I http://localhost:5173/  # Headers only

# Check what's serving
fuser 5173/tcp
ps aux | grep -E "(node|vite)"

# Monitor logs
tail -f server.log
# Or use BashOutput for background processes

# Inspect responses
curl -s http://localhost:5173/src/main.tsx | head -10
```

**Avoid:**
- "Please open your browser and check..."
- "Can you manually test..."
- Any request that requires GUI interaction

### Git Tools for Debugging

**When did this change?**
```bash
git log -p src/context/GameContext.tsx  # See all changes to file
git blame src/context/GameContext.tsx   # Who/when for each line
```

**Compare states:**
```bash
git diff v0.1-migration-infrastructure..HEAD  # Changes since tag
git diff <commit1>..<commit2> -- path/to/file  # Specific file changes
```

**Find when bug appeared:**
```bash
git bisect  # See above
```

## Testing Strategy

### Before Tagging
1. `npm run build` - Production build must pass
2. `npm run dev` - Dev server starts clean
3. Check server logs - No errors
4. Verify key functionality works

### Verification Commands
```bash
# Build check
npm run build 2>&1 | tail -20

# Server status
curl -s http://localhost:5173/ | head -10
ps aux | grep node | wc -l

# Backend health
curl -s http://localhost:3000/health || echo "No health endpoint"
```

## Code Review Checklist

Before committing:
- [ ] No console.log left in code (unless intentional)
- [ ] TypeScript builds without errors
- [ ] No unused imports/variables
- [ ] Proper error handling
- [ ] Comments explain WHY, not WHAT

## Branch Strategy

Current: Nested branch approach
- `main` - Stable vanilla app
- `react-migration` - Migration work
- Feature branches off react-migration if needed

**Do not merge to main until:**
- Feature parity achieved
- All tests passing
- Performance acceptable
- Reviewed and approved
