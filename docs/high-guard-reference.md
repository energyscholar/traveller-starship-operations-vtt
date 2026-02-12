# High Guard Reference Tables
## Mongoose Traveller 2nd Edition — High Guard 2022 Update + CRB

**Sources:** HG 2022 Update (HG), Core Rulebook 2016 (CRB)
**Purpose:** Verified RAW reference for VTT development
**Status:** RAW-verified from PDF scans 2026-02-09
**Verification key:** [V] = verified from PDF graphic/text, [P] = page cited

---

## Spacecraft Combat (CRB p155-163) [V]

### Range Bands [V] (CRB p155-156)

| Range Band | Distance | Thrust to Change |
|------------|----------|------------------|
| Adjacent | 1 km or less | 1 |
| Close | 1-10 km | 1 |
| Short | 11-1,250 km | 2 |
| Medium | 1,251-10,000 km | 5 |
| Long | 10,001-25,000 km | 10 |
| Very Long | 25,001-50,000 km | 25 |
| Distant | More than 50,000 km | 50 |

### Attack Roll (CRB p156) [V]

**Standard check:** 2D + Gunner (appropriate speciality) + DEX DM ≥ 8

### Common Modifiers to Spacecraft Attacks [V] (CRB p156)

| Bonuses | DM | Penalties | DM |
|---------|----|----------|----|
| Short Range | **+1** | Long Range | **-2** |
| Using a Pulse Laser | +2 | Very Long Range | **-4** |
| Using a Beam Laser | +4 | Distant Range | **-6** |

**Medium Range = 0 (baseline, not listed)**
**Adjacent/Close = 0 (not listed)**

### Sensor Lock (CRB p161) [V]

Successful Electronics (sensors) check → attacks against that target gain a **Boon** (roll 3D, keep best 2) until sensor lock is broken (by electronic warfare or range band change with emission absorption).

**Note:** Sensor lock is a Boon, NOT a flat DM. This is significant — a Boon shifts the 2D mean from 7 to ~8.46.

### Damage Resolution (CRB p158, HG p29) [V]

1. Roll weapon damage dice
2. Add Effect of attack roll to damage
3. Subtract target's Armour (after AP reduction)
4. Multiply by **Damage Multiple** (barbettes ×3, bays ×10/20/100, spinal ×1000)
5. Result = Hull damage dealt

**Damage multiples do NOT apply to missiles and torpedoes.**

### Damage Multiples [V] (HG p29)

| Weapon Type | Damage Multiple |
|-------------|----------------|
| Barbette | **3** |
| Small Bay | 10 |
| Medium Bay | 20 |
| Large Bay | 100 |
| Spinal Mounts | 1,000 |

### Critical Hits (CRB p158) [V]

**Trigger:** Attack Effect ≥ 6 AND attack causes damage.
**Location:** Roll 2D on Critical Hits Location table (random — no RAW mechanic to choose location).
**Severity:** Final damage dealt to hull ÷ 10, rounded up.

**Critical Hits Location Table:**

| 2D | Location |
|----|----------|
| 2 | Sensors |
| 3 | Power Plant |
| 4 | Fuel |
| 5 | Weapon |
| 6 | Armour |
| 7 | Hull |
| 8 | M-Drive |
| 9 | Cargo |
| 10 | J-Drive |
| 11 | Crew |
| 12 | Computer |

### Sustained Damage (CRB p158) [V]

A ship suffers a Severity 1 critical hit every time it loses 10% of its starting Hull.

### Critical Hit Effects [V] (CRB p159)

