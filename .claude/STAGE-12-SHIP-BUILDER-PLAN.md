# Stage 12: Ship Builder Tool ⭐

**Priority:** CRITICAL (Moved from Stage 16)
**Estimated:** ~15k tokens, 3-4 weeks hobby pace, ~800 LOC production, ~400 LOC test
**Dependencies:** Stage 11 complete

---

## Why This is Stage 12 (Not Stage 16)

**User Vision:**
> "Want both a playable VTT for using in game and a tool for building and customizing starships."

**Original Plan:** Ship builder was buried in Stage 16 (Advanced Features)
**Problem:** Your Tuesday group wants to design their own ships NOW, not 6 months from now
**Solution:** Move to Stage 12, immediately after missiles/UI polish

**Impact:**
- Players can design custom ships for your campaigns
- Enables unique combat scenarios (YOUR ship designs)
- Demonstrates UX/UI skill (portfolio value)
- Foundation for High Guard expansion (Stage 20)

---

## Acceptance Criteria

### Core Functionality
- [ ] Visual ship designer interface
- [ ] Hull selection (100-2000 tons, Core Rulebook)
- [ ] Turret configuration (single, double, triple)
- [ ] Weapon assignment to turrets
- [ ] Armor customization (0-15)
- [ ] Ship stats calculation (tonnage, cost, performance)
- [ ] Save custom ships to JSON (download)
- [ ] Load custom ships in combat mode
- [ ] Pre-built ship templates (Scout, Trader, Corsair, etc.)

### Data Validation
- [ ] Ship tonnage limits enforced
- [ ] Turret count based on tonnage
- [ ] Weapon compatibility with turret type
- [ ] Cost calculations accurate to rules
- [ ] Power plant requirements validated
- [ ] Fuel requirements validated

### UI/UX
- [ ] Intuitive drag-and-drop or click-to-add interface
- [ ] Real-time cost/tonnage tracking
- [ ] Visual ship preview (side view or schematic)
- [ ] Error messages for invalid configurations
- [ ] Undo/redo functionality
- [ ] Ship name/description customization

### Integration
- [ ] Custom ships appear in ship selection screen
- [ ] Custom ships work in multiplayer combat
- [ ] Ship JSON format matches existing registry
- [ ] Backward compatibility with pre-built ships

### Testing
- [ ] 40+ unit tests (validation, calculations)
- [ ] 20+ integration tests (UI, save/load, combat)
- [ ] Manual testing with Tuesday group
- [ ] No regressions in existing combat system

---

## Implementation Plan

### Sub-stage 12.1: Ship Builder Data Model (2-3 days)

**Scope:**
- Extend ship JSON schema for custom ships
- Add validation rules for ship construction
- Hull database (100-2000 tons, with tonnage-based limits)
- Turret database (single, double, triple)
- Component database (power plants, M-drives, J-drives)

**Files:**
- `data/hulls.json` - Hull types with tonnage/cost/limits
- `lib/ship-builder.js` - Ship validation and calculation logic
- `tests/unit/ship-builder.test.js` - 20+ tests

**Validation Rules:**
```javascript
// Turret limits based on tonnage
function getMaxTurrets(tonnage) {
  return Math.floor(tonnage / 100);
}

// Power requirements
function calculatePowerNeeds(ship) {
  const mDrivePower = ship.thrust * ship.tonnage / 10;
  const weaponPower = ship.turrets.reduce((sum, t) => sum + t.weapons.reduce(...));
  return mDrivePower + weaponPower;
}

// Cost calculation
function calculateCost(ship) {
  const hullCost = ship.tonnage * 1000; // MCr 0.001 per ton
  const armorCost = ship.armor * ship.tonnage * 1000; // MCr 0.001 per ton per point
  const turretCost = ship.turrets.length * 200000; // MCr 0.2 per turret
  // ... etc
  return hullCost + armorCost + turretCost;
}
```

### Sub-stage 12.2: Ship Builder UI (4-5 days)

**Scope:**
- New page: `/ship-builder.html`
- Multi-step wizard interface
  - Step 1: Choose hull (tonnage)
  - Step 2: Configure turrets
  - Step 3: Assign weapons
  - Step 4: Customize armor
  - Step 5: Review & save
- Real-time validation and feedback
- Ship preview panel (stats, cost)

**Files:**
- `public/ship-builder.html` - Ship builder page
- `public/ship-builder.js` - Ship builder client logic
- `public/css/ship-builder.css` - Ship builder styles

