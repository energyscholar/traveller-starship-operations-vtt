# AR Roadmap - Staged Implementation Plan

**Generated:** 2025-12-17
**Total TODOs:** 48 files analyzed
**Recommended Next:** AR-186 (GM Roll Modifier) or AR-188 (Time Tracking)

---

## PDF Reading Protocol

When a TODO requires reading adventure PDFs (rules, scenarios):

1. **Never read entire PDF at once** - use `limit: 50` parameter
2. **Read in chunks** - use `offset/limit` to paginate
3. **Report progress** - notify user every ~10 pages so they know I'm not crashed
4. **Extract incrementally** - write findings to file as I go (crash recovery)
5. **Skip images/maps** - focus on text content first

Example safe read:
```
Read(file, limit: 50)           # First 50 lines
Read(file, offset: 50, limit: 50)  # Next 50, etc.
```

---

## User Answers (UQs Resolved)

| Question | Answer | Impact |
|----------|--------|--------|
| GM Modifier scope | **All rolls** | Apply to combat + skills |
| Time start date | **Configurable** | GM sets per campaign |
| Random breakdowns | **GM triggered only** | Add "Break System" tool to GM menu |
| Passtime input | **Free input** | Parse "3d 4h" format |

---

## Test Mitigation Strategy

### Unit Tests (per AR)

| AR | Unit Tests |
|----|------------|
| AR-186 | `gmModifier.test.js`: set/get/clear modifier, apply to roll result |
| AR-187 | `tooltips.test.js`: format system specs, handle missing data |
| AR-188 | `imperial-date.test.js`: format date, parse config, edge cases (day 365) |
| AR-192 | `passtime.test.js`: parse "3d 4h", validate input, advance time |
| AR-193 | `fuel-checks.test.js`: wilderness refuel skill check, success/fail |
| AR-194 | `system-failures.test.js`: trigger failure, repair workflow, GM break tool |

### E2E Tests (critical paths)

| AR | E2E Test |
|----|----------|
| AR-186 | `gm-modifier.e2e.js`: GM sets -2, player rolls, modifier shown in result |
| AR-188 | `time-display.e2e.js`: date visible in header, updates after jump |
| AR-192 | `passtime.e2e.js`: GM advances "2d 4h", date updates correctly |
| AR-194 | `system-failure.e2e.js`: GM breaks M-Drive, Engineer sees YELLOW, repairs |
| AR-201 | `smoke-after-refactor.e2e.js`: all screens load, no JS errors |

### Risk Summary (Post-Mitigation)

| AR | Before | After | Key Mitigation |
|----|--------|-------|----------------|
| AR-186 | LOW | LOW | 2 unit + 1 E2E |
| AR-187 | LOW | LOW | 1 unit test |
| AR-188 | MED | LOW | 1 unit + 1 E2E, configurable date |
| AR-192 | MED | LOW | 1 unit + 1 E2E, free input parsing |
| AR-193 | MED | LOW | 1 unit, uses existing skill system |
| AR-194 | HIGH | MED | 1 unit + 1 E2E, GM-only triggers |
| AR-201 | HIGH | MED | Smoke E2E after each extraction |
| AR-202 | HIGH | MED | Smoke E2E, test per extraction |
| AR-203 | HIGH | MED | Full test suite, careful socket registry |

---

## Quick Reference

