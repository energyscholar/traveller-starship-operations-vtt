# Technical Debt Tracker

**Last Updated:** 2025-11-09
**Current Stage:** 10 Complete (Ready for Stage 11)

---

## Documentation TODOs

### HIGH PRIORITY
- **Extract and Summarize High Guard Rules**
  - **Purpose:** Create comprehensive reference for advanced ship design and combat
  - **Location:** Save to `.claude/MONGOOSE-TRAVELLER-HIGH-GUARD.md`
  - **Scope:** Ship construction, advanced weapons, capital ship combat
  - **Effort:** 2-3 hours
  - **Priority:** Before implementing advanced ship features in Stage 13+

---

## Active Technical Debt

### HIGH PRIORITY (Address before Stage 13)

#### 0. **Multiple Shots Per Round - Rules Violation**
- **Location:** Server-side combat resolution (likely `server.js` space:fire handler)
- **Issue:** Players can fire multiple times in a single round, violating Traveller rules
- **Impact:** HIGH - Game-breaking rules violation
- **Traveller Rule:** "Each turret or bay may only fire once per round"
- **Observed Behavior:** Players consistently fire 2x per round (e.g., Round 6: fires at :55 and :56, Round 7: fires at :01 and :02)
- **Pattern:** Appears to happen when a new round starts - player can fire immediately after round start without waiting for opponent
- **Resolution Plan:**
  - Stage 11: Add per-turret fire tracking (firedThisRound flag)
  - Reset flags when new round starts
  - Block fire events if turret already fired this round
  - Add server-side validation
- **Effort:** 3 hours (tracking system + validation + tests)

#### 1. **Deprecated SPACE_SHIPS Constant**
- **Location:** `lib/combat.js:530-593`
- **Issue:** Hardcoded ship definitions still present for backward compatibility
- **Impact:** MEDIUM - Redundant code, confusion for new developers
- **Resolution Plan:**
  - Stage 8.2-8.8: Keep for backward compatibility
  - Stage 9: Migrate all references to ShipRegistry
  - Stage 10: Remove constant, break backward compatibility
- **Effort:** 2 hours (find & replace + test)

#### 2. **No Unicode Support in Ship Names**
- **Location:** `lib/combat.js:validateShipName()` (line 493-511)
- **Issue:** Alphanumeric filter strips all non-ASCII characters
- **Impact:** MEDIUM - International players cannot use native language names
- **Example:** "Звезда" (Russian for "Star") becomes empty string
- **Resolution Plan:**
  - Stage 13: Add Unicode whitelist (letters, numbers, spaces)
  - Use Unicode categories: `\p{L}\p{N}\s` with 'u' flag
  - Keep XSS protection while allowing international chars
- **Effort:** 4 hours (regex update + comprehensive testing)

#### 3. **Simple JSON Validation (No Library)**
- **Location:** `tools/validate-json.js`
- **Issue:** Hand-rolled validator instead of ajv or similar
- **Impact:** LOW - Works fine, but limited features
- **Benefits of Library:**
  - More robust error messages
  - Better performance
  - Standard JSON Schema $ref support
  - Automatic type coercion
- **Resolution Plan:**
  - Stage 13: Evaluate ajv for production
  - Keep simple validator for dev/testing
  - Add ajv as devDependency if needed
- **Effort:** 6 hours (integration + migration)

### MEDIUM PRIORITY (Nice to have)

#### 3A. **Combat Log Display Order**
- **Location:** `public/app.js` combat log rendering
- **Issue:** Combat log shows oldest entries at top, newest at bottom (should be reversed)
- **Impact:** MEDIUM - Poor UX, users must scroll down to see latest events
- **Expected Behavior:** Most recent combat messages should appear at top
- **Resolution Plan:**
  - Stage 11: Reverse the order of log entries before rendering
  - Or use CSS flexbox `flex-direction: column-reverse`
  - Verify existing log entries aren't already handled elsewhere
- **Effort:** 1 hour (CSS change or array reverse + testing)

#### 3B. **Combat Log Formatting Bug**
- **Location:** `public/app.js` or server-side combat message formatting
- **Issue:** Damage messages show "[object Object]" instead of roll details
- **Example:** "IT! 1 damage dealt (Roll: [object Object], Total: undefined)"
- **Impact:** MEDIUM - Confusing to players, debugging info not useful
- **Expected:** "HIT! 1 damage dealt (Roll: [3,4]=7, Total: 7)"
- **Resolution Plan:**
  - Stage 11: Fix roll object serialization in combat messages
  - Properly format dice array and total
  - Add tests for message formatting
- **Effort:** 2 hours (find formatting code + fix + test)

#### 4. **No Ship Data Versioning/Migration**
- **Location:** `data/ships/*.json`
- **Issue:** No version field, no migration system
- **Impact:** LOW - Breaking changes require manual updates
- **Example:** If we rename `armour` → `armor`, all ships break
- **Resolution Plan:**
  - Stage 14: Add version field to ship schema
  - Create migration scripts (v1 → v2)
  - ShipRegistry auto-migrates on load
