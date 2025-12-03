# Staged TODOs for Operations VTT

**Created:** 2025-11-30
**Last Updated:** 2025-12-03

---

## AR-16: Security Hardening (Easy/Medium Fixes)

**Total Est:** 4-6 hours | **Risk:** LOW-MEDIUM | **Impact:** Production-ready security

### Stage 16.1: Gate Eval on NODE_ENV (CRITICAL)
- Gate puppetry:eval handler behind NODE_ENV !== 'production'
- Keep functionality for test/dev automation
- **LOC:** +5 | **Time:** 15min
- **Risk:** LOW (preserves test capability)

### Stage 16.2: Error Message Sanitization
- Category hints in prod: 'Campaign error', 'Role error' (no stack details)
- Full error.message in dev/test mode (NODE_ENV gating)
- TODO: Audit all error messages for debug helpfulness
- ~60 locations in operations.handlers.js
- **LOC:** +50 | **Time:** 1hr
- **Tests:** Add unit tests + Puppeteer tests for error messages

### Stage 16.3: Console.log Cleanup (Client)
- Remove/gate debug console.log in app.js
- ~15 locations
- **LOC:** -30 | **Time:** 20min

### Stage 16.4: XSS - Onclick to Data Attributes
- Replace inline onclick with event delegation
- Affects: relieveCrewMember, gmAssignRole, hailContact, etc.
- ~20 locations
- **LOC:** +50 | **Time:** 1.5hr
- **Tests:** Puppeteer coverage for all affected buttons (required)
- **Risk:** MEDIUM (UI changes, needs testing)

### Stage 16.5: Input Validation Schema (DEFERRED)
- **Branch:** security/input-validation
- Add simple validation for socket event data
- Validate: accountId, campaignId, shipId formats
- Create lib/operations/validators.js
- **LOC:** +100 | **Time:** 1hr

### Stage 16.6: Rate Limiting (Operations) (DEFERRED)
- **Branch:** security/rate-limit
- Port rate limiting from space.handlers.js
- Apply to: campaign creation, role assignment, deletions
- **LOC:** +40 | **Time:** 30min

### Stage 16.7: SQL Template Hardening
- Replace dynamic field building with explicit field maps
- accounts.js:97-102, combat.js:72,173
- **LOC:** +20 | **Time:** 30min

### Stage 16.8: Seed Script Safety
- Add env check to seed-dorannia.js
- Prevent accidental production seeding
- **LOC:** +10 | **Time:** 10min

### Stage 16.9: Escape IDs in Templates
- Ensure accountId, contactId escaped in onclick handlers
- Complement to 16.4 for any remaining inline handlers
- **LOC:** +20 | **Time:** 20min

### Stage 16.10: Security Test Suite (DEFERRED)
- **Branch:** security/tests
- Add tests verifying security fixes
- Test: error sanitization, input validation, rate limits
- **LOC:** +150 | **Time:** 1hr

---

### AR-16 Summary
| Metric | Value |
|--------|-------|
| Stages | 10 |
| Total Time | 4-6 hours |
| Net LOC | +370 |
| Issues Fixed | 9 |
| TypeScript Impact | LOW (validation logic reusable) |

---

---

## AUTORUN-14 COMPLETED (2025-12-02)

### Gunner Role Deep Dive + New Combat System
- **Stage 14.1:** Combat State in Operations DB (ship_weapons, combat_log tables)
- **Stage 14.2:** Gunner Panel UI (target list, weapon cards, fire log)
- **Stage 14.3:** Combat Resolution Engine (lib/operations/combat-engine.js)
  - Traveller rules: 2D6 + skill + modifiers >= 8 to hit
  - Range band DMs, critical hits on effect 6+
  - 31 unit tests in tests/combat-engine.test.js
- **Stage 14.4:** Gunner Socket Events (ops:fireWeapon, ops:acquireTarget, etc.)
- **Stage 14.5:** GM Contact Management (Contacts tab in prep panel)
- **Stage 14.6:** Polish & Testing (combat module refactored to modules/combat.js)

### Key Decisions:
- Discard old combat system - Operations owns state
- Gunner role only (deep implementation)
- Full Traveller combat rules
- Unit tests required (31 new tests)

