# React Migration - Branch Strategy

**Date:** 2025-11-14
**User Proposal:** Nested branch strategy with sub-branches per step
**Predicted Success Rate:** 80% (2 of 8 steps expected to fail initially)

---

## User's Proposed Strategy

### Branch Structure
```
main (production)
  ↓
react-migration (integration branch)
  ↓
  ├── react-migration-step1 (Foundation)
  ├── react-migration-step2 (Infrastructure)
  ├── react-migration-step3 (Main Menu)
  ├── react-migration-step4 (Ship Selection)
  ├── react-migration-step5 (Combat Display)
  ├── react-migration-step6 (Combat Actions)
  ├── react-migration-step7 (Ship Customizer)
  └── react-migration-step8 (Tutorial)
```

### Workflow
1. Create `react-migration` from `main`
2. For each step:
   - Create `react-migration-step{N}` from `react-migration`
   - Work in step branch
   - If successful: merge to `react-migration`, delete step branch
   - If fails: delete step branch, retry with new branch
3. When all steps merged: merge `react-migration` → `main`

### Rationale
- ✅ If step fails, just delete that branch and retry
- ✅ Clean separation of each step
- ✅ No messy cleanup in `react-migration` branch
- ✅ Can retry failed steps without polluting history

---

## Analysis: Pros and Cons

### PROS ✅

1. **Failure isolation** - Failed step branch just gets deleted, no cleanup needed
2. **Clean retry** - Can restart failed step from clean `react-migration` state
3. **Parallel work possible** - Could work on Step 3 and Step 7 simultaneously (different branches)
4. **Clear history** - Each merge represents a completed, working step
5. **Cherry-pick friendly** - Could cherry-pick successful steps if needed
6. **Rollback easy** - Just don't merge a step if it fails
7. **Matches 80% success prediction** - Designed for expected failures

### CONS ❌

1. **Merge conflicts** - Merging step2 could conflict with step3 work
2. **Branch management overhead** - 10+ branches to track (migration + 8 steps + retries)
3. **Complex merge chain** - Step N+1 depends on Step N being merged first
4. **Sequential dependency** - Can't work on Step 4 until Step 3 merged
5. **Git complexity** - More ceremony, more room for git mistakes
6. **Rebase pain** - If step1 gets updated, all other steps need rebasing

---

## Alternative: Single Branch with Commits

### Structure
```
main
  ↓
react-migration
  - commit: Step 1 complete
  - commit: Step 2 complete
  - commit: Step 3 complete
  - commit: Step 4 complete (FAILED - revert this)
  - commit: Step 4 retry complete
  - commit: Step 5 complete
  ...
```

### Workflow
1. Create `react-migration` from `main`
2. Work on Step 1, commit when done
3. Work on Step 2, commit when done
4. If step fails: `git reset --hard HEAD~1` (revert to previous step)
5. Retry failed step
6. Continue...

### Pros
- ✅ Simpler git workflow
- ✅ Linear history
- ✅ Less overhead
- ✅ Easier to understand

### Cons
- ❌ Failed attempts pollute history (if not reverted immediately)
- ❌ Harder to work in parallel
- ❌ Manual cleanup if step fails

---

## MY RECOMMENDATION: **User's Nested Strategy**

**I support your nested branch approach** for this migration. Here's why:

### Key Reasons

1. **You predict 2/8 steps will fail** - The nested strategy is designed for this
2. **Clean failure recovery** - Just delete failed branch, no history pollution
3. **Psychological benefit** - Each step branch is a contained experiment
4. **Worth the overhead** - For an 80% success prediction, the safety is valuable
5. **Learning opportunity** - If step fails, we have clean state to analyze

### When NOT to Use This Strategy

