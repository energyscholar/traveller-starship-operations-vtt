# Bruce1Dorania Bridge Autorun

**Created:** 2025-11-30
**Target:** Live game in ~48 hours
**Status:** ACTIVE

---

## Prerequisites (COMPLETED)

- [x] Campaign seeded: Dorannia Escape (GM: Bruce)
- [x] Ship: Kimbly (Type S Scout) with NPC pilot Chance Dax
- [x] 5 Player slots: James, Von Sydo, Max, Marina, Asao
- [x] 3 Sensor contacts seeded
- [x] 4 Ship log entries seeded
- [x] Socket stability (5min timeout, heartbeat)
- [x] GM Login → Campaign Select → Ship Select → Start Session → Bridge

---

## PHASE 1: Bridge Data Display

**Goal:** Verify seeded data displays correctly on Bridge view

### Task 1.1: Contacts Display
- [ ] Verify contacts returned in `ops:bridgeJoined` response
- [ ] Check `renderContacts()` function renders 3 seeded contacts
- [ ] Display: name, type, bearing, range band, transponder
- [ ] GM notes visible only to GM

### Task 1.2: Ship Log Display
- [ ] Verify logs returned in `ops:bridgeJoined` response
- [ ] Check `renderShipLog()` function renders 4 seeded entries
- [ ] Display: game_date, entry_type, message, actor
- [ ] Most recent entries at top

### Task 1.3: Ship Status Panel
- [ ] Display ship name (Kimbly)
- [ ] Display current hull/max hull
- [ ] Display fuel status
- [ ] Display armor rating
- [ ] Display alert status (NORMAL)

### Task 1.4: Campaign Info
- [ ] Display campaign name
- [ ] Display current date (310-1115)
- [ ] Display current system (Dorannia)

**Acceptance:** All seeded data visible on Bridge screen

---

## PHASE 2: GM Controls

**Goal:** GM can manipulate game state from Bridge

### Task 2.1: Alert Status Control
- [ ] Add alert status buttons (NORMAL / YELLOW / RED)
- [ ] Wire `ops:setAlertStatus` event
- [ ] Visual feedback on bridge (background color change?)
- [ ] Broadcast to all connected players
- [ ] CSS for alert states (green/yellow/red theming)

### Task 2.2: Time Advancement
- [ ] Add "Advance Time" button/control
- [ ] Time increment options (1 hour, 4 hours, 1 day, 1 week)
- [ ] Wire `ops:advanceTime` event
- [ ] Update displayed date
- [ ] Auto-add log entry for time skip

### Task 2.3: Ship Log Entry
- [ ] Add "Add Log Entry" button/modal
- [ ] Entry type selector (status, captain, engineering, combat, arrival, jump)
- [ ] Message text input
- [ ] Wire `ops:addLogEntry` event
- [ ] Real-time update to log display

### Task 2.4: Contact Management
- [ ] Add "Add Contact" button/modal
- [ ] Contact form (name, type, bearing, range, transponder, signature)
- [ ] Wire `ops:addContact` event
- [ ] Edit existing contact (click to edit)
- [ ] Delete contact option
- [ ] GM notes field (GM-only visibility)

**Acceptance:** GM can set alerts, advance time, add logs, manage contacts

---

## PHASE 3: Player Flow

**Goal:** Players can join and see role-appropriate views

### Task 3.1: Player Login
- [ ] "Player Login" button on main screen
- [ ] Enter campaign code (short code from campaign ID)
- [ ] Wire `ops:joinCampaignAsPlayer` event
- [ ] Show available player slots

### Task 3.2: Slot Selection
- [ ] Display player slot list (James, Von Sydo, Max, Marina, Asao)
- [ ] Show which slots are taken (real-time)
- [ ] Select slot → wire `ops:selectPlayerSlot`
- [ ] Character data display after selection

### Task 3.3: Role Selection
- [ ] Display available roles for ship (pilot, sensors, engineer, gunner, marine, captain)
- [ ] Show which roles are taken
- [ ] Select role → wire `ops:assignRole`
- [ ] Multiple instances of same role (gunner 1, gunner 2)

