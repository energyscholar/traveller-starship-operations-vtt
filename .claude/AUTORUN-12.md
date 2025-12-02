# AUTORUN 12: Combat Integration

**Created:** 2025-12-01
**Status:** READY
**Risk Level:** LOW (with mitigations)
**Prerequisite:** AUTORUN-11 completed (contacts/sensors), AUTORUN-10 (combat extraction)

## Execution Protocol
**Token Efficiency Mode:** Auto-adjust effort to minimize token use.
- `[65%]` BURST: Exploration, planning, debugging
- `[40%]` CRUISE: Sequential implementation, clear path
- Signal mode changes inline. Override with user instruction.

## Summary
Bridge Operations → Combat transition. The critical link between the two VTT modes. Contacts become combatants, roles become stations, and combat state syncs with operations DB.

---

## Stage 12.1: Combat Mode Transition
**Risk:** LOW | **LOC:** ~200 | **Commit after**

Enter and exit combat from bridge.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 12.1.1 | "Enter Combat" button (GM only) | ~30 |
| 12.1.2 | Combat mode state flag in session | ~30 |
| 12.1.3 | Bridge UI shows combat indicator | ~40 |
| 12.1.4 | "Exit Combat" with confirmation | ~40 |
| 12.1.5 | State persistence on exit | ~60 |

**Deliverable:** GM can transition session to/from combat mode.

---

## Stage 12.2: Contact → Combatant Conversion
**Risk:** LOW | **LOC:** ~180 | **Commit after**

Sensor contacts become combat participants.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 12.2.1 | Convert contact data to combatant format | ~60 |
| 12.2.2 | Include player ship as combatant | ~40 |
| 12.2.3 | Preserve detection level as intel | ~40 |
| 12.2.4 | Unknown contacts as generic silhouette ('?') | ~40 |

**Unknown Contact Display:** Show as '?' with estimated size only. Realistic fog of war.

**Deliverable:** All visible contacts appear in combat as combatants.

---

## Stage 12.3: Role → Station Mapping
**Risk:** LOW | **LOC:** ~150 | **Commit after**

Bridge roles map to combat stations.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 12.3.1 | Define role→station mapping | ~30 |
| 12.3.2 | Pilot → Pilot station | ~30 |
| 12.3.3 | Gunner(s) → Turret stations | ~40 |
| 12.3.4 | Captain → Command (all views) | ~30 |
| 12.3.5 | Unassigned roles default behavior | ~20 |

**Role Mapping:**
```
Bridge Role      → Combat Station
-----------         --------------
pilot            → pilot
gunner (turret 1)→ turret_1
gunner (turret 2)→ turret_2
captain          → command (view all)
engineer         → engineering
sensor_operator  → sensors
```

**Deliverable:** Players keep their roles in combat view.

---

## Stage 12.4: Combat State Sync
**Risk:** LOW | **LOC:** ~200 | **Commit after**

Bidirectional sync between combat and ops DB.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 12.4.1 | Verify existing Critical Hit logic | ~20 |
| 12.4.2 | Combat damage → ship systems (full Traveller) | ~60 |
| 12.4.3 | Fuel/ammo consumption sync | ~40 |
| 12.4.4 | Position/vector updates | ~40 |
| 12.4.5 | Sync on round end | ~40 |

**Note:** Existing combat system already has Critical Hit logic - verify and integrate, don't rewrite.

**Deliverable:** Combat results persist to operations DB with full system damage.

---

## Stage 12.5: Solo Mode Preservation
**Risk:** LOW | **LOC:** ~100 | **Commit after**

Ensure existing solo combat still works.

| Task | Description | Est. LOC |
|------|-------------|----------|
| 12.5.1 | Solo mode bypass for role mapping | ~30 |
| 12.5.2 | Solo mode skip ops DB sync | ~30 |
| 12.5.3 | Regression tests for solo mode | ~40 |

**Deliverable:** All 308+ tests pass, solo mode unchanged.

---

## Total: ~830 LOC across 5 stages

---

## Risk Mitigations

| Stage | Original | Mitigation | Final |
|-------|----------|------------|-------|
| 12.1 | MED | State flag pattern, clean transitions | LOW |
| 12.2 | MED | Adapter pattern for data conversion | LOW |
| 12.3 | LOW | Simple mapping table | LOW |
| 12.4 | MED | Sync on round-end only (not real-time) | LOW |
| 12.5 | LOW | Explicit solo mode checks | LOW |

**All stages LOW risk with mitigations.**

---

## Stage Dependencies

```
12.1 (Mode Transition)
  ↓
12.2 (Contact→Combatant) ← needs combat mode
  ↓
12.3 (Role→Station) ← needs combatants
  ↓
12.4 (State Sync) ← needs combat running
  ↓
12.5 (Solo Preservation) ← verify at end
```

---

## Critical Design: State Sync Strategy

```
COMBAT START:
  ops.contacts → combat.combatants (one-time copy)
  ops.ship → combat.playerShip (one-time copy)

DURING COMBAT:
  All changes in combat memory only

ROUND END:
  combat.playerShip.fuel → ops.ship.fuel (sync)
  combat.playerShip.damage → ops.ship.damage (sync)

COMBAT END:
  Final state → ops DB
  Combat memory cleared
```

**Why round-end sync:** Prevents race conditions, simpler debugging, matches Traveller turn structure.

---

## Success Criteria

| Stage | Criterion |
|-------|-----------|
| 12.1 | Enter/exit combat, bridge shows mode |
| 12.2 | Contacts appear as combatants with correct data |
| 12.3 | Players see their role's combat station |
| 12.4 | Damage persists after combat ends |
| 12.5 | Solo mode tests all pass |

---

## Deferred to AUTORUN-13: Fleet Combat (Trillion Credit Squadron)

**Use Case:** Players command squadron from flagship. Enemy fleet is AI.
- Squadron data model (ships grouped under command)
- Order system (Attack, Defend, Flank, Retreat)
- NPC ship AI (follows player orders)
- Fleet combat resolution (batch processing)
- Flagship command interface

## Deferred to AUTORUN-14+

- Ship systems & damage detail
- NPC crew automation
- E2E tests
