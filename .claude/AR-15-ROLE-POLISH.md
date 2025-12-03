# AR-15: Role Polish & UX

**Created:** 2025-12-03
**Status:** PLANNED
**Est:** 14-18h | **Risk:** LOW | **Value:** HIGH | **Priority:** P1

## Overview
Consolidates all manual testing TODOs from 2025-12-03 session.
Focus: Tooltips, role enhancements, UI polish, bug fixes.

## Stages

### 15.1 Tooltip Infrastructure (3h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| TooltipStrategy class | 1h | Hybrid native/custom pattern |
| Performance hooks | 30m | Debug log if hover > 16ms |
| Native tooltips for simple | 30m | title attr for buttons |
| Custom tooltips for complex | 1h | Ship cards, character sheets |

**Decision:** Hybrid pattern, performance-gated custom tooltips

### 15.2 Gunner Enhancements (4h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Weapon selector tabs | 2h | Dropdown/tabs for weapon type |
| Fire Missile option | 1h | Integrate with selector |
| Hit chance tooltip | 30m | Show % on hover |
| Weapon Free/Hold tooltips | 30m | Captain authorization hint |

**Decision:** Weapon selector dropdown, not separate buttons

### 15.3 Astrogator Enhancements (4h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Map overflow allowed | 1h | Scroll/pan beyond viewport |
| Map size selector | 1h | Small/medium/large/fullscreen |
| Jump validation indicator | 1h | Green/red for viable jumps |
| Star system tooltips | 1h | Large preview with UWP |

**Decision:** Overflow allowed, performance-gated large tooltips

### 15.4 Sensors Enhancements (2h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Scan button tooltips | 30m | Active/Passive/Analyze hints |
| Contact analysis hover | 1h | Detailed contact info |
| Detection level indicator | 30m | Visual fog-of-war hint |

### 15.5 UI Polish (3h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| HULL indicator fix | 30m | Deceptive 100% when disabled |
| DATE popup | 30m | Show journal on hover |
| POWER gradations | 30m | Color gradient for power level |
| Panel minimize/restore | 1h | Collapse role panels |
| Fullscreen button | 30m | Quick fullscreen toggle |

### 15.6 Role System Bugs (2h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Role refresh after relieve | 1h | Available roles not updating |
| Relieve button tooltip | 30m | "Relieve [NAME] from [ROLE]" |
| Role replacement notification | 30m | Polite message to occupant |

## Dependencies
- AR-14.7 complete ✅

## Acceptance Criteria
- [ ] All tooltips functional with < 16ms render
- [ ] Gunner can switch weapons and fire missiles
- [ ] Astrogator map scales properly
- [ ] No console errors during normal operation
- [ ] All role bugs fixed
