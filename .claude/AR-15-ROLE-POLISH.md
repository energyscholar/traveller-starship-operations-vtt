# AR-15: Role Polish & UX

**Created:** 2025-12-03 | **Revised:** 2025-12-03
**Status:** PLANNED (NOT STARTED)
**Est:** 14-18h | **Risk:** LOW | **Value:** HIGH | **Priority:** P1

## Overview
Consolidates all manual testing TODOs from 2025-12-03 session.
Focus: Tooltips, role enhancements, UI polish, bug fixes.

---

## Stage 15.1: Tooltip Infrastructure (1.5h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Create public/operations/modules/tooltips-strategy.js | 20m | New module |
| Implement `simple(el, text)` - native title | 15m | Fast path |
| Implement `rich(el, content)` - custom div | 15m | Styled tooltip |
| Implement `choose(complexity)` - auto-select | 10m | Smart routing |
| Add timing wrapper to tooltip show | 15m | Perf measurement |
| Debug log if render > 16ms | 10m | Console warning |

---

## Stage 15.2: Native Tooltips (1h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Add title attrs to all buttons | 20m | Quick info |
| Add title attrs to status indicators | 10m | HULL, POWER, etc. |
| Add title attrs to role panel headers | 10m | Role descriptions |
| Add title attrs to sensor contacts | 10m | Contact info |
| Add title attrs to crew roster items | 10m | Crew details |

---

## Stage 15.3: Custom Rich Tooltips (1.5h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Ship card tooltip template | 30m | Mini ship stats |
| Character sheet tooltip template | 20m | PC/NPC info |
| CSS for tooltip styling | 10m | Match UI theme |
| Weapon tooltip with stats | 15m | Damage, range |
| System tooltip with status | 15m | Health, power |

---

## Stage 15.4: Gunner Weapon Selector (1.5h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Add weapon type dropdown to Gunner panel | 45m | Select control |
| Populate from ship.weapons array | 30m | Dynamic list |
| Style active weapon indicator | 15m | Visual feedback |

---

## Stage 15.5: Gunner Fire Control (1.5h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Add missile to weapon types | 20m | Weapon option |
| Missile ammo tracking | 20m | Count display |
| Missile fire socket event | 20m | ops:fireMissile |
| Authorization tooltips (Weapon Free/Hold Fire) | 30m | Status hints |

---

## Stage 15.6: Gunner Hit Probability (1h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Calculate hit probability | 30m | Combat engine call |
| Display % on FIRE button hover | 15m | Tooltip |
| Show modifier breakdown | 15m | Range, skill, etc. |

---

## Stage 15.7: Astrogator Map Controls (1.5h)

| Task | Est | Deliverable |
|------|-----|-------------|
| CSS overflow:auto on map container | 15m | Scrollable |
| Mouse drag to pan | 30m | Pan interaction |
| Keyboard arrows to pan | 15m | A11y support |
| Size dropdown (small/med/large/full) | 20m | UI control |
| Remember size preference | 10m | LocalStorage |

---

## Stage 15.8: Astrogator Jump Validation (1.5h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Check jump distance vs ship capability | 20m | Validation logic |
| Green/red indicator on destination | 20m | Visual feedback |
| Block JUMP if invalid | 20m | UX guard |
| Fetch system data on hover | 30m | API call |

---

## Stage 15.9: UI Polish Items (2h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Fix HULL 100% display when ship disabled | 15m | Bug fix |
| Add disabled state visual for HULL | 15m | Greyed out |
| Journal entries on DATE hover | 20m | Tooltip content |
| POWER color gradient (green→yellow→red) | 20m | Visual scale |
| Add fullscreen toggle button | 15m | UI control |
| Fullscreen API integration | 15m | Browser API |
| Panel minimize/restore button | 20m | UI control |

---

## Stage 15.10: Role System Bug Fixes (2h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Debug role availability not updating | 30m | Find root cause |
| Fix state sync after relieve | 20m | Bug fix |
| Add test case for role refresh | 10m | Regression test |
| Tooltip "Relieve [NAME] from [ROLE]" | 15m | Descriptive |
| Socket event for role request | 15m | ops:requestRole |
| Notification to current occupant | 15m | Polite message |
| E2E tests for role bugs | 15m | Puppeteer tests |

---

## Dependencies
- AR-14.7 complete ✅

## Acceptance Criteria
- [ ] All tooltips functional with < 16ms render
- [ ] Gunner can switch weapons and fire missiles
- [ ] Astrogator map scales and validates jumps
- [ ] All UI polish items complete
- [ ] Role bugs fixed with tests
