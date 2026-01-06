# E2E Test Master Index

Last updated: 2026-01-06

## Quick Reference

| Test | Type | Timeout | Status |
|------|------|---------|--------|
| [check-scout-display](#check-scout-display) | Standalone | 60s | PASS |
| [destination-travel](#destination-travel) | Standalone | 120s | PASS |
| [mora-subsector-journey](#mora-subsector-journey) | Standalone | 60s | PASS |
| [journey-happy-path](#journey-happy-path) | Standalone | 60s | PASS |
| [combat-phases](#combat-phases) | Standalone | 60s | PASS |
| [battle-simple](#battle-simple) | Standalone | 60s | PASS |
| [combat-4role](#combat-4role) | Standalone | 180s | PASS |
| [ar-251-260](#ar-251-260) | Standalone | 60s | PASS |
| [ar-208-combat-ui](#ar-208-combat-ui) | Standalone | 60s | STUBS |
| [ten-parsec-journey](#ten-parsec-journey) | Standalone | 60s | PASS |
| [multi-role-journey](#multi-role-journey) | Standalone | 60s | PASS |
| [extended-journey-ui](#extended-journey-ui) | Standalone | 60s | PASS |
| [extended-journey-gorram-ui](#extended-journey-gorram-ui) | Standalone | 60s | PASS |
| **Spinward Marches Sector Tests** | | | |
| [cronor-journey](#cronor-journey) | Standalone | 60s | NEW |
| [jewell-journey](#jewell-journey) | Standalone | 60s | NEW |
| [vilis-journey](#vilis-journey) | Standalone | 60s | NEW |
| [rhylanor-journey](#rhylanor-journey) | Standalone | 60s | NEW |
| [querion-journey](#querion-journey) | Standalone | 60s | NEW |
| [regina-journey](#regina-journey) | Standalone | 60s | NEW |
| [lanth-journey](#lanth-journey) | Standalone | 60s | NEW |
| [aramis-journey](#aramis-journey) | Standalone | 60s | NEW |
| [darrian-journey](#darrian-journey) | Standalone | 60s | NEW |
| [sword-worlds-journey](#sword-worlds-journey) | Standalone | 60s | NEW |
| [lunion-journey](#lunion-journey) | Standalone | 60s | PASS |
| [five-sisters-journey](#five-sisters-journey) | Standalone | 60s | NEW |
| [district-268-journey](#district-268-journey) | Standalone | 60s | NEW |
| [glisten-journey](#glisten-journey) | Standalone | 60s | NEW |
| [trins-veil-journey](#trins-veil-journey) | Standalone | 60s | NEW |
| [spinward-marches-grand-tour](#spinward-marches-grand-tour) | Standalone | 600s | NEW |
| [battle-core](#battle-core) | Jest | - | PASS |
| [battle-enemy-fire](#battle-enemy-fire) | Jest | - | PASS |
| [battle-full-flow](#battle-full-flow) | Jest | - | PASS |
| [contact-icons](#contact-icons) | Jest | - | PASS |
| [drill-controls](#drill-controls) | Jest | - | PASS |
| [encounter-builder](#encounter-builder) | Jest | - | PASS |
| [full-drill-session](#full-drill-session) | Jest | - | PASS |
| [gm-fire-button](#gm-fire-button) | Jest | - | PASS |
| [icon-updates](#icon-updates) | Jest | - | PASS |
| [in-game-chat](#in-game-chat) | Jest | - | PASS |
| [mvp-battle](#mvp-battle) | Jest | - | PASS |
| [tactical-panel](#tactical-panel) | Jest | - | PASS |

---

## Running Tests

### Standalone Puppeteer Tests
```bash
npm run test:e2e tests/e2e/<test-name>.e2e.js
```

### Jest-Based Tests
```bash
npm test -- tests/e2e/<test-name>.e2e.js
```

### Run All Jest Tests
```bash
npm test
```

---

## Standalone Puppeteer Tests

### check-scout-display
**File:** `tests/e2e/check-scout-display.e2e.js`
**Purpose:** Verify Scout ship displays correctly in Solo Demo
**What it tests:**
- Solo Demo campaign loads
- Captain role can be selected
- Ship panel shows "Far Horizon" (Scout Courier)
- ASCII art displays Scout ship, not Q-ship

**Pain points:**
- Requires Solo Demo campaign to exist (auto-seeded on startup)
- If ship type wrong, check `seed-solo-demo.js` template assignment

---

### destination-travel
**File:** `tests/e2e/destination-travel.e2e.js`
**Purpose:** Verify all in-system destinations are navigable
**What it tests:**
- Server returns destination list via `ops:destinations`
- All 15 Mora destinations are accessible
- Destination IDs match between client and server

**Pain points:**
- If destinations fail, check `lib/socket-handlers/ops/pilot.js` - `ops:getDestinations`
- If "Unknown destination" errors, IDs may mismatch between subsector JSON and sector pack

---

### mora-subsector-journey
**File:** `tests/e2e/mora-subsector-journey.e2e.js`
**Purpose:** Comprehensive tour of all 26 systems in Mora subsector with fuel management
**What it tests:**
- Solo Demo campaign join and reset
- Jump to all 26 systems in the subsector
- All destinations navigable in each system (295 total)
- Fuel tracking and refueling at starports
- Position verification after jumps

**Pain points:**
- Requires `ENABLE_TEST_API=true` for Solo Demo reset
- If "System not found" errors, check sector-loader ID/name handling for special characters
- If refuel fails with capacity errors, check `fuelBreakdown` tracking in `lib/operations/jump.js`
- The 404 console errors are for map tiles (expected, not critical)

---

### journey-happy-path
**File:** `tests/e2e/journey-happy-path.e2e.js`
**Purpose:** Basic player login flow and pilot role verification
**What it tests:**
- Player login with campaign code
- Player slot selection
- Pilot role selection
- Bridge screen with pilot controls

**Pain points:**
- Campaign code hardcoded as `e344b9af` (Dorannia campaign)
- If "Campaign not found", run `node lib/operations/seed-dorannia.js`
- If "No player slots", check player_accounts table
- Role-switching phases (4-5) disabled due to browser timeout issues

---

### combat-phases
**File:** `tests/e2e/combat-phases.e2e.js`
**Purpose:** Verify combat phase cycling
**What it tests:**
- GM session start
- Add hostile contact
- Combat start
- Phase progression: manoeuvre → attack → actions → round_end → next round

**Pain points:**
- Requires Dorannia campaign
- If phases don't advance, check combat state machine in `lib/operations/combat.js`

---

### battle-simple
**File:** `tests/e2e/battle-simple.e2e.js`
**Purpose:** Basic combat flow with single enemy
**What it tests:**
- GM + Player browser setup
- Combat initiation
- Attack resolution
- Victory condition (pirate destroyed)

**Pain points:**
- Uses 2 browsers (GM + Player)
- If attacks miss, check weapon data in ship templates

---

### combat-4role
**File:** `tests/e2e/combat-4role.e2e.js`
**Purpose:** Full 4-role combat (GM, Pilot, Gunner, Engineer)
**What it tests:**
- Multiple browser instances (4 total)
- Role-specific phase actions
- Pilot in manoeuvre phase
- Gunner in attack phase
- Engineer in actions phase

**Pain points:**
- **Needs 180s timeout** (spawns 4 browsers)
- Resource-intensive test
- If timeout, increase timeout or run `HEADED=1` to debug visually

---

### ar-251-260
**File:** `tests/e2e/ar-251-260.e2e.js`
**Purpose:** Verify AR-251 through AR-260 feature implementations
**What it tests:**
- Menu stack module exports
- ECM/ECCM mechanics
- Hull threshold critical hits
- GUI adapters
- Crew roster modal
- Medical records modal
- Sensor compact display CSS

**Pain points:**
- Mix of unit tests and browser checks
- If menu-stack fails, check `lib/combat/menu-stack.js`

---

### ar-208-combat-ui
**File:** `tests/e2e/ar-208-combat-ui.e2e.js`
**Purpose:** Placeholder stubs for AR-208 combat UI features
**What it tests:** Nothing yet - lists NOT_IMPLEMENTED stubs

**Pain points:**
- This is a stub file showing planned features
- All items will show "NOT IMPLEMENTED" until features are built

---

### ten-parsec-journey
**File:** `tests/e2e/ten-parsec-journey.e2e.js`
**Purpose:** Extended journey test with 10-parsec trip
**What it tests:**
- Jump fuel calculations
- Jump duration (168 hours)
- Refueling at different starport types
- Gas giant skimming
- Fuel processor operation

**Pain points:**
- Uses Solo Demo campaign
- If fuel values wrong, check `seed-solo-demo.js` fuel capacity

---

### multi-role-journey
**File:** `tests/e2e/multi-role-journey.e2e.js`
**Purpose:** Test role switching during journey
**What it tests:**
- Pilot: Undock, in-system navigation, gas giant skim
- Astrogator: Plot course, verify position, initiate jump
- Engineer: Fuel check, processor operation, system monitoring

**Pain points:**
- Role switching must work correctly
- Check role permissions in `lib/engine/roles/`

---

### extended-journey-ui
**File:** `tests/e2e/extended-journey-ui.e2e.js`
**Purpose:** UI element verification during journey
**What it tests:**
- GM Bridge Screen presence
- Role Panel Container
- Alert Controls
- Ship Status Area
- System Map Container
- Time Display

**Pain points:**
- If elements missing, check CSS selectors match HTML IDs
- UI layout changes may break selectors

---

### extended-journey-gorram-ui
**File:** `tests/e2e/extended-journey-gorram-ui.e2e.js`
**Purpose:** X-Carrier (Gorram) ship UI verification
**What it tests:**
- Same as extended-journey-ui but with X-Carrier ship
- Fuel Display
- Astrogation UI
- Engineering UI

**Pain points:**
- Requires X-Carrier ship template
- If fuel display wrong, check ship JSON fuel capacity

---

## Jest-Based Tests

These tests use Jest's `describe/it` syntax and are run with `npm test`.

### battle-core
**File:** `tests/e2e/battle-core.e2e.js`
**Purpose:** Core battle mechanics
**Pain points:** Check combat resolution logic

### battle-enemy-fire
**File:** `tests/e2e/battle-enemy-fire.e2e.js`
**Purpose:** Enemy firing mechanics
**Pain points:** Check AI combat decisions

### battle-full-flow
**File:** `tests/e2e/battle-full-flow.e2e.js`
**Purpose:** Complete battle from start to victory/defeat
**Pain points:** Long test, may need extended timeout

### contact-icons
**File:** `tests/e2e/contact-icons.e2e.js`
**Purpose:** Contact icon display and updates
**Pain points:** Icon SVGs must exist in assets

### drill-controls
**File:** `tests/e2e/drill-controls.e2e.js`
**Purpose:** Battle drill UI controls
**Pain points:** Check drill panel selectors

### encounter-builder
**File:** `tests/e2e/encounter-builder.e2e.js`
**Purpose:** GM encounter creation
**Pain points:** Ship templates must exist

### full-drill-session
**File:** `tests/e2e/full-drill-session.e2e.js`
**Purpose:** Complete battle drill session
**Pain points:** Longer test, needs multiple phases

### gm-fire-button
**File:** `tests/e2e/gm-fire-button.e2e.js`
**Purpose:** GM fire control button
**Pain points:** Check button visibility in combat mode

### icon-updates
**File:** `tests/e2e/icon-updates.e2e.js`
**Purpose:** Dynamic icon updates during combat
**Pain points:** Check event handlers for icon changes

### in-game-chat
**File:** `tests/e2e/in-game-chat.e2e.js`
**Purpose:** In-game chat functionality
**Pain points:** Socket events for chat

### mvp-battle
**File:** `tests/e2e/mvp-battle.e2e.js`
**Purpose:** Minimum viable battle test
**Pain points:** Basic combat flow

### tactical-panel
**File:** `tests/e2e/tactical-panel.e2e.js`
**Purpose:** Tactical panel display
**Pain points:** Panel layout and data

---

## Spinward Marches Sector Tests

### Subsector Journey Tests (A-P)

Each subsector test visits all systems with fuel management.

**Files:** `tests/e2e/[subsector]-journey.e2e.js`

| File | Subsector | Systems | Description |
|------|-----------|---------|-------------|
| `cronor-journey.e2e.js` | A - Cronor | 24 | Zhodani border subsector |
| `jewell-journey.e2e.js` | B - Jewell | 23 | Frontier subsector |
| `vilis-journey.e2e.js` | C - Vilis | 32 | Border zone |
| `rhylanor-journey.e2e.js` | D - Rhylanor | 26 | Core Imperial |
| `querion-journey.e2e.js` | E - Querion | 21 | Outer region |
| `regina-journey.e2e.js` | F - Regina | 26 | Regina cluster |
| `lanth-journey.e2e.js` | G - Lanth | 27 | Central sector |
| `aramis-journey.e2e.js` | H - Aramis | 32 | Aramis cluster |
| `darrian-journey.e2e.js` | I - Darrian | 29 | Darrian Confederation |
| `sword-worlds-journey.e2e.js` | J - Sword Worlds | 28 | Sword Worlds Confederation |
| `lunion-journey.e2e.js` | K - Lunion | 25 | Major trade hub |
| `mora-subsector-journey.e2e.js` | L - Mora | 26 | Sector capital |
| `five-sisters-journey.e2e.js` | M - Five Sisters | 27 | Remote frontier |
| `district-268-journey.e2e.js` | N - District 268 | 32 | Developing region |
| `glisten-journey.e2e.js` | O - Glisten | 29 | Trade center |
| `trins-veil-journey.e2e.js` | P - Trin's Veil | 32 | Rimward subsector |

**What each test does:**
1. Resets Solo Demo campaign
2. Joins as Captain
3. Visits every destination in each system
4. Manages fuel (refueling at starports/gas giants)
5. Jumps to next system
6. Tracks metrics (parsecs, km, refuel types, game time)

**Pain points:**
- Systems >2 parsecs apart are unreachable (Scout is J-2)
- Some systems lack fuel sources (Class X starport, no gas giants)

---

### spinward-marches-grand-tour

**File:** `tests/e2e/spinward-marches-grand-tour.e2e.js`
**Purpose:** Visit all ~439 systems in the entire sector
**Timeout:** 600s (10 minutes)

**What it tests:**
- Chains all 16 subsector routes together
- Full fuel management across sector
- Comprehensive metrics tracking

**Metrics tracked:**
- Total systems/destinations visited
- Parsecs jumped, km traveled in-system
- Refuel operations by type (4 types)
- Game time (168 hours per jump)
- J-Drive maintenance due (every 6 jumps)

**Output:** Writes detailed summary to `docs/SPINWARD-MARCHES-SUMMARY.md`

**Pain points:**
- Long runtime (~5+ minutes)
- Some systems unreachable due to jump limits
- Requires stable server throughout

---

## Deleted Tests (Historical)

These tests were removed 2026-01-05 as obsolete:

- `star-map-journey.e2e.js` - Used non-existent `#system-dropdown` selector
- `extended-journey.e2e.js` - Used non-existent navigation UI
- `extended-journey-gorram.e2e.js` - Used non-existent navigation UI

---

## Troubleshooting

### "Campaign not found"
Run seed scripts:
```bash
node lib/operations/seed-solo-demo.js
node lib/operations/seed-dorannia.js
```

### "No player slots"
Check database has player accounts:
```bash
node -e "const Database=require('better-sqlite3');const db=new Database('./data/campaigns/operations.db');console.log(db.prepare('SELECT slot_name FROM player_accounts').all())"
```

### Browser timeout
- Increase timeout: `timeout 180 npm run test:e2e ...`
- Run headed: `HEADED=1 npm run test:e2e ...`
- Check for stuck puppeteer processes: `pkill -9 chromium`

### Port 3000 in use
```bash
npm run cleanup
```

### Test uses wrong campaign code
Check and update the `CAMPAIGN_CODE` constant at top of test file.