### Task 3.4: Player Bridge View
- [ ] Join bridge as player
- [ ] Role-based view filtering (ROLE_VIEWS config)
- [ ] Sensors role: full contact details
- [ ] Engineer role: ship systems focus
- [ ] Captain role: overview + command options
- [ ] Limited controls vs GM (can't delete contacts, etc.)

### Task 3.5: Guest Mode
- [ ] "Join as Guest" option
- [ ] Enter name, select skill level
- [ ] Guest can observe without slot reservation
- [ ] Useful for temporary players or observers

**Acceptance:** 5 players can connect, select slots/roles, see appropriate bridge views

---

## PHASE 4: Nice-to-Have Features

**Goal:** Enhanced experience (implement if time permits)

### Task 4.1: Jump Planning Display
- [ ] Show jump route (Dorannia → Ator → Flammarion)
- [ ] Fuel requirements per jump
- [ ] Estimated travel time
- [ ] Current position indicator
- [ ] Link to TravellerMap for system data

### Task 4.2: Contact Detail Modal
- [ ] Click contact for full details
- [ ] Ship silhouette/type image
- [ ] Threat assessment
- [ ] Historical interactions
- [ ] GM can add private notes

### Task 4.3: Crew Status Indicators
- [ ] Show who's online in each role
- [ ] Activity indicators (idle, active)
- [ ] Role handoff capability
- [ ] NPC crew display (Chance Dax as pilot)

### Task 4.4: Communication Panel
- [ ] Hail contact action
- [ ] Broadcast to all contacts
- [ ] Receive messages (GM-initiated)
- [ ] Message log

### Task 4.5: Ship Systems Detail
- [ ] Jump drive status
- [ ] Weapon status (pulse laser)
- [ ] Damage tracking per system
- [ ] Repair actions

**Acceptance:** Enhanced gameplay features working

---

## Risk Mitigation

### High Risk Items
1. **Socket disconnects during session** - MITIGATED (5min timeout, heartbeat)
2. **Multiple players cause race conditions** - Test with 2+ browsers
3. **Bridge view doesn't load data** - Verify Phase 1 completely

### Fallback Plan
If VTT has issues during live game:
- GM can describe sensor contacts verbally
- Use Roll20 for maps/visuals
- VTT as supplementary, not critical path

### Testing Checklist
- [ ] Test full GM flow (login → bridge → controls)
- [ ] Test with 2 browser tabs (GM + 1 player)
- [ ] Test with 3+ browser tabs (multi-player)
- [ ] Test disconnect/reconnect behavior
- [ ] Test on mobile browser (basic display)

---

## Implementation Order

**Priority 1 (Must Have for Game):**
- Phase 1: All tasks (data display)
- Phase 2: Tasks 2.1-2.3 (alerts, time, logs)

**Priority 2 (Should Have):**
- Phase 2: Task 2.4 (contact management)
- Phase 3: Tasks 3.1-3.4 (player flow)

**Priority 3 (Nice to Have):**
- Phase 3: Task 3.5 (guest mode)
- Phase 4: All tasks

---

## Design Patterns Used

| Pattern | Application | Files |
|---------|-------------|-------|
| MVC | Socket handlers / DB / UI separation | operations.handlers.js, database.js, app.js |
| Observer | Socket events (ops:*) | Real-time updates to all clients |
| State | opsSession tracking | Per-socket session state |
| Repository | Operations module | lib/operations/*.js |

---

## Session Notes

### Pre-Session Checklist
- [ ] Run seed script to ensure data exists
- [ ] Test GM flow end-to-end
- [ ] Test with multiple browser tabs
- [ ] Note campaign code for players
- [ ] Have backup plan ready

### Post-Session Feedback
_(To be filled after live game)_

- What worked:
- What didn't:
- Player feedback:
- Technical issues:
- Feature requests:

---

## Quick Reference

**Server:** `node server.js`
**URL:** http://localhost:3000/operations/
**Campaign:** Dorannia Escape
**GM:** Bruce
**Ship:** Kimbly (Type S Scout)
**Date:** 310-1115
**Location:** Dorannia System

**Player Slots:**
| Slot | Role | Character |
|------|------|-----------|
| James | Captain | Imperial Admiral (secret) |
| Von Sydo | Sensors | Illegal psion (secret) |
| Max | Engineer | Mad scientist |
| Marina | Gunner | Social specialist |
| Asao | Marine | Hairless Aslan (wanted) |

**NPC:** Chance Dax (Pilot, skill 2)

**Seeded Contacts:**
1. FAR HORIZONS - Free Trader (departing)
2. DORANNIA PATROL 7 - System Defense Boat
3. STELLAR WIND - Far Trader (arriving)
