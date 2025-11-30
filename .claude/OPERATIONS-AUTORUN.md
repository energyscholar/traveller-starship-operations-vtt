# Operations VTT Autorun Script

**Created:** 2025-11-30
**Mode:** Autonomous execution with bypass permissions
**Scope:** Complete Phase 1 + Begin Phase 2 of Operations-First VTT
**Estimated Time:** 8-12 hours of autonomous work
**Goal:** Complete MVP foundation for starship operations tool

---

## What's Already Done (This Session)

### Completed ✅
1. **Database Setup** - `lib/operations/database.js`
   - SQLite with better-sqlite3
   - Schema: campaigns, player_accounts, ships, npc_crew, session_state, ship_log
   - Indexes for common queries

2. **Account Management** - `lib/operations/accounts.js`
   - Campaign CRUD
   - Player slot management
   - Character import (minimal format)
   - Role assignment
   - Role availability checking

3. **Campaign State** - `lib/operations/campaign.js`
   - Ship management
   - NPC crew management
   - Session state persistence
   - Ship log entries

4. **Module Index** - `lib/operations/index.js`
   - Exports all operations functions
   - ROLE_VIEWS configuration
   - ALERT_STATUS constants

5. **Operations UI** - `public/operations/`
   - `index.html` - Full page structure (login, GM setup, player setup, bridge)
   - `styles.css` - Complete sci-fi themed styling
   - `app.js` - Client-side app with socket events (NEEDS SERVER HANDLERS)

---

## Phase 1 Remaining: Server Integration

### Task 1.1: Add Operations Socket Handlers (2-3 hours)
**Priority:** CRITICAL
**Risk:** LOW (extending existing patterns)

Add socket.io handlers for operations events in `server.js`:

**Campaign Events:**
- `ops:getCampaigns` → Return all campaigns
- `ops:createCampaign` → Create new campaign
- `ops:selectCampaign` → Load campaign data for GM
- `ops:updateCampaign` → Update campaign settings
- `ops:deleteCampaign` → Delete campaign

**Player Events:**
- `ops:joinCampaignAsPlayer` → Player joins by campaign ID
- `ops:selectPlayerSlot` → Player chooses their slot
- `ops:createPlayerSlot` → GM creates new player slot
- `ops:deletePlayerSlot` → GM deletes player slot
- `ops:importCharacter` → Player imports character data
- `ops:selectShip` → Player selects ship
- `ops:assignRole` → Player selects crew role

**Bridge Events:**
- `ops:joinBridge` → Player joins bridge view
- `ops:startSession` → GM starts session
- `ops:addLogEntry` → Add ship log entry
- `ops:advanceTime` → GM advances game time

**Commits:**
1. "feat: Add campaign socket handlers for operations"
2. "feat: Add player account socket handlers"
3. "feat: Add bridge session socket handlers"

---

### Task 1.2: Test Login Flow (1 hour)
**Priority:** HIGH
**Risk:** LOW (integration testing)

Test the full login flow:
- GM creates campaign
- GM adds player slots
- Player joins campaign
- Player selects slot
- Player imports character
- Player selects ship and role
- Player joins bridge

**Output:** Document any bugs found and fix

---

### Task 1.3: Add Ship Templates to Database (1 hour)
**Priority:** HIGH
**Risk:** LOW (data migration)

Load existing ship templates into operations database:
- Import ships from `data/ships/v2/`
- Create default "party ship" for testing
- Add NPC crew defaults

**Commit:** "feat: Seed operations database with ship templates"

---

## Phase 2: Bridge View & Basic Operations

### Task 2.1: Render Bridge View (2 hours)
**Priority:** HIGH
**Risk:** LOW (UI rendering)

Implement bridge rendering:
- Ship status display
- Role-specific action panels
- Crew list with online status
- Empty sensor display (placeholder)
- Ship log with recent entries

**Commit:** "feat: Implement bridge view rendering"

---

### Task 2.2: Implement Time System (1 hour)
**Priority:** HIGH
**Risk:** LOW (simple state)

Add time management:
- Imperial date parsing/formatting
- GM time advance (hours, minutes)
- Broadcast time changes to all clients
- Auto-log time advances

**Commit:** "feat: Add imperial calendar time system"

---

### Task 2.3: Implement Alert Status (30 min)
**Priority:** MEDIUM
**Risk:** LOW (simple state)

Add alert system:
- Normal/Yellow/Red status
- Captain can change alert
- Visual feedback on bridge
- Log alert changes

**Commit:** "feat: Add ship alert status system"

---

### Task 2.4: Role Detail Panel Framework (1 hour)
**Priority:** MEDIUM
**Risk:** LOW (UI structure)

Create framework for role-specific detail views:
- Each role gets expandable detail panel
- Framework for role-specific data
- Placeholder content for each role
- Captain has overview access

