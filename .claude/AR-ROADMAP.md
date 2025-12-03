# AR Roadmap - Operations VTT

**Generated:** 2025-12-03
**Total ARs:** 6 (AR-15 through AR-20)

---

## Summary Table

| AR | Name | Status | Est | Priority | Risk |
|----|------|--------|-----|----------|------|
| AR-15 | Role Polish & UX | COMPLETE (9/10) | 4h actual | P1 | LOW |
| AR-16 | Security Hardening | COMPLETE | 4h actual | P1 | LOW |
| AR-17 | Ship Template Editor | COMPLETE | 3h actual | P2 | MED |
| AR-18 | Crew Role Depth | PLANNED | 40-60h | P2 | MED |
| AR-19 | Character Import | COMPLETE | 1.5h actual | P1 | MED |
| AR-20 | Ship Library | PLANNED | 20-40h | P3 | LOW |

---

## COMPLETED ARs

### AR-15: Role Polish & UX
**File:** `AR-15-ROLE-POLISH.md`
**Status:** 9/10 stages complete (Stage 15.3 deferred)

Implemented:
- Tooltip infrastructure (pre-existing)
- Native tooltips on buttons
- Gunner weapon selector, fire control, hit probability (pre-existing)
- Astrogator map controls (setMapSize, drag-pan, keyboard nav, localStorage)
- Astrogator jump validation (pre-existing)
- UI polish (power/hull gradients, fullscreen toggle)
- Role system bug fixes (descriptive relieve tooltip)

Deferred:
- Stage 15.3: Custom rich tooltips (native tooltips sufficient for MVP)

---

### AR-16: Security Hardening
**File:** `AR-16-SECURITY-REMAINING.md`
**Status:** COMPLETE (10/10 stages)

Implemented:
- NODE_ENV gating for eval
- Error message sanitization
- Console.log cleanup
- XSS onclick→data-attr migration
- SQL template hardening
- Escape IDs in templates

---

### AR-19: Character Import System
**File:** `AR-19-CHARACTER-IMPORT.md`
**Status:** COMPLETE (10/10 stages)

Implemented:
- Canonical JSON schema for characters
- validateCharacterImport() with stat/skill range checking
- parseFuzzyText() for flexible imports
- File drag-drop and upload UI
- UPP and skill parsers (pre-existing)
- 14 new unit tests

---

### AR-17: Ship Template Editor
**File:** `AR-17-SHIP-TEMPLATE-EDITOR.md`
**Status:** COMPLETE (10/10 stages)

Implemented:
- Template selector with preview
- Hull & armor editors
- Drives, power, computer, sensors editors
- Weapons add/remove with mount types
- Systems add/remove
- Cargo & staterooms editor
- Tonnage & power validation bars
- Database persistence (update/create)

---

## PLANNED ARs

### AR-18: Crew Role Depth
**File:** `AR-18-CREW-ROLE-DEPTH.md`
**Status:** PLANNED
**Est:** 40-60 hours
**Priority:** P2

Full implementation of all 11 crew roles:
- Captain, Pilot (P0 - core command)
- Engineer, Sensors, Astrogator (P1 - combat/travel)
- Medic, Marine, Comms (P2 - extended gameplay)
- Steward (P3 - roleplay)
- Cross-role integration

Gunner already complete via AR-14.

---

### AR-20: Ship Library Expansion
**File:** `AR-20-SHIP-LIBRARY.md`
**Status:** PLANNED
**Est:** 20-40 hours
**Priority:** P3

Ship templates to add:
- Core Rulebook traders (Far Trader, Subsidized Merchant/Liner)
- Core Rulebook specials (Yacht, Safari Ship, Lab Ship, Seeker)
- Military patrol craft (Corvette, SDB, Close Escort)
- Small craft utility (Ship's Boat, Pinnace, Cutter, Launch)
- Small craft combat (Light/Medium/Heavy Fighters, Shuttle)
- Destroyers & Cruisers

Plus: Template validation, JSON schema documentation.

---

## Recommended Execution Order

1. ~~**AR-17: Ship Template Editor** (20h)~~ ✅ COMPLETE (3h actual)

2. **AR-18: Crew Role Depth** (40-60h)
   - Largest AR, can be split into sub-phases
   - Critical for multiplayer engagement
   - Start with Captain + Pilot (P0 roles)

3. **AR-20: Ship Library** (20-40h)
   - Content work, low risk
   - Can be done incrementally

---

## Files

```
.claude/
├── AR-15-ROLE-POLISH.md      # COMPLETE
├── AR-16-SECURITY-REMAINING.md  # COMPLETE
├── AR-17-SHIP-TEMPLATE-EDITOR.md  # PLANNED
├── AR-18-CREW-ROLE-DEPTH.md  # PLANNED
├── AR-19-CHARACTER-IMPORT.md # COMPLETE
├── AR-20-SHIP-LIBRARY.md     # PLANNED
├── AR-ROADMAP.md             # This file
├── ARCHIVE-SPEED-OPTIMIZATIONS.md  # Old meta doc
└── ARCHIVE-TEST-SPEED.md     # Old meta doc
```

---

## Notes

- AR-14 (Gunner Combat System) completed 2025-12-02
- AR-15, AR-16, AR-17, AR-19 completed faster than estimated due to pre-existing code
- AR-18 is the largest remaining work item
- All 339 tests currently passing
- **5 of 6 ARs complete** - only AR-18 and AR-20 remain