- **Effort:** 8 hours (migration system + tests)

#### 5. **Multiple Spaces Not Collapsed**
- **Location:** `lib/combat.js:validateShipName()`
- **Issue:** "Scout    Ship" stays as "Scout    Ship" (4 spaces preserved)
- **Impact:** LOW - Visual inconsistency in UI
- **Resolution Plan:**
  - Stage 13: Add `.replace(/\s+/g, ' ')` before trim
  - Test edge cases (tabs, newlines, etc.)
- **Effort:** 1 hour (one-liner + tests)

#### 6. **No Hot-Reload in Dev Mode**
- **Location:** `lib/ship-registry.js`
- **Issue:** JSON changes require server restart
- **Impact:** LOW - Developer UX issue only
- **Resolution Plan:**
  - Stage 15: Add fs.watch() to registry
  - Clear cache when files change
  - Optional feature (dev mode only)
- **Effort:** 3 hours (watch system + testing)

### LOW PRIORITY (Future optimization)

#### 7. **No Gzip Compression for JSON**
- **Location:** `data/ships/*.json`, `data/weapons/*.json`
- **Issue:** JSON files served uncompressed
- **Impact:** LOW - Only matters with 100+ ships
- **Stats:** 2 ships = 2KB, 100 ships ≈ 100KB
- **Resolution Plan:**
  - Stage 16: Enable gzip in Express
  - Pre-compress JSON files for production
- **Effort:** 2 hours (compression setup)

#### 8. **No Database for Large Ship Libraries**
- **Location:** `lib/ship-registry.js`
- **Issue:** Index search is O(n), no database indexes
- **Impact:** LOW - Fast enough for <1000 ships
- **Benchmark:** 100 ships = <1ms, 1000 ships ≈ 5-10ms
- **Resolution Plan:**
  - Stage 16+: Evaluate SQLite if needed
  - Add B-tree indexes for role/tonnage
  - Keep JSON as source of truth
- **Effort:** 16 hours (SQLite migration)

#### 9. **Crew Assignment Mismatch**
- **Location:** `lib/combat.js` (SPACE_SHIPS vs createStandardCrew)
- **Issue:** Ship has `crew: { pilot: null, gunners: [] }` but createStandardCrew returns array
- **Impact:** NONE - ShipRegistry fixes this with createShipInstance()
- **Resolution Plan:**
  - Stage 9: Remove SPACE_SHIPS constant
  - Only use ShipRegistry going forward
- **Effort:** 0 hours (resolved by deprecation)

---

## Technical Debt RESOLVED

### Stage 8.1A Improvements

#### ✅ 1. Ship Data Hardcoded in Source
- **Was:** `SPACE_SHIPS` constant in `lib/combat.js`
- **Now:** JSON files in `data/ships/*.json`
- **Benefit:** Easy to add new ships without editing code

#### ✅ 2. No Ship Search/Filter
- **Was:** Manual `Object.keys().find()` loops
- **Now:** Index-based search with `searchShips({ role, tonnage, name })`
- **Benefit:** Fast metadata queries without loading full ships

#### ✅ 3. No Data Validation
- **Was:** No validation, runtime errors possible
- **Now:** Automated validator runs on `npm test`
- **Benefit:** Catch errors before they reach production

#### ✅ 4. No XSS Testing
- **Was:** `validateShipName()` function had no tests
- **Now:** 33 comprehensive security tests
- **Benefit:** Confidence in input sanitization

#### ✅ 5. Manual Test Running
- **Was:** Run each test file individually
- **Now:** `npm test` runs all tests + validation
- **Benefit:** CI/CD ready, faster development

---

## Technical Debt by Category

### Security
- **Active:** Unicode support needed (MEDIUM)
- **Resolved:** XSS testing, input validation

### Performance
- **Active:** No gzip compression (LOW)
- **Active:** No database indexes for 1000+ ships (LOW)
- **Resolved:** Lazy loading, caching

### Code Quality
- **Active:** Deprecated SPACE_SHIPS constant (HIGH)
- **Active:** Hand-rolled JSON validator (LOW)
- **Resolved:** Ship data in JSON, automated testing

### Developer Experience
- **Active:** No hot-reload (LOW)
- **Active:** No migration system (MEDIUM)
- **Resolved:** npm test automation, interactive validator

---

## Debt Metrics

### By Priority
- **HIGH:** 4 items (~15 hours to resolve)
- **MEDIUM:** 5 items (~15 hours to resolve)
- **LOW:** 3 items (~21 hours to resolve)
- **TOTAL:** 12 items, ~51 hours effort

### By Stage
- **Stage 8.1:** 5 items resolved ✅
- **Stage 9:** 1 item (remove SPACE_SHIPS)
- **Stage 13:** 3 items (Unicode, validation, spaces)
- **Stage 14:** 1 item (versioning)
- **Stage 15:** 1 item (hot-reload)
- **Stage 16:** 2 items (compression, database)

