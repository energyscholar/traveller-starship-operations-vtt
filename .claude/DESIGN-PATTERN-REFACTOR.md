# DESIGN-PATTERN-REFACTOR Autorun

## Overview

Systematic implementation of design patterns identified during codebase analysis. Each stage builds on the previous, with scaffolding tests created for safety and removed after verification.

**Prerequisites**: MVC refactor complete (tag: `mvc-refactor-complete`)

### Decisions Made (Risk Mitigation)
- **AI Fidelity**: Equivalent quality acceptable (not pixel-perfect)
- **Undo/Redo**: Full implementation in Stage 4
- **EventBus Scope**: Internal only (socket.emit unchanged)
- **Testing**: Manual + automated after each stage

### Documentation Requirements (Each Stage)
1. **JSDoc comments** in new pattern files (purpose, usage examples)
2. **README.md** already updated with Architecture Patterns table
3. **server.js header** already documents MVC structure
4. Keep documentation in sync as patterns are implemented

---

## Stage 1: Factory Pattern - Entity Creation

### Target Files
- `lib/combat/crews.js` (~180 LOC)
- `public/js/space-combat.js` (ship creation ~50 LOC)
- `lib/operations/seed-ships.js` (~150 LOC)

### Implementation
Create factory classes for consistent entity instantiation:

```
lib/factories/
  CrewFactory.js         (~80 LOC) - Ground combat crew creation
  ShipFactory.js         (~100 LOC) - Space combat ship creation
  NPCCrewFactory.js      (~60 LOC) - Operations mode NPC generation
  index.js               (~20 LOC) - Unified exports
```

### New Files: ~260 LOC
### Modified Files: ~380 LOC refactored
### Scaffolding Tests: `test/scaffolding/factory.scaffold.test.js` (~150 LOC)

### Risk Assessment
| Factor | Level | Notes |
|--------|-------|-------|
| Complexity | LOW | Straightforward extraction |
| Breaking Changes | LOW | Internal refactor only |
| Test Coverage | MEDIUM | Need to verify all creation paths |

### Benefits
- Centralized validation for entity creation
- Consistent defaults and optional overrides
- Easier to add new entity types
- Single point for future persistence integration

### Documentation Template (JSDoc)
```javascript
/**
 * ShipFactory - Factory Pattern for space combat ship creation
 *
 * Creates ship instances with validated components, consistent defaults,
 * and optional customisation. All ships pass through factory validation.
 *
 * @example
 * const ship = ShipFactory.create('scout', { hull: 80 });
 * const customShip = ShipFactory.createWithLoadout('trader', weaponConfig);
 *
 * @see README.md Architecture Patterns table
 * @see lib/combat/game.js for ship usage in combat
 */
```

### Time Estimate: 45 minutes

### Verification
```bash
npm test                           # All 308 tests pass
node -e "require('./lib/factories')" # Module loads
```

---

## Stage 2: Strategy Pattern - AI Decision Engine

### Target Files
- `lib/combat/ai.js` (~340 LOC) - Multiple decision algorithms inline
- `lib/socket-handlers/space.handlers.js` - AI turn execution (~100 LOC)

### Implementation
Extract AI decision-making into interchangeable strategy classes:

```
lib/combat/ai/
  strategies/
    AggressiveStrategy.js    (~60 LOC) - Maximize damage output
    DefensiveStrategy.js     (~60 LOC) - Prioritize survival
    BalancedStrategy.js      (~70 LOC) - Situational adaptation
    CautiousStrategy.js      (~50 LOC) - Conservative play
  AIContext.js               (~80 LOC) - Strategy selector/executor
  index.js                   (~30 LOC) - Exports
```

### New Files: ~350 LOC
### Modified Files: ~440 LOC refactored (ai.js becomes thin orchestrator)
### Scaffolding Tests: `test/scaffolding/ai-strategy.scaffold.test.js` (~200 LOC)

### Risk Assessment
| Factor | Level | Notes |
|--------|-------|-------|
| Complexity | MEDIUM | Multiple decision paths to preserve |
| Breaking Changes | LOW | Equivalent quality acceptable (not pixel-perfect) |
| Test Coverage | HIGH | Existing AI tests provide safety net |

### Benefits
- Add new AI personalities without touching core logic
- Easier difficulty scaling
- Clear separation of decision types
- Foundation for player-selectable AI difficulty

### Time Estimate: 1.5 hours

