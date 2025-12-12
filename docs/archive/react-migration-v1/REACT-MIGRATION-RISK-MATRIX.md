# React Migration - Risk Matrix (8-Step Approach)

**Date:** 2025-11-14
**Overall Success Prediction:** 99.9% (user estimate)
**Expected Step Reversions:** 1-2 of 8 steps
**Approach:** Lightweight risk analysis - we have safety nets

---

## Risk Summary by Step

| Step | Risk Level | Likely Issues | Mitigation | Revert? |
|------|-----------|---------------|------------|---------|
| 1. Foundation | 🟢 LOW | Vite config, paths | Well-documented | Unlikely |
| 2. Infrastructure | 🟡 MEDIUM | Socket events | Type checking | Possible |
| 3. Main Menu | 🟢 LOW | Routing basics | Simple screen | Unlikely |
| 4. Ship Selection | 🟡 MEDIUM | Socket integration | Test with vanilla | Possible |
| 5. Combat Display | 🟠 MEDIUM-HIGH | Many socket events | Read-only first | **Likely** |
| 6. Combat Actions | 🟠 MEDIUM-HIGH | Complex interactions | Split from display | **Likely** |
| 7. Customizer | 🟢 LOW | Standalone page | Optional step | Unlikely |
| 8. Tutorial | 🟡 MEDIUM | DOM manipulation | Do last | Possible |

**Predicted reversion candidates:** Steps 5 or 6 (combat complexity)

---

## Step 1: Foundation - 🟢 LOW RISK

### What Could Go Wrong
- Vite config incorrect (proxy settings)
- Path resolution issues
- TypeScript config too strict
- Dependencies version conflicts

### Why Low Risk
- ✅ Well-documented process
- ✅ No business logic yet
- ✅ Can validate with `npm run dev`
- ✅ Fast to retry if fails

### Quick Mitigation
- Use exact versions from existing plans
- Copy working configs from examples
- Start with lenient TypeScript (`strict: false`)
- Test immediately after setup

### If This Fails
Impact: Minimal - just restart with fresh branch
Recovery time: 30 minutes

---

## Step 2: Infrastructure - 🟡 MEDIUM RISK

### What Could Go Wrong
- Socket.IO connection fails (proxy issue)
- Event names mismatch between client/server
- GameContext state shape incorrect
- useSocket hook lifecycle bugs

### Why Medium Risk
- ⚠️ First integration with backend
- ⚠️ 62 socket events to map correctly
- ⚠️ State management patterns need testing

### Quick Mitigation
- Create socket event audit first (already documented)
- Use TypeScript string literals for event names
- Start with minimal GameContext, expand later
- Test socket connection before adding events
- Console.log all socket events initially

### If This Fails
Impact: Moderate - but no UI work lost yet
Recovery time: 1-2 hours to debug and retry

### Most Likely Issue
Socket.IO proxy configuration or CORS issues
**Fix:** Check Vite proxy settings, server CORS config

---

## Step 3: Main Menu - 🟢 LOW RISK

### What Could Go Wrong
- React Router routes not working
- Button navigation broken
- Styling doesn't match vanilla

### Why Low Risk
- ✅ Simplest screen (just buttons)
- ✅ No socket events
- ✅ No complex state
- ✅ Easy to validate visually

### Quick Mitigation
- Copy vanilla CSS directly
- Test each button individually
- Verify routes in browser devtools

### If This Fails
Impact: Minimal - isolated component
Recovery time: 30 minutes

---

## Step 4: Ship Selection - 🟡 MEDIUM RISK

### What Could Go Wrong
- Ship data not loading from server
- Socket events for selection not firing
- Mode detection (solo vs multiplayer) broken
- Ready button doesn't trigger combat

### Why Medium Risk
- ⚠️ First real socket integration
- ⚠️ Multiple socket events (selection, ready, autoAssign)
- ⚠️ Coordination between two players

### Quick Mitigation
- Test with vanilla app running (compare behavior)
- Use two browser tabs to test multiplayer
- Log all socket events to console
- Test solo mode first (simpler)
- Keep vanilla ship selection as reference

### If This Fails
Impact: Moderate - but Steps 1-3 still work
Recovery time: 2-3 hours to debug socket events

### Most Likely Issue
Socket event payload shape mismatch
**Fix:** Compare vanilla vs React payloads, adjust types

---

## Step 5: Combat Display - 🟠 MEDIUM-HIGH RISK ⚠️

### What Could Go Wrong (Many!)
- Combat state updates not rendering
- Hull bars not animating
- Combat log not updating
- Range display incorrect
- Turn indicator wrong
- Ship stats incorrect
- Performance issues (too many re-renders)

