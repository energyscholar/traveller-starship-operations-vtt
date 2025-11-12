# TRAVELLER COMBAT VTT - STAGE 12 QUICKSTART

**Date:** 2025-11-12
**Session:** Stage 12.4 Part 2 onwards
**Branch:** main
**Last Commit:** b78ab43 (Cost calculation and validation modules)

---

## Current Status

### ✅ COMPLETED Sub-stages

**12.1: Ship Templates** ✅
- 9 ship JSON files in `data/ships/` with extended schema
- Fields: jump, fuel, cargo, passengers, cost, hardpoints, techLevel

**12.2: Main Menu & URL Routing** ✅
- Main menu with "Space Battle" and "Customize Ship" buttons
- URL routing: `?mode=battle` | `?mode=customize` | no param (menu)
- Fixed test counter bug (was showing "128 failed" since Stage 5)
- All 161 tests passing

**12.3: SVG Ship Schematics** ✅
- `public/ship-customizer.html` (117 lines) - 3-panel layout
- `public/ship-customizer.css` (334 lines) - Responsive grid + SVG styles
- `public/ship-customizer.js` (484 lines) - SVG generation + click handlers
- Scout & Free Trader detailed SVGs
- Generic SVG for 7 remaining ships
- Full component interaction (click, hover, select)

**12.4 Part 1: Foundation Modules** ✅
- `lib/ship-costs.js` (312 lines) - Cost calculation with integer credits
- `lib/ship-customization.js` (353 lines) - Validation rules
- Both modules loaded in ship-customizer.html

### ⏳ IN PROGRESS

**12.8: Solo Mode with AI Opponent** (90% complete)
- ✅ Main menu "Solo Battle (vs AI)" button
- ✅ URL routing for `?mode=solo`
- ✅ Dummy AI player creation on server
- ✅ AI decision-making framework (dodge, sandcaster, fire)
- ✅ AI turn automation with round transitions
- ✅ Socket emission safety for AI without connections
- ⚠️ AI weapon detection needs fix (see Known Issues)
- ✅ Combat progresses through multiple rounds

**12.4 Part 2: Component Panels & UI Wiring** (DEFERRED)
- ✅ Foundations: Cost & validation modules ready
- ⏳ DEFERRED: Will resume after Stage 13 automated testing

### 📋 REMAINING Sub-stages

**12.4 Part 2:** Component Panels (3-4 hours)
**12.5:** Ship Library / localStorage (4-5 hours)
**12.6:** Combat Integration (4-5 hours)
**12.7:** Testing & Polish (6-8 hours)

**Total Remaining:** 17-21 hours (~2-3 coding sessions)

---

## Key Files Reference

### Data & Schema
```
data/ships/index.json          - Ship list
data/ships/scout.json          - Scout template (100t, 1 turret)
data/ships/free_trader.json    - Free Trader (200t, 2 turrets)
data/ships/far_trader.json     - Far Trader (200t, 2 turrets)
data/ships/patrol_corvette.json - Corvette (400t, 4 turrets)
data/ships/mercenary_cruiser.json - Cruiser (800t, 8 turrets)
data/ships/subsidised_liner.json - Liner (600t, 6 turrets)
data/ships/safari_ship.json    - Safari (200t, 2 turrets)
data/ships/seeker.json         - Seeker (100t, 1 turret)
data/ships/laboratory_ship.json - Lab Ship (400t, 2 turrets)
data/schemas/ship.schema.json  - Extended schema validation
```

### Ship Customizer UI
```
public/ship-customizer.html    - Main customization page (117 lines)
public/ship-customizer.css     - Styles (334 lines)
public/ship-customizer.js      - UI logic (484 lines)
```

### Business Logic Modules
```
lib/ship-costs.js              - Cost calculations (312 lines)
lib/ship-customization.js      - Validation rules (353 lines)
```

### Routing
```
public/app.js                  - URL routing logic (lines 1-67)
public/index.html              - Main menu UI (lines 26-47)
```

### Planning Documents
```
.claude/STAGE-12-FINALIZED-PLAN.md     - Complete Stage 12 plan
.claude/STAGE-12.3-RISK-ANALYSIS.md    - Sub-stage 12.3 risks
.claude/STAGE-12-QUICKSTART.md         - This file
```

---

## Ship Customizer Architecture