| Location | Sev 1 | Sev 2 | Sev 3 | Sev 4 |
|----------|-------|-------|-------|-------|
| **Sensors** | DM-2 to sensor checks | Inoperative beyond Medium | Inoperative beyond Short | Inoperative beyond Close |
| **Power Plant** | Thrust -1, Power -10% | Thrust -1, Power -10% | Thrust -1, Power -50% | Thrust 0, Power 0 |
| **Fuel** | Leak: lose 1D tons/hour | Leak: lose 1D tons/round | Leak: lose 10% fuel | Tank destroyed |
| **Weapon** | Random weapon: Bane | Random weapon disabled | Random weapon destroyed | Random weapon explodes, Hull Sev +1 |
| **Armour** | Armour -1 | Armour -D3 | Armour -1D | Armour -1D, Hull Sev +1 |
| **Hull** | 1D extra damage | 3D extra damage | 4D extra damage | 5D extra damage |
| **M-Drive** | DM-1 all checks, DM-1 spacecraft | DM-2 all checks, Thrust -1 | DM-3 all checks, Thrust -1 | DM-4 all checks, Thrust -1 |
| **Cargo** | 10% cargo destroyed | 1D×10% cargo destroyed | 2D×10% cargo destroyed | All cargo destroyed |
| **J-Drive** | DM-2 to jump checks | Jump drive disabled | Jump drive destroyed | Jump drive destroyed, Hull Sev +1 |
| **Crew** | Random occupant takes 1D | Life support fails in 1D hours | 1D occupants take 2D | Life support fails in 1D rounds |
| **Computer** | DM-2 to computer checks | Computer rating -1 | Computer rating -1 | Computer disabled |

(Sev 5-6 continue with escalating effects. All effects cumulative. Max Severity per location = 6, then +6D hull damage per additional hit.)

---

## Weapon Trait: Ion [V] (HG p30)

Ion weapons overload power systems, temporarily disabling critical systems.

**Rules:**
1. Roll damage dice, **ignore any armour** the target possesses
2. Apply Damage Multiple (barbette ×3)
3. Deduct result from target's **Power** (not Hull)
4. Duration: **until target completes its next set of actions** (current round or next = ~1 round)
5. If Effect of attack ≥ 6: duration is **D3 rounds**

**Hardened Systems:** If a system is hardened (e.g. computers), the crew may allocate Power to it **before** ion deductions are applied. Ensures hardened systems always function if Power was available before the attack.

**Ion weapons and criticals:** CRB says criticals trigger when Effect ≥ 6 AND "causes damage." Ion damage is to Power, not Hull. **RAW is ambiguous** — GM ruling needed on whether Ion triggers criticals.

---

## Turrets and Fixed Mounts [V] (HG p28)

### Mount Types

| Mount | TL | Power | Tons | Cost |
|-------|-----|-------|------|------|
| Fixed Mount | — | 0 | 0 | MCr0.1 |
| Single Turret | 7 | 1 | 1 | MCr0.2 |
| Double Turret | 8 | 1 | 1 | MCr0.5 |
| Triple Turret | 9 | 1 | 1 | MCr1 |
| Pop-Up Mounting | 10 | +0 | **+1** | MCr1 |

**Pop-Up Mounting:** Applied to any turret or fixed mount. Concealed until deployed. Ship with all weapons in pop-up mounts appears unarmed to sensor scan. Adds +1 ton and MCr1 to the base mount.

**Hardpoints:** 1 per 100 tons hull (CRB p157). 600t ship = 6 hardpoints.

### Turret Weapons [V] (HG p28)

| Weapon | TL | Range | Power | Damage | Cost | Traits |
|--------|-----|-------|-------|--------|------|--------|
| Beam Laser | 10 | Medium | 4 | 1D | MCr0.5 | — |
| Fusion Gun | 14 | Medium | 12 | 4D | MCr2 | Radiation |
| Laser Drill | 8 | Adjacent | 4 | 2D | Cr150,000 | AP 4 |
| Missile Rack | 7 | Special | 0 | 4D | MCr0.75 | Smart |
| Particle Beam | 12 | Very Long | 8 | 3D | MCr4 | Radiation |
| Plasma Gun | 11 | Medium | 6 | 3D | MCr2.5 | — |
| Pulse Laser | 9 | Long | 4 | 2D | MCr1 | — |
| Railgun | 10 | Short | 2 | 2D | MCr1 | AP 4 |
| Sandcaster | 9 | Special | 0 | Special | MCr0.25 | — |

**Beam Laser turrets receive DM+4 to attack rolls.** (CRB p156)
**Pulse Laser turrets receive DM+2 to attack rolls.** (CRB p156)