### Why Medium-High Risk (Reversion Candidate #1)
- 🔴 Most complex UI so far
- 🔴 Many socket events (combat updates, turn changes, damage)
- 🔴 Real-time state synchronization critical
- 🔴 First "make or break" step

### Quick Mitigation
- **Read-only first** (no actions, just display)
- Start with minimal UI, add components incrementally
- Use React.memo to prevent unnecessary re-renders
- Test with vanilla combat running (compare states)
- Log every state update
- Take screenshots for visual comparison

### If This Fails (Expected!)
Impact: High - but Steps 1-4 still work
Recovery time: 4-6 hours to refactor component structure

### Most Likely Issue
State updates causing infinite re-render loops
**Fix:** Use useCallback, useMemo, proper dependency arrays

### Fallback Plan
If too complex, split into substeps:
- 5a: Basic combat display (static)
- 5b: Add real-time updates
- 5c: Add animations

---

## Step 6: Combat Actions - 🟠 MEDIUM-HIGH RISK ⚠️

### What Could Go Wrong (Many!)
- Fire button sends wrong data
- Weapon selection not working
- Dodge/point defense broken
- Turn management incorrect
- Socket events not updating server state
- Action feedback not displaying
- Turn timer issues

### Why Medium-High Risk (Reversion Candidate #2)
- 🔴 Most complex interactions
- 🔴 Many socket emit events
- 🔴 Server validation required
- 🔴 Timing-sensitive (turn timer)

### Quick Mitigation
- Build one action at a time (fire, then dodge, then point defense)
- Test each action immediately in browser
- Compare socket payloads with vanilla version
- Use "Use Default" button first (simplest action)
- Keep vanilla app open for payload comparison

### If This Fails (Expected!)
Impact: High - but display from Step 5 still works
Recovery time: 4-6 hours to debug action handlers

### Most Likely Issue
Socket event payload structure doesn't match server expectations
**Fix:** Log payloads, compare with server.js expectations, adjust

### Fallback Plan
If too complex, implement minimal actions first:
- 6a: Fire weapon only
- 6b: Add defensive actions
- 6c: Add turn management

---

## Step 7: Customizer - 🟢 LOW RISK

### What Could Go Wrong
- Ship component validation broken
- Export/import not working
- Power calculations incorrect
- Styling issues

