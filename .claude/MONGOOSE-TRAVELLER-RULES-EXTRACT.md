# Mongoose Traveller 2nd Edition - Rules Extract for VTT

**Created:** 2025-11-04
**Source:** Mongoose Traveller Books 1 & 2 (2017 Edition)
**Purpose:** Reference document for Traveller Combat VTT implementation

⚠️ **IMPORTANT:** This document replaces direct PDF access. Always use this document instead of reading the PDFs to avoid token exhaustion.

---

## Table of Contents

### Book 1: Characters & Combat
- Combat System (p. 70-75)
- Weapons & Equipment (p. 76-115)
- Armour (p. 79-83)

### Book 2: Spacecraft & Worlds
- Space Combat (p. 30-39)
- Common Spacecraft (p. 40-71)

---

# PERSONAL COMBAT SYSTEM

## Core Mechanics

### Combat Rounds
- Each combat round = **6 seconds**
- Initiative: 2D + DEX or INT DM (player choice)
- Higher Initiative acts first
- Each character gets **1 Significant Action + 1 Minor Action** OR **3 Minor Actions**

### Actions Per Round
**Significant Actions:**
- Attack (melee or ranged)
- Apply first aid
- Complex skill checks
- Use psychic power
- Issue orders

**Minor Actions:**
- Aim (+1 DM, max +6 over 6 rounds)
- Move (6 meters for humans, halved in difficult terrain, quartered when prone)
- Change stance (stand/crouch/prone)
- Draw/reload weapon
- Simple skill checks

**Reactions (unlimited, but -1 DM penalty per reaction):**
- Dodge (inflict -DEX DM or -Athletics to attacker)
- Dive for Cover (DM-2 to all attackers this round, forfeit next actions)
- Parry (inflict -Melee skill to attacker)

### Attack Resolution
**Melee Attack:** 2D + Melee skill + STR or DEX DM ≥ 8
**Ranged Attack:** 2D + Gun Combat skill + DEX DM ≥ 8

**Common Modifiers:**
- Aiming: +1 per Minor Action spent aiming (max +6)
- Short Range (≤1/4 weapon range): +1
- Long Range (>Range but <2x Range): -2
- Extreme Range (>2x Range but <4x Range): -4
- Target in Cover: -2
- Prone Target: -1
- Fast Moving Target: -1 per full 10m of movement

