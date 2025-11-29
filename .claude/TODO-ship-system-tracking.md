# TODO: Comprehensive Ship System Tracking for Critical Hits

## Priority
MEDIUM - Required for full critical hit system implementation

## Overview
Extend MultiShipDisplay to support detailed tracking of all ship subsystems and their damage states. This will enable proper visualization of critical hit effects across all ship systems.

## Standardized Ship Systems JSON Structure

Every ship should have a `systems` object with the following standardized structure:

```typescript
interface ShipSystem {
  name: string;                    // Display name (e.g., "M-Drive", "Power Plant")
  operational: boolean;             // Currently functional
  damaged: boolean;                 // Has taken damage (may still be operational)
  critical: boolean;                // Critical damage - cannot be repaired mid-combat
  damageLevel: 0 | 1 | 2;          // 0=none, 1=minor, 2=major
  efficiency?: number;              // 0.0-1.0, for degraded performance (e.g., power plant at 50%)

  // Critical hit effects
  effects?: {
    disabled?: boolean;             // System completely offline
    reduced?: boolean;              // Operating at reduced capacity
    destroyed?: boolean;            // Permanently destroyed (beyond repair)
    fire?: boolean;                 // System on fire
    vented?: boolean;               // Section exposed to vacuum
  };

  // Repair tracking
  repairAttempts?: number;          // Number of repair attempts made
  repairable?: boolean;             // Can be repaired (false for critical/destroyed)
}

interface ShipSystems {
  // Propulsion
  mDrive: ShipSystem;               // Maneuver Drive
  jDrive?: ShipSystem;              // Jump Drive (if equipped)

  // Power & Core
  powerPlant: ShipSystem;           // Power Plant
  reactor?: ShipSystem;             // Fusion Reactor

  // Combat Systems
  sensors: ShipSystem;              // Sensors
  computer: ShipSystem;             // Ship Computer
  weapons: ShipSystem;              // Weapons (general - or track per turret)
  turrets?: ShipSystem[];           // Individual turret tracking

  // Defense
  armor?: ShipSystem;               // Armor plating
  shields?: ShipSystem;             // Energy shields (if equipped)
  pointDefense?: ShipSystem;        // Point defense systems

  // Life Support & Crew
  lifeSupport: ShipSystem;          // Life Support
  gravityPlates?: ShipSystem;       // Artificial gravity
  crew: ShipSystem;                 // Crew status (injuries, casualties)
  medBay?: ShipSystem;              // Medical facilities

  // Fuel & Cargo
  fuelTanks: ShipSystem;            // Fuel storage
  cargoHold?: ShipSystem;           // Cargo bay

  // Bridge & Control
  bridge: ShipSystem;               // Ship's bridge
  communications?: ShipSystem;      // Comms array

  // Other
  hangar?: ShipSystem;              // Fighter/shuttle hangar
  missileRacks?: ShipSystem;        // Missile storage
  ammunition?: ShipSystem;          // General ammunition storage
}
```

## Critical Hit Damage Types (Traveller Core Rules)

Based on Traveller combat rules, the following critical hit effects should be supported:

### 1. Hull Hits
- Hull breach (structural damage)
- Depressurization (venting to space)
- Armor penetration
- Critical structure failure

### 2. Power Plant Hits
- Power loss (reduced efficiency: 75%, 50%, 25%)
- Radiation leak
- Meltdown risk
- Emergency shutdown
- Power surge (may damage connected systems)

### 3. M-Drive Hits
- Thrust reduction (efficiency: 75%, 50%, 25%, 0%)
- Maneuver disabled
- Drive instability
- Complete drive failure

### 4. J-Drive Hits (if equipped)
- Jump capability disabled
- Jump mis-calculation risk
- Drive precipitate (emergency jump)
- Permanent jump drive failure

### 5. Sensor Hits
- Attack DM penalties (-1, -2, -4)
- Reduced sensor range
- Blind firing (severe penalty)
- Total sensor blackout

### 6. Computer Hits
- Software corruption
- Reduced computer rating
- Targeting system offline
- Life support automation failure

### 7. Weapon System Hits
- Individual turret disabled
- Ammunition explosion
- Weapon destroyed
- Fire control system damaged
- Targeting computer offline

### 8. Crew Casualties
- Crew injured (skill penalty)
- Crew killed (replacement needed)
- Bridge crew incapacitated
- Medical emergency
- Morale effects

### 9. Life Support Hits
- Oxygen depletion
- Temperature control failure
- Atmosphere contamination
- Emergency life support only
- Life support failure (time-limited survival)

