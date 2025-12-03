# AUTORUN-14: Gunner Role Deep Dive + New Combat System

**Created:** 2025-12-02
**Updated:** 2025-12-02
**Status:** READY
**Prerequisite:** AR-13 Complete

---

## Key Decisions (Risk Assessment 2025-12-02)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Combat System | **Discard old, start fresh** | Clean Operations-first approach |
| Order Complexity | **Simple text first** | Add predefined/tracking later |
| Role Scope | **Gunner only (deep)** | Prove pattern before expansion |
| State Ownership | **Operations owns all** | Single source of truth |

---

## Objective

Build a complete **Gunner role** with new Operations-based combat system.

- Discard existing `/combat` interface and `lib/combat/` logic
- Create new combat resolution in Operations context
- Operations database is source of truth for all ship/combat state
- Deep, polished Gunner experience proves the pattern

**Deferred:** Captain, Pilot → AR-15. Ship Builder → AR-17.

---

## Risk Mitigation (All Risks → LOW)

| Risk | Before | Mitigation | After |
|------|--------|------------|-------|
| Breaking existing | MED | Keep old combat code, just disable routes | LOW |
| Scope creep | MED | Explicit "NOT doing" list, Gunner ONLY | LOW |
| Complex state | MED | Operations DB is sole source of truth | LOW |
| Combat math bugs | MED | Reuse existing dice patterns, full unit tests | LOW |
| Socket event bugs | MED | Copy proven `ops:*` patterns from handlers | LOW |
| Testing gaps | MED | Unit + E2E tests required before "done" | LOW |

### Specific Mitigations Applied:

1. **Combat Engine (was MEDIUM → LOW)**
   - Reuse existing dice rolling: `Math.floor(Math.random() * 6) + 1`
   - Copy test patterns from `tests/operations-handlers.test.js`
   - Full Traveller rules BUT test each modifier separately
   - Minimum 10 unit tests before integration

2. **Socket Events (was MEDIUM → LOW)**
   - Copy exact structure from working events like `ops:assignRole`, `ops:selectShip`
   - One event tested before adding next
   - Reuse broadcast patterns from `ops:crewUpdate`

3. **Test Coverage Required:**
   - Unit tests: Combat math (15+ tests)
   - E2E tests: Full Gunner flow (5+ tests)
   - All 325 existing tests must still pass

---

## Stage 14.1: Combat State in Operations DB

**Risk:** LOW | **Effort:** 2-3 hours | **Priority:** HIGHEST

Add combat-related state to Operations database.

### 14.1.1 New Database Tables/Columns

```sql
-- Add to ships table
ALTER TABLE ships ADD COLUMN current_hull INTEGER;
ALTER TABLE ships ADD COLUMN max_hull INTEGER;
ALTER TABLE ships ADD COLUMN armor INTEGER DEFAULT 0;

-- New table: ship_weapons
CREATE TABLE ship_weapons (
  id TEXT PRIMARY KEY,
  ship_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'laser', 'missile', 'sandcaster', etc.
  mount TEXT NOT NULL, -- 'turret', 'barbette', 'bay'
  damage TEXT NOT NULL, -- '2d6', '4d6', etc.
  range TEXT NOT NULL,  -- 'short', 'medium', 'long'
  ammo_current INTEGER,
  ammo_max INTEGER,
  status TEXT DEFAULT 'ready', -- 'ready', 'fired', 'damaged', 'destroyed'
  FOREIGN KEY (ship_id) REFERENCES ships(id)
);

-- New table: contacts (targets)
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  ship_type TEXT,
  range_band TEXT DEFAULT 'long', -- 'adjacent', 'close', 'short', 'medium', 'long', 'extreme'
  range_km INTEGER,
  bearing INTEGER DEFAULT 0,
  transponder TEXT, -- what they're broadcasting
  actual_identity TEXT, -- GM knows true identity
  disposition TEXT DEFAULT 'unknown', -- 'friendly', 'neutral', 'hostile', 'unknown'
  hull_current INTEGER,
  hull_max INTEGER,
  is_destroyed INTEGER DEFAULT 0,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- New table: combat_log
CREATE TABLE combat_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  actor TEXT NOT NULL,      -- who did it
  action TEXT NOT NULL,     -- 'fire', 'hit', 'miss', 'damage', etc.
  target TEXT,
  weapon TEXT,
  roll_data TEXT,           -- JSON with dice rolls
  result TEXT,              -- description
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);
```

### 14.1.2 Implementation Tasks