For reference, single-branch would be better if:
- ❌ High confidence (>95% success)
- ❌ Simple migration (all steps low risk)
- ❌ Time-constrained (can't afford ceremony)
- ❌ Solo developer with linear workflow

**But this migration is:**
- ✅ Medium confidence (80% success)
- ✅ Complex migration (expected failures)
- ✅ Not time-constrained (quality over speed)
- ✅ Willing to handle git complexity

---

## Refined Nested Strategy

Let me refine your proposal slightly:

### Branch Naming
```
main
  ↓
react-migration          (integration branch - never work directly)
  ↓
  ├── rm-step1-foundation
  ├── rm-step2-infrastructure
  ├── rm-step3-mainmenu
  ├── rm-step4-shipselection
  ├── rm-step5-combat-display
  ├── rm-step6-combat-actions
  ├── rm-step7-customizer
  └── rm-step8-tutorial
```

**Why shorter names:** Easier to type, less verbose

### Workflow Detail

#### Starting a Step
```bash
# Ensure react-migration is current
git checkout react-migration
git pull

# Create step branch
git checkout -b rm-step1-foundation

# Work on step...
# Commit frequently with descriptive messages
git add .
git commit -m "Step 1: Add Vite config"
```

#### Step Succeeds
```bash
# Merge to integration branch
git checkout react-migration
git merge --no-ff rm-step1-foundation -m "Merge Step 1: Foundation complete"

# Delete step branch
git branch -d rm-step1-foundation

# Push integration branch
git push origin react-migration

# Document in migration log
echo "Step 1: SUCCESS - took 1.5 hours" >> docs/REACT-MIGRATION-LOG.md
```

#### Step Fails
```bash
# Abandon step branch
git checkout react-migration

# Delete failed branch (no merge)
git branch -D rm-step1-foundation

# Document failure
echo "Step 1: FAILED - reason: <specific error>" >> docs/REACT-MIGRATION-LOG.md

# Analyze what went wrong
# Fix issues in vanilla first if needed
# Retry when ready

# Create fresh retry branch
git checkout -b rm-step1-foundation-retry2
```

### Parallel Work (Advanced)

For independent steps (e.g., Step 3 and Step 7):

```bash
# After Step 2 merged, can work on both
git checkout react-migration
git checkout -b rm-step3-mainmenu

# Separately
git checkout react-migration
git checkout -b rm-step7-customizer

# Both can develop independently
# Merge whichever completes first
```

---

## Migration Log Location (Safe from Branch Deletion)

**Critical:** Keep migration log in a place that survives branch deletion

### Recommended Location
```
docs/REACT-MIGRATION-LOG.md
```

**Why safe:**
- ✅ In `docs/` directory (committed to main)
- ✅ Tracked on `main` branch
- ✅ Survives all branch deletions
- ✅ Easy to update from any branch

### Usage
```bash
# From any step branch
# Commit log update to react-migration branch
git checkout react-migration
git add docs/REACT-MIGRATION-LOG.md
git commit -m "docs: Update migration log - Step 1 complete"
git push origin react-migration

# This ensures log is never lost
```

---

## Migration Log Template

Create this file NOW (before starting migration):

**File:** `docs/REACT-MIGRATION-LOG.md`

```markdown
# React Migration Execution Log

**Started:** [date/time]
**Strategy:** 8-step incremental migration with nested branches
**Predicted Success Rate:** 80% (expect 2 steps to fail initially)

---

## Step 1: Foundation
**Status:** 🔴 Not Started
**Branch:** rm-step1-foundation
**Started:**
**Completed:**
**Duration:**
**Attempts:** 0

**What worked:**
-

**What broke:**
-

**How we fixed it:**
-

**Gotchas:**
-

---

## Step 2: Infrastructure
**Status:** 🔴 Not Started
**Branch:** rm-step2-infrastructure
...

[Repeat for all 8 steps]
```

---

## Expected Timeline with Nested Branches

| Step | Work | Merge/Retry | Total |
|------|------|-------------|-------|
| 1 | 1h | 15min | 1.25h |
| 2 | 2h | 15min | 2.25h |
| 3 | 1h | 15min | 1.25h |
| 4 | 3h | 30min (expected retry) | 3.5h |
| 5 | 3h | 15min | 3.25h |
| 6 | 4h | 1h (expected retry) | 5h |
| 7 | 3h | 15min | 3.25h |
| 8 | 6h | 30min | 6.5h |
| **Total** | **23h** | **3.75h** | **26.75h** |

**Overhead:** ~16% (acceptable for safety)

---

## Final Recommendation

✅ **USE THE NESTED BRANCH STRATEGY**

**Reasons:**
1. Designed for expected failures (2/8 steps)
2. Clean recovery from failures
3. Worth the overhead for this complex migration
4. Matches your engineering experience (you predicted 80%)
5. Psychological safety - each step is contained

**With refinements:**
- Shorter branch names (`rm-step1-foundation`)
- Migration log in `docs/` (safe location)
- Clear merge messages with `--no-ff`
- Document everything in migration log

---

**Approved:** ✅ Recommended approach
**Next:** Create 8 detailed step plans with tests and cleanup checklists

---

**Last Updated:** 2025-11-14