---

## AUTORUN-13 COMPLETED (2025-12-02)

### Stage 13.0: Puppeteer Role Test Suite
- Created `tests/e2e/puppeteer-role-tests.js` (~450 LOC)
- Tests for all 11 crew roles
- Role selection and assignment validation

### Stage 13.1: Bug Fixes
| Bug | Description | Fix |
|-----|-------------|-----|
| GM as Crew | GM appeared in crew list with relieve button | Added GM filters in crewUpdate, bridgeJoined handlers |
| Captain Conflict | "Role captain already taken" on reconnect | Root cause was GM-as-crew, now fixed |
| Relieve UI Missing | Relieve button not showing | Fixed isYou detection, updated state before re-render |

### Stage 13.3: Expandable Role Panels
- Half-screen and full-screen expansion modes
- Keyboard shortcuts: F for fullscreen, Escape to collapse
- State persistence per role

### Stage 13.4: Full-Screen Email App
- Replaced modal-based email with full-screen app
- Two-pane layout: inbox list + message view
- Compose, reply, archive functionality

### Stage 13.5: Guest Login Completion
- Removed TODO placeholder
- Guest indicator shows skill level
- Full guest login flow verified

### Stage 13.6: File Modularization
- Existing modules documented (~1,444 LOC extracted)
- Module structure: utils, ascii-art, uwp-decoder, tooltips, role-panels
- Main app.js: 6,073 LOC (further extraction deferred to AR-14)

---

## Stage 2: Combat Handler Extraction (MVC Phase 2)
**Risk:** MEDIUM | **Time:** 2-3 hours | **Priority:** HIGH
**Status:** AUTORUN-13 (Stage 13.2)

### Tasks:
1. Create `lib/combat/ai.js` - Extract AI decision logic
2. Create `lib/combat/state.js` - Combat state management
3. Extract combat handlers incrementally from server.js
4. Target: server.js under 500 LOC

### Dependencies:
- Stage 1 complete (operations handlers extracted) ✅

---

## Stage 3: Bridge View Polish
**Risk:** LOW | **Time:** 1-2 hours | **Priority:** MEDIUM
**Autorun:** AUTORUN-OPS-2.md (combined with Stage 4)

### Tasks:
1. Role detail panel content (pilot, engineer, gunner views)
2. Time system UI with GM advance controls
3. Guest login UI completion
4. Multiple identical roles support (2+ gunners)

### Dependencies:
- Stage 1 complete ✅

---

## Stage 4: Sensor & Contact System
**Risk:** MEDIUM | **Time:** 2-3 hours | **Priority:** MEDIUM
**Autorun:** AUTORUN-OPS-2.md (combined with Stage 3)

### Tasks:
1. Contact data model in database
2. GM contact management tools
3. Sensor display with range bands
4. Fog of war (sensor-based visibility)

### Dependencies:
- Stage 3 bridge view (same autorun)

---

## Stage 5: Combat Integration
**Risk:** HIGH | **Time:** 3-4 hours | **Priority:** MEDIUM
**Autorun:** Not yet created - needs risk mitigation plan

### Tasks:
1. Combat mode transition from bridge
2. Contact-to-combatant conversion
3. Role-to-station mapping
4. Shared combat state sync
5. Exit combat with state persistence

### Risk Mitigation Needed:
- State sync strategy between ops DB and combat memory
- Multi-player action sequencing
- Preserve solo mode functionality
- Consider: view-only first, actions later

---

## Stage 6: Ship Systems & Damage
**Risk:** MEDIUM | **Time:** 2-3 hours | **Priority:** LOW
**Autorun:** Not yet created - needs risk mitigation plan

### Tasks:
1. System data model per ship
2. Critical hit → system damage
3. Engineer repair actions
4. System status display

### Risk Mitigation Needed:
- Balance repair times vs combat pace
- Define system dependency tree
- Test with existing critical hit system

---

## Stage 7: Time & Jump Travel
**Risk:** LOW | **Time:** 1-2 hours | **Priority:** LOW
**Autorun:** Can be standalone or combined

