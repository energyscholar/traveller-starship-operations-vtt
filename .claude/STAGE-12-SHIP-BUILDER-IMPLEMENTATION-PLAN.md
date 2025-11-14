# Stage 12 Ship Builder - Implementation Plan

**Created:** 2025-11-13
**Status:** PLANNING - Awaiting User Approval
**Target:** MVP v1 Ship Template Viewer/Editor

---

## 📋 EXECUTIVE SUMMARY

Build an interactive ship template viewer and basic editor that allows users to:
- Browse 7 official High Guard ship templates
- Toggle detail levels (Simple/Standard/Technical)
- Make basic modifications to templates (jump drive, weapons)
- Save custom ships to browser localStorage
- Manage ship library (view, rename, delete)
- See real-time validation with tactical color scheme

**Approach:** Phased rollout starting with read-only viewer, adding editing capabilities incrementally.

**Tech Stack:** Vanilla JavaScript (current VTT stack), localStorage, existing validation modules.

**Timeline:** No hard deadline, quality over speed.

---

## 🎯 USER DECISIONS SUMMARY

### Core Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Location** | Both (dedicated builder + combat selector) | Dedicated page for designing, simplified selector in combat |
| **Visual Style** | Phase: Icon+Data → Schematics → 3D | Start simple, enhance based on feedback |
| **Edit Approach** | Start from template | Guided, safer than blank slate |
| **Persistence** | localStorage + JSON export | Best UX, shareable designs |
| **Color Scheme** | Multi-color Tactical | 🟢 valid, 🟡 warning, 🔴 error, 🔵 info |
| **Edit Workflow** | Phase: Inline → Modal → Dedicated | Progressive complexity |
| **Validation** | On field blur (onBlur) | Balanced feedback timing |
| **Testing** | Start manual, add automated soon | Pragmatic for MVP |
| **Responsive** | Desktop only for now | Focus on primary use case |
| **Tech Stack** | Vanilla JS, refactor later | Consistent with VTT |
| **Auto-save** | Manual save only | Full user control |
| **Error Display** | Both (banner + indicators) | Summary + specific components |
| **Default State** | Show template selector | Clear starting point |

### MVP v1 Scope
**Must-Haves:**
- ✅ Template card grid viewer (7 official ships)
- ✅ Detail slider (Simple/Standard/Technical modes)
- ✅ Basic inline editing (jump drive, weapons)
- ✅ Validation display (tactical colors)
- ✅ localStorage save/load
- ✅ Ship library management

**Deferred to v2:**
- Modal/dedicated page editors
- JSON export/import
- Combat integration
- Build from scratch
- Advanced component editing

---

## 🎨 UI MOCKUPS

### 1. Ship Template Browser (`/ship-templates.html`)

```
┌────────────────────────────────────────────────────────────────────┐
│  TRAVELLER COMBAT VTT                                              │
│  ◄ Back to Menu                SHIP TEMPLATES                      │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  Detail Level: ● Simple  ○ Standard  ○ Technical                   │
│                                                                     │
│  [🔍 Search]  [Filter: All ▼]  [Sort: Name ▼]  [+ New Ship]       │
└────────────────────────────────────────────────────────────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ 🚀 SCOUT    │  │ 🚢 FREE     │  │ 🚢 FAR      │  │ ⚔️ PATROL   │
│             │  │   TRADER    │  │   TRADER    │  │   CORVETTE  │
│ Type-S      │  │ Type-A      │  │ Type-A2     │  │ Type-PC     │
│             │  │             │  │             │  │             │
│ 100t        │  │ 200t        │  │ 200t        │  │ 400t        │
│ J-2 / M-2   │  │ J-1 / M-1   │  │ J-2 / M-1   │  │ J-3 / M-5   │
│ MCr 36.9    │  │ MCr 37.1    │  │ MCr 53.4    │  │ MCr 214.9   │
│             │  │             │  │             │  │             │
│ ✅ Valid     │  │ ✅ Valid     │  │ ✅ Valid     │  │ ✅ Valid     │
│             │  │             │  │             │  │             │
│ [View]      │  │ [View]      │  │ [View]      │  │ [View]      │
│ [Modify]    │  │ [Modify]    │  │ [Modify]    │  │ [Modify]    │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ ⚔️ MERCENARY│  │ 🛳️ SUBSIDISED│ │ 🔬 SAFARI   │
│   CRUISER   │  │   LINER     │  │    SHIP     │
│ Type-MC     │  │ Type-SL     │  │ Type-SS     │
│             │  │             │  │             │
│ 800t        │  │ 600t        │  │ 200t        │
│ J-2 / M-4   │  │ J-1 / M-1   │  │ J-2 / M-2   │
│ MCr 346.7   │  │ MCr 216.9   │  │ MCr 87.1    │
│             │  │             │  │             │
│ ✅ Valid     │  │ ✅ Valid     │  │ ✅ Valid     │
│             │  │             │  │             │
│ [View]      │  │ [View]      │  │ [View]      │
│ [Modify]    │  │ [Modify]    │  │ [Modify]    │
└─────────────┘  └─────────────┘  └─────────────┘

─── MY CUSTOM SHIPS ─────────────────────────────────────────────────

┌─────────────┐  ┌─────────────┐
│ 🛠️ Modified │  │ 🛠️ Modified │
│   Scout J-1  │  │   Trader +  │
│             │  │   Cargo     │
│ 100t        │  │ 200t        │
│ J-1 / M-2   │  │ J-1 / M-1   │
│ MCr 24.4    │  │ MCr 35.2    │
│             │  │             │
│ ⚠️ Warning   │  │ ✅ Valid     │
│             │  │             │
│ [View]      │  │ [View]      │
│ [Modify]    │  │ [Modify]    │
│ [Delete]    │  │ [Delete]    │
└─────────────┘  └─────────────┘
```

