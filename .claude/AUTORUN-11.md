# AUTORUN 11: Full Operations Layer

**Created:** 2025-12-01
**Status:** READY
**Risk Level:** LOW
**Prerequisite:** AUTORUN-10 completed

## Execution Protocol
**Token Efficiency Mode:** Auto-adjust effort to minimize token use.
- `[65%]` BURST: Exploration, planning, debugging
- `[40%]` CRUISE: Sequential implementation, clear path
- Signal mode changes inline. Override with user instruction.

## Summary
Complete the operations layer: full mail compose, sensor fog-of-war, and NPC crew basics. Makes the bridge fully functional for non-combat operations.

---

## Stage 11.1: Full Mail Compose
**Risk:** LOW | **LOC:** ~180 | **Commit after**

Complete player-to-NPC mail system.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 11.1.1 | Compose mail modal UI | ~80 |
| 11.1.2 | Contact picker (known NPCs only) | ~40 |
| 11.1.3 | Send mail socket handler | ~30 |
| 11.1.4 | Sent mail appears in GM queue | ~30 |

**Deliverable:** Players can compose and send mail to known contacts.

---

## Stage 11.2: Sensor Contacts System
**Risk:** LOW | **LOC:** ~250 | **Commit after**

Contacts visible on sensors with detection levels.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 11.2.1 | Contacts table in database | ~40 |
| 11.2.2 | Contact CRUD module | ~60 |
| 11.2.3 | GM contact management UI | ~80 |
| 11.2.4 | Sensor display with contacts | ~70 |

**Deliverable:** GM can add contacts, they appear on sensor operator's display.

---

## Stage 11.3: Fog of War (Detection Levels)
**Risk:** LOW | **LOC:** ~200 | **Commit after**

Progressive contact revelation based on scan level.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 11.3.1 | Detection levels (unknown→passive→active→deep) | ~40 |
| 11.3.2 | Scan actions for sensor operator | ~60 |
| 11.3.3 | Information reveal per level | ~60 |
| 11.3.4 | Scan log entries | ~40 |

**Deliverable:** Sensor operator scans contacts to reveal more info.

---

## Stage 11.4: NPC Crew Roster
**Risk:** LOW | **LOC:** ~150 | **Commit after**

Basic NPC crew tracking (no automation yet).

| Task | Description | Est. LOC |
|------|-------------|----------|
| 11.4.1 | NPC crew table (name, role, skills, status) | ~40 |
| 11.4.2 | Crew CRUD module | ~50 |
| 11.4.3 | Crew roster UI (GM view) | ~60 |

**Deliverable:** GM can track NPC crew members and their roles.

---

## Stage 11.5: Bridge Integration
**Risk:** LOW | **LOC:** ~120 | **Commit after**

Wire everything into the bridge view.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 11.5.1 | Sensor panel shows contacts | ~40 |
| 11.5.2 | Crew status in captain's view | ~40 |
| 11.5.3 | Mail notification indicator | ~20 |
| 11.5.4 | Integration tests | ~20 |

**Deliverable:** All new features visible and functional on bridge.

---

## Total: ~900 LOC across 5 stages

---

## Risk Mitigations

| Stage | Original | Mitigation | Final |
|-------|----------|------------|-------|
| 11.1 | LOW | Build on AR-9 mail reply | LOW |
| 11.2 | MED | Hybrid storage, follow existing patterns | LOW |
| 11.3 | MED | 3-tier scan model + GM reveal controls | LOW |
| 11.4 | LOW | Simple CRUD, no automation | LOW |
| 11.5 | LOW | Integration only, no new logic | LOW |

**All stages LOW risk.**

---

## Stage Dependencies

```
11.1 (Mail Compose) ← independent

11.2 (Sensor Contacts)
  ↓
11.3 (Fog of War) ← needs contacts

11.4 (NPC Crew) ← independent

11.5 (Integration) ← needs 11.1-11.4
```

---

## Detection Level State Machine (11.3)

```
UNKNOWN → PASSIVE → ACTIVE → DEEP
   ↓         ↓         ↓        ↓
 "Contact"  Type,    Name,    Full
            Size,    Weapons, Stats
            Vector   Crew
```

**Scanning Model:**
- **Passive:** Automatic silent rolls - ship is never blind. Required for stealth detection.
- **Active:** Sensor operator action - reveals more, but target knows they're being scanned
- **Deep:** Sensor operator action - full intel, definitely detected

**GM Controls:**
- Quick reveal buttons per contact (Passive/Active/Deep/Full)
- "Players Know" indicator on each contact showing current detection level
- GM can reveal info at any time regardless of scan rolls

**Storage Model (Hybrid):**
- Named/saved contacts → Operations DB (persistent)
- Transient sensor blips → In-memory (session only)

---

## Success Criteria

| Stage | Criterion |
|-------|-----------|
| 11.1 | Player sends mail → appears in GM queue |
| 11.2 | GM adds contact → appears on sensors |
| 11.3 | Sensor op scans → more info revealed |
| 11.4 | GM can CRUD NPC crew roster |
| 11.5 | All features accessible from bridge |

---

## Deferred to AUTORUN-12+

- Combat integration (Bridge → Combat transition)
- Ship systems & damage
- NPC crew automation (auto-actions)
- E2E tests (Playwright)
