# Traveller Source Material Indexing Task
## Future AB Session Work - High Value, Zero Risk

**Date Created:** 2025-11-13
**Priority:** Medium (valuable for future development)
**Risk Level:** ZERO (pure reference work, read-only)
**Estimated Time:** 15-20 hours (can be done in multiple sessions)

---

## 🎯 TASK OVERVIEW

**Objective:** Index all available official Mongoose Traveller 2E source material for efficient future reference during development.

**Output Format:** Structured markdown indexes + searchable reference database

**Value:** Enables rapid lookup of rules, specs, tables, and mechanics during implementation

---

## 📚 SOURCE MATERIALS TO INDEX

### Tier 1: Core Rules (HIGHEST PRIORITY)

1. **Mongoose Traveller 2E Core Rulebook (2022 Update)**
   - Combat rules (personal & vehicle)
   - Character generation
   - Skills and tasks
   - Equipment catalogs

2. **High Guard 2022 Update**
   - Ship design rules ✅ (partially indexed - tables extracted)
   - Space combat rules
   - Naval careers
   - Fleet operations

3. **Small Craft Catalogue**
   - Small craft designs (<100t)
   - Fighter specs
   - Shuttle variants
   - **Status:** Pending acquisition

### Tier 2: Supplements (MEDIUM PRIORITY)

4. **Central Supply Catalogue**
   - Equipment specifications
   - Weapons and armor
   - Vehicles
   - Tech Level availability

5. **Vehicle Handbook**
   - Ground vehicle rules
   - Aircraft specifications
   - Vehicle combat

6. **Mercenary (2E)**
   - Military units
   - Mercenary tickets
   - Military equipment

7. **Robot Handbook**
   - Robot design
   - AI rules
   - Drones

### Tier 3: Campaign Setting (LOWER PRIORITY)

8. **The Third Imperium**
   - Setting lore
   - Polities and factions
   - Historical timeline

9. **Sector Sourcebooks**
   - Spinward Marches
   - Trojan Reach
   - Others as available

---

## 📋 INDEX STRUCTURE

### For Each Sourcebook:

```markdown
# [Sourcebook Name] - Quick Reference Index

## Meta Information
- **Edition:** Mongoose Traveller 2E
- **Publication Date:** [year]
- **Page Count:** [pages]
- **ISBN:** [if available]
- **Official:** ✅ Yes

## Chapter Index

### Chapter X: [Name]
**Pages:** [start]-[end]
**Topics:** [list]

#### Key Tables
- Table X.Y: [Name] (p. [page]) - [brief description]
- [Extracted: Yes/No]

#### Key Rules
- [Rule name] (p. [page]) - [one-line summary]

#### Formulas
- [Formula name]: [formula] (p. [page])

#### Examples
- [Example scenario] (p. [page])

## Quick Lookup

### Combat Mechanics
- Initiative: p. [X]
- Attack resolution: p. [Y]
- Damage: p. [Z]

### Ship Design
- Hull costs: p. [X]
- Drive formulas: p. [Y]
- Weapon mounts: p. [Z]

[etc.]

## Cross-References
- Links to Core Rulebook: p. [pages]
- Links to High Guard: p. [pages]
- Errata: [URL or note]
```

---

## 🔍 INDEXING METHODOLOGY

### Phase 1: Document Scan (per book, 2-3h)
1. Read table of contents
2. Scan each chapter for:
   - Tables (extract or note page)
   - Formulas (extract)
   - Key rules (summarize + page ref)
   - Examples (note page for later reference)
3. Create chapter-by-chapter index

### Phase 2: Cross-Reference (per book, 1-2h)
1. Identify rules that reference other books
2. Note page cross-references
3. Flag contradictions or errata
4. Create topic-based quick lookup

### Phase 3: Extraction (per book, 2-4h)
1. Extract all tables to markdown/JSON
2. Extract all formulas
3. Create searchable database entries
4. Verify accuracy against source

---

## 📊 OUTPUT DELIVERABLES

### Documentation Files

```
docs/reference/
├── core-rulebook-index.md
├── high-guard-index.md          ✅ (tables extracted)
├── small-craft-catalogue-index.md
├── central-supply-catalogue-index.md
├── [other-sourcebooks]-index.md
└── quick-reference/
    ├── combat-rules.md           (aggregated from all sources)
    ├── ship-design-rules.md      ✅ (partially complete)
    ├── character-generation.md
    ├── equipment-catalog.md
    └── formulas-all.md
```

