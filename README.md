# Traveller Combat VTT

A web-based Virtual Tabletop (VTT) for **Mongoose Traveller 2nd Edition** space combat, built with TDD principles.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start server
node server.js
```

Visit `http://localhost:3000` in your browser.

---

## 📊 Project Status

**Current Stage:** Planning complete, ready for Stage 8 implementation
**Progress:** 43% (Stages 1-7 complete, 8-16 planned)
**Test Coverage:** 95% (personal combat)
**Production Ready:** Estimated 85 hours (~3-4 weeks part-time)

| Component | Status | LOC | Tests |
|-----------|--------|-----|-------|
| Personal Combat (Stages 1-7) | ✅ Complete | 1,200 | 800 (95%) |
| Space Combat (Stages 8-12) | 📋 Planned | ~5,000 | ~3,000 |
| Production (Stages 13-15) | 📋 Planned | ~1,800 | ~800 |
| Advanced (Stage 16+) | 📋 Planned | ~1,500+ | ~600+ |

---

## ✨ Features

### ✅ Implemented (Stages 1-7)
- **Personal Combat System**
  - 2D6 Traveller mechanics (2D + skill + mods ≥ 8)
  - Damage with Effect (roll + Effect - armour)
  - Crew skills (pilot, gunner, engineer)
  - Hex grid movement (10x10 grid)
  - Range bands (adjacent → very long)
  - Multiple weapons & ammo tracking
  - Engineer repairs
  - Real-time multiplayer (Socket.io)

### 🚧 In Progress (Stage 8)
- **Space Combat (Simplified)**
  - Scout vs Free Trader battles
  - 7 range bands (Adjacent → Distant)
  - Spacecraft weapons (Beam/Pulse Lasers)
  - Hull damage & critical hits
  - Ship selection UI
  - Space combat HUD

### 📋 Planned (Stages 9-16)
- **Stage 9:** Movement, Thrust, Advanced Initiative
- **Stage 10:** Critical Hit Effects (Severity 1-6)
- **Stage 11:** Missiles, Sandcasters, Called Shots
- **Stage 12:** Boarding Actions
- **Stage 13:** Performance & Scale (10 concurrent battles)
- **Stage 14:** VTT Integration (Roll20, Fantasy Grounds, Foundry)
- **Stage 15:** Cloud Deployment (Azure)
- **Stage 16+:** Ship Builder, Fleet Battles, Campaign Mode

---

## 🏗️ Architecture

### Stack
- **Backend:** Node.js + Express
- **Real-time:** Socket.io (WebSockets)
- **Frontend:** Vanilla JS + HTML/CSS
- **Testing:** Custom Node.js test runner
- **Data:** In-memory (persistence in Stage 13+)

### Design Principles
- **TDD-First:** Tests before implementation (1.46:1 test-to-code ratio)
- **Stateless Server:** Horizontal scaling ready
- **Event-Driven:** All actions via Socket.io events
- **Modular:** Personal vs Space combat separation
- **British Spelling:** Matches Traveller rules ("armour", not "armor")

### Future (Stages 13-15)
- Database persistence
- Azure App Service deployment
- Horizontal scaling & load balancing
- Performance monitoring (Application Insights)
- API integrations (Roll20, Fantasy Grounds, Foundry VTT)

---

## 📁 Project Structure

```
traveller-combat-vtt/
├── lib/
│   ├── combat.js           # Combat resolution engine
│   └── dice.js             # 2D6 dice roller
├── data/
│   └── rules/
│       └── combat-rules.json   # Traveller combat rules
├── public/
│   ├── index.html          # Main UI
│   ├── style.css           # Styles
│   └── client.js           # Client-side logic
├── tests/
│   ├── unit/               # Unit tests (combat, crew, weapons)
│   └── integration/        # Browser integration tests
├── .claude/
│   ├── handoffs/           # Stage handoff documents
│   ├── STAGE-*-PLAN.md     # Detailed stage plans
│   ├── PROJECT-STATUS.md   # Current status & metrics
│   └── MONGOOSE-TRAVELLER-RULES-EXTRACT.md
├── server.js               # Express + Socket.io server
├── package.json
└── README.md               # This file
```

