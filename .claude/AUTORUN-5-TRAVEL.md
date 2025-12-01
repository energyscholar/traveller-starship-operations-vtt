# Autorun 5: Interstellar Travel - Dorannia to Flammarion

**Created:** 2025-12-01
**Target:** Game session (tomorrow)
**Focus:** Enable full interstellar travel with crew role engagement

---

## Primary Use Case: Travel from Dorannia to Flammarion

**Route:** Dorannia (0530) → Ator (0729) → Flammarion (0930)
**Jump Distance:** 2 parsecs per leg (Jump-2 capable ship)
**Total Time:** ~14 days in-game (168 hours per jump × 2)

### Narrative Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  DORANNIA (Start)                                               │
│  ├── Astrogator: Plot course to Ator (J-2)                     │
│  ├── Engineer: Verify fuel (20 tons needed)                     │
│  ├── Pilot/Astrogator: Initiate jump                           │
│  └── GM: "Jump initiated" → 168 hours pass                     │
├─────────────────────────────────────────────────────────────────┤
│  IN JUMP SPACE (7 days)                                         │
│  ├── Display: Ship in jump, ETA countdown                       │
│  ├── GM: "Advance Time to Exit" button                          │
│  └── No contact with outside universe                           │
├─────────────────────────────────────────────────────────────────┤
│  ATOR SYSTEM (Arrival)                                          │
│  ├── Astrogator: Verify position → "Arrived at Ator"           │
│  ├── Sensor Op: Sweep system → Contacts populate                │
│  ├── Contacts: Stars, planet, gas giant, belt, downport        │
│  ├── Optional: Refuel at gas giant                              │
│  ├── Astrogator: Plot course to Flammarion (J-2)               │
│  └── Repeat jump sequence                                       │
├─────────────────────────────────────────────────────────────────┤
│  FLAMMARION (Destination)                                       │
│  ├── Astrogator: Verify position                                │
│  ├── Sensor Op: Full sweep                                      │
│  ├── Contacts: Excellent starport, Naval base, Scout base      │
│  └── Session continues with port activities                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design Principle: Player Value Added

**CRITICAL:** Players must feel their skill and decisions matter. Each role should provide unique value that automation cannot replace.

| Role | Player Value (NOT automatable) | Skill Impact |
|------|-------------------------------|--------------|
| **Astrogator** | Chooses route (safe vs fast vs fuel-efficient) | Higher skill = safer jumps, fuel savings |
| **Sensor Op** | Decides WHEN to go active (reveals position!) | Higher skill = more info per scan |
| **Engineer** | Prioritizes repairs, manages fuel strategy | Higher skill = faster repairs |
| **Pilot** | Chooses approach vector, docking style | Higher skill = smoother docking |
| **Gunner** | Target selection, weapon choice, timing | Higher skill = better hit chance |
| **Captain** | Authorization decisions, alert status | Leadership affects crew morale/checks |
| **Damage Control** | Triage decisions under pressure | Skill affects repair coordination |

**Anti-patterns to avoid:**
- ❌ "Click button, thing happens" with no decision
- ❌ Skill level invisible to player
- ❌ Automation that makes role feel pointless

**Patterns to embrace:**
- ✅ "Choose A or B, each has tradeoffs"
- ✅ Show skill modifier prominently: "Your Gunnery-2 gives +2 to hit"
- ✅ Let players feel clever: "Going active will reveal us, but I'll get more data"

---

## Role Entertainment Matrix

Each player should have something meaningful to do:

| Role | During Jump | At Arrival | Key Actions |
|------|-------------|------------|-------------|
| **Astrogator** | Monitor course | Verify position, plot next jump | `plotJump`, `verifyPosition` |
| **Sensor Op** | N/A (no sensors in jump) | Sweep system, identify contacts | `sensorScan`, `activeScan` |
| **Engineer** | Check fuel/systems | Monitor refueling | `getFuelStatus`, `checkSystems` |
| **Pilot** | N/A | Maneuver to destination | `setCourse` (future) |
| **Gunner** | N/A | Target practice on asteroid! | `fireAtContact` (NEW) |
| **Damage Control** | Check systems | Coordinate any repairs | `getSystemStatus` |
| **Captain** | Make decisions | Hail port, authorize weapons | `setAlertStatus`, existing |

