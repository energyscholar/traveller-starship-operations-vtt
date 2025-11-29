# VTT Autorun Script - Comprehensive Task List

**Created:** 2025-11-28
**Mode:** Autonomous execution with bypass permissions
**Scope:** React Migration Phase 2 + Technical Debt Resolution + Polish
**Estimated Time:** 15-20 hours of autonomous work
**Goal:** Maximum progress on React migration and code quality improvements

---

## Priority Structure

User requested:
- ✅ Include Stage 2 (React Migration Phase 2)
- ✅ All LOW priority technical debt items
- ✅ MEDIUM priority items deemed safe
- ✅ As much work and as many tasks as reasonable

---

## SECTION 1: REACT MIGRATION PHASE 2 (High Priority)

### Task 1.1: Vanilla Codebase Feature Inventory (30-45 min)
**Priority:** HIGH
**Risk:** LOW (read-only analysis)

Scan vanilla `public/app.js` and identify all features not yet in React:
- Hex grid rendering/interaction
- Ship movement mechanics
- Weapon systems UI (beyond basic combat)
- Combat resolution display details
- Crew management UI
- Turn management UI
- Combat log with full event details
- Ship customization
- Any other vanilla features

**Output:** Create `client/docs/VANILLA-FEATURES-INVENTORY.md`

---

### Task 1.2: Prioritize Feature Migration Order (15-20 min)
**Priority:** HIGH
**Risk:** LOW (planning only)

Based on inventory, create migration priority list:
1. Critical path features (needed for playability)
2. High-value UX features (significantly improves experience)
3. Polish features (nice-to-have)

**Output:** Add to `client/docs/MIGRATION-STATUS.md` - "Feature Migration Roadmap" section

---

### Task 1.3: Migrate Hex Grid Rendering (2-3 hours)
**Priority:** HIGH
**Risk:** MEDIUM (complex canvas/SVG work)

Port hex grid rendering from vanilla to React:
- Create `client/src/components/HexGrid.tsx`
- Implement grid coordinate system
- Add ship positioning
- Add visual indicators for range bands
- Test with different screen sizes
- Write basic tests for coordinate calculations

**Commits:**
1. "feat: Add HexGrid component infrastructure"
2. "feat: Implement hex coordinate system"
3. "feat: Add ship positioning to hex grid"
4. "test: Add hex coordinate calculation tests"

---

### Task 1.4: Migrate Ship Movement UI (1-2 hours)
**Priority:** HIGH
**Risk:** LOW (reuse existing logic)

Port ship movement controls from vanilla to React:
- Create `client/src/components/MovementControls.tsx`
- Add movement buttons/interface
- Integrate with GameContext
- Add movement validation feedback
- Test movement across range bands

**Commit:** "feat: Add ship movement controls to React"

---

### Task 1.5: Migrate Weapon Systems UI (1-2 hours)
**Priority:** HIGH
**Risk:** LOW (reuse existing logic)

Port detailed weapon systems from vanilla to React:
- Enhance `CombatScreen.tsx` with full weapon controls
- Add turret selection UI
- Add weapon type selection UI
- Add fire control interface
- Integrate point defense controls
- Integrate sandcaster controls

**Commit:** "feat: Add complete weapon systems UI to React"

---

### Task 1.6: Migrate Combat Log Enhancements (1 hour)
**Priority:** MEDIUM
**Risk:** LOW (UI enhancement)

Port combat log features from vanilla:
- Message categorization (attacks, damage, criticals, missiles)
- Color coding by message type
- Timestamp display
- Auto-scroll behavior
- Message filtering (if present in vanilla)

**Commit:** "feat: Enhance combat log with categorization and filtering"

---

### Task 1.7: Migrate Turn Management UI (1 hour)
**Priority:** MEDIUM
**Risk:** LOW (UI component)

Port turn management display from vanilla:
- Turn counter display
- Round indicator
- Phase indicator (if applicable)
- Turn timer visual feedback
- Active player indicator

**Commit:** "feat: Add turn management UI to React"

---

### Task 1.8: Feature Parity Verification (1 hour)
**Priority:** HIGH
**Risk:** LOW (testing/verification)

Compare vanilla vs React versions:
- Create feature checklist
- Verify all vanilla features present in React
- Document any intentional differences
- Create test plan for missing features

**Output:** Update `client/docs/MIGRATION-STATUS.md` with parity status

---

## SECTION 2: TECHNICAL DEBT - LOW PRIORITY (All Items)