---

### 2. Detail Levels Example (Scout Ship)

#### SIMPLE MODE (Default)
```
┌─────────────────────────────────────────────────────────────┐
│ TYPE-S SCOUT (100t, TL12)                        ✅ Valid   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Jump Range:      2 parsecs                                 │
│  Thrust:          2G acceleration                           │
│  Total Cost:      MCr 36.9                                  │
│  Crew:            3 (Pilot, Astrogator, Engineer)          │
│  Cargo:           0t (all tonnage allocated)                │
│  Weapons:         1× Double Turret (empty)                  │
│  Special:         Fuel scoops, fuel processor, workshop     │
│                                                              │
│  Role: Exploration and courier missions                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### STANDARD MODE
```
┌─────────────────────────────────────────────────────────────┐
│ TYPE-S SCOUT (100t, TL12)                        ✅ Valid   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ▾ PROPULSION & POWER (33t, MCr 27.5, 60 power)            │
│    Jump Drive J-2        10t    MCr 15.0    20 power       │
│    Manoeuvre Drive M-2    2t    MCr  4.0    20 power       │
│    Fusion Power Plant    4t    MCr  4.0    60 output       │
│    Fuel (jump + power)   23t                                │
│                                                              │
│  ▾ HULL & SYSTEMS (18t, MCr 7.2)                           │
│    Streamlined Hull      100t   MCr  6.0                    │
│    Crystaliron Armour-4   6t    MCr  1.2                    │
│    Bridge (standard)     10t    MCr  0.5                    │
│    Computer/5bis          0t    MCr  0.05                   │
│    Military Sensors       2t    MCr  4.1     2 power       │
│                                                              │
│  ▾ ACCOMMODATIONS (21t, MCr 3.25)                          │
│    4× Standard Staterooms 16t   MCr  2.0                    │
│    Air/Raft + Docking     5t    MCr  1.25                   │
│                                                              │
│  ▾ SUPPORT SYSTEMS (8t, MCr 1.0)                           │
│    Fuel Processor         2t    MCr  0.1     2 power       │
│    Workshop               6t    MCr  0.9                    │
│                                                              │
│  ▾ WEAPONS (1t, MCr 0.5)                                    │
│    1× Double Turret       1t    MCr  0.5                    │
│                                                              │
│  Total: 81t allocated, 19t fuel, 0t cargo                   │
│  Power: 64 required, 60 available ⚠️ (-4 deficit)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### TECHNICAL MODE
```
┌─────────────────────────────────────────────────────────────┐
│ TYPE-S SCOUT (100t, TL12)                        ⚠️ Warning │
├─────────────────────────────────────────────────────────────┤
│  Detail Level: ● Technical                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ JUMP DRIVE                                                   │
│ Rating: J-2    TL Required: 11    Status: ✅ Valid          │
│                                                              │
│ Tonnage:  10t  (formula: (100 × 2 × 2.5%) + 5 = 10t)       │
│ Power:    20   (formula: 100 × 2 × 10% = 20)               │
│ Fuel:     20t  (formula: 100 × 2 × 10% = 20t)              │
│ Cost:     MCr 15.0  (formula: 10t × MCr 1.5 = 15.0)        │
│                                                              │
│ [Change Rating ▼]                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MANOEUVRE DRIVE                                              │
│ Thrust: 2G     TL Required: 10    Status: ✅ Valid          │
│                                                              │
│ Tonnage:  2t   (formula: 100 × 2 × 1% = 2t)                │
│ Power:    20   (formula: 100 × 2 × 10% = 20)               │
│ Cost:     MCr 4.0   (formula: 2t × MCr 2 = 4.0)            │
│                                                              │
│ [Change Thrust ▼]                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ POWER PLANT (Fusion TL12)                                   │
│ Output: 60     TL Required: 12    Status: ✅ Valid          │
│                                                              │
│ Tonnage:  4t   (60 power ÷ 15 power/ton = 4t)              │
│ Cost:     MCr 4.0   (4t × MCr 1.0 = 4.0)                    │
│                                                              │
│ Power/Ton: 15  (Fusion TL12 specification)                  │
│                                                              │
│ ⚠️ Warning: Insufficient power                              │
│ Required: 64 power (20 basic + 20 M + 20 J + 4 other)      │
│ Available: 60 power                                          │
│ Deficit: -4 power                                            │
│                                                              │
│ Solution: Shut down fuel processor and non-essential        │
│ systems during jump operations. This is a known design      │
│ constraint of the Type-S Scout (official High Guard).       │
│                                                              │
│ [Increase Power Plant ▼]                                    │
└─────────────────────────────────────────────────────────────┘

[Continue for all components...]

┌─────────────────────────────────────────────────────────────┐
│ VALIDATION SUMMARY                                           │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ 1 Warning                                                 │
│ • Power deficit: 64 required, 60 available (-4)             │
│                                                              │
│ ℹ️ 2 Recommendations                                         │
│ • Consider upgrading to improved sensors for TL12           │
│ • Fuel processor can process 40 tons/day (2× capacity)     │
│                                                              │
│ ✅ All other components valid                                │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Inline Editing Example

**User clicks "Modify" on Scout card:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🚀 SCOUT (EDITING)                          ⚠️ Unsaved      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Jump Drive:     [J-2 ▼]  ← Changed to J-1                 │
│                  ├─ J-0 (No jump drive)                     │
│                  ├─ J-1 ✓ Selected                          │
│                  ├─ J-2 (Original)                          │
│                  ├─ J-3 (Requires TL12)                     │
│                  └─ J-4 (Requires TL13)                     │
│                                                              │
│  Manoeuvre:      [M-2 ▼]  (No change)                       │
│                                                              │
│  Weapons:        [Edit Turrets...]                          │
│                                                              │
│  ──────────────────────────────────────────────────────     │
│                                                              │
│  💰 Cost Impact:                                            │
│  Original: MCr 36.9                                          │
│  Modified: MCr 24.4  (🟢 -MCr 12.5 saved)                   │
│                                                              │
│  ⚖️ Tonnage:                                                 │
│  Freed: 10t (reduced jump drive + fuel)                     │
│  Available for cargo: 10t                                    │
│                                                              │
│  ⚡ Power:                                                   │
│  Required: 44 (was 64)                                       │
│  Available: 60                                               │
│  Status: ✅ Surplus (16 power)                               │
│                                                              │
│  ──────────────────────────────────────────────────────     │
│                                                              │
│  [Save as "Scout J-1"]  [Save over Original]  [Cancel]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Ship Library (localStorage)

```
┌────────────────────────────────────────────────────────────────────┐
│  MY SHIP LIBRARY                                           [+ New] │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Official Templates (7)                                            │
│  ✅ Scout, Free Trader, Far Trader, Patrol Corvette,              │
│     Mercenary Cruiser, Subsidised Liner, Safari Ship              │
│                                                                     │
│  My Custom Ships (2)                                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────┐          │
│  │ 🛠️ Scout J-1                                 ✅ Valid │          │
│  │ Modified: 2025-11-13                                │          │
│  │ Based on: Type-S Scout                              │          │
│  │ Changes: J-2→J-1, +10t cargo                        │          │
│  │                                                      │          │
│  │ [Load] [Rename] [Duplicate] [Delete] [Export JSON] │          │
│  └─────────────────────────────────────────────────────┘          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────┐          │
│  │ 🛠️ Trader Extra Cargo                       ⚠️ Warning│          │
│  │ Modified: 2025-11-12                                │          │
│  │ Based on: Type-A Free Trader                        │          │
│  │ Changes: Removed weapons, +2t cargo                 │          │
│  │ Warning: Unarmed merchant vessel                    │          │
│  │                                                      │          │
│  │ [Load] [Rename] [Duplicate] [Delete] [Export JSON] │          │
│  └─────────────────────────────────────────────────────┘          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