### Data Flow
```
User clicks component on SVG
  ↓
handleComponentClick(type, id, element)
  ↓
showComponentPanel(type, id)
  ↓
Generate panel HTML based on type
  ↓
User modifies component (dropdown, slider, etc.)
  ↓
Update currentModifications object
  ↓
Validate modifications (ShipCustomization.validateCustomShip)
  ↓
Calculate costs (ShipCosts.getCostBreakdown)
  ↓
Update cost display (updateCostDisplay)
  ↓
Re-render SVG with updated labels
```

### State Management
```javascript
// Global state (in ship-customizer.js)
let shipTemplates = {};          // Loaded from data/ships/*.json
let currentTemplate = 'scout';   // Currently selected template
let currentModifications = {};   // User's modifications
let selectedComponent = null;    // Currently selected component

// Modification object structure
currentModifications = {
  turrets: [
    { id: 'turret1', type: 'triple', weapons: ['pulse_laser', 'beam_laser', 'missile_rack'] }
  ],
  armor: 4,
  thrust: 2,
  jump: 2,
  cargo: 15,
  fuel: 25
};
```

---

## Next Tasks (Sub-stage 12.4 Part 2)

### 1. Implement Turret Customization Panel (1 hour)

**File:** `public/ship-customizer.js`
**Function:** `generateTurretPanel(turretId, template)`

**TODO:**
- Replace placeholder with actual panel
- Add turret type dropdown (Single/Double/Triple)
- Add weapon assignment dropdowns (capacity based on type)
- Calculate and display turret cost
- Apply button to save modifications
- Update SVG labels when turret changes

**Panel Structure:**
```html
<div class="panel-header">
  <div class="panel-title">🎯 TURRET 1</div>
  <button class="panel-close">×</button>
</div>
<div class="panel-body">
  <div class="form-group">
    <label>Turret Type:</label>
    <select id="turret-type">
      <option value="single">Single (1 weapon) - MCr 0.2</option>
      <option value="double">Double (2 weapons) - MCr 0.5</option>
      <option value="triple">Triple (3 weapons) - MCr 1.0</option>
    </select>
  </div>

  <div class="form-group" id="weapon-1-group">
    <label>Weapon 1:</label>
    <select id="weapon-1">
      <option value="">-- Empty --</option>
      <option value="pulse_laser">Pulse Laser - MCr 1.0</option>
      <option value="beam_laser">Beam Laser - MCr 0.5</option>
      <option value="missile_rack">Missile Rack - MCr 0.75</option>
      <option value="sandcaster">Sandcaster - MCr 0.25</option>
    </select>
  </div>

  <!-- Weapon 2 & 3 shown based on turret type -->

  <div class="component-cost">
    <span class="component-cost-label">Turret Cost:</span>
    <span class="component-cost-value" id="turret-cost">MCr 2.50</span>
  </div>

  <button class="action-button primary" onclick="applyTurretChanges()">
    Apply Changes
  </button>
</div>
```

**Functions to Add:**
```javascript
function applyTurretChanges() {
  // Get values from form
  const turretType = document.getElementById('turret-type').value;
  const weapons = [];
  // Collect weapon selections

  // Update currentModifications.turrets
  // Validate
  // Calculate costs
  // Update UI
  // Re-render SVG
}

function onTurretTypeChange() {
  // Show/hide weapon dropdowns based on type
  const type = document.getElementById('turret-type').value;
  const capacity = ShipCustomization.getTurretCapacity(type);
  // Show weapon-1 through weapon-N
}
```

---

### 2. Implement Armor Panel (30 min)

**File:** `public/ship-customizer.js`
**Function:** `generateArmorPanel(template)`

**Panel Structure:**
```html
<div class="panel-header">
  <div class="panel-title">🛡️ Armor</div>
  <button class="panel-close">×</button>
</div>
<div class="panel-body">
  <div class="form-group">
    <label>Armor Rating: <span id="armor-value">0</span></label>
    <input type="range" id="armor-slider" min="0" max="4" value="0" step="1">
    <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #888;">
      <span>0 (None)</span>
      <span>4 (Max TL9)</span>
    </div>
  </div>

  <div class="component-cost">
    <span class="component-cost-label">Armor Cost:</span>
    <span class="component-cost-value" id="armor-cost">MCr 0.00</span>
  </div>

  <button class="action-button primary" onclick="applyArmorChanges()">
    Apply Changes
  </button>
</div>
```