### Tasks:
1. Imperial calendar (Year-Day format)
2. Jump initiation and fuel consumption
3. In-jump state (168 hours)
4. Jump exit and location update

---

## Stage 8: NPC Crew Actions
**Risk:** MEDIUM | **Time:** 2-3 hours | **Priority:** LOW
**Autorun:** Not yet created - needs risk mitigation plan

### Tasks:
1. NPC skill definitions
2. Automatic NPC actions in combat
3. GM override controls
4. Crew casualties and hiring

### Risk Mitigation Needed:
- NPC AI decision tree (keep simple)
- Balance: NPCs < players in effectiveness
- Test NPC actions don't break combat flow

---

## Stage 9: Character Import System
**Risk:** MEDIUM | **Time:** 3-4 hours | **Priority:** MEDIUM
**Autorun:** Not yet created

### Problem Statement:
Everyone stores Traveller characters slightly differently - no 100% standard format exists.
Need to support both precise imports and "best effort" fuzzy imports.

### Tasks:
1. Define canonical JSON character schema for VTT
2. Precise JSON import (direct mapping when format matches)
3. AI-assisted best-effort import:
   - Parse various text/JSON formats
   - Extract stats (STR, DEX, END, INT, EDU, SOC)
   - Extract skills with levels
   - Handle UPP notation (e.g., "777777")
   - Extract equipment, credits, etc.
   - Flag uncertain fields for user review
4. Character export (to canonical JSON)
5. Clipboard paste import (for quick entry)

### Supported Import Sources (Target):
- Traveller Character Generator outputs
- PDF copy-paste text
- Roll20 character sheet exports
- Foundry VTT exports
- Plain text "UPP + skills" format
- Custom JSON from other tools

### Risk Mitigation:
- AI parsing should be optional (user can skip to manual entry)
- Show preview before committing import
- Allow field-by-field correction
- Log parsing decisions for debugging

---

## Cleanup TODOs (Any Stage)

### Delete After MVC Stable:
- `tests/operations-handlers.test.js` (safety net for refactor)

### Files to Delete (bugs fixed):
- ~~`.claude/TODO-solo-mode-escape.md`~~ (DELETED - Autorun 4)
- ~~`.claude/TODO-solo-ai-not-attacking.md`~~ (DELETED - Autorun 4)
- ~~`.claude/TODO-solo-missile-freeze.md`~~ (DELETED - Autorun 4)

---

## UI/UX Enhancements (2025-12-02)

### TODO 1: Bridge View Title
**Risk:** LOW | **Time:** 15 min | **Priority:** LOW

Add "Bridge View" title top center, just to the right of the alert indicator.

---

### TODO 2: Expandable Role Panels
**Risk:** MEDIUM | **Time:** 2-3 hours | **Priority:** HIGH
**Status:** AUTORUN-13 (Stage 13.3)

Crew role panels need expansion options for data-heavy roles:
- **Problem:** Role panel often too small. Astrogator plotting Jump-6 needs large map display.
- **Solution:**
  1. **Claim Sensor Display** - Role panel expands into sensor area (half-screen)
  2. **Full Screen** - Role panel takes entire viewport

**Affected Roles:**
- Astrogator (jump maps) - PRIMARY
- Sensors (contact analysis)
- Captain (tactical overview)
- Engineer (system diagnostics)
- Medic (medical records)

**Implementation:**
1. Add expand/collapse button to role panel header
2. CSS for expanded states (full-screen, half-screen)
3. Keyboard shortcut (Escape to collapse, F for fullscreen)
4. Remember expansion state per role

---

### TODO 3: Full-Screen Email App
**Risk:** LOW | **Time:** 2-3 hours | **Priority:** HIGH
**Status:** AUTORUN-13 (Stage 13.4)

Email popups don't persist. Should be a full-screen app experience.

**Current Problem:**
- Email appears as popup/modal
- Closes on interaction
- Feels like notification, not app

**Solution:**
- Full-screen email client UI
- Inbox list on left, message view on right
- Persists until user explicitly closes
- Read/unread status indicators
- Compose new message (to GM or crew)

**Implementation:**
1. Create full-screen email container (new app layer)
2. Inbox list with read/unread indicators
3. Message view pane
4. Close with X button or Escape key
5. Mark messages as read on view