### 10. Fuel System Hits
- Fuel leak
- Fuel fire/explosion
- Fuel tank rupture
- Contaminated fuel
- Emergency fuel dump

### 11. Cargo/Hangar Hits
- Cargo breach
- Cargo fire
- Hangar depressurization
- Docked craft damaged/destroyed

### 12. Bridge Hits
- Command & control disrupted
- Communications offline
- Navigation disabled
- Multiple crew casualties
- Bridge destroyed (ship disabled)

## Implementation Tasks

### Phase 1: Type Definitions
- [ ] Create `client/src/types/ship-systems.ts` with full type definitions
- [ ] Export `ShipSystem` and `ShipSystems` interfaces
- [ ] Add JSDoc comments with Traveller rule references

### Phase 2: Update MultiShipDisplay Component
- [ ] Add optional `systems?: ShipSystems` to `ShipData` interface
- [ ] Create visual indicators for damaged systems
- [ ] Add system status tooltips/details
- [ ] Color-code systems by damage level:
  - Green: Operational
  - Amber: Damaged but functional
  - Red: Disabled/Critical
  - Gray: Destroyed
- [ ] Add expandable system detail view

### Phase 3: Update Game State
- [ ] Extend `GameState` to include ship systems for all ships
- [ ] Add system damage tracking to combat resolution
- [ ] Integrate with existing critical hit tables

### Phase 4: Backend Integration
- [ ] Create `applyCriticalHit(ship, systemId, damageType)` function
- [ ] Implement system damage propagation (e.g., power plant damage affects M-Drive)
- [ ] Add repair attempt mechanics
- [ ] System interdependency tracking

### Phase 5: Testing
- [ ] Unit tests for system damage application
- [ ] Tests for all critical hit types
- [ ] Tests for system interdependencies
- [ ] Integration tests with phase system

## Visual Design Mockup

```
┌─────────────────────────────────────────┐
│ Scout Ship "Beowulf"      Init: 12   ▶  │
├─────────────────────────────────────────┤
│ Hull: ████████░░ 32/40                  │
│                                         │
│ Systems:                                │
│ ● M-Drive      [OK]                     │
│ ◐ Power Plant  [DAMAGED - 75%]         │
│ ○ Sensors      [DISABLED]               │
│ ● Computer     [OK]                     │
│ ● Life Support [OK]                     │
│ ◐ Turret #1    [DAMAGED]                │
│ ● Turret #2    [OK]                     │
│ ● Crew         [2 injured]              │
└─────────────────────────────────────────┘

Legend:
● Green  = Operational
◐ Amber  = Damaged but functional
○ Red    = Disabled/Critical
× Gray   = Destroyed
```

## Example JSON Structure

```json
{
  "id": "scout-01",
  "name": "Beowulf",
  "hull": { "current": 32, "max": 40 },
  "initiative": 12,
  "systems": {
    "mDrive": {
      "name": "M-Drive",
      "operational": true,
      "damaged": false,
      "critical": false,
      "damageLevel": 0
    },
    "powerPlant": {
      "name": "Power Plant",
      "operational": true,
      "damaged": true,
      "critical": false,
      "damageLevel": 1,
      "efficiency": 0.75,
      "repairAttempts": 1,
      "repairable": true
    },
    "sensors": {
      "name": "Sensors",
      "operational": false,
      "damaged": true,
      "critical": false,
      "damageLevel": 2,
      "effects": {
        "disabled": true
      },
      "repairable": true
    },
    "computer": {
      "name": "Ship Computer",
      "operational": true,
      "damaged": false,
      "critical": false,
      "damageLevel": 0
    },
    "lifeSupport": {
      "name": "Life Support",
      "operational": true,
      "damaged": false,
      "critical": false,
      "damageLevel": 0
    },
    "crew": {
      "name": "Crew",
      "operational": true,
      "damaged": true,
      "critical": false,
      "damageLevel": 1,
      "effects": {
        "casualties": 2,
        "injured": 2
      }
    }
  }
}
```

## References
- Traveller Core Rulebook: Critical Hit Tables (p. 159-162)
- Traveller Companion: Advanced Combat Rules
- High Guard: Capital Ship Damage
- PHASE-SYSTEM-USE-CASES.md: Edge Case 2 (Disabled Systems)

## Notes
- System tracking should be backward-compatible with existing ship data (graceful degradation)
- Consider adding visual "damage report" modal for detailed system status
- May want to add sound effects for critical hits
- Consider adding "damage control" phase for repair attempts