---

## Required New Features (Autorun 5 Tasks)

### Phase 1: Jump Arrival with System Contacts (CRITICAL)
**LOC:** ~50 | **Risk:** LOW | **Priority:** P0

Currently, `completeJump` updates `current_system` but doesn't load new contacts.

**TODO-1:** Modify `ops:completeJump` handler to:
1. Check if destination has system data (Ator, Flammarion)
2. If yes, call `seedSystemContacts(campaignId, destination)`
3. Broadcast new contacts to all clients
4. Log: "Arrived at [destination]. Position verified."

**Files:** `lib/socket-handlers/operations.handlers.js` (lines 1311-1365)

### Phase 2: Astrogator Plot Course Action (HIGH)
**LOC:** ~80 | **Risk:** LOW | **Priority:** P1

Add `ops:plotJump` that returns jump info without initiating.

**TODO-2:** New socket handler `ops:plotJump`:
```javascript
// Input: { destination, distance }
// Output: {
//   canJump: bool,
//   fuelNeeded: number,
//   travelTime: "168 hours",
//   arrivalDate: string,
//   warnings: [] // unrefined fuel, j-drive damage, etc.
// }
```

**TODO-3:** Client-side Astrogator panel shows:
- Current system
- Jump plot form (destination dropdown, distance)
- Plot result display
- "Initiate Jump" button (after plotting)

**Files:**
- `lib/socket-handlers/operations.handlers.js` (~30 LOC)
- `public/operations/modules/role-panels.js` (~50 LOC)

### Phase 3: Sensor System Sweep (MEDIUM)
**LOC:** ~60 | **Risk:** LOW | **Priority:** P1

Current scan returns all contacts immediately. Add progressive reveal.

**TODO-4:** Enhance `ops:sensorScan` to:
- `passive`: Returns celestials + transponder-emitting contacts only
- `active`: Returns all contacts in current range band
- `deep`: Returns full details including GM notes (GM only)

**TODO-5:** Sensor panel shows sweep results with categories:
- Celestial objects (stars, planets)
- Stations (transponder detected)
- Ships (with transponder)
- Unknown contacts (signature only)

### Phase 4: Captain Weapons Authorization (CRITICAL FOR SAFETY)
**LOC:** ~60 | **Risk:** LOW | **Priority:** P1

Gunners CANNOT fire until Captain (or GM) authorizes weapons. This prevents reckless or friendly fire.

**TODO-6:** New handler `ops:authorizeWeapons`:
```javascript
// Input: { contactId, authorize: bool }
// Requirements:
//   - role === 'captain' or isGM
//   - contact.is_targetable === 1
// Effect:
//   - Sets contact.weapons_free = 1 (or 0)
//   - Logs: "Captain authorizes weapons on [target]"
//   - Broadcasts to bridge: gunner sees unlock
```

**TODO-7:** Captain panel shows:
- List of targetable contacts
- "Authorize Fire" / "Revoke" toggle per contact
- Current authorization status

### Phase 5: Gunner Target Practice (FUN)
**LOC:** ~100 | **Risk:** LOW | **Priority:** P2

Allow gunner to fire at AUTHORIZED targets in Operations mode (no combat needed).

**TODO-8:** New handler `ops:fireAtContact`:
```javascript
// Input: { contactId, weaponIndex }
// Requirements:
//   - role === 'gunner' or isGM
//   - contact.is_targetable === 1
//   - contact.weapons_free === 1  // MUST be authorized
// If NOT authorized:
//   - Error: "Weapons not authorized on this target"
//   - Log: "Gunner attempted unauthorized fire on [target]"
// If authorized:
//   - Roll attack (2d6 + gunnery skill)
//   - On hit: reduce contact.health
//   - If health <= 0: delete contact, log "destroyed"
//   - Broadcast damage/destruction to bridge
```

Asteroid already exists in Dorannia seed:
```javascript
{
  name: 'Asteroid DRN-4417',
  is_targetable: 1,
  weapons_free: 1,  // Pre-authorized for target practice
  health: 20,
  max_health: 20
}
```

**TODO-9:** Gunner panel shows:
- Weapons on ship (from ship_data.weapons)
- Targetable contacts with authorization status:
  - 🔒 LOCKED (red) - cannot fire
  - 🔓 AUTHORIZED (green) - can fire