- [ ] Add migration for new columns/tables
- [ ] Create `lib/operations/combat.js` - combat state functions
- [ ] CRUD for contacts: `addContact`, `updateContact`, `removeContact`
- [ ] CRUD for weapons: `getShipWeapons`, `updateWeaponStatus`
- [ ] Combat log: `addCombatLogEntry`, `getCombatLog`
- [ ] Seed test data for development

---

## Stage 14.2: Gunner Panel UI

**Risk:** LOW | **Effort:** 3-4 hours | **Priority:** HIGH

Build the complete Gunner station interface.

### 14.2.1 Gunner Panel Layout

```
+----------------------------------------------------+
| GUNNER: [Character Name]           [WEAPONS ARMED] |
+----------------------------------------------------+
| TARGET                                              |
| +------------------------------------------------+ |
| | [No Target Locked]                             | |
| |                                                | |
| | Available Targets:                             | |
| | > Corsair (hostile) - 50km - Short range       | |
| | > Free Trader (neutral) - 200km - Medium       | |
| | > Unknown Contact (?) - 500km - Long           | |
| +------------------------------------------------+ |
|                                                    |
| WEAPONS                                            |
| +------------------------------------------------+ |
| | 1. [*] Pulse Laser (Turret 1)     [READY]      | |
| |     Range: Medium | Damage: 2D | Ammo: -       | |
| |                                                | |
| | 2. [ ] Missile Rack (Turret 2)    [LOADED]     | |
| |     Range: Long | Damage: 4D | Ammo: 8/12      | |
| |                                                | |
| | 3. [ ] Sandcaster (Turret 3)      [READY]      | |
| |     Range: Close | Defense | Ammo: 15/20       | |
| +------------------------------------------------+ |
|                                                    |
| FIRE LOG                                           |
| +------------------------------------------------+ |
| | [14:32] Pulse Laser → Corsair: HIT! 8 damage   | |
| | [14:31] Missile → Corsair: MISS (evaded)       | |
| | [14:30] Target acquired: Corsair               | |
| +------------------------------------------------+ |
+----------------------------------------------------+
| [ACQUIRE TARGET] [FIRE!] [POINT DEFENSE] [RELOAD]  |
+----------------------------------------------------+
```

### 14.2.2 Implementation Tasks

- [ ] Update `getRoleDetailContent('gunner')` in role-panels.js
- [ ] Display contacts list from state
- [ ] Display ship weapons with current status
- [ ] Add target selection UI (click to lock)
- [ ] Add weapon selection UI (radio buttons)
- [ ] Add fire log display (last 10 entries)
- [ ] Add action buttons: Acquire, Fire, Point Defense, Reload
- [ ] Style for locked target highlight
- [ ] Style for weapon status indicators

---

## Stage 14.3: Combat Resolution Engine

**Risk:** MEDIUM | **Effort:** 4-5 hours | **Priority:** HIGH

New combat resolution logic in Operations context.

### 14.3.1 Combat Rules (Traveller Core)

```javascript
// Attack roll: 2D6 + Gunner Skill + modifiers >= 8
function resolveAttack(attacker, weapon, target, modifiers = {}) {
  const roll = roll2D6();
  const gunnerSkill = attacker.skills?.gunnery || 0;
  const rangeDM = getRangeModifier(weapon.range, target.range_band);
  const evasiveDM = target.evasive ? -2 : 0;

  const total = roll + gunnerSkill + rangeDM + evasiveDM;
  const hit = total >= 8;

  if (!hit) return { hit: false, roll, total, effect: total - 8 };

  // Damage roll
  const damage = rollDamage(weapon.damage); // e.g., '2d6' → 7
  const actualDamage = Math.max(0, damage - target.armor);

  return {
    hit: true,
    roll,
    total,
    effect: total - 8,
    damage,
    actualDamage,
    armorReduction: target.armor
  };
}

// Range modifiers
const RANGE_DM = {
  adjacent: +1,
  close: +0,
  short: +0,
  medium: -1,
  long: -2,
  extreme: -4
};
```

### 14.3.2 Implementation Tasks

- [ ] Create `lib/operations/combat-engine.js`
- [ ] Implement `roll2D6()` with proper randomness
- [ ] Implement `rollDamage(diceStr)` - parse "2d6", "4d6+2", etc.
- [ ] Implement `resolveAttack()` with full modifier chain
- [ ] Implement `applyDamage()` to update target hull
- [ ] Implement `checkDestroyed()` for hull <= 0
- [ ] Add critical hit rules (effect 6+ = critical)
- [ ] Unit tests for all combat resolution functions

---

## Stage 14.4: Gunner Socket Events

**Risk:** MEDIUM | **Effort:** 3-4 hours | **Priority:** HIGH

Wire up Gunner actions to server.

### 14.4.1 Socket Events

