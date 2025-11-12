# Ship Template V2 - Comprehensive High Guard Specifications

## Overview

Ship Template V2 is a complete redesign based on **Mongoose Traveller 2E High Guard 2022 Update** specifications. Unlike V1 (simplified templates), V2 captures the full complexity of Traveller ship design.

## Schema Location

`data/schemas/ship-template-v2.schema.json`

## Key Improvements Over V1

### V1 (Simplified)
```json
{
  "tonnage": 100,
  "thrust": 2,
  "turrets": [...]
}
```

### V2 (Comprehensive)
```json
{
  "hull": { "tonnage": 100, "configuration": "streamlined", ... },
  "drives": {
    "manoeuvre": { "thrust": 2, "tonnage": 2, "cost": 4000000 },
    "jump": { "rating": 2, "tonnage": 10, "cost": 15000000 }
  },
  "power": { "type": "fusion_tl12", "output": 60, ... },
  "fuel": { "total": 23, "jump": 20, "weeks": 12 },
  ...
}
```

## Complete Component Categories

### 1. Hull
- Tonnage, configuration (streamlined, sphere, etc.)
- Hull points, base cost
- Options: radiation shielding, aerofins, reflec

### 2. Armour
- Type: titanium_steel, crystaliron, bonded_superdense, molecular_bonded
- Rating, tonnage, cost (varies by hull size multiplier)

### 3. Drives
- **Manoeuvre Drive**: Thrust rating, tonnage, cost, modifiers (energy_efficient)
- **Jump Drive**: Jump rating (0-9), tonnage, fuel requirements, cost

### 4. Power Plant
- Type: fusion_tl8/12/15, antimatter, chemical, fission
- Power output, tonnage, cost

### 5. Fuel
- Total tankage, jump fuel, power plant fuel
- Operation duration (in weeks)

### 6. Bridge
- Type: standard, cockpit, dual_cockpit, command_bridge
- Tonnage, cost, options (holographic_controls, hardened)

### 7. Computer
- Model: Computer/5, Computer/10bis, Core/40, etc.
- Processing rating, cost
- Variants: /bis (Jump Control spec), /fib (hardened)

### 8. Sensors
- Grade: basic, civilian, military, improved, advanced
- Tonnage, cost, power, DM modifier
- Extras: life_scanner, mineral_detection, neural_activity_sensor

### 9. Weapons
- Mounts: fixed, single/double/triple turret, barbette, bay, spinal
- Individual weapons, tonnage, cost, power

### 10. Craft
- Docking spaces, launch tubes, full hangars
- Small craft: air/raft, ATV, ship's boat, G/carrier, fighters
- Modular cutters with interchangeable modules

### 11. Systems
- fuel_processor (with capacity in tons/day)
- fuel_scoops (free, allows gas giant skimming)
- cargo_crane, loading_belt, cargo_airlock
- armoury, briefing_room, medical_bay
- training_facility, workshop, laboratory
- probe_drones, repair_drones
- stealth, screens (defensive systems)

### 12. Staterooms
- Standard (4 tons, MCr 0.5)
- Luxury (10 tons, MCr 1.5)
- Barracks (1 ton/person, MCr 0.05/person)
- Low Berths (0.5 tons, Cr 50,000)

### 13. Software
- manoeuvre, jump_control, library, intellect
- evade, fire_control, auto_repair
- launch_solution, point_defense
- Rating and cost

### 14. Common Areas
- Crew comfort spaces
- Galley, lounge, recreation

### 15. Cargo
- Remaining tonnage for cargo hold

### 16. Crew Requirements
- Minimum crew by role
- Pilot, Astrogator, Engineer, Gunner, Steward, Medic, Marines

### 17. Costs
- Base purchase cost
- Monthly maintenance (1/12 of 1% of base cost)

### 18. Power Requirements
- Breakdown by system
- Basic (20% of hull), M-Drive, J-Drive, Sensors, Weapons

## Example Ships

### Scout (Type-S) - `scout.json`
- **Role**: Exploration and survey
- **Size**: 100 tons, streamlined
- **Performance**: Jump-2, Thrust-2
- **Features**: Military-grade sensors, workshop, probe drones
- **Cost**: MCr 36.94

### Free Trader (Type-A) - `free_trader.json`
- **Role**: Tramp merchant
- **Size**: 200 tons, streamlined
- **Performance**: Jump-1, Thrust-1
- **Features**: 80t cargo, 20 low berths, cargo crane
- **Cost**: MCr 46.24

### Far Trader (Empress Marava) - `far_trader.json`
- **Role**: Long-range merchant
- **Size**: 200 tons, streamlined
- **Performance**: Jump-2, Thrust-1 (jump dimming required)
- **Features**: 57t cargo, dual beam laser turrets, air/raft
- **Cost**: MCr 54.16

## Calculation Formulas

### Jump Drive
- **Tonnage**: `(Hull × Rating × 2.5%) + 5`, min 10t
- **Fuel**: `Hull × Rating × 10%`
- **Power**: `Hull × Rating × 10%`
- **Cost**: `Tonnage × MCr 1.5`

### Manoeuvre Drive
- **Tonnage**: `Hull × Thrust × 1%`
- **Power**: `Hull × Thrust × 10%`
- **Cost**: `Tonnage × MCr 2`

### Power Plant
- **Basic Systems**: `Hull × 20%`
- **Total Required**: Basic + M-Drive + J-Drive + Sensors + Weapons + Systems

### Bridge
- **50t or less**: 3 tons
- **51-99t**: 6 tons
- **100-200t**: 10 tons
- **201-1,000t**: 20 tons
- **Cost**: MCr 0.5 per 100t of hull

### Armour Tonnage
1. Base: `% per point × Hull × Armour Rating`
2. Apply hull size multiplier (5-15t: ×4, 16-25t: ×3, 26-99t: ×2, 100+t: ×1)
3. Apply hull configuration modifier if applicable

## Migration from V1

V1 templates remain in `data/ships/` for backward compatibility.
V2 templates are in `data/ships/v2/`.

To migrate code:
1. Update loaders to read V2 schema
2. Add component detail displays (tonnage, cost, power)
3. Implement validation using extracted formulas
4. Update UI to show comprehensive ship specs

## Future Enhancements

- [ ] Military vessels (Patrol Corvette, Mercenary Cruiser)
- [ ] Passenger liners (Subsidised Liner, Safari Ship)
- [ ] Specialized ships (Seeker, Laboratory Ship)
- [ ] Capital ships (Destroyers, Cruisers, Carriers, Battleships, Dreadnoughts)
- [ ] Small craft (Fighters, Ship's Boats, Pinnaces)

## References

- Mongoose Traveller 2E Core Rulebook (2022)
- High Guard 2022 Update
- Central Supply Catalogue

## Notes

All specifications extracted from official Mongoose Traveller 2E books. Ship images in High Guard inspire the visual design but are NOT copied due to copyright. SVG schematics will be original creations inspired by the official artwork.