- Fire button DISABLED when locked
- Fire button ENABLED only for authorized targets
- Result display (hit/miss/damage)

### Phase 6: System Arrival Content (IMMERSION)
**LOC:** ~100 | **Risk:** LOW | **Priority:** P1

When establishing data link at a system, players receive news and personal mail.

**TODO-10:** Update Dorannia seed log entries to be arrival-appropriate:
- "Data link established with Dorannia Starport One"
- "Downloading system news..."
- "You have mail."

**TODO-11:** Add news/mail content to seed data:

**Dorannia News (system-wide):**
```
- "ATOMIC DORANNIA WEEKLY: Ore shipments up 12% this quarter"
- "SECURITY ALERT: Unidentified ships reported near jump limit"
- "IMPERIAL NEWS: Tensions rise in Five Sisters subsector"
```

**Dorannia Personal Mail (one per PC):**
| PC | From | Subject | Content |
|----|------|---------|---------|
| James | Admiral Tanaka | "Checking in" | "Keep a low profile. Your old crew is asking questions." |
| Von Sydo | Kimbly (ship AI) | "Anomaly detected" | "Unusual energy signature at bearing 270. Investigate?" |
| Max | Dr. Harlow | "Research proposal" | "Those Chamax samples - I have a buyer. 50kCr." |
| Marina | Unknown | "We remember you" | "The Marquis of Glisten sends his regards. -M" |
| Asao | WANTED System | "Alert" | "Your likeness flagged at Dorannia customs. Exercise caution." |

**TODO-12:** Add Ator arrival content:

**Ator News:**
```
- "ATOR BEACON: Archaeological dig enters 3rd season"
- "DARRIAN PATROL: Increased presence following Sword World tensions"
- "GAS GIANT ADVISORY: Refueling ops normal at inner giant"
```

**Ator Personal Mail:**
| PC | From | Subject | Content |
|----|------|---------|---------|
| James | [Encrypted] | "Asset in place" | "Your contact at the dig site awaits. Codephrase: Stellar Wind" |
| Von Sydo | Pet Supply Depot | "Order shipped" | "Your Tenser Wolf nutrition packs en route to Flammarion" |
| Max | University of Regina | "Paper accepted!" | "Your submission on xenotech interfaces accepted for review" |
| Marina | Lord Harkon | "Opportunity" | "Heard you're in the area. Ator has... antiquities. Interested?" |
| Asao | Anonymous | "Run" | "Agent Thale traced you to Dorannia. She's 2 jumps behind." |

**TODO-13:** Create mail display in UI:
- Mail icon in header (with unread count)
- Simple mail viewer panel
- Mark as read functionality
- Store in player_accounts.preferences or new table

### Phase 7: GM Jump Time Controls (CONVENIENCE)
**LOC:** ~40 | **Risk:** LOW | **Priority:** P2

**TODO-14:** Add "Advance to Jump Exit" button for GM:
- Only visible when ship is in jump
- Advances time exactly to `jumpEndDate`
- Triggers jump completion automatically

**TODO-15:** Ship status shows jump countdown:
- "In Jump to [destination]"
- "ETA: [hours] hours" or "Ready to Exit"

---

## Existing Infrastructure (No Changes Needed)

| Feature | Status | Handler |
|---------|--------|---------|
| Jump initiation | ✅ Working | `ops:initiateJump` |
| Jump completion | ✅ Working | `ops:completeJump` |
| Jump status | ✅ Working | `ops:getJumpStatus` |
| Time advancement | ✅ Working | `ops:advanceTime` |
| Fuel status | ✅ Working | `ops:getFuelStatus` |
| Contact management | ✅ Working | `ops:getContacts`, `ops:addContact` |
| System damage | ✅ Working | `ops:getSystemStatus` |
| Ship log | ✅ Working | `ops:addLogEntry` |
| Alert status | ✅ Working | `ops:setAlertStatus` |

---

## System Data Already Exists

```
✅ Dorannia (0530) - seed-dorannia.js
   - Star (K4 V), Planet, Belt, Starport, 4 ships, 1 asteroid

✅ Ator (0729) - seed-systems.js
   - Binary stars (F7 V / M2 V), Planet, 2 Gas Giants, Belt, Downport

✅ Flammarion (0930) - seed-systems.js
   - Star (F8 V), Planet, Moon, Highport, Naval Base, Scout Base, Belt
```