### Task 2.1: Add Gzip Compression (2 hours)
**Priority:** LOW
**Risk:** LOW (standard Express middleware)

From TECHNICAL-DEBT.md #7:
- Install `compression` middleware for Express
- Enable gzip for JSON ship/weapon files
- Configure compression settings (threshold, level)
- Test compression with browser DevTools
- Document compression ratios

**Tests:**
- Verify gzip headers in responses
- Measure file size reduction
- Ensure no breaking changes

**Commit:** "perf: Add gzip compression for JSON files and static assets"

---

### Task 2.2: Collapse Multiple Spaces in Ship Names (1 hour)
**Priority:** LOW
**Risk:** LOW (simple validation fix)

From TECHNICAL-DEBT.md #5:
- Update `lib/combat.js:validateShipName()`
- Add `.replace(/\s+/g, ' ')` before trim
- Test edge cases: tabs, newlines, multiple spaces
- Add tests for space collapsing

**Tests:**
- "Scout    Ship" → "Scout Ship"
- "Scout\t\tShip" → "Scout Ship"
- "Scout\n\nShip" → "Scout Ship"

**Commit:** "fix: Collapse multiple spaces in ship names"

---

## SECTION 3: TECHNICAL DEBT - MEDIUM PRIORITY (Safe Items Only)

### Task 3.1: Fix Combat Log Display Order (1 hour)
**Priority:** MEDIUM
**Risk:** LOW (CSS or simple array reverse)

From TECHNICAL-DEBT.md #3A:
- Reverse combat log order (newest at top)
- Option A: CSS `flex-direction: column-reverse`
- Option B: Reverse array before rendering
- Verify auto-scroll still works correctly
- Test with long combat logs

**Commit:** "fix: Display newest combat log messages at top"

---

### Task 3.2: Fix Combat Log Formatting Bug (2 hours)
**Priority:** MEDIUM
**Risk:** LOW (string formatting fix)

From TECHNICAL-DEBT.md #3B:
- Find where damage messages show "[object Object]"
- Fix roll object serialization
- Format as: "Roll: [3,4]=7, Total: 7"
- Add tests for message formatting
- Verify all combat messages format correctly

**Tests:**
- Hit messages show proper roll formatting
- Damage messages show dice details
- Critical hit messages formatted correctly

**Commit:** "fix: Format combat log roll objects correctly"

---

### Task 3.3: Refactor Test Constants (3 hours)
**Priority:** MEDIUM
**Risk:** LOW (test refactoring only, no production code changes)

From TECHNICAL-DEBT.md #3:
- Create `tests/test-helpers.js` with helper functions
- Import game constants from `lib/combat.js` instead of hardcoding
- Extract common test formulas (e.g., calculateHullFromTonnage)
- Add clarifying comments for remaining magic numbers
- Run full test suite to verify no regressions

**Tests:**
- All 285+ tests still pass
- No new test failures
- Test output unchanged

**Commit:** "refactor: Extract test constants and helpers for maintainability"

---

## SECTION 4: CODE QUALITY & DOCUMENTATION (Medium Priority)

### Task 4.1: Add JSDoc Documentation to Combat Module (1-2 hours)
**Priority:** MEDIUM
**Risk:** LOW (documentation only)

Add comprehensive JSDoc to `lib/combat.js`:
- Document all public functions
- Add @param and @return tags
- Document complex formulas with references
- Add @example for key functions
- Document Traveller rule references

**Commit:** "docs: Add JSDoc documentation to combat module"

---

### Task 4.2: Add JSDoc Documentation to Ship Registry (1 hour)
**Priority:** MEDIUM
**Risk:** LOW (documentation only)

Add JSDoc to `lib/ship-registry.js`:
- Document all public functions
- Document JSON schema requirements
- Add examples for search/filter operations
- Document validation rules

**Commit:** "docs: Add JSDoc documentation to ship registry"

---

### Task 4.3: Add JSDoc Documentation to Server Module (1 hour)
**Priority:** MEDIUM
**Risk:** LOW (documentation only)

Add JSDoc to `server.js` socket handlers:
- Document socket event handlers
- Document expected event payloads
- Document error handling patterns
- Add examples for key events

**Commit:** "docs: Add JSDoc documentation to server socket handlers"

---

### Task 4.4: Create API Documentation (1 hour)
**Priority:** MEDIUM
**Risk:** LOW (documentation only)