**Linked Fire:** If 2+ weapons of same type in a turret fire together, make one attack roll. Each additional weapon adds +1 per damage die to total. Example: triple pulse laser = one roll, 2D+4 damage.

---

## Barbettes [V] (HG p29-30)

Barbettes are heavy turret weapons. Military-only (civilian purchase requires black market). Each barbette uses 1 Hardpoint, requires Gunner (turret) skill, and **consumes 5 tons**.

**Barbette Damage Multiple: 3**

### Barbette Weapons Table [V] (HG p30)

| Weapon | TL | Range | Power | Damage | Cost | Traits |
|--------|-----|-------|-------|--------|------|--------|
| Beam Laser Barbette | 10 | Medium | 12 | 2D | MCr3 | — |
| Fusion Barbette | 12 | Medium | 20 | 5D | MCr4 | AP 3, Radiation |
| **Ion Cannon** | **12** | **Medium** | **10** | **7D** | **MCr6** | **Ion** |
| Missile Barbette | 7 | Special | 0 | 4D | MCr4 | Smart |
| **Particle Barbette** | **11** | **Very Long** | **15** | **4D** | **MCr8** | **Radiation** |
| Plasma Barbette | 11 | Medium | 12 | 4D | MCr5 | AP 2 |
| Pulse Laser Barbette | 9 | Long | 12 | 3D | MCr6 | — |
| Railgun Barbette | 10 | Medium | 5 | 3D | MCr2 | AP 5 |
| Torpedo | 7 | Special | 2 | 6D | MCr3 | Smart |

**Beam Laser Barbette:** DM+4 to attacks (same as turret beam laser).

---

## Customising Ships [V] (HG p70-72)

### Prototype/Advanced Table [V] (HG p70)

Components built at higher or lower TL than base acquire Advantages or Disadvantages.

| Level | TL Difference | Tonnage | Cost | Modifications |
|-------|---------------|---------|------|---------------|
| Early Prototype | -2 | +100% | +1000% | 2 Disadvantages |
| Prototype | -1 | — | +500% | 1 Disadvantage |
| Budget | +0 | — | -25% | 1 Disadvantage |
| Advanced | +1 | — | +10% | 1 Advantage |
| Very Advanced | +2 | — | +25% | 2 Advantages |
| **High Technology** | **+3** | **—** | **+50%** | **3 Advantages** |

**Maximum is +3 TL = 3 Advantages. Table does not extend beyond +3 in either HG 2016 or HG 2022.**

### Key Rules [V] (HG p71)

- A component may have **either Advantages or Disadvantages but not both**
- The same Advantage/Disadvantage **can be applied more than once**
- All alterations are **additive** (two +10% = +20%)
- Calculate modified price from **original size**, not modified size
- Referees may restrict spinal mount weapons (they have their own TL table)

### Weapon and Screen Advantages [V] (HG p71-72)

| Advantage | Effect | Cost (Advantages) | Notes |
|-----------|--------|-------------------|-------|
| **Accurate** | DM+1 to all attack rolls | **2** | |
| **Easy to Repair** | DM+1 to all repair attempts | 1 | |
| **Energy Efficient** | -25% Power | 1 | |
| **High Yield** | 1's on damage dice count as 2's | **1** | Not missiles/torpedoes |
| **Very High Yield** | 1's AND 2's count as 3's | **2** | Not missiles/torpedoes |
| **Intense Focus** | AP+2 | **2** | Lasers and particle weapons only |
| **Long Range** | +1 range band (max Very Long) | **2** | May only be applied once |
| **Resilient** | -1 Severity on criticals to this weapon | 1 | |
| **Size Reduction** | -10% tonnage consumed by weapon | 1 | Not turret weapons |

**HIGH YIELD IS NOT "+1D DAMAGE".** It rerolls 1's as 2's. Average increase per die: +0.167 (from 3.5 to 3.667). This is a ~4.8% damage increase, NOT the 28.6% that "+1D" would give.

### Weapon and Screen Disadvantages [V] (HG p72)