[Import JSON File...]
```

---

### 5. Validation Display (Tactical Colors)

```
┌────────────────────────────────────────────────────────────────────┐
│ VALIDATION STATUS                                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 🔴 2 ERRORS - Ship cannot function                                 │
│  • Insufficient power: 80 required, 60 available (-20 deficit)     │
│  • Hull tonnage exceeded: 105t used, 100t available                │
│                                                                     │
│ 🟡 1 WARNING - Non-critical issue                                  │
│  • Fuel capacity below 2× requirement (limited endurance)          │
│                                                                     │
│ 🔵 2 RECOMMENDATIONS                                                │
│  • Consider upgrading sensors to Improved grade for TL12           │
│  • Power plant oversized: 80 available, only 60 required           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

Component-level indicators:

[Jump Drive J-2]      ✅ Valid
[Manoeuvre M-2]       ✅ Valid
[Power Plant (60)]    🔴 Insufficient for configuration
[Hull (100t)]         🔴 Tonnage exceeded
[Fuel (15t)]          🟡 Below recommended capacity
[Sensors (Military)]  🔵 Upgrade available
```

---

## 🏗️ TECHNICAL ARCHITECTURE

### File Structure
```
public/
├── ship-templates.html         # NEW: Template browser/editor
├── ship-builder.html           # FUTURE: Full editor (v2)
├── css/
│   ├── ship-templates.css      # NEW: Card grid, detail slider
│   └── tactical-theme.css      # NEW: Multi-color tactical scheme
├── js/
│   ├── ship-template-viewer.js # NEW: Card grid logic
│   ├── ship-detail-slider.js   # NEW: Simple/Standard/Technical
│   ├── ship-inline-editor.js   # NEW: Basic component editing
│   ├── ship-library.js         # NEW: localStorage management
│   └── ship-validation-ui.js   # NEW: Display validation results
├── data/
│   └── ships/
│       └── v2/                  # EXISTS: 7 official templates
└── lib/
    └── index.js                 # EXISTS: Validation modules