Create `docs/API.md` documenting:
- Socket.io events (client → server)
- Socket.io events (server → client)
- Event payload structures
- Error responses
- Example event sequences

**Commit:** "docs: Create socket.io API documentation"

---

## SECTION 5: REACT MIGRATION INFRASTRUCTURE POLISH (Low-Medium Priority)

### Task 5.1: Add Error Boundaries (1 hour)
**Priority:** MEDIUM
**Risk:** LOW (React best practice)

Add error boundaries to React app:
- Create `client/src/components/ErrorBoundary.tsx`
- Wrap main app sections
- Add error logging
- Add user-friendly error display
- Test with intentional errors

**Commit:** "feat: Add error boundaries to React components"

---

### Task 5.2: Add Loading States (1 hour)
**Priority:** MEDIUM
**Risk:** LOW (UX improvement)

Add loading indicators for async operations:
- Ship data loading
- Combat initialization
- Socket connection status
- Room joining status

**Commit:** "feat: Add loading states for async operations"

---

### Task 5.3: Add TypeScript Strict Mode Enhancements (1-2 hours)
**Priority:** LOW
**Risk:** LOW (type safety improvement)

Enhance TypeScript types:
- Add stricter types for socket events
- Create type definitions for game state
- Add interface for ship data
- Add interface for weapon data
- Remove `any` types where possible

**Commit:** "refactor: Enhance TypeScript type definitions"

---

### Task 5.4: Add React Dev Tools Integration (30 min)
**Priority:** LOW
**Risk:** LOW (dev tooling)

Optimize for React DevTools:
- Add component display names
- Add helpful debug props (data-testid)
- Configure React DevTools profiling

**Commit:** "dev: Optimize for React DevTools debugging"

---

## SECTION 6: BUILD & PERFORMANCE (Low Priority)

### Task 6.1: Optimize Production Bundle (1 hour)
**Priority:** LOW
**Risk:** LOW (build optimization)

Optimize Vite build:
- Enable tree-shaking
- Configure code splitting
- Optimize chunk sizes
- Add bundle analysis
- Document bundle metrics

**Commit:** "perf: Optimize production bundle size and splitting"

---

### Task 6.2: Add Source Maps for Production (30 min)
**Priority:** LOW
**Risk:** LOW (debugging aid)

Configure source maps:
- Enable production source maps
- Configure Vite sourcemap settings
- Test error stack traces
- Document debugging workflow

**Commit:** "dev: Add production source maps for debugging"

---

### Task 6.3: Add Build Metrics Reporting (30 min)
**Priority:** LOW
**Risk:** LOW (dev tooling)

Add build metrics tracking:
- Bundle size tracking
- Build time tracking
- Create `client/docs/BUILD-METRICS.md`
- Add to CI/CD (future)

**Commit:** "dev: Add build metrics tracking and reporting"

---

## SECTION 7: TESTING ENHANCEMENTS (Low-Medium Priority)

### Task 7.1: Add React Component Tests (2-3 hours)
**Priority:** MEDIUM
**Risk:** LOW (test coverage improvement)

Add tests for React components:
- MainMenu component tests
- ShipSelection component tests
- CombatScreen component tests
- Test user interactions
- Test state updates
- Test socket integration

**Commit:** "test: Add React component tests for main screens"

---

### Task 7.2: Add E2E Test Plan (1 hour)
**Priority:** LOW
**Risk:** LOW (planning only)

Create E2E testing plan:
- Document critical user flows
- Identify test scenarios
- Document test data requirements
- Plan for Puppeteer/Playwright integration (future)
- Save to `client/docs/E2E-TEST-PLAN.md`

**Commit:** "docs: Create E2E testing plan for future implementation"

---

## SECTION 8: FINAL VERIFICATION & DOCUMENTATION

### Task 8.1: Run Full Test Suite (15 min)
**Priority:** HIGH
**Risk:** LOW (verification)

Verify all changes:
- Run `npm test` in root
- Run `npm test` in client
- Verify all tests pass
- Document any new failures
- Fix any regressions

**Output:** Test results summary

---

### Task 8.2: Update MIGRATION-STATUS.md (30 min)
**Priority:** HIGH
**Risk:** LOW (documentation)

Update migration status doc:
- Mark completed tasks
- Update completion percentages
- Document new components
- Update build metrics
- Add "What's Next" section

**Commit:** "docs: Update migration status with Phase 2 progress"

---

### Task 8.3: Create Completion Report (1 hour)
**Priority:** HIGH
**Risk:** LOW (documentation)