---

## Detailed Risk & Metrics Table

| # | Task | LOC | Time | Risk | Complexity | Test Coverage | Dependencies |
|---|------|-----|------|------|------------|---------------|--------------|
| 1 | Jump arrival loads contacts | +30 | 30min | LOW | Simple | Existing tests | seed-systems.js |
| 2 | plotJump handler | +40 | 20min | LOW | Simple | Add unit test | jump.js exists |
| 3 | Astrogator panel UI | +60 | 40min | **MED** | UI work | Manual test | #2 |
| 4 | Enhanced sensor scan | +40 | 30min | LOW | Simple | Existing handler | None |
| 5 | Sensor panel UI updates | +50 | 30min | LOW | UI work | Manual test | #4 |
| 6 | authorizeWeapons handler | +35 | 30min | LOW | Simple | Add unit test | contacts.js |
| 7 | Captain weapons panel | +45 | 30min | LOW | UI work | Manual test | #6 |
| 8 | fireAtContact handler | +60 | 40min | **MED** | Dice/damage | Add unit test | #6 |
| 9 | Gunner panel UI | +55 | 40min | **MED** | UI + state | Manual test | #8 |
| 10 | Dorannia arrival content | +80 | 30min | LOW | Data only | Seed test | None |
| 11 | Ator arrival content | +60 | 20min | LOW | Data only | Seed test | #10 |
| 12 | Mail UI (icon, viewer) | +100 | 45min | **MED** | New feature | Manual test | #10 |
| 13 | GM jump time button | +25 | 20min | LOW | Simple | Manual test | None |
| 14 | Jump status display | +30 | 20min | LOW | Simple | Manual test | None |
| **TOTAL** | | **~710** | **~7h** | | | | |

### Risk Assessment (Post-Mitigation)

| Risk | Level | Description | Mitigation | Status |
|------|-------|-------------|------------|--------|
| UI breaks existing bridge | **MED** | New panels could break layout | Test after each panel add | ACCEPT |
| Mail storage bloat | LOW | Storing mail in preferences | Use simple JSON, prune old | MITIGATED |
| Contact loading race | LOW | Jump complete before contacts ready | Await seedSystemContacts | MITIGATED |
| Firing math wrong | **MED** | Dice rolling for damage | Copy 2d6 from combat.js rollDice() | MITIGATED |
| Jump arrival bugs | LOW | Already working, just adding contacts | Minimal change to handler | MITIGATED |
| Time estimate overrun | ~~MED~~ | 7 hours is ambitious | **6+ hours confirmed available** | MITIGATED |

### User Decisions (Risk Mitigation)

| Decision | Choice | Impact |
|----------|--------|--------|
| Mail System | **Full Mail UI** | +45min, enables player immersion |
| Attack Rolls | **Auto-roll in VTT** | Copy existing rollDice(), full automation |
| Time Budget | **6+ hours** | Full autorun scope confirmed |

### Priority Tiers (if time constrained)

**MUST HAVE (P0) - 2.5 hours:**
- #1 Jump arrival loads contacts (30min)
- #10 Dorannia content (30min)
- #11 Ator content (20min)
- #2 plotJump handler (20min)
- #3 Astrogator panel (40min)
- #13 GM jump time button (20min)

**SHOULD HAVE (P1) - 2.5 hours:**
- #6 authorizeWeapons (30min)
- #7 Captain panel (30min)
- #8 fireAtContact (40min)
- #9 Gunner panel (40min)

**NICE TO HAVE (P2) - 2 hours:**
- #4 Enhanced sensor scan (30min)
- #5 Sensor panel (30min)
- #12 Mail UI (45min)
- #14 Jump status display (20min)

---

## Testing Checklist

### Pre-Game Verification
- [ ] Reset Dorannia seed: `node lib/operations/seed-dorannia.js`
- [ ] Server running: `npm start`
- [ ] GM can select Dorannia campaign
- [ ] Players can join and pick roles
- [ ] All 5 players see bridge view