| Disadvantage | Effect | Notes |
|-------------|--------|-------|
| Energy Inefficient | +30% Power | Not turret weapons |
| Inaccurate | DM-1 to all attack rolls | |
| Increased Size | +20% tonnage | |

### Other Component Advantages [V] (HG p71)

**Jump Drive:** Decreased Fuel (-5%), Early Jump (10% closer to gravity well), Energy Efficient (-25% Power), Size Reduction (-10% tonnage, min 10t), Stealth Jump (minimise jump radiation, 2 Adv)

**Manoeuvre Drive:** Energy Efficient (-25% Power), Size Reduction (-10% tonnage)

**Power Plant:** Increased Power (+10% output, round up, 2 Adv), Size Reduction (-10% tonnage)

---

## Sensors [V] (HG p76-78, CRB p160)

### Sensor Suites

| Grade | Min TL | Tonnage | Power | Cost | DM |
|-------|--------|---------|-------|------|----|
| Basic | — | 0 | 0 | Included | -4 |
| Civilian | 9 | 1 | 1 | MCr0.05 | -2 |
| Military | 10 | 2 | 2 | MCr1 | +0 |
| Improved | 12 | 3 | 3 | MCr2 | +1 |
| Advanced | 15 | 5 | 5 | MCr5.4 | +2 |

**DM applies to:** Electronics (sensors) checks for detection, scanning, and sensor lock.
**DM does NOT directly add to weapon attack rolls** — the sensor lock mechanic provides a Boon instead.

**IMPORTANT:** The sensor DM is for sensor skill checks. To aid gunners, the sensor operator performs a **Sensor Lock** action (separate Electronics check), granting a **Boon** to attacks against that target. The sensor DM helps the operator achieve the lock, but doesn't stack with the attack roll.

---

## Spacecraft Options (Selected) [V]

### Adjustable Hull [V] (HG p43)

Available at TL15. Consumes 1% of hull tonnage. **Increases hull cost by +100%.** All turrets and barbettes automatically gain pop-up capability at no extra cost. The ship can present a completely different external appearance.

"The primary users of such a hull are pirates and Q-ships" — HG p43.

### Hull Coatings [V]

| Coating | TL | Tonnage | Cost | Effect |
|---------|-----|---------|------|--------|
| Emission Absorption Grid | 13 | 2% hull | MCr2/ton | -3 DM to detect (passive) |
| Reflective | 10 | 0 | 10% hull cost | +3 Armour vs lasers only |
| Heat Shielding | 10 | 0 | 10% hull cost | Protection from close star/atmosphere |
| Radiation Shielding | 7 | 0 | 25% hull cost | Protection from radiation |

---

## Ship Design Basics [V]

### Hull Points

**NEEDS VERIFICATION** — Two conflicting sources:
- CRB personal vehicle combat: different system
- HG/CRB spacecraft: damage dealt directly to "Hull" stat
- 600t hull with reinforced structure gets +60 HP per James's PDF

### Hardpoints

1 per 100 tons hull. 600t = 6 hardpoints. Each turret or barbette uses 1 hardpoint.

### Staterooms [V] (HG p24)

- Standard: 4 tons, MCr0.5, 1-2 occupants
- Low Berth: 0.5 tons, Cr50,000, 1 occupant (cryogenic)
- Emergency Low Berth: 1 ton, MCr1, up to 4 occupants
- Common areas: MCr0.1 per ton

### Crew Requirements [V] (HG p23)

| Position | Commercial | Military |
|----------|-----------|----------|
| Captain | 1 (leading officer) | 1 |
| Pilot | 1 + 1 per small craft | 3 + 1 per small craft |
| Engineer | 1 per 35t drives+PP+craft | 1 per 35t drives+PP+craft |
| Gunner | 1 per turret/barbette/screen | 1 per turret; 2 per bay; 4 per large bay |
| Sensor Operator | 1 per 7,500t ship | 3 per 7,500t ship |
| Medic | 1 per 120 crew+passengers | 1 per 120 crew |

---

## Fire Control Software