| Event | Direction | Payload | Effect |
|-------|-----------|---------|--------|
| `ops:acquireTarget` | Client→Server | `{ contactId }` | Lock target |
| `ops:targetAcquired` | Server→Client | `{ contact }` | Confirm lock |
| `ops:fireWeapon` | Client→Server | `{ weaponId, targetId }` | Attack |
| `ops:fireResult` | Server→Client | `{ result, damage, log }` | Show result |
| `ops:weaponStatus` | Server→Client | `{ weapons[] }` | Update status |
| `ops:contactsUpdate` | Server→Client | `{ contacts[] }` | Update targets |
| `ops:combatLog` | Server→Client | `{ entries[] }` | Update log |

### 14.4.2 Implementation Tasks

- [ ] Add handlers in operations.handlers.js
- [ ] `ops:acquireTarget` - validate, set lock, broadcast
- [ ] `ops:fireWeapon` - resolve attack, apply damage, log, broadcast
- [ ] `ops:pointDefense` - toggle auto-intercept mode
- [ ] `ops:reloadWeapon` - restore ammo (if in port/downtime)
- [ ] Broadcast combat log updates to all bridge crew
- [ ] Broadcast contact status changes (damage, destroyed)

---

## Stage 14.5: GM Contact Management

**Risk:** LOW | **Effort:** 2-3 hours | **Priority:** MEDIUM

GM needs to add/manage contacts for Gunner to shoot at.

### 14.5.1 GM Contact Panel

```
+------------------------------------------+
| GM: CONTACTS                             |
+------------------------------------------+
| Active Contacts:                         |
| 1. Corsair (hostile) 50km [Edit] [Del]   |
| 2. Free Trader (neutral) 200km [Edit]    |
|                                          |
| [+ Add Contact]                          |
+------------------------------------------+
```

### 14.5.2 Add Contact Modal

```
+------------------------------------------+
| ADD CONTACT                              |
+------------------------------------------+
| Name: [________________]                 |
| Ship Type: [Corsair (200t)     ▼]        |
| Range: [Short ▼] or [___] km             |
| Disposition: ( ) Friendly                |
|              ( ) Neutral                 |
|              (•) Hostile                 |
|              ( ) Unknown                 |
| Hull: [40] / [40]                        |
| Armor: [4]                               |
|                                          |
| [Cancel] [Add Contact]                   |
+------------------------------------------+
```

### 14.5.3 Implementation Tasks

- [ ] Add GM contact list to prep panel or bridge
- [ ] Create "Add Contact" modal
- [ ] `ops:addContact` socket event
- [ ] `ops:updateContact` for range/disposition changes
- [ ] `ops:removeContact` to delete
- [ ] Auto-update Gunner panel when contacts change
- [ ] GM can see true identity, players see transponder

---

## Stage 14.6: Polish & Testing

**Risk:** LOW | **Effort:** 2-3 hours | **Priority:** MEDIUM

Final polish and comprehensive testing.

### 14.6.1 Polish Tasks

- [ ] Sound effects for fire/hit/miss (optional)
- [ ] Visual feedback on hit (flash target)
- [ ] Weapon cooldown indicator after firing
- [ ] Ammo depletion warnings
- [ ] Target destroyed celebration/notification

### 14.6.2 Testing

- [ ] Unit: Combat resolution math (10+ tests)
- [ ] Unit: Damage application (5+ tests)
- [ ] Unit: Range modifier calculations (6 tests)
- [ ] E2E: GM adds contact → Gunner sees it
- [ ] E2E: Gunner locks target → fires → sees result
- [ ] E2E: Target destroyed → removed from list
- [ ] E2E: Ammo tracking (missiles deplete)

---

## What We're NOT Doing in AR-14

To maintain focus, these are explicitly out of scope:

- ❌ Captain role (AR-15)
- ❌ Pilot role (AR-15)
- ❌ Engineer role (AR-15)
- ❌ Multi-gunner coordination
- ❌ Ship-to-ship maneuvering
- ❌ Sensor role (contacts are GM-managed for now)
- ❌ Boarding/Marines
- ❌ Ship Builder

---

## Success Criteria

1. **GM can add hostile contacts** with range and stats
2. **Gunner can lock targets** from contact list
3. **Gunner can fire weapons** at locked targets
4. **Combat resolves correctly** (2D6 + skill + mods >= 8)
5. **Damage applies** to target hull
6. **Combat log** shows all actions
7. **Target destroyed** when hull <= 0
8. **All existing tests pass** (325+)
9. **New combat tests pass** (20+)

---

## Estimated Effort

