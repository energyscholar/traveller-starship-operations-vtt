# Stage 8: Space Combat Implementation Plan

**Date:** 2025-11-08
**Approach:** TDD-first, minimal technical debt, aggressive refactoring
**Scope:** Scout vs Free Trader, simplified combat (gunners only, fixed ranges)

---

## Design Decisions Summary

### Architecture
- ✅ Extend `lib/combat.js` (not separate file - prepare for eventual personal combat integration)
- ✅ Same character entities across personal & space combat
- ✅ British spelling: "armour" (match Traveller rules)
- ✅ Full Traveller stats: STR/DEX/INT/EDU/END/SOC
- ✅ Solo mode only: 1 player per ship (multi-crew in Stage 9)
- ✅ Single combat phase (proper steps in Stage 9)

### Features Implemented in Stage 8
- ✅ Ship data models (Scout, Free Trader)
- ✅ 7 range bands (Adjacent → Distant)
- ✅ Simple initiative (fixed order, stubbed for Pilot+Thrust in Stage 9)
- ✅ Spacecraft weapons (Beam Laser, Pulse Laser)
- ✅ Gunner role with DEX DM
- ✅ Hull damage + critical hits (location only, severity stubbed)
- ✅ Sustained damage crits (every 10% hull lost)
- ✅ Ship stances (hostile, friendly, neutral, disabled, destroyed)
- ✅ Readiness indicators (before combat starts)
- ✅ Turret assignment (manual, remembers last choice)
- ✅ Default actions (use last action if valid)
- ✅ AFK/Default toggle per role
- ✅ Unmanned turrets (captain controls, Skill-0)
- ✅ Friendly fire (allow with warning)
- ✅ Initiative tracker UI
- ✅ Victory screen (damage summary, casualties, outcome)

### Features Deferred to Stage 9+
- ⏭ Jump Away mechanic (Stage 9/10)
- ⏭ Chat interface (reserve UI space)
- ⏭ Multi-player crewing
- ⏭ Proper 3-step combat (Manoeuvre/Attack/Actions)
- ⏭ Movement & thrust mechanics
- ⏭ Captain Tactics bonus to initiative
- ⏭ Missiles, Sandcasters (Stage 11)
- ⏭ Critical hit effects (Stage 10)
- ⏭ Called shots (Stage 11+)
- ⏭ Boarding actions (Stage 12+)

---

## Sub-Stages

### Stage 8.1: Character Stats & Ship Data Models
**Est. 3,500 tokens | ~280 LOC | ~25 min**

#### Tests First (`tests/unit/space-ships.test.js` - 180 LOC)

**Character Stats (10 tests):**
- ✓ Character has full Traveller stats (STR/DEX/INT/EDU/END/SOC)
- ✓ Stat DM calculation: `Math.floor((stat - 6) / 3)`
- ✓ DEX 3→-1, DEX 6→0, DEX 9→+1, DEX 12→+2
- ✓ Character has extended skills (pilot, gunner, tactics_naval, sensors, marine, engineering)
- ✓ Character has preferences (defaultTurret, defaultTarget)
- ✓ Character can be assigned to space ship role
- ✓ Same character entity works for personal and space combat
- ✓ Character stat validation (stats 1-15)
- ✓ Skill validation (skills 0-4)
- ✓ Default character creation helper

**Ship Model (12 tests):**
- ✓ Ship has required fields (id, type, name, hull, maxHull, armour, thrust)
- ✓ Ship has turrets array
- ✓ Ship has crew assignment slots (pilot, captain, engineer, sensors, gunners[], marines[])
- ✓ Ship has stance (hostile, friendly, neutral, disabled, destroyed)
- ✓ Ship has criticals array
- ✓ Ship has crit thresholds (pre-calculated: [hull*0.9, hull*0.8, ...])
- ✓ Scout definition: hull=20, armour=4, thrust=2
- ✓ Scout has 1 triple turret (pulse_laser, sandcaster_STUB, missile_STUB)
- ✓ Free Trader definition: hull=30, armour=2, thrust=1
- ✓ Free Trader has 2 single turrets (beam_laser each)
- ✓ Ship type validation
- ✓ Ship stance transitions (hostile→disabled, hostile→destroyed)