### Data Files

```
data/reference/
├── tables/
│   ├── core-rulebook/
│   ├── high-guard/              ✅ (some tables extracted)
│   └── [other-sourcebooks]/
├── formulas/
│   ├── ship-design.json
│   ├── character-stats.json
│   └── combat-mechanics.json
└── cross-references/
    └── rule-dependencies.json
```

---

## ⚖️ COPYRIGHT & LEGAL CONSIDERATIONS

### Current Legal Status

**We DO NOT have a contract with Mongoose Publishing.**

**We ARE working toward a contract:**
- Goal: Licensing agreement for commercial VTT integration
- Strategy: Build value, demonstrate capability, approach professionally
- Monetization plan: Revenue sharing that benefits Mongoose

**We MUST NOT jeopardize future contract negotiations.**

---

### Copyright Compliance Strategy

#### ✅ SAFE: What We CAN Do

1. **Extract Mechanical Data**
   - Formulas (mathematical calculations)
   - Game mechanics (rules systems)
   - Statistics (ship specs, weapon damage, etc.)
   - **Rationale:** Game mechanics are not copyrightable (only expression is)

2. **Create Derivative Reference Materials**
   - Indexes pointing to page numbers
   - Quick reference sheets (our own wording)
   - Summary tables (reformatted, our structure)
   - **Rationale:** Fair use for reference + transformative work

3. **Implement Game Systems**
   - Combat resolution engine
   - Ship design validation
   - Character generation mechanics
   - **Rationale:** Implementing rules ≠ copying text

4. **Use Official Terms**
   - "Traveller"
   - Ship names (Type-S Scout, etc.)
   - Game-specific terminology
   - **Rationale:** Nominative fair use + trademark notice

#### ⚠️ RISKY: What We Should MINIMIZE

1. **Verbatim Text Copying**
   - Don't copy flavor text word-for-word
   - Don't copy rule explanations verbatim
   - Paraphrase and summarize instead
   - **Risk:** Direct copyright infringement

2. **Large Table Reproduction**
   - Don't copy entire books' worth of tables
   - Extract only what's needed for implementation
   - Create our own formatted versions
   - **Risk:** Substantial similarity claims

3. **Setting Lore**
   - Minimize use of detailed setting descriptions
   - Focus on mechanics, not narrative
   - Reference official sources for lore
   - **Risk:** Derivative work claims

#### ❌ NEVER DO: What Could Destroy Project

1. **Distribute Scanned PDFs**
   - Never host official PDFs
   - Never create PDF repositories
   - Never share rulebook files
   - **Risk:** DMCA takedown + lawsuit

2. **Compete with Mongoose's Products**
   - Don't create "free rulebook" alternatives
   - Don't undermine their PDF sales
   - Add value, don't replace their products
   - **Risk:** Loss of goodwill + legal action

3. **Ignore Trademark**
   - Always include Mongoose trademark notice
   - Use proper attribution
   - Never claim official endorsement
   - **Risk:** Trademark infringement

---

### Trademark Notice (Required)

**Standard Attribution:**
```
The Traveller game in all forms is owned by Far Future Enterprises.
Copyright © 1977-2024 Far Future Enterprises.

Mongoose Traveller 2nd Edition is published by Mongoose Publishing Ltd
under license from Far Future Enterprises.

This software is not affiliated with, endorsed by, or officially
connected to Far Future Enterprises or Mongoose Publishing Ltd.

Traveller is a registered trademark of Far Future Enterprises.
Used under fair use for game system implementation.
```

**Place on:**
- README.md ✅ (already present)
- About page in application
- Any documentation distributed publicly

---

### Fair Use Analysis

**For indexing and reference creation:**

1. **Purpose:** Educational and transformative (creating reference tools)
2. **Nature:** Factual game mechanics (less protection than creative works)
3. **Amount:** Only what's necessary for implementation
4. **Market Effect:** **POSITIVE** - drives interest in official books

**Conclusion:** Indexing for development reference is defensible fair use IF:
- We don't redistribute full rulebook content
- We transform and add value
- We properly attribute
- We pursue licensing for commercial use

---

## 🤝 MONGOOSE RELATIONSHIP STRATEGY

### Short-Term (Current - No Contract)