### Damage & Injury
1. Roll weapon damage dice
2. Add Effect of attack roll
3. Add STR DM (melee only)
4. Subtract target's Armour
5. Apply remaining damage to END first
6. When END reaches 0, damage goes to STR or DEX (target's choice)
7. When any two physical characteristics reach 0: **unconscious**
8. When all three reach 0: **dead**

**Effect of 6+ always inflicts at least 1 damage** regardless of armour

### Range Bands
- **Adjacent:** 1.5m (close combat range: melee attacks possible)
- **Short:** ≤1/4 listed range (+1 DM)
- **Medium:** Listed range (no modifier)
- **Long:** >Range to 2x Range (-2 DM)
- **Extreme:** >2x Range to 4x Range (-4 DM)
- **Beyond 100m = auto Extreme Range** unless weapon has Scope trait

### Cover & Concealment
**Using Cover:** -2 DM to all ranged attacks against you

**Hiding in Cover (no attacks):** Gain bonus Armour:
- Vegetation: +2
- Tree Trunk: +6
- Stone Wall: +8
- Civilian Vehicle: +10
- Armoured Vehicle: +15
- Fortifications: +20

---

# WEAPONS & EQUIPMENT

## Sample Personal Weapons

### Melee Weapons
**Dagger:** Damage 1D+2, TL1, Cr10, 1kg

### Ranged Weapons
**Rifle:** Damage 3D, Range 500m, TL5, Cr200, 5kg, Magazine 20 rounds (Cr10)

## Weapon Traits

**AP X:** Ignores X points of armour
**Auto X:** Burst fire (add X to damage), Full Auto (X attacks at -2 DM each, uses 3X ammo)
**Blast X:** Affects all targets within X meters (no dodge, only dive for cover)
**Bulky:** Requires STR 9+ or suffer penalty
**Destructive (DD):** Multiply damage by 10, Effect not added
**Radiation:** Inflicts 2D x 20 rads to nearby creatures
**Scope:** Negates auto-Extreme Range penalty beyond 100m when aiming
**Smart:** +DM based on TL difference (min +1, max +6)
**Stun:** Damage only to END, incapacitates when END reaches 0
**Zero-G:** No recoil, safe in zero gravity

---

# ARMOUR

## Armour Types

| Type | Protection | TL | Kg | Cost | Required Skill | Rad Protection |
|------|-----------|-----|-----|------|----------------|----------------|
| Jack | +1 | 1 | 1 | Cr50 | None | - |
| Mesh | +2 | 6 | 2 | Cr150 | None | - |
| Cloth | +5 | 7 | 10 | Cr250 | None | - |
| Cloth (TL10) | +8 | 10 | 5 | Cr500 | None | - |
| Flak Jacket | +3 | 7 | 8 | Cr100 | None | - |
| Reflec | +10 vs lasers only | 10 | 1 | Cr1500 | None | - |
| Ablat | +1 (+6 vs lasers, -1 per hit) | 9 | 2 | Cr75 | None | - |
| Combat Armour (TL10) | +13 | 10 | 20 | Cr96000 | Vacc Suit 0 | 85 rads |
| Combat Armour (TL12) | +17 | 12 | 16 | Cr88000 | Vacc Suit 1 | 145 rads |
| Combat Armour (TL14) | +19 | 14 | 12 | Cr160000 | Vacc Suit 0 | 180 rads |
| Vacc Suit (TL8) | +4 | 8 | 17 | Cr12000 | Vacc Suit 0 | 10 rads |
| Vacc Suit (TL10) | +8 | 10 | 10 | Cr11000 | Vacc Suit 1 | 60 rads |
| Vacc Suit (TL12) | +10 | 12 | 8 | Cr20000 | Vacc Suit 1 | 90 rads |
| Hostile Env Vacc (TL9) | +8 | 9 | 22 | Cr24000 | Vacc Suit 0 | 75 rads |
| Hostile Env Vacc (TL10) | +9 | 10 | 13 | Cr20000 | Vacc Suit 0 | 90 rads |
| Hostile Env Vacc (TL11) | +12 | 11 | 13 | Cr22000 | Vacc Suit 0 | 140 rads |
| Hostile Env Vacc (TL13) | +14 | 13 | 10 | Cr40000 | Vacc Suit 2 | 170 rads |
| Hostile Env Vacc (TL14) | +15 | 14 | 9 | Cr60000 | Vacc Suit 1 | 185 rads |
| Battle Dress (TL13) | +22 | 13 | 100* | Cr200000 | Vacc Suit 2 | 245 rads |
| Battle Dress (TL14) | +25 | 14 | 100* | Cr220000 | Vacc Suit 1 | 290 rads |

*Battle Dress is powered - effective weight is 0 when active. Grants +4 STR/DEX (TL13) or +6 STR/DEX (TL14)

### Armour Options
- **Chameleon IR (TL12):** DM-4 to detect with IR sensors (Cr5000)
- **Chameleon Vislight (TL13):** DM-4 to spot visually (Cr50000)
- **Eye Protection (TL6):** Guards against laser blinding (Cr50, included in TL9+ armour)
- **Grav Assist (TL12):** Built-in grav belt (Cr110000, Combat Armour/Battle Dress only)
- **Magnetic Grapples (TL8):** Walk on ships without gravity (Cr100)
- **Medikit (TL10):** Auto first aid at Medic 3 when END=0 (Cr5000)
- **Self-Sealing (TL11):** Auto-repairs breaches and tears (Cr2000)
- **Computer Weave:** Adds Computer/0 (TL10, Cr500), /1 (TL11, Cr1000), or /2 (TL13, Cr5000)
- **Thruster Pack (TL9):** Zero-G maneuvering (Cr2000)

---

# SPACE COMBAT SYSTEM

## Core Differences from Personal Combat

### Combat Rounds
- Each combat round = **6 minutes** (not 6 seconds!)
- Initiative: 2D + Pilot skill + ship's Thrust score
- Tactics (naval) check at start: Effect adds to initiative

### Combat Steps (in initiative order)
1. **Manoeuvre Step:** Ships allocate Thrust to movement or combat manoeuvres
2. **Attack Step:** Ships attack with weapons
3. **Actions Step:** Other actions (repairs, jumping, launching craft, etc.)

### Range Bands (Space Scale)
| Range Band | Distance | Thrust to Move In/Out |
|------------|----------|---------------------|
| Adjacent | ≤1 km | 1 |
| Close | 1-10 km | 1 |
| Short | 11-1,250 km | 2 |
| Medium | 1,251-10,000 km | 5 |
| Long | 10,001-25,000 km | 10 |
| Very Long | 25,001-50,000 km | 25 |
| Distant | >50,000 km | 50 |

**Thrust Required:** Amount needed to move between adjacent range bands. Ships can spend Thrust over multiple rounds.

**When ships travel toward each other:** Add their Thrust together
**When one ship pursues another:** Subtract lower Thrust from higher

---

## Crew Positions & Duties

**Pilot:** Manoeuvre ship, evasive action
**Captain:** Leadership, Tactics checks
**Engineer:** Manage power plant, drives, damage control
**Sensor Operator:** Electronic warfare, track enemies
**Turret Gunner:** One per turret
**Bay Gunner:** One per bay weapon
**Marine:** Board/repel boarders
**Passenger:** Wait in stateroom

**Automated Positions:**
- Fire Control software can act as gunner or assist gunners
- Auto-Repair + repair drones can do damage control
- Intellect + Expert programs can automate Engineer or Pilot

---

## Manoeuvre Step Actions

### Movement
Spend Thrust to change Range Band (see table above). Remaining Thrust can be used for:

### Combat Manoeuvres (1 Thrust each, once per round except Dodge)
- **Aid Gunners:** Pilot check starts task chain for gunners
- **Docking:** Pilot check to dock (opposed if unwilling target, attacker has Bane)
- **Evasive Action:** Use remaining Thrust as reactions to dodge

---

## Attack Step

### Firing Spacecraft Weapons
**Attack Roll:** 2D + Gunner skill + DEX DM ≥ 8

**Modifiers:**
- Short Range: +1
- Long Range: -2
- Very Long Range: -4
- Distant Range: -6
- Pulse Laser: +2
- Beam Laser: +4

### Spacecraft Weapons

| Weapon | TL | Range | Damage | Tons | Cost | Traits |
|--------|-----|-------|--------|------|------|--------|
| Beam Laser | 10 | Medium | 1D | - | MCr0.5 | - |
| Pulse Laser | 9 | Long | 2D | - | MCr1 | - |
| Missile Rack | 7 | Special | 4D | - | MCr0.75 | Smart |
| Sandcaster | 9 | Special | Special | - | MCr0.25 | - |

**Turret Costs:**
- Single Turret: MCr0.2 (TL7)
- Double Turret: MCr0.5 (TL8)
- Triple Turret: MCr1 (TL9)

**Linking Weapons in Multi-Turrets:**
- Same weapon type: Make one attack, add +1 per die per extra weapon
- Different weapon types: Can only fire one type per round
- Example: Triple turret with 3 pulse lasers = one attack for 2D+4 damage

### Missiles
- Each turret holds 12 missiles (Cr250,000 to refill)
- 1 round to reload
- Missiles move one Range Band per round toward target
- Can be destroyed by Point Defense lasers
- Always fired individually (don't benefit from multi-turret linking)

### Sandcasters
- Each turret holds 20 canisters (Cr25,000 to refill)
- 1 round to reload
- Reaction: Gunner check vs laser attack, add 1D + Effect to Armour vs that attack only
- Can also target boarding parties: 8D damage (Personal scale) if check succeeds

---

## Damage Scale: Spacecraft vs Ground

| Attacker → Target | DM to Hit | Damage |
|-------------------|-----------|---------|
| Ground → Ground | +0 | x1 |
| Ground → Spacecraft | +2 | ÷10 |
| Spacecraft → Ground | -2 | x10 |
| Spacecraft → Spacecraft | +0 | x1 |

**Spacecraft weapons attacking Ground targets also have Blast 10**

---

## Spacecraft Damage

### Applying Damage
1. Roll damage + Effect
2. Subtract Armour
3. Deduct from Hull
4. Hull = 0: Ship is **wrecked** (no power, no life support)

### Critical Hits
**Trigger:** Attack Effect ≥6 AND causes damage

**Severity:** Damage dealt ÷ 10 (round up)

**Sustained Damage:** Ship suffers Severity 1 crit every time it loses 10% of starting Hull

**Location (2D):**
- 2: Sensors
- 3: Power Plant
- 4: Fuel
- 5: Weapon (random)
- 6: Armour
- 7: Hull
- 8: M-Drive
- 9: Cargo
- 10: J-Drive
- 11: Crew
- 12: Computer

### Critical Hit Effects (Severity 1-6)

**Sensors:**
- Sev 1: DM-2 to sensor checks beyond Medium
- Sev 2: Inoperative beyond Medium
- Sev 3: Inoperative beyond Short
- Sev 4: Inoperative beyond Close
- Sev 5: Inoperative beyond Adjacent
- Sev 6: Disabled

**Power Plant:**
- Sev 1: Thrust -1, Power -10%
- Sev 2: Thrust -1, Power -10%
- Sev 3: Thrust -1, Power -50%
- Sev 4-6: Thrust 0, Power 0, Hull Severity +1 (Sev 6: +1D)

**Fuel:**
- Sev 1: Leak - lose 1D tons/hour
- Sev 2: Leak - lose 1D tons/round
- Sev 3: Leak - lose 1D x 10% fuel
- Sev 4-6: Fuel tank destroyed, Hull Severity +1 (Sev 6: +1D)

**Weapon:**
- Sev 1: Weapon has Bane when used
- Sev 2: Weapon disabled
- Sev 3: Weapon destroyed
- Sev 4-6: Weapon explodes, Hull Severity +1 (Sev 6: +1D)

**M-Drive:**
- Sev 1: DM-1 to control, Thrust -1
- Sev 2: DM-2 to control, Thrust -1
- Sev 3: DM-3 to control, Thrust -1
- Sev 4: DM-4 to control, Thrust -1
- Sev 5-6: Thrust 0, Hull Severity +1 (Sev 6: only)

**Hull:**
- Sev 1-6: Ship suffers 1D/2D/3D/4D/5D/6D damage immediately

---

## Reactions in Space Combat

### Evasive Action (Pilot)
- Costs unspent Thrust (1 Thrust per attack dodged)
- Inflicts -Pilot skill to attacker's roll

### Point Defense (Gunner)
- Use turret laser to shoot down missiles
- Gunner check vs incoming salvo: Effect = missiles destroyed
- Double turret: +1 DM, Triple turret: +2 DM
- Weapon cannot attack in same round

### Disperse Sand (Gunner)
- Use sandcaster vs incoming laser
- Gunner check: add 1D + Effect to Armour vs that laser only
- Uses 1 canister per reaction

---

## Actions Step

### Jump (Engineer)
- Astrogation check: Calculate jump course (1D minutes with DM-2 for combat rush)
- Engineer (j-drive) check: Prepare drive (1D minutes with DM-2 for combat rush)
- See Jump Travel rules (Book 2, p.24)

### Overload Drive (Engineer)
- **M-Drive:** Difficult (10+) Engineer (m-drive) check, +1 Thrust next round
- **Power Plant:** Difficult (10+) Engineer (power) check, +10% Power next round
- **Failure Effect -6 or worse:** Severity 1 crit to that system
- **Cumulative DM-2** each attempt (reset after maintenance: 1D hours)

### Repair System (Engineer)
- Average (8+) Engineer check (1 round)
- DM = -Severity of crit
- Cumulative +1 DM each round working on same crit
- **Only repairs crit effects, not Hull damage or destroyed equipment**
- **Repairs last 1D hours only**

### Offline System (Engineer)
- Engineer (power) check (1 round)
- Power down systems to free Power points
- Takes another round to bring back online

### Reload Turret (Gunner)
- 1 round to reload missile rack or sandcaster

---

## Boarding Actions

### Requirements
- Ships at Adjacent range (<1 km)
- Marines on duty
- Declared during Actions Step
- Takes 2D rounds to reach target

### Resolution
Both sides roll 2D + modifiers:

**Modifiers:**
- Superior Armour: +1
- Superior Weaponry: +1
- Superior Skills/Tactics: +2
- Superior Numbers: +1
- Vastly Superior Numbers: +3
- Defender has no Marines: -2

**Subtract defender's total from attacker's total:**

| Total | Result |
|-------|--------|
| -7 or less | Attackers defeated; defender may counter-board at +4 DM |
| -4 to -6 | Attackers retreat or are killed/captured |
| -1 to -3 | Fighting continues (1D rounds), defender +2 next roll, ship loses 2D Hull |
| 0 | Fighting continues (1D rounds) |
| 1 to 3 | Fighting continues (1D rounds), attacker +2 next roll, ship loses 2D Hull |
| 4 to 6 | Success! Ship loses 1D Hull. Attackers take control after 2D rounds |
| 7+ | Attackers take control immediately |

---

## Close Range Combat (<10km)

When ships get to Close or Adjacent range, use **vehicle combat rules** with these modifications:

### Dogfighting
- Both pilots make opposed Pilot checks each round
- Winner can position ship to use all forward weapons while staying out of enemy's forward arc
- Winner: +2 DM to all attacks
- Loser: -2 DM to all attacks
- Winner of previous round adds previous Effect as DM to current round

**Spacecraft dogfighting vehicles:** Additional -2 DM (spacecraft are less nimble in atmosphere)

---

# COMMON SPACECRAFT

## Key Spacecraft Statistics

### Free Trader (Type-A)
**Hull:** 200 tons, Streamlined, Armour 2, 80 Hull Points
**Performance:** Thrust 1, Jump-1
**Crew:** 5 (Pilot, Astrogator, Engineer, Medic, Steward)
**Passengers:** 10 staterooms, 20 low berths
**Cargo:** 81 tons
**Weapons:** None (can mount 2 turrets)
**Cost:** MCr51.48
**Maintenance:** Cr4,290/month

**Systems:** Fuel scoop, fuel processor, cargo crane
**Fuel:** 21 tons (4 weeks operation, Jump-1)
**Computer:** Computer/5, Jump Control/1, Library, Manoeuvre/0
**Sensors:** Civilian Grade

**Typical Configuration:** The classic tramp freighter. Often retrofitted with turrets and weapons.

---

### Far Trader (Type-A2)
**Hull:** 200 tons, Streamlined, Armour 2, 80 Hull Points
**Performance:** Thrust 1, Jump-2
**Crew:** 5 (Pilot, Astrogator, Engineer, Medic, Steward)
**Passengers:** 10 staterooms, 6 low berths
**Cargo:** 64 tons
**Weapons:** None (can mount 2 turrets)
**Cost:** MCr52.42
**Maintenance:** Cr4,368/month

**Systems:** Fuel scoop, fuel processor, cargo crane
**Fuel:** 41 tons (4 weeks operation, Jump-2)
**Computer:** Computer/5bis, Jump Control/2, Library, Manoeuvre/0
**Sensors:** Civilian Grade

**Description:** Modified free trader with longer jump range at cost of cargo space.

---

### Scout/Courier (Type-S)
**Hull:** 100 tons, Streamlined, Armour 4, 40 Hull Points
**Performance:** Thrust 2, Jump-2
**Crew:** 3 (Pilot, Astrogator, Engineer) - often operated by 1-2 skilled individuals
**Passengers:** 4 staterooms
**Cargo:** 12 tons
**Weapons:** 1 Double Turret (can mount 1 turret total)
**Cost:** MCr36.94
**Maintenance:** Cr3,078/month

**Systems:** Fuel scoop, fuel processor, 10 probe drones, air/raft (4 tons docking), workshop
**Fuel:** 23 tons (12 weeks operation, Jump-2)
**Computer:** Computer/5bis, Jump Control/2, Library, Manoeuvre/0
**Sensors:** Military Grade

**Description:** Exploration, survey, and courier vessel. Fast and self-sufficient.

---

### Patrol Corvette (Type-T)
**Hull:** 400 tons, Streamlined, Armour 4, 160 Hull Points
**Performance:** Thrust 4, Jump-3
**Crew:** 16 (Pilot, Astrogator, 2 Engineers, Medic, 4 Gunners, 8 Marines)
**Passengers:** 12 staterooms, 4 low berths
**Cargo:** 38 tons
**Weapons:** 2 Triple Turrets (Pulse Lasers), 2 Triple Turrets (Missile Racks) - can mount 4 turrets total
**Cost:** MCr184.46
**Maintenance:** Cr15,371/month

**Systems:** Fuel scoop, fuel processor, ship's boat (30 tons), G/carrier (15 tons)
**Fuel:** 124 tons (4 weeks operation, Jump-3 + small craft fuel)
**Computer:** Computer/15, Evade/1, Fire Control/1, Jump Control/3, Library, Manoeuvre/0
**Sensors:** Military Grade
**Power Required:** 160 (M-Drive) + 80 (Basic) + 120 (J-Drive) + 2 (Sensors) + 28 (Weapons) = 390 total

**Description:** Military vessel for customs, anti-piracy, system defense. Can pursue into atmospheres.

---

### Mercenary Cruiser (Type-C)
**Hull:** 800 tons, Sphere, Armour 4, 320 Hull Points
**Performance:** Thrust 3, Jump-3
**Crew:** 12 + ~25 marines/troops (Pilot, Astrogator, 3 Engineers, Medic + platoon)
**Passengers:** 25 staterooms
**Cargo:** 119 tons
**Weapons:** 8 Triple Turrets (can be configured) - can mount 8 turrets total
**Cost:** MCr305.27
**Maintenance:** Cr25,439/month

**Systems:** Repair drones, 2 modular cutters (50 tons each, with ATVs), air/raft
**Fuel:** 252 tons (4 weeks operation, Jump-3 + cutter fuel)
**Computer:** Computer/20fib, Auto-Repair/2, Evade/1, Fire Control/1, Jump Control/3, Library, Manoeuvre/0
**Sensors:** Military Grade
**Power Required:** 240 (M-Drive) + 160 (Basic) + 240 (J-Drive) + 2 (Sensors) + 8 (Turrets) = 650 total

**Description:** Carries combat platoon. Deploys via two modular cutters with ATVs. Well-armed.

---

### Subsidised Liner (Type-M)
**Hull:** 600 tons, Standard, Armour 0, 240 Hull Points
**Performance:** Thrust 1, Jump-3
**Crew:** 6 (Pilot, Astrogator, 2 Engineers, Medic, Steward)
**Passengers:** 30 staterooms, 20 low berths
**Cargo:** 119 tons
**Weapons:** None (can mount 6 turrets)
**Cost:** MCr158.32
**Maintenance:** Cr13,193/month

**Systems:** Launch (20 tons)
**Fuel:** 183 tons (4 weeks operation, Jump-3)
**Computer:** Computer/10bis, Jump Control/3, Library, Manoeuvre/0
**Sensors:** Civilian Grade

**Description:** Long-haul passenger transport. Cheap travel, not luxury. Launch ferries passengers planetside.

---

### Safari Ship (Type-K)
**Hull:** 200 tons, Streamlined, Armour 0, 80 Hull Points
**Performance:** Thrust 1, Jump-2
**Crew:** 5 (Pilot, Astrogator, Engineer, Medic, Steward)
**Passengers:** 11 staterooms
**Cargo:** 14 tons
**Weapons:** 1 Double Turret (can mount 2 turrets total)
**Cost:** MCr71.51
**Maintenance:** Cr5,959/month

**Systems:** Fuel scoop, fuel processor, launch (20 tons with ATV), air/raft, 2x multi-environment holding tanks (8 tons each), trophy lounge
**Fuel:** 41 tons (4 weeks operation, Jump-2)
**Computer:** Computer/5bis, Jump Control/2, Library, Manoeuvre/0
**Sensors:** Civilian Grade

**Description:** Excursion vessel for expeditions and specimen collection. High comfort level.

---

### Seeker Mining Ship (Type-J)
**Hull:** 100 tons, Streamlined, Armour 4, 40 Hull Points
**Performance:** Thrust 2, Jump-2
**Crew:** 2 (Pilot, Astrogator, Engineer - often one person does multiple roles)
**Passengers:** 2 staterooms
**Cargo:** 26 tons
**Weapons:** 1 Double Turret (can mount 1 turret total)
**Cost:** MCr33.84
**Maintenance:** Cr2,820/month

**Systems:** Fuel scoop, fuel processor, 10 mining drones
**Fuel:** 21 tons (4 weeks operation, Jump-2)
**Computer:** Computer/5bis, Jump Control/2, Library, Manoeuvre/0
**Sensors:** Military Grade

**Description:** Refitted scout for asteroid mining and mineral prospecting.

---

### Laboratory Ship (Type-L)
**Hull:** 400 tons, Standard, Armour 0, 160 Hull Points
**Performance:** Thrust 2, Jump-2
**Crew:** 4 + scientists (Pilot, Astrogator, Engineer, Medic)
**Passengers:** 20 staterooms
**Cargo:** 3 tons
**Weapons:** None (can mount 4 turrets)
**Cost:** MCr136.37
**Maintenance:** Cr11,365/month

**Systems:** 15 probe drones, pinnace (40 tons with ATV stored), air/raft, 100 tons of laboratories, rotating hull for spin gravity
**Fuel:** 82 tons (4 weeks operation, Jump-2)
**Computer:** Computer/10, Jump Control/2, Library, Manoeuvre/0
**Sensors:** Improved

**Description:** Research vessel with advanced sensors and extensive lab space. Can create artificial gravity via rotation.

---

## Ship Design Notes

### Power Requirements
Ships need sufficient Power from their power plant to run:
- Manoeuvre Drive (varies by Thrust and hull size)
- Jump Drive (varies by Jump number and hull size)
- Basic Ship Systems (typically 40% of hull tonnage)
- Sensors (1-4 points depending on grade)
- Weapons (varies by weapon type)

### Turret Capacity
- Every 100 tons of hull allows 1 turret
- Example: 200 ton ship can mount 2 turrets, 800 ton ship can mount 8 turrets

### Maintenance
- Annual maintenance costs = 0.1% of purchase cost per month
- Skipping maintenance increases breakdown chance

### Technology Levels
- Most ships shown are TL12 (common Third Imperium standard)
- Lower TL ships exist but are less efficient
- Higher TL ships (13-15) have better components but are expensive

---

# DESIGN PATTERNS FOR VTT

## What the VTT Currently Models

### From Personal Combat:
✅ Initiative system (2D + stat modifier)
✅ Attack rolls (2D + skill + stat ≥ 8)
✅ Damage rolls with Effect added
✅ Armour reduction
✅ HP tracking (END first, then STR/DEX)
✅ Range bands and modifiers
✅ Weapon traits (some)

### From Space Combat:
✅ Different scale (6 minute rounds)
✅ Initiative (2D + Pilot + Thrust)
✅ Range bands (space scale)
✅ Spacecraft attacks
✅ Damage to Hull
✅ Critical hits with locations

## What Needs Implementation

### Missing from Personal Combat:
❌ Reactions (Dodge, Parry, Dive for Cover) with cumulative penalties
❌ Minor Actions (Aim, Move, Reload, Change Stance)
❌ Grappling rules
❌ Leadership checks affecting allies
❌ Extended actions across multiple rounds
❌ Cover mechanics (+armour bonus)

### Missing from Space Combat:
❌ Manoeuvre Step (Thrust allocation)
❌ Combat manoeuvres (Aid Gunners, Docking, etc.)
❌ Reactions (Evasive Action, Point Defense, Disperse Sand)
❌ Actions Step (Jump, Overload, Repair, Offline, Reload)
❌ Multi-turret weapon linking
❌ Missile movement (Range Band per round)
❌ Boarding actions
❌ Critical hit effects (detailed system damage)
❌ Sustained damage (10% Hull = Severity 1 crit)
❌ Crew positions and automation
❌ Power management

---

# IMPLEMENTATION PRIORITIES

## Stage 8 Candidates (Ship Selection & Damage)

Based on current implementation (Stages 1-7 complete: Basic combat, Ship models, Crew system, Movement/Hex grid):

### Critical for Ship Combat:
1. **Ship Selection UI** - Choose from common spacecraft
2. **Ship Stats Display** - Show Hull, Armour, Thrust, Weapons
3. **Space Combat Initiative** - 2D + Pilot + Thrust
4. **Spacecraft Weapons** - Beam/Pulse Laser, Missiles, Sandcasters
5. **Spacecraft Damage** - Hull tracking, Critical hits
6. **Range Bands (Space)** - Different scale from personal combat

### Nice to Have:
- Manoeuvre Step (Thrust allocation)
- Turret configuration (Single/Double/Triple)
- Basic crew positions
- Simple repairs

### Can Defer to Stage 9+:
- Full critical hit effects
- Boarding actions
- Power management
- Missile tracking
- Complex reactions
- Overload mechanics

---

# QUESTIONS FOR STAGE 8+ PLANNING

## Technical Architecture Questions

1. **Scale Separation:** How do we handle Personal vs Spacecraft combat in same session?
   - Separate combat modes?
   - Can characters board ships mid-combat?
   - How does scale transition work?

2. **Ship as Entity vs Collection:**
   - Is ship a single entity with stats, or collection of systems?
   - How do we model critical hits to subsystems?
   - Do we track individual turrets?

3. **Crew Integration:**
   - We have character/skill system (Stage 6) - how do crew positions interact?
   - Can characters switch positions mid-combat?
   - How do we handle automated systems?

4. **Turn Structure:**
   - Do we need separate Manoeuvre/Attack/Actions steps?
   - Or simplified "declare all actions, then resolve"?
   - How do reactions work in async/multiplayer?

## Game Design Questions

1. **Complexity vs Usability:**
   - Do we implement full Traveller rules or simplified version?
   - Which mechanics are essential vs optional?
   - What's the MVP for space combat?

2. **UI/UX:**
   - How do we make 6-minute rounds feel engaging?
   - How do we visualize space ranges (km vs meters)?
   - How do we show system damage clearly?

3. **Scope Creep:**
   - Can we ship Stage 8 without boarding actions?
   - Can we skip missile tracking initially?
   - What's minimum viable space combat?

---

# MONGOOSE TRAVELLER DESIGN PHILOSOPHY

## Key Principles

1. **Lethality:** Combat is deadly. High-tech weapons can kill in one hit.

2. **Initiative Matters:** Going first is huge advantage. Ambushes are devastating.

3. **Cover is King:** In personal combat, cover provides massive benefits.

4. **Skills Over Stats:** A skilled character with poor stats beats unskilled character with great stats.

5. **No Superheroes:** Characters are competent professionals, not action heroes.

6. **Technology Levels:** TL makes enormous difference. TL12 gear vs TL8 gear = huge advantage.

7. **Space is Slow:** Even with powerful drives, space combat takes time and distance.

8. **Critical Hits:** Lucky shots can disable ships regardless of size difference.

9. **Crew Competence:** Having skilled crew in right positions matters enormously.

10. **Reactions Have Costs:** Every dodge/reaction makes you less effective next turn.

## Implications for VTT

- Don't buff HP/Hull - keep lethality
- Make initiative visible and impactful
- Implement reactions with cumulative penalties
- Show skill modifiers clearly
- Make cover bonuses obvious
- Space combat should feel methodical, not twitchy
- Critical hits should be dramatic and consequential
- Crew skills should visibly affect ship performance

---

## End of Rules Extract

**Last Updated:** 2025-11-04
**Extracted From:** Mongoose Traveller Books 1 & 2 (2017 Edition)
**For:** Traveller Combat VTT Project

**Remember:** Use this document instead of the PDFs to avoid token exhaustion. If specific rules need clarification, extract targeted pages (5-10 max) using `pdftotext -f [start] -l [end]`.
