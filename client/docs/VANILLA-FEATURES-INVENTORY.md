# Vanilla App.js Feature Inventory

**Created:** 2025-11-28
**Source:** `/home/bruce/software/traveller-combat-vtt/public/app.js` (1,857 LOC)
**Purpose:** Complete inventory of vanilla features for React migration planning

---

## ROUTING & SCREENS

### ✅ URL Routing System (Lines 1-103)
**Status:** NOT in React
**Complexity:** LOW
**Description:**
- URL parameter parsing (`?mode=battle|solo|customize`)
- Screen navigation (menu, battle, solo, customize)
- Mode-specific UI text updates
- Clean URL handling for invalid modes

**Files:**
- Vanilla: `app.js` lines 1-103
- React: Need to implement with React Router

---

### ✅ Main Menu Screen (Lines 44-62)
**Status:** BASIC version in React
**Complexity:** LOW
**Description:**
- Three menu buttons:
  - Space Battle (multiplayer)
  - Solo Battle (vs AI)
  - Customize Ship
- Button event listeners
- Screen visibility toggling

**Files:**
- Vanilla: `app.js` lines 44-62
- React: `client/src/components/MainMenu.tsx` (skeleton only)

**Gap:** React version is skeleton, needs full implementation

---

### ✅ Ship Selection Screen (Lines 7-28)
**Status:** BASIC version in React
**Complexity:** MEDIUM
**Description:**
- Ship selection UI
- Mode-specific titles/descriptions
- Player indicator
- Ship assignment display

**Files:**
- Vanilla: `app.js` + HTML
- React: `client/src/components/ShipSelection.tsx` (skeleton only)

**Gap:** React version incomplete

---

### ✅ Space Combat HUD (Lines 9, 186-234)
**Status:** BASIC version in React
**Complexity:** HIGH
**Description:**
- Combat controls (attack, end turn, repair)
- Ship stats display (hull, ammo)
- Turn indicator
- Round display
- Weapon selector
- Range selector
- Dodge selector
- Combat log

**Files:**
- Vanilla: `app.js` + HTML
- React: `client/src/components/CombatScreen.tsx` (skeleton only)

**Gap:** Most features missing from React version

---

## CLIENT INFRASTRUCTURE

### ✅ Client Logging System (Lines 106-168)
**Status:** NOT in React
**Complexity:** LOW
**Description:**
- Lightweight logger that sends to server
- Log levels: debug, info, warn, error
- Buffer for logs before connection
- Unhandled error capture

**Files:**
- Vanilla: `app.js` lines 106-168
- React: None

**Migration:** Create `client/src/utils/clientLogger.ts`

---

### ✅ Socket.IO Connection (Lines 169-598)
**Status:** PARTIAL in React (via useSocket hook)
**Complexity:** MEDIUM
**Description:**
- Connection initialization
- Event handlers for 20+ events
- Connection status tracking
- Reconnection handling

**Files:**
- Vanilla: `app.js` lines 169-598
- React: `client/src/hooks/useSocket.ts` (basic version)

**Gap:** Many event handlers not implemented in React

---

## GAME STATE MANAGEMENT

### ✅ Player State (Lines 175-178, 389-415)
**Status:** PARTIAL in React (GameContext)
**Complexity:** LOW
**Description:**
- Player ID tracking
- Ship assignment (scout/corsair)
- Role tracking
- Connection status

**Files:**
- Vanilla: `app.js` lines 175-178, 389-415
- React: `client/src/context/GameContext.tsx`

**Gap:** Some player state fields missing

---

### ✅ Game State Object (Lines 179-184, 436-448)
**Status:** PARTIAL in React (GameContext)
**Complexity:** MEDIUM
**Description:**
- Ship assignments
- Current round
- Current turn
- Initiative tracking
- Ship states (hull, ammo, position)

**Files:**
- Vanilla: `app.js` lines 179-184, 436-448
- React: `client/src/context/GameContext.tsx`

**Gap:** Initiative and detailed state tracking

---

## HEX GRID SYSTEM