localStorage structure:
{
  "customShips": [
    {
      "id": "custom-scout-j1-abc123",
      "name": "Scout J-1",
      "basedOn": "scout",
      "modified": "2025-11-13T10:30:00Z",
      "template": { /* complete V2 template object */ }
    }
  ],
  "preferences": {
    "defaultDetailLevel": "simple",
    "sortOrder": "name",
    "showOfficialTemplates": true
  }
}
```

### Data Flow

```
┌─────────────────────┐
│ V2 Ship Templates   │
│ (data/ships/v2/)    │
└──────────┬──────────┘
           │
           │ fetch() on page load
           ▼
┌─────────────────────┐
│ Template Viewer     │
│ (ship-templates.js) │
└──────────┬──────────┘
           │
           │ User selects detail level
           ▼
┌─────────────────────┐       ┌─────────────────────┐
│ Detail Slider       │◄──────┤ User Input          │
│ (formats display)   │       │ (clicks, selections)│
└──────────┬──────────┘       └─────────────────────┘
           │
           │ User clicks "Modify"
           ▼
┌─────────────────────┐
│ Inline Editor       │
│ (component changes) │
└──────────┬──────────┘
           │
           │ onChange → onBlur validation
           ▼
┌─────────────────────┐       ┌─────────────────────┐
│ Validation Module   │◄──────│ lib/index.js        │
│ (validateCompleteShip)│     │ (existing modules)  │
└──────────┬──────────┘       └─────────────────────┘
           │
           │ Returns: {valid, errors, warnings}
           ▼
┌─────────────────────┐
│ Validation UI       │
│ (banner + indicators)│
└──────────┬──────────┘
           │
           │ User clicks "Save"
           ▼
┌─────────────────────┐
│ Ship Library        │
│ (localStorage)      │
└──────────┬──────────┘
           │
           │ Saved ships appear in "My Custom Ships"
           ▼