| Stage | Effort | Risk | Mitigation |
|-------|--------|------|------------|
| 14.1 Combat State DB | 2-3 hours | LOW | Standard schema work |
| 14.2 Gunner Panel UI | 3-4 hours | LOW | Extends existing role-panels |
| 14.3 Combat Engine | 4-5 hours | LOW | Reuse dice patterns, 15+ unit tests |
| 14.4 Socket Events | 3-4 hours | LOW | Copy from ops:assignRole pattern |
| 14.5 GM Contacts | 2-3 hours | LOW | Similar to existing GM tools |
| 14.6 Polish & Test | 2-3 hours | LOW | E2E validates everything |
| **Total** | **16-22 hours** | **LOW** | All risks mitigated |

---

## Files to Create/Modify

### New Files
- `lib/operations/combat-engine.js` - Combat resolution logic
- `lib/operations/contacts.js` - Contact CRUD
- `tests/combat-engine.test.js` - Combat unit tests

### Modified Files
- `lib/operations/database.js` - New tables
- `lib/operations/index.js` - Export new modules
- `lib/socket-handlers/operations.handlers.js` - New events
- `public/operations/modules/role-panels.js` - Gunner panel
- `public/operations/app.js` - Socket handlers
- `public/operations/styles.css` - Gunner styles

### Deprecated (keep but disable)
- `lib/combat/` - Old combat system
- `public/index.html` combat routes - Disable links

---

## Future Autoruns (Updated)

| Autorun | Focus |
|---------|-------|
| AR-15 | Captain + Pilot + Orders System |
| AR-16 | Engineer + Sensors + Astrogator |
| AR-17 | Ship Builder |
| AR-18 | Medic + Marine + Comms |
| AR-19 | Steward + Polish |

---

## Stage 14.7: Manual Testing TODOs (2025-12-03)

TODOs collected from manual testing session. 54 items across 18 categories.

---

### 14.7.1 Ship Data Bugs

| Metric | Value |
|--------|-------|
| **Risk** | LOW |
| **Effort** | 1-2 hours |
| **Value** | HIGH - Data accuracy is fundamental |
| **Priority** | P1 - Blocking |
| **Dependencies** | None |
| **Files** | `lib/operations/seed-ships.js`, ship data sources |

**Problem:** Ships showing incorrect jump ratings (Jump-0 errors).

| Task | Est. | Complexity |
|------|------|------------|
| Verify all ship jump ratings vs sources | 30m | Research |
| Fix Mercenary Cruiser jump rating (shows Jump-0) | 15m | Data fix |
| Check all ships for Jump-0 error | 30m | Audit |

**Acceptance:** All ships have correct jump ratings matching Traveller sources.

---

### 14.7.2 Sensors Panel Improvements

| Metric | Value |
|--------|-------|
| **Risk** | LOW |
| **Effort** | 3-4 hours |
| **Value** | HIGH - Core gameplay UX |
| **Priority** | P1 - High visibility |
| **Dependencies** | 14.7.12 Tooltip Infrastructure |
| **Files** | `public/operations/modules/role-panels.js`, `styles.css` |

**Problem:** Sensors panel wastes vertical space, poor information density.

| Task | Est. | Complexity |
|------|------|------------|
| Cut vertical distance in half | 30m | CSS |
| Put white and gray text on same line | 30m | CSS/HTML |
| Move red detail text to mouseover/onhover | 45m | JS |
| Add more info to hover text | 30m | JS |
| Pack display tighter - name and bearing same line | 30m | CSS |
| Add hover tooltips to scan buttons (tutorial) | 45m | JS |

**Acceptance:** 2x more contacts visible, hover shows rich detail.

---

### 14.7.3 General UI Improvements

| Metric | Value |
|--------|-------|
| **Risk** | MEDIUM |
| **Effort** | 6-10 hours |
| **Value** | HIGH - Professional polish |
| **Priority** | P2 - Enhancement |
| **Dependencies** | UI assessment first |
| **Files** | Multiple UI files |

**Problem:** UI lacks polish, missing standard controls.

| Task | Est. | Complexity |
|------|------|------------|
| Assess current UI against best practices | 2h | Research |
| Define improvement metrics | 1h | Planning |
| Rebuild to new specs | 4h | Implementation |
| Remove Dorannia system name (redundant) | 15m | HTML |
| Add minimize/restore controls to panels | 1h | JS/CSS |
| Add in-app Fullscreen button | 30m | JS |
| Add tooltip to [CREW ROLE] indicator | 15m | JS |

**Acceptance:** UI passes professional review, all controls discoverable.

---

### 14.7.4 Character & Crew Bugs

