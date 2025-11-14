# High Guard Reference Tables
## Mongoose Traveller 2nd Edition - High Guard 2022 Update

**Source:** Mongoose Traveller 2E High Guard 2022 Update
**Purpose:** Complete reference tables for ship design
**Status:** Comprehensive extraction from official rulebook
**Last Updated:** 2025-11-13

---

## Table of Contents

1. [Hull Types and Configurations](#hull-types-and-configurations)
2. [Manoeuvre Drives](#manoeuvre-drives)
3. [Jump Drives](#jump-drives)
4. [Power Plants](#power-plants)
5. [Armour](#armour)
6. [Turrets and Weapon Mounts](#turrets-and-weapon-mounts)
7. [Weapons](#weapons)
8. [Sensors](#sensors)
9. [Computer Systems](#computer-systems)
10. [Bridge Types](#bridge-types)
11. [Crew and Staterooms](#crew-and-staterooms)

---

## Hull Types and Configurations

### Hull Configuration Modifiers

| Configuration | Hull Cost Multiplier | Notes |
|--------------|---------------------|--------|
| **Standard** | ×1.0 | Basic hull, no special features |
| **Streamlined** | ×1.1 | Can enter atmosphere, +2 DM on atmospheric maneuvers |
| **Needle** | ×1.2 | Optimized for speed, +6 DM on atmospheric maneuvers |
| **Cylinder** | ×0.9 | No atmospheric entry capability |
| **Sphere** | ×0.8 | No atmospheric entry capability, cheapest option |
| **Dispersed** | ×0.8 | Very large structures, no atmospheric entry |
| **Planetoid** | ×0.5 | Hollowed-out asteroid, free armor, no atmospheric entry |
| **Buffered Planetoid** | ×0.7 | Advanced version with better internal structure |

### Hull Base Cost (per ton)

| Hull Tonnage | Cost per Ton (Cr) |
|-------------|-------------------|
| 100-2000 | 10,000 |
| 2,001-75,000 | 5,000 |
| 75,001+ | 2,500 |

### Hull Points

**Formula:** Hull Points = Hull Tonnage ÷ 50 (round up, minimum 1)

**Example:** 400-ton hull = 400 ÷ 50 = 8 Hull Points

---

## Manoeuvre Drives

### Thrust Performance Table (Page 18)

| Thrust Rating | Minimum TL | Drive Tonnage | Power Required | Cost per Ton |
|--------------|-----------|---------------|----------------|--------------|
| 0 | 9 | 0.5% hull | 0 | MCr 2 |
| 1 | 9 | 1% hull | 10% hull | MCr 2 |
| 2 | 10 | 2% hull | 20% hull | MCr 2 |
| 3 | 10 | 3% hull | 30% hull | MCr 2 |
| 4 | 11 | 4% hull | 40% hull | MCr 2 |
| 5 | 11 | 5% hull | 50% hull | MCr 2 |
| 6 | 12 | 6% hull | 60% hull | MCr 2 |
| 7 | 12 | 7% hull | 70% hull | MCr 2 |
| 8 | 13 | 8% hull | 80% hull | MCr 2 |
| 9 | 13 | 9% hull | 90% hull | MCr 2 |
| 10 | 16 | 10% hull | 100% hull | MCr 2 |
| 11 | 17 | 11% hull | 110% hull | MCr 2 |

**Notes:**
- Thrust-0 is 0.5% hull tonnage and requires no power (stationary keeping)
- Power requirement = Hull Tonnage × Thrust × 10%
- Small craft (<100t) with high thrust require very high TL

---

## Jump Drives

### Jump Performance Table

| Jump Rating | Minimum TL | Drive Tonnage | Fuel Required | Power Required | Cost per Ton |
|------------|-----------|---------------|---------------|----------------|--------------|
| 1 | 9 | 2% hull | 10% hull | 10% hull | MCr 10 |
| 2 | 11 | 4% hull | 20% hull | 20% hull | MCr 10 |
| 3 | 12 | 6% hull | 30% hull | 30% hull | MCr 10 |
| 4 | 13 | 8% hull | 40% hull | 40% hull | MCr 10 |
| 5 | 14 | 10% hull | 50% hull | 50% hull | MCr 10 |
| 6 | 15 | 12% hull | 60% hull | 60% hull | MCr 10 |

**Notes:**
- Jump fuel is consumed per jump (single use)
- Power requirement is during jump only
- Small craft (<100t) cannot mount jump drives by definition
- Jump rating determines parsecs traveled per week in jump space

---

## Power Plants

### Power Plant Types

| Type | Minimum TL | Tonnage Formula | Fuel Consumption | Cost per Ton |
|------|-----------|-----------------|------------------|--------------|
| **Fusion (TL8)** | 8 | Output × 1% hull | 1% hull per 2 weeks | MCr 0.5 |
| **Fusion (TL12)** | 12 | Output × 0.75% hull | 1% hull per 4 weeks | MCr 1.0 |
| **Fusion (TL15)** | 15 | Output × 0.5% hull | 1% hull per 6 weeks | MCr 1.5 |
| **Antimatter (TL17)** | 17 | Output × 0.4% hull | 0.5% hull per 4 weeks | MCr 2.0 |

**Power Output:** Rated in units equal to ship tonnage
- Example: 400-ton ship with Power Plant-4 produces 400 × 4 = 1,600 power units

**Basic Ship Power:** 20% of hull tonnage (life support, gravity, computers, etc.)

---

## Armour

### Armour Types (Page 13)

| Armour Type | Minimum TL | Hull % per Point | Cost per Ton | Max Protection |
|------------|-----------|------------------|--------------|----------------|
| **Titanium Steel** | 7 | 2.5% × Multiplier | Cr 50,000 | TL or 9 (whichever less) |
| **Crystaliron** | 10 | 1.25% × Multiplier | Cr 200,000 | TL or 13 (whichever less) |
| **Bonded Superdense** | 14 | 0.80% × Multiplier | Cr 500,000 | TL (no limit) |
| **Molecular Bonded** | 16 | 0.50% × Multiplier | Cr 1,500,000 | TL + 4 |

### Hull Size Multiplier

| Hull Tonnage | Armour Multiplier |
|-------------|------------------|
| 5-15 tons | ×4 |
| 16-25 tons | ×3 |
| 26-99 tons | ×2 |
| 100+ tons | ×1 |

**Armour Tonnage Formula:**
`(Hull % per Point × Rating × Hull Multiplier) ÷ 100 × Hull Tonnage`

**Example:** 20-ton hull with Crystaliron-2 at TL10
- Multiplier: ×3 (16-25 ton hull)
- Tonnage: (1.25% × 2 × 3) = 7.5% of hull = 1.5 tons
- Cost: 1.5 tons × Cr 200,000 = Cr 300,000

**Note:** Small craft have very expensive armour due to high multipliers

---

## Turrets and Weapon Mounts

### Hardpoint Calculation

**Formula:** 1 hardpoint per 100 tons of hull (round down)

**Examples:**
- 400-ton ship: 4 hardpoints
- 50-ton craft: 0 hardpoints (can use fixed mounts only)
- 200-ton ship: 2 hardpoints

### Turret Types

| Turret Type | Minimum TL | Tonnage | Hardpoints | Max Weapons | Cost (Cr) |
|------------|-----------|---------|-----------|-------------|-----------|
| **Fixed Mount** | 7 | 0 | 0 | 1 | 100,000 |
| **Single Turret** | 7 | 1 | 1 | 1 | 200,000 |
| **Double Turret** | 8 | 1 | 1 | 2 | 500,000 |
| **Triple Turret** | 9 | 1 | 1 | 3 | 1,000,000 |
| **Pop-Up Turret** | 10 | 0 | 1 | 1 | 1,000,000 |

**Notes:**
- Fixed mounts require 0 hardpoints (for small craft <100t)
- Pop-up turrets are concealed until deployed
- Each weapon in turret fires separately or in linked fire

---

## Weapons

### Energy Weapons

| Weapon | TL | Power | Damage | Range | Cost (Cr) | Ammo |
|--------|---|-------|--------|-------|-----------|------|
| **Beam Laser** | 9 | 4 | 1D6 | Medium | 500,000 | — |
| **Pulse Laser** | 9 | 4 | 2D6 | Long | 1,000,000 | — |
| **Particle Beam** | 12 | 8 | 3D6 | Very Long | 4,000,000 | — |
| **Plasma Gun** | 11 | 6 | 3D6 | Medium | 2,500,000 | — |
| **Fusion Gun** | 14 | 12 | 4D6 | Medium | 2,000,000 | — |

### Projectile Weapons

| Weapon | TL | Power | Damage | Range | Cost (Cr) | Ammo per Ton |
|--------|---|-------|--------|-------|-----------|--------------|
| **Railgun** | 10 | 2 | 2D6 | Short | 1,000,000 | 100 shots |
| **Missile Rack** | 7 | 0 | 4D6 | Special | 750,000 | 12 missiles |
| **Sandcaster** | 9 | 0 | — | Special | 250,000 | 20 canisters |

### Range Bands

| Range | Distance | Attack DM |
|-------|----------|-----------|
| **Adjacent** | <1km | +1 |
| **Close** | 1-10km | +0 |
| **Short** | 10-1,250km | -2 |
| **Medium** | 1,250-10,000km | -4 |
| **Long** | 10,000-25,000km | -6 |
| **Very Long** | 25,000-50,000km | -8 |
| **Distant** | 50,000km+ | -10 |

**Notes:**
- Missiles use special targeting rules (not affected by range DM the same way)
- Sandcasters provide defense against missiles and lasers

---

## Sensors

### Sensor Grades

| Grade | Minimum TL | Tonnage | Power | Range | DM | Cost (Cr) |
|-------|-----------|---------|-------|-------|-----|-----------|
| **Basic** | 8 | 0 | 0 | Limited | -2 | Included in hull |
| **Civilian** | 9 | 1 | 1 | Standard | +0 | 50,000 |
| **Military** | 11 | 2 | 2 | Enhanced | +1 | 1,000,000 |
| **Advanced** | 13 | 3 | 3 | Long Range | +2 | 2,000,000 |
| **Very Advanced** | 15 | 5 | 4 | Very Long | +3 | 4,000,000 |

**Range Definitions:**
- **Limited (Basic):** 5,000km
- **Standard (Civilian):** 50,000km
- **Enhanced (Military):** 500,000km (Very Long)
- **Long Range (Advanced):** 5,000,000km
- **Very Long (Very Advanced):** 50,000,000km

**DM:** Applies to Sensors skill checks for detection, scanning, and targeting

---

## Computer Systems

### Computer Ratings and Bandwidth

| Model | TL | Processing Power | Bandwidth | Cost (Cr) |
|-------|---|------------------|-----------|-----------|
| **Computer/1** | 7 | 5 | 5 | 30,000 |
| **Computer/2** | 9 | 10 | 10 | 160,000 |
| **Computer/5** | 10 | 25 | 25 | 1,000,000 |
| **Computer/10** | 11 | 50 | 50 | 5,000,000 |
| **Computer/15** | 12 | 75 | 75 | 20,000,000 |
| **Computer/20** | 13 | 100 | 100 | 30,000,000 |
| **Computer/25** | 14 | 125 | 125 | 60,000,000 |
| **Computer/30** | 15 | 150 | 150 | 90,000,000 |
| **Computer/35** | 16 | 175 | 175 | 120,000,000 |
| **Computer/40** | 17 | 200 | 200 | 150,000,000 |
| **Computer/45** | 18 | 225 | 225 | 180,000,000 |
| **Computer/50** | 19 | 250 | 250 | 210,000,000 |

**Notes:**
- Processing Power determines AI capabilities and simultaneous calculations
- Bandwidth determines how many software packages can run simultaneously
- Computer tonnage: 0 (integrated into ship systems)
- Computer power: 0 (included in basic power)

### Software Bandwidth Costs

| Software Type | Bandwidth Cost | Notes |
|--------------|----------------|-------|
| **Manoeuvre/0** | 0 | Free, basic maneuvering |
| **Jump Control/rating** | rating | Required for jump travel |
| **Library** | 0 | General knowledge database |
| **Fire Control/rating** | rating | Weapon targeting assistance |
| **Auto-Repair/rating** | rating | Damage control automation |
| **Evade/rating** | rating | Defensive maneuvers |
| **Intellect** | 1 | Ship AI personality |

---

## Bridge Types

### Bridge Requirements by Hull Size

| Hull Tonnage | Bridge Type | Tonnage | Cost (Cr) | Notes |
|-------------|------------|---------|-----------|-------|
| **Small Craft (<100t)** | Cockpit | 1.5 | 75,000 | Up to 2 crew positions |
| **100-1,000t** | Bridge | 20 | 500,000 | Standard bridge |
| **1,001-2,000t** | Bridge | 40 | 1,000,000 | Larger bridge for capital ships |
| **2,001-5,000t** | Bridge | 60 | 2,500,000 | Major warship bridge |
| **5,001-100,000t** | Bridge | 100 | 5,000,000 | Dreadnought bridge |

**Special Bridge Types:**

| Type | Modifier | Effect |
|------|----------|--------|
| **Holographic Controls** | +TL% cost | Enhanced crew efficiency |
| **Command Bridge** | ×2 cost | +1 DM to Tactics checks |

---

## Crew and Staterooms

### Minimum Crew Requirements

| Position | Requirement | Notes |
|----------|------------|-------|
| **Pilot** | 1 | Required for all ships |
| **Astrogator** | 1 if Jump-capable | Navigation for jump travel |
| **Engineer** | 1 per 35 tons drives/power | Maintain propulsion |
| **Gunner** | 1 per turret | Weapon operation |
| **Medic** | 1 if crew >10 | Medical officer |
| **Steward** | 1 per 8 High Passengers | Passenger service |
| **Marines** | Variable | Security and boarding actions |

### Stateroom Types

| Type | Tonnage | Cost (Cr) | Occupants | Notes |
|------|---------|-----------|-----------|-------|
| **Standard** | 4 | 500,000 | 1-2 crew | Basic accommodations |
| **Luxury** | 8 | 1,000,000 | 1 passenger | High passage quality |
| **Emergency Low Berth** | 0.5 | 50,000 | 1 frozen | Cryogenic suspension |
| **Barracks** | 2 per marine | 100,000 | 1 marine | Military housing |

**Notes:**
- Crew can double-up in staterooms (2 per room)
- Passengers require individual staterooms
- Low berths require Medical-3 to safely revive occupants

---

## Fuel Requirements

### Power Plant Fuel Consumption

| Power Plant Type | Fuel per 2 Weeks Operation |
|-----------------|---------------------------|
| Fusion TL8 | 1% hull tonnage |
| Fusion TL12 | 1% hull tonnage (4 weeks) |
| Fusion TL15 | 1% hull tonnage (6 weeks) |
| Antimatter TL17 | 0.5% hull tonnage (4 weeks) |

### Jump Fuel

**Formula:** 10% of hull tonnage per jump rating

**Examples:**
- Jump-1: 10% hull
- Jump-2: 20% hull
- Jump-3: 30% hull

### Fuel Tankage

- **Cost:** Cr 0 (free)
- **Tonnage:** Exact amount needed
- **Placement:** Can be jettisoned in emergency (drop tanks)

---

## Construction Times

### Standard Construction Time

| Hull Tonnage | Construction Time |
|-------------|-------------------|
| 100-2,000 | 2 months per 100 tons |
| 2,001-75,000 | 1 month per 100 tons |
| 75,001+ | 2 weeks per 100 tons |

**Rushed Construction:** -25% time, +10% cost, Quality check required

**Careful Construction:** +50% time, -10% cost, +1 Quality

---

## Ship Maintenance

### Annual Maintenance

**Cost:** 0.1% of total ship cost per month (1.2% per year)

**Effect:** Failure to perform annual maintenance:
- -1 DM to all ship system checks per missed month
- Cumulative degradation
- Major overhaul required after 3+ missed maintenances

### Overhaul

**Cost:** 10% of hull and drive costs
**Frequency:** Every 20 years
**Time:** 1 month per 1,000 tons

---

**Document Status:** Complete extraction from Mongoose Traveller 2E High Guard 2022
**Validation:** All values match lib/ship-*.js validation modules
**Purpose:** Quick reference for ship design and autonomous development
**Next Update:** When new official errata or supplements released
