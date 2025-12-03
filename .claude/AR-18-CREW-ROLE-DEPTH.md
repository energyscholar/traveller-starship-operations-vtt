# AR-18: Crew Role Depth

**Created:** 2025-12-03
**Status:** PLANNED
**Est:** 40-60h | **Risk:** MEDIUM | **Value:** HIGH | **Priority:** P2

## Overview
Full implementation of all 11 crew roles for engaging multiplayer.
Gunner already complete (AR-14). 10 roles remaining.

## Role Priority

| Priority | Roles | Rationale |
|----------|-------|-----------|
| P0 | Captain, Pilot | Core command loop |
| P1 | Engineer, Sensors, Astrogator | Combat support + travel |
| P2 | Medic, Marine, Comms | Extended gameplay |
| P3 | Steward | Roleplay/flavor |

## Stages

### 18.1 Captain Role (6h) - MEDIUM risk
| Action | Est | Notes |
|--------|-----|-------|
| Set Alert Status | 30m | Green/Yellow/Red effects |
| Issue Orders | 1h | Appears in crew panels |
| Authorize Combat | 30m | Required for weapons |
| Hail Contact | 1h | Comms integration |
| Request Status | 30m | Ping crew |
| Relieve Crew | 30m | Already partial |
| Battle Stations | 1h | Quick alert + assign |
| Panel: Crew grid, ship status | 1h | Overview display |

### 18.2 Pilot Role (5h) - MEDIUM risk
| Action | Est | Notes |
|--------|-----|-------|
| Set Course | 1h | Destination selection |
| Evasive Maneuvers | 30m | -DM to incoming |
| Pursuit/Intercept | 1h | Chase contact |
| Emergency Thrust | 30m | Extra fuel burn |
| Dock/Undock | 1h | Docking sequence |
| Panel: Vector, fuel, G-force | 1h | Pilot display |

### 18.3 Engineer Role (5h) - MEDIUM risk
| Action | Est | Notes |
|--------|-----|-------|
| Allocate Power | 1h | Power distribution |
| Emergency Repairs | 1h | Combat repairs |
| Damage Control | 1h | Prioritize repairs |
| Boost System | 30m | Overclock temp |
| Panel: Power grid, systems | 1.5h | Engineer display |

### 18.4 Sensors Role (4h) - LOW risk
| Action | Est | Notes |
|--------|-----|-------|
| Active Scan | 30m | Ping (reveals position) |
| Passive Scan | 30m | Listen only |
| Analyze Contact | 1h | Identify ship type |
| ECM/ECCM | 1h | Jamming/counter |
| Panel: Sensor display | 1h | Range bands, contacts |

### 18.5 Astrogator Role (4h) - LOW risk
| Action | Est | Notes |
|--------|-----|-------|
| Plot Jump | 1h | Calculate route |
| Verify Coordinates | 30m | Reduce misjump |
| Emergency Jump | 30m | Quick + risky |
| Survey System | 1h | Catalog bodies |
| Panel: Map, jump route | 1h | Already partial |

### 18.6 Medic Role (4h) - LOW risk
| Action | Est | Notes |
|--------|-----|-------|
| Treat Wounds | 1h | Heal crew |
| Stabilize | 30m | Prevent death |
| Administer Drugs | 1h | Combat drugs |
| Triage | 30m | Priority order |
| Panel: Health roster | 1h | Crew conditions |

### 18.7 Marine Role (4h) - MEDIUM risk
| Action | Est | Notes |
|--------|-----|-------|
| Security Patrol | 30m | Internal security |
| Boarding Prep | 1h | Ready team |
| Repel Boarders | 1h | Defense |
| Panel: Deck plan, team | 1.5h | Marine display |

### 18.8 Comms Role (3h) - LOW risk
| Action | Est | Notes |
|--------|-----|-------|
| Hail Contact | 30m | Open channel |
| Broadcast | 30m | All in range |
| Encrypt/Decrypt | 1h | Secure comms |
| Panel: Channels, queue | 1h | Comms display |

### 18.9 Steward Role (2h) - LOW risk
| Action | Est | Notes |
|--------|-----|-------|
| Serve Passengers | 30m | Satisfaction |
| Inventory Check | 30m | Supplies |
| Morale Report | 30m | Crew morale |
| Panel: Passengers, cargo | 30m | Steward display |

### 18.10 Cross-Role Integration (4h) - MEDIUM risk
| Integration | Est | Notes |
|-------------|-----|-------|
| Captain → Crew orders | 1h | Order routing |
| Sensors → Gunner locks | 30m | Target handoff |
| Engineer → All power | 1h | System effects |
| Astrogator → Pilot coords | 30m | Jump handoff |
| Medic → Captain reports | 30m | Fitness reports |
| Test all interactions | 30m | Integration tests |

## Dependencies
- AR-15 complete (tooltips for actions)
- AR-14 complete ✅ (Gunner reference)

## Acceptance Criteria
- [ ] All 11 roles have functional panels
- [ ] All listed actions implemented
- [ ] Cross-role interactions working
- [ ] Multiplayer tested with 3+ players