| Metric | Value |
|--------|-------|
| **Risk** | MEDIUM |
| **Effort** | 2-3 hours |
| **Value** | HIGH - Core functionality broken |
| **Priority** | P1 - Bug fix |
| **Dependencies** | DB schema understanding |
| **Files** | `lib/operations/accounts.js`, `database.js`, UI components |

**Problem:** Character cards blank, PC names duplicating.

| Task | Est. | Complexity |
|------|------|------------|
| BUG: Crew Status popup blank character cards | 1h | Debug/Fix |
| Find existing 5 PC character sheets, populate | 1h | Data entry |
| BUG: PC names duplicated in DB operation | 1h | Debug/Fix |

**Acceptance:** Character cards display all data, no duplication.

---

### 14.7.5 Panel System Features

| Metric | Value |
|--------|-------|
| **Risk** | HIGH |
| **Effort** | 8-12 hours |
| **Value** | VERY HIGH - Core architecture |
| **Priority** | P2 - Major feature |
| **Dependencies** | Role system stable |
| **Files** | `role-panels.js`, `app.js`, `operations.handlers.js` |

**Problem:** Panels are rigid, can't view other roles' panels.

| Task | Est. | Complexity |
|------|------|------------|
| Customizable panel UI - [panel] buttons | 3h | JS/CSS |
| Panel visibility matrix (role-based rules) | 3h | Architecture |
| READONLY-MODE for all 13+ crew panels | 3h | JS |
| Any crew observes read-only, role holder acts | 2h | Permissions |

**Acceptance:** Any player can view any panel read-only, only assigned role can act.

---

### 14.7.6 Ship Log Enhancements

| Metric | Value |
|--------|-------|
| **Risk** | LOW |
| **Effort** | 4-5 hours |
| **Value** | HIGH - Narrative immersion |
| **Priority** | P2 - Enhancement |
| **Dependencies** | Tooltip infrastructure |
| **Files** | `role-panels.js`, log rendering code |

**Problem:** Log entries too verbose, not interactive.

| Task | Est. | Complexity |
|------|------|------------|
| Embed extra data, show on hover | 1.5h | JS |
| Shorter messages with embedded rich info | 1h | Refactor |
| Make entries clickable (ship card, actions) | 1.5h | JS |
| Hover for detail, click for ship card | 1h | UX |

**Acceptance:** Log is compact, hover shows full detail, click shows ship card.

---

### 14.7.7 Von Sydo Selection Bug

| Metric | Value |
|--------|-------|
| **Risk** | LOW |
| **Effort** | 2-4 hours |
| **Value** | HIGH - Blocking bug |
| **Priority** | P1 - Bug fix |
| **Dependencies** | State management understanding |
| **Files** | `app.js`, character/role handlers |

**Problem:** Von Sydo (CHARACTER) appears selected but state is broken - SENSORS gives 'Must select ship' error.

| Task | Est. | Complexity |
|------|------|------------|
| BUG: Von Sydo character shows selected, SENSORS fails | 1h | Debug |
| Deeper investigation - find root cause (character vs ship state) | 2h | Debug |

**Acceptance:** Character selection doesn't break ship selection state.

---

### 14.7.8 GM Sensors (Omniscient View)

| Metric | Value |
|--------|-------|
| **Risk** | MEDIUM |
| **Effort** | 4-6 hours |
| **Value** | VERY HIGH - GM essential feature |
| **Priority** | P1 - Core GM tool |
| **Dependencies** | Knowledge state tracking |
| **Files** | `role-panels.js`, sensor display code |

**Problem:** GM sees same info as players, can't track PC knowledge.

| Task | Est. | Complexity |
|------|------|------------|
| Show all info - Unknown as [REAL IDENTITY] | 2h | JS |
| PC-unknown info shown in RED | 1h | CSS/JS |
| Auto-update when PCs discover (red → normal) | 2h | State sync |

**Acceptance:** GM sees truth + what PCs know, color-coded.

---

### 14.7.9 Ship Card Improvements

| Metric | Value |
|--------|-------|
| **Risk** | LOW |
| **Effort** | 6-10 hours (3 phases) |
| **Value** | MEDIUM - Visual polish |
| **Priority** | P3 - Nice to have |
| **Dependencies** | None |
| **Files** | Ship card rendering, assets |

**Problem:** Ship cards are text-only, no visual identity.

| Task | Est. | Complexity |
|------|------|------------|
| Phase 1: ASCII art vessel graphics | 2h | Creative |
| Phase 2: SVG vessel graphics | 3h | Design |
| Phase 3: PNG vessel images | 4h | Assets |

**Acceptance:** Each ship class has recognizable visual representation.

---

### 14.7.10 Hull/Health Indicator

