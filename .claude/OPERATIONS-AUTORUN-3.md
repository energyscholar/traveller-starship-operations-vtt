# Operations VTT Autorun 3

**Created:** 2025-12-01
**Mode:** Autonomous execution
**Scope:** Code Quality + TravellerMap + Gameplay Features
**Goal:** Fix file size, complete features, add TravellerMap, time/jump mechanics

---

## Stage 0: Scaffolding Tests (RISK MITIGATION)

**Goal:** Create behavior tests BEFORE refactoring to catch regressions

**Tasks:**
1. Create `tests/operations/app-scaffold.test.js`
2. Test: Login screen renders with GM/Player buttons
3. Test: Socket connects and state initializes
4. Test: showScreen() switches between screens
5. Test: renderCrewList() produces correct HTML
6. Test: formatRoleName() returns expected strings
7. Test: escapeHtml() sanitizes input
8. Test: UWP decoder produces correct output
9. Run scaffold tests - all must pass before Stage 1

**Files:** `tests/operations/app-scaffold.test.js` (NEW)

**Acceptance:** All scaffold tests pass

---

## Stage 1: Refactor app.js (CRITICAL)

**Issue:** app.js at 36,684 tokens breaks Read tool (max 25,000)

**Tasks:**
1. Extract ASCII art data to `public/operations/modules/ascii-art.js`
2. Extract UWP decoder to `public/operations/modules/uwp-decoder.js`
3. Extract tooltip handlers to `public/operations/modules/tooltips.js`
4. Extract role panels to `public/operations/modules/role-panels.js`
5. Extract utility functions to `public/operations/modules/utils.js`
6. Keep core state/socket/screen logic in `app.js`
7. Update `index.html` with ES6 module imports
8. Run scaffold tests after each extraction

**Files:** `app.js` → 6 module files in `modules/` folder

**Target:** Reduce `app.js` to <15,000 tokens
**Acceptance:** All scaffold tests still pass

---

## Stage 2: Quirk/Role Title UI

**Issue:** DB columns exist from Autorun 2 but no edit UI

**Tasks:**
1. Add "Edit Quirk" button to role panel header
2. Create quirk editor modal (icon picker, text input)
3. Socket handler `ops:updateQuirk`
4. Add "Edit Title" inline for custom role name
5. Socket handler `ops:updateRoleTitle`
6. Display quirk/title in crew list and role panel

**Files:** `app.js`, `operations.handlers.js`, `styles.css`

---

## Stage 3: Time Management

**Goal:** GM can advance game time, players see updates

**Tasks:**
1. Add time display in bridge header (current_date)
2. Add "Advance Time" button for GM
3. Create time advance modal (hours/days/weeks)
4. Socket handler `ops:advanceTime`
5. Auto-log time advance to ship log
6. Broadcast time update to all clients

**Files:** `app.js`, `operations.handlers.js`, `campaign.js`

---

## Stage 4: TravellerMap Proxy API

**Goal:** Server endpoints to proxy TravellerMap (avoid CORS)

**Tasks:**
1. Create `lib/travellermap.js` with fetch helpers
2. Add `/api/travellermap/world` endpoint
3. Add `/api/travellermap/jumpworlds` endpoint
4. Add `/api/travellermap/search` endpoint
5. Add `/api/travellermap/jumpmap` (image proxy)
6. Create `travellermap_cache` SQLite table
7. Cache responses with 24hr TTL

**Files:** `lib/travellermap.js` (NEW), `server.js`, `database.js`

---

## Stage 5: TravellerMap System Lookup

**Goal:** GM can set location via TravellerMap data

**Tasks:**
1. Add "Lookup System" button in GM campaign panel
2. Create system search modal with search box
3. Display results: Name, UWP, Sector/Hex
4. Socket handler `ops:setSystemFromTravellerMap`
5. Auto-populate contacts from TravellerMap data
6. Update campaign current_system

**Files:** `app.js`, `operations.handlers.js`, `styles.css`

---

## Stage 6: Astrogator Jump Map

**Goal:** Visual jump destination picker

**Tasks:**
1. Embed TravellerMap jump map image in astrogator panel
2. Style selector: `terminal` (default), `poster`, `candy`
3. Fetch jump destinations list via API
4. Display destination table with UWP, distance
5. Click destination → set as jump target
6. Refresh map when ship location changes

**Files:** `app.js`, `styles.css`

---

## Stage 7: Jump Execution

**Goal:** Actually perform jump travel

**Tasks:**
1. Add "Execute Jump" button in astrogator panel (when plot ready)
2. Validate fuel availability
3. Socket handler `ops:executeJump`
4. Consume fuel from ship state
5. Update campaign current_system to destination
6. Advance game time by jump duration (1 week per parsec)
7. Clear astrogation data, log jump
8. Trigger TravellerMap lookup for new system contacts

**Files:** `app.js`, `operations.handlers.js`, `campaign.js`

---

## Stage 8: PUP-A3 Integration Tests

**Goal:** Use multi-client harness for real tests

**Tasks:**
1. Write test: GM creates campaign, player joins
2. Write test: Multiple players see crew updates
3. Write test: Contact changes sync to all clients
4. Write test: Alert status propagates
5. Write test: Time advance syncs to all clients
6. Add to npm test script

**Files:** `tests/e2e/operations-integration.test.js` (NEW)

---

## Execution Order

```
Stage 0 → Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5 → Stage 6 → Stage 7 → Stage 8
   ↓         ↓
Scaffold   Refactor
 Tests     (run tests
           after each
           extraction)
```

1. **Stage 0** - Scaffold tests (safety net)
2. **Stage 1** - Refactor app.js (blocker, tests verify)
3. **Stage 2** - Quirk/Title UI (quick win)
4. **Stage 3** - Time Management (GM workflow)
5. **Stage 4** - TravellerMap proxy (foundation)
6. **Stage 5** - System lookup (GM workflow)
7. **Stage 6** - Jump map (player workflow)
8. **Stage 7** - Jump execution (gameplay)
9. **Stage 8** - Integration tests (quality gate)

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Refactor breaks functionality | HIGH | MEDIUM | **Stage 0 scaffold tests** |
| ES6 module load order | MEDIUM | MEDIUM | Test each extraction |
| TravellerMap API changes | LOW | LOW | Cache responses, fallback |
| TravellerMap rate limiting | MEDIUM | LOW | SQLite cache, 24hr TTL |
| Jump mechanics balance | LOW | LOW | Simple 1 week/parsec rule |

---

## Mitigation Decisions (RESOLVED)

1. **Module system:** ES6 imports (`type="module"`)
2. **Cache storage:** SQLite table for persistence
3. **TravellerMap attribution:** Link in footer
4. **Refactor safety:** Scaffold tests before, run after each step

---

## Success Criteria

- [ ] Scaffold tests created and passing
- [ ] app.js < 15,000 tokens
- [ ] All scaffold tests still pass after refactor
- [ ] Quirks/titles editable and visible
- [ ] GM can advance game time
- [ ] TravellerMap API proxy working
- [ ] GM can lookup any Traveller world
- [ ] Astrogator sees jump map with destinations
- [ ] Jump execution consumes fuel, changes system
- [ ] 6+ integration tests passing
- [ ] All 308+ existing tests still pass

---

## Deferred

- Full Spinward Marches sector database
- Trade route calculations
- Historical milieux support
- Combat system integration
- Cargo management UI
- Contact filtering

---

**STATUS:** Ready for execution
**ESTIMATED SIZE:** 9 stages, medium-high complexity
**NEW FEATURES:** Time Management, Jump Execution