**UI Mock:**
```
┌─────────────────────────────────────────────────────────┐
│ TRAVELLER SHIP BUILDER                                  │
├──────────────────┬──────────────────────────────────────┤
│  1. Hull         │  Ship Stats                          │
│  2. Turrets      │                                      │
│  3. Weapons      │  Name: [Custom Scout        ]        │
│  4. Armor        │  Tonnage: 100 tons                   │
│  5. Review       │  Turrets: 1 / 1                      │
│                  │  Armor: 4                            │
│  [100 tons] ◉    │  Cost: MCr 32.5                      │
│  [ ] 200 tons    │  Thrust: 3                           │
│  [ ] 400 tons    │  Jump: 2                             │
│  [ ] 600 tons    │  Power: 12 / 15                      │
│  [ ] 800 tons    │                                      │
│  [ ] 1000 tons   │  ┌────────────────────────────────┐  │
│  [ ] 2000 tons   │  │  [  Ship Schematic   ]         │  │
│                  │  │                                │  │
│  [Next: Turrets] │  │    ┌──────────────┐            │  │
│                  │  │    │   \  □  /    │ 100t       │  │
│                  │  │    │    \ | /     │            │  │
│                  │  │    │     \|/      │ Armor: 4   │  │
│                  │  │    └──────────────┘            │  │
│                  │  └────────────────────────────────┘  │
└──────────────────┴──────────────────────────────────────┘
```

### Sub-stage 12.3: Ship Templates (2-3 days)

**Scope:**
- Pre-built templates for common ships
  - Scout (100 tons)
  - Free Trader (200 tons)
  - Subsidized Merchant (400 tons)
  - Corsair (400 tons, armed)
  - Patrol Ship (400 tons, military)
- "Start from template" feature in builder
- "Duplicate & modify" existing ships

**Files:**
- `data/templates/` - JSON templates
- Update ship registry to include templates
- UI for template selection

### Sub-stage 12.4: Save/Load Custom Ships (2-3 days)

**Scope:**
- Export ship to JSON (download file)
- Import ship from JSON (upload file)
- Browser localStorage for quick save
- Ship library UI (manage saved ships)
- Delete/rename saved ships

**Files:**
- `lib/ship-library.js` - localStorage manager
- Update `public/ship-builder.js` - Save/load UI
- Update `public/app.js` - Load custom ships in combat

**Storage Format:**
```javascript
// localStorage key: 'traveller_ships'
{
  "custom_ships": [
    {
      "id": "uuid-1234-5678",
      "name": "The Wandering Star",
      "created": "2025-11-11T10:30:00Z",
      "modified": "2025-11-11T11:45:00Z",
      "ship": { /* full ship JSON */ }
    }
  ]
}
```

### Sub-stage 12.5: Combat Integration (2-3 days)