### Jump Travel Flow
- [ ] Astrogator can plot jump to Ator
- [ ] System shows fuel requirement (20 tons for J-2)
- [ ] Jump initiates, 168 hours advance
- [ ] GM can "Advance to Jump Exit"
- [ ] Jump completes, contacts update to Ator system
- [ ] Sensor Op can sweep to see new contacts
- [ ] Second jump to Flammarion works

### Weapons Authorization Flow
- [ ] Captain sees targetable contacts in panel
- [ ] Captain can authorize weapons on asteroid
- [ ] Gunner sees authorization status change (🔒 → 🔓)
- [ ] Gunner CANNOT fire at unauthorized targets
- [ ] Gunner CAN fire at authorized targets
- [ ] Fire button disabled/enabled based on authorization

### Target Practice
- [ ] Gunner sees Asteroid DRN-4417 as targetable
- [ ] Asteroid is pre-authorized (weapons_free=1)
- [ ] Can fire weapon at asteroid
- [ ] Hit/miss rolls work (2d6 + skill)
- [ ] Asteroid takes damage on hit
- [ ] Asteroid destruction logged when health=0

### News & Mail System
- [ ] Dorannia data link log entries appear on arrival
- [ ] System news displays (3 headlines)
- [ ] Each PC receives personal mail at Dorannia
- [ ] Mail icon shows unread count
- [ ] Can view mail in mail panel
- [ ] At Ator: new system news + new personal mail

---

## Files to Modify

```
lib/socket-handlers/operations.handlers.js   +150 LOC
lib/operations/seed-systems.js               (expose seedSystemContacts)
public/operations/modules/role-panels.js     +100 LOC
public/operations/app.js                     +50 LOC (event handlers)
```

---

## Rollback Plan

If anything breaks during autorun:
1. `git stash` current changes
2. Run existing combat demo for testing
3. Resume operations work post-game

---

## Non-Goals (Deferred)

- Combat mode transition (not needed for travel)
- Detailed pilot maneuver controls
- Environmental hazards
- Cargo/passenger management
- Real sensor skill checks (DMs, stealth)

---

## Future TODOs (Post-Autorun 5)

### TODO: Full Role Agency System
Every role should have interesting & fun things to do - some can be whimsical!

| Role | Fun Tasks | Agency Examples |
|------|-----------|-----------------|
| **Steward** | Mollify annoyed crew, social tricks for crowding, enhance training | "+10% training efficacy this week" |
| **Medic** | Crew checkups, pharmaceutical buffs, identify alien diseases | "Stim pack gives +1 to next check" |
| **Marines** | Security drills, boarding prep games, prisoner interrogation RP | "Drill complete: +1 boarding next combat" |
| **Cargo Master** | Optimize storage tetris, discover contraband, black market finds | "Found hidden compartment!" |
| **Engineer** | Jury-rig improvements, overclock systems, maintenance minigames | "Tweaked M-drive: +1 thrust for 1 hour" |

### TODO: Training System (Advanced Feature)
**Trigger:** Jump space (168 hours = training opportunity)

**Components:**
1. **Training Time Tracker** per PC
   - Hours spent training (auto-increments in jump)
   - Current training focus (skill being improved)
   - Progress bar to next level

2. **Training Interface**
   - Select skill to train
   - Show time required (weeks × current level)
   - Roll dice when complete (INT + current level vs target)
   - Track partial progress

3. **Steward Enhancement**
   - Steward can provide training bonuses
   - "+10% training efficacy" for duration
   - Social support reduces time penalties

4. **Integration Points**
   - `ops:startTraining { skill, pcId }`
   - `ops:checkTrainingProgress`
   - Auto-advance on time skip
   - Celebration on skill increase!

**Not in Autorun 5** - too complex, needs dedicated autorun

---

## Post-Autorun: Deploy to FARMLAPTOP

After autorun completes, deploy to existing server at `192.168.1.125`:

```bash
# Find and replace existing deployment
ssh 192.168.1.125 "cd ~/traveller-combat-vtt && git pull && npm install && pm2 restart vtt"
# Or if no pm2:
ssh 192.168.1.125 "cd ~/traveller-combat-vtt && git pull && npm install"
```

**Note:** Verify deployment location on FARMLAPTOP before push.

---

**Status:** PLANNING COMPLETE
**Ready for:** GO AUTORUN

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