**Default Crew (6 tests):**
- ✓ Scout default crew: 1 pilot, 1 gunner, 1 engineer
- ✓ Free Trader default crew: 1 pilot, 2 gunners, 1 engineer
- ✓ Default crew has standard competence (skill 1-2)
- ✓ Can generate "standard crew" for any ship type
- ✓ Crew assignment validation
- ✓ Unmanned turret handling (Skill-0 automation)

#### Implementation (~100 LOC)
- Extend character model in `lib/combat.js`
- Add `SPACE_SHIPS` constant (Scout, Free Trader definitions)
- Add `createStandardCrew(shipType)` function
- Add `calculateStatDM(stat)` function
- Add `calculateCritThresholds(maxHull)` function

---

### Stage 8.2: Range Bands & Targeting
**Est. 3,000 tokens | ~180 LOC | ~20 min**

#### Tests First (`tests/unit/space-range.test.js` - 120 LOC)

**Range Bands (8 tests):**
- ✓ 7 range bands defined (Adjacent, Close, Short, Medium, Long, Very Long, Distant)
- ✓ Range DMs: Short +1, Long -2, Very Long -4, Distant -6
- ✓ Range validation (must be one of 7 bands)
- ✓ Starting range selection (both players choose, last selection wins)
- ✓ Range display labels
- ✓ Range comparison (which is closer/farther)
- ✓ Weapon range restrictions (Beam Laser max Medium)
- ✓ Out-of-range attack validation

**Targeting (6 tests):**
- ✓ Can target any ship at any range (no LOS in space)
- ✓ Target list filtered by stance (exclude destroyed/disabled)
- ✓ Friendly fire warning (can target friendly but warns)
- ✓ Target validation (must exist, must be in combat)
- ✓ Default target selection (use last if valid, else closest hostile)
- ✓ No target available handling

#### Implementation (~60 LOC)
- Add `SPACE_RANGE_BANDS` constant
- Add `SPACE_RANGE_DMS` constant
- Add `validateRange(range)` function
- Add `getAvailableTargets(ship, allShips, allowFriendly)` function
- Add `getDefaultTarget(lastTarget, availableTargets)` function
- Add `isWeaponInRange(weapon, range)` function

---

### Stage 8.3: Space Combat Initiative
**Est. 2,500 tokens | ~150 LOC | ~18 min**

#### Tests First (`tests/unit/space-initiative.test.js` - 100 LOC)

**Initiative System (10 tests):**
- ✓ Fixed initiative order for Stage 8 (by ship index)
- ✓ Ship stance filters (destroyed/disabled/fled skip turn)
- ✓ Initiative order persists across rounds
- ✓ Out-of-combat stances exclude ship from turn order
- ✓ Round counter increments
- ✓ Turn sequencing (ship 1 → ship 2 → round end)
- ✓ Ship can act if stance is hostile/friendly/neutral
- ✓ Ship cannot act if stance is disabled/destroyed/fled
- ✓ Get current active ship
- ✓ Advance to next ship's turn

**Stub for Stage 9 (2 tests):**
- ✓ Initiative calculation stubbed (returns 0)
- ✓ TODO comment for 2D + Pilot + Thrust

#### Implementation (~50 LOC)
- Add `initializeSpaceCombat(ships)` function
- Add `calculateInitiative(ship)` function (stubbed, returns 0)
- Add `getActiveShip(combatState)` function
- Add `canShipAct(ship)` function (checks stance)
- Add `advanceTurn(combatState)` function

---

### Stage 8.4: Spacecraft Weapons & Attacks
**Est. 4,500 tokens | ~380 LOC | ~35 min**

#### Tests First (`tests/unit/space-weapons.test.js` - 240 LOC)

**Weapon Definitions (6 tests):**
- ✓ Beam Laser: 1D damage, Medium max range, +4 DM
- ✓ Pulse Laser: 2D damage, Long max range, +2 DM
- ✓ Sandcaster stubbed (Stage 11)
- ✓ Missile Rack stubbed (Stage 11)
- ✓ Weapon validation
- ✓ Weapon available check (implemented vs stubbed)