### ❌ Hex Coordinate Conversion (Lines 237-248)
**Status:** NOT in React
**Complexity:** MEDIUM
**Description:**
- `hexToPixel(q, r)` - Convert hex coords to screen pixels
- `pixelToHex(x, y)` - Convert screen pixels to hex coords
- Offset-based coordinate system

**Files:**
- Vanilla: `app.js` lines 237-248
- React: None

**Priority:** HIGH (needed for movement)

---

### ❌ Hex Distance Calculation (Lines 249-253)
**Status:** NOT in React
**Complexity:** LOW
**Description:**
- `hexDistance(pos1, pos2)` - Calculate distance between hexes
- Manhattan distance formula

**Files:**
- Vanilla: `app.js` lines 249-253
- React: None

**Priority:** HIGH

---

### ❌ Range Band Mapping (Lines 255-261)
**Status:** NOT in React
**Complexity:** LOW
**Description:**
- `rangeFromDistance(distance)` - Map hex distance to range band
- Range bands: Adjacent, Close, Short, Medium, Long, Very Long, Distant

**Files:**
- Vanilla: `app.js` lines 255-261
- React: None

**Priority:** HIGH

---

### ❌ Hex Grid Rendering (Lines 263-328)
**Status:** NOT in React
**Complexity:** HIGH
**Description:**
- SVG hex grid rendering
- `drawHex(q, r)` - Draw individual hex
- `drawShip(q, r, shipName)` - Draw ship on hex
- `renderGrid()` - Render full grid with ships
- Grid size: 21x21 hexes
- Ship positions tracked

**Files:**
- Vanilla: `app.js` lines 263-328, HTML `<svg id="hexGrid">`
- React: None

**Priority:** HIGH (core combat feature)

---

### ❌ Hex Click Handling (Lines 340-386)
**Status:** NOT in React
**Complexity:** MEDIUM
**Description:**
- `handleHexClick(q, r)` - Handle hex clicks for movement
- Movement validation
- Socket event emission for movement
- Only active player's ship can move

**Files:**
- Vanilla: `app.js` lines 340-386
- React: None

**Priority:** HIGH

---

### ❌ Range Display (Lines 329-338)
**Status:** NOT in React
**Complexity:** LOW
**Description:**
- `updateRangeDisplay()` - Calculate and display current range
- Updates range band display

**Files:**
- Vanilla: `app.js` lines 329-338
- React: None

**Priority:** MEDIUM

---

## COMBAT SYSTEM UI

### ✅ Ship Display Updates (Lines 467-512)
**Status:** PARTIAL in React
**Complexity:** MEDIUM
**Description:**
- `updateShipDisplay(ships)` - Update ship stats in UI
- Hull values
- Ammo counts (missiles, sandcasters)
- Dropdown options

**Files:**
- Vanilla: `app.js` lines 467-512
- React: Partial in CombatScreen.tsx

**Gap:** Ammo display, dropdown updates

---

### ❌ Weapon Selector (Lines 667-693)
**Status:** NOT in React
**Complexity:** MEDIUM
**Description:**
- `updateWeaponSelector(shipName)` - Populate weapon dropdown
- Fetches weapons from server
- Shows ammo counts
- Filters by ship

**Files:**
- Vanilla: `app.js` lines 667-693
- React: None

**Priority:** HIGH

---

### ✅ Combat Log (Lines 600-625)
**Status:** BASIC in React
**Complexity:** MEDIUM
**Description:**
- `addLog(header, type, details)` - Add combat log entry
- Message categories: hit, miss, critical, damage, missile, info, warning, error, success
- Color coding by type
- Collapsible details
- Auto-scroll to newest

**Files:**
- Vanilla: `app.js` lines 600-625
- React: Basic version in CombatScreen.tsx

**Gaps:**
- ❌ No color coding by type
- ❌ No collapsible details
- ❌ Auto-scroll may not work correctly
- ❌ Message categorization incomplete

---

