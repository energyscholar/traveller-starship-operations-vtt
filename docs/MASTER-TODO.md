# Master TODO List (Compiled 2025-12-15)

## Status Legend
- **HIGH**: Needed for Tuesday game / blocks gameplay
- **MEDIUM**: Enhances gameplay significantly
- **LOW**: Nice to have / someday
- **DEFERRED**: Complex, keep for later

---

## HIGH PRIORITY (Tuesday Game)

### AR-125: Pirate Ambush Scenario
| ID | Task | Status |
|----|------|--------|
| AR-125.1 | Log entry tooltips (1-line summary + full popup) | Pending |
| AR-125.2 | Ship-to-ship comms in log (GM triggers incoming) | Pending |
| AR-125.3 | Simple cargo manifest (name, tons, value, legality) | Pending |
| AR-125.4 | Detailed crew roster (named NPCs in positions) | Pending |

### AR-126: Jump Map Fix
| ID | Task | Status |
|----|------|--------|
| AR-126 | Jump map recenters after arrival (sector in event) | **DONE** |

---

## MEDIUM PRIORITY (Gameplay Enhancement)

### From AR-TODO-v68 (Incomplete)
| ID | Task | Status | Notes |
|----|------|--------|-------|
| AR-73 | Multi-system journey Puppeteer test | Partial | Data layer done, UI multi-role not done |
| AR-74 | Sensor scan use case test | Pending | Depends on AR-70 (done) |
| AR-75 | Shooting use case (target practice) | Pending | Target asteroids with HP |
| AR-76 | System map technical documentation | Pending | Low priority |

### From CLAUDE.md Roadmap
| ID | Task | Status | Notes |
|----|------|--------|-------|
| AR-35 | Captain Orders Enhancement | Complete | Implemented |

### From v81 TODOs
| ID | Task | Status | Notes |
|----|------|--------|-------|
| v81.2 | Ship system tooltips | Pending | Hover shows full specs (power plant, etc.) |
| v81.6 | Tactical ship map stub | Pending | Add to hamburger menu |
| v81.5 | Mechanical failure/damage simulation | Pending | Overlaps AR-125.5 |

### AR-125 Lower Priority
| ID | Task | Status |
|----|------|--------|
| AR-125.5 | Mechanical failure simulation (fake damage) | Pending |
| AR-125.6 | Q-ship reveal mechanic (hidden fighters) | Pending |
| AR-125.7 | Trade mechanics (buy/sell cargo) | Pending |
| AR-125.8 | Pirate encounter generator | Pending |

---

## LOW PRIORITY (Infrastructure)

### TravellerMap Optimization
| ID | Task | Status | Notes |
|----|------|--------|-------|
| CACHE.1 | In-memory TravellerMap cache | Pending | LRU cache, clears on restart |

### v81 Chat Enhancements (Mostly Done)
| ID | Task | Status | Notes |
|----|------|--------|-------|
| v81.3 | Crew Status text chat | **DONE** | AR-97 |
| v81.4 | Roll results to chat | **DONE** | AR-98 |

### I18N (Planning Only)
| ID | Task | Status | Notes |
|----|------|--------|-------|
| AR-100 | Multi-language planning | **DONE** | Doc exists, no implementation |

### DB Normalization
| ID | Task | Status | Notes |
|----|------|--------|-------|
| AR-115 | UID normalization | **DONE** | All tables normalized |

---

## DEFERRED (Complex - Someday)

### Kobayashi Maru Scenario (v81.7)
**Description:** PCs attack Dorannia 7 SDB, triggers nuclear response, GAME OVER screen like Missile Command arcade game.
- Target asteroid HP system needed first (AR-75)
- Nuclear flash effect on shared map
- Classic "GAME OVER" text styling
- **Estimated:** 8-12 hours

### AI Email System (v81.9-11)
**Description:** Full async email between PCs and NPCs with AI personality responses.
- Email inbox/outbox per character
- Contact list for TO field
- AI agent checks mail periodically (~30 min)
- Per-NPC personality/history preloaded
- **Estimated:** 20+ hours

### Starship as NPC (v81.8)
**Description:** Ship itself (Kimbly) can send/receive email, AI plays ship personality.
- Depends on AI Email System
- **Estimated:** 4 hours (after email system)

---

## COMPLETED (Reference)

| AR | Task | Date |
|----|------|------|
| AR-67 | hailContact timing bug | Done |
| AR-68 | Verify Position after jump | Done |
| AR-69 | Observer role fallback | Done |
| AR-70 | Sensor scan buttons | Done |
| AR-71 | Contacts on system map | Done |
| AR-72 | Fuel source tagging | Done |
| AR-82 | Small craft templates | Done |
| AR-97 | Bridge chat system | Done |
| AR-98 | Roll results to chat | Done |
| AR-100 | I18N planning doc | Done |
| AR-102 | System map zoom + camera | Done |
| AR-104 | Dramatic camera | Done |
| AR-108 | Security | Done |
| AR-111 | Ship indicator on maps | Done |
| AR-113 | Space destination labels | Done |
| AR-114 | Hash-based system lookups | Done |
| AR-115 | UID normalization | Done |
| AR-116 | Tiered data loading | Done |
| AR-117 | Subsector map optimization | Done |
| AR-118 | System map event system | Done |
| AR-119 | Remove hardcoded Flammarion | Done |
| AR-120 | TravellerMap API | Done |
| AR-121 | TravellerMap extended | Done |
| AR-122 | Star system generation | Done |
| AR-123 | Generate Spinward Marches | Done |
| AR-124 | Position verification sync | Done |
| AR-126 | Jump map sector fix | Done |

---

## Gaps Identified

1. **Journey tests only test data layer** - UI multi-role Puppeteer tests verify elements exist but don't execute full journeys
2. **AR-35 Captain Orders COMPLETE** - Implemented
3. **Ship system tooltips never done** - v81.2 still pending
4. **scanContact duplicate** - v81.1 likely fixed but should verify
5. **Tactical ship map** - v81.6 never started

---

## Recommended Execution Order

### For Tuesday Game:
1. AR-125.1 - Log tooltips (1 hr)
2. AR-125.2 - Ship-to-ship comms (1 hr)
3. AR-125.3 - Cargo manifest (2 hr)

### After Tuesday:
4. AR-125.4 - Crew roster (2 hr)
5. AR-35 - Captain Orders (COMPLETE)
6. v81.2 - Ship system tooltips (2 hr)
7. AR-73/74 - Journey/scan tests (4 hr)
8. CACHE.1 - TravellerMap cache (1 hr)

### Someday:
- Kobayashi Maru
- AI Email System
- AR-75/76
