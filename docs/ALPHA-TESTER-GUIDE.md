# Traveller Starship Operations VTT - Alpha Tester Guide

**Version:** 0.72.0
**Last Updated:** January 2026
**Status:** Alpha Testing

---

## Production URL

### https://traveller-starship-operations-vtt.fly.dev/operations

---

**Important:** There is currently NO authentication. Anyone with the URL can access campaigns. 
This is intentional for alpha testing - treat all data as public/temporary.

Two pre-built campaigns are available:
- **Solo Demo** - Single-player scout ship experience
- **Tuesday Spinward Marches** - Multi-player Q-Ship campaign

---

## What Is This?

A virtual tabletop (VTT) for running Traveller RPG starship operations. Players take on crew roles 
(Captain, Pilot, Astrogator, Engineer, Gunner, Sensors) and collaboratively operate a starship through 
jump travel, system exploration, and space combat.

---

## Working Features

### Campaign & Login
- **GM Login** - Create/manage campaigns, control game state
- **Player Login** - Join campaigns via code, select crew role
- **Solo Demo** - Quick-start single-player experience
- **Role Selection** - Choose from 6 crew positions

### Bridge Operations
- **Top Bar** - Shows current hex, system name, date, alert status
- **Ship Status Panel** - ASCII art ship diagram with system health
- **Role Panels** - Role-specific controls and information
- **System Map** - Visual representation of current star system

### Navigation & Travel
- **Jump Plotting** - Astrogator plots jumps to nearby systems (J-1 to J-6)
- **Jump Execution** - Pilot initiates jump, 168-hour transit
- **Position Verification** - Confirm arrival coordinates after jump
- **In-System Travel** - Move between locations (highport, gas giants, etc.)

### Fuel Management
- **Four Refuel Sources:**
  - Starport (refined fuel)
  - Starport (unrefined fuel)
  - Gas Giant Skimming
  - Wilderness Refueling
- **Fuel Processing** - Convert unrefined to processed fuel
- **Fuel Tracking** - Breakdown by type (refined/unrefined/processed)

### Star System Data
- **439 Systems** - Full Spinward Marches sector
- **System Details** - Starport class, gas giants, bases, trade codes
- **Jump Map** - Visual subsector map with jump routes

### Space Combat (TUI Mode)
- **Turn-Based Combat** - Initiative, movement, attacks
- **Range Bands** - Adjacent to Distant
- **Weapon Systems** - Lasers, missiles, sandcasters, particle beams
- **Damage & Criticals** - Hull damage, system failures

---

## Role Guide

| Role | Primary Functions |
|------|-------------------|
| **Captain** | Issue orders, set alert status, overall command |
| **Pilot** | Ship movement, docking, initiate jumps |
| **Astrogator** | Plot jump routes, navigation, jump map |
| **Engineer** | Power management, damage control, repairs |
| **Gunner** | Weapons operation, targeting, fire control |
| **Sensors** | Contact detection, scanning, identification |

---

## How to Test

### Solo Demo (Recommended First)
1. Go to https://traveller-starship-operations-vtt.fly.dev/operations
2. Click **"Solo Demo"** button
3. You'll join as Captain of the Scout ship "Far Horizon" at Mora
4. Explore the bridge interface
5. Try plotting a jump (Astrogator panel)
6. Visit different in-system locations

### Multi-Player Testing
1. One person: Click **"GM Login"** → Select "Tuesday Spinward Marches"
2. Other players: Click **"Player Login"** → Enter campaign code
3. Each player selects a different role
4. Coordinate actions via voice/chat

### Things to Try
- [ ] Plot and execute a jump to a nearby system
- [ ] Refuel at a gas giant (requires undocking first)
- [ ] Check the jump map for route options
- [ ] View system details in the System Map
- [ ] Change alert status (Captain role)

---

## Known Limitations

### Not Yet Implemented
- Cargo trading
- Passenger transport
- NPC crew management
- Ship customization
- Detailed combat in web UI (use TUI demos for now)
- Multi-ship fleet operations

### Known Issues
- Some system maps show placeholder data for generated systems
- Jump map may need manual refresh after arrival
- Mobile layout needs optimization

---

## Reporting Issues

**GitHub Issues:** https://github.com/anthropics/claude-code/issues

When reporting, please include:
1. What you were trying to do
2. What happened instead
3. Browser and device info
4. Screenshots if applicable

---

## Architecture Notes (For Technical Testers)

- **Frontend:** Vanilla JS, Socket.IO for real-time updates
- **Backend:** Node.js, Express, SQLite
- **Hosting:** Fly.io (San Jose region)
- **Data:** Spinward Marches sector from Traveller Map

### Running Locally
```bash
git clone [repo-url]
npm install
npm start
# Open http://localhost:3000/operations
```

### Test Commands
```bash
npm run test:smoke    # Quick validation (~1s)
npm test              # Full test suite (~3s)
npm run test:e2e tests/e2e/qa-sanity-check.e2e.js  # E2E tests
```

---

## Feedback Welcome!

This is alpha software. Your feedback helps prioritize development. Particularly interested in:
- UI/UX pain points
- Missing features you'd use
- Bugs or unexpected behavior
- Performance issues

Thank you for testing!
