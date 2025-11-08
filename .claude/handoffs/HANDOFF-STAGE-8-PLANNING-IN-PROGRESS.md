# Stage 8 Planning Session - In Progress

**Date:** 2025-11-04
**Status:** Planning space combat implementation approach
**Context:** User at 86% token usage (Tuesday), waiting for Friday reset
**Mode:** Planning only, NO implementation until after token reset

---

## Session Summary

### What We Accomplished

1. ✅ **PDF Safety Protocols Established**
   - Updated `.claude/handoffs/README.md` with PDF handling guidelines
   - NEVER read full PDFs - use `pdftotext` for targeted extraction only
   - Reference PDFs: Book 1 (129 pages), Book 2 (105 pages)

2. ✅ **Extracted Mongoose Traveller Rules**
   - Created comprehensive rules extract: `.claude/MONGOOSE-TRAVELLER-RULES-EXTRACT.md`
   - Personal Combat System (p.70-75)
   - Weapons & Armour (p.76-115)
   - Space Combat System (p.30-39)
   - 8 Common Spacecraft with full stats (p.40-71)

3. ✅ **Analyzed Implementation Options**
   - Option 1: Full Simulation (authentic, complex, 5 stages)
   - Option 2: Simplified Core (fast, incremental, 1 stage MVP)
   - Option 3: Hybrid Scale (reuse existing, risk of feeling generic)

4. ✅ **User Decision: Option 2 + Stubbing Strategy**
   - Implement simplified space combat in Stage 8
   - Stub extension points for Stages 9-11
   - Document future complexity in code
   - Validate incrementally before scaling

---

## Current State: Ready for Stage 8 Planning

### User's Chosen Approach

**"Option 2 with hybrid to add detail later"**

**Stage 8:** Simplified but playable space combat
- Ship selection (4-6 ships)
- Space initiative (2D + Pilot + Thrust)
- Simplified range bands (5 instead of 7)
- Basic attacks (lasers only)
- Hull damage + simple crits (location only)
- **STUB:** Severity system, maneuvers, missiles, boarding

**Stages 9-11:** Incrementally add complexity
- Stage 9: Manoeuvre step, Thrust allocation
- Stage 10: Full critical hit effects (Severity 1-6)
- Stage 11: Missiles, sandcasters, reactions
- Stage 12: Boarding actions

### Key Design Principle: Stub with Intent

**Good stubbing:**
```javascript
function calculateSeverity(damage) {
  // STUB Stage 8: Always returns 1
  // Stage 10 will implement: Math.ceil(damage / 10)
  return 1;
}
```

- Design for future complexity NOW
- Implement simple version with clear extension points
- Document TODOs and stub locations
- Avoid architectural dead-ends

---

## Questions User Must Answer Before Planning Stage 8

### Critical Design Decisions

1. **Which 4 ships to implement first?**
   - Available: Free Trader, Far Trader, Scout/Courier, Patrol Corvette, Mercenary Cruiser, Subsidised Liner, Safari Ship, Seeker, Lab Ship
   - Need: Variety, common use cases, interesting stats
   - Recommendation: Scout (small/fast), Free Trader (medium cargo), Patrol Corvette (military), Mercenary Cruiser (large combat)

2. **What does "success" look like for Stage 8?**
   - Minimum: Two ships can shoot lasers, damage Hull, score crits
   - MVP: Above + movement, multiple ships, crew positions
   - Ideal: Above + working UI, clear feedback, fun to play

3. **How many range bands in simplified system?**
   - Current proposal: 5 bands (Adjacent, Close, Medium, Long, Distant)
   - Traveller has 7 (Adjacent, Close, Short, Medium, Long, Very Long, Distant)
   - Tradeoff: Fewer bands = simpler, but less tactical depth

4. **How does movement work in simplified version?**
   - Option A: Ships move instantly to new range band (no Thrust cost)
   - Option B: Thrust determines max range band change per round
   - Option C: No movement in Stage 8 (fixed starting ranges)

5. **How do multiple crew on one ship affect initiative?**
   - Ship as entity: One initiative roll for whole ship
   - Crew as individuals: Each crew member rolls initiative
   - Hybrid: Pilot rolls for ship, crew acts on ship's initiative

6. **Data model for Ship entity?**
   ```javascript
   // Proposal - needs discussion
   const ship = {
     id: string,
     type: 'scout' | 'trader' | 'corvette' | 'cruiser',
     name: string,

     // Stats from Mongoose Traveller
     hull: { current: number, max: number },
     armour: number,
     thrust: number,

     // Weapons
     turrets: [{
       type: 'single' | 'double' | 'triple',
       weapons: ['beam_laser', 'pulse_laser', 'missile_rack'],
       gunner: characterId?
     }],

     // Crew
     crew: {
       pilot: characterId?,
       captain: characterId?,
       engineers: [characterId],
       gunners: [characterId],
       marines: [characterId]
     },

     // Critical hits (stubbed for Stage 10)
     criticals: [{
       location: 'sensors' | 'power' | 'fuel' | 'weapon' | 'armour' | 'hull' | 'm-drive' | 'cargo' | 'j-drive' | 'crew' | 'computer',
       severity: number, // Always 1 in Stage 8
       effects: any // TODO Stage 10
     }],

     // Position
     position: { x: number, y: number }, // Hex grid?
     facing: number? // Or do turrets make this irrelevant?
   }
   ```

7. **Do we reuse existing combat UI or build new screens?**
   - Current: Combat round manager, action buttons, damage display
   - Space combat: Different time scale (6 min vs 6 sec), different actions
   - Recommendation: Extend existing system with "space combat mode" toggle