| AR | Title | Difficulty | Hours | Recommendation |
|----|-------|------------|-------|----------------|
| AR-186 | GM Roll Modifier | EASY | 2-3 | START HERE |
| AR-187 | Ship System Tooltips | EASY | 3-4 | Quick win |
| AR-188 | Time Tracking Display | MEDIUM | 4-6 | High visibility |
| AR-189 | Hotkey Hints | EASY | 2-3 | Quick win |
| AR-190 | Low Fuel Warnings | EASY | 2-3 | Safety feature |
| AR-191 | Power Tooltip Live | EASY | 2-3 | Pairs with 187 |
| AR-192 | Passtime UI | MEDIUM | 4-6 | Pairs with 188 |
| AR-193 | Fuel Skill Checks | MEDIUM | 4-6 | Core gameplay |
| AR-194 | Ship System Failures | HARD | 12-16 | Major feature |
| AR-195 | Time Auto-Increment | MEDIUM | 4-6 | Depends on 188 |
| AR-196 | Boarding Actions | HARD | 10-14 | Complex scenario |
| AR-197 | Scout Emergence | MEDIUM | 6-8 | Adventure content |
| AR-198 | Puppeteer Optimization | MEDIUM | 4-6 | Testing infra |
| AR-199 | System Map Labels | MEDIUM | 4-6 | UI polish |
| AR-200 | Fleet Vessel Tooltips | MEDIUM | 4-6 | UI polish |
| AR-201 | App.js Refactor Ph1 | HARD | 8-12 | TOUGH - Mitigated |
| AR-202 | App.js Refactor Ph2 | HARD | 8-12 | TOUGH - Phase 2 |
| AR-203 | App.js Refactor Ph3 | HARD | 6-10 | TOUGH - Final |

---

## Stage 1: Quick Wins (EASY, ~15h total)

Low-risk, high-visibility features. Build momentum.

### AR-186: GM Roll Modifier
**Source:** TODO-gm-roll-modifier.md | **Risk:** LOW
```
GM sets modifier (e.g., -2 "volcanic ash") → applies to next roll
Files: gm.js, roll-broadcast.js, gm-panel.js
Tests: 5 test cases defined
```
**Difficulty: EASY** - Simple state + UI addition

### AR-187: Ship System Tooltips
**Source:** TODO-ship-systems-tooltips.md | **Risk:** LOW
```
Hover on system → shows specs (power draw, status, etc.)
Files: role-panels.js, operations.css
```
**Difficulty: EASY** - CSS + existing data

### AR-189: Hotkey Hints
**Source:** TODO-hotkey-hints.md | **Risk:** LOW
```
Show keyboard shortcuts on buttons (e.g., "[J] Jump")
Files: role-panels.js, app.js
```
**Difficulty: EASY** - UI text additions

### AR-190: Low Fuel Warnings
**Source:** TODO-low-fuel-warnings.md | **Risk:** LOW
```
Engineer panel shows warning when fuel < 25%
Files: role-panels.js, engineer section
```
**Difficulty: EASY** - Conditional display

### AR-191: Power Tooltip Live
**Source:** TODO-power-tooltip-live.md | **Risk:** LOW
```
Power bar shows breakdown on hover
Files: role-panels.js
```
**Difficulty: EASY** - Pairs with AR-187

---

## Stage 2: Core Features (MEDIUM, ~30h total)

Essential gameplay mechanics.

### AR-188: Time Tracking Display
**Source:** TODO-time-tracking-system.md Part 1 | **Risk:** MEDIUM
```
Top bar shows: 📍 FLAMMARION HIGHPORT │ 📅 142-1105 14:32
Files: header-bar.js (new), operations.css
```
**Difficulty: MEDIUM** - New component, date formatting

### AR-192: Passtime UI
**Source:** TODO-passtime-ui.md | **Risk:** MEDIUM
```
GM can advance time manually (repair, shore leave, etc.)
Depends: AR-188 (time display)
```
**Difficulty: MEDIUM** - Depends on time system

### AR-193: Fuel Skill Checks
**Source:** TODO-fuel-skill-checks.md | **Risk:** MEDIUM
```
Wilderness refuel requires skill check
Files: engineer.js, skill-checks.js
```
**Difficulty: MEDIUM** - Uses existing skill check system

### AR-195: Time Auto-Increment
**Source:** TODO-time-tracking-system.md Part 2 | **Risk:** MEDIUM
```
Jump adds 168h, in-system travel adds calculated time
Depends: AR-188
```
**Difficulty: MEDIUM** - Integration with travel events