**Functions:**
```javascript
function applyArmorChanges() {
  const newArmor = parseInt(document.getElementById('armor-slider').value);
  currentModifications.armor = newArmor;
  validateAndUpdateCosts();
}

function onArmorSliderChange() {
  const value = document.getElementById('armor-slider').value;
  document.getElementById('armor-value').textContent = value;

  // Real-time cost preview
  const template = shipTemplates[currentTemplate];
  const cost = ShipCosts.calculateArmorCost(template, parseInt(value));
  document.getElementById('armor-cost').textContent = ShipCosts.formatMCr(cost);
}
```

---

### 3. Implement M-Drive Panel (20 min)

**Panel Structure:**
```html
<div class="panel-header">
  <div class="panel-title">🚀 Maneuver Drive</div>
  <button class="panel-close">×</button>
</div>
<div class="panel-body">
  <div class="form-group">
    <label>Thrust Rating:</label>
    <select id="thrust-select">
      <option value="1">Thrust 1 (Slow)</option>
      <option value="2">Thrust 2 (Standard)</option>
      <option value="3">Thrust 3 (Fast)</option>
      <option value="4">Thrust 4 (Very Fast)</option>
      <option value="5">Thrust 5 (Military)</option>
      <option value="6">Thrust 6 (Fighter)</option>
    </select>
  </div>

  <div class="component-cost">
    <span class="component-cost-label">M-Drive Upgrade Cost:</span>
    <span class="component-cost-value" id="m-drive-cost">MCr 0.00</span>
  </div>

  <button class="action-button primary" onclick="applyMDriveChanges()">
    Apply Changes
  </button>
</div>
```

---

### 4. Implement J-Drive Panel (20 min)

Similar to M-Drive, but for Jump rating (0-6).

---

### 5. Implement Cargo/Fuel Panel (30 min)

**Panel Structure:**
```html
<div class="panel-header">
  <div class="panel-title">📦 Cargo & Fuel Trade-off</div>
  <button class="panel-close">×</button>
</div>
<div class="panel-body">
  <p style="color: #aaa; font-size: 0.9em; margin-bottom: 15px;">
    Total space: 40t (Cargo + Fuel must equal 40t)
  </p>

  <div class="form-group">
    <label>Cargo: <span id="cargo-value">20</span>t</label>
    <input type="range" id="cargo-slider" min="0" max="40" value="20" step="1">
  </div>

  <div class="form-group">
    <label>Fuel: <span id="fuel-value">20</span>t</label>
    <input type="range" id="fuel-slider" min="0" max="40" value="20" step="1">
  </div>

  <div style="margin-top: 10px; padding: 10px; background: rgba(102, 126, 234, 0.1); border-radius: 6px;">
    <div>Jump-2 requires: 20t fuel</div>
    <div style="color: #888; font-size: 0.85em;">Current fuel: <span id="current-fuel-display">20t</span></div>
  </div>

  <button class="action-button primary" onclick="applyCargoFuelChanges()">
    Apply Changes
  </button>
</div>
```

**Note:** Sliders are linked - moving one adjusts the other to maintain total.

---

### 6. Wire Up State Management (1 hour)

**Functions to Add/Update:**

```javascript
// Update cost display with real values
function updateCostDisplay(template) {
  const breakdown = ShipCosts.getCostBreakdown(template, currentModifications);

  document.getElementById('base-cost').textContent =
    ShipCosts.formatMCr(breakdown.baseCost);
  document.getElementById('mod-cost').textContent =
    `+ ${ShipCosts.formatMCr(breakdown.modificationCost)}`;
  document.getElementById('total-cost').textContent =
    ShipCosts.formatMCr(breakdown.total);
}

// Validate and update costs after any modification
function validateAndUpdateCosts() {
  const template = shipTemplates[currentTemplate];

  // Validate
  const validation = ShipCustomization.validateCustomShip(template, currentModifications);

  // Show errors/warnings in UI
  displayValidationResults(validation);

  // Update costs
  updateCostDisplay(template);

  // Re-render SVG to show changes
  renderShipSVG(template);
}

// Display validation errors/warnings
function displayValidationResults(validation) {
  // Clear previous messages
  const existingAlert = document.getElementById('validation-alert');
  if (existingAlert) existingAlert.remove();

  if (validation.errors.length > 0) {
    const alert = document.createElement('div');
    alert.id = 'validation-alert';
    alert.style.cssText = 'background: rgba(233, 69, 96, 0.2); border: 2px solid #e94560; padding: 15px; border-radius: 8px; margin-top: 15px;';

    let html = '<strong style="color: #e94560;">❌ Validation Errors:</strong><ul style="margin: 10px 0 0 20px; color: #fff;">';
    validation.errors.forEach(err => {
      html += `<li>${err}</li>`;
    });
    html += '</ul>';

    alert.innerHTML = html;
    document.querySelector('.cost-summary-bar').parentElement.appendChild(alert);
  }

  if (validation.warnings.length > 0) {
    // Show warnings (similar but yellow/orange)
  }
}

// Save ship (placeholder for 12.5)
function saveShip() {
  const shipName = document.getElementById('ship-name').value.trim();
  if (!shipName) {
    alert('Please enter a ship name');
    return;
  }

  const template = shipTemplates[currentTemplate];
  const validation = ShipCustomization.validateCustomShip(template, currentModifications);

  if (!validation.valid) {
    alert('Cannot save ship with validation errors. Please fix errors first.');
    return;
  }

  // TODO: Implement in Sub-stage 12.5
  alert(`Ship "${shipName}" will be saved in Sub-stage 12.5 (Ship Library)`);
}
```

