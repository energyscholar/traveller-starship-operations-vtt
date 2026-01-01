# Traveller VTT for Starship Operations

[![Test Status](https://img.shields.io/badge/tests-392%20passing-brightgreen)](https://github.com/energyscholar/traveller-combat-vtt)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

> A real-time multiplayer Virtual Tabletop (VTT) for Mongoose Traveller 2nd Edition starship operations. Multi-role crew management, campaign persistence, and authentic space operations.

## Overview

Traveller VTT is a web-based virtual tabletop for **Mongoose Traveller 2nd Edition** that puts each player in a specific crew role aboard a starship. The GM manages campaigns while players take roles like Captain, Pilot, Engineer, Gunner, Astrogator, and more—each with their own dedicated control panels.

## Key Features

- **11 Crew Roles** with dedicated control panels (Captain, Pilot, Engineer, Astrogator, Gunner, Sensors, Medic, Marines, Cargo, Steward, Damage Control)
- **Campaign Management** - Persistent campaigns with join codes for players
- **Real-time Multiplayer** - WebSocket synchronisation via Socket.io
- **Ship Operations** - Jump plotting, sensor contacts, ship mail, crew status
- **Shared TravellerMap** - GM can share sector maps with all players (with caching)
- **Ship Template Editor** - Build and customize ships with High Guard rules
- **392 Passing Tests** across 36 test suites

**Version:** 1.0.0

---

## Repository Metrics

| Metric | Value |
|--------|-------|
| **Total Lines of Code** | ~117,000 |
| JavaScript (production) | 68,000 |
| JavaScript (test) | 48,000 |
| **Total Files** | 500+ |
| JavaScript files | 493 |
| **Git Stats** | |
| Total commits | 457 |
| Contributors | 3 |
| Project age | ~7 weeks |
| **Dependencies** | |
| Runtime | 7 |
| Dev | 4 |

---

## Quick Start

### Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/energyscholar/traveller-combat-vtt.git
cd traveller-combat-vtt

# Install dependencies
npm install

# Run tests
npm test
# Expected: 339/339 tests passing

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

### Operations Layer
- **Campaign Management** - Create campaigns, manage player slots, persistent state
- **11 Crew Roles** - Each with dedicated controls and displays
- **Ship Systems** - M-Drive, J-Drive, Power Plant, Sensors, Computer status
- **Ship Log** - Timestamped crew actions and system events
- **Ship Mail** - In-game messaging system with NPC contacts
- **Alert Status** - Normal, Yellow, Red alert with visual indicators
- **Jump Maps** - Astrogator jump plotting with TravellerMap API

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
- 10 pre-built ship templates included

### Technical Infrastructure
- **SQLite Database** - Persistent campaign and character storage
- **Real-time Sync** - Socket.io WebSocket communication
- **Docker Ready** - Multi-stage builds with health checks
- **Export/Import** - JSON-based save/load with schema versioning

---

## Built With

### Backend
- **[Node.js](https://nodejs.org/)** (≥18.0.0) - JavaScript runtime
- **[Express](https://expressjs.com/)** (4.18.2) - Web application framework
- **[Socket.io](https://socket.io/)** (4.7.2) - Real-time WebSocket communication
- **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)** (12.5.0) - SQLite database
- **[Winston](https://github.com/winstonjs/winston)** (3.18.3) - Structured logging
- **[AJV](https://ajv.js.org/)** (8.17.1) - JSON Schema validation
- **[JSZip](https://stuk.github.io/jszip/)** (3.10.1) - ZIP file handling

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **HTML5/CSS3** - Responsive sci-fi themed UI
- **WebSockets** - Real-time bidirectional communication

### Testing
- **[Jest](https://jestjs.io/)** (29.7.0) - Testing framework
- **[Puppeteer](https://pptr.dev/)** (24.29.1) - Browser automation for E2E tests
- **392 tests** across 36 test suites (~3s runtime)

---

## Testing

```bash
# All tests (392 tests across 36 suites)
npm test

# Smoke tests (fast, ~0.5s)
npm run test:smoke

# Watch mode
npm run test:watch

# Cleanup zombie processes
npm run cleanup
```

---

## Project Structure

```
traveller-combat-vtt/
├── lib/                      # Core game logic (98 files)
│   ├── operations/           # Operations layer (campaigns, accounts, database)
│   ├── socket-handlers/      # Socket.io event handlers
│   │   └── ops/              # Modular operation handlers
│   ├── services/             # Rate limiting, metrics
│   └── ship-*.js             # Ship validation modules
├── data/
│   ├── campaigns/            # SQLite database
│   ├── ships/v2/             # Ship templates (10 templates)
│   ├── map-cache/            # TravellerMap tile cache
│   └── map-fixtures/         # Test fixtures for maps
├── public/
│   └── operations/           # Operations VTT UI
├── scripts/                  # Utility scripts
├── tests/                    # 339 tests across 31 suites
├── schemas/                  # JSON validation schemas
├── config/                   # Environment configurations
├── aws/                      # AWS deployment configs
├── server.js                 # Express + Socket.io
├── Dockerfile                # Multi-stage production build
└── package.json
```

---

## Mongoose Traveller 2E Rules

This VTT implements authentic **Mongoose Traveller 2nd Edition** rules:

- **Attack Roll:** 2D6 + Skill + Stat DM + Range DM ≥ 8
- **Effect:** Attack Total - 8
- **Damage:** Weapon Damage + Effect - Armour (minimum 0)
- **Initiative:** 2D6 + Pilot + Thrust + Captain Tactics
- **Range Bands:** Adjacent (+2) → Close (0) → Short (-1) → Medium (-2) → Long (-2) → Very Long (-4) → Distant (-4)

---

## Contributing

Contributions welcome! Please:

1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Write tests first (TDD)
3. Use British spelling ("armour", not "armor")
4. Run `npm test` before committing

---

## License

**Code:** [GNU General Public License v3.0](LICENSE)

**Traveller Content:**
- **Traveller** is a registered trademark of **Far Future Enterprises** (with gratitude to Marc Miller, creator of Traveller)
- Used under license by **Mongoose Publishing Ltd.**
- This is an unofficial fan project, not affiliated with or endorsed by Mongoose Publishing or Far Future Enterprises

---

## Acknowledgments

- **Mongoose Publishing** - Mongoose Traveller 2nd Edition
- **Far Future Enterprises** - Original Traveller game system (with gratitude to Marc Miller, creator of Traveller)
- **[TravellerMap](https://travellermap.com/)** - Jump map data and API (Thanks Joshua Bell!)
- **Anthropic Claude Code** - AI-assisted development

---

**Version:** 1.0.0
**Tests:** 392 passing (36 suites)
**Last Updated:** 2025-12-31
**Created by:** Bruce Stephenson

© 2025 Bruce Stephenson. Open source under GPL-3.0 License.