| Metric | Value |
|--------|-------|
| **Risk** | LOW |
| **Effort** | 2-3 hours |
| **Value** | HIGH - Accurate status display |
| **Priority** | P2 - UX improvement |
| **Dependencies** | Combat state system |
| **Files** | Ship status display code |

**Problem:** Hull 100% misleading when critical systems disabled.

| Task | Est. | Complexity |
|------|------|------------|
| Rename to 'Ship Health' | 30m | Terminology |
| Show degraded status when Power Plant disabled | 1.5h | Logic |

**Acceptance:** Health indicator reflects true operational status.

---

### 14.7.11 Date & System Display

| Metric | Value |
|--------|-------|
| **Risk** | LOW/HIGH |
| **Effort** | 1h / 8h+ |
| **Value** | MEDIUM / LOW |
| **Priority** | P2 / P4 |
| **Dependencies** | Journal system / 3D library |
| **Files** | Header display code |

**Problem:** Date and system indicators are static, not informative.

| Task | Est. | Complexity |
|------|------|------------|
| DATE: Hover shows recent journal entries | 1h | JS |
| ADVANCED: System hover shows 3D map (lazy-loaded) | 8h+ | Complex |

**Acceptance:** Date hover shows context; 3D map is stretch goal.

---

### 14.7.12 Tooltip Infrastructure

| Metric | Value |
|--------|-------|
| **Risk** | MEDIUM |
| **Effort** | 4-6 hours |
| **Value** | VERY HIGH - Enables many features |
| **Priority** | P1 - Foundation |
| **Dependencies** | None - others depend on this |
| **Files** | Shared tooltip component, all panels |

**Problem:** No consistent tooltip system, hover info scattered.

| Task | Est. | Complexity |
|------|------|------------|
| ALL ROLES: Add hover tooltips to all controls | 4h | JS/CSS |
| PERF: Monitor tooltip performance | 1h | Testing |

**Acceptance:** Every control has discoverable tooltip, no perf impact.

---

### 14.7.13 Ship Selector Feature

| Metric | Value |
|--------|-------|
| **Risk** | MEDIUM |
| **Effort** | 3-4 hours |
| **Value** | HIGH - Multi-ship operations |
| **Priority** | P2 - Feature |
| **Dependencies** | Ship docking data model |
| **Files** | Header ship display, ship state |

**Problem:** Can't switch to docked smallcraft/fighters.

| Task | Est. | Complexity |
|------|------|------------|
| Ship name becomes dropdown for connected vessels | 3h | JS/UI |

**Acceptance:** Crew can switch between docked/connected ships.

---

### 14.7.14 Contacts System

| Metric | Value |
|--------|-------|
| **Risk** | MEDIUM |
| **Effort** | 6-8 hours |
| **Value** | HIGH - Campaign continuity |
| **Priority** | P2 - Feature |
| **Dependencies** | Database schema, UID system |
| **Files** | New contacts module, DB schema |

**Problem:** No persistent contact list management.

| Task | Est. | Complexity |
|------|------|------------|
| Implement CRUD for contact list (per-PC, UID-indexed) | 4h | Backend |
| Add Import/Export/Share between PCs | 3h | Feature |

**Acceptance:** PCs manage personal contacts, can share selectively.

---

### 14.7.15 Database Review

| Metric | Value |
|--------|-------|
| **Risk** | LOW |
| **Effort** | 2-3 hours |
| **Value** | HIGH - Data integrity |
| **Priority** | P2 - Technical debt |
| **Dependencies** | None |
| **Files** | `lib/operations/database.js` |

**Problem:** Schema may have issues from rapid development.

| Task | Est. | Complexity |
|------|------|------------|
| Review schema for problems, indexes, normalization | 2h | Analysis |

**Acceptance:** Schema documented, issues identified, fixes planned.

---

### 14.7.16 Email System Fixes

| Metric | Value |
|--------|-------|
| **Risk** | LOW |
| **Effort** | 2-3 hours |
| **Value** | MEDIUM - Visual bug |
| **Priority** | P2 - Bug fix |
| **Dependencies** | None |
| **Files** | Email panel CSS/JS |

**Problem:** Email panel transparent, wastes space.

| Task | Est. | Complexity |
|------|------|------------|
| Compact to 1 email per line, mouseover details | 1.5h | CSS/JS |
| Add opaque background | 30m | CSS |

**Acceptance:** Email list is dense, readable, opaque.

---

### 14.7.17 Gunner Role Improvements

| Metric | Value |
|--------|-------|
| **Risk** | MEDIUM |
| **Effort** | 6-8 hours |
| **Value** | VERY HIGH - Core combat role |
| **Priority** | P1 - Part of AR-14 |
| **Dependencies** | Combat state machine |
| **Files** | Gunner panel, combat engine |