**Do:**
- ✅ Build high-quality VTT implementation
- ✅ Demonstrate professional development
- ✅ Respect copyright scrupulously
- ✅ Add value to Traveller ecosystem
- ✅ Maintain proper attribution

**Don't:**
- ❌ Make bold copyright claims
- ❌ Distribute their content
- ❌ Compete with their products
- ❌ Ignore cease-and-desist if received

### Medium-Term (Contract Negotiation)

**Leverage:**
- "We built a professional VTT"
- "We drive players to buy your rulebooks"
- "We can integrate with your OBS store"
- "Revenue sharing proposal"

**Proposal:**
- License official Traveller branding
- Revenue share on VTT subscriptions
- Drive rulebook sales via in-app links
- Official partnership announcement

### Long-Term (Post-Contract)

**With official license:**
- Full integration with Mongoose content
- Official branding and endorsement
- Deeper rulebook integration
- Potential expansion to other Mongoose games

---

## 📈 RISK ASSESSMENT

### Indexing Task Risk Analysis

| Risk Factor | Score (0-10) | Weight | Weighted Score |
|-------------|--------------|--------|----------------|
| **Zero dependencies** | 10 | 3× | 30 |
| **Based on stable spec** | 10 | 3× | 30 |
| **Pure data/function** | 10 | 2× | 20 |
| **Easy to test** | 8 | 2× | 16 |
| **Won't change** | 10 | 3× | 30 |
| **Time investment** | 7 (15-20h) | 1× | 7 |

**Total:** 133/140 = 95% → **ZERO RISK** ✅

**Safe for autonomous sessions:** YES

**Copyright Risk:** LOW (if following guidelines above)

---

## 🎯 RECOMMENDED AB SESSION APPROACH

### Session 1: Core Rulebook (6-8h)
- Index chapters
- Extract combat tables
- Extract character generation mechanics
- Create quick reference

### Session 2: High Guard Completion (4-6h)
- Complete remaining High Guard tables
- Extract all formulas
- Cross-reference with existing work
- Create comprehensive ship design reference

### Session 3: Small Craft Catalogue (4-6h)
- Index all small craft
- Extract specifications
- Create small craft database
- Validate against existing templates

### Session 4: Central Supply Catalogue (6-8h)
- Index equipment
- Create equipment database
- Extract weapon/armor specs
- Tech level availability tables

**Total:** 20-28 hours across 4 sessions

**Value:** Eliminates need to manually search rulebooks during development

---

## ✅ DELIVERABLES CHECKLIST

**Per Sourcebook:**
- [ ] Chapter-by-chapter index created
- [ ] All tables extracted or referenced
- [ ] All formulas extracted
- [ ] Quick reference guide created
- [ ] Cross-references noted
- [ ] Copyright compliance verified
- [ ] Proper attribution included

**Aggregate:**
- [ ] Combined quick reference (all sources)
- [ ] Formula database (searchable)
- [ ] Table database (categorized)
- [ ] Cross-reference map
- [ ] Copyright notice on all files

---

## 🔄 ONGOING MAINTENANCE

**When new sourcebooks released:**
1. Acquire official PDF/book
2. Run indexing process (6-8h)
3. Integrate with existing references
4. Update cross-references
5. Add to quick reference

**When errata published:**
1. Note in source index
2. Update extracted tables/formulas
3. Flag affected implementations
4. Re-validate data

---

## 📞 NEXT STEPS

### Immediate (When User Provides Sources):
1. Acquire Small Craft Catalogue (priority 1)
2. Verify access to Core Rulebook 2022
3. Verify access to High Guard 2022

### First AB Indexing Session:
1. Complete High Guard indexing (finish what's started)
2. Index Small Craft Catalogue (once acquired)
3. Create first quick reference guides

### Future Sessions:
1. Core Rulebook comprehensive index
2. Central Supply Catalogue
3. Specialized supplements as needed

---

**Status:** READY FOR AB SESSION WORK (pending source material access)
**Risk:** ZERO - Pure reference work, copyright-compliant
**Value:** HIGH - Eliminates manual rulebook searches, speeds development 10×
**Priority:** Medium (valuable but not blocking current work)

**Add to AB work pool:** ✅ YES

---

**Created:** 2025-11-13
**Last Updated:** 2025-11-13
**Next Review:** When Small Craft Catalogue acquired