**Attack Resolution (16 tests):**
- ✓ Attack roll: 2D + Gunner skill + DEX DM + Weapon DM + Range DM ≥ 8
- ✓ Gunner Skill-0 baseline (no character assigned)
- ✓ Gunner DEX DM applied (DEX 9 = +1)
- ✓ Weapon DM applied (Beam Laser +4)
- ✓ Range DM applied (Long = -2)
- ✓ Effect calculation: attackTotal - 8
- ✓ Hit/Miss determination
- ✓ Damage roll + Effect
- ✓ Armour reduction
- ✓ Hull damage applied
- ✓ Out-of-range attack auto-fails
- ✓ Multiple turrets can fire (one per gunner)
- ✓ Unmanned turret fires at Skill-0
- ✓ Empty turret (no gunner, no automation) doesn't fire
- ✓ Automated turret (captain enabled, Skill-0)
- ✓ Attack breakdown for UI display

**Turret Management (8 tests):**
- ✓ Assign gunner to turret
- ✓ Reassign gunner (ejects previous gunner)
- ✓ Unassign gunner from turret
- ✓ Get gunner for turret
- ✓ Get available turrets for ship
- ✓ Default turret assignment (uses preferences.defaultTurret)
- ✓ Turret has only 1 gunner at a time
- ✓ Gunner can only be assigned to 1 turret at a time

#### Implementation (~140 LOC)
- Add `SPACE_WEAPONS` constant (Beam Laser, Pulse Laser definitions)
- Add `resolveSpaceAttack(attacker, target, turret, options)` function
- Add `calculateAttackRoll(gunner, weapon, range)` function
- Add `calculateDamage(damageRoll, effect, armour)` function
- Add `assignGunnerToTurret(ship, gunnerId, turretId)` function
- Add `getDefaultTurret(character, ship)` function
- Add `canFireWeapon(weapon, range)` function

---

### Stage 8.5: Hull Damage & Critical Hits
**Est. 4,500 tokens | ~320 LOC | ~32 min**

#### Tests First (`tests/unit/space-damage.test.js` - 200 LOC)

