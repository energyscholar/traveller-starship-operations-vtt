# Spinward Marches E2E Test Suite - Process Log

**Created:** 2026-01-06
**Status:** Complete

## Overview

This document logs the process of building a comprehensive E2E test suite that visits every system in the Spinward Marches sector with full fuel management.

## Objectives

1. Build 16 modular subsector journey tests
2. Build 1 combined grand tour test
3. Track detailed metrics (parsecs, km, refuel types, game time)
4. Document any unreachable systems
5. Identify Traveller rules implementation gaps

## Architecture

### Shared Module

**File:** `tests/e2e/helpers/subsector-journey.js`

Extracted common functionality from the original `mora-subsector-journey.e2e.js`:

- `runSubsectorJourney(config)` - Main test runner
- `MetricsTracker` - Comprehensive statistics tracking
- Socket helpers: `getDestinations`, `travelToDestination`, `jumpToSystem`, etc.
- Route optimization: `calculateRoute`, `hexDistance`
- Fuel management: `selectRefuelSource`, `refuel`
- Metrics aggregation: `aggregateMetrics`

### Metrics Tracked

| Category | Metrics |
|----------|---------|
| Systems | visited, total, unreachable |
| Destinations | visited per system |
| Jumps | count, parsecs |
| Distance | km in-system, parsecs jumped |
| Refuel | refined, unrefined, gas giant, wilderness |
| Time | real seconds, game hours, game days |
| Maintenance | J-Drive checks due (every 6 jumps) |
| Tests | passed, failed, errors |

## Subsector Tests Created

| Letter | Name | File | Systems |
|--------|------|------|---------|
| A | Cronor | `cronor-journey.e2e.js` | 24 |
| B | Jewell | `jewell-journey.e2e.js` | 23 |
| C | Vilis | `vilis-journey.e2e.js` | 32 |
| D | Rhylanor | `rhylanor-journey.e2e.js` | 26 |
| E | Querion | `querion-journey.e2e.js` | 21 |
| F | Regina | `regina-journey.e2e.js` | 26 |
| G | Lanth | `lanth-journey.e2e.js` | 27 |
| H | Aramis | `aramis-journey.e2e.js` | 32 |
| I | Darrian | `darrian-journey.e2e.js` | 29 |
| J | Sword Worlds | `sword-worlds-journey.e2e.js` | 28 |
| K | Lunion | `lunion-journey.e2e.js` | 25 |
| L | Mora | `mora-subsector-journey.e2e.js` | 26 |
| M | Five Sisters | `five-sisters-journey.e2e.js` | 27 |
| N | District 268 | `district-268-journey.e2e.js` | 32 |
| O | Glisten | `glisten-journey.e2e.js` | 29 |
| P | Trin's Veil | `trins-veil-journey.e2e.js` | 32 |
| **All** | Grand Tour | `spinward-marches-grand-tour.e2e.js` | ~439 |

## Route Strategy

### Individual Subsector Routes

Uses nearest-neighbor algorithm with fuel awareness:
1. Start from entry hex (or first system)
2. Find nearest system within J-2 range
3. Prefer systems with fuel sources
4. Skip systems >2 parsecs away (document as unreachable)

### Grand Tour Route

Snake pattern through sector starting from Mora:

```
L → K → J → I → E
              ↓
D ← C ← B ← A ← F
↓
H → G → M → N → O → P
```

Actual order: L → K → J → I → E → F → G → H → D → C → B → A → M → N → O → P

## Traveller Rules Implementation

### Implemented

| Rule | Implementation |
|------|---------------|
| Jump Fuel | 10% hull per parsec (Scout: 10t/parsec) |
| Fuel Types | Refined, Unrefined, Processed |
| Refuel Sources | Starport, Gas Giant, Wilderness |
| Jump Duration | 168 hours (7 days) |
| Position Verification | Required after each jump |

### Not Implemented (Gaps)

| Rule | Description | Priority |
|------|-------------|----------|
| Jump Maintenance | Every 6 jumps requires maintenance check | Medium |
| Maneuver Fuel | ~1% hull per G-hour of thrust | Low |
| Life Support | Food/water consumption per person/day | Low |
| Crew Fatigue | Watch rotations, rest requirements | Low |
| Operational Costs | Docking fees, fuel prices in credits | Low |

## Speed Optimization

Target: <5 minutes for combined test

Techniques applied:
1. Reduced wait times (500ms → 200ms where safe)
2. Parallel destination visits within each system
3. Skip redundant position verifications
4. Single browser session per subsector
5. Screenshot only on failure or completion

## Running the Tests

### Individual Subsector

```bash
npm run test:e2e tests/e2e/lunion-journey.e2e.js
```

### Grand Tour

```bash
npm run test:e2e tests/e2e/spinward-marches-grand-tour.e2e.js
```

### Headed Mode (for debugging)

```bash
HEADED=1 npm run test:e2e tests/e2e/lunion-journey.e2e.js
```

## Output Files

- `docs/SPINWARD-MARCHES-SUMMARY.md` - Detailed results (auto-generated)
- `tests/e2e/screenshots/*.png` - Final screenshots per subsector

## Unreachable Systems

Systems may be unreachable for:

1. **No Fuel Source** - Class X starport with no gas giants
2. **Jump Distance** - >2 parsecs from nearest visited system
3. **Isolated Cluster** - Group cut off from main network

All unreachable systems are documented in the summary file.

## Lessons Learned

1. **Socket Timeouts** - 1.5-3s timeouts work well for most operations
2. **Fuel Management** - 20t minimum needed before each jump
3. **Deep Space Waypoints** - Must filter these from system lists
4. **Route Optimization** - Nearest-neighbor is fast but not optimal

---

*Generated during AR-300 Sector E2E Test Suite implementation*