---

### TODO 4: Shared Traveller Map View
**Risk:** MEDIUM | **Time:** 3-4 hours | **Priority:** HIGH
**Status:** Moved to AR-14 (Stage 14.4)

GM-controlled shared map display for all players.

---

### TODO 5: Add All Known Ships to Library
**Risk:** LOW | **Time:** 20-40 hours | **Priority:** LOW
**Status:** Future (ask before starting)

Add ALL known Traveller ships to `data/ships/`:
- Core Rulebook ships (complete set)
- High Guard ships
- Small craft (launches, pinnaces, cutters, shuttles)
- Fighters (light, medium, heavy)
- Special cases (system defense boats, etc.)

**Note:** This is a HUGE task. Ask before starting.

---

### TODO 6: Comprehensive Crew Role Tests
**Risk:** MEDIUM | **Time:** 8-12 hours | **Priority:** MEDIUM
**Dependency:** AR-13 Stage 13.3 (Expandable Role Panels)

Complete Puppeteer test suite for all 11 crew roles:
- Test every role's panel UI
- Test role-specific actions
- Test role interactions
- Regression tests for role bugs

**Goal:** Very detailed crew role actions that make gameplay fun.

---

### TODO 7: Ship Builder System
**Risk:** HIGH | **Time:** 56-81 hours | **Priority:** LOW
**Status:** AR-14 scope (Stages 14.1-14.3)
**Reference:** `.claude/TODO-ship-builder-system.md`

Full CRUD ship customization with High Guard rules:
- Ship list management
- Component picker UI
- Rules validation
- Import/Export

**Test Case:** Gorram (600-ton X-Carrier) - `data/ships/gorram.json`

---

## Crew Role Depth Implementation

**Priority:** HIGH | **Scope:** AR-14+ (Multiple Autoruns)

Each crew role needs full implementation to make gameplay engaging. Currently roles show placeholder panels - these need real functionality.

---

### ROLE 1: Captain
**Current:** Basic panel with crew list and alert controls
**Priority:** HIGH (core leadership role)

#### Actions to Implement:
- [ ] **Set Alert Status** - Green/Yellow/Red with ship-wide effects
- [ ] **Issue Orders** - Send orders to specific crew members (appears in their panel)
- [ ] **Authorize Combat** - Required before weapons can fire
- [ ] **Hail Contact** - Open comms with sensor contacts
- [ ] **Request Status** - Ping crew for status updates
- [ ] **Relieve Crew** - Remove underperforming/incapacitated crew from stations
- [ ] **Battle Stations** - Quick alert escalation with position assignments
- [ ] **Abandon Ship** - Emergency protocol initiation