┌─────────────────────┐
│ Library Management  │
│ (rename, delete, export)│
└─────────────────────┘
```

---

## 📅 PHASED IMPLEMENTATION PLAN

### PHASE 1: Template Viewer (MVP v1 Core) - Week 1

**Goal:** Display 7 templates with detail slider, read-only validation

**Tasks:**
1. Create `ship-templates.html` page structure (2 hours)
   - Header, navigation, grid container
   - Link from main menu

2. Implement tactical color scheme CSS (1 hour)
   - Define color variables (green, amber, red, blue)
   - Create validation badge styles

3. Build card grid component (3 hours)
   - Fetch V2 templates from `data/ships/v2/`
   - Render 7 official template cards
   - Display: name, tonnage, jump/thrust, cost, status

4. Implement detail slider (4 hours)
   - Simple mode: Key stats only
   - Standard mode: Component groups with subtotals
   - Technical mode: Full breakdown with formulas
   - Save preference to localStorage

5. Add validation display (3 hours)
   - Run `validateCompleteShip()` on each template
   - Show ✅/⚠️/🔴 status badges
   - Display banner with errors/warnings
   - Component-level indicators

**Deliverable:** Working template viewer with 3 detail levels
**Time Estimate:** 13 hours (~2 days at hobby pace)

---

### PHASE 2: Basic Inline Editing - Week 2

**Goal:** Allow modification of jump drive rating

**Tasks:**
1. Create inline editor UI (3 hours)
   - Dropdown for jump drive selection (J-0 to J-6)
   - Show TL requirements
   - Disable invalid options

2. Implement real-time cost/tonnage impact (2 hours)
   - Recalculate when jump rating changes
   - Display cost difference (+/- MCr)
   - Show freed/used tonnage

3. Add onBlur validation (2 hours)
   - Validate when dropdown loses focus
   - Update validation display
   - Show power impact

4. Implement unsaved changes warning (2 hours)
   - Track dirty state
   - Warn before navigation
   - "Save" vs "Cancel" buttons

**Deliverable:** Can modify jump drive, see impact, save
**Time Estimate:** 9 hours (~1.5 days)

---

### PHASE 3: Ship Library Management - Week 2-3

**Goal:** Save/load custom ships to localStorage

**Tasks:**
1. Implement localStorage save (3 hours)
   - Save modified ship as new entry
   - Generate unique ID
   - Store metadata (name, basedOn, modified date)

2. Build library UI (4 hours)
   - "My Custom Ships" section
   - List saved ships with cards
   - Show based-on template, changes summary

3. Add library operations (3 hours)
   - Load: Load ship into editor
   - Rename: Update ship name
   - Delete: Remove from library (with confirmation)
   - Duplicate: Clone ship for variant

4. Implement search/filter (2 hours)
   - Search by name
   - Filter by base template
   - Sort by name/date/cost

**Deliverable:** Full library management system
**Time Estimate:** 12 hours (~2 days)

---

### PHASE 4: Weapon Editing - Week 3

**Goal:** Extend editing to weapons/turrets

**Tasks:**
1. Create weapon/turret editor (4 hours)
   - Show current turret configuration
   - Dropdown for turret type (single/double/triple)
   - Weapon selection per slot

2. Implement weapon validation (2 hours)
   - Check hardpoint limits
   - Validate weapon compatibility
   - Check power requirements

3. Update cost/power display (2 hours)
   - Recalculate total cost
   - Show power impact
   - Display tonnage (turrets are 1t each)

**Deliverable:** Can modify weapons/turrets
**Time Estimate:** 8 hours (~1.5 days)

---

### PHASE 5: Testing & Polish - Week 4

**Goal:** Add automated tests, polish UX

**Tasks:**
1. Set up Jest for UI testing (3 hours)
   - Install Jest + jsdom
   - Configure test environment
   - Create test utilities

2. Write critical path tests (6 hours)
   - Template loading
   - Detail slider switching
   - Jump drive editing with validation
   - Save to localStorage
   - Load from library

3. UX polish (4 hours)
   - Loading states
   - Error messages
   - Tooltips for technical terms
   - Keyboard shortcuts
   - Accessibility (ARIA labels)

4. Performance optimization (2 hours)
   - Lazy load templates
   - Debounce validation
   - Cache validation results

**Deliverable:** Tested, polished MVP v1
**Time Estimate:** 15 hours (~2.5 days)

---

## 📊 TOTAL TIME ESTIMATES

| Phase | Description | Estimated Hours | Calendar Days (Hobby Pace) |
|-------|-------------|-----------------|----------------------------|
| 1 | Template Viewer | 13h | ~2 days |
| 2 | Basic Inline Editing | 9h | ~1.5 days |
| 3 | Ship Library | 12h | ~2 days |
| 4 | Weapon Editing | 8h | ~1.5 days |
| 5 | Testing & Polish | 15h | ~2.5 days |
| **TOTAL** | **MVP v1 Complete** | **57h** | **~9 days** |

**At hobby pace (2-3 hours/session, 3-4 sessions/week):**
- Best case: 3 weeks
- Realistic: 4-5 weeks
- With interruptions: 6 weeks

---

## 🧪 TESTING STRATEGY

### Manual Testing (MVP v1)
**Test Scenarios:**
1. Load page → See 7 official templates
2. Toggle detail slider → Simple/Standard/Technical modes
3. Click "Modify" on Scout → Change J-2 to J-1
4. See validation update → Power surplus, cost reduced
5. Save as "Scout J-1" → Appears in My Custom Ships
6. Load saved ship → Modifications preserved
7. Delete custom ship → Removed from library

### Automated Testing (Phase 5+)
**Jest Tests:**
```javascript
describe('Ship Template Viewer', () => {
  test('loads 7 official templates');
  test('detail slider switches modes');
  test('validation runs on template load');
});

