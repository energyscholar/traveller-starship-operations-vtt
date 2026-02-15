# Traveller VTT for Starship Operations

[![Test Status](https://img.shields.io/badge/tests-671%20passing-brightgreen)](https://github.com/energyscholar/traveller-starship-operations-vtt)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

> A real-time multiplayer Virtual Tabletop (VTT) for Mongoose Traveller 2nd Edition. Full space combat engine, AI-driven NPCs, 432 cached star systems, and multi-role crew management aboard persistent starships.

## Overview

Traveller VTT is a web-based virtual tabletop for **Mongoose Traveller 2nd Edition** that puts each player in a specific crew role aboard a starship. The GM manages campaigns while players take roles like Captain, Pilot, Engineer, Gunner, Astrogator, and more — each with dedicated control panels. Features include a full space combat engine with High Guard critical hits, AI-powered NPC interactions via Claude, real-time comms, boarding actions, electronic warfare, and a terminal UI mode for combat drills.

## Key Features

- **11 Crew Roles** with dedicated control panels (Captain, Pilot, Engineer, Astrogator, Gunner, Sensors, Medic, Marines, Cargo, Steward, Damage Control)
- **Combat Engine** — Full Mongoose Traveller 2E space combat (attack rolls, damage, criticals, initiative, range bands, electronic warfare)
- **AI NPC System** — Claude API-powered NPC responses with personality-driven dossiers
- **Communications** — Real-time comms channels and persistent ship mail with NPC contacts
- **Encounters** — Random encounter generation, pirate encounters, jump emergence events
- **Boarding Actions** — Marine-led boarding operations
- **Refuelling** — Starport fuel, wilderness refuelling, fuel tracking
- **Critical Hits** — High Guard critical damage tables, hull integrity thresholds
- **Electronic Warfare** — ECM/ECCM mechanics, sensor lock, stealth detection
- **432 Star Systems** — Full Spinward Marches encyclopedia cached locally
- **TUI Mode** — Terminal-based interface for combat drills and demos
- **Dual Interface** — V1 (legacy) and V2 (ViewModel architecture) UIs
- **Campaign Management** — Persistent campaigns with join codes for players
- **Real-time Multiplayer** — WebSocket synchronisation via Socket.io
- **Ship Template Editor** — Build and customize ships with High Guard rules (15 templates included)
- **671 Passing Tests** across 95 test suites

**Version:** 0.71.0

---

## Repository Metrics

| Metric | Value |
|--------|-------|
| **Total Lines of Code** | ~184,000 |
| JavaScript (production) | ~99,000 |
| JavaScript (test) | ~85,000 |
| **Total Files** | 4,800+ |
| JavaScript files | 796 |
| **Git Stats** | |
| Total commits | 622 |
| Contributors | 2 |
| Project age | ~15 weeks |
| **Dependencies** | |
| Runtime | 14 |
| Dev | 6 |

---

## Quick Start

### Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/energyscholar/traveller-starship-operations-vtt.git
cd traveller-starship-operations-vtt

# Install dependencies
npm install

# Run tests
npm test
# Expected: 671/671 tests passing

# Smoke tests (fast, ~0.6s)
npm run test:smoke

# Start server
npm start
# Server running at http://localhost:3000
```

### Docker Deployment

```bash
docker build -t traveller-vtt .
docker run -d -p 3000:3000 --name traveller-vtt traveller-vtt

# Health check
curl http://localhost:3000/health
```

---

## Usage

### For Game Masters

1. Open `http://localhost:3000/`
2. Click **GM Login**
3. Create or select a campaign
4. Share the **Campaign Code** with players
5. Start the session when players have joined
6. Use hamburger menu for:
   - **Shared Map** - Share TravellerMap sector with players
   - **Ship Mail** - Send in-character communications
   - **Feedback** - Review player feedback

### For Players

1. Open `http://localhost:3000/`
2. Click **Player Login**
3. Enter the **Campaign Code** from your GM
4. Import or create your character
5. Select a ship and crew role
6. Click **Join Bridge**

### Crew Roles

| Role | Responsibilities |
|------|------------------|
| **Captain** | Command, tactics, leadership, relieve crew |
| **Pilot** | Navigation, manoeuvring, docking |
| **Astrogator** | Jump plotting, route calculation |
| **Engineer** | Power allocation, repairs, drive management |
| **Gunner** | Weapons, point defence |
| **Sensors** | Detection, comms, electronic warfare |
| **Medic** | Medical care, crew health |
| **Marines** | Security, boarding actions |
| **Cargo** | Cargo operations, loading |
| **Steward** | Passengers, supplies |
| **Damage Control** | Repairs, emergencies |

---

## Features

### Combat & Tactics
- **Space Combat Engine** — Full Mongoose Traveller 2E combat rounds with initiative, attack rolls, and damage resolution
- **Critical Hits** — High Guard critical damage tables with hull integrity thresholds
- **Electronic Warfare** — ECM/ECCM mechanics, sensor lock boon, stealth detection
- **Ion Weapons** — Ion damage and system disruption effects
- **Range Bands** — Adjacent through Distant with authentic DMs
- **Combat Drills** — TUI-based combat demos and training scenarios

### Operations Layer
- **Campaign Management** — Create campaigns, manage player slots, persistent state
- **11 Crew Roles** — Each with dedicated controls and displays
- **Ship Systems** — M-Drive, J-Drive, Power Plant, Sensors, Computer status
- **Ship Log** — Timestamped crew actions and system events
- **Alert Status** — Normal, Yellow, Red alert with visual indicators
- **Jump Maps** — Astrogator jump plotting with TravellerMap API

### Communications
- **Ship Mail** — In-game messaging system with NPC contacts
- **Comms Channels** — Real-time communication between crew and external contacts
- **Cargo Manifest** — Tracked cargo with loading/unloading operations
- **Crew Roster** — Crew status tracking and management

### Star Systems & Navigation
- **432 Cached Systems** — Full Spinward Marches encyclopedia from wiki.travellerrpg.com
- **16 Subsectors** — Detailed planetary data with moons and orbits
- **TravellerMap Integration** — Enriched sector data with bases, trade routes, and allegiances
- **Encounters** — Random encounter generation, pirate encounters, jump emergence events
- **Refuelling** — Starport fuel, wilderness refuelling, fuel tracking

### Shared TravellerMap
- GM can share sector maps with all players
- Disk-based tile caching (72h TTL)
- Rate limiting (polite to TravellerMap servers)
- Cache toggle in UI (top-right corner)
- Debug overlay in dev mode

### Ship Template Editor
- Build ships using High Guard 2022 rules
- Component validation and cost calculation
- Export/import ship templates as JSON
- 15 pre-built ship templates included

### AI & NPCs
- **Claude-Powered NPCs** — AI-generated NPC responses via Anthropic Claude API
- **Personality Dossiers** — NPC personality traits drive conversation style
- **Boarding Actions** — Marine-led boarding operations with NPC combatants

### Technical Infrastructure
- **SQLite Database** — Persistent campaign and character storage via better-sqlite3
- **Real-time Sync** — Socket.io WebSocket communication
- **Authentication** — JWT-based auth with bcrypt password hashing
- **ViewModel Architecture** — V2 interface with clean separation of concerns
- **Docker Ready** — Multi-stage builds with health checks
- **Export/Import** — JSON-based save/load with schema versioning (AJV validation)

---

## Built With

### Backend
- **[Node.js](https://nodejs.org/)** (>=18.0.0) — JavaScript runtime
- **[Express](https://expressjs.com/)** (4.18.2) — Web application framework
- **[Socket.io](https://socket.io/)** (4.7.2) — Real-time WebSocket communication
- **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)** (12.6.2) — SQLite database
- **[Winston](https://github.com/winstonjs/winston)** (3.18.3) — Structured logging
- **[AJV](https://ajv.js.org/)** (8.17.1) — JSON Schema validation
- **[ajv-formats](https://github.com/ajv-validator/ajv-formats)** (3.0.1) — AJV format validators
- **[JSZip](https://stuk.github.io/jszip/)** (3.10.1) — ZIP file handling
- **[@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-js)** (0.71.2) — Claude AI integration
- **[bcrypt](https://github.com/kelektiv/node.bcrypt.js)** (6.0.0) — Password hashing
- **[jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)** (9.0.3) — JWT authentication
- **[cookie-parser](https://github.com/expressjs/cookie-parser)** (1.4.7) — Cookie handling

### Frontend
- **Vanilla JavaScript** — No framework dependencies
- **HTML5/CSS3** — Responsive sci-fi themed UI
- **WebSockets** — Real-time bidirectional communication
- **[@xterm/xterm](https://xtermjs.org/)** (6.0.0) — Terminal emulator for TUI mode
- **[@xterm/addon-fit](https://github.com/xtermjs/xterm.js)** (0.11.0) — Terminal auto-fit

### Testing
- **[Mocha](https://mochajs.org/)** (11.7.5) — Primary test framework
- **[Jest](https://jestjs.io/)** (29.7.0) — Automated test framework
- **[Puppeteer](https://pptr.dev/)** (24.29.1) — Browser automation for E2E tests
- **671 tests** across 95 test suites (~8s runtime)

---

## Testing

```bash
# All tests (671 tests across 95 suites, ~8s)
npm test

# Smoke tests (fast, ~0.6s)
npm run test:smoke

# Fastest smoke
npm run test:fast

# Watch mode
npm run test:watch

# E2E tests (with server auto-cleanup)
npm run test:e2e tests/e2e/my-test.js

# Cleanup zombie processes
npm run cleanup:all
```

---

## Project Structure

```
traveller-starship-operations-vtt/
├── lib/                          # Core game logic (237 files)
│   ├── adapters/                 # Interface adapters
│   ├── astrophysics/             # Stellar and planetary calculations
│   ├── auth/                     # JWT authentication + bcrypt
│   ├── camera/                   # Map camera controls
│   ├── combat/                   # Space combat engine
│   ├── config/                   # Configuration management
│   ├── engine/                   # Core game engine
│   ├── factories/                # Object factories
│   ├── operations/               # Operations layer (campaigns, accounts, DB)
│   ├── routes/                   # Express route handlers
│   ├── server/                   # Server setup and middleware
│   ├── services/                 # Rate limiting, metrics, services
│   ├── socket-handlers/          # Socket.io event handlers
│   │   └── ops/                  # Modular operation handlers
│   ├── state/                    # Game state management
│   ├── tui/                      # Terminal UI mode
│   ├── viewmodels/               # V2 ViewModel architecture
│   └── weapons/                  # Weapon systems and data
├── data/
│   ├── campaigns/                # SQLite database
│   ├── drills/                   # Combat drill scenarios
│   ├── map-cache/                # TravellerMap tile cache
│   ├── map-fixtures/             # Test fixtures for maps
│   ├── rules/                    # Game rule data
│   ├── schemas/                  # JSON validation schemas
│   ├── sectors/                  # Enriched sector data (TravellerMap)
│   ├── ships/v2/                 # Ship templates (15 templates)
│   ├── star-systems/             # 16 subsectors with planetary data
│   ├── subsectors/               # Subsector reference data
│   ├── weapons/                  # Weapon data files
│   ├── wiki-cache/               # 432 Spinward Marches system encyclopedias
│   └── world-maps/               # World map data
├── public/
│   ├── operations/               # V1 Operations VTT UI
│   ├── operations-v2/            # V2 ViewModel-based UI
│   └── tui/                      # Terminal UI client
├── scripts/                      # Utility scripts
├── tests/                        # 671 tests across 95 suites
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   ├── auth/                     # Authentication tests
│   ├── automated/                # Jest automated tests
│   └── e2e/                      # Puppeteer E2E tests
├── schemas/                      # JSON validation schemas
├── config/                       # Environment configurations
├── aws/                          # AWS deployment configs
├── bin/                          # CLI entry points (TUI)
├── server.js                     # Express + Socket.io
├── Dockerfile                    # Multi-stage production build
└── package.json
```

---

## Mongoose Traveller 2E Rules

This VTT implements authentic **Mongoose Traveller 2nd Edition** rules:

- **Attack Roll:** 2D6 + Skill + Stat DM + Range DM >= 8
- **Effect:** Attack Total - 8
- **Damage:** Weapon Damage + Effect - Armour (minimum 0)
- **Initiative:** 2D6 + Pilot + Thrust + Captain Tactics
- **Range Bands:** Adjacent (+2) -> Close (0) -> Short (-1) -> Medium (-2) -> Long (-2) -> Very Long (-4) -> Distant (-4)
- **Combat Phases:** Manoeuvre, Attack, Damage Resolution, Critical Hits
- **Sensor Lock:** Boon on attack when sensors operator achieves lock
- **Ion Weapons:** System disruption damage, separate from hull damage
- **Electronic Warfare:** ECM reduces incoming attack rolls; ECCM counters ECM

---

## Contributing

Contributions welcome! Please:

1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Write tests first (TDD)
3. Use British spelling ("armour", not "armor")
4. Run `npm test` before committing

---

## License

**Code:** [MIT License](LICENSE)

**Traveller Content:**
- **Traveller** is a registered trademark of **Far Future Enterprises** (with gratitude to Marc Miller, creator of Traveller)
- Used under license by **Mongoose Publishing Ltd.**
- This is an unofficial fan project, not affiliated with or endorsed by Mongoose Publishing or Far Future Enterprises

---

## Acknowledgments

- **Mongoose Publishing** — Mongoose Traveller 2nd Edition
- **Far Future Enterprises** — Original Traveller game system (with gratitude to Marc Miller, creator of Traveller)
- **[TravellerMap](https://travellermap.com/)** — Jump map data and API (Thanks Joshua Bell!)
- **Anthropic Claude Code** — AI-assisted development

---

**Version:** 0.71.0
**Tests:** 671 passing (95 suites)
**Last Updated:** 2026-02-15
**Created by:** Bruce Stephenson

(c) 2025-2026 Bruce Stephenson. Open source under MIT License.