---

## Testing Checklist (Before Commit)

### Manual Testing
- [ ] Load ship-customizer.html in browser
- [ ] Click each ship template - SVG changes
- [ ] Click turret component - panel appears
- [ ] Change turret type - weapon dropdowns update
- [ ] Assign weapons - cost updates
- [ ] Click armor - slider appears
- [ ] Adjust armor - cost updates in real-time
- [ ] Click M-Drive - dropdown appears
- [ ] Change thrust - cost updates
- [ ] Click J-Drive - dropdown appears
- [ ] Change jump - fuel warning appears if insufficient
- [ ] Click cargo - sliders appear
- [ ] Adjust cargo slider - fuel slider adjusts inversely
- [ ] Apply changes - modifications saved to state
- [ ] Cost summary shows accurate totals
- [ ] Validation errors displayed for invalid configs
- [ ] Back to menu button works

### Automated Testing
```bash
npm test
# Should still show: 161 total, 0 failed, 161 passed
```

---

## Cost Formula Reference

### Turrets
```
Single:  MCr 0.2  (200,000 Cr)
Double:  MCr 0.5  (500,000 Cr)
Triple:  MCr 1.0  (1,000,000 Cr)
```

### Weapons
```
Pulse Laser:    MCr 1.0   (1,000,000 Cr)
Beam Laser:     MCr 0.5   (500,000 Cr)
Missile Rack:   MCr 0.75  (750,000 Cr)
Sandcaster:     MCr 0.25  (250,000 Cr)
Particle Beam:  MCr 4.0   (4,000,000 Cr)
Railgun:        MCr 2.0   (2,000,000 Cr)
```

### Armor
```
Cost = MCr 0.05 × (tonnage ÷ 10) × armor_rating

Example:
  200t ship, Armor 4
  = MCr 0.05 × 20 × 4
  = MCr 4.0
```

### M-Drive
```
Cost per thrust increase = MCr 2.0 × (tonnage ÷ 100)

Example:
  200t ship, Thrust 1→2
  = MCr 2.0 × 2 × 1
  = MCr 4.0
```

### J-Drive
```
Cost per jump increase = MCr 10.0 × (tonnage ÷ 100)

Example:
  200t ship, Jump 1→2
  = MCr 10.0 × 2 × 1
  = MCr 20.0
```

---

## Validation Rules Reference

### Turrets
- Max turrets = hardpoints (tonnage ÷ 100)
- Single turret: 1 weapon max
- Double turret: 2 weapons max
- Triple turret: 3 weapons max
- Valid weapons: pulse_laser, beam_laser, missile_rack, sandcaster, particle_beam, railgun

### Armor
- Range: 0 to (TL ÷ 2)
- TL9 max: 4
- TL12 max: 6

### Thrust
- Range: 1-6
- Warning if reduced from template

### Jump
- Range: 0-6
- Fuel requirement: tonnage × 0.1 × jump
- Warning if fuel < required

### Cargo/Fuel
- cargo + fuel = template.cargo + template.fuel (conservation)
- Both ≥ 0

---

## Module API Quick Reference