describe('Inline Editor', () => {
  test('changing jump drive updates cost');
  test('validation runs on blur');
  test('unsaved changes warning appears');
});

describe('Ship Library', () => {
  test('saves ship to localStorage');
  test('loads ship from library');
  test('deletes ship with confirmation');
});
```

**Playwright E2E Tests (Future):**
- Full workflow: Load → Modify → Save → Reload → Verify

---

## ⚠️ RISKS & MITIGATIONS

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **localStorage limits (5-10MB)** | Can't save many ships | Medium | Add warning at 80% capacity, implement export/import |
| **Browser compatibility** | Doesn't work in Safari/Firefox | Low | Test in multiple browsers, use standard APIs |
| **Validation performance** | Slow for complex ships | Low | Cache results, debounce validation |
| **User confusion on power deficit** | Think Scout is broken | Medium | Clear explanations, tooltips, help text |
| **Scope creep** | Feature bloat, delayed launch | Medium | Stick to phased plan, defer nice-to-haves |
| **Vanilla JS complexity** | Code becomes unwieldy | Medium | Keep modular, consider framework later |

---

## 🚀 FUTURE ENHANCEMENTS (v2+)

**Deferred Features:**
- Modal overlay editor (Phase 2 editing)
- Dedicated builder page (Phase 3 editing)
- JSON export/import
- Combat integration (use custom ships in battle)
- Build from scratch (not template-based)
- Advanced component editing (sensors, power plant, armour)
- Template variants system
- Ship comparison tool
- Print/PDF export
- Share designs (URL with encoded ship data)
- Technical schematics visual style
- 3D ship renders (very advanced)

---

## ✅ SUCCESS CRITERIA

**MVP v1 is successful when:**
- ✅ User can browse 7 official templates
- ✅ Detail slider works smoothly (Simple/Standard/Technical)
- ✅ User can modify jump drive on any template
- ✅ Validation displays correctly with tactical colors
- ✅ Modified ships save to localStorage
- ✅ User can manage ship library (load, rename, delete)
- ✅ All changes persist across page reloads
- ✅ Zero regressions (existing combat system unaffected)
- ✅ 15+ automated tests passing

**User Feedback Goals:**
- "This is way easier than spreadsheets!"
- "I can finally design my own ship for Tuesday's game"
- "The detail slider is perfect - hides complexity when I don't need it"
- "Love the tactical color scheme, fits the VTT theme"

---

## 📝 NEXT STEPS

1. **User Review:** Review this plan, provide feedback
2. **Approval:** Get go-ahead to proceed
3. **Start Phase 1:** Create ship-templates.html page
4. **Incremental Commits:** Commit after each feature
5. **User Testing:** Get feedback after each phase
6. **Iterate:** Adjust based on real-world usage

---

**STATUS:** ✅ PLAN COMPLETE - Awaiting User Approval

**Questions for User:**
1. Does the phased approach make sense?
2. Any concerns about the 4-5 week timeline?
3. Should we adjust any priorities?
4. Ready to start Phase 1?

---

**Created:** 2025-11-13
**Next Review:** After user approval
**Target Start:** After plan approval
**Target MVP v1:** ~4-5 weeks from start
