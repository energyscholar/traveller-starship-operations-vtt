# Next Session Plan - Stage 12 Continuation

**Session Date**: TBD
**Current Status**: Jump drive validation complete, V2 templates designed, strategic planning documented
**Branch**: main (not merged yet)

---

## Priority 1: Autonomous Tasks (Claude Can Do Alone)

These tasks require no user decisions and can be completed independently:

### A. Component Validation Modules (High Priority)

**Estimated Time**: 3-4 hours

1. **Create Manoeuvre Drive Module** (`lib/ship-manoeuvre-drive.js`)
   - Calculate tonnage: `Hull × Thrust × 1%`
   - Calculate power required: `Hull × Thrust × 10%`
   - Calculate cost: `Tonnage × MCr 2`
   - TL requirements (Thrust 1-2: TL9, Thrust 3-4: TL10, etc.)
   - Unit tests (30+ tests)
   - ✅ Can do autonomously - all formulas extracted

2. **Create Power Plant Module** (`lib/ship-power-plant.js`)
   - Calculate power output needed
   - Validate fusion type by TL
   - Calculate fuel requirements
   - Unit tests (25+ tests)
   - ✅ Can do autonomously - all formulas extracted

3. **Create Sensors Module** (`lib/ship-sensors.js`)
   - Validate sensor grades (basic through advanced)
   - Calculate tonnage and cost by grade
   - Power requirements
   - Unit tests (20+ tests)
   - ✅ Can do autonomously - all data extracted

4. **Create Bridge Module** (`lib/ship-bridge.js`)
   - Calculate bridge size by hull tonnage
   - Calculate cost (MCr 0.5 per 100t hull)
   - Cockpit vs. standard bridge logic
   - Unit tests (15+ tests)
   - ✅ Can do autonomously - all formulas extracted

5. **Create Staterooms Module** (`lib/ship-staterooms.js`)
   - Standard (4t, MCr 0.5)
   - Luxury (10t, MCr 1.5)
   - Barracks (1t/person, MCr 0.05/person)
   - Low berths (0.5t, Cr 50,000)
   - Unit tests (15+ tests)
   - ✅ Can do autonomously - all data extracted

6. **Create Weapons Module** (`lib/ship-weapons.js`)
   - Turret types and capacities
   - Weapon costs and power requirements
   - Hardpoint calculations (1 per 100t)
   - Unit tests (30+ tests)
   - ✅ Can do autonomously - all data extracted

7. **Create Armour Module** (`lib/ship-armour.js`)
   - Calculate tonnage with hull size multipliers
   - Cost calculations by armour type
   - TL restrictions
   - Unit tests (20+ tests)
   - ✅ Can do autonomously - all formulas extracted

### B. Additional Ship Templates (Medium Priority)

**Estimated Time**: 2-3 hours