Create comprehensive completion report:
- Tasks completed
- LOC added (production + test)
- Test coverage changes
- Build metrics changes
- Git commits summary
- Known issues / future work

**Output:** `.claude/VTT-AUTORUN-COMPLETION-REPORT.md`
**Commit:** "docs: Add VTT autorun completion report"

---

### Task 8.4: Create CTO Assessment for 2025-11-28 (1 hour)
**Priority:** HIGH
**Risk:** LOW (documentation)

Document today's work in CTO assessment format:
- Architecture decisions (React migration progress)
- Code quality improvements (technical debt reduction)
- Testing enhancements
- Documentation additions
- Skills demonstrated
- Growth opportunities

**Output:** `.claude/CTO-ASSESSMENT-2025-11-28.md`
**Commit:** "docs: Add CTO assessment for 2025-11-28"

---

## EXECUTION ORDER

### Phase 1: React Migration Core (6-10 hours)
- Tasks 1.1 → 1.8 (highest priority)

### Phase 2: Technical Debt - Quick Wins (3-5 hours)
- Tasks 2.1, 2.2, 3.1, 3.2 (safe, high-value fixes)

### Phase 3: Documentation & Polish (3-5 hours)
- Tasks 4.1 → 4.4 (code documentation)

### Phase 4: Test Refactoring (3 hours)
- Task 3.3 (test constants)

### Phase 5: React Infrastructure (2-4 hours)
- Tasks 5.1 → 5.4 (error boundaries, loading states, types)

### Phase 6: Testing & Build (2-4 hours)
- Tasks 6.1 → 6.3, 7.1, 7.2 (as time permits)

### Phase 7: Final Verification (2-3 hours)
- Tasks 8.1 → 8.4 (always execute)

---

## RISK ASSESSMENT

### LOW RISK ✅
- All documentation tasks (4.x, 7.2, 8.x)
- Technical debt fixes (2.x, 3.1, 3.2, 3.3)
- Build optimizations (6.x)
- Error boundaries (5.1)
- Loading states (5.2)

### MEDIUM RISK ⚠️
- Hex grid rendering (1.3) - Complex canvas/SVG work
- Component tests (7.1) - May reveal bugs

### MITIGATION
- Commit frequently (after each task)
- Run tests after each major change
- Use git tags at phase boundaries
- Skip tasks if they fail twice
- Document blockers in completion report

---

## SUCCESS CRITERIA

At completion, we should have:

✅ **React Migration Phase 2:**
- Complete vanilla feature inventory
- Migration roadmap defined
- 3-5 major features ported to React
- Feature parity documentation

✅ **Technical Debt:**
- 2 LOW priority items resolved
- 3 MEDIUM priority items resolved
- ~10 hours of debt cleared

✅ **Code Quality:**
- JSDoc documentation added to 3+ modules
- API documentation created
- Test constants refactored

✅ **Build & Performance:**
- Gzip compression enabled
- Bundle optimized
- Build metrics tracked

✅ **Testing:**
- React component tests added
- E2E test plan created
- All tests passing (300+ tests)

✅ **Documentation:**
- MIGRATION-STATUS.md updated
- Completion report generated
- CTO assessment created

---

## GIT COMMIT STRATEGY

**Commit Frequency:** After each completed task

**Commit Message Format:**
```
<type>: <description>

[Optional body with details]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:**
- `feat:` New features
- `fix:` Bug fixes
- `refactor:` Code refactoring
- `docs:` Documentation
- `test:` Tests
- `perf:` Performance
- `dev:` Dev tooling

---

## ESTIMATED TOTALS

**Time:** 15-20 hours
**Commits:** 25-35 commits
**LOC Added:** ~1,500 production, ~800 test
**Tasks:** 30+ tasks
**Technical Debt Cleared:** ~10 hours worth

---

## EXCLUSIONS (Not Safe for Autorun)

These require user decisions:
- ❌ Unicode support (requires design decision)
- ❌ Ship data versioning (requires migration strategy)
- ❌ Hot-reload in dev mode (optional feature)
- ❌ Database integration (major architecture change)
- ❌ Production deployment (requires credentials)
- ❌ HIGH priority technical debt (multiple shots bug - needs careful testing)

---

**STATUS:** Ready to execute
**MODE:** Autonomous with bypass permissions
**NEXT:** Begin Phase 1 (React Migration Core)

**GO! 🚀**
