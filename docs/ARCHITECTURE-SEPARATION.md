# AR-250: Logic/Display Separation Architecture

**Purpose:** 100% separation between business logic and display
**Pattern:** Engine + EventBus + Adapter (proven in CombatEngine)

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│ ADAPTER LAYER (Display)                              │
│ - TUI adapters (ANSI terminal)                      │
│ - GUI adapters (DOM/Canvas)                         │
│ - Socket adapters (client notifications)            │
│ - Subscribe to EventBus, zero business logic        │
└─────────────────────────────────────────────────────┘
           ↑ subscribes to events
┌─────────────────────────────────────────────────────┐
│ EVENT BUS (Decoupling)                               │
│ - Type-safe EventTypes constants                    │
│ - Pub/sub with history/replay                       │
│ - No logic, pure messaging                          │
└─────────────────────────────────────────────────────┘
           ↑ publishes events
┌─────────────────────────────────────────────────────┐
│ ENGINE LAYER (Pure Business Logic)                   │
│ - Game mechanics, state changes, validation         │
│ - No display concerns (no console.log, no HTML)     │
│ - Dependency injection (RNG, config)                │
└─────────────────────────────────────────────────────┘
```

---

## File Naming Convention

| Layer | Location | Pattern |
|-------|----------|---------|
| Engine | `lib/engine/` | `<domain>-engine.js` |
| Engine State | `lib/engine/roles/` | `<role>-state.js` |
| Operations | `lib/operations/` | `<domain>.js` |
| TUI Adapter | `lib/adapters/` | `<domain>-tui-adapter.js` |
| GUI Adapter | `public/operations/adapters/` | `<domain>-gui-adapter.js` |
| Socket Handler | `lib/socket-handlers/ops/` | `<domain>.js` (thin) |

---

## Engine Layer Rules

**DO:**
- Return pure data objects
- Publish events via EventBus
- Accept dependencies via constructor (RNG, config)
- Validate inputs, throw on error
- Keep functions stateless where possible

**DON'T:**
- Import any display/UI modules
- Use `console.log()` (use debug events)
- Generate HTML strings
- Access DOM or window
- Format strings for display

### Example: Pure State Function

```javascript
// lib/engine/roles/gunner-state.js - PURE LOGIC
function getGunnerState(ship, combatState) {
  return {
    hitProbability: calculateHitProbability(ship, combatState),
    targets: prioritizeTargets(combatState.contacts),
    weapons: getAvailableWeapons(ship),
    ammunition: getAmmunitionStatus(ship),
    readyWeapons: ship.turrets.filter(t => !t.disabled)
  };
}

module.exports = { getGunnerState };
```

---

## Adapter Layer Rules

**DO:**
- Subscribe to EventBus events
- Render data to specific format (TUI/GUI)
- Handle display-specific concerns (colors, layout)
- Call engine functions for data, never compute

**DON'T:**
- Contain game logic
- Modify game state
- Make game decisions
- Validate game rules

### Example: TUI Adapter

```javascript
// lib/adapters/gunner-tui-adapter.js
const { getGunnerState } = require('../engine/roles/gunner-state');

function renderGunnerTUI(ship, combatState) {
  const state = getGunnerState(ship, combatState);

  let out = `${BOLD}GUNNER STATION${RESET}\n`;
  out += `Hit Probability: ${state.hitProbability}%\n`;
  out += `Ready Weapons: ${state.readyWeapons.length}\n`;

  for (const target of state.targets.slice(0, 5)) {
    out += `  ${target.name} @ ${target.range}\n`;
  }

  return out;
}

module.exports = { renderGunnerTUI };
```

### Example: GUI Adapter

```javascript
// public/operations/adapters/gunner-gui-adapter.js
import { getGunnerState } from '../../../lib/engine/roles/gunner-state.js';