**Problem:** Gunner UI lacks polish, feedback, state awareness.

| Task | Est. | Complexity |
|------|------|------------|
| Rename 'FireWeapon' → 'Fire Laser' | 15m | Label |
| Add hover tooltips to all buttons | 1h | JS |
| Buttons grey when unavailable (action economy) | 2h | State machine |
| TARGET fills on sensor click, clears on click-away | 1.5h | JS |
| TARGET hover shows all sensor data | 1h | JS |
| Fire button hover shows hit chance (color-coded) | 1.5h | Combat math |

**Acceptance:** Gunner UI is intuitive, responsive, informative.

---

### 14.7.18 Planning Tasks

| Metric | Value |
|--------|-------|
| **Risk** | LOW |
| **Effort** | 2-3 hours |
| **Value** | HIGH - Roadmap clarity |
| **Priority** | P2 - Planning |
| **Dependencies** | Feature inventory |
| **Files** | Planning docs |

**Problem:** Need comprehensive feature roadmap.

| Task | Est. | Complexity |
|------|------|------------|
| Audit remaining SHIP OPERATIONS, prioritize, plan | 2h | Analysis |

**Acceptance:** Complete prioritized feature list with effort estimates.

---

## 14.7 Summary Matrix

| # | Category | Count | Risk | Effort | Value | Priority |
|---|----------|-------|------|--------|-------|----------|
| 1 | Ship Data Bugs | 3 | LOW | 1-2h | HIGH | P1 |
| 2 | Sensors Panel | 6 | LOW | 3-4h | HIGH | P1 |
| 3 | General UI | 7 | MED | 6-10h | HIGH | P2 |
| 4 | Character/Crew | 3 | MED | 2-3h | HIGH | P1 |
| 5 | Panel System | 4 | HIGH | 8-12h | V.HIGH | P2 |
| 6 | Ship Log | 4 | LOW | 4-5h | HIGH | P2 |
| 7 | Von Sydo Bug | 2 | MED | 2-4h | HIGH | P1 |
| 8 | GM Sensors | 3 | MED | 4-6h | V.HIGH | P1 |
| 9 | Ship Card | 3 | LOW | 6-10h | MED | P3 |
| 10 | Hull Indicator | 2 | LOW | 2-3h | HIGH | P2 |
| 11 | Date/System | 2 | LOW/HIGH | 1-9h | MED | P2/P4 |
| 12 | Tooltips | 2 | MED | 4-6h | V.HIGH | P1 |
| 13 | Ship Selector | 1 | MED | 3-4h | HIGH | P2 |
| 14 | Contacts | 2 | MED | 6-8h | HIGH | P2 |
| 15 | Database | 1 | LOW | 2-3h | HIGH | P2 |
| 16 | Email | 2 | LOW | 2-3h | MED | P2 |
| 17 | Gunner Role | 6 | MED | 6-8h | V.HIGH | P1 |
| 18 | Planning | 1 | LOW | 2-3h | HIGH | P2 |
| | **TOTAL** | **54** | | **65-103h** | | |

## Priority Ordering

### P1 - Critical (Do First)
1. **14.7.1** Ship Data Bugs (1-2h) - Blocking data errors
2. **14.7.4** Character/Crew Bugs (2-3h) - Core functionality broken
3. **14.7.7** Von Sydo Selection Bug (2-4h) - Blocking UX bug
4. **14.7.12** Tooltip Infrastructure (4-6h) - Foundation for others
5. **14.7.2** Sensors Panel (3-4h) - Core gameplay
6. **14.7.8** GM Sensors Omniscient (4-6h) - GM essential
7. **14.7.17** Gunner Role (6-8h) - Part of AR-14

### P2 - Important (Do Next)
8. **14.7.5** Panel System Features (8-12h) - Major enhancement
9. **14.7.6** Ship Log (4-5h) - Immersion
10. **14.7.10** Hull Indicator (2-3h) - Accuracy
11. **14.7.13** Ship Selector (3-4h) - Multi-ship
12. **14.7.14** Contacts System (6-8h) - Campaign feature
13. **14.7.15** Database Review (2-3h) - Tech debt
14. **14.7.16** Email Fixes (2-3h) - Visual bug
15. **14.7.3** General UI (6-10h) - Polish
16. **14.7.18** Planning (2-3h) - Roadmap

### P3 - Nice to Have
17. **14.7.9** Ship Card Graphics (6-10h) - Visual polish
18. **14.7.11** Date/System 3D (8h+) - Stretch goal

---

## Risk Mitigation (All → LOW)