---

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
node tests/unit/combat.test.js
node tests/unit/crew-system.test.js
node tests/integration/browser.test.js
```

### Test Coverage
- **Personal combat:** 95% coverage
- **20 unit tests** (combat math, crew, weapons, grid)
- **8 integration tests** (browser, multiplayer, UI)
- **Stage 8 target:** 90% coverage (28 new unit tests, 2 integration)

### TDD Workflow
1. Write tests first (define expected behavior)
2. Run tests (they fail - red)
3. Implement feature (make tests pass - green)
4. Refactor (improve code, keep tests green)
5. Repeat

---

## 🎮 Gameplay

### Personal Combat (Stages 1-7)
1. Select ships (DEEP HOPE, WILD CARD)
2. Assign crew (pilot, gunner, engineer)
3. Position on hex grid
4. Take turns: Move → Attack → End Turn
5. Combat resolves in real-time
6. Damage tracked, repairs available

### Space Combat (Stage 8+)
1. Select spacecraft (Scout, Free Trader)
2. Choose starting range
3. Assign gunners to turrets
4. Initiative order (2D + Pilot + Thrust)
5. Each turn:
   - Allocate Thrust (movement, manoeuvres)
   - Select targets & fire weapons
   - Resolve damage & critical hits
6. Victory when opponent disabled/destroyed/fled

---

## 📖 Mongoose Traveller Rules

This VTT implements **Mongoose Traveller 2nd Edition** combat rules:

### Core Mechanics
- **Attack Roll:** 2D6 + Skill + Stat DM + Range DM ≥ 8
- **Effect:** Attack Total - 8 (degree of success)
- **Damage:** Weapon Damage + Effect - Armour
- **Critical Hits:** Effect ≥6 AND damage >0
- **Severity:** Damage ÷ 10 (round up)

### Space Combat (Stages 8-12)
- **Initiative:** 2D6 + Pilot + Thrust + Captain Tactics
- **Ranges:** 7 bands (Adjacent, Close, Short, Medium, Long, Very Long, Distant)
- **Weapons:** Lasers, Missiles, Sandcasters
- **Manoeuvres:** Aid Gunners, Evasive Action, Docking
- **Critical Locations:** Sensors, Power, Fuel, Weapons, M-Drive, J-Drive, Hull, etc.

For full rules, see `.claude/MONGOOSE-TRAVELLER-RULES-EXTRACT.md`

---

## 🛠️ Development Roadmap

### Phase 1: Core Space Combat (Stages 8-12) - ~30 hours
**MVP:** Full Traveller space combat playable
- Simplified combat (Stage 8)
- Movement & initiative (Stage 9)
- Critical effects (Stage 10)
- Missiles & sandcasters (Stage 11)
- Boarding actions (Stage 12)

### Phase 2: Production Ready (Stages 13-15) - ~35 hours
**Goal:** Scalable, deployed, monitored
- Performance testing (Stage 13)
- VTT integration (Stage 14)
- Azure deployment (Stage 15)

### Phase 3: Advanced Features (Stage 16+) - ~20+ hours
**Goal:** Commercial-grade VTT plugin
- Ship builder UI
- Fleet battles
- Campaign persistence
- High Guard rules
- UI/UX polish

**Total Estimated Effort:** ~85+ hours to production

---

## 📈 Performance Targets

### Current (Stages 1-7)
- Combat resolution: <50ms per attack
- Turn processing: <100ms
- No load testing yet

### Stage 13 Targets
- **10 concurrent battles**
- **60 players, 110 ships** simultaneous
- **<200ms latency** under load
- **<100ms combat resolution** (enforced by tests)
- Auto-reconnect on network failure
- State sync recovery

---

## 🤝 Contributing

This is a personal learning project (CTO skills development) but feedback is welcome!

### Development Guidelines
1. **TDD Always:** Write tests first
2. **Small Commits:** One feature per commit
3. **British Spelling:** Match Traveller rules
4. **Run Tests:** Before every commit (`npm test`)
5. **Document:** Update handoffs after each stage

---

## 📄 License

MIT License - See LICENSE file

---

## 🎯 Goals

### Technical Goals
- Master TDD workflow (test-to-code ratio >1.0)
- Practice microservices architecture
- Learn Azure deployment (CTO skill building)
- Implement real-time multiplayer
- Performance optimization at scale

### Gameplay Goals
- Authentic Mongoose Traveller 2e implementation
- Support solo play & multiplayer (2-10 players)
- GM tools for managing NPCs
- VTT plugin compatibility (Roll20, Fantasy Grounds, Foundry)
- Fleet battle support (multiple ships per side)

---

## 📞 Contact

**Developer:** Bruce (CTO Skills Development Project)
**Rules Source:** Mongoose Traveller 2nd Edition
**VTT Targets:** Roll20, Fantasy Grounds, Foundry VTT

---

## 🔗 Quick Links

- **Planning Documents:** `.claude/STAGE-*-PLAN.md`
- **Project Status:** `.claude/PROJECT-STATUS.md`
- **Traveller Rules:** `.claude/MONGOOSE-TRAVELLER-RULES-EXTRACT.md`
- **Handoffs:** `.claude/handoffs/`

---

**Last Updated:** 2025-11-08
**Version:** 0.7.0 (Stage 7 complete, Stage 8 planned)
**Next Milestone:** Stage 8 - Space Combat MVP (~3.6 hours)