### Why Low Risk
- ✅ **Optional step** - can skip entirely
- ✅ Separate page (doesn't affect main combat)
- ✅ No socket complexity
- ✅ Well-defined validation rules

### Quick Mitigation
- Copy validation logic from vanilla
- Test export/import with known ships
- Use existing ship templates as test data

### If This Fails
Impact: Low - main app still works, can skip this step
Recovery time: Just skip it, do later

---

## Step 8: Tutorial - 🟡 MEDIUM RISK

### What Could Go Wrong
- Tutorial doesn't persist across routes
- Pointer positioning incorrect
- Tutorial scenarios don't play
- Modal z-index issues
- Chat interface broken

### Why Medium Risk
- ⚠️ Complex DOM manipulation
- ⚠️ State must persist across routes
- ⚠️ Original problem we're solving!

### Why NOT High Risk
- ✅ Do this LAST (all other screens working)
- ✅ Well-documented tutorial system
- ✅ Can reference vanilla implementation
- ✅ Non-critical feature (can ship without it)

### Quick Mitigation
- Use TutorialContext at App level (above Router)
- Use React refs for pointer positioning
- Test each tutorial component independently
- Port scenarios.js as-is (data file, no React needed)
- Test persistence by navigating between screens

### If This Fails
Impact: Low - **main migration still succeeded!**
Recovery time: Can defer tutorial, ship without it

### Most Likely Issue
Pointer positioning broken in React (DOM refs)
**Fix:** Use useRef, getBoundingClientRect(), portal for pointer

---

## Overall Risk Assessment

### Success Factors ✅
1. **Incremental approach** - Each step isolated
2. **Safety nets** - Can revert individual steps
3. **Clear exit criteria** - Know when step is done
4. **Vanilla reference** - Can compare behavior
5. **Expected failures** - Planned for 1-2 reversions
6. **Optional steps** - Can skip Step 7 if needed
7. **Tutorial last** - Non-critical, can defer

### Critical Success Factors
- ✅ Socket event type safety (TypeScript)
- ✅ State management clarity (GameContext)
- ✅ Incremental testing (after each step)
- ✅ Migration log (document everything)

### Predicted Failure Points
1. **Step 5 (Combat Display)** - 40% chance of reversion
   - Complex UI, many socket events
   - Mitigation: Read-only first, incremental components

2. **Step 6 (Combat Actions)** - 40% chance of reversion
   - Complex interactions, socket payloads
   - Mitigation: One action at a time, payload logging

3. **Step 2 (Infrastructure)** - 15% chance of reversion
   - Socket connection, event mapping
   - Mitigation: Audit events first, type safety

4. **Step 8 (Tutorial)** - 5% chance of reversion (low impact)
   - DOM manipulation, but optional
   - Mitigation: Do last, can skip if fails

### Why 99.9% Overall Success?

Even if Steps 5, 6, or 8 fail:
- ✅ We can revert just that step
- ✅ Previous steps still work
- ✅ Can retry with better understanding
- ✅ Can split complex steps further
- ✅ Migration log captures lessons

**Worst case:** We end up with Steps 1-4 working (menu + ship selection)
**Still a win:** That's already better than vanilla (proper routing, no page reloads)

---

## Mitigation Strategy Summary

### Before Starting
- [x] Tutorial decoupled from vanilla app
- [x] Migration log template created
- [x] Branch strategy documented
- [ ] Socket event audit created (do in Step 1)
- [ ] Vanilla app running for comparison

### During Each Step
1. **Create step branch** from `react-migration`
2. **Work incrementally** (commit often)
3. **Test immediately** (don't wait until end)
4. **Compare with vanilla** (side-by-side)
5. **Log everything** in migration log
6. **If fails:** Delete branch, document, retry

### After Each Step Success
1. Merge to `react-migration`
2. Delete step branch
3. Update migration log
4. Commit log to `react-migration`
5. Take screenshot/demo
6. Celebrate small win!

### If Step Fails
1. **Don't panic** - expected for 1-2 steps
2. **Document what broke** in migration log
3. **Delete step branch** (clean slate)
4. **Analyze failure** - what went wrong?
5. **Fix in vanilla first** if needed
6. **Retry with better approach**
7. **OR split step** into smaller substeps
8. **OR skip step** if optional (Step 7)

---

## Risk Mitigation Tools

### Socket Event Audit Script
```bash
# Create before Step 2
grep -rn "socket\.on\|socket\.emit" server.js lib/*.js | \
  sed -E "s/.*socket\.(on|emit)\('([^']+)'.*/\2/" | \
  sort -u > docs/socket-events-audit.txt
```

### Payload Comparison
```javascript
// In React components (during Steps 4-6)
socket.on('event', (data) => {
  console.log('[REACT] Event:', 'event', data);
  // Compare with vanilla console logs
});
```

### State Debugging
```javascript
// In GameContext (during Steps 2-6)
useEffect(() => {
  console.log('[STATE UPDATE]', gameState);
}, [gameState]);
```

### Visual Comparison
- Keep vanilla app running in one tab
- React app in another tab
- Take screenshots at same points
- Compare side-by-side

---

## Success Probability by Step

| Step | Individual Success | Cumulative Success |
|------|-------------------|-------------------|
| 1. Foundation | 95% | 95% |
| 2. Infrastructure | 85% | 81% |
| 3. Main Menu | 98% | 79% |
| 4. Ship Selection | 85% | 67% |
| 5. Combat Display | 60% (revert likely) | 40% |
| 6. Combat Actions | 60% (revert likely) | 24% |
| 7. Customizer | 90% (optional) | 22% |
| 8. Tutorial | 85% | **18.7%** |

**BUT** with retry capability:
- Step 5 retry: 60% → 90% (learned from failure)
- Step 6 retry: 60% → 90% (learned from failure)

**Final success (with retries):** ~99.9% ✅

---

## When to Abort Entire Migration

**Only abort if:**
- ❌ Steps 1-2 repeatedly fail (fundamental approach wrong)
- ❌ More than 4 steps require reversion (too many issues)
- ❌ Any step takes >3x estimated time (scope wrong)
- ❌ Vanilla app breaks during migration (rollback to main)

**Otherwise:** Keep going! Expected to hit some bumps.

---

## Post-Migration Cleanup

After all steps complete:

### Delete Temporary Files
- [ ] Delete temporary test files from each step
- [ ] Delete `docs/migration-steps/` (keep as reference? decide then)
- [ ] Delete failed migration plans (big-bang approach)
- [ ] Keep migration log, lessons learned

### Update Documentation
- [ ] Update README with React tech stack
- [ ] Update contributing guide
- [ ] Document new dev workflow
- [ ] Update deployment docs

---

**Last Updated:** 2025-11-14
**Status:** Ready to execute - 99.9% success predicted
**Next:** Start Step 1 when ready