| Software | TL | Bandwidth | Effect | Cost |
|----------|-----|-----------|--------|------|
| Fire Control/1 | 9 | 1 | +1 DM to attacks | MCr1 |
| Fire Control/2 | 10 | 2 | +2 DM (split as needed) | MCr2 |
| Fire Control/3 | 11 | 3 | +3 DM (split as needed) | MCr4 |
| Fire Control/4 | 12 | 4 | +4 DM (split as needed) | MCr8 |
| Fire Control/5 | 13 | 5 | +5 DM (split as needed) | MCr10 |

Fire Control can **act as gunners** or **assist gunners**. When assisting, the DM can be split among weapons/targets as the gunner wishes.

---

## Combat Actions Summary (CRB p160-161) [V]

### Manoeuvre Step
- **Movement:** Allocate Thrust to change range bands
- **Combat Manoeuvring:** Aid Gunners (Pilot check → task chain), Docking, Evasive Action (unspent Thrust → dodge)

### Attack Step
- **Fire Weapons:** 2D + Gunner + DEX DM + modifiers ≥ 8

### Reactions
- **Evasive Action (Pilot):** Each point of unspent Thrust allows dodging one attack. Attack suffers negative DM equal to pilot's skill.
- **Point Defence (Gunner):** Turret-mounted laser/pulse vs incoming missiles. Effect removes missiles from salvo.
- **Disperse Sand (Gunner):** Sandcaster vs laser attack. Success adds 1D + Effect to ship's armour vs that attack.

### Actions Step
- **Improve Initiative (Captain):** Leadership check, Effect → next round initiative
- **Jump (Engineer):** Emergency jump in combat with DM-2 penalties
- **Offline System (Engineer):** Power down systems to free Power
- **Overload Drive (Engineer):** +1 Thrust next round (Difficult check, Sev 1 crit on Effect ≤ -6)
- **Overload Plant (Engineer):** +10% Power next round (Difficult check, Sev 1 crit on Effect ≤ -6)
- **Repair System (Engineer):** Average (8+) Engineer check, -DM equal to Severity. Fixes effects only (not Hull/destroyed items).
- **Sensor Lock (Sensor Operator):** Electronics (sensors) check → Boon to attacks vs target
- **Electronic Warfare (Sensor Operator):** Jam comms or misdirect missiles

---

## Errata Log

### Corrections from 2026-02-09 RAW Audit

| Item | Old (Wrong) Value | Corrected (RAW) Value | Source |
|------|-------------------|----------------------|--------|
| Range DM: Short | -2 | **+1** | CRB p156 |
| Range DM: Medium | -4 | **0 (baseline)** | CRB p156 |
| Range DM: Long | -6 | **-2** | CRB p156 |
| Range DM: Very Long | -8 | **-4** | CRB p156 |
| Range DM: Distant | -10 | **-6** | CRB p156 |
| High Yield effect | +1D damage | **1's count as 2's** (+4.8%) | HG p72 |
| Upgrade system | "Slots" (fabricated) | **Advantages** from Prototype/Advanced table | HG p70-72 |
| Max TL bonus | +5 TL = 3 slots | **+3 TL = 3 Advantages** (table max) | HG p70 |
| Accurate cost | 2 slots | **2 Advantages** | HG p71 |
| Long Range cost | 1 slot | **2 Advantages** | HG p72 |
| Beam Laser TL | 9 | **10** | HG p28 |
| Critical Severity | Effect-based | **Damage÷10** (rounded up) | CRB p158 |
| Critical Location | Chosen (Called Shot) | **Random 2D roll** (no Called Shot RAW) | CRB p158 |
| Ion duration | Permanent (VTT) | **1 round** (D3 if Effect ≥ 6) | HG p30 |
| Sensor DM | +2 flat to attacks | **Sensor Lock = Boon** (3D keep 2) | CRB p161 |

---

**Document Status:** RAW-verified from HG 2022 Update PDF + CRB 2016 PDF
**Audit Date:** 2026-02-09
**Auditor:** Bruce (GM) with AI assistance
**Next:** VTT code gap analysis against these corrected values
