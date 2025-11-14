# Data Source Quality Guide
## Critical: Online Sources vs. Official Rulebooks

**Date:** 2025-11-13
**Priority:** CRITICAL for data accuracy

---

## 🚨 THE PROBLEM: Version Conflicts and Invalid Canonical Specs

**Key Insight:** Online Traveller resources (wikis, fan sites, forums) often contain **invalid or outdated specifications** that don't match current Mongoose Traveller 2E rules.

### Why This Happens

1. **Multiple Traveller Versions Exist**
   - Classic Traveller (1977-1986)
   - MegaTraveller (1987-1991)
   - Traveller: The New Era (1993-1995)
   - Marc Miller's Traveller (1996-1998)
   - GURPS Traveller (1998-2008)
   - Traveller 20 (2002-2007)
   - Mongoose Traveller 1E (2008-2016)
   - Mongoose Traveller 2E (2016-present)

2. **Ship Design Rules Have Changed Between Versions**
   - Different TL requirements for components
   - Different formulas for tonnage/cost
   - Different available technologies
   - Different component options

3. **Invalid Designs Get Repeated Until They Become "Canon"**
   - Author creates ship using old rules → posted to wiki
   - Others copy the design → repeated across sites
   - Design becomes "well-known" despite being invalid
   - No validation against current rules

### Concrete Example: Small Craft Validation Failures

When creating small craft templates from online sources, ALL THREE failed validation:

#### Pinnace (40t) - From Traveller Wiki
**Online Spec:** TL9, Thrust-5
**Validation Error:** `Thrust-5 requires TL11, ship is only TL9`
**Root Cause:** Spec from older Traveller version with different TL requirements

#### Gig (20t) - From Traveller Wiki
**Online Spec:** TL9, Thrust-6, "fixed mount" weapons
**Validation Errors:**
- `Thrust-6 requires TL12, ship is only TL9`
- `Invalid turret type: fixed_mount` (should be `fixed`)
- `Invalid armour type: none` (should be `titanium_steel` with rating 0)

**Root Cause:** Multiple version mismatches

#### Tlatl Fighter (10t) - From Traveller Wiki
**Online Spec:** TL9, Thrust-6
**Validation Error:** `Thrust-6 requires TL12, ship is only TL9`
**Root Cause:** Zhodani Navy design from older edition

---

## ✅ SOLUTION: Official Source Hierarchy

### Tier 1: PRIMARY SOURCES (Always Use These)

1. **Mongoose Traveller 2E High Guard 2022 Update**
   - Ship design rules
   - Component specifications
   - TL requirements
   - Formulas and tables

2. **Official Mongoose Supplements**
   - Small Craft supplement (for craft <100t)
   - Naval Architect supplement
   - Vehicle Handbook
   - Other official sourcebooks

3. **Core Rulebook 2022 Update**
   - Basic ship rules
   - Combat mechanics
   - Character skills

### Tier 2: SECONDARY SOURCES (Use with Extreme Caution)

1. **Mongoose-Verified Community Content**
   - Official forum posts by Mongoose staff
   - Verified errata
   - Official Q&A responses

### Tier 3: TERTIARY SOURCES (Never Use for Data Entry)

❌ **DO NOT USE for ship specifications:**
- Traveller Wiki (combines all versions)
- Fan sites (often outdated)
- Forums (mix of editions)
- Third-party tools (may use old rules)
- AI-generated content (often mixes versions)

**Use Only For:** Inspiration, names, lore, narrative elements

---

## 📋 DATA VALIDATION PROTOCOL

### Before Creating Any Ship Template:

**Step 1: Source Identification**
```markdown
Source Document: [Official Mongoose PDF name and page number]
Edition: Mongoose Traveller 2E
Publication Year: [year]
Verification: [How was accuracy confirmed?]
```

**Step 2: Component Validation**
- [ ] TL requirements checked against High Guard 2022
- [ ] Tonnage formulas match current rules
- [ ] Cost calculations match current rules
- [ ] Component types match validation module constants
- [ ] Power requirements validated
- [ ] All tests pass with 100% success rate

**Step 3: Documentation**
```json
{
  "notes": "Specifications from Mongoose High Guard 2022 p.XX. Verified against lib/ship-*.js validation modules. All validation tests pass.",
  "sourceDocument": "High Guard 2022",
  "sourcePage": "XX",
  "verifiedDate": "2025-11-13"
}
```

---

## 🎯 CURRENT PROJECT STATUS

### Validation Modules Implemented (Tier 1 Authority)

Our validation modules in `lib/ship-*.js` are based on **Mongoose Traveller 2E High Guard 2022**:

