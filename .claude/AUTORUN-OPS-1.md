# AUTORUN-OPS-1: MVC Refactor + Bridge View

**Created:** 2025-11-30
**Scope:** Refactor server.js to MVC pattern, then render bridge view
**Estimated Time:** 4-5 hours autonomous work
**Risk Level:** LOW (with TDD approach and branch strategy)

---

## Phase 0: Permission Warmup (REQUIRED - User Present)

Before going AFK, execute each of these to grant permissions:

```bash
# 1. File creation permission
touch lib/socket-handlers/test-permission.js && rm lib/socket-handlers/test-permission.js

# 2. File edit permission (server.js)
head -1 server.js

# 3. Run tests permission
npm test

# 4. Git operations permission
git status && git checkout -b test-branch && git checkout main && git branch -d test-branch

# 5. Directory creation permission
mkdir -p lib/socket-handlers

# 6. Read operations data files
ls data/ships/v2/

# 7. Create test file permission
touch tests/operations-handlers.test.js && rm tests/operations-handlers.test.js
```

**User confirms all 7 operations succeeded, then says "GO" to start autorun.**

---

## Stage 1: MVC Refactor (TDD Approach)

### Task 0a: Write Operations Handler Tests (30 min)
Create `tests/operations-handlers.test.js` with fast smoke tests:
- ops:getCampaigns returns array
- ops:createCampaign creates and returns campaign
- ops:selectCampaign returns full campaign data
- ops:createPlayerSlot creates slot
- ops:joinCampaignAsPlayer returns campaign + slots
- ops:selectPlayerSlot returns player data
- ops:selectShip returns ship + crew
- ops:assignRole assigns and broadcasts
- ops:joinBridge returns bridge state
- ops:addLogEntry creates log entry
- ops:setAlertStatus changes status

**Target:** 15-20 fast tests

### Task 0b: Run Tests, Establish Baseline (5 min)
- Run `npm test`
- All tests pass (308 existing + ~18 new = ~326)
- Baseline established

**Commit:** "test: Add operations handler smoke tests"

---

### Task 1a: Create Branch, Inventory Handlers (5 min)
```bash
git checkout -b refactor/mvc-socket-handlers
grep -n "socket.on(" server.js > /tmp/handler-inventory.txt
```
- Count all handlers
- Document what moves where

### Task 1b: Create Handler File Structure (5 min)
- Create `lib/socket-handlers/index.js`
- Create `lib/socket-handlers/combat.handlers.js` (empty)
- Create `lib/socket-handlers/operations.handlers.js` (empty)

### Task 1c: Extract Operations Handlers + Test (30 min)
- Move all `socket.on('ops:...')` to operations.handlers.js
- Keep state in server.js, pass to handlers
- Run `npm test` - all pass

**Commit:** "refactor: Extract operations handlers"

### Task 1d: Extract Combat Handlers + Test (45 min)
- Move all `socket.on('space:...')` to combat.handlers.js
- Move all `socket.on('combat...')` handlers
- Move AI logic (makeAIDecision, executeAITurn)
- Keep shared state in server.js
- Run `npm test` - all pass

**Commit:** "refactor: Extract combat handlers"

### Task 1e: Slim Server.js + Test (30 min)
- Remove extracted code from server.js
- Import and register handlers
- Target: ~300 LOC
- Run `npm test` - all pass
- Smoke test both `/` and `/operations/`

**Commit:** "refactor: Slim server.js to wiring only"

### Task 1f: Merge to Main (5 min)
```bash
git checkout main
git merge refactor/mvc-socket-handlers
git branch -d refactor/mvc-socket-handlers
```

---

## Stage 2: Bridge View Rendering

### Task 2.1: Ship Status Display
- Ship name, hull points, fuel level
- Current system and date display
- Power plant status

### Task 2.2: Role Panel Rendering
- Load role config from ROLE_VIEWS
- Render action buttons for current role
- Expandable detail panel (placeholder content)

### Task 2.3: Crew List
- Show online players with roles
- Show NPC crew for unfilled roles
- Online/offline indicators

### Task 2.4: Ship Log Display
- Render recent log entries
- Entry type styling (event, time, alert, note)
- Auto-scroll to newest

### Task 2.5: Alert Status Styling
- Green/Yellow/Red visual states
- Animated indicator for Yellow/Red
- Status text display

### Task 2.6: Run Tests + Verify
- Run `npm test` - all pass
- Manual smoke test bridge view

**Commit:** "feat: Implement bridge view rendering"

---

## Final Verification

### Checklist
- [ ] server.js reduced to ~300 LOC
- [ ] All ~326 tests pass
- [ ] Server starts without errors
- [ ] Combat UI loads at `/`
- [ ] Operations UI loads at `/operations/`
- [ ] GM can create campaign
- [ ] Player can join campaign
- [ ] Bridge renders correctly

### Update Completion Report
- Create AUTORUN-OPS-1-COMPLETION.md

---

## Success Criteria

✅ Operations handler tests written (15-20 tests)
✅ server.js reduced to ~300 LOC
✅ Socket handlers in separate files
✅ All tests pass (~326)
✅ Bridge view renders with all panels
✅ No regressions to combat system

---

## Files to Create

- `tests/operations-handlers.test.js` (NEW - tests first!)
- `lib/socket-handlers/index.js`
- `lib/socket-handlers/combat.handlers.js`
- `lib/socket-handlers/operations.handlers.js`

## Files to Modify

- `server.js` (reduce from ~2700 to ~300 LOC)
- `public/operations/app.js` (bridge rendering improvements)

---

## Rollback Plan

Branch strategy provides easy rollback:
```bash
# If on feature branch and things break:
git checkout main

# If already merged and need to revert:
git revert HEAD
```

---

**STATUS:** Ready for Permission Warmup
**NEXT:** User runs Phase 0 commands, then says "GO"