### AR-198: Puppeteer Optimization
**Source:** TODO-puppeteer-optimization.md | **Risk:** MEDIUM
```
Reduce test flakiness, improve cleanup, add retry logic
Files: tests/e2e/helpers/*.js
```
**Difficulty: MEDIUM** - Testing infrastructure

### AR-199: System Map Labels
**Source:** TODO-system-map-labels.md | **Risk:** MEDIUM
```
Show planet names, orbital distances on system map
Files: system-map.js
```
**Difficulty: MEDIUM** - Canvas rendering

### AR-200: Fleet Vessel Tooltips
**Source:** TODO-fleet-vessel-tooltips.md | **Risk:** MEDIUM
```
Hover on contact → shows ship class, transponder, etc.
Files: system-map.js, contacts display
```
**Difficulty: MEDIUM** - UI + data integration

---

## Stage 3: Major Features (HARD, ~50h total)

Complex systems requiring careful implementation.

### AR-194: Ship System Failures
**Source:** TODO-ship-system-failures.md | **Risk:** HIGH → Mitigated to MEDIUM
```
611-line TODO with:
- Failure reason registry (scalable to 100s of types)
- Random breakdown events
- Repair workflow with skill checks
- YELLOW status indicators

Phases:
1. Data structure + failure registry (4h)
2. Engineer UI (YELLOW indicators) (4h)
3. Repair workflow (4h)
4. Random events (2-4h)
```
**Difficulty: HARD** but phased approach keeps risk LOW per phase

### AR-196: Boarding Actions
**Source:** TODO-boarding-actions.md | **Risk:** HIGH → Mitigated
```
Ship-to-ship boarding combat:
- Breach points selection
- Marine deployment
- Deck-by-deck combat
- Capture/repel outcomes

Phases:
1. Breach point data model (3h)
2. Marine assignment UI (4h)
3. Combat resolution (4h)
4. Outcome handling (3h)
```
**Difficulty: HARD** - Complex combat subsystem

### AR-197: Scout Emergence Encounter
**Source:** TODO-scout-emergence-encounter.md | **Risk:** MEDIUM
```
Pre-built encounter at jump emergence:
- Scout/Courier with distress signal
- Multiple resolution paths
- NPC interactions
```
**Difficulty: MEDIUM** - Adventure content, uses existing systems

---

## Stage 4: The Tough One - App.js Refactor

**Source:** TODO-AR-151-app-js-refactor.md + TODO-refactor-app-js.md
**Current:** 11,552 lines | **Target:** <1,000 lines

### Risk Mitigation Strategy

| Phase | Extract | Lines | Risk | Mitigation |
|-------|---------|-------|------|------------|
| AR-201 | Socket handlers, Screens | ~5,000 | MED | Zero-dependency extractions |
| AR-202 | Role functions, Modals | ~3,500 | MED | Test after each extraction |
| AR-203 | GM features, Core | ~2,000 | HIGH | Socket registry pattern |

### AR-201: App.js Refactor Phase 1
**Difficulty: HARD** but well-documented

**Safe Extractions (zero dependencies):**
```
socket-handlers/bridge.js     - 400 lines
socket-handlers/sensors.js    - 300 lines (already exists, extend)
screens/campaign-select.js    - 350 lines
screens/role-select.js        - 280 lines
modals/jump-modal.js          - 250 lines
modals/contact-modal.js       - 200 lines
```

**Test Strategy:**
- Run full test suite after each extraction
- Puppeteer smoke test for affected screens
- Keep app.js functional at each step

### AR-202: App.js Refactor Phase 2
**Difficulty: HARD**

**Medium-risk Extractions:**
```
roles/pilot.js        - 400 lines
roles/engineer.js     - 350 lines
roles/sensors.js      - 300 lines
roles/captain.js      - 250 lines
gm/god-mode.js        - 300 lines
gm/prep-panel.js      - 400 lines
```

### AR-203: App.js Refactor Phase 3
**Difficulty: HARD** - Most risk

**High-risk Extractions:**
```
core/state.js         - 500 lines (shared state)
core/socket-registry.js - 300 lines (event dispatch)
core/init.js          - 400 lines (startup sequence)
```

