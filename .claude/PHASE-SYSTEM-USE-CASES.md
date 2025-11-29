# Phase System Use Cases

**Created:** 2025-11-29
**Purpose:** Define expected behavior for initiative/phase system rebuild

---

## Overview

Traveller space combat operates in **3 phases per round:**
1. **Manoeuvre** - Movement, thrust allocation, evasive actions
2. **Attack** - Fire weapons
3. **Actions** - Other actions (repairs, boarding, etc.)

Ships act in **initiative order** (2d6 + pilot skill + thrust).

---

## Use Case 1: Basic Phase Sequencing

**Scenario:** Scout vs Free Trader, both crews ready

**Setup:**
- Scout: Initiative 12 (2d6=7 + pilot=2 + thrust=2 = 11... wait, recalc: 2d6=6 + 2 + 2 = 10)
- Free Trader: Initiative 8 (2d6=6 + pilot=1 + thrust=1 = 8)

**Expected Flow:**
```
Round 1
├── MANOEUVRE PHASE
│   ├── Scout acts first (initiative 10)
│   │   └── Allocates thrust: 1 to movement, 1 to evasive
│   └── Free Trader acts second (initiative 8)
│       └── Allocates thrust: 1 to movement
├── ATTACK PHASE
│   ├── Scout acts first
│   │   └── Fires pulse laser at Free Trader
│   └── Free Trader acts second
│       └── Fires beam laser at Scout
└── ACTIONS PHASE
    ├── Scout acts first
    │   └── Engineer repairs 1d6 hull
    └── Free Trader acts second
        └── Engineer repairs 1d6 hull
```

**Key Rule:** Initiative order maintained across all 3 phases.

---

## Use Case 2: Evasive Action Mechanics

**Scenario:** Scout pilot reserves thrust for evasive action

**Setup:**
- Scout at Close range, being targeted
- Scout has thrust=2

**Manoeuvre Phase:**
- Scout pilot declares: "Allocate 1 thrust to movement, 1 thrust to evasive"
- System records: `thrust.allocated.evasive = 1`

**Attack Phase:**
- Free Trader attacks Scout
- Scout's evasive thrust applies: Attack DM = -1 per evasive thrust = -1
- System checks: `thrust.allocated.evasive > 0` ✓

**Critical Rule:** Evasive thrust MUST be reserved in Manoeuvre phase, cannot be applied retroactively during Attack phase.

---

## Use Case 3: One Weapon Fire Per Round

**Scenario:** Scout has triple turret (pulse laser, sandcaster, missile rack)

**Round 1, Attack Phase:**
- Scout fires pulse laser → `turret_1.weapons.pulse_laser.usedThisRound = true`
- Scout attempts to fire missiles → BLOCKED: "Turret 1 already fired this round"

**Expected Behavior:**
- Each turret fires ONE weapon per round
- System tracks `usedThisRound` flag per turret
- Flags reset at start of new round

---

## Use Case 4: Point Defense Reactions

**Scenario:** Free Trader fires missile at Scout, Scout has laser available

**Attack Phase:**
- Free Trader fires missile (action)
- Scout triggers point defense (reaction)
  - Check: `laser.usedThisRound === false` ✓
  - Check: `laser.usedForPointDefense === false` ✓
  - Fire point defense laser
  - Set: `laser.usedThisRound = true`
  - Set: `laser.usedForPointDefense = true`

**Critical Rule:** Point defense is ONE reaction per turn, not unlimited.

---

## Use Case 5: Point Defense Mutual Exclusion

**Scenario:** Scout wants to attack AND use point defense same round

**Attack Phase:**
- Scout fires pulse laser at target → `laser.usedThisRound = true`
- Enemy fires missile at Scout
- Scout attempts point defense → BLOCKED: "Laser already used this round"

**Expected:** Point defense and attack are mutually exclusive - pick one.

---

## Use Case 6: Sandcaster Point Defense