8. **What's the riskiest assumption?**
   - Risk 1: Space combat feels too similar to personal combat (boring)
   - Risk 2: 6-minute rounds feel slow and unfun
   - Risk 3: Crew coordination is confusing with multiple players
   - Risk 4: Our hex grid doesn't work well for space ranges

---

## CTO Skills Development Notes

### What User is Learning

**From CTO Evaluation Document (`.claude/CTO-SKILLS-EVALUATION.md`):**
- Ask "why" before accepting technical decisions
- Review architecture, not just accept deliverables
- Think business value first
- Challenge and probe for alternatives
- Consider production concerns

### This Session's Practice

✅ **User asked great questions:**
- "What caused you to consider scaling standard combat?" (probing technical decisions)
- "Too far from what players know to work?" (user experience thinking)
- "What's your opinion on stubbing approach?" (seeking architectural guidance)

✅ **Next CTO skills to practice:**
- Prioritization: Force ranking of features/ships
- Data modeling: Design the Ship entity structure
- Risk assessment: Identify biggest technical risk
- Scope management: Define Stage 8 boundaries clearly

---

## Next Steps (After Reboot/Token Reset)

### Immediate (This Session if Time Permits)

1. **Answer the critical questions above**
   - User should think through and decide
   - Assistant provides options and guidance
   - Document decisions

2. **Enter Planning Mode?**
   - User can request formal planning mode with `/plan` or ExitPlanMode tool
   - Or continue discussion mode to flesh out design

### After Token Reset (Friday)

1. **Create detailed Stage 8 plan**
   - User stories
   - Technical tasks
   - Stub locations documented
   - Test cases
   - Acceptance criteria

2. **Implement Stage 8**
   - Ship selection UI
   - Space combat system (simplified)
   - Data models
   - Tests

3. **Test and iterate**
   - Play through space combat scenarios
   - Identify what works, what doesn't
   - Adjust before committing to Stages 9-11

---

## Key Files Created This Session

1. **`.claude/MONGOOSE-TRAVELLER-RULES-EXTRACT.md`**
   - Complete Traveller rules reference
   - Replaces PDF access to save tokens
   - Personal combat, space combat, ships, weapons, armour

2. **`.claude/handoffs/README.md`** (updated)
   - Added PDF safety protocols
   - Critical warnings about token usage

3. **`.gitignore`** (updated)
   - Excludes `reference/` folder
   - Excludes all `*.pdf` files

4. **This handoff document**

---

## Context for Next Session

### What Assistant Should Know

- **User background:** Former CTO, done this 6 times, but wants to improve technical depth
- **Token situation:** 86% used on Tuesday, resets Friday
- **Current goal:** PLAN stages 8+ but NO implementation until Friday
- **Approach:** Option 2 (simplified MVP) with stubbing for future complexity
- **User wants:** To practice CTO questioning and decision-making skills

### What User Knows

- Mongoose Traveller rules (now extracted in reference doc)
- Current VTT state (Stages 1-7 complete):
  - Stage 1: Hello World
  - Stage 2: Combat math
  - Stage 3: Ship models (2 ships: DEEP HOPE, WILD CARD)
  - Stage 4: Multiplayer (Socket.io)
  - Stage 5: Hit/Damage/Armor
  - Stage 6: Crew system & character skills
  - Stage 7: Movement & positioning (hex grid)
- Has working personal combat system
- Needs space combat system (different scale, different mechanics)

### Current Questions to Resume With

When user returns, resume with:

1. "Let's start with ship selection - which 4 ships should we implement in Stage 8 and why?"
2. "What does the Ship data model look like?"
3. "How do we handle initiative with multiple crew on one ship?"
4. "What's your win condition for Stage 8 - what does 'done' look like?"

---

## Git Status

**Untracked files:**
```
.claude/CTO-SKILLS-EVALUATION.md
.claude/MONGOOSE-TRAVELLER-RULES-EXTRACT.md
.claude/handoffs/HANDOFF-STAGE-8-PLANNING-IN-PROGRESS.md
```

**Modified files:**
```
.gitignore (added reference/ and *.pdf)
.claude/handoffs/README.md (added PDF safety)
```

**Recommendation:** Commit these before implementing Stage 8:
```bash
git add .claude/ .gitignore
git commit -m "Stage 8 planning: Rules extract and implementation approach

- Extract Mongoose Traveller rules to avoid PDF token costs
- Document 3 implementation options for space combat
- User chose Option 2: Simplified MVP with stubbing strategy
- Added PDF safety protocols to prevent future token exhaustion
- Ready to begin Stage 8 planning after token reset"
```

---

## Token Usage This Session

**Started:** 16,870 / 200,000 (8.4%)
**Ended:** ~70,000 / 200,000 (35%)
**Used:** ~53,000 tokens

**Primary costs:**
- PDF text extraction: ~25,000 tokens
- Rules documentation: ~15,000 tokens
- Discussion and planning: ~13,000 tokens

**Remaining budget:** ~130,000 tokens (65%)

---

## Remember for Next Session

⚠️ **CRITICAL:** Use `.claude/MONGOOSE-TRAVELLER-RULES-EXTRACT.md` instead of PDFs
⚠️ **CRITICAL:** NO IMPLEMENTATION until after Friday token reset
⚠️ **FOCUS:** Help user practice CTO skills (questioning, prioritizing, risk assessment)

✅ **DONE:** Rules extracted, approach chosen, ready for detailed planning
✅ **NEXT:** Answer critical questions, design data model, create Stage 8 plan

---

**End of Handoff**

Resume with: "Welcome back! Let's continue planning Stage 8. First question: Which 4 ships should we implement and why?"
