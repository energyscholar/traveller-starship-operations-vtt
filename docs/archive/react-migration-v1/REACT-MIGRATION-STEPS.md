# React Migration - 8 Step Incremental Strategy

**Date:** 2025-11-14
**Approach:** Incremental migration with independent testing at each step
**Total Steps:** 8

---

## Migration Steps (Ordered by Dependency)

### Step 1: Foundation (React + Vite + Router)
**What:** Basic React app with routing skeleton
**Deliverable:** Can navigate between placeholder pages
**Test:**
- ✅ React app loads at localhost:5173
- ✅ Can navigate to /menu, /ship-selection, /combat
- ✅ No errors in console

**Time Estimate:** 1 hour
**Risk:** Low
**Blockers:** None

---

### Step 2: Infrastructure (Socket.IO + GameContext)
**What:** Core connection and state management
**Deliverable:** Socket connection working, GameContext managing state
**Test:**
- ✅ Socket connects to backend
- ✅ Can see connection events in console
- ✅ GameContext state updates on socket events
- ✅ useSocket hook working

**Time Estimate:** 2 hours
**Risk:** Medium (socket event mapping)
**Blockers:** Step 1 complete

---

### Step 3: Main Menu Screen
**What:** First complete screen (simplest)
**Deliverable:** Main menu fully functional in React
**Test:**
- ✅ Menu displays correctly
- ✅ All buttons navigate to correct routes
- ✅ Styling matches vanilla version
- ✅ No socket complexity (navigation only)

**Time Estimate:** 1 hour
**Risk:** Low
**Blockers:** Steps 1-2 complete

---

### Step 4: Ship Selection Screen
**What:** Ship selection with socket integration
**Deliverable:** Can select ships, ready up, socket events working
**Test:**
- ✅ Ships display from server data
- ✅ Can select ship (player 1 and player 2)
- ✅ Can choose starting range
- ✅ Ready button sends socket event
- ✅ Transitions to combat when both ready

**Time Estimate:** 3 hours
**Risk:** Medium (first complex socket integration)
**Blockers:** Steps 1-3 complete

---

### Step 5: Combat Screen - Display Only
**What:** Read-only combat HUD (no actions)
**Deliverable:** Can view combat state, ships, stats, combat log
**Test:**
- ✅ Combat HUD displays when combat starts
- ✅ Player ship shows correct stats
- ✅ Opponent ship shows correct stats
- ✅ Range displayed correctly
- ✅ Turn indicator shows active player
- ✅ Combat log updates in real-time
- ✅ Hull bars animate on damage
- ❌ No actions working yet (buttons disabled)

**Time Estimate:** 3 hours
**Risk:** Medium (complex UI, many socket events)
**Blockers:** Steps 1-4 complete

**Why Split Combat?**
- Display is complex enough on its own
- Can test socket event reception independently
- Reduces debugging scope (display bugs vs. action bugs)
- Allows visual testing before interaction testing

---

### Step 6: Combat Screen - Actions & Interaction
**What:** Add combat actions (fire, dodge, end turn, etc.)
**Deliverable:** Full interactive combat gameplay
**Test:**
- ✅ Can select turret, target, weapon
- ✅ Fire button sends correct socket event
- ✅ Dodge button works
- ✅ End Turn button works
- ✅ Point defense works
- ✅ Sandcaster works
- ✅ Jump Away works
- ✅ Actions update combat state
- ✅ Turn timer works
- ✅ "Use Default" quick-fire works

**Time Estimate:** 4 hours
**Risk:** High (most complex interactions, many socket events)
**Blockers:** Steps 1-5 complete

---

### Step 7: Ship Customizer & Templates
**What:** Migrate ship-customizer.html and ship-templates.html
**Deliverable:** Ship customizer and templates viewer in React
**Test:**
- ✅ Can view ship templates
- ✅ Can customize ship components
- ✅ Validation working
- ✅ Export/import working
- ✅ Styling matches vanilla version