**Scenario:** Scout has sandcaster, enemy fires laser

**Attack Phase:**
- Enemy fires beam laser at Scout
- Scout triggers sandcaster (reaction)
  - Check: `sandcaster.usedThisRound === false` ✓
  - Check: `sandcaster.canistersRemaining > 0` ✓
  - Deploy sand
  - Set: `sandcaster.usedThisRound = true`
  - Decrement: `sandcaster.canistersRemaining--`

**Critical Rule:** Sandcasters have limited ammo (20 rounds).

---

## Use Case 7: Role-Based Action Gating

**Scenario:** Only certain roles can act in certain phases

**Manoeuvre Phase:**
- PILOT: Can allocate thrust, perform evasive manoeuvres ✓
- GUNNER: Cannot act ✗
- ENGINEER: Cannot act ✗

**Attack Phase:**
- PILOT: Cannot fire weapons ✗
- GUNNER: Can fire assigned turret ✓
- ENGINEER: Cannot act ✗

**Actions Phase:**
- PILOT: Can perform other actions ✓
- GUNNER: Can perform other actions ✓
- ENGINEER: Can repair systems ✓

---

## Use Case 8: Thrust Depletion

**Scenario:** Scout tries to exceed available thrust

**Manoeuvre Phase:**
- Scout has thrust=2
- Scout allocates: 2 to movement
- Scout attempts to allocate 1 to evasive → BLOCKED: "Insufficient thrust"

**Expected:** `thrust.remaining = thrust.total - thrust.allocated.sum()`

---

## Use Case 9: Round Transition

**Scenario:** New round starts, flags reset

**End of Round 1:**
```javascript
turret_1: {
  weapons: {
    laser: { usedThisRound: true, usedForPointDefense: false }
  }
}
thrust: { total: 2, remaining: 0 }
```

**Start of Round 2:**
```javascript
turret_1: {
  weapons: {
    laser: { usedThisRound: false, usedForPointDefense: false }  // RESET
  }
}
thrust: { total: 2, remaining: 2 }  // RESET
```

---

## Use Case 10: Multiple Ships Initiative

**Scenario:** 4 ships in combat

**Initiative Rolls:**
- Scout A: 12
- Patrol Cruiser: 10
- Scout B: 9
- Free Trader: 7

**Phase Order:**
```
Each phase proceeds:
1. Scout A (12)
2. Patrol Cruiser (10)
3. Scout B (9)
4. Free Trader (7)
```

**Key Rule:** All ships complete Manoeuvre, then all ships do Attack, then all do Actions.

---

## Edge Cases

### EC1: Destroyed Ship
- Ship destroyed in Attack phase
- Skip that ship's turn in Actions phase

### EC2: Disabled Systems
- M-Drive hit → Cannot allocate thrust for movement
- Weapons hit → Cannot fire that weapon
- Sensors hit → Attack DM penalty

### EC3: Crew Casualties
- Pilot killed → No evasive manoeuvres possible
- Gunner killed → Turret cannot fire
- Engineer killed → No repairs possible

---

## Test Coverage Requirements

**Happy Path (60 tests):**
- Basic phase sequencing (10)
- Thrust allocation (10)
- Weapon firing (10)
- Point defense (15)
- Role gating (10)
- Round transitions (5)

**Edge Cases (20 tests):**
- Insufficient thrust (5)
- Already-used weapons (5)
- Destroyed ships (5)
- Disabled systems (5)

**Integration (10 tests):**
- Full combat rounds (5)
- Multi-ship scenarios (5)

**Total: 90 tests**

---

## Implementation Notes

**XState Machine States:**
- `manoeuvre`
- `attack`
- `actions`
- `round_end`

**Transitions:**
- All ships acted in phase → next phase
- Actions phase complete → round_end → manoeuvre (new round)

**Context:**
- Current phase
- Current round number
- Ship action tracking (usedThisRound flags)
- Initiative order (sorted once per round)
