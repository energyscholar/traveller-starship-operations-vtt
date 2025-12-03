# AR-17: Ship Template Editor

**Created:** 2025-12-03
**Status:** PLANNED (rescoped from Ship Builder)
**Est:** 20h | **Risk:** MEDIUM | **Value:** MEDIUM | **Priority:** P2

## Overview
Edit existing ship templates (not full from-scratch builder).
Scope reduced 65% from original Ship Builder concept.

## Stages

### 17.1 Template Selector (2h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Dropdown by tonnage | 1h | Simple select UI |
| Load template data | 30m | From data/ships/v2/*.json |
| Preview stats | 30m | Basic info on select |

**Decision:** Start with dropdown, TODO for visual cards

### 17.2 Hull/Armor Editor (3h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Hull points editor | 1h | Modify HP |
| Armor rating editor | 1h | Modify armor |
| Database persist | 1h | Save to campaign ships |

**Decision:** Persist to database per-campaign

### 17.3 Drives Editor (3h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Jump drive rating | 1h | 0-6 selection |
| M-drive thrust | 1h | 0-6 selection |
| Power plant rating | 1h | Must support drives |

### 17.4 Weapons Editor (4h) - MEDIUM risk
| Task | Est | Notes |
|------|-----|-------|
| Weapon list display | 1h | Current weapons |
| Add weapon | 1.5h | Select type, mount |
| Remove weapon | 30m | Delete from list |
| Configure weapon | 1h | Ammo, etc. |

### 17.5 Systems Editor (3h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Sensors selector | 1h | Basic/Military/Advanced |
| Computer selector | 1h | Model 1-6 |
| Other systems | 1h | Life support, etc. |

### 17.6 Cargo Editor (1h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Cargo capacity | 30m | Edit tons |
| Manifest editor | 30m | Add/remove items |

### 17.7 Validation (2h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Tonnage validation | 30m | Components fit |
| Power validation | 30m | Plant supports load |
| Inline error display | 1h | Red text + summary |

**Decision:** Inline errors + summary panel hybrid

### 17.8 Tests (2h) - LOW risk
| Task | Est | Notes |
|------|-----|-------|
| Unit tests | 1h | Validation logic |
| Puppeteer tests | 1h | UI workflow |

## Deferred TODOs
- Visual ship cards selector
- Search + filter templates
- Full from-scratch builder
- High Guard rules engine

## Dependencies
- AR-15 or AR-16 complete (not blocking)

## Acceptance Criteria
- [ ] Can select any template by tonnage
- [ ] Can edit all component categories
- [ ] Changes persist to database
- [ ] Validation prevents invalid configs