---

## Recommended Execution Order

### Sprint 1: Quick Wins + Foundation (~20h)
1. **AR-186** GM Roll Modifier (2-3h) ← START HERE
2. **AR-187** Ship System Tooltips (3-4h)
3. **AR-189** Hotkey Hints (2-3h)
4. **AR-190** Low Fuel Warnings (2-3h)
5. **AR-188** Time Tracking Display (4-6h)

### Sprint 2: Core Gameplay (~25h)
6. **AR-192** Passtime UI (4-6h)
7. **AR-193** Fuel Skill Checks (4-6h)
8. **AR-195** Time Auto-Increment (4-6h)
9. **AR-199** System Map Labels (4-6h)

### Sprint 3: Major Features (~30h)
10. **AR-194** Ship System Failures (12-16h)
11. **AR-197** Scout Emergence (6-8h)
12. **AR-200** Fleet Vessel Tooltips (4-6h)

### Sprint 4: Tough Refactor (~30h)
13. **AR-201** App.js Phase 1 (8-12h)
14. **AR-202** App.js Phase 2 (8-12h)
15. **AR-203** App.js Phase 3 (6-10h)

### Future/Optional
- **AR-196** Boarding Actions (10-14h)
- **AR-198** Puppeteer Optimization (4-6h)
- NPC Personae system
- AI Email system

---

## TODOs Grouped by Theme

### Fuel System (8 TODOs)
- TODO-hardmode-fuel-usecases.md
- TODO-fuel-leak-mechanics.md
- TODO-fuel-location-validation.md
- TODO-fuel-skill-checks.md → AR-193
- TODO-low-fuel-warnings.md → AR-190
- TODO-water-world-check.md
- TODO-starport-fuel-types.md
- TODO-power-plant-fuel-check.md

### Ship Systems (6 TODOs)
- TODO-ship-system-failures.md → AR-194
- TODO-ship-systems-tooltips.md → AR-187
- TODO-ion-weapon-criticals.md
- TODO-cascade-failures.md
- TODO-emergency-power.md
- TODO-random-breakdowns.md (merged into AR-194)

### Time & UI (7 TODOs)
- TODO-time-tracking-system.md → AR-188, AR-195
- TODO-passtime-ui.md → AR-192
- TODO-hotkey-hints.md → AR-189
- TODO-power-tooltip-live.md → AR-191
- TODO-ship-panel-kimbly.md
- TODO-imperial-calendar-tooltip.md
- TODO-system-map-labels.md → AR-199

### Testing (3 TODOs)
- TODO-puppeteer-optimization.md → AR-198
- TODO-system-map-journey.md
- TODO-puppeteer-js-error-smoke.md

### Scenarios (4 TODOs)
- TODO-boarding-actions.md → AR-196
- TODO-scout-emergence-encounter.md → AR-197
- TODO-high-and-dry-use-cases.md (COMPLETE)
- TODO-adventure-module-system.md

### Refactoring (3 TODOs)
- TODO-refactor-app-js.md → AR-201-203
- TODO-codebase-refactor-phase1.md
- docs/TODO-AR-151-app-js-refactor.md

---

## Completed TODOs (Reference)

See MASTER-TODO.md for full list of completed ARs (AR-67 through AR-185).

Recent completions:
- AR-185: Von Sydo role fix + E2E selector
- AR-184: Captain Solo Enhancement + Skill Framework
- AR-168/173: System index rebuild

---

## Summary

| Category | Count | Est. Hours |
|----------|-------|------------|
| Quick Wins (Stage 1) | 5 | 12-16h |
| Core Features (Stage 2) | 7 | 28-42h |
| Major Features (Stage 3) | 3 | 28-38h |
| App.js Refactor (Stage 4) | 3 | 22-34h |
| **Total** | **18** | **90-130h** |

**Recommendation:** Start with AR-186 (GM Roll Modifier) - it's EASY, well-defined, and immediately useful for gameplay. Then proceed through Stage 1 quick wins to build momentum before tackling the HARD features.