**Time Estimate:** 3 hours
**Risk:** Low-Medium (separate from main combat flow)
**Blockers:** Steps 1-2 complete (doesn't depend on combat screens)

**Why Combined?**
- Both are ship-related viewing/editing tools
- No socket complexity
- Can be done in parallel with combat work
- Share similar React patterns

---

### Step 8: Tutorial System (DEFERRED - LAST)
**What:** Migrate all 7 tutorial files
**Deliverable:** Tutorial working across all React screens
**Test:**
- ✅ Tutorial modal displays
- ✅ Tutorial pointer positions correctly
- ✅ Tutorial chat works
- ✅ Tutorial tooltip shows
- ✅ Tutorial persists across route changes
- ✅ Tutorial scenarios play correctly
- ✅ Can exit tutorial cleanly

**Time Estimate:** 6 hours
**Risk:** High (complex DOM manipulation, state persistence)
**Blockers:** Steps 1-6 complete (needs working screens to tutorial)

**Why Last?**
- Most complex subsystem (7 interconnected files)
- Requires all screens working first
- Not critical for core functionality
- Guaranteed to break during initial migration
- DOM manipulation requires special React handling

---

## Step Dependencies (Visual)

```
Step 1: Foundation
    ↓
Step 2: Infrastructure
    ↓
    ├─→ Step 3: Main Menu (quick win)
    │       ↓
    ├─→ Step 4: Ship Selection
    │       ↓
    ├─→ Step 5: Combat Display
    │       ↓
    ├─→ Step 6: Combat Actions
    │       ↓
    ├─→ Step 7: Ship Customizer (can do in parallel)
    │
    └─→ Step 8: Tutorial (LAST, after all screens working)
```

---

## Why 8 Steps (Not 4, Not 10)?

### Too Few Steps (e.g., 4)
❌ Steps too large, hard to debug
❌ Can't isolate failures
❌ Testing becomes complex
❌ More likely to fail and restart

### Too Many Steps (e.g., 12+)
❌ Overhead of testing each tiny step
❌ Artificial splits (e.g., splitting Main Menu into multiple steps)
❌ Slower overall progress
❌ More ceremony than value

### 8 Steps - Just Right ✅
✅ Each step is independently testable
✅ Each step has clear deliverable
✅ Natural boundaries (screens, infrastructure, features)
✅ Can parallelize some steps (e.g., Step 7 during Steps 5-6)
✅ Manageable scope per step (1-4 hours each)
✅ Total effort: ~23 hours (realistic for incremental approach)

---

## Success Criteria Per Step

**Each step must pass before moving to next:**
1. ✅ All existing tests still pass (197 tests)
2. ✅ New React code has no console errors
3. ✅ Functionality matches vanilla version
4. ✅ Can commit and deploy this step independently
5. ✅ Manual testing shows feature working

**If step fails:**
- Fix bugs in THAT step only
- Don't move forward with broken foundation
- Document what broke and how fixed
- Update step time estimate if needed

---

## Parallel Work Opportunities

Some steps can be done in parallel:
- **Step 7 (Ship Customizer)** can start after Step 2 (doesn't depend on combat screens)
- **Step 8 (Tutorial)** must wait for all screens (Steps 3-6)

This could reduce total calendar time if working with multiple developers.

---

## Time Estimates

| Step | Estimate | Risk |
|------|----------|------|
| 1. Foundation | 1 hour | Low |
| 2. Infrastructure | 2 hours | Medium |
| 3. Main Menu | 1 hour | Low |
| 4. Ship Selection | 3 hours | Medium |
| 5. Combat Display | 3 hours | Medium |
| 6. Combat Actions | 4 hours | High |
| 7. Ship Customizer | 3 hours | Low-Med |
| 8. Tutorial | 6 hours | High |
| **Total** | **23 hours** | |

**Note:** These are WORK hours, not calendar hours. With breaks, debugging, and learning: estimate **30-35 hours** calendar time.

Compare to previous big-bang estimate: 7-8 hours (unrealistic)

---

## Migration Approach Per Step

For each step:
1. **Create React component(s)** for that step
2. **Test in isolation** (can use vanilla as reference)
3. **Manual testing** against vanilla version
4. **Commit** when working
5. **Document** any issues/gotchas
6. **Move to next step**

**Keep vanilla running** until React version 100% working.

---

## Rollback Strategy

If any step fails catastrophically:
1. **Stop** - don't compound errors
2. **Document** what broke in `REACT-MIGRATION-LOG.md`
3. **Assess** - can we fix or need to rethink?
4. **Fix or rollback** that step only
5. **Don't delete branch** - keep for learning

---

**Last Updated:** 2025-11-14
**Status:** Planning - Not yet executed
**Next:** Await user approval of 8-step approach

---

## Note on Documentation Cleanup

**When migration successful:**
- ✅ Keep `REACT-MIGRATION-STEPS.md` (this file) - useful reference
- ✅ Keep `REACT-MIGRATION-SCOPE.md` - lessons learned
- ❌ Delete `REACT-MIGRATION-PLAN.md` - big-bang approach (failed)
- ❌ Delete `REACT-MIGRATION-QUICKSTART.md` - big-bang approach (failed)
- ❌ Delete `REACT-MIGRATION-RISK-ANALYSIS.md` - big-bang approach (failed)
- ✅ Mine failed plans for any useful insights before deletion