### Debt Ratio
- **Lines Added (Stage 8.1A):** ~1,790 LOC
- **Debt Created:** ~100 LOC (SPACE_SHIPS deprecation)
- **Debt Ratio:** 5.6% (EXCELLENT - industry average 15-20%)

---

## Debt Prevention Strategies

### What's Working Well
1. **TDD Approach** - Writing tests first prevents debt
2. **Code Reviews** - This document forces debt discussion
3. **Incremental Refactoring** - Small, frequent improvements
4. **Documentation** - Clear migration paths defined
5. **Backward Compatibility** - Deprecate before removal

### What to Watch
1. **Scope Creep** - Don't add features without tests
2. **Performance** - Monitor ship loading times as library grows
3. **Security** - Regular XSS test updates as attack vectors evolve
4. **Dependencies** - Avoid adding libraries without justification

---

## Refactoring Strategy - Incremental Then Comprehensive

### Incremental Refactoring (Stages 10-12)

**Strategy:** Extract small, focused modules as features are added. Don't wait for Stage 13.

**Stage 10 (Critical Hits):**
- Extract `lib/critical-hits.js` - Severity calculation, crit resolution
- Extract `lib/damage-effects.js` - System damage effects
- Reduces `combat.js` by ~200-300 LOC

**Stage 11 (Missiles):**
- Extract `lib/weapons/missiles.js` - Missile mechanics
- Extract `lib/weapons/sandcasters.js` - Countermeasures
- Extract `lib/weapons/index.js` - Weapon registry
- Reduces `combat.js` by ~200-300 LOC

**Stage 12 (Boarding):**
- Extract `lib/boarding.js` - Boarding actions
- Extract `lib/crew-combat.js` - Crew combat (if distinct)
- Reduces `combat.js` by ~150-200 LOC

**Benefits:**
- Maintains velocity (no big-bang refactor)
- Each module focused, single-purpose, testable
- By Stage 13, `combat.js` down from 1,605 LOC to ~900-1,000 LOC
- Sets pattern for Stage 13 major refactor

---

### Comprehensive Refactoring (Stage 13.0)

**Timing:** Perfect time for major refactoring
- All features complete (Stages 8-12 done)
- Requirements stable (UI redesign done)
- Architecture known (no guessing)
- Natural breaking point before production

**Scope:** Modularize the three monoliths

**1. Refactor `lib/combat.js` (1,605 LOC → 5+ modules)**
```
lib/combat/
  index.js       - Facade, backward compatibility
  core.js        - Attack resolution, damage
  movement.js    - Hex grid utilities
  validation.js  - Input validation
  formatting.js  - Result formatting
  data/
    ships.js     - SHIPS constant (deprecated)
    crew.js      - CREW constant (deprecated)
```

**2. Refactor `server.js` (1,364 LOC → handlers + state)**
```
server/
  index.js                 - HTTP/Express setup
  socket-handlers/
    connection.js          - Player lifecycle
    combat.js              - Combat events
    movement.js            - Movement events
    space.js               - Space sessions
  game-state/
    manager.js             - State management
    sessions.js            - Combat sessions
```

**3. Refactor `public/app.js` (1,504 LOC → UI + networking + state)**
```
public/js/
  app.js              - Main initialization
  ui/
    combat-log.js     - Combat log rendering
    hex-grid.js       - Hex grid rendering
    controls.js       - UI controls
  networking/
    socket.js         - Socket.io wrapper
    logger.js         - Client logger
  state/
    game-state.js     - Client state
```

**Design Patterns:**
- Single Responsibility Principle
- Command Pattern (socket events)
- State Pattern (game state)
- Observer Pattern (UI updates)
- Facade Pattern (simplified interfaces)

**Effort:** ~6,000 tokens, ~600 LOC refactoring code, ~20 hours

---

## Recommendations for Next Steps

### During Stages 10-12 (Incremental)
- Extract focused modules as features are added
- Keep tests passing throughout
- Document module boundaries
- Add JSDoc comments
- Prepare for Stage 13 major refactor

### Stage 13.0 (Comprehensive Refactoring)
- Split all three monoliths (combat.js, server.js, app.js)
- Apply design patterns systematically
- Zero regressions - all tests must pass
- Measure complexity reduction
- ~20 hours budgeted

### Stage 9 Debt Sprint (Recommended)
- Remove SPACE_SHIPS constant (2 hours)
- Add Unicode support (4 hours)
- Collapse multiple spaces (1 hour)
- **Total:** 7 hours, clears 3 HIGH priority items

---

## Conclusion

**Current Debt Status:** 🟢 HEALTHY

- 5 items resolved in Stage 8.1A
- 9 items active (manageable)
- 5.6% debt ratio (excellent)
- Clear resolution path defined

**Key Insight:** The JSON database refactor created minimal new debt while resolving significant existing debt. This is a **net positive** for the codebase.

**Next Action:** Continue with Stage 8.2, defer debt resolution to Stage 9.

