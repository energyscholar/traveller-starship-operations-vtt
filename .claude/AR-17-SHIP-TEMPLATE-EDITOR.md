# AR-17: Ship Template Editor

**Created:** 2025-12-03
**Status:** PLANNED (rescoped from Ship Builder)
**Est:** 20h | **Risk:** MEDIUM | **Value:** MEDIUM | **Priority:** P2

## Overview
Edit existing ship templates (not full from-scratch builder).
Scope reduced 65% from original Ship Builder concept.

---

## Stage 17.1: Template Selector UI (2h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Dropdown by tonnage | 1h | Simple select UI |
| Load template data | 30m | From data/ships/v2/*.json |
| Preview stats panel | 30m | Basic info on select |

**Decision:** Start with dropdown, TODO for visual cards

---

## Stage 17.2: Hull Editor (1.5h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Hull points editor | 45m | Modify HP |
| Hull configuration selector | 45m | Standard/streamlined/etc. |

---

## Stage 17.3: Armor Editor (1.5h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Armor rating editor | 45m | Modify armor value |
| Armor type selector | 30m | Crystalliron/bonded, etc. |
| Tonnage impact display | 15m | Show cost |

---

## Stage 17.4: Drives Editor (2h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Jump drive rating | 40m | 0-6 selection |
| M-drive thrust | 40m | 0-6 selection |
| Power plant rating | 40m | Must support drives |

---

## Stage 17.5: Weapons Editor - Display (1.5h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Weapon list display | 45m | Current weapons |
| Weapon stats preview | 30m | Damage, range, etc. |
| Mount type indicator | 15m | Turret/bay/spinal |

---

## Stage 17.6: Weapons Editor - Modify (2h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Add weapon button | 45m | Select type, mount |
| Remove weapon button | 30m | Delete from list |
| Configure weapon | 45m | Ammo, fire control |

---

## Stage 17.7: Systems Editor (2h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Sensors selector | 40m | Basic/Military/Advanced |
| Computer selector | 40m | Model 1-6 |
| Other systems list | 40m | Life support, etc. |

---

## Stage 17.8: Cargo & Crew Editor (1.5h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Cargo capacity editor | 30m | Edit tons |
| Manifest editor | 30m | Add/remove items |
| Crew quarters | 30m | Staterooms, low berths |

---

## Stage 17.9: Validation & Persistence (2.5h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Tonnage validation | 30m | Components fit |
| Power validation | 30m | Plant supports load |
| Inline error display | 30m | Red text warnings |
| Database persist | 1h | Save to campaign ships |

**Decision:** Inline errors + summary panel hybrid

---

## Stage 17.10: Testing (2h)

| Task | Est | Deliverable |
|------|-----|-------------|
| Unit tests | 1h | Validation logic |
| Puppeteer E2E tests | 1h | UI workflow |

---

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