**Hull Damage (8 tests):**
- ✓ Hull damage reduces current hull
- ✓ Hull cannot go below 0
- ✓ Hull = 0 sets stance to 'disabled'
- ✓ Disabled ship cannot act
- ✓ Disabled ship can still be targeted
- ✓ Damage less than armour = 0 damage
- ✓ Negative damage = 0 (can't heal via attack)
- ✓ Hull tracking displays correctly

**Critical Hits - Trigger (6 tests):**
- ✓ Crit triggered when Effect ≥6 AND damage > 0
- ✓ No crit if Effect <6
- ✓ No crit if damage = 0 (armour absorbed all)
- ✓ Crit includes location (2D roll)
- ✓ Crit includes severity (stubbed to 1)
- ✓ Multiple crits can occur on same attack (rare)

**Critical Hits - Location (12 tests):**
- ✓ Location table (2D): 2=Sensors, 3=Power, 4=Fuel, 5=Weapon, 6=Armour, 7=Hull, 8=M-Drive, 9=Cargo, 10=J-Drive, 11=Crew, 12=Computer
- ✓ Weapon crit selects random turret
- ✓ Crit stored in ship.criticals array
- ✓ Crit format: {location, severity, turretId?, effects}
- ✓ Effects stubbed (null for Stage 8)
- ✓ Multiple crits to same location stack
- ✓ Crit display: compact format "M-Drive (3)"
- ✓ Location 2-12 all covered
- ✓ Invalid location rolls default to Hull
- ✓ Crit list sorted by location
- ✓ Can get crits by location
- ✓ Count crits per location

**Sustained Damage Crits (8 tests):**
- ✓ Crit thresholds pre-calculated (90%, 80%, 70%... of max hull)
- ✓ Scout (20 hull): thresholds = [18, 16, 14, 12, 10, 8, 6, 4, 2]
- ✓ Free Trader (30 hull): thresholds = [27, 24, 21, 18, 15, 12, 9, 6, 3]
- ✓ Damage crosses threshold → Severity 1 crit
- ✓ Damage crosses multiple thresholds → multiple crits
- ✓ Threshold crossed detection after damage
- ✓ Track last threshold crossed
- ✓ Sustained crit location is random (2D)

**Severity Stub (2 tests):**
- ✓ Severity always returns 1 (Stage 8)
- ✓ TODO comment for Stage 10: damage ÷ 10 (round up)

#### Implementation (~120 LOC)
- Add `applyHullDamage(ship, damage)` function
- Add `checkCriticalHit(effect, damage)` function
- Add `rollCritLocation()` function (2D6 table)
- Add `calculateSeverity(damage)` function (stubbed, returns 1)
- Add `checkSustainedDamage(ship, oldHull, newHull)` function
- Add `addCritical(ship, location, severity, turretId?)` function
- Add `getCriticalsByLocation(ship, location)` function
- Add `formatCriticals(ship)` function (compact display)

---

### Stage 8.6: Space Combat UI - Ship Selection
**Est. 3,500 tokens | ~240 LOC | ~28 min**

#### Tests First (`tests/integration/space-ship-selection.test.js` - 140 LOC)

**Ship Selection Screen (12 tests):**
- ✓ Ship selection screen displays
- ✓ Shows Scout and Free Trader options
- ✓ Ship stats displayed (Hull, Armour, Thrust, Turrets)
- ✓ Ship description shown
- ✓ Can select Scout
- ✓ Can select Free Trader
- ✓ Selection highlights chosen ship
- ✓ Range dropdown shows 7 options
- ✓ Can select starting range
- ✓ Range selection updates on change
- ✓ "Ready" button enabled when ship + range selected
- ✓ "Ready" button disabled when incomplete

**Readiness System (8 tests):**
- ✓ "Ready" button shows loading state when clicked
- ✓ Ready status sent to server
- ✓ Visual indicator shows "Waiting for opponent"
- ✓ Ready indicator shows checkmark when ready
- ✓ Ready indicator shows waiting when opponent not ready
- ✓ Both players must be ready to start combat
- ✓ Range uses last player's selection (shows in UI)
- ✓ Combat starts when both ready (transition to combat screen)

#### Implementation (~100 LOC)
- Add ship selection HTML (`public/index.html`)
- Add ship selection styles (`public/style.css`)
- Add `shipSelected` socket event
- Add `rangeSelected` socket event
- Add `playerReady` socket event
- Add `startSpaceCombat` socket event
- Add readiness tracking in server state
- Add ship selection UI logic (`public/client.js`)

---

### Stage 8.7: Space Combat UI - HUD & Combat Interface
**Est. 5,000 tokens | ~420 LOC | ~40 min**

#### Tests First (`tests/integration/space-combat-ui.test.js` - 250 LOC)

**Space Combat HUD (10 tests):**
- ✓ HUD displays ship name and type
- ✓ Hull bar shows current/max (visual + numbers)
- ✓ Armour value displayed
- ✓ Current range displayed
- ✓ Round counter displayed
- ✓ Initiative tracker shows turn order
- ✓ Active ship highlighted ("► YOUR TURN")
- ✓ Inactive ships grayed out
- ✓ Opponent ship stats visible
- ✓ Chat interface space reserved (placeholder)

**Crew Panel (12 tests):**
- ✓ Crew panel collapsed by default
- ✓ Click to expand crew panel (smooth transition)
- ✓ Click again to collapse
- ✓ Expanded panel shows all roles
- ✓ Each role shows: name, skill, status indicator
- ✓ Status colors: gray=idle, yellow=pending, green=acted, red=slow, blue=AFK
- ✓ Gunner roles show turret assignment
- ✓ Gunner can switch turrets (click to change)
- ✓ Switching turret ejects previous gunner
- ✓ AFK toggle button per role
- ✓ AFK mode shows blue indicator
- ✓ Unmanned roles show "AUTOMATED (Skill-0)"

**Gunner Actions (14 tests):**
- ✓ Gunner auto-assigned to default turret (from preferences)
- ✓ Turret selection dropdown
- ✓ Only available turrets shown
- ✓ Current turret highlighted
- ✓ Target selection dropdown
- ✓ Hostile ships prioritized in list
- ✓ Friendly ships shown with warning icon
- ✓ Default target selected (last target if valid)
- ✓ Weapon auto-selected (implemented weapons only)
- ✓ Stubbed weapons grayed out with tooltip "Stage 11"
- ✓ "Fire" button enabled when target selected
- ✓ "Fire" button shows weapon name
- ✓ Click "Fire" executes attack
- ✓ Friendly fire shows confirmation dialog

**Turn Management (10 tests):**
- ✓ Turn timer displayed (30 seconds)
- ✓ Timer counts down
- ✓ Timer turns red at 10 seconds
- ✓ Slow player indicator (red flash) shown to all
- ✓ "Use Default" button per role
- ✓ "Use Default" applies last action
- ✓ "End Turn" button enabled when all roles acted or defaulted
- ✓ "End Turn" submits all actions
- ✓ Actions execute simultaneously
- ✓ Turn advances to next ship

**Combat Log (8 tests):**
- ✓ Combat log shows attack events
- ✓ Attack format: "Scout fires Pulse Laser at Free Trader"
- ✓ Hit/Miss shown clearly
- ✓ Damage shown: "8 damage (12 rolled - 4 armour)"
- ✓ Critical hits highlighted
- ✓ Crit location shown: "CRITICAL: M-Drive"
- ✓ Hull damage shown: "Free Trader: 22/30 hull"
- ✓ Log auto-scrolls to latest

**Victory Screen (6 tests):**
- ✓ Victory screen shown when combat ends
- ✓ Outcome displayed: "Victory!" or "Defeat" or "Draw"
- ✓ Damage summary per ship (hull, crits, status)
- ✓ Battle stats: rounds, duration, shots fired
- ✓ "New Battle" button returns to ship selection
- ✓ "Continue Battle" button (if ships still active)

#### Implementation (~170 LOC)
- Add space combat HUD HTML
- Add collapsible crew panel HTML/CSS
- Add turret/target selection UI
- Add turn timer UI
- Add combat log area
- Add victory screen modal
- Add `spaceCombatAction` socket event
- Add `endSpaceTurn` socket event
- Add UI state management
- Add combat log formatter

---

### Stage 8.8: Refactoring & Polish Pass
**Est. 2,500 tokens | ~100 LOC | ~20 min**

#### Refactoring Tasks (8 tasks)
- ✓ Standardize spelling: armor → armour throughout
- ✓ Extract shared dice utilities to avoid duplication
- ✓ Consistent naming conventions (space combat vs personal combat)
- ✓ Code comments for stubbed features (link to future stages)
- ✓ Remove dead code
- ✓ Consolidate range/distance functions
- ✓ DRY up attack resolution code
- ✓ Optimize socket event handlers

#### Testing Tasks (6 tasks)
- ✓ Run all unit tests (personal + space)
- ✓ Run all integration tests
- ✓ Test coverage report (target 90%+)
- ✓ Fix any regressions in Stages 1-7
- ✓ Performance check (combat resolution <100ms)
- ✓ Browser compatibility check

#### Documentation Tasks (4 tasks)
- ✓ Update Stage 8 handoff document
- ✓ Document stub locations for Stages 9-11
- ✓ Add inline TODOs with stage references
- ✓ Update README with space combat features

---

## Stage Boundaries & Stub Points

### Clearly Defined for Stage 9+

```javascript
// Stage 9: Initiative with Pilot + Thrust + Captain Tactics
function calculateInitiative(ship) {
  // STUB Stage 8: Returns 0 (fixed order)
  // Stage 9: 2D + Pilot skill + Thrust
  // Stage 9: + Captain Tactics (naval) check Effect
  return 0;
}

// Stage 9: Movement & Thrust allocation
function allocateThrust(ship, movement, manoeuvres) {
  // STUB Stage 8: No movement
  // Stage 9: Spend Thrust to change range bands
  // Stage 9: Remaining Thrust for Aid Gunners/Evasive Action
  throw new Error('Stage 9 feature');
}

// Stage 9: Jump Away mechanic
function initiateJump(ship) {
  // STUB Stage 8: Not implemented
  // Stage 9: Set status 'jump_charging', execute next turn
  // Stage 10: Jump safety checks, proximity penalties
  throw new Error('Stage 9 feature');
}

// Stage 10: Critical hit effects
function applyCriticalEffect(ship, critical) {
  // STUB Stage 8: Store location only
  // Stage 10: Apply severity-based effects per location
  // Example: M-Drive Sev 1 = DM-1 to control, Thrust -1
  ship.criticals.push({
    location: critical.location,
    severity: 1, // Always 1 in Stage 8
    effects: null, // TODO Stage 10
    turretId: critical.turretId
  });
}

// Stage 10: Severity calculation
function calculateSeverity(damage) {
  // STUB Stage 8: Always returns 1
  // Stage 10: Math.ceil(damage / 10)
  return 1;
}

// Stage 11: Missiles
function fireMissile(turret, target) {
  // STUB Stage 8: Weapon defined but not implemented
  // Stage 11: Missile movement, tracking, point defense
  throw new Error('Stage 11 feature');
}

// Stage 11: Sandcasters
function deploySandcaster(turret, incomingAttack) {
  // STUB Stage 8: Weapon defined but not implemented
  // Stage 11: Reaction, gunner check, add 1D to armour
  throw new Error('Stage 11 feature');
}

// Stage 11: Called Shots
function selectCritLocation(attacker, targetLocation) {
  // STUB Stage 8: Random location only
  // Stage 11: Choose location, apply attack penalty
  throw new Error('Stage 11 feature');
}

// Stage 12: Boarding Actions
function launchBoardingParty(ship, marines, target) {
  // STUB Stage 8: Marines role defined but not used
  // Stage 12: Boarding mechanics
  throw new Error('Stage 12 feature');
}

// Future: Multi-crew support
function assignPlayerToRole(playerId, shipId, role) {
  // STUB Stage 8: 1 player = all roles (captain mode)
  // Stage 9: Multiple players per ship
  throw new Error('Stage 9 feature');
}

// Future: Chat interface
function sendChatMessage(from, to, message, channel) {
  // STUB Stage 8: UI space reserved
  // Stage 10+: Ship-to-ship, intraship, overlay display
  throw new Error('Future stage feature');
}
```

---

## Acceptance Criteria

### Functional Requirements
- [ ] Scout vs Free Trader combat playable
- [ ] Ship selection with readiness indicators
- [ ] Range selection (7 bands, last selection wins)
- [ ] Lasers fire with correct attack formula (2D + Gunner + DEX + Weapon + Range ≥ 8)
- [ ] Damage = roll + Effect - armour
- [ ] Hull damage tracked and displayed
- [ ] Hull = 0 → ship disabled
- [ ] Critical hits on Effect ≥6 (location only, severity=1)
- [ ] Sustained damage crits (every 10% hull)
- [ ] Crew panel collapsible (collapsed by default)
- [ ] Gunner auto-assigned to default turret
- [ ] Manual turret switching (ejects previous gunner)
- [ ] Target selection with default (last target if valid)
- [ ] Friendly fire warning
- [ ] Unmanned turrets (captain controlled, Skill-0)
- [ ] AFK/Default toggle per role
- [ ] Turn timer (30 sec, red flash for slow players)
- [ ] "Use Default" button (one-click action)
- [ ] "End Turn" submits all actions
- [ ] Combat log shows attacks, damage, crits
- [ ] Initiative tracker shows whose turn
- [ ] Victory screen with damage summary

### Technical Requirements
- [ ] All unit tests pass (90%+ coverage)
- [ ] All integration tests pass
- [ ] No regressions in Stages 1-7 (personal combat still works)
- [ ] Combat resolution <100ms per attack
- [ ] British spelling: armour (not armor)
- [ ] Full Traveller stats (STR/DEX/INT/EDU/END/SOC)
- [ ] Character entities work for both personal & space combat
- [ ] Stub points clearly documented with stage references
- [ ] Code refactored (DRY, no dead code)
- [ ] Socket events namespaced (space:*)

### User Experience
- [ ] UI teaches rules (mouseover help, clear labels)
- [ ] Visual feedback for all actions
- [ ] Clear indication of whose turn it is
- [ ] Critical hits visually highlighted
- [ ] Disabled ships clearly shown
- [ ] Stubbed features have tooltips ("Stage 11 feature")
- [ ] No confusing states or dead ends
- [ ] Victory screen provides clear battle summary

---

## Implementation Order

**Recommended sequence:**
1. Stage 8.1 (foundation: characters, ships)
2. Stage 8.2 (ranges & targeting)
3. Stage 8.3 (initiative system)
4. Stage 8.4 (weapons & attacks) ← Core combat loop
5. Stage 8.5 (damage & crits) ← Core combat loop
6. Stage 8.6 (ship selection UI)
7. Stage 8.7 (combat UI) ← Largest sub-stage
8. Stage 8.8 (refactoring & polish)

**Alternative (UI-first for rapid feedback):**
1. Stage 8.1, 8.2, 8.3 (foundation)
2. Stage 8.6 (ship selection UI) ← See something working fast
3. Stage 8.4, 8.5 (combat mechanics)
4. Stage 8.7 (combat UI)
5. Stage 8.8 (refactoring)

---

## Summary Metrics

| Sub-Stage | Description | Est. Tokens | Est. LOC | Est. Time | Tests LOC | Impl LOC |
|-----------|-------------|-------------|----------|-----------|-----------|----------|
| **8.1** | Character Stats & Ship Models | 3,500 | 280 | 25 min | 180 | 100 |
| **8.2** | Range Bands & Targeting | 3,000 | 180 | 20 min | 120 | 60 |
| **8.3** | Space Combat Initiative | 2,500 | 150 | 18 min | 100 | 50 |
| **8.4** | Spacecraft Weapons & Attacks | 4,500 | 380 | 35 min | 240 | 140 |
| **8.5** | Hull Damage & Critical Hits | 4,500 | 320 | 32 min | 200 | 120 |
| **8.6** | UI - Ship Selection | 3,500 | 240 | 28 min | 140 | 100 |
| **8.7** | UI - HUD & Combat Interface | 5,000 | 420 | 40 min | 250 | 170 |
| **8.8** | Refactoring & Polish Pass | 2,500 | 100 | 20 min | - | 100 |
| **TOTAL** | **Stage 8 Complete** | **29,000** | **2,070** | **~218 min** | **1,230** | **840** |

### File Summary

**New Test Files (6):**
- `tests/unit/space-ships.test.js` (180 LOC)
- `tests/unit/space-range.test.js` (120 LOC)
- `tests/unit/space-initiative.test.js` (100 LOC)
- `tests/unit/space-weapons.test.js` (240 LOC)
- `tests/unit/space-damage.test.js` (200 LOC)
- `tests/integration/space-ship-selection.test.js` (140 LOC)
- `tests/integration/space-combat-ui.test.js` (250 LOC)

**Modified Files (5):**
- `lib/combat.js` (+700 LOC for space combat)
- `public/index.html` (+250 LOC for space UI)
- `public/style.css` (+200 LOC for space styles)
- `public/client.js` (+200 LOC for space UI logic)
- `server.js` (+80 LOC for space socket events)

**New Documentation (1):**
- `.claude/handoffs/HANDOFF-STAGE-8-COMPLETE.md` (handoff doc)

### Test Coverage Analysis

- **Test LOC:** 1,230 (59% of total)
- **Implementation LOC:** 840 (41% of total)
- **Test-to-code ratio:** 1.46:1 (excellent!)
- **Unit test coverage:** 90%+ target
- **Integration test coverage:** All UI flows

### Token Budget

- **Estimated total:** 29,000 tokens
- **Current usage:** ~42,000 tokens (21%)
- **Remaining budget:** ~158,000 tokens
- **Safety margin:** Can complete Stage 8 **5.4x over**
- **Stage 9 buffer:** ~129,000 tokens remaining

### Time Estimate

- **Total development time:** ~218 minutes (~3.6 hours)
- **Average per sub-stage:** ~27 minutes
- **Shortest sub-stage:** 8.3 Initiative (18 min)
- **Longest sub-stage:** 8.7 Combat UI (40 min)

### Complexity Distribution

- **Low complexity:** 8.1, 8.2, 8.3 (foundation, data models)
- **Medium complexity:** 8.4, 8.5 (combat mechanics)
- **High complexity:** 8.6, 8.7 (UI, user interactions)
- **Maintenance:** 8.8 (refactoring, no new features)

---

## Risk Assessment

### Technical Risks

**LOW RISK:**
- Character stat system (simple formula)
- Ship data models (straightforward)
- Range bands (constants)
- Initiative (stubbed, minimal logic)

**MEDIUM RISK:**
- Attack resolution (many modifiers, need careful testing)
- Critical hit system (sustained damage logic)
- Turret assignment (state management)
- Default action system (complex state)

**HIGH RISK:**
- Combat UI complexity (many interactive elements)
- Turn timer + async actions (race conditions)
- Socket.io state sync (multiplayer bugs)
- Friendly fire confirmation (UX flow)

### Mitigation Strategies

1. **TDD-first approach:** Write tests before implementation (catches bugs early)
2. **Small sub-stages:** Each sub-stage independently testable
3. **Aggressive refactoring:** Sub-stage 8.8 dedicated to cleanup
4. **Run all tests:** Ensure no regressions in Stages 1-7
5. **Browser testing:** Integration tests catch UI bugs

---

## Success Metrics

### Definition of Done

**Stage 8 is complete when:**
1. All acceptance criteria met
2. All tests pass (unit + integration)
3. Test coverage ≥90%
4. No regressions in Stages 1-7
5. Handoff document written
6. Stub points documented
7. Code refactored and clean
8. Can play full Scout vs Free Trader battle
9. Combat feels fun and clear
10. UI teaches rules effectively

### Quality Gates

- ✅ Every sub-stage: All new tests pass
- ✅ After 8.4 & 8.5: Core combat loop playable (can run unit tests to completion)
- ✅ After 8.7: Full UI functional (can play in browser)
- ✅ After 8.8: All tests pass, coverage ≥90%, no regressions

---

## Future Stages (Post Stage 8)

### Stage 9-12: Core Features
- **Stage 9:** Movement, Thrust, Proper Initiative (Pilot+Thrust+Tactics)
- **Stage 10:** Critical Hit Effects, Severity System
- **Stage 11:** Missiles, Sandcasters, Called Shots
- **Stage 12:** Boarding Actions

### Stage 13: Performance & Scale
**Target:** 10 concurrent battles, 5 players + GM (10 ships) per battle
**Est. 8k tokens | ~15 hours**

- **Performance testing infrastructure**
  - Load testing (100+ concurrent connections)
  - Latency simulation (500ms delays)
  - Packet loss simulation (5% loss)
  - Performance metrics display (dev mode)
  - Automated performance regression tests

- **Network resilience**
  - Auto-reconnect on disconnect
  - Auto-rejoin battle on reconnect
  - Disconnected state indicators
  - State sync recovery (full state re-send)
  - Action timeout handling (defaults after 30sec)

- **Optimization (in order)**
  1. Socket.io broadcast optimization (combat log batching)
  2. Ship state sync efficiency (delta updates)
  3. Database write optimization (if persistence added)

- **Architecture for scale**
  - Design for horizontal scaling (defer implementation)
  - Session state management
  - Load balancer readiness
  - Health check endpoints

### Stage 14: API Integration & State Sync
**Est. 6k tokens | ~10 hours**

- State import/export system
- Roll20 API integration prep
- Fantasy Grounds API integration prep
- Foundry VTT API integration prep
- Universal state sync protocol

### Stage 15: Cloud Deployment
**Est. 4k tokens | ~8 hours**

- **Platform comparison** (for CTO learning):
  - Azure App Service (recommended - new to user, good CTO experience)
  - Google Cloud Run (serverless option)
  - AWS ECS/Fargate (user already knows AWS)

- Containerization (Docker)
- CI/CD pipeline
- Environment configuration
- Production monitoring
- Backup & recovery

### Stage 16+: Advanced Features
- Custom ship builder UI
- Fleet battles (multiple ships per side)
- Campaign persistence
- Advanced maneuvers
- High Guard rules integration

---

## Architecture Decisions (Stage 8)

**Designed for future scale:**
- Socket.io with rooms (isolate battles)
- Stateless server design (scale-ready)
- Event-driven architecture (easy to batch/optimize)
- Delta state updates (prep for efficiency)
- Reconnection hooks (stub in Stage 8)

**Performance considerations:**
- All combat resolution <100ms (unit test enforcement)
- Socket events namespaced (easy to monitor)
- State size monitored (flag in dev mode if >100KB)

---

## Next Steps

1. **Review this plan** - User approval
2. **Start Stage 8.1** - Character stats & ship models (TDD-first)
3. **Iterate through sub-stages** - Complete one before starting next
4. **Test continuously** - Run tests after each change
5. **Refactor aggressively** - Keep code clean (Stage 8.8)
6. **Write handoff** - Document completion for Stage 9 planning

---

**Plan Status:** ✅ READY TO IMPLEMENT
**Approval Required:** User confirmation to proceed
**Estimated Completion:** Stage 8 complete in ~3.6 hours (8 sub-stages)

**Full Roadmap:** Stages 8-16+ (~75k tokens, ~50 hours total to production)

---

**End of Plan**