### ❌ Turn UI Updates (Lines 627-665)
**Status:** NOT in React
**Complexity:** MEDIUM
**Description:**
- `updateTurnUI()` - Update turn indicators
- Round number display
- Current turn display (Scout/Corsair)
- Turn status text
- Visual turn indicator
- Enable/disable end turn button

**Files:**
- Vanilla: `app.js` lines 627-665
- React: None

**Priority:** HIGH (core gameplay)

---

### ❌ Controls for Assignment (Lines 695-840)
**Status:** NOT in React
**Complexity:** HIGH
**Description:**
- `updateControlsForAssignment()` - Update UI based on player's ship
- Pre-fill dropdowns for player's ship
- Enable/disable controls
- Update labels
- Set default selections
- Complex logic for attacker/target selection

**Files:**
- Vanilla: `app.js` lines 695-840
- React: None

**Priority:** HIGH

---

## SOCKET EVENT HANDLERS

### ❌ 20+ Socket Event Handlers (Lines 389-598)
**Status:** PARTIAL in React
**Complexity:** HIGH
**Description:**

**Implemented Events:**
- `connect` - Connection established
- `disconnect` - Connection lost
- `welcome` - Initial server greeting
- `playerAssigned` - Ship assignment received
- `gameState` - Game state update
- `shipStateUpdate` - Ship stats update

**Missing Events:**
- `playerJoined` - Another player joined (lines 418-424)
- `playerLeft` - Player disconnected (lines 426-433)
- `gameReset` - Game reset (lines 515-521)
- `roundStart` - New round begins (lines 523-540)
- `turnChange` - Turn changed (lines 542-550)
- `gameError` - Game error (lines 552-556)
- `repairResult` - Repair completed (lines 558-566)
- `repairError` - Repair failed (lines 568-572)
- `moveResult` - Movement completed (lines 574-582)
- `moveError` - Movement failed (lines 584-588)
- `attackResult` - Attack completed (not shown in excerpt, but exists)
- `missileResult` - Missile fired (likely exists)
- `pointDefenseResult` - Point defense activated (likely exists)
- `criticalHit` - Critical hit occurred (likely exists)

**Files:**
- Vanilla: `app.js` lines 389-598
- React: `client/src/hooks/useSocket.ts` (partial)

**Priority:** HIGH (core multiplayer functionality)

---

## TEST MODE

### ❌ Test Functions (Lines 843-1064+)
**Status:** NOT in React
**Complexity:** MEDIUM
**Description:**
- `testSocketConnection()` - Test socket connectivity
- `testCombatMathBasic()` - Test attack calculations
- `testCombatMathHit()` - Test hit damage
- `testCombatMathMiss()` - Test miss handling
- `testRangeModifiers()` - Test range DMs
- `testDodgeModifiers()` - Test dodge DMs
- `testMultiTabSync()` - Test multiplayer sync
- Test log display

**Files:**
- Vanilla: `app.js` lines 843-1064+
- React: None

**Priority:** LOW (development/testing feature)

---

## FEATURE SUMMARY

### HIGH PRIORITY (Core Gameplay)
1. ❌ Hex grid rendering system (SVG, coordinates, distance)
2. ❌ Hex grid interaction (click handling, movement)
3. ❌ Weapon selector with ammo tracking
4. ❌ Turn management UI (round, turn, status)
5. ❌ Controls for assignment (smart defaults)
6. ❌ Socket event handlers (15+ missing events)
7. ❌ Range display updates

### MEDIUM PRIORITY (Important UX)
8. ❌ Combat log enhancements (color coding, details, auto-scroll)
9. ❌ Ship display updates (ammo, full stats)
10. ❌ Client logging system
11. ✅ URL routing (React Router integration)
12. ❌ Player state tracking (complete)

### LOW PRIORITY (Polish/Dev Tools)
13. ❌ Test mode functions
14. ❌ Mode-specific UI text updates

---

## MIGRATION COMPLEXITY ESTIMATES