### ShipCosts (lib/ship-costs.js)
```javascript
// Calculate modification cost
ShipCosts.calculateModificationCost(template, mods)
  → returns credits (integer)

// Get detailed breakdown
ShipCosts.getCostBreakdown(template, mods)
  → returns {baseCost, turrets, armor, mDrive, jDrive, modificationCost, total}

// Calculate individual components
ShipCosts.calculateTurretCost(template, modTurrets)
ShipCosts.calculateArmorCost(template, newArmor)
ShipCosts.calculateMDriveCost(template, newThrust)
ShipCosts.calculateJDriveCost(template, newJump)

// Formatting
ShipCosts.formatMCr(credits) → "MCr 2.50"
ShipCosts.mcrToCredits(mcr) → 2500000

// Constants
ShipCosts.TURRET_COSTS = {single: 200000, double: 500000, triple: 1000000}
ShipCosts.WEAPON_COSTS = {pulse_laser: 1000000, beam_laser: 500000, ...}
ShipCosts.MCR = 1000000
```

### ShipCustomization (lib/ship-customization.js)
```javascript
// Validate everything
ShipCustomization.validateCustomShip(template, mods)
  → returns {valid: boolean, errors: [], warnings: []}

// Validate components
ShipCustomization.validateTurrets(template, modTurrets)
ShipCustomization.validateArmor(template, newArmor)
ShipCustomization.validateThrust(template, newThrust)
ShipCustomization.validateJump(template, newJump)
ShipCustomization.validateCargoFuel(template, mods)

// Helpers
ShipCustomization.getTurretCapacity(type) → 1, 2, or 3
ShipCustomization.isValidWeapon(weaponId) → boolean
ShipCustomization.getMaxHardpoints(template) → number
ShipCustomization.getMaxArmor(template) → number
```

---

## Commands for Next Session

```bash
# Start server
node server.js

# Run tests
npm test

# Check git status
git status

# View current branch and commits
git log --oneline -5

# View Stage 12 plan
cat .claude/STAGE-12-FINALIZED-PLAN.md | less

# View this quickstart
cat .claude/STAGE-12-QUICKSTART.md | less
```

---

## Session Goals

### Primary Goal
Complete Sub-stage 12.4 (Ship Customization UI):
- ✅ Implement all 5 component panels
- ✅ Wire up state management
- ✅ Real-time cost updates
- ✅ Validation feedback
- ✅ Zero test regressions

**Estimated Time:** 3-4 hours

### Stretch Goals
If Sub-stage 12.4 finishes early, start Sub-stage 12.5 (Ship Library):
- localStorage CRUD operations
- Ship list UI
- Export/import JSON

---

## Known Issues & Gotchas

### Solo Mode (Sub-stage 12.8)

1. **AI Weapon Detection:** AI frequently says "No valid actions available" because weapon finding logic in `makeAIDecision()` (server.js:129-145) doesn't match the actual structure of `aiData.weapons`. The loop expects a nested array structure but the actual data structure is different.

2. **AI Actions:** AI makes decisions (dodge, sandcaster, fire) but only logs them - doesn't execute actual combat actions yet. The `executeAITurn()` function has TODO placeholders in the switch statement.

3. **Turn Tracker UI:** Solo mode turn tracker may not update properly - needs testing to verify it shows "Your Turn" vs "AI Turn" correctly.

### Ship Customization (Deferred)

4. **SVG Labels:** When modifications change, re-render SVG to update component labels
5. **Cargo/Fuel Sliders:** Must be linked - adjust one, other updates to maintain total
6. **Turret Capacity:** Weapon dropdowns must show/hide based on turret type
7. **Cost Display:** Always use ShipCosts.formatMCr() for display, never raw credits
8. **Validation Timing:** Validate after every modification, before save
9. **Integer Math:** All costs stored as integer credits to avoid 0.1 + 0.2 = 0.30000004

---

## Success Criteria

- ✅ All component panels functional
- ✅ Costs calculate correctly
- ✅ Validation shows errors/warnings
- ✅ State persists across component switches
- ✅ SVG updates to reflect changes
- ✅ All 161 tests still pass
- ✅ No console errors
- ✅ Responsive layout works on mobile

---

**Ready to continue? Ask:**

*"Continue Sub-stage 12.4 Part 2 - implement component panels"*

---

**Last Updated:** 2025-11-12
**Status:** Sub-stage 12.4 Part 1 complete, Part 2 ready to start
**Tests:** 161/161 passing ✅
**Next Milestone:** Complete 12.4, then 12.5 (Ship Library)
