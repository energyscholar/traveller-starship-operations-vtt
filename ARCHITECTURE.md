# Architecture Overview

**Purpose:** Help newcomers (human or AI) quickly understand the codebase structure.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Client                           │
│  public/operations/app.js + role-panels/*.js                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ WebSocket (Socket.io)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Express Server                             │
│  server.js → lib/socket-handlers/ops/*.js                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────────┐
│  Operations   │  │    Combat     │  │   TravellerMap    │
│  (campaigns,  │  │   Engine      │  │   API Proxy       │
│   accounts)   │  │   (lib/)      │  │                   │
└───────┬───────┘  └───────────────┘  └───────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│              SQLite Database (data/campaigns/)                 │
└───────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `lib/` | Server-side business logic | `combat.js`, `combat-engine.js` |
| `lib/operations/` | Campaign, account, ship management | `database.js`, `accounts.js` |
| `lib/socket-handlers/` | Socket.io event handlers | `index.js` routes events |
| `lib/socket-handlers/ops/` | Modular operation handlers | `pilot.js`, `gunner.js`, etc. |
| `public/operations/` | Client-side UI | `app.js` (main), `role-panels/*.js` |
| `data/ships/v2/` | Ship templates (JSON) | `scout.json`, `amishi.json` |
| `data/weapons/` | Weapon definitions | `weapons.json` |
| `tests/` | Jest test suites | `unit/`, `integration/`, `e2e/` |
| `.claude/` | Planning docs, TODOs, ARs | See below |
| `docs/` | Reference documentation | `AR-ROADMAP.md` |

---

## Key Concepts

### 1. Operations VTT
The main application. Players join campaigns, select crew roles, and operate starships together in real-time.

### 2. Crew Roles
11 roles, each with dedicated UI panel:
- **Captain** - Command, tactics, relieve crew
- **Pilot** - Navigation, docking, evasive maneuvers
- **Astrogator** - Jump plotting, route calculation
- **Engineer** - Power allocation, repairs
- **Gunner** - Weapons, targeting
- **Sensors** - Detection, comms
- **Medic** - Crew health
- **Marines** - Security, boarding
- **Cargo** - Cargo operations
- **Steward** - Passengers
- **Damage Control** - Emergency repairs

### 3. Combat Engine
Located in `lib/combat-engine.js`. Implements Mongoose Traveller 2E rules:
- Attack: 2d6 + skill + DMs >= 8 to hit
- Effect: Attack total - 8
- Damage: Weapon dice + Effect - Armour

### 4. Socket Events
All real-time communication uses Socket.io with namespaced events:
- `ops:*` - Operations mode events
- `combat:*` - Combat events
- Pattern: `socket.emit('ops:eventName', data)`

---

## Data Flow

### Campaign Join Flow
```
Player enters code → ops:joinCampaign → validateCode() →
  → addPlayer() → emit('ops:playerJoined') → all clients update
```

### Combat Attack Flow
```
Gunner clicks Fire → ops:attack → resolveAttack() →
  → applyDamage() → emit('combat:attackResult') → UI updates
```

---

## .claude/ Directory Guide

**Active Documents:**
- `AR-208-*.md` - Current action request (combat UI)
- `TODO-combat-rules-gap-analysis.md` - Known gaps to implement
- `TODO.md` - Quick reference todos

**Historical (can ignore):**
- `AUTORUN-*.md` - Past autonomous session logs
- `SESSION-*.md` - Past session reports
- `STAGE-*.md` - Old development stages

**Reference:**
- `ISS-AMISHI-SHIP-SPECS.md` - Detailed ship example
- `MONGOOSE-TRAVELLER-RULES-EXTRACT.md` - Rules reference

---

## Testing

```bash
npm test              # All 392 tests
npm run test:smoke    # Fast smoke tests (~0.5s)
npm run test:e2e <file>  # E2E with browser cleanup
```

Test organization:
- `tests/unit/` - Pure function tests
- `tests/integration/` - Module integration
- `tests/e2e/` - Puppeteer browser tests

---

## Quick Start for Contributors

1. **Read** `README.md` and `CONTRIBUTING.md`
2. **Run** `npm install && npm test` - verify setup
3. **Explore** `lib/socket-handlers/ops/` - see how roles work
4. **Check** `.claude/TODO.md` - current priorities
5. **Pattern** - Follow existing code style (British spelling!)

---

## Common Tasks

### Add a new crew role action
1. Add handler in `lib/socket-handlers/ops/{role}.js`
2. Add UI button in `public/operations/role-panels/{role}.js`
3. Add test in `tests/unit/ops-{role}.test.js`

### Add a new ship template
1. Create JSON in `data/ships/v2/`
2. Follow schema: `data/ships/v2/ship-template-v2.schema.json`
3. Add to index: `data/ships/v2/index.json`

### Fix a combat rule
1. Check `lib/combat-engine.js` for resolution
2. Check `.claude/TODO-combat-rules-gap-analysis.md` for known issues
3. Add test first, then implement

---

**Last Updated:** 2025-12-31
