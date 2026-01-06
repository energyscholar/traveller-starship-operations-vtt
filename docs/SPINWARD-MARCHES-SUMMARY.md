# Spinward Marches Grand Tour Summary

**Generated:** 2026-01-06
**Duration:** 547.1s (9.1 minutes)

## Overview

| Metric | Value |
|--------|-------|
| Subsectors Visited | 16/16 |
| Systems Visited | 439/439 |
| Destinations Visited | 5019 |
| Jumps Completed | 372 |
| Total Parsecs | 470 |
| In-System Distance | 5,019,000 km |
| Game Time | 2709 days (65005.5 hours) |
| Real Time | 547.1s |

## Refueling Operations

| Type | Count |
|------|-------|
| Starport Refined | 103 |
| Starport Unrefined | 130 |
| Gas Giant Skim | 4 |
| Wilderness | 0 |
| **Total** | 237 |

## J-Drive Maintenance

Per Traveller rules, jump drives require maintenance every 6 jumps.

- **Maintenance checks due:** 54
- **Note:** This implementation tracks but does not enforce maintenance requirements

## Traveller Rules Gaps

### NOT IMPLEMENTED
1. **Jump Maintenance** - Every 6 jumps needs maintenance check (tracked but not enforced)
2. **Maneuver Fuel** - ~1% hull per G-hour of thrust
3. **Life Support Consumables** - Food/water per person per day
4. **Crew Fatigue** - Watch rotations, rest requirements
5. **Operational Costs** - Docking fees, fuel costs in credits

### IMPLEMENTED
- Jump fuel consumption (10% hull per parsec)
- Fuel types (refined/unrefined/processed)
- Four refuel sources
- Position verification after jump
- Gas giant skimming

## Per-Subsector Results

| Subsector | Systems | Destinations | Jumps | Parsecs | Refuels | Tests |
|-----------|---------|--------------|-------|---------|---------|-------|
| Mora | 26/26 | 300 | 23 | 29 | 14 | 64/64 |
| Lunion | 25/25 | 291 | 21 | 26 | 13 | 60/60 |
| Sword Worlds | 28/28 | 337 | 24 | 27 | 14 | 67/67 |
| Darrian | 29/29 | 332 | 24 | 29 | 14 | 66/70 |
| Querion | 21/21 | 227 | 17 | 25 | 13 | 52/52 |
| Regina | 26/26 | 264 | 22 | 33 | 17 | 66/67 |
| Lanth | 27/27 | 313 | 23 | 29 | 14 | 65/65 |
| Aramis | 32/32 | 374 | 27 | 33 | 18 | 78/79 |
| Rhylanor | 26/26 | 298 | 22 | 28 | 14 | 63/63 |
| Vilis | 32/32 | 376 | 29 | 37 | 18 | 80/80 |
| Jewell | 23/23 | 267 | 18 | 24 | 13 | 55/55 |
| Cronor | 24/24 | 256 | 19 | 28 | 13 | 57/57 |
| Five Sisters | 27/27 | 291 | 21 | 24 | 13 | 62/62 |
| District 268 | 32/32 | 348 | 29 | 33 | 16 | 78/78 |
| Glisten | 29/29 | 345 | 26 | 33 | 17 | 73/73 |
| Trin's Veil | 32/32 | 400 | 27 | 32 | 16 | 76/76 |

## Unreachable Systems

| System | Hex | Subsector | Reason |
|--------|-----|-----------|--------|
| Rorise | 3022 | Mora | Too far: 3 parsecs |
| Fenl's Gren | 3228 | Mora | Too far: 5 parsecs |
| Spirelle | 1927 | Lunion | Too far: 3 parsecs |
| Shirene | 2125 | Lunion | Too far: 3 parsecs |
| Gorram | 2322 | Lunion | Too far: 3 parsecs |
| Sting | 1525 | Sword Worlds | Too far: 3 parsecs |
| Enos | 1130 | Sword Worlds | Too far: 3 parsecs |
| Narsil | 0927 | Sword Worlds | Too far: 3 parsecs |
| Torment | 0721 | Darrian | No fuel source - stranded |
| 494-908 | 0625 | Darrian | No fuel source - stranded |
| 886-945 | 0230 | Darrian | Too far: 3 parsecs |
| Darrian | 0627 | Darrian | Too far: 7 parsecs |
| Retinae | 0416 | Querion | Too far: 5 parsecs |
| Thanber | 0717 | Querion | Too far: 3 parsecs |
| Bael | 0218 | Querion | Too far: 6 parsecs |
| Zeta 2 | 0919 | Regina | No fuel source - stranded |
| Calit | 1515 | Regina | Too far: 4 parsecs |
| Quare | 0915 | Regina | Too far: 6 parsecs |
| Equus | 2417 | Lanth | Too far: 3 parsecs |
| D'Ganzio | 1920 | Lanth | Too far: 5 parsecs |
| Sonthert | 1918 | Lanth | Too far: 3 parsecs |
| Huderu | 3114 | Aramis | No fuel source - stranded |
| Bevey | 3216 | Aramis | Too far: 4 parsecs |
| Loneseda | 2720 | Aramis | Too far: 5 parsecs |
| Gileden | 2514 | Aramis | Too far: 6 parsecs |
| Focaline | 2607 | Rhylanor | Too far: 3 parsecs |
| Corfu | 2602 | Rhylanor | Too far: 8 parsecs |
| Junidy | 3202 | Rhylanor | Too far: 5 parsecs |
| Wochiers | 2207 | Vilis | Too far: 3 parsecs |
| Keng | 2405 | Vilis | Too far: 3 parsecs |
| Nakege | 1305 | Jewell | Too far: 3 parsecs |
| 871-438 | 1510 | Jewell | Too far: 6 parsecs |
| Grant | 1607 | Jewell | Too far: 3 parsecs |
| Louzy | 1604 | Jewell | Too far: 3 parsecs |
| Atsa | 0307 | Cronor | Too far: 3 parsecs |
| Gyomar | 0108 | Cronor | Too far: 3 parsecs |
| Ninjar | 0608 | Cronor | Too far: 5 parsecs |
| Cipango | 0705 | Cronor | Too far: 4 parsecs |
| 875-496 | 0834 | Five Sisters | Too far: 3 parsecs |
| Quhaiathat | 0637 | Five Sisters | Too far: 3 parsecs |
| Andor | 0236 | Five Sisters | Too far: 4 parsecs |
| Tondoul | 0739 | Five Sisters | Too far: 6 parsecs |
| 975-452 | 0840 | Five Sisters | Too far: 3 parsecs |
| Motmos | 1340 | District 268 | Too far: 3 parsecs |
| Mertactor | 1537 | District 268 | Too far: 3 parsecs |
| Callia | 1836 | Glisten | Too far: 6 parsecs |
| Romar | 2140 | Glisten | Too far: 4 parsecs |
| Hazel | 3236 | Trin's Veil | Too far: 3 parsecs |
| Traltha | 2834 | Trin's Veil | Too far: 3 parsecs |
| Raydrad | 2933 | Trin's Veil | Too far: 3 parsecs |
| Ramiva | 3233 | Trin's Veil | Too far: 3 parsecs |

## Errors

- **Darrian:** No refuel source in Torment - 
- **Darrian:** No refuel source in 494-908 - 
- **Darrian:** Visited 7/10 in Dorannia - 
- **Darrian:** Visited 7/10 in 886-945 - 
- **Regina:** No refuel source in Zeta 2 - 
- **Aramis:** No refuel source in Huderu - 

---

*Generated by spinward-marches-grand-tour.e2e.js*