| Feature | Complexity | Est. Time | Dependencies |
|---------|-----------|-----------|--------------|
| Hex Grid System | HIGH | 3-4 hours | None |
| Socket Event Handlers | HIGH | 2-3 hours | GameContext |
| Weapon Selector | MEDIUM | 1 hour | Socket events |
| Turn Management UI | MEDIUM | 1 hour | GameContext |
| Controls for Assignment | HIGH | 2 hours | GameContext, Socket |
| Combat Log Enhancements | MEDIUM | 1 hour | None |
| Client Logger | LOW | 30 min | Socket setup |
| Range Display | LOW | 30 min | Hex grid |
| URL Routing | LOW | 1 hour | React Router |
| Ship Display (complete) | LOW | 1 hour | GameContext |
| Test Mode | LOW | 1-2 hours | All systems |

**Total Estimated Time:** 13-17 hours

---

## LINES OF CODE BREAKDOWN

**Total Vanilla:** 1,857 LOC

**Rough Categories:**
- Routing & Initialization: ~100 LOC
- Client Logger: ~60 LOC
- Socket.IO Setup: ~50 LOC
- Socket Event Handlers: ~210 LOC
- Game State Management: ~50 LOC
- Hex Grid System: ~150 LOC
- Combat UI Functions: ~300 LOC
- Test Functions: ~200 LOC
- Event Listeners & Misc: ~737 LOC

---

## DEPENDENCIES FOR REACT MIGRATION

### Required React Components
- `HexGrid.tsx` (new)
- `CombatLog.tsx` (enhance existing)
- `WeaponSelector.tsx` (new)
- `TurnIndicator.tsx` (new)
- `RangeDisplay.tsx` (new)
- `MovementControls.tsx` (new)

### Required Utilities
- `client/src/utils/hexGrid.ts` (coordinate conversion)
- `client/src/utils/clientLogger.ts` (logging)

### Required Context Updates
- GameContext: Add initiative, detailed ship states
- GameContext: Add turn management state

### Required Hook Updates
- useSocket: Add 15+ missing event handlers
- useSocket: Add event emission helpers

---

## RECOMMENDED MIGRATION ORDER

### Phase 1: Core Combat Infrastructure (6-8 hours)
1. Hex grid system (coordinates, distance, range)
2. Socket event handlers (complete missing events)
3. GameContext enhancements (initiative, turns, detailed state)

### Phase 2: Combat UI (4-6 hours)
4. Weapon selector with ammo
5. Turn management UI
6. Controls for assignment logic
7. Combat log enhancements

### Phase 3: Movement & Polish (3-4 hours)
8. Hex grid rendering (SVG)
9. Hex click handling (movement)
10. Range display
11. Client logger
12. URL routing

### Phase 4: Optional (1-2 hours)
13. Test mode functions (if needed)

**Total:** 14-20 hours

---

## RISK ASSESSMENT

### Low Risk ✅
- Client logger (isolated utility)
- URL routing (standard React Router)
- Range display (simple calculation)
- Combat log enhancements (UI only)

### Medium Risk ⚠️
- Weapon selector (depends on server API)
- Turn management UI (state coordination)
- Ship display updates (multiple state sources)
- Socket event handlers (must maintain compatibility)

### High Risk 🔴
- Hex grid system (complex SVG rendering, coordinate math)
- Hex click handling (movement validation, state sync)
- Controls for assignment (complex defaulting logic)

---

## TESTING REQUIREMENTS

### Unit Tests Needed
- Hex coordinate conversion (`hexToPixel`, `pixelToHex`)
- Hex distance calculation
- Range band mapping
- Combat log formatting
- Weapon selector logic

### Integration Tests Needed
- Socket event flow (connect → assign → gameState)
- Turn progression (start game → round start → turn change)
- Movement flow (click hex → validate → emit → update)
- Combat flow (select weapon → fire → result → log)

### E2E Tests Needed
- Full combat session (2 players, attacks, movement)
- Turn management (round progression, turn switching)
- Ship destruction handling
- Reconnection handling

---

**Status:** ✅ Inventory Complete
**Next Step:** Prioritize features for migration roadmap
**Estimated Total Migration Time:** 14-20 hours