**Strategy: BUGFIX AR - Defer all major features to AR-15+**

### IN SCOPE (Bugs & Quick Fixes)

| Item | Risk | Mitigation | Effort |
|------|------|------------|--------|
| **14.7.1 Ship Data Bugs** | LOW | Data fix only | 1-2h |
| **14.7.4 Character/Crew Bugs** | LOW | Debug + DB constraint | 2-3h |
| **14.7.7 Von Sydo Bug** | LOW | Character vs ship state conflict - debug & fix | 2-4h |
| **14.7.16 Email Bugs** | LOW | CSS fix (opaque bg) | 1h |
| **14.7.17 Gunner Label** | LOW | Rename button text only | 15m |

**Total In-Scope: ~7-10 hours**

### DEFERRED TO AR-15+ (Features)

| Item | Reason | Defer To |
|------|--------|----------|
| **14.7.2 Sensors Panel** | UI redesign, not bug | AR-15 |
| **14.7.3 General UI** | Major polish work | AR-15 |
| **14.7.5 Panel System** | Major new feature | AR-15 |
| **14.7.6 Ship Log** | Enhancement | AR-15 |
| **14.7.8 GM Sensors** | New feature | AR-15 |
| **14.7.9 Ship Card Graphics** | Visual polish | AR-16 |
| **14.7.19 Animated SVGs** | Visual polish for crew actions | AR-16 |
| **14.7.10 Hull Indicator** | Enhancement | AR-15 |
| **14.7.11 Date/System** | Enhancement/Stretch | AR-16+ |
| **14.7.12 Tooltips** | Infrastructure | AR-15 |
| **14.7.13 Ship Selector** | New feature | AR-15 |
| **14.7.14 Contacts** | New feature | AR-15 |
| **14.7.15 Database Review** | Tech debt | AR-15 |
| **14.7.17 Gunner (except label)** | UI polish | AR-15 |
| **14.7.18 Planning** | Meta task | AR-15 |

---

## Unanswered Questions (UQ)

### Architecture UQ

| # | Question | Impact | Options |
|---|----------|--------|---------|
| UQ-1 | **Tooltip library or native?** | Affects 14.7.2, 14.7.6, 14.7.12, 14.7.17 | A) Native `title` (simple, limited styling) B) Custom CSS tooltip (more control) C) Library like Tippy.js (features, dependency) |
| UQ-2 | **Panel switching persistence?** | Affects 14.7.5 | A) Session only (resets on refresh) B) LocalStorage per user C) DB per user |
| UQ-3 | **GM knowledge state storage?** | Affects 14.7.8 | A) Computed on render (no storage) B) `player_knowledge` table in DB C) JSON blob per player |

### Data UQ

| # | Question | Impact | Options |
|---|----------|--------|---------|
| UQ-4 | **Where are canonical ship jump ratings?** | Affects 14.7.1 | A) Traveller Wiki B) Core rulebook PDF C) Existing seed data has source |
| UQ-5 | **What are the 5 PC character sheets?** | Affects 14.7.4 | Need file paths or names to populate |
| UQ-6 | **Von Sydo - is this a specific ship or ship type?** | Affects 14.7.7 | Need to identify exact entity causing bug |

### UX UQ

| # | Question | Impact | Options |
|---|----------|--------|---------|
| UQ-7 | **Hit chance display format?** | Affects 14.7.17 | A) Percentage "73%" B) Color only (green/yellow/red) C) Both D) Dice notation "8+ on 2D6" |
| UQ-8 | **Panel minimize behavior?** | Affects 14.7.3 | A) Collapse to title bar only B) Collapse to icon C) Hide completely |
| UQ-9 | **Email - how many visible in compact mode?** | Affects 14.7.16 | A) 5 emails B) 10 emails C) Fill available space |

---

## UQ Recommendations

| UQ | Recommended | Rationale |
|----|-------------|-----------|
| UQ-1 | **B) Custom CSS** | Zero dependencies, full control, already have CSS skills |
| UQ-2 | **B) LocalStorage** | Per-user, survives refresh, no DB migration |
| UQ-3 | **A) Computed** | Start simple, add storage later if needed |
| UQ-4 | **C) Check seed data** | Already have sources cited in code |
| UQ-7 | **C) Both** | "73% (8+)" gives intuitive + precise |
| UQ-8 | **A) Title bar** | Standard behavior, preserves screen position |
| UQ-9 | **C) Fill space** | Responsive, adapts to screen size |

### UQ Resolved

- **UQ-5**: ✅ **Dorannia campaign PCs** - the 5 players in seeded campaign
- **UQ-6**: ✅ **Von Sydo is a CHARACTER** (not a ship) - bug description updated