#### Panel Display:
- [ ] Crew status grid (who's where, health status)
- [ ] Ship status overview (hull, power, critical systems)
- [ ] Pending orders queue
- [ ] Contact summary from Sensors
- [ ] Alert status indicator with quick-change buttons

---

### ROLE 2: Pilot
**Current:** Basic panel with thrust/maneuver placeholders
**Priority:** HIGH (primary ship control)

#### Actions to Implement:
- [ ] **Set Course** - Define destination (system/orbit/dock)
- [ ] **Evasive Maneuvers** - Defensive flying (-DM to incoming fire)
- [ ] **Pursuit/Intercept** - Chase a contact
- [ ] **Match Velocity** - Parallel a contact for boarding/docking
- [ ] **Emergency Thrust** - Burn extra fuel for speed
- [ ] **Dock/Undock** - Initiate docking sequence
- [ ] **Landing** - Atmospheric descent (if capable)
- [ ] **Hold Position** - Station keeping

#### Panel Display:
- [ ] Current vector/heading visualization
- [ ] Fuel gauge with burn calculations
- [ ] Maneuver queue (planned actions)
- [ ] G-force indicator
- [ ] Range to current destination
- [ ] Docking status when applicable

---

### ROLE 3: Astrogator
**Current:** Jump map iframe integration
**Priority:** HIGH (critical for travel)

#### Actions to Implement:
- [ ] **Plot Jump** - Calculate jump to destination system
- [ ] **Verify Coordinates** - Double-check jump calculation (reduces misjump)
- [ ] **Emergency Jump** - Quick plot with higher misjump risk
- [ ] **Calculate ETA** - Time to destination at current thrust
- [ ] **Plot Intercept** - Calculate course to contact
- [ ] **Survey System** - Catalog system bodies and features
- [ ] **Mark Waypoint** - Save locations for future reference

#### Panel Display:
- [ ] TravellerMap integration (expandable to full-screen)
- [ ] Jump route planning interface
- [ ] Fuel requirements for plotted jumps
- [ ] System data (UWP, bases, gas giants)
- [ ] Current position in system
- [ ] Jump countdown when in-jump

---

### ROLE 4: Engineer
**Current:** Power allocation placeholder
**Priority:** HIGH (keeps ship running)

#### Actions to Implement:
- [ ] **Allocate Power** - Distribute power between systems
- [ ] **Emergency Repairs** - Fix damaged systems during combat
- [ ] **Boost System** - Overclock a system temporarily
- [ ] **Damage Control** - Prioritize repair efforts
- [ ] **Purge Atmosphere** - Vent compartments (fire/breach)
- [ ] **Bypass Safety** - Risk for extra performance
- [ ] **Fuel Transfer** - Manage fuel between tanks
- [ ] **System Shutdown** - Power down non-essential systems

#### Panel Display:
- [ ] Power grid diagram (what's using what)
- [ ] System health status (all ship systems)
- [ ] Repair queue with time estimates
- [ ] Fuel status (refined/unrefined)
- [ ] Power plant output vs demand
- [ ] Critical warnings and alarms

---

### ROLE 5: Gunner
**Current:** IMPLEMENTED (AR-14) - Full combat system
**Priority:** HIGH (combat effectiveness)

#### Actions to Implement:
- [x] **Acquire Target** - Lock onto sensor contact (AR-14)
- [x] **Fire Weapon** - Execute attack on locked target (AR-14)
- [ ] **Select Ammunition** - Choose warhead type (HE, AP, nuclear)
- [x] **Switch Weapon** - Change active weapon mount (AR-14)
- [x] **Point Defense** - Automated missile intercept mode (AR-14)
- [ ] **Suppressive Fire** - Area denial (-DM to targets)
- [ ] **Called Shot** - Target specific system (+difficulty, +effect)
- [ ] **Hold Fire** - Maintain lock without firing

#### Panel Display:
- [x] Weapon mounts status (loaded, charged, damaged) (AR-14)
- [x] Current target with lock indicator (AR-14)
- [x] Ammunition counts by type (AR-14 - basic)
- [x] Range to target with hit probability (AR-14)
- [ ] Fire arc visualization
- [x] Recent shots log with results (AR-14)

---

### ROLE 6: Sensors
**Current:** Contact list placeholder
**Priority:** HIGH (situational awareness)

#### Actions to Implement:
- [ ] **Active Scan** - Ping for contacts (reveals position)
- [ ] **Passive Scan** - Listen only (stealthy)
- [ ] **Analyze Contact** - Identify ship type/class
- [ ] **Track Contact** - Maintain lock on specific contact
- [ ] **ECM Jamming** - Disrupt enemy sensors/missiles
- [ ] **ECCM** - Counter enemy jamming
- [ ] **Transponder** - Toggle ship's ID broadcast
- [ ] **Sensor Log** - Record contact history

#### Panel Display:
- [ ] Sensor display (range bands, contacts)
- [ ] Contact list with classification
- [ ] Detailed contact info panel
- [ ] Sensor mode indicator (active/passive)
- [ ] ECM/ECCM status
- [ ] Detection range circles

---

### ROLE 7: Communications (Comms)
**Current:** Basic placeholder
**Priority:** MEDIUM (coordination role)

#### Actions to Implement:
- [ ] **Hail Contact** - Open channel to ship/station
- [ ] **Broadcast** - Send to all in range
- [ ] **Encrypt Message** - Secure communication
- [ ] **Decrypt Intercept** - Decode enemy comms
- [ ] **Distress Call** - Emergency broadcast
- [ ] **Jam Communications** - Block enemy comms
- [ ] **Relay Message** - Forward between parties
- [ ] **Log Transmission** - Record all comms

#### Panel Display:
- [ ] Active channel indicator
- [ ] Message queue (incoming/outgoing)
- [ ] Frequency scanner
- [ ] Encryption status
- [ ] Range to comm targets
- [ ] Transmission log

---

### ROLE 8: Medic
**Current:** Crew health placeholder
**Priority:** MEDIUM (crew survival)

#### Actions to Implement:
- [ ] **Treat Wounds** - Heal injured crew
- [ ] **Stabilize** - Prevent death of critical crew
- [ ] **Administer Drugs** - Combat drugs, antidotes, sedatives
- [ ] **Diagnose** - Identify medical conditions
- [ ] **Surgery** - Major medical procedures
- [ ] **Quarantine** - Isolate infected crew
- [ ] **Triage** - Prioritize treatment order
- [ ] **Medical Report** - Status to Captain

#### Panel Display:
- [ ] Crew health roster (all crew conditions)
- [ ] Treatment queue
- [ ] Medical supplies inventory
- [ ] Sickbay capacity
- [ ] Casualties log
- [ ] Drug effects timers

---

### ROLE 9: Marine
**Current:** Basic placeholder
**Priority:** MEDIUM (boarding/security)

#### Actions to Implement:
- [ ] **Security Patrol** - Internal ship security
- [ ] **Boarding Prep** - Ready team for boarding action
- [ ] **Board Target** - Execute boarding action
- [ ] **Repel Boarders** - Defend against enemy boarding
- [ ] **Guard Prisoner** - Secure captured personnel
- [ ] **Breach Door** - Force entry to compartment
- [ ] **Arm/Disarm** - Weapon readiness
- [ ] **Tactical Assessment** - Evaluate boarding risks

#### Panel Display:
- [ ] Marine team roster with loadout
- [ ] Ship deck plan (compartment status)
- [ ] Boarding status (if in progress)
- [ ] Armory inventory
- [ ] Intruder alerts
- [ ] Combat log

---

### ROLE 10: Steward
**Current:** Basic placeholder
**Priority:** LOW (non-combat support)

#### Actions to Implement:
- [ ] **Serve Passengers** - Maintain passenger satisfaction
- [ ] **Prepare Meal** - Crew/passenger meals
- [ ] **Inventory Check** - Track supplies
- [ ] **Passenger Manifest** - Who's aboard
- [ ] **Entertainment** - Passenger activities
- [ ] **Cargo Check** - Verify cargo status
- [ ] **Resupply Request** - Request supplies at port
- [ ] **Morale Report** - Crew morale status

#### Panel Display:
- [ ] Passenger list with satisfaction
- [ ] Supplies inventory (food, consumables)
- [ ] Cargo manifest
- [ ] Life support status
- [ ] Morale indicator
- [ ] Event log (meals served, issues)

---

### ROLE 11: Observer
**Current:** ASCII art view, read-only access
**Priority:** COMPLETE (already implemented)

#### Features (Implemented):
- [x] Read-only view of bridge activity
- [x] Ship ASCII art display
- [x] Can view but not interact
- [x] Multiple observers allowed
- [x] No skill requirements

---

## Role Implementation Priority

| Priority | Roles | Rationale |
|----------|-------|-----------|
| P0 | Captain, Pilot, Gunner | Core combat loop |
| P1 | Engineer, Sensors, Astrogator | Combat support + travel |
| P2 | Medic, Marine, Comms | Extended gameplay |
| P3 | Steward | Roleplay/flavor |

---

## Cross-Role Interactions

These interactions make multiplayer engaging:

- [ ] **Captain → Crew** - Orders appear in crew panels, require acknowledgment
- [ ] **Sensors → Gunner** - Sensor locks enable targeting
- [ ] **Sensors → Captain** - Contact reports to command
- [ ] **Engineer → All** - Power allocation affects all systems
- [ ] **Pilot → Gunner** - Maneuvers affect fire arcs
- [ ] **Medic → Captain** - Crew fitness reports
- [ ] **Marine → Captain** - Security status reports
- [ ] **Comms → All** - Message routing between roles
- [ ] **Astrogator → Pilot** - Jump coordinates handoff