**Scope:**
- Custom ships appear in ship selection dropdown
- Filter ships (pre-built vs. custom)
- Ship validation before combat starts
- Multiplayer sync for custom ships
- Handle missing ships gracefully (if opponent has custom ship you don't)

**Files:**
- Update `public/app.js` - Ship selection with custom ships
- Update `server.js` - Validate custom ships on join
- Update Socket.io events - Send custom ship data

**Edge Cases:**
- Player 1 has custom ship, Player 2 doesn't (server sends ship data)
- Invalid custom ship (server rejects, shows error)
- Custom ship with non-existent weapons (validation error)

### Sub-stage 12.6: Testing & Polish (2-3 days)

**Scope:**
- Comprehensive unit tests (validation, calculations)
- Integration tests (save/load, combat)
- Manual testing with Tuesday group
- Bug fixes and UX improvements
- Documentation update

**Tests:**
- Ship builder validation (20+ tests)
- Cost calculations (10+ tests)
- Save/load (10+ tests)
- Combat integration (10+ tests)
- Edge cases (10+ tests)

---

## Technical Specifications

### Hull Database Schema
```json
{
  "hulls": [
    {
      "tonnage": 100,
      "maxTurrets": 1,
      "maxArmor": 15,
      "baseCost": 100000,
      "description": "Small craft, suitable for scouts or couriers"
    },
    {
      "tonnage": 200,
      "maxTurrets": 2,
      "maxArmor": 12,
      "baseCost": 200000,
      "description": "Light freighter or trader"
    }
    // ... etc
  ]
}
```

### Ship JSON Format (Extended)
```json
{
  "id": "custom-wandering-star",
  "name": "The Wandering Star",
  "role": "custom",
  "tonnage": 400,
  "hull": 80,
  "maxHull": 80,
  "armour": 6,
  "thrust": 3,
  "agility": 0,
  "cost": 145000000,
  "turrets": [
    {
      "type": "triple",
      "weapons": ["beam-laser", "beam-laser", "missile-rack"]
    },
    {
      "type": "double",
      "weapons": ["pulse-laser", "sandcaster"]
    }
  ],
  "crew": {
    "pilot": null,
    "gunners": []
  },
  "customization": {
    "description": "Modified Subsidized Merchant with enhanced weapons",
    "notes": "Designed for pirate hunting in the Spinward Marches",
    "created": "2025-11-11",
    "author": "Bruce"
  }
}
```

### Validation Rules (Traveller 2e Core Rulebook)

**Tonnage Limits:**
- 100-2000 tons (Core Rulebook)
- 1000-10000 tons (High Guard, Stage 20)

**Turret Limits:**
- 1 turret per 100 tons of hull
- Examples: 100t = 1 turret, 400t = 4 turrets, 2000t = 20 turrets

**Turret Types:**
- Single: 1 weapon
- Double: 2 weapons (same or different)
- Triple: 3 weapons (same or different)

**Armor Limits:**
- TL 7-9: Max 4
- TL 10-12: Max 6
- TL 13-14: Max 8
- TL 15+: Max 15

**Cost Calculations (Simplified):**
- Hull: MCr 0.1 per 10 tons
- Armor: MCr 0.05 per point per 10 tons
- Turret: MCr 0.2 (single), 0.5 (double), 1.0 (triple)
- Weapons: Varies (beam laser MCr 1, pulse laser MCr 2, missile rack MCr 0.75)

**Power Requirements:**
- M-Drive: (Thrust × Tonnage) ÷ 10 Power
- Weapons: Beam laser 1, Pulse laser 2, Missile 0, Sandcaster 0
- Total must not exceed power plant output

---

## UI/UX Design Principles

### 1. Wizard-style Interface
- Multi-step process (5 steps)
- Clear navigation (prev/next buttons)
- Progress indicator (step 3 of 5)
- Can jump between steps (non-linear)

### 2. Real-time Feedback
- Instant validation messages
- Cost updates as you add components
- Tonnage usage bar (70 / 100 tons)
- Power usage bar (12 / 15 power)

### 3. Visual Clarity
- Large, clickable tiles for selection
- Icons for component types
- Color coding (valid = green, invalid = red)
- Tooltips with rule explanations

### 4. Error Prevention
- Disable invalid options (grayed out)
- Warning messages before costly mistakes
- Confirmation dialogs for delete operations
- Auto-save to localStorage (prevent data loss)

### 5. Flexibility
- Start from scratch OR template
- Save at any step (draft mode)
- Export to JSON (share designs)
- Import from JSON (use community designs)

---

## Testing Strategy

### Unit Tests (40+ tests)
1. **Hull Selection** (5 tests)
   - Valid tonnage selection
   - Max turrets calculation
   - Max armor calculation
   - Cost calculation

2. **Turret Configuration** (10 tests)
   - Turret count validation
   - Weapon assignment validation
   - Power calculation
   - Cost calculation

3. **Weapon Assignment** (10 tests)
   - Weapon compatibility with turrets
   - Duplicate weapon handling
   - Weapon cost calculation
   - Ammo tracking

4. **Armor Customization** (5 tests)
   - Armor limits by TL
   - Armor cost calculation
   - Armor tonnage impact

5. **Ship Validation** (10 tests)
   - Complete ship validation
   - Invalid configurations rejected
   - Edge cases (zero armor, max armor, etc.)

### Integration Tests (20+ tests)
1. **Builder UI** (10 tests)
   - Page loads successfully
   - Step navigation works
   - Real-time validation displays
   - Preview panel updates

2. **Save/Load** (5 tests)
   - Export to JSON
   - Import from JSON
   - localStorage persistence
   - Ship library CRUD

3. **Combat Integration** (5 tests)
   - Custom ship appears in selection
   - Custom ship works in combat
   - Multiplayer sync
   - Validation errors handled

### Manual Testing (Tuesday Group)
- **Test 1:** Design a ship from scratch
- **Test 2:** Modify a template
- **Test 3:** Save and reload
- **Test 4:** Use in combat (local)
- **Test 5:** Use in combat (multiplayer)

---

## Risk Assessment

### Medium Risks ⚠️
- **UI Complexity:** Many form fields, validation logic
  - *Mitigation:* Start with simple wizard, iterate based on feedback
- **Data Validation:** Many edge cases, rule interactions
  - *Mitigation:* Comprehensive unit tests, incremental validation
- **JSON Compatibility:** Custom ships must work with existing system
  - *Mitigation:* Strict schema validation, backward compatibility tests

### Low Risks ✅
- **localStorage:** Well-supported browser API
- **JSON Export/Import:** Standard file operations
- **Template System:** Copy existing ship JSON
- **Cost Calculations:** Well-defined rules

---

## Success Criteria

### Minimum Viable Product (MVP)
- [ ] Can design 100-ton Scout with 1 turret
- [ ] Can save and reload ship
- [ ] Ship works in single-player combat
- [ ] Basic validation prevents invalid ships

### Complete Implementation
- [ ] All acceptance criteria met
- [ ] 60+ tests passing
- [ ] Tuesday group successfully uses it
- [ ] No regressions in combat system
- [ ] Documentation updated

### Stretch Goals (Optional)
- [ ] Ship comparison tool (compare 2 designs)
- [ ] Ship stats export (PDF or text)
- [ ] Ship gallery (browse community designs)
- [ ] Ship versioning (track design history)

---

## Files to Create/Modify

### New Files
- `public/ship-builder.html` - Ship builder page
- `public/ship-builder.js` - Ship builder client logic (~600 LOC)
- `public/css/ship-builder.css` - Ship builder styles (~200 LOC)
- `lib/ship-builder.js` - Ship builder server logic (~300 LOC)
- `lib/ship-library.js` - Ship library manager (~100 LOC)
- `data/hulls.json` - Hull database
- `data/templates/*.json` - Ship templates
- `tests/unit/ship-builder.test.js` - Unit tests (~400 LOC)
- `tests/integration/ship-builder.test.js` - Integration tests (~200 LOC)

### Modified Files
- `public/app.js` - Load custom ships in combat
- `public/index.html` - Add "Ship Builder" link
- `server.js` - Ship validation, custom ship sync
- `lib/ship-registry.js` - Support custom ships
- `README.md` - Document ship builder feature

---

## Estimated Effort

### Time Breakdown (Hobby Pace)
- Sub-stage 12.1 (Data model): 2-3 days
- Sub-stage 12.2 (UI): 4-5 days
- Sub-stage 12.3 (Templates): 2-3 days
- Sub-stage 12.4 (Save/load): 2-3 days
- Sub-stage 12.5 (Combat integration): 2-3 days
- Sub-stage 12.6 (Testing/polish): 2-3 days
- **Total:** 14-20 days = 3-4 weeks

### Token Budget
- Planning/design: 2k tokens
- Implementation: 10k tokens
- Testing: 2k tokens
- Documentation: 1k tokens
- **Total:** ~15k tokens

### Lines of Code
- Production: ~800 LOC
- Tests: ~400 LOC
- **Total:** ~1,200 LOC

---

## Dependencies

### Prerequisites
- Stage 11 complete (Missiles & UI)
- Ship registry system working (Stage 8.1A)
- Combat system stable (Stages 8-10)

### Blockers
- None (all prerequisites complete)

---

## Handoff Notes

### For Stage 13 (Boarding)
- Custom ships should support crew customization
- Boarding actions work with custom ships
- Ship interior layout (future enhancement)

### For Stage 20 (High Guard)
- Ship builder extends to 1000-10000 tons
- Bay weapons, spinal mounts
- Advanced component selection
- Construction point system (optional)

---

## Questions for User

1. **Simplified or Full Rules?**
   - Simplified: Pick components from menu (faster, easier)
   - Full: Implement construction point system (accurate, complex)
   - **Recommendation:** Start simplified, add full rules in Stage 20

2. **Ship Sharing?**
   - Just local (JSON export/import)
   - OR: Central repository (players upload designs)
   - **Recommendation:** Start local, add repository in Stage 18

3. **Visual Preview?**
   - Text stats only (fast)
   - OR: Simple schematic (side view)
   - OR: 3D model (ambitious, Stage 21)
   - **Recommendation:** Simple schematic (Stage 12), 3D later

4. **Tech Level Restrictions?**
   - Allow any TL components (permissive)
   - OR: Enforce TL limits (strict, rules-accurate)
   - **Recommendation:** Enforce TL limits (authenticity)

---

**Next Steps:**
1. User approval of plan
2. Begin Sub-stage 12.1 (Data model)
3. Iterate based on Tuesday group feedback
4. Complete Stage 12 before Stage 13 (Boarding)

---

**Status:** 📋 PLANNED, AWAITING STAGE 11 COMPLETION
**Priority:** ⭐ CRITICAL (User-requested core feature)
**Estimated Completion:** 3-4 weeks after Stage 11