- `lib/ship-manoeuvre-drive.js` - TL requirements for thrust (p.18)
- `lib/ship-weapons.js` - Turret types and weapon specs
- `lib/ship-armour.js` - Armor types and calculations (p.13)
- `lib/ship-power-plant.js` - Power plant types and output
- `lib/ship-sensors.js` - Sensor grades
- `lib/ship-bridge.js` - Bridge types by tonnage
- `lib/ship-staterooms.js` - Crew requirements
- `lib/ship-jump-drive.js` - Jump drive specifications

**These modules ARE the canonical source for this project.**
Any ship template must pass validation by these modules.

### Known Validation Constants

**Turret Types:** (from `lib/ship-weapons.js:4-10`)
```javascript
{
  fixed: { tl: 7, tonnage: 0, hardpoints: 0, cost: 100000 },
  single: { tl: 7, tonnage: 1, hardpoints: 1, cost: 200000 },
  double: { tl: 8, tonnage: 1, hardpoints: 1, cost: 500000 },
  triple: { tl: 9, tonnage: 1, hardpoints: 1, cost: 1000000 },
  popup: { tl: 10, tonnage: 0, hardpoints: 1, cost: 1000000 }
}
```

**Armor Types:** (from `lib/ship-armour.js:5-30`)
```javascript
{
  titanium_steel: { tl: 7, percentPerPoint: 2.5, costPerTon: 50000 },
  crystaliron: { tl: 10, percentPerPoint: 1.25, costPerTon: 200000 },
  bonded_superdense: { tl: 14, percentPerPoint: 0.80, costPerTon: 500000 },
  molecular_bonded: { tl: 16, percentPerPoint: 0.50, costPerTon: 1500000 }
}
```
Note: For no armor, use rating 0 with valid type (e.g., `titanium_steel`)

**Thrust TL Requirements:** (from `lib/ship-manoeuvre-drive.js:54-69`)
```javascript
{
  0: 9,  1: 9,
  2: 10, 3: 10,
  4: 11, 5: 11,
  6: 12, 7: 12,
  8: 13, 9: 13,
  10: 16, 11: 17
}
```

---

## 🔍 OFFICIAL SOURCE NEEDED

### Mongoose Small Craft Supplement

**Status:** Not yet acquired
**Needed For:** Accurate specifications for craft <100 tons

**Small craft affected:**
- Fighters (10t)
- Shuttles (20t)
- Pinnaces (40t)
- Cutters (50t)
- Ship's boats (30t)
- Others

**Action Required:** Search for and request official Mongoose small craft PDF from user

---

## ✅ STANDARD PRACTICE GOING FORWARD

### For All Future Data Entry:

1. **NEVER use online sources for specifications**
2. **ALWAYS use official Mongoose PDFs**
3. **ALWAYS validate against lib/ship-*.js modules**
4. **ALWAYS run full test suite before committing**
5. **ALWAYS document source in template notes field**

### Template Notes Field Format:

```json
{
  "notes": "Specifications from [Document] page [X]. [Brief description]. Verified [date] against Mongoose 2E High Guard 2022 validation modules. All tests pass."
}
```

### If Official Source Not Available:

```json
{
  "notes": "UNVERIFIED: Specifications based on online sources - may not match official Mongoose rules. Requires verification against official small craft supplement. Created [date]."
}
```

---

## 📊 QUALITY METRICS

### Success Criteria for Ship Templates:

- [ ] Source: Official Mongoose PDF (title + page number documented)
- [ ] Validation: 100% pass rate on `validateCompleteShip()`
- [ ] Tests: All automated tests pass
- [ ] Documentation: Source properly cited in notes
- [ ] Version: Confirmed Mongoose Traveller 2E (2022 Update)

### Failure Indicators:

- ❌ Source: "Based on Traveller Wiki"
- ❌ Source: "From online forum post"
- ❌ Source: "Community design"
- ❌ Validation: Any errors from lib/ship-*.js modules
- ❌ Documentation: No source cited

---

## 🎯 LESSON LEARNED

**Online sources are UNSAFE for data entry.**

They mix versions, propagate errors, and create invalid "canonical" designs. The only safe path is:

1. Official Mongoose PDFs → 2. Our validation modules → 3. Ship templates

**This applies to ALL game system implementations:**
- D&D (PHB vs. homebrew)
- Pathfinder (official vs. wikis)
- Shadowrun (core rules vs. fan content)
- Any RPG system with multiple editions

**Golden Rule:** If it doesn't come from an official rulebook, it's not canonical for the current edition.

---

**Created:** 2025-11-13
**Last Updated:** 2025-11-13
**Status:** ACTIVE - Enforce strictly for all data entry