### Verification
```bash
npm test                           # All tests pass
# Manual: Quick Solo mode combat (AI behaves competently)
```

---

## Stage 3: Strategy Pattern - Weapon Mechanics

### Target Files
- `lib/combat/weapons.js` (~280 LOC) - Weapon resolution logic
- `lib/socket-handlers/space.handlers.js` - Attack handling (~150 LOC)

### Implementation
Extract weapon attack resolution into strategy classes:

```
lib/combat/weapons/
  strategies/
    LaserStrategy.js         (~70 LOC) - Direct energy attacks
    MissileStrategy.js       (~90 LOC) - Guided munitions + tracking
    SandcasterStrategy.js    (~50 LOC) - Defensive countermeasures
    PointDefenseStrategy.js  (~60 LOC) - Anti-missile systems
  WeaponContext.js           (~80 LOC) - Attack resolution orchestrator
  DamageCalculator.js        (~60 LOC) - Shared damage computation
  index.js                   (~25 LOC) - Exports
```

### New Files: ~435 LOC
### Modified Files: ~430 LOC refactored
### Scaffolding Tests: `test/scaffolding/weapon-strategy.scaffold.test.js` (~180 LOC)

### Risk Assessment
| Factor | Level | Notes |
|--------|-------|-------|
| Complexity | MEDIUM | Combat math must be preserved exactly |
| Breaking Changes | MEDIUM | Weapon balance is critical |
| Test Coverage | HIGH | Extensive weapon tests exist |

### Benefits
- Add new weapon types without modifying existing code
- Clear damage calculation flow
- Easier to tune individual weapon performance
- Foundation for custom weapon configurations

### Time Estimate: 1.5 hours

### Verification
```bash
npm test                           # All tests pass
# Manual: Weapon damage matches pre-refactor values
```

---

## Stage 4: Command Pattern - Combat Actions

### Target Files
- `lib/socket-handlers/space.handlers.js` (~750 LOC) - Action handlers

### Implementation
Encapsulate each combat action as a Command object (per existing TODO):

```
lib/combat/commands/
  BaseCommand.js             (~80 LOC) - Abstract validate/execute/emit
  FireCommand.js             (~90 LOC) - Laser/beam weapon fire
  MissileCommand.js          (~100 LOC) - Missile launch + tracking
  PointDefenseCommand.js     (~70 LOC) - Intercept missiles
  SandcasterCommand.js       (~60 LOC) - Deploy countermeasures
  EndTurnCommand.js          (~50 LOC) - Turn completion
  CommandInvoker.js          (~70 LOC) - Command execution + history
  index.js                   (~30 LOC) - Exports
```

### New Files: ~550 LOC
### Modified Files: ~750 LOC refactored to thin dispatch layer
### Scaffolding Tests: `test/scaffolding/command.scaffold.test.js` (~250 LOC)

### Risk Assessment
| Factor | Level | Notes |
|--------|-------|-------|
| Complexity | HIGH | All combat actions must work identically |
| Breaking Changes | HIGH | Core gameplay loop |
| Test Coverage | HIGH | Most critical stage - extensive testing required |

### Benefits
- **Undo/redo capability (FULL IMPLEMENTATION)** - wired to UI
- Action logging and replay
- Consistent validation across all actions
- Easier to add new combat actions
- Clear separation of concerns

### Time Estimate: 2.5 hours (includes full undo/redo UI wiring)

### Verification
```bash
npm test                           # All tests pass
# Manual: Full space combat playthrough
# Manual: Solo mode combat works correctly
# Manual: Test undo/redo in combat
```

---

## Stage 5: Observer Pattern - Event System + State Pattern - Combat Phases

**NOTE**: EventBus is INTERNAL ONLY - socket.emit calls remain unchanged.
EventBus handles internal decoupling/logging; socket.io handles client communication.

### Target Files
- `lib/socket-handlers/space.handlers.js` - Event emission (~200 LOC)
- `lib/combat/resolver.js` (~250 LOC) - Combat flow control
- `lib/state/combat.state.js` (~100 LOC) - Combat state management

### Implementation

#### Observer Pattern - Combat Event Bus (Internal Only)
```
lib/events/
  CombatEventBus.js          (~100 LOC) - Pub/sub for combat events
  events.js                  (~40 LOC) - Event type constants
  index.js                   (~15 LOC) - Exports
```