8. **Create Patrol Corvette Template** (`data/ships/v2/patrol_corvette.json`)
   - 400t military vessel with full specs
   - Dual cutters (Ship's Boat + G/Carrier)
   - Triple turrets (pulse lasers, missile racks)
   - ✅ Can do autonomously - all data extracted from High Guard

9. **Create Mercenary Cruiser Template** (`data/ships/v2/mercenary_cruiser.json`)
   - 800t sphere hull with full specs
   - Modular cutters, barracks for 30 troops
   - Energy-efficient M-drive
   - ✅ Can do autonomously - all data extracted

10. **Create Subsidised Liner Template** (`data/ships/v2/subsidised_liner.json`)
    - Extract from High Guard PDF
    - 600t passenger vessel
    - ✅ Can do autonomously - PDF available

11. **Create Safari Ship Template** (`data/ships/v2/safari_ship.json`)
    - Extract from High Guard PDF
    - 200t luxury exploration vessel
    - ✅ Can do autonomously - PDF available

### C. Data Extraction & Documentation (Low Priority)

**Estimated Time**: 2 hours

12. **Extract Remaining Component Specs**
    - Fuel scoops and fuel processors
    - Workshops, medical bays, laboratories
    - Cargo cranes, loading belts
    - Probe drones, repair drones
    - Add to EXTRACTED-SHIP-DATA.md
    - ✅ Can do autonomously - PDF available

13. **Create Component Cost Reference**
    - Single master document with all costs
    - Organized by category
    - Quick lookup table
    - ✅ Can do autonomously

14. **Write Migration Guide**
    - Document how to convert V1 to V2 templates
    - Code examples
    - Migration script if needed
    - ✅ Can do autonomously

### D. Testing & Validation (Medium Priority)

**Estimated Time**: 1-2 hours

15. **Create Integration Tests**
    - Test complete ship validation
    - Validate Scout against High Guard specs
    - Validate Free Trader against specs
    - ✅ Can do autonomously

16. **Create Validation Helper**
    - Master validation function
    - Combines all component validators
    - Returns comprehensive error report
    - ✅ Can do autonomously

17. **Add Schema Validation**
    - JSON schema validation for V2 templates
    - Automated checks in tests
    - ✅ Can do autonomously

### E. Code Organization (Low Priority)

**Estimated Time**: 1 hour

18. **Create Index Files**
    - `lib/index.js` - Export all modules
    - `lib/validators/index.js` - Export all validators
    - Clean module structure
    - ✅ Can do autonomously

19. **Add JSDoc Documentation**
    - Document all public functions
    - Type annotations
    - Usage examples
    - ✅ Can do autonomously

20. **Create Developer Guide**
    - How to add new ship components
    - How to add new templates
    - Testing guidelines
    - ✅ Can do autonomously

---

## Priority 2: Tasks Requiring User Decisions

These tasks need user input or design decisions:

### A. UI/UX Implementation (Requires User Input)

21. **Integrate V2 Templates into UI**
    - Decision: Update existing ship-customizer.js or create new file?
    - Decision: Show component breakdown in UI?
    - Decision: Display tonnage/cost for each component?
    - ❓ Needs user preferences

22. **Add Component Detail Panel**
    - Decision: Where to show detailed component specs?
    - Decision: Inline vs. modal vs. sidebar?
    - Decision: What level of detail to show?
    - ❓ Needs user design input

23. **Update Cost Display**
    - Decision: Show breakdown by component category?
    - Decision: Real-time validation feedback?
    - Decision: Warning/error display style?
    - ❓ Needs user UX preferences

### B. Feature Prioritization (Requires User Input)

24. **Ship SVG Generation Strategy**
    - Decision: Generate SVGs programmatically or hand-craft?
    - Decision: Level of detail in schematics?
    - Decision: Use V2 templates or keep V1 for now?
    - ❓ Needs user decision on approach

25. **Validation Integration**
    - Decision: Real-time validation or on-save?
    - Decision: Block invalid ships or just warn?
    - Decision: Show validation errors where?
    - ❓ Needs user UX design

### C. Architecture Decisions (Requires User Input)

26. **Template Version Migration**
    - Decision: Keep both V1 and V2 or migrate completely?
    - Decision: Gradual rollout or big switch?
    - Decision: Backward compatibility needed?
    - ❓ Needs user strategic decision

27. **Data Storage Strategy**
    - Decision: Continue with localStorage or add backend?
    - Decision: How to handle large ship libraries?
    - Decision: Export/import functionality needed now?
    - ❓ Needs user requirements

---

## Priority 3: Next Stage Planning

### Stage 12.6: Server-Side Ship Validation (Future)

28. **Mirror Validation on Server**
    - Prevent client-side tampering
    - Ensure fair play
    - Depends on: All validation modules complete
    - ⏳ Future stage

### Stage 12.7: Advanced Ship Customization (Future)

29. **Component-Level Customization**
    - Upgrade/downgrade individual components
    - Calculate tonnage/cost impacts
    - Real-time validation
    - Depends on: V2 templates integrated
    - ⏳ Future stage

30. **Ship Performance Calculator**
    - Jump range
    - Fuel consumption
    - Power budget
    - Crew requirements
    - ⏳ Future stage

---

## Recommended Work Order for Next Session

### If User Has 1-2 Hours:
1. Review autonomous tasks completed
2. Decide on UI integration approach (#21-23)
3. Decide on SVG strategy (#24)
4. Start UI integration work together

### If User Has 3-4 Hours:
1. All of above
2. Complete UI integration
3. Test with real ship templates
4. User testing and feedback
5. Iterate on UX

### If User Has Full Day:
1. All of above
2. Complete validation integration
3. Add remaining ship templates
4. Create comprehensive demo
5. Record demo video
6. Plan Stage 13

---

## Autonomous Work Session (Claude Solo)

**When to Do This**: User can trigger this before next session

**Scope**: Complete all Priority 1 tasks (items #1-20)

**Deliverables**:
- ✅ 7 validation modules with 155+ total unit tests
- ✅ 4 additional ship templates (Patrol Corvette, Mercenary Cruiser, Liner, Safari Ship)
- ✅ Complete component data extraction
- ✅ Integration tests
- ✅ Documentation and guides
- ✅ All tests passing

**Estimated Time**: 8-10 hours of autonomous work

**How to Trigger**:
```
User: "Please complete all autonomous tasks from the next session plan"
```

**Expected Output**:
- Git commit with all modules
- Summary report of what was completed
- Test results (all passing)
- List of user decisions still needed

---

## Current Branch Status

**Branch**: main
**Not Merged**: Intentionally kept separate for review
**Ready to Merge**: After user approval and testing

**To Merge Later**:
```bash
git checkout main
git pull origin main
# Review changes
git merge --no-ff -m "Merge Stage 12.4-12.5: Ship customization system"
git push origin main
```

---

## Testing Checklist Before Merge

- [ ] All unit tests passing (currently: 161 + 32 = 193 tests)
- [ ] Ship library CRUD working
- [ ] Jump drive validation working
- [ ] V2 templates loading correctly
- [ ] No console errors
- [ ] UI responsive
- [ ] Cross-browser testing
- [ ] User acceptance testing

---

## Documentation Status

✅ EXTRACTED-SHIP-DATA.md - Complete High Guard data
✅ STRATEGIC-BUSINESS-PLANNING.md - Financial projections and monetization
✅ UI-DESIGN-GUIDE.md - Comprehensive UI/UX guidelines
✅ CLAUDE-CODE-FEATURE-REQUESTS.md - Upload progress indicator request
✅ ship-template-v2.schema.json - Comprehensive JSON schema
✅ data/ships/v2/README.md - Template documentation

---

## Key Decision Points for User

1. **UI Integration Approach**: How to display V2 template data?
2. **SVG Strategy**: Programmatic vs. hand-crafted ship schematics?
3. **Validation Timing**: Real-time vs. on-save?
4. **Template Migration**: Keep V1 alongside V2 or full migration?
5. **Next Stage Priority**: Continue ship customization or move to Stage 13?

---

## Success Metrics

**Current Achievement**:
- ✅ 193 passing unit tests
- ✅ 3 complete ship templates (V2 format)
- ✅ Jump drive validation module
- ✅ Ship library CRUD system
- ✅ Strategic business plan with financials

**Next Milestone**:
- All 7 validation modules complete
- 8+ ship templates (V2 format)
- 350+ passing unit tests
- V2 templates integrated into UI
- User can customize ships with real-time validation

---

**Status**: Ready for next session
**Blocker**: None
**Risk**: Low
**Confidence**: High - Clear path forward with autonomous work available