export function renderGunnerPanel(ship, combatState) {
  const state = getGunnerState(ship, combatState);

  return `
    <div class="gunner-panel">
      <h3>Gunner Station</h3>
      <div class="hit-prob">${state.hitProbability}%</div>
      <ul class="targets">
        ${state.targets.map(t => `<li>${t.name}</li>`).join('')}
      </ul>
    </div>
  `;
}
```

---

## Socket Handler Rules (Thin Pattern)

Socket handlers should ONLY:
1. Validate request format
2. Call operations layer
3. Publish events or emit results
4. Handle errors

```javascript
// lib/socket-handlers/ops/pilot.js - THIN HANDLER
const pilotOps = require('../../operations/pilot');
const { eventBus } = require('../../engine/event-bus');

socket.on('ops:setEvasive', async (data) => {
  try {
    // Validate
    if (!data.shipId) throw new Error('Missing shipId');

    // Delegate to operations
    const result = await pilotOps.setEvasiveManeuvers(data.shipId, data.level);

    // Publish event (adapters will render)
    eventBus.publish('nav:thrustApplied', result);

    // Confirm to client
    socket.emit('ops:evasiveSet', { success: true });
  } catch (err) {
    socket.emit('ops:error', { message: err.message });
  }
});
```

---

## Migration Checklist

When refactoring a mixed file:

- [ ] Identify all game logic (calculations, validation, state changes)
- [ ] Extract to engine/state module
- [ ] Identify all display logic (HTML, formatting, colors)
- [ ] Move to adapter module
- [ ] Create event types for state changes
- [ ] Wire adapter to subscribe to events
- [ ] Test engine in isolation (no display dependencies)
- [ ] Test adapter renders correctly from engine data

---

## Anti-Patterns to Avoid

### 1. Logic in Render

```javascript
// BAD - calculation in display
function renderPanel(ship) {
  const hitChance = 8 + ship.skill - target.evasion;  // LOGIC!
  return `<div>Hit: ${hitChance}%</div>`;
}

// GOOD - logic separated
function getState(ship, target) {
  return { hitChance: 8 + ship.skill - target.evasion };
}
function renderPanel(state) {
  return `<div>Hit: ${state.hitChance}%</div>`;
}
```

### 2. Display in Engine

```javascript
// BAD - formatting in engine
function resolveAttack(attacker, defender) {
  console.log(`${attacker.name} attacks!`);  // DISPLAY!
  return { hit: true, damage: 5 };
}

// GOOD - pure logic
function resolveAttack(attacker, defender) {
  return { hit: true, damage: 5, attacker: attacker.name };
}
// Adapter subscribes to event and logs
```

### 3. State Mutation in Handler

```javascript
// BAD - socket handler modifies state
socket.on('toggleECM', () => {
  ship.ecmActive = !ship.ecmActive;  // MUTATION!
  socket.emit('ecmToggled', ship.ecmActive);
});

// GOOD - delegate to operations
socket.on('toggleECM', async (data) => {
  const result = await sensorOps.toggleECM(data.shipId);
  eventBus.publish('sensor:ecmActivated', result);
});
```

---

## Templates

### Role State Module Template

```javascript
// lib/engine/roles/<role>-state.js
/**
 * <Role> State - Pure data for <role> panel
 */

function get<Role>State(ship, gameState) {
  return {
    // Computed values
    // Available actions
    // Status indicators
  };
}

module.exports = { get<Role>State };
```

### TUI Adapter Template

```javascript
// lib/adapters/<role>-tui-adapter.js
const { get<Role>State } = require('../engine/roles/<role>-state');

const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function render<Role>TUI(ship, gameState) {
  const state = get<Role>State(ship, gameState);
  let out = `${BOLD}<ROLE> STATION${RESET}\n`;
  // Build TUI string from state
  return out;
}

module.exports = { render<Role>TUI };
```

---

## Success Criteria

- [ ] Zero HTML generation in `lib/engine/` or `lib/operations/`
- [ ] Zero console.log in engine files (except debug mode)
- [ ] All socket handlers < 200 lines
- [ ] Role state functions return pure data objects
- [ ] TUI adapters can render any operation
- [ ] Unit tests for state functions (no display deps)