**Commit:** "feat: Add role-specific detail panel framework"

---

## Phase 3: Sensor & Contact System (If Time Permits)

### Task 3.1: Contact Data Model (1 hour)
**Priority:** MEDIUM
**Risk:** LOW (data structure)

Create contact system in `lib/operations/contacts.js`:
- Contact data structure
- Detection/identification levels
- Range calculations (km to bands)
- Movement tracking

**Commit:** "feat: Add contact data model for sensors"

---

### Task 3.2: GM Contact Tools (1 hour)
**Priority:** MEDIUM
**Risk:** LOW (GM tooling)

Add GM ability to:
- Add contacts to scene
- Move contacts
- Remove contacts
- Set contact visibility

**Commit:** "feat: Add GM contact management tools"

---

### Task 3.3: Sensor Display (1 hour)
**Priority:** MEDIUM
**Risk:** LOW (UI component)

Render contacts in sensor panel:
- Contact list with icons
- Range and bearing display
- Unknown vs identified contacts
- Click to select contact

**Commit:** "feat: Implement sensor contact display"

---

## Final Verification

### Task F.1: Run Full Test Suite (15 min)
**Priority:** HIGH
**Risk:** LOW (verification)

Run all existing tests:
- `npm test` - All unit tests
- Verify no regressions to combat system
- Document any failures

---

### Task F.2: Manual Testing (30 min)
**Priority:** HIGH
**Risk:** LOW (QA)

Manual testing checklist:
- [ ] GM can create campaign
- [ ] GM can add player slots
- [ ] Player can join campaign
- [ ] Player can import character
- [ ] Player can select role
- [ ] Player can join bridge
- [ ] Bridge displays correctly
- [ ] GM can advance time
- [ ] Ship log works

---

### Task F.3: Create Completion Report (30 min)
**Priority:** HIGH
**Risk:** LOW (documentation)

Document completed work:
- Tasks completed
- Files created/modified
- Remaining work for Phase 2+
- Any issues encountered

**Output:** `.claude/OPERATIONS-AUTORUN-COMPLETION.md`

---

## Execution Order

### Warmup (5 min)
Pre-autorun permission check per AUTORUN-INITIALIZATION-PATTERN.md

### Phase 1 Completion (4-5 hours)
1. Task 1.1 - Socket handlers (2-3 hours)
2. Task 1.2 - Test login flow (1 hour)
3. Task 1.3 - Ship templates (1 hour)

### Phase 2 Start (3-4 hours)
4. Task 2.1 - Bridge rendering (2 hours)
5. Task 2.2 - Time system (1 hour)
6. Task 2.3 - Alert status (30 min)
7. Task 2.4 - Role detail framework (1 hour)

### Phase 3 (If Time Permits) (3 hours)
8. Task 3.1 - Contact model (1 hour)
9. Task 3.2 - GM contact tools (1 hour)
10. Task 3.3 - Sensor display (1 hour)

### Final (1 hour)
11. Task F.1 - Test suite
12. Task F.2 - Manual testing
13. Task F.3 - Completion report

---

## Risk Assessment

### LOW RISK ✅
- All socket handler additions (patterns exist)
- Time system (simple state)
- Alert system (simple state)
- Contact model (data structure)
- UI rendering (already scaffolded)

### MEDIUM RISK ⚠️
- None identified - all work extends existing patterns

### MITIGATION
- Commit frequently (after each task)
- Run existing tests after server changes
- Use git tags at phase boundaries
- Keep old combat app functional throughout

---

## Success Criteria

At completion, we should have:

✅ **Phase 1 Complete:**
- Socket handlers for all operations events
- Login flow fully functional
- GM can manage campaigns and players
- Players can join and select roles

✅ **Phase 2 Started:**
- Bridge view renders correctly
- Time system working
- Alert status working
- Role panels have framework

✅ **Quality:**
- All existing tests still pass
- No regressions to combat system
- Code follows existing patterns
- Commits have proper format

---

## Files to Create/Modify

### Create
- (None - all UI files created this session)

### Modify
- `server.js` - Add ~200-300 LOC of socket handlers
- `lib/operations/index.js` - Possibly add new exports
- `public/operations/app.js` - Bug fixes as needed

### Reference (Read-Only)
- `lib/combat.js` - Existing patterns
- `data/ships/v2/*.json` - Ship templates to import

---

## Exclusions (Not For This Autorun)

❌ Combat mode integration (Phase 5)
❌ Full sensor mechanics (Phase 3)
❌ Communications system (Phase 6)
❌ Power/fuel simulation (Phase 7)
❌ TravellerMap integration (Phase 9)

---

**STATUS:** Ready to execute
**MODE:** Autonomous with bypass permissions
**NEXT:** Run pre-autorun permission check, then begin Task 1.1

**GO! 🚀**