#### State Pattern - Combat Phase Machine
```
lib/combat/states/
  CombatPhase.js             (~50 LOC) - Abstract phase base
  InitiativePhase.js         (~60 LOC) - Roll initiative, determine order
  ActionPhase.js             (~80 LOC) - Player actions
  ResolutionPhase.js         (~70 LOC) - Damage, effects, cleanup
  EndPhase.js                (~50 LOC) - Victory check, round advance
  CombatStateMachine.js      (~90 LOC) - Phase transitions
  index.js                   (~25 LOC) - Exports
```

### New Files: ~580 LOC
### Modified Files: ~550 LOC refactored
### Scaffolding Tests: `test/scaffolding/event-state.scaffold.test.js` (~220 LOC)

### Risk Assessment
| Factor | Level | Notes |
|--------|-------|-------|
| Complexity | HIGH | Combat flow must remain identical |
| Breaking Changes | HIGH | Core game loop restructuring |
| Test Coverage | HIGH | Final stage - full regression required |

### Benefits
- Decouple combat events from socket emission
- Clear combat phase transitions
- Easier to add new phases (e.g., boarding actions)
- Foundation for combat replays
- Better debugging and logging

### Time Estimate: 2 hours

### Verification
```bash
npm test                           # All tests pass
# Manual: Full combat flow testing
# Manual: Edge cases (disconnect, timeout, forfeit)
```

---

## Scaffolding Test Cleanup

After all stages complete and verified:

```bash
rm -rf test/scaffolding/
git add -A
git commit -m "chore: Remove scaffolding tests after design pattern refactor"
```

---

## Summary

| Stage | Pattern | New LOC | Modified LOC | Tests | Time |
|-------|---------|---------|--------------|-------|------|
| 1 | Factory | 260 | 380 | 150 | 45m |
| 2 | Strategy (AI) | 350 | 440 | 200 | 1.5h |
| 3 | Strategy (Weapons) | 435 | 430 | 180 | 1.5h |
| 4 | Command + Undo/Redo | 550 | 750 | 250 | 2.5h |
| 5 | Observer + State | 580 | 550 | 220 | 2h |
| **Total** | **5 patterns** | **2,175** | **2,550** | **1,000** | **8.25h** |

### Overall Risk/Benefit Analysis

**Risks:**
- HIGH: Weapon/damage math must remain identical
- MEDIUM: Increased file count (~25 new files)
- LOW: AI behavior (equivalent quality acceptable)
- LOW: Learning curve for contributors

**Benefits:**
- Extensibility: Add features without modifying existing code
- Testability: Each pattern is independently testable
- Maintainability: Clear responsibilities per file
- Undo/Redo: Full implementation in Stage 4
- Future Features: Replays, new AI personalities, custom weapons

### Recommended Execution Order
1. Stage 1 (Factory) - Foundation, lowest risk
2. Stage 2 (AI Strategy) - Well-tested area
3. Stage 3 (Weapon Strategy) - Similar to Stage 2
4. Stage 4 (Command) - Highest impact, requires confidence from earlier stages
5. Stage 5 (Observer + State) - Final polish, event architecture

### Git Tags
- `design-patterns-stage-1-factory`
- `design-patterns-stage-2-ai-strategy`
- `design-patterns-stage-3-weapon-strategy`
- `design-patterns-stage-4-command`
- `design-patterns-stage-5-observer-state`
- `design-patterns-complete`

---

## Execution Command

```
/autorun .claude/DESIGN-PATTERN-REFACTOR.md
```

---

## Future Work (Post-Refactor)

### TODO: Full EventBus Socket Replacement

**⚠️ HIGH RISK / LOW IMPACT - Do not attempt during main refactor**

Replace all socket.emit calls with EventBus pub/sub:
```javascript
// Current (after Stage 5):
combatEventBus.emit('attack:resolved', result);  // Internal
socket.emit('space:attackResult', result);       // Client

// Future full replacement:
combatEventBus.emit('attack:resolved', result, { socket });
// SocketEmitter subscriber handles all socket.emit calls
```

**Risks:**
- All client communication goes through one system
- If EventBus breaks, ALL client communication breaks
- Harder to debug timing issues (which subscriber fired when?)
- Context passing (socket reference) needs careful design

**Mitigations Required:**
- Add `--timing-debug` flag to log all event timestamps
- Keep socket reference in event context
- Add try/catch around all subscribers
- Create `socketEmitter` subscriber that's always first
- Extensive timing tests before deployment

**Recommendation**: Only attempt after design patterns are stable for 2+ weeks
