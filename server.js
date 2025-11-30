// Traveller Combat VTT - Stage 11 Complete
// Purpose: Missiles, Sandcasters & UI Improvements
// Status: Stage 11 Complete - Missiles, Sandcasters, Turn Tracker, Feedback
//
// TODO: Refactor to MVC architecture pattern (HIGH PRIORITY)
// This file has grown to ~2700 LOC and should be split into:
// - controllers/ - Route and socket event handlers
// - models/ - Data access and business logic
// - services/ - Reusable business logic (combat resolution, etc.)
// - routes/ - Express routes (REST API endpoints)
// - socket-handlers/ - Socket.io event handlers by namespace
//
// Consider using one of these Node.js MVC frameworks:
// - NestJS (https://nestjs.com/) - Full-featured, TypeScript-first, inspired by Angular
// - Express + custom structure - Most flexible, widely used pattern
// - Sails.js (https://sailsjs.com/) - Convention over configuration, like Rails
// - AdonisJS (https://adonisjs.com/) - Laravel-inspired, batteries included
// - LoopBack (https://loopback.io/) - API-focused, strong ORM
//
// Recommendation: Start with Express + custom structure for simplicity:
//   lib/controllers/combat.controller.js
//   lib/controllers/operations.controller.js
//   lib/socket-handlers/combat.handlers.js
//   lib/socket-handlers/operations.handlers.js
// Then evaluate NestJS if more structure is needed.

const express = require('express');
const config = require('./config');
const { server: log, client: clientLog, socket: socketLog, game: gameLog, combat: combatLog } = require('./lib/logger');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const { resolveAttack, formatAttackResult, getAttackBreakdown, SHIPS, CREW, applyCrew, engineerRepair, hexDistance, rangeFromDistance, validateMove, GRID_SIZE } = require('./lib/combat');

// Ship selection mapping (for backwards compatibility during transition)
const SHIP_ALIASES = {
  'free_trader': 'free_trader'  // Legacy alias
};
const { DiceRoller } = require('./lib/dice');

// STAGE 11: Missile and Sandcaster mechanics
const { MissileTracker } = require('./lib/weapons/missiles');
const { useSandcaster, canUseSandcaster, interceptMissile } = require('./lib/weapons/sandcasters');

// SESSION 6: Test API for Puppeteer/Puppetry automation
const { registerTestAPI } = require('./lib/test-api');

// OPERATIONS: Starship Operations VTT (multi-role crew management)
const operations = require('./lib/operations');

// Serve static files from public directory
app.use(express.static('public'));
// Serve lib directory for client-side modules (Stage 12.4)
app.use('/lib', express.static('lib'));
// Serve data directory for ship templates (Stage 12)
app.use('/data', express.static('data'));
app.use(express.json());

// Track connections and ship assignments
let connectionCount = 0;
const connections = new Map();

// SESSION 7: Connection management and idle timeout (Stage 13.5)
const IDLE_TIMEOUT_MS = 30000; // 30 seconds
const CONNECTION_CHECK_INTERVAL = 10000; // Check every 10 seconds

// SESSION 7: Rate limiting (Stage 13.5)
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second window
const RATE_LIMIT_MAX_ACTIONS = 2; // 2 actions per second
const actionTimestamps = new Map(); // Track action timestamps per socket

// Rate limiter
function checkRateLimit(socketId) {
  const now = Date.now();
  const timestamps = actionTimestamps.get(socketId) || [];

  // Remove timestamps outside the window
  const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  // Check if rate limit exceeded
  if (recentTimestamps.length >= RATE_LIMIT_MAX_ACTIONS) {
    performanceMetrics.actions.rateLimited++; // SESSION 7: Track rate-limited actions
    return false; // Rate limit exceeded
  }

  // Add current timestamp
  recentTimestamps.push(now);
  actionTimestamps.set(socketId, recentTimestamps);
  performanceMetrics.actions.total++; // SESSION 7: Track total actions

  return true; // Action allowed
}

// Track connection activity
function updateConnectionActivity(socketId) {
  const conn = connections.get(socketId);
  if (conn) {
    conn.lastActivity = Date.now();
  }
}

// Periodic check for idle connections
setInterval(() => {
  const now = Date.now();
  let disconnectedCount = 0;

  for (const [socketId, conn] of connections.entries()) {
    const idleTime = now - conn.lastActivity;

    if (idleTime > IDLE_TIMEOUT_MS) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.connected) {
        socketLog.warn(`⏱️  Player ${conn.id} idle for ${Math.round(idleTime / 1000)}s, disconnecting`);
        socket.disconnect(true);
        disconnectedCount++;
      }
    }
  }

  if (disconnectedCount > 0) {
    socketLog.info(`🧹 Cleaned up ${disconnectedCount} idle connections`);
  }
}, CONNECTION_CHECK_INTERVAL);

// Stage 8.8: Track active space combat sessions
const activeCombats = new Map();

// SESSION 7: Combat state optimization (Stage 13.5)
const COMBAT_INACTIVE_TIMEOUT_MS = 300000; // 5 minutes
const COMBAT_HISTORY_LIMIT = 10; // Keep last 10 rounds of history
const COMBAT_CHECK_INTERVAL = 60000; // Check every minute

// Prune inactive combats
setInterval(() => {
  const now = Date.now();
  let prunedCount = 0;

  for (const [combatId, combat] of activeCombats.entries()) {
    const inactiveTime = now - (combat.lastActivity || combat.startTime || now);

    if (inactiveTime > COMBAT_INACTIVE_TIMEOUT_MS) {
      activeCombats.delete(combatId);
      prunedCount++;
      combatLog.info(`🧹 Pruned inactive combat: ${combatId} (idle for ${Math.round(inactiveTime / 1000 / 60)}min)`);
    }
  }

  if (prunedCount > 0) {
    combatLog.info(`🧹 Cleaned up ${prunedCount} inactive combats. ${activeCombats.size} active combats remaining.`);
  }
}, COMBAT_CHECK_INTERVAL);

// Update combat activity timestamp
function updateCombatActivity(combatId) {
  const combat = activeCombats.get(combatId);
  if (combat) {
    combat.lastActivity = Date.now();
  }
}

// Trim combat history to last N rounds
function trimCombatHistory(combat) {
  if (combat.history && combat.history.length > COMBAT_HISTORY_LIMIT) {
    combat.history = combat.history.slice(-COMBAT_HISTORY_LIMIT);
  }
}

// SESSION 7: Performance profiling (Stage 13.5)
const performanceMetrics = {
  connections: { current: 0, peak: 0, total: 0 },
  combats: { current: 0, peak: 0, total: 0 },
  actions: { total: 0, rateLimited: 0 },
  memory: { current: 0, peak: 0 },
  uptime: Date.now()
};

// Update performance metrics
function updateMetrics() {
  const mem = process.memoryUsage();
  performanceMetrics.memory.current = Math.round(mem.heapUsed / 1024 / 1024); // MB
  performanceMetrics.memory.peak = Math.max(performanceMetrics.memory.peak, performanceMetrics.memory.current);

  performanceMetrics.connections.current = connections.size;
  performanceMetrics.connections.peak = Math.max(performanceMetrics.connections.peak, connections.size);

  performanceMetrics.combats.current = activeCombats.size;
  performanceMetrics.combats.peak = Math.max(performanceMetrics.combats.peak, activeCombats.size);
}

// Log performance metrics periodically
setInterval(() => {
  updateMetrics();

  log.info('📊 Performance Metrics:', {
    connections: `${performanceMetrics.connections.current} (peak: ${performanceMetrics.connections.peak})`,
    combats: `${performanceMetrics.combats.current} (peak: ${performanceMetrics.combats.peak})`,
    actions: `${performanceMetrics.actions.total} (rate-limited: ${performanceMetrics.actions.rateLimited})`,
    memory: `${performanceMetrics.memory.current}MB (peak: ${performanceMetrics.memory.peak}MB)`,
    uptime: `${Math.round((Date.now() - performanceMetrics.uptime) / 1000 / 60)}min`
  });
}, 60000); // Log every minute

// Stage 9: Create dummy opponent for single-player testing
function createDummyPlayer(player1) {
  // Choose opposite ship from player 1 (Scout vs Free Trader)
  const oppositeShip = player1.spaceSelection.ship === 'scout' ? 'free_trader' : 'scout';

  return {
    id: 'dummy_ai',
    spaceSelection: {
      ship: oppositeShip,
      range: player1.spaceSelection.range,
      ready: true
    }
  };
}

// Helper function to check if a player is the AI opponent
function isDummyAI(playerId) {
  return playerId === 'dummy_ai';
}

// Helper function to safely emit to a player (skips dummy AI)
function emitToPlayer(io, playerId, eventName, data) {
  if (isDummyAI(playerId)) {
    // Don't emit to dummy AI - it has no socket
    return false;
  }

  const socket = io.sockets.sockets.get(playerId);
  if (socket && socket.connected) {
    socket.emit(eventName, data);
    return true;
  }
  return false;
}

// ======== SOLO MODE AI OPPONENT SYSTEM ========
//
// FUTURE ENHANCEMENT: Advanced AI Opponent System (Stage 15+)
// TODO: Implement GM-configurable AI system with:
// - Multiple difficulty levels (Easy, Normal, Hard, Expert)
// - Different AI personality types (Aggressive, Defensive, Tactical, Reckless)
// - Proper tactical decision making (range management, ammo conservation)
// - Learning/adaptive behavior based on player patterns
// - GM override controls to manually control AI during combat
// - Configurable via game settings UI
//
// Current Implementation: Simple random AI for testing purposes
// - Primarily attacks (70% of time)
// - Uses defensive actions occasionally (20% dodge, 10% other)
// - Prioritizes point defense against missiles
// - Heavy use of sandcasters when damaged
// - Range-based weapon selection (lasers close, missiles long)
// - Random element ensures all features get exercised for testing
//

// Simple AI decision-making for dummy opponent
// Returns: { action: 'fire'|'dodge'|'sandcaster'|'endTurn', params: {...} }
function makeAIDecision(combat, aiPlayer) {
  const humanPlayer = aiPlayer === combat.player1 ? combat.player2 : combat.player1;
  const aiData = aiPlayer === combat.player1 ? combat.player1 : combat.player2;
  const currentRange = combat.range;

  // Check for incoming missiles
  const incomingMissiles = combat.missileTracker ?
    combat.missileTracker.getMissilesTargeting(aiData.id) : [];

  // Random number for decision weights
  const roll = Math.random() * 100;

  // HIGH PRIORITY: Point defense if missiles incoming (50% chance)
  if (incomingMissiles.length > 0 && roll < 50) {
    combatLog.info(`[AI] Incoming missiles detected, attempting point defense`);
    return {
      action: 'pointDefense',
      params: {
        targetMissileId: incomingMissiles[0].id
      }
    };
  }

  // MEDIUM PRIORITY: Use sandcaster if available and recently hit (30% chance if damaged)
  const healthPercent = (aiData.hull / aiData.maxHull) * 100;
  if (aiData.ammo && aiData.ammo.sandcaster > 0 && healthPercent < 90 && roll < 30) {
    combatLog.info(`[AI] Using sandcaster (hull at ${healthPercent.toFixed(0)}%)`);
    return {
      action: 'sandcaster',
      params: {}
    };
  }

  // MEDIUM PRIORITY: Dodge maneuver (10% chance)
  if (roll < 40) {  // 40-30 = 10% since sandcaster used 30%
    combatLog.info(`[AI] Performing dodge maneuver`);
    return {
      action: 'dodge',
      params: {}
    };
  }

  // DEFAULT: Attack with appropriate weapon based on range
  // Long+ range: Use missiles if available, otherwise laser
  // Close-Medium: Use laser
  const rangeBands = ['Adjacent', 'Close', 'Short', 'Medium', 'Long', 'Very Long', 'Distant'];
  const rangeIndex = rangeBands.indexOf(currentRange);
  const isLongRange = rangeIndex >= 4;  // Long or further

  // Find available weapons from SHIPS data structure
  const shipData = SHIPS[aiData.ship];
  if (!shipData || !shipData.weapons) {
    combatLog.info(`[AI] No ship data or weapons found for ${aiData.ship}`);
    combatLog.info(`[AI] No valid actions available, ending turn`);
    return {
      action: 'endTurn',
      params: {}
    };
  }

  let missileWeapon = null;
  let laserWeapon = null;

  // Check each weapon in the ship's weapons array
  for (let w = 0; w < shipData.weapons.length; w++) {
    const weapon = shipData.weapons[w];
    if (weapon.id === 'missiles' && aiData.ammo && aiData.ammo.missiles > 0) {
      missileWeapon = { turret: 0, weapon: w };  // Use turret 0 as default
      combatLog.info(`[AI] Found missile weapon at index ${w}`);
    } else if (weapon.id && weapon.id.includes('Laser')) {
      laserWeapon = { turret: 0, weapon: w };
      combatLog.info(`[AI] Found laser weapon at index ${w}: ${weapon.name}`);
    }
  }

  // Choose weapon based on range
  let chosenWeapon = null;
  if (isLongRange && missileWeapon && aiData.ammo.missiles > 0) {
    chosenWeapon = missileWeapon;
    combatLog.info(`[AI] Attacking at long range with missile`);
  } else if (laserWeapon) {
    chosenWeapon = laserWeapon;
    combatLog.info(`[AI] Attacking with laser`);
  }

  if (chosenWeapon) {
    return {
      action: 'fire',
      params: {
        turret: chosenWeapon.turret,
        weapon: chosenWeapon.weapon,
        target: 'opponent'
      }
    };
  }

  // Fallback: End turn if no valid action
  combatLog.info(`[AI] No valid actions available, ending turn`);
  return {
    action: 'endTurn',
    params: {}
  };
}

// Execute AI turn automatically
function executeAITurn(combat, io) {
  if (!isDummyAI(combat.activePlayer)) {
    combatLog.error(`[AI] executeAITurn called but active player is not AI: ${combat.activePlayer}`);
    return;
  }

  const aiPlayer = combat.activePlayer === combat.player1.id ? combat.player1 : combat.player2;
  const humanPlayer = combat.activePlayer === combat.player1.id ? combat.player2 : combat.player1;

  combatLog.info(`[AI] Executing turn for ${aiPlayer.ship}`);

  // Make AI decision
  const decision = makeAIDecision(combat, aiPlayer);

  combatLog.info(`[AI] Decision: ${decision.action}`, decision.params);

  // Execute the chosen action
  switch (decision.action) {
    case 'fire': {
      combatLog.info(`[AI] Executing weapon fire (turret ${decision.params.turret}, weapon ${decision.params.weapon})`);

      // Get weapon data
      const shipData = SHIPS[aiPlayer.ship];
      const weaponIndex = decision.params.weapon;
      const weaponObj = shipData && shipData.weapons ? shipData.weapons[weaponIndex] : null;

      if (!weaponObj) {
        combatLog.error(`[AI] Invalid weapon index: ${weaponIndex}`);
        break;
      }

      // Resolve attack using same logic as player
      const attackResult = resolveAttack(
        aiPlayer,
        humanPlayer,
        {
          range: combat.range.toLowerCase(),
          weapon: weaponObj
        }
      );

      combatLog.info(`[AI] Attack result:`, attackResult);

      if (attackResult.hit) {
        // Apply damage
        humanPlayer.hull -= attackResult.damage;
        if (humanPlayer.hull < 0) humanPlayer.hull = 0;

        combatLog.info(`[AI] HIT! ${attackResult.damage} damage. Target hull: ${humanPlayer.hull}/${humanPlayer.maxHull}`);

        // Emit to human player (if not AI)
        if (!isDummyAI(humanPlayer.id)) {
          const humanSocket = io.sockets.sockets.get(humanPlayer.id);
          if (humanSocket && humanSocket.connected) {
            humanSocket.emit('space:attacked', {
              hit: true,
              damage: attackResult.damage,
              hull: humanPlayer.hull,
              maxHull: humanPlayer.maxHull
            });
          }
        }

        // Check for critical hits
        const hullPercent = (humanPlayer.hull / humanPlayer.maxHull) * 100;
        if (hullPercent <= 50 && attackResult.damage > 0 && Math.random() < 0.3) {
          const criticalSystems = ['Turret', 'Sensors', 'Maneuver Drive', 'Jump Drive', 'Power Plant'];
          const criticalSystem = criticalSystems[Math.floor(Math.random() * criticalSystems.length)];

          humanPlayer.criticals.push(criticalSystem);
          combatLog.info(`[AI] Critical hit on ${criticalSystem}!`);

          if (!isDummyAI(humanPlayer.id)) {
            const humanSocket = io.sockets.sockets.get(humanPlayer.id);
            if (humanSocket && humanSocket.connected) {
              humanSocket.emit('space:critical', {
                target: humanPlayer.id === combat.player1.id ? 'player1' : 'player2',
                system: criticalSystem,
                damage: attackResult.damage
              });
            }
          }
        }

        // Check for combat end
        if (humanPlayer.hull <= 0) {
          combatLog.info(`[AI] Target destroyed! AI wins combat.`);

          const combatId = [...activeCombats.entries()].find(([_, c]) => c === combat)?.[0];
          if (combatId) {
            activeCombats.delete(combatId);
          }

          if (!isDummyAI(humanPlayer.id)) {
            const humanSocket = io.sockets.sockets.get(humanPlayer.id);
            if (humanSocket && humanSocket.connected) {
              humanSocket.emit('space:combatEnd', {
                winner: aiPlayer.id === combat.player1.id ? 'player1' : 'player2',
                loser: humanPlayer.id === combat.player1.id ? 'player1' : 'player2',
                reason: 'ship_destroyed',
                finalHull: {
                  player1: combat.player1.hull,
                  player2: combat.player2.hull
                },
                rounds: combat.round
              });
            }
          }
          return; // Combat ended, don't continue turn processing
        }
      } else {
        combatLog.info(`[AI] MISS! Attack roll: ${attackResult.attackRoll}, Total: ${attackResult.total}`);

        if (!isDummyAI(humanPlayer.id)) {
          const humanSocket = io.sockets.sockets.get(humanPlayer.id);
          if (humanSocket && humanSocket.connected) {
            humanSocket.emit('space:attacked', {
              hit: false,
              damage: 0,
              hull: humanPlayer.hull,
              maxHull: humanPlayer.maxHull
            });
          }
        }
      }
      break;
    }

    case 'pointDefense':
      // Point defense not yet implemented
      combatLog.info(`[AI] Point defense not yet implemented (missile ${decision.params.targetMissileId})`);
      break;

    case 'sandcaster':
      // Sandcaster not yet implemented
      combatLog.info(`[AI] Sandcaster not yet implemented`);
      break;

    case 'dodge':
      // Dodge not yet implemented
      combatLog.info(`[AI] Dodge maneuver not yet implemented`);
      break;

    case 'endTurn':
      // Just end turn
      combatLog.info(`[AI] Ending turn with no action`);
      break;
  }

  // Mark AI turn as complete
  combat.turnComplete[combat.activePlayer] = true;

  // Check if both players completed turns (trigger next round or turn change)
  if (combat.turnComplete[combat.player1.id] && combat.turnComplete[combat.player2.id]) {
    // New round
    combat.round++;
    combat.turnComplete = { [combat.player1.id]: false, [combat.player2.id]: false };
    combat.activePlayer = (combat.round % 2 === 1) ? combat.player1.id : combat.player2.id;

    const newRoundData = {
      round: combat.round,
      player1Hull: combat.player1.hull,
      player2Hull: combat.player2.hull,
      activePlayer: combat.activePlayer
    };

    emitToPlayer(io, combat.player1.id, 'space:newRound', newRoundData);
    emitToPlayer(io, combat.player2.id, 'space:newRound', newRoundData);
    combatLog.info(`[AI] New round ${combat.round} started`);

    // If new round starts with AI, trigger AI turn again
    if (isDummyAI(combat.activePlayer)) {
      combatLog.info(`[AI] New round starts with AI turn, executing...`);
      setTimeout(() => {
        executeAITurn(combat, io);
      }, 1500);
    }
  } else {
    // Switch to other player
    combat.activePlayer = combat.activePlayer === combat.player1.id ? combat.player2.id : combat.player1.id;

    const turnChangeData = {
      activePlayer: combat.activePlayer,
      round: combat.round
    };

    emitToPlayer(io, combat.player1.id, 'space:turnChange', turnChangeData);
    emitToPlayer(io, combat.player2.id, 'space:turnChange', turnChangeData);
    combatLog.info(`[AI] Turn switched to ${combat.activePlayer === combat.player1.id ? 'Player 1' : 'Player 2'}`);
  }
}

// Stage 8.8: Generate default crew for a ship
function generateDefaultCrew(shipType) {
  if (shipType === 'scout') {
    return [
      { id: 'pilot_1', name: 'Miller', role: 'pilot', skill: 2, health: 10, maxHealth: 10 },
      { id: 'gunner_1', name: 'Chen', role: 'gunner', skill: 1, health: 10, maxHealth: 10 },
      { id: 'engineer_1', name: 'Rodriguez', role: 'engineer', skill: 1, health: 10, maxHealth: 10 }
    ];
  } else if (shipType === 'free_trader') {
    return [
      { id: 'pilot_1', name: 'Johnson', role: 'pilot', skill: 1, health: 10, maxHealth: 10 },
      { id: 'gunner_1', name: 'Smith', role: 'gunner', skill: 1, health: 10, maxHealth: 10 },
      { id: 'gunner_2', name: 'Davis', role: 'gunner', skill: 1, health: 10, maxHealth: 10 },
      { id: 'engineer_1', name: 'Wilson', role: 'engineer', skill: 1, health: 10, maxHealth: 10 }
    ];
  }
  return [];
}

// Stage 5: Initialize ammo for each weapon
function initializeAmmo(ship) {
  const ammo = {};
  ship.weapons.forEach(weapon => {
    if (weapon.ammo !== null) {
      ammo[weapon.id] = weapon.ammo;
    }
  });
  return ammo;
}

// Stage 3: Track persistent ship state (hull, etc.)
// Stage 5: Added ammo tracking
// Stage 6: Added crew assignments
// Stage 7: Added position tracking
const shipState = {
  scout: {
    hull: SHIPS.scout.hull,
    maxHull: SHIPS.scout.maxHull,
    armor: SHIPS.scout.armor,
    pilotSkill: SHIPS.scout.pilotSkill,
    ammo: initializeAmmo(SHIPS.scout),  // Stage 5: Track ammo per weapon
    crew: {  // Stage 6: Track crew assignments
      pilot: {...CREW.scout[0]},  // Default: assign all crew
      gunner: {...CREW.scout[1]},
      engineer: {...CREW.scout[2]}
    },
    position: { q: 2, r: 2 },  // Stage 7: Starting position on grid
    movement: SHIPS.scout.movement
  },
  free_trader: {
    hull: SHIPS.free_trader.hull,
    maxHull: SHIPS.free_trader.maxHull,
    armor: SHIPS.free_trader.armor,
    pilotSkill: SHIPS.free_trader.pilotSkill,
    ammo: initializeAmmo(SHIPS.free_trader),  // Stage 5: Track ammo per weapon
    crew: {  // Stage 6: Track crew assignments
      pilot: {...CREW.free_trader[0]},  // Default: assign all crew
      gunner: {...CREW.free_trader[1]},
      engineer: {...CREW.free_trader[2]}
    },
    position: { q: 7, r: 7 },  // Stage 7: Starting position on grid
    movement: SHIPS.free_trader.movement
  }
};

// Stage 4: Track game state (rounds, turns, initiative)
const gameState = {
  currentRound: 0,
  currentTurn: null, // 'scout' or 'free_trader'
  initiative: {
    scout: null,
    free_trader: null
  },
  roundHistory: []
};

// Helper: Reset ship states to full hull
// Stage 5: Also reset ammo
// Stage 7: Also reset positions
function resetShipStates() {
  shipState.scout.hull = SHIPS.scout.maxHull;
  shipState.free_trader.hull = SHIPS.free_trader.maxHull;
  shipState.scout.ammo = initializeAmmo(SHIPS.scout);
  shipState.free_trader.ammo = initializeAmmo(SHIPS.free_trader);
  shipState.scout.position = { q: 2, r: 2 };  // Reset to starting position
  shipState.free_trader.position = { q: 7, r: 7 };  // Reset to starting position
  gameLog.info(' Ship states reset (hull + ammo + positions)');
}

// Helper: Get available ship for new player
function getAvailableShip() {
  const assignedShips = Array.from(connections.values())
    .map(conn => conn.ship)
    .filter(ship => ship !== null);

  if (!assignedShips.includes('scout')) return 'scout';
  if (!assignedShips.includes('free_trader')) return 'free_trader';
  return null; // No ships available (spectator mode)
}

// Helper: Get all current assignments
function getShipAssignments() {
  const assignments = { scout: null, free_trader: null };
  connections.forEach((conn, socketId) => {
    if (conn.ship === 'scout') assignments.scout = conn.id;
    if (conn.ship === 'free_trader') assignments.free_trader = conn.id;
  });
  return assignments;
}

// Stage 4: Helper - Roll initiative for both ships
function rollInitiative() {
  const dice = new DiceRoller();

  // Roll 2d6 + pilot skill for each ship
  const scoutRoll = dice.roll2d6();
  const scoutInitiative = scoutRoll.total + shipState.scout.pilotSkill;

  const free_traderRoll = dice.roll2d6();
  const free_traderInitiative = free_traderRoll.total + shipState.free_trader.pilotSkill;

  gameState.initiative.scout = {
    roll: scoutRoll,
    total: scoutInitiative
  };

  gameState.initiative.free_trader = {
    roll: free_traderRoll,
    total: free_traderInitiative
  };

  gameLog.info(`Scout: ${scoutRoll.total} + ${shipState.scout.pilotSkill} = ${scoutInitiative}`);
  gameLog.info(`Free Trader: ${free_traderRoll.total} + ${shipState.free_trader.pilotSkill} = ${free_traderInitiative}`);

  // Determine who goes first (handle ties by re-rolling)
  if (scoutInitiative > free_traderInitiative) {
    gameState.currentTurn = 'scout';
    gameLog.info('Scout goes first');
  } else if (free_traderInitiative > scoutInitiative) {
    gameState.currentTurn = 'free_trader';
    gameLog.info('Free Trader goes first');
  } else {
    // Tie - Scout wins ties (simple tiebreaker)
    gameState.currentTurn = 'scout';
    gameLog.info('Tie! Scout wins tiebreaker');
  }

  return {
    scout: gameState.initiative.scout,
    free_trader: gameState.initiative.free_trader,
    firstTurn: gameState.currentTurn
  };
}

// Stage 4: Helper - Start a new round
function startNewRound() {
  gameState.currentRound++;
  gameLog.info(` Starting Round ${gameState.currentRound}`);

  // Roll initiative at the start of each round
  const initiativeResult = rollInitiative();

  // Add to round history
  gameState.roundHistory.push({
    round: gameState.currentRound,
    initiative: initiativeResult,
    actions: []
  });

  return {
    round: gameState.currentRound,
    initiative: initiativeResult,
    currentTurn: gameState.currentTurn
  };
}

// Stage 4: Helper - End current turn and advance to next player
function endTurn() {
  const previousTurn = gameState.currentTurn;

  // Switch to other player
  if (gameState.currentTurn === 'scout') {
    gameState.currentTurn = 'free_trader';
  } else if (gameState.currentTurn === 'free_trader') {
    // Free Trader's turn ends, round ends, new round starts
    return startNewRound();
  }

  gameLog.info(` ${previousTurn} turn ended, ${gameState.currentTurn} turn begins`);

  return {
    round: gameState.currentRound,
    currentTurn: gameState.currentTurn,
    newRound: false
  };
}

// Stage 4: Helper - Reset game state (rounds and turns)
function resetGameState() {
  gameState.currentRound = 0;
  gameState.currentTurn = null;
  gameState.initiative.scout = null;
  gameState.initiative.free_trader = null;
  gameState.roundHistory = [];
  gameLog.info(' Game state reset');
}

// Socket.io connection handling
io.on('connection', (socket) => {
  log.debug(' ========================================');
  log.debug(' NEW CONNECTION RECEIVED!');
  log.debug(' Socket ID:', socket.id);
  log.debug(' ========================================');

  connectionCount++;
  const connectionId = connectionCount;
  const assignedShip = getAvailableShip();

  log.debug(' Connection ID:', connectionId);
  log.debug(' Assigned Ship:', assignedShip);

  connections.set(socket.id, {
    id: connectionId,
    ship: assignedShip,
    connected: Date.now(),
    lastActivity: Date.now() // SESSION 7: Track last activity for idle timeout
  });

  performanceMetrics.connections.total++; // SESSION 7: Track total connections

  socketLog.info(` Player ${connectionId} connected (socket: ${socket.id})`);
  socketLog.info(` Player ${connectionId} assigned: ${assignedShip || 'spectator'}`);
  socketLog.info(` ${connections.size} players connected`);

  // Send welcome with ship assignment
  log.debug(' Emitting "welcome" event...');
  socket.emit('welcome', {
    message: `You are Player ${connectionId}`,
    playerId: connectionId,
    assignedShip: assignedShip,
    role: assignedShip || 'spectator',
    totalPlayers: connections.size
  });
  log.debug(' "welcome" event emitted');

  // AUTO-ASSIGN: Initialize space selection with defaults
  socket.spaceSelection = {
    ship: assignedShip,
    range: 'Medium',  // Default range
    ready: false
  };
  log.debug(' socket.spaceSelection initialized:', socket.spaceSelection);

  // AUTO-ASSIGN: Send initial ship and range selection to client
  if (assignedShip) {
    log.debug(' Emitting "space:autoAssigned" event...');
    socket.emit('space:autoAssigned', {
      ship: assignedShip,
      range: 'Medium'
    });
    socketLog.info(` Player ${connectionId} auto-assigned ${assignedShip} at Medium range`);
  } else {
    log.debug(' No ship assigned (spectator mode)');
  }

  // Broadcast to others that a new player joined
  socket.broadcast.emit('playerJoined', {
    playerId: connectionId,
    ship: assignedShip,
    totalPlayers: connections.size,
    assignments: getShipAssignments()
  });

  // Send current game state to new player
  socket.emit('gameState', {
    assignments: getShipAssignments(),
    totalPlayers: connections.size,
    shipStates: shipState,
    currentRound: gameState.currentRound,
    currentTurn: gameState.currentTurn,
    initiative: gameState.initiative
  });

  // Broadcast updated ship states to all players
  io.emit('shipStateUpdate', {
    ships: shipState
  });

  // ======== CLIENT LOGGING HANDLER ========
  // Receive logs from client and log them on server
  socket.on('client:log', (data) => {
    const { level, message, meta, playerId } = data;
    const playerInfo = playerId ? `Player ${playerId}` : `Socket ${socket.id.substring(0, 8)}`;

    // Log using appropriate level
    switch (level) {
      case 'error':
        clientLog.error(`${playerInfo}: ${message}`, meta);
        break;
      case 'warn':
        clientLog.warn(`${playerInfo}: ${message}`, meta);
        break;
      case 'info':
        clientLog.info(`${playerInfo}: ${message}`, meta);
        break;
      case 'debug':
      default:
        clientLog.debug(`${playerInfo}: ${message}`, meta);
        break;
    }
  });

  // ======== PLAYER FEEDBACK HANDLER ========
  // Receive player feedback and log with special marker for easy parsing
  socket.on('player:feedback', (data) => {
    const { feedback, timestamp, context } = data;
    const playerInfo = `Socket ${socket.id.substring(0, 8)}`;

    // SECURITY: Validate and sanitize feedback
    if (!feedback || typeof feedback !== 'string') {
      socketLog.warn(` Invalid feedback from ${connectionId}: not a string`);
      return;
    }

    // Limit feedback length (prevent DoS via huge strings)
    const MAX_FEEDBACK_LENGTH = 2000;
    const sanitizedFeedback = feedback.substring(0, MAX_FEEDBACK_LENGTH).trim();

    if (sanitizedFeedback.length === 0) {
      socketLog.warn(` Empty feedback from ${connectionId}`);
      return;
    }

    // Strip dangerous characters that could break log parsing
    // Remove control characters, null bytes, and log injection attempts
    const safeFeedback = sanitizedFeedback
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\n/g, ' ')              // Convert newlines to spaces
      .replace(/\r/g, '')               // Remove carriage returns
      .replace(/\t/g, ' ')              // Convert tabs to spaces
      .replace(/\\/g, '\\\\')           // Escape backslashes
      .replace(/"/g, '\\"');            // Escape quotes

    // Validate context object
    const safeContext = {};
    if (context && typeof context === 'object') {
      // Only allow specific whitelisted properties
      if (context.ship && typeof context.ship === 'string') {
        safeContext.ship = context.ship.substring(0, 50);
      }
      if (context.round && typeof context.round === 'number') {
        safeContext.round = Math.floor(context.round);
      }
      if (context.hull && typeof context.hull === 'string') {
        safeContext.hull = context.hull.substring(0, 20);
      }
    }

    // Log with special marker [PLAYER_FEEDBACK] for easy grep/parsing
    log.info(`[PLAYER_FEEDBACK] ${playerInfo}: ${safeFeedback}`, {
      timestamp: timestamp || new Date().toISOString(),
      socketId: socket.id,
      context: safeContext,
      feedbackLength: safeFeedback.length
    });

    socketLog.info(` Player feedback received from ${connectionId} (${safeFeedback.length} chars)`);
  });

  // Handle "hello" messages (Stage 1)
  socket.on('hello', (data) => {
    const timestamp = Date.now();
    socketLog.info(` Tab ${connectionId} says hello`);
    
    io.emit('helloReceived', {
      fromTab: connectionId,
      message: data.message || 'Hello!',
      timestamp: timestamp,
      serverTime: timestamp
    });
  });
  
  // Handle combat action (Stage 4 - UPDATED with turn validation)
  socket.on('combat', (data) => {
    const conn = connections.get(socket.id);

    combatLog.info(` Player ${connectionId} (${conn.ship}) initiates combat`);
    combatLog.info(` Attacker: ${data.attacker}, Target: ${data.target}`);
    combatLog.info(` Range: ${data.range}, Dodge: ${data.dodge}`);

    // Stage 3: Validate player can only control their assigned ship
    if (conn.ship !== data.attacker) {
      combatLog.info(` REJECTED: Player ${connectionId} tried to attack with ${data.attacker} but controls ${conn.ship}`);
      socket.emit('combatError', {
        message: `You can only attack with your assigned ship (${conn.ship || 'none'})`,
        yourShip: conn.ship,
        attemptedShip: data.attacker
      });
      return;
    }

    // Stage 4: Validate it's the player's turn
    if (gameState.currentRound > 0 && conn.ship !== gameState.currentTurn) {
      combatLog.info(` REJECTED: Not ${conn.ship}'s turn (current: ${gameState.currentTurn})`);
      socket.emit('combatError', {
        message: `It's not your turn! Current turn: ${gameState.currentTurn || 'game not started'}`,
        currentTurn: gameState.currentTurn
      });
      return;
    }

    // Get base ships for stats
    const attackerBase = SHIPS[data.attacker];
    const targetBase = SHIPS[data.target];

    if (!attackerBase || !targetBase) {
      socket.emit('combatError', { message: 'Invalid ship' });
      return;
    }

    // Stage 5: Get selected weapon
    const weaponId = data.weapon || (attackerBase.weapons && attackerBase.weapons[0].id);
    const weapon = attackerBase.weapons.find(w => w.id === weaponId);

    if (!weapon) {
      socket.emit('combatError', { message: 'Invalid weapon selected' });
      return;
    }

    combatLog.info(` Weapon: ${weapon.name}`);

    // Stage 5: Validate ammo if weapon uses ammo
    if (weapon.ammo !== null) {
      const currentAmmo = shipState[data.attacker].ammo[weapon.id];
      if (currentAmmo <= 0) {
        combatLog.info(` REJECTED: Out of ammo for ${weapon.name}`);
        socket.emit('combatError', {
          message: `Out of ammo for ${weapon.name}!`
        });
        return;
      }
      combatLog.info(` ${weapon.name} ammo: ${currentAmmo}`);
    }

    // Stage 5: Validate range restriction
    if (weapon.rangeRestriction && !weapon.rangeRestriction.includes(data.range)) {
      combatLog.info(` REJECTED: ${weapon.name} out of range (${data.range})`);
      socket.emit('combatError', {
        message: `${weapon.name} out of range! Valid ranges: ${weapon.rangeRestriction.join(', ')}`
      });
      return;
    }

    // Use current ship state (with current hull values)
    let attackerShip = {
      ...attackerBase,
      hull: shipState[data.attacker].hull
    };
    const targetShip = {
      ...targetBase,
      hull: shipState[data.target].hull
    };

    // Stage 6: Apply crew to attacker ship
    if (shipState[data.attacker].crew) {
      attackerShip = applyCrew(attackerShip, shipState[data.attacker].crew);
    }

    // Check if target is already destroyed
    if (targetShip.hull <= 0) {
      socket.emit('combatError', {
        message: `${targetBase.name} is already destroyed!`
      });
      return;
    }

    // Stage 5: Resolve combat with weapon
    const result = resolveAttack(attackerShip, targetShip, {
      range: data.range,
      dodge: data.dodge,
      seed: data.seed,
      weapon: weapon
    });

    const breakdown = getAttackBreakdown(result);

    combatLog.info(` Result: ${result.hit ? 'HIT' : 'MISS'} with ${weapon.name}`);

    // Stage 5: Decrement ammo if weapon uses ammo (regardless of hit/miss)
    if (weapon.ammo !== null) {
      const oldAmmo = shipState[data.attacker].ammo[weapon.id];
      shipState[data.attacker].ammo[weapon.id]--;
      combatLog.info(` ${weapon.name}: ${oldAmmo} → ${shipState[data.attacker].ammo[weapon.id]}`);
    }

    if (result.hit) {
      combatLog.info(` Damage: ${result.damage} (${targetShip.hull} → ${result.newHull} hull)`);

      // Update persistent ship state
      const oldHull = shipState[data.target].hull;
      shipState[data.target].hull = result.newHull;

      combatLog.info(` ${targetBase.name} hull: ${oldHull} → ${shipState[data.target].hull}`);

      // Check for victory
      if (shipState[data.target].hull <= 0) {
        combatLog.info(` ${attackerBase.name} has destroyed ${targetBase.name}!`);
      }
    }

    // Broadcast result to all tabs
    io.emit('combatResult', {
      fromPlayer: connectionId,
      result: result,
      breakdown: breakdown,
      timestamp: Date.now()
    });

    // Broadcast updated ship states (hull + ammo)
    io.emit('shipStateUpdate', {
      ships: shipState
    });
  });

  // Stage 6: Handle engineer repair action
  socket.on('engineerRepair', (data) => {
    const conn = connections.get(socket.id);
    combatLog.info(` Player ${connectionId} (${conn.ship}) requests engineer repair`);

    // Validate player controls this ship
    if (conn.ship !== data.ship) {
      socket.emit('repairError', {
        message: `You can only repair your assigned ship (${conn.ship || 'none'})`
      });
      return;
    }

    // Validate it's the player's turn
    if (gameState.currentRound > 0 && conn.ship !== gameState.currentTurn) {
      socket.emit('repairError', {
        message: `It's not your turn! Current turn: ${gameState.currentTurn || 'game not started'}`
      });
      return;
    }

    // Check if engineer is alive
    const engineer = shipState[data.ship].crew.engineer;
    if (!engineer || engineer.health <= 0) {
      socket.emit('repairError', {
        message: 'Engineer is dead or not assigned!'
      });
      return;
    }

    // Perform repair
    const shipToRepair = {
      ...SHIPS[data.ship],
      hull: shipState[data.ship].hull,
      maxHull: shipState[data.ship].maxHull
    };

    const repairResult = engineerRepair(shipToRepair, engineer, { seed: data.seed });

    combatLog.info(` ${engineer.name} repairs ${repairResult.hullRepaired} HP (${shipToRepair.hull} → ${repairResult.newHull})`);

    // Update ship state
    shipState[data.ship].hull = repairResult.newHull;

    // Broadcast repair result to all players
    io.emit('repairResult', {
      ship: data.ship,
      engineer: engineer.name,
      hullRepaired: repairResult.hullRepaired,
      newHull: repairResult.newHull,
      fromPlayer: connectionId
    });

    // Broadcast updated ship states
    io.emit('shipStateUpdate', {
      ships: shipState
    });
  });

  // Stage 7: Handle ship movement
  socket.on('moveShip', (data) => {
    const conn = connections.get(socket.id);
    combatLog.info(` Player ${connectionId} (${conn.ship}) requests move to (${data.to.q}, ${data.to.r})`);

    // Validate player controls this ship
    if (conn.ship !== data.ship) {
      socket.emit('moveError', {
        message: `You can only move your assigned ship (${conn.ship || 'none'})`
      });
      return;
    }

    // Validate it's the player's turn
    if (gameState.currentRound > 0 && conn.ship !== gameState.currentTurn) {
      socket.emit('moveError', {
        message: `It's not your turn! Current turn: ${gameState.currentTurn || 'game not started'}`
      });
      return;
    }

    // Get current position and movement points
    const from = shipState[data.ship].position;
    const movementPoints = shipState[data.ship].movement;

    // Validate move
    const moveResult = validateMove(from, data.to, movementPoints);

    if (!moveResult.valid) {
      combatLog.info(` REJECTED: ${moveResult.error}`);
      socket.emit('moveError', {
        message: moveResult.error
      });
      return;
    }

    // Check if destination is occupied by another ship
    const otherShip = data.ship === 'scout' ? 'free_trader' : 'scout';
    const otherPos = shipState[otherShip].position;
    if (otherPos.q === data.to.q && otherPos.r === data.to.r) {
      socket.emit('moveError', {
        message: 'Destination hex is occupied!'
      });
      return;
    }

    // Execute move
    const oldPosition = { ...shipState[data.ship].position };
    shipState[data.ship].position = moveResult.newPosition;

    combatLog.info(` ${data.ship} moved from (${oldPosition.q},${oldPosition.r}) to (${moveResult.newPosition.q},${moveResult.newPosition.r})`);

    // Calculate new range between ships
    const scoutPos = shipState.scout.position;
    const free_traderPos = shipState.free_trader.position;
    const distance = hexDistance(scoutPos, free_traderPos);
    const range = rangeFromDistance(distance);

    combatLog.info(` Ships now at distance ${distance} (${range})`);

    // Broadcast move result to all players
    io.emit('moveResult', {
      ship: data.ship,
      from: oldPosition,
      to: moveResult.newPosition,
      distance: hexDistance(from, data.to),
      fromPlayer: connectionId,
      newRange: range
    });

    // Broadcast updated ship states
    io.emit('shipStateUpdate', {
      ships: shipState
    });
  });

  // Stage 4: Handle game reset request (UPDATED to reset game state)
  socket.on('resetGame', () => {
    gameLog.info(` Player ${connectionId} requested game reset`);
    resetShipStates();
    resetGameState(); // Stage 4: Also reset rounds/turns

    // Broadcast reset to all players
    io.emit('gameReset', {
      message: 'Game has been reset',
      initiatedBy: connectionId,
      currentRound: gameState.currentRound,
      currentTurn: gameState.currentTurn
    });

    // Send updated ship states
    io.emit('shipStateUpdate', {
      ships: shipState
    });
  });

  // Handle "ping" for latency measurement
  socket.on('ping', (data) => {
    socket.emit('pong', {
      clientTimestamp: data.timestamp,
      serverTimestamp: Date.now()
    });
  });

  // Stage 4: Handle start game request
  socket.on('startGame', () => {
    const conn = connections.get(socket.id);
    gameLog.info(` Player ${connectionId} requested game start`);

    // Check if both players are connected
    const assignments = getShipAssignments();
    if (!assignments.scout || !assignments.free_trader) {
      socket.emit('gameError', {
        message: 'Need both Scout and Free Trader players to start game'
      });
      return;
    }

    // Start first round
    const roundData = startNewRound();

    // Broadcast to all players
    io.emit('roundStart', {
      round: roundData.round,
      initiative: roundData.initiative,
      currentTurn: roundData.currentTurn,
      message: `Round ${roundData.round} begins!`
    });
  });

  // Stage 4: Handle end turn request
  socket.on('endTurn', () => {
    const conn = connections.get(socket.id);
    gameLog.info(` Player ${connectionId} (${conn.ship}) requested end turn`);

    // Validate it's their turn
    if (conn.ship !== gameState.currentTurn) {
      socket.emit('gameError', {
        message: `It's not your turn! Current turn: ${gameState.currentTurn}`
      });
      return;
    }

    // End turn and advance
    const turnData = endTurn();

    if (turnData.round > gameState.currentRound - 1 || turnData.newRound === false) {
      // Normal turn change or new round
      if (turnData.initiative) {
        // New round started
        io.emit('roundStart', {
          round: turnData.round,
          initiative: turnData.initiative,
          currentTurn: turnData.currentTurn,
          message: `Round ${turnData.round} begins!`
        });
      } else {
        // Just a turn change
        io.emit('turnChange', {
          round: turnData.round,
          currentTurn: turnData.currentTurn,
          message: `${turnData.currentTurn}'s turn`
        });
      }
    }
  });

  // ======== STAGE 8.6: SPACE COMBAT SHIP SELECTION ========

  // Note: socket.spaceSelection is initialized earlier with auto-assigned values

  socket.on('space:shipSelected', (data) => {
    updateConnectionActivity(socket.id); // SESSION 7: Track activity
    combatLog.info(` Player ${connectionId} selected ship: ${data.ship}`);
    socket.spaceSelection.ship = data.ship;
  });

  socket.on('space:rangeSelected', (data) => {
    updateConnectionActivity(socket.id); // SESSION 7: Track activity
    combatLog.info(` Player ${connectionId} selected range: ${data.range}`);
    socket.spaceSelection.range = data.range;
  });

  socket.on('space:playerReady', (data) => {
    updateConnectionActivity(socket.id); // SESSION 7: Track activity
    combatLog.info(` Player ${connectionId} ready with ${data.ship} at ${data.range}`);

    socket.spaceSelection.ship = data.ship;
    socket.spaceSelection.range = data.range;
    socket.spaceSelection.ready = true;

    // Notify other players that this player is ready
    socket.broadcast.emit('space:opponentReady', {
      ship: data.ship,
      range: data.range
    });

    // Check if both players are ready
    const allSockets = Array.from(connections.keys()).map(id => io.sockets.sockets.get(id));
    const readyPlayers = allSockets.filter(s => s && s.spaceSelection && s.spaceSelection.ready);

    combatLog.info(` ${readyPlayers.length}/${allSockets.length} players ready`);

    // Check if player requested solo mode (vs AI)
    const soloMode = data.soloMode === true;

    // Start combat if: (1) 2 players ready, OR (2) solo mode with 1 player
    if (readyPlayers.length >= 2 || (soloMode && readyPlayers.length === 1)) {
      const player1 = readyPlayers[0];
      const player2 = soloMode && readyPlayers.length === 1 ? createDummyPlayer(player1) : readyPlayers[1];

      if (soloMode && readyPlayers.length === 1) {
        combatLog.info(` SOLO MODE: Starting with AI opponent`);
      } else {
        combatLog.info(` MULTIPLAYER MODE: Both players ready`);
      }

      // Use the last player's range selection
      const finalRange = player2.spaceSelection.range || player1.spaceSelection.range || 'Short';

      combatLog.info(` Starting! Range: ${finalRange}`);
      combatLog.info(` Ships: ${player1.spaceSelection.ship} vs ${player2.spaceSelection.ship}`);

      // Broadcast combat start to both players
      io.emit('space:combatStart', {
        range: finalRange,
        ships: {
          player1: player1.spaceSelection.ship,
          player2: player2.spaceSelection.ship
        }
      });

      // Reset ready state
      readyPlayers.forEach(s => {
        if (s && s.spaceSelection) {
          s.spaceSelection.ready = false;
        }
      });

      // Initialize combat state
      const combatId = `${player1.id}_${player2.id}`;
      if (!activeCombats.has(combatId)) {
        // Helper function to create player combat data from ship selection
        const createPlayerData = (player) => {
          const shipType = player.spaceSelection.ship;
          const shipData = SHIPS[shipType];
          const crew = generateDefaultCrew(shipType);

          // STAGE 11: Initialize ammo for each weapon type
          const ammo = {
            missiles: 12,      // 12 missiles per rack
            sandcaster: 20     // 20 canisters per sandcaster
          };

          return {
            id: player.id,
            name: shipData ? shipData.name : shipType,
            ship: shipType,
            hull: shipData ? shipData.hull : 20,
            maxHull: shipData ? shipData.maxHull : 20,
            armor: shipData ? shipData.armor : 2,
            pilotSkill: shipData ? shipData.pilotSkill : 0,
            turrets: shipType === 'scout' ? 1 : 2,
            crew: crew,
            criticals: [],
            ammo: ammo  // STAGE 11: Track ammo per weapon type
          };
        };

        // STAGE 11: Create missile tracker for this combat
        const missileTracker = new MissileTracker();

        activeCombats.set(combatId, {
          id: combatId,
          player1: createPlayerData(player1),
          player2: createPlayerData(player2),
          range: finalRange,
          round: 1,
          activePlayer: player1.id,
          turnComplete: { [player1.id]: false, [player2.id]: false },
          missileTracker: missileTracker,  // STAGE 11: Track missiles for this combat
          startTime: Date.now(),  // SESSION 7: Track combat start time
          lastActivity: Date.now(),  // SESSION 7: Track last activity
          history: []  // SESSION 7: Combat history (trimmed to last 10 rounds)
        });
        combatLog.info(` Combat state initialized: ${combatId}`);

        // Notify both players who goes first (Player 1 always starts)
        const turnChangeData = {
          activePlayer: player1.id,
          round: 1
        };
        emitToPlayer(io, player1.id, 'space:turnChange', turnChangeData);
        emitToPlayer(io, player2.id, 'space:turnChange', turnChangeData);
        combatLog.info(` Initial turn set to player1: ${player1.id}`);
      }
    }
  });

  // ======== STAGE 8.8: SPACE COMBAT RESOLUTION ========

  // Handle fire action
  socket.on('space:fire', (data) => {
    // SESSION 7: Rate limiting
    if (!checkRateLimit(socket.id)) {
      socketLog.warn(`⛔ Player ${connectionId} rate limited (space:fire)`);
      socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
      return;
    }

    updateConnectionActivity(socket.id); // SESSION 7: Track activity
    combatLog.info(`[SPACE:FIRE] Player ${connectionId} firing`, data);

    // Find combat for this player
    let combat = null;
    let attackerPlayer = null;
    let defenderPlayer = null;
    let attackerSocket = null;
    let defenderSocket = null;

    for (const [combatId, c] of activeCombats.entries()) {
      if (c.player1.id === socket.id) {
        combat = c;
        attackerPlayer = c.player1;
        defenderPlayer = c.player2;
        attackerSocket = socket;
        defenderSocket = io.sockets.sockets.get(c.player2.id);
        updateCombatActivity(combatId); // SESSION 7: Track combat activity
        break;
      } else if (c.player2.id === socket.id) {
        combat = c;
        attackerPlayer = c.player2;
        defenderPlayer = c.player1;
        attackerSocket = socket;
        defenderSocket = io.sockets.sockets.get(c.player1.id);
        updateCombatActivity(combatId); // SESSION 7: Track combat activity
        break;
      }
    }

    if (!combat) {
      combatLog.info(`[SPACE:FIRE] No active combat found for player ${connectionId}`);
      return;
    }

    // Check if it's this player's turn
    if (combat.activePlayer !== socket.id) {
      combatLog.info(`[SPACE:FIRE] Not player's turn: ${connectionId}`);
      socket.emit('space:notYourTurn', { message: 'Wait for your turn!' });
      return;
    }

    // STAGE 11: Check if player has already fired this round
    if (combat.turnComplete[socket.id]) {
      combatLog.info(`[SPACE:FIRE] Player already fired this round: ${connectionId}`);
      socket.emit('space:alreadyFired', { message: 'You already fired this round!' });
      return;
    }

    // Resolve attack using combat library
    // Get the actual weapon object from SHIPS constant
    const shipData = SHIPS[attackerPlayer.ship];
    const weaponIndex = data.weapon || 0;
    const weaponObj = shipData && shipData.weapons ? shipData.weapons[weaponIndex] : null;

    const attackResult = resolveAttack(
      attackerPlayer,
      defenderPlayer,
      {
        range: combat.range.toLowerCase(),  // Normalize range to lowercase
        weapon: weaponObj
      }
    );

    combatLog.info(`[SPACE:FIRE] Attack result:`, attackResult);

    if (attackResult.hit) {
      // Apply damage
      defenderPlayer.hull -= attackResult.damage;
      if (defenderPlayer.hull < 0) defenderPlayer.hull = 0;

      combatLog.info(`[SPACE:FIRE] HIT! ${attackResult.damage} damage. Hull: ${defenderPlayer.hull}/${defenderPlayer.maxHull}`);

      // HOTFIX: Safe emit to attacker with null check
      if (attackerSocket && attackerSocket.connected) {
        attackerSocket.emit('space:attackResult', {
          hit: true,
          damage: attackResult.damage,
          targetHull: defenderPlayer.hull,
          attackRoll: attackResult.attackRoll,
          total: attackResult.total
        });
      } else {
        socketLog.error(` Attacker socket disconnected during combat! Combat: ${combat.id}, Attacker: ${attackerPlayer.id}`);
      }

      // HOTFIX: Safe emit to defender with null check and disconnect handling
      // Skip emit if defender is AI, but don't forfeit
      if (!isDummyAI(defenderPlayer.id)) {
        if (defenderSocket && defenderSocket.connected) {
          defenderSocket.emit('space:attacked', {
            hit: true,
            damage: attackResult.damage,
            hull: defenderPlayer.hull,
            maxHull: defenderPlayer.maxHull
          });
        } else {
          // Real player disconnected - forfeit combat
          socketLog.error(` Defender socket disconnected during combat! Combat: ${combat.id}, Defender: ${defenderPlayer.id}`);
          combatLog.info(`[SPACE:FORFEIT] ${defenderPlayer.id} disconnected, awarding victory to ${attackerPlayer.id}`);

          // Award victory to attacker
          activeCombats.delete(combat.id);

          if (attackerSocket && attackerSocket.connected) {
            attackerSocket.emit('space:combatEnd', {
              winner: attackerPlayer.id === combat.player1.id ? 'player1' : 'player2',
              loser: defenderPlayer.id === combat.player1.id ? 'player1' : 'player2',
              reason: 'opponent_disconnected',
              finalHull: {
                player1: combat.player1.hull,
                player2: combat.player2.hull
              },
              rounds: combat.round
            });
          }
          return;
        }
      }

      // Check for critical hits
      const hullPercent = (defenderPlayer.hull / defenderPlayer.maxHull) * 100;
      if (hullPercent <= 50 && attackResult.damage > 0 && Math.random() < 0.3) {
        const criticalSystems = ['Turret', 'Sensors', 'Maneuver Drive', 'Jump Drive', 'Power Plant'];
        const criticalSystem = criticalSystems[Math.floor(Math.random() * criticalSystems.length)];

        defenderPlayer.criticals.push(criticalSystem);

        // HOTFIX: Safe emit for critical hits with comprehensive logging
        const criticalData = {
          target: defenderPlayer.id === combat.player1.id ? 'player1' : 'player2',
          system: criticalSystem,
          damage: attackResult.damage
        };

        let emitSuccess = 0;
        let emitFailure = 0;

        if (attackerSocket && attackerSocket.connected) {
          attackerSocket.emit('space:critical', criticalData);
          emitSuccess++;
        } else {
          socketLog.error(` Cannot emit critical to attacker (disconnected): ${attackerPlayer.id}`);
          emitFailure++;
        }

        if (defenderSocket && defenderSocket.connected) {
          defenderSocket.emit('space:critical', criticalData);
          emitSuccess++;
        } else {
          socketLog.error(` Cannot emit critical to defender (disconnected): ${defenderPlayer.id}`);
          emitFailure++;
        }

        combatLog.info(`[SPACE:CRITICAL] ${criticalSystem} damaged! Notified ${emitSuccess}/2 players (${emitFailure} disconnected)`);
      }

      // Check for victory
      if (defenderPlayer.hull <= 0) {
        const winner = attackerPlayer.id === combat.player1.id ? 'player1' : 'player2';
        const loser = defenderPlayer.id === combat.player1.id ? 'player1' : 'player2';

        combatLog.info(`[SPACE:VICTORY] ${winner} wins! ${loser} destroyed.`);

        // HOTFIX: Safe emit for victory with comprehensive logging
        const victoryData = {
          winner,
          loser,
          finalHull: {
            player1: combat.player1.hull,
            player2: combat.player2.hull
          },
          rounds: combat.round
        };

        let victoryNotified = 0;

        if (attackerSocket && attackerSocket.connected) {
          attackerSocket.emit('space:combatEnd', victoryData);
          victoryNotified++;
        } else {
          socketLog.error(` Cannot notify attacker of victory (disconnected): ${attackerPlayer.id}`);
        }

        if (defenderSocket && defenderSocket.connected) {
          defenderSocket.emit('space:combatEnd', victoryData);
          victoryNotified++;
        } else {
          socketLog.error(` Cannot notify defender of defeat (disconnected): ${defenderPlayer.id}`);
        }

        combatLog.info(`[SPACE:VICTORY] Victory notifications sent to ${victoryNotified}/2 players`);

        // Clean up combat
        activeCombats.delete(combat.id);
        return;
      }
    } else {
      combatLog.info(`[SPACE:FIRE] MISS!`);

      // HOTFIX: Safe emit for miss with null checks
      if (attackerSocket && attackerSocket.connected) {
        attackerSocket.emit('space:attackResult', {
          hit: false,
          attackRoll: attackResult.attackRoll,
          total: attackResult.total,
          targetNumber: attackResult.targetNumber
        });
      } else {
        socketLog.error(` Cannot emit miss result to attacker (disconnected): ${attackerPlayer.id}`);
      }

      // Skip emit if defender is AI, but don't forfeit
      if (!isDummyAI(defenderPlayer.id)) {
        if (defenderSocket && defenderSocket.connected) {
          defenderSocket.emit('space:attacked', {
            hit: false
          });
        } else {
          // Real player disconnected - forfeit
          socketLog.error(` Cannot emit miss to defender (disconnected): ${defenderPlayer.id}`);
          combatLog.info(`[SPACE:FORFEIT] ${defenderPlayer.id} disconnected during miss, awarding victory to ${attackerPlayer.id}`);

          // Award victory to attacker
          activeCombats.delete(combat.id);

          if (attackerSocket && attackerSocket.connected) {
            attackerSocket.emit('space:combatEnd', {
              winner: attackerPlayer.id === combat.player1.id ? 'player1' : 'player2',
              loser: defenderPlayer.id === combat.player1.id ? 'player1' : 'player2',
              reason: 'opponent_disconnected',
              finalHull: {
                player1: combat.player1.hull,
                player2: combat.player2.hull
              },
              rounds: combat.round
            });
          }
          return;
        }
      }
    }

    // Mark turn as complete for this player
    combat.turnComplete[socket.id] = true;

    // HOTFIX: Safe emit for round/turn transitions with null checks
    // Check if both players have completed their turns
    if (combat.turnComplete[combat.player1.id] && combat.turnComplete[combat.player2.id]) {
      // Start new round
      combat.round++;
      combat.turnComplete = { [combat.player1.id]: false, [combat.player2.id]: false };

      // BUGFIX: Set active player for new round (round-robin alternating)
      // Player 1 goes first on odd rounds, Player 2 on even rounds
      combat.activePlayer = (combat.round % 2 === 1) ? combat.player1.id : combat.player2.id;

      combatLog.info(`[SPACE:ROUND] Starting round ${combat.round}, active player: ${combat.activePlayer === combat.player1.id ? 'Player 1' : 'Player 2'}`);

      const newRoundData = {
        round: combat.round,
        player1Hull: combat.player1.hull,
        player2Hull: combat.player2.hull,
        activePlayer: combat.activePlayer  // Include active player in round data
      };

      // Emit to both players with safety checks (skips dummy AI)
      let roundNotified = 0;
      if (emitToPlayer(io, combat.player1.id, 'space:newRound', newRoundData)) {
        roundNotified++;
      } else if (!isDummyAI(combat.player1.id)) {
        socketLog.error(` Cannot notify player1 of new round (disconnected): ${combat.player1.id}`);
      }

      if (emitToPlayer(io, combat.player2.id, 'space:newRound', newRoundData)) {
        roundNotified++;
      } else if (!isDummyAI(combat.player2.id)) {
        socketLog.error(` Cannot notify player2 of new round (disconnected): ${combat.player2.id}`);
      }

      combatLog.info(`[SPACE:ROUND] Round ${combat.round} notifications sent to ${roundNotified} player(s)`);

      // SOLO MODE: If new round starts with AI turn, execute it
      if (isDummyAI(combat.activePlayer)) {
        combatLog.info(`[SOLO MODE] New round starts with AI turn, executing...`);
        setTimeout(() => {
          executeAITurn(combat, io);
        }, 1500);  // 1.5 second delay for new round
      }
    } else {
      // Switch active player
      combat.activePlayer = combat.activePlayer === combat.player1.id ? combat.player2.id : combat.player1.id;

      const turnChangeData = {
        activePlayer: combat.activePlayer,
        round: combat.round
      };

      // Emit to both players with safety checks (skips dummy AI)
      let turnNotified = 0;
      if (emitToPlayer(io, combat.player1.id, 'space:turnChange', turnChangeData)) {
        turnNotified++;
      } else if (!isDummyAI(combat.player1.id)) {
        socketLog.error(` Cannot notify player1 of turn change (disconnected): ${combat.player1.id}`);
      }

      if (emitToPlayer(io, combat.player2.id, 'space:turnChange', turnChangeData)) {
        turnNotified++;
      } else if (!isDummyAI(combat.player2.id)) {
        socketLog.error(` Cannot notify player2 of turn change (disconnected): ${combat.player2.id}`);
      }

      combatLog.info(`[SPACE:TURN_CHANGE] Active player: ${combat.activePlayer}, notifications sent to ${turnNotified} player(s)`);

      // SOLO MODE: If it's dummy AI's turn, execute AI action automatically
      if (isDummyAI(combat.activePlayer)) {
        combatLog.info(`[SOLO MODE] AI turn detected, executing AI action...`);
        // Give a brief delay so the UI can update
        setTimeout(() => {
          executeAITurn(combat, io);
        }, 1000);  // 1 second delay
      }
    }
  });

  // STAGE 11: Handle missile launch
  socket.on('space:launchMissile', (data) => {
    // SESSION 7: Rate limiting
    if (!checkRateLimit(socket.id)) {
      socketLog.warn(`⛔ Player ${connectionId} rate limited (space:launchMissile)`);
      socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
      return;
    }

    updateConnectionActivity(socket.id); // SESSION 7: Track activity
    combatLog.info(`[SPACE:MISSILE] Player ${connectionId} launching missile`);

    // Find combat for this player
    let combat = null;
    for (const [combatId, c] of activeCombats.entries()) {
      if (c.player1.id === socket.id || c.player2.id === socket.id) {
        combat = c;
        break;
      }
    }

    if (!combat) {
      combatLog.info(`[SPACE:MISSILE] No active combat found for player ${connectionId}`);
      socket.emit('space:error', { message: 'No active combat found' });
      return;
    }

    // Determine attacker and defender
    const isPlayer1 = socket.id === combat.player1.id;
    const attackerPlayer = isPlayer1 ? combat.player1 : combat.player2;
    const defenderPlayer = isPlayer1 ? combat.player2 : combat.player1;
    const attackerSocket = socket;
    const defenderSocket = io.sockets.sockets.get(defenderPlayer.id);

    // Check if it's this player's turn
    if (combat.activePlayer !== socket.id) {
      combatLog.info(`[SPACE:MISSILE] Not player's turn: ${connectionId}`);
      socket.emit('space:notYourTurn', { message: 'Wait for your turn!' });
      return;
    }

    // Check if player has already fired this round
    if (combat.turnComplete[socket.id]) {
      combatLog.info(`[SPACE:MISSILE] Player already fired this round: ${connectionId}`);
      socket.emit('space:alreadyFired', { message: 'You already fired this round!' });
      return;
    }

    // Check missile ammo
    if (attackerPlayer.ammo.missiles <= 0) {
      combatLog.info(`[SPACE:MISSILE] No missile ammo remaining: ${connectionId}`);
      socket.emit('space:noAmmo', { message: 'No missiles remaining!' });
      return;
    }

    // Launch missile
    const missile = combat.missileTracker.launchMissile({
      attackerId: attackerPlayer.id,
      defenderId: defenderPlayer.id,
      currentRange: combat.range.toLowerCase(),
      round: combat.round
    });

    // Decrement ammo
    attackerPlayer.ammo.missiles--;

    combatLog.info(`[SPACE:MISSILE] Missile launched: ${missile.id} from ${attackerPlayer.name} to ${defenderPlayer.name} at ${missile.launchRange}`);

    // Emit to both players
    const missileData = {
      missileId: missile.id,
      attacker: attackerPlayer.name,
      defender: defenderPlayer.name,
      currentRange: missile.currentRange,
      ammoRemaining: attackerPlayer.ammo.missiles
    };

    if (attackerSocket && attackerSocket.connected) {
      attackerSocket.emit('space:missileLaunched', { ...missileData, isAttacker: true });
    }

    if (defenderSocket && defenderSocket.connected) {
      defenderSocket.emit('space:missileLaunched', { ...missileData, isAttacker: false });
    }

    // Mark turn as complete for this player
    combat.turnComplete[socket.id] = true;

    // Check if both players have completed their turns
    if (combat.turnComplete[combat.player1.id] && combat.turnComplete[combat.player2.id]) {
      // Start new round
      combat.round++;
      combat.turnComplete = { [combat.player1.id]: false, [combat.player2.id]: false };

      // STAGE 11: Update missiles at start of new round
      const missileUpdates = combat.missileTracker.updateMissiles(combat.round);

      combatLog.info(`[SPACE:ROUND] Starting round ${combat.round}, ${missileUpdates.length} missile updates`);

      // Process missile updates
      for (const update of missileUpdates) {
        if (update.action === 'moved') {
          const missile = combat.missileTracker.missiles.get(update.missileId);
          combatLog.info(`[SPACE:MISSILE] ${update.missileId} moved to ${update.newRange}`);

          const moveData = {
            missileId: update.missileId,
            newRange: update.newRange,
            oldRange: update.oldRange
          };

          const p1Socket = io.sockets.sockets.get(combat.player1.id);
          const p2Socket = io.sockets.sockets.get(combat.player2.id);

          if (p1Socket && p1Socket.connected) {
            p1Socket.emit('space:missileMoved', moveData);
          }

          if (p2Socket && p2Socket.connected) {
            p2Socket.emit('space:missileMoved', moveData);
          }
        } else if (update.action === 'impact') {
          // Missile reached target - resolve impact
          const impactResult = combat.missileTracker.resolveMissileImpact(update.missileId);

          if (impactResult.hit) {
            // Apply damage to defender
            const missile = impactResult.missile;
            const defender = missile.target === combat.player1.id ? combat.player1 : combat.player2;
            defender.hull -= impactResult.damage;
            if (defender.hull < 0) defender.hull = 0;

            combatLog.info(`[SPACE:MISSILE] ${update.missileId} IMPACT! ${impactResult.damage} damage. Hull: ${defender.hull}/${defender.maxHull}`);

            const impactData = {
              missileId: update.missileId,
              hit: true,
              damage: impactResult.damage,
              damageRoll: impactResult.damageRoll,
              targetHull: defender.hull,
              targetMaxHull: defender.maxHull
            };

            const p1Socket = io.sockets.sockets.get(combat.player1.id);
            const p2Socket = io.sockets.sockets.get(combat.player2.id);

            if (p1Socket && p1Socket.connected) {
              p1Socket.emit('space:missileImpact', impactData);
            }

            if (p2Socket && p2Socket.connected) {
              p2Socket.emit('space:missileImpact', impactData);
            }

            // Check for victory
            if (defender.hull <= 0) {
              const winner = defender.id === combat.player1.id ? 'player2' : 'player1';
              const loser = defender.id === combat.player1.id ? 'player1' : 'player2';

              combatLog.info(`[SPACE:VICTORY] ${winner} wins! ${loser} destroyed by missile.`);

              const victoryData = {
                winner,
                loser,
                finalHull: {
                  player1: combat.player1.hull,
                  player2: combat.player2.hull
                },
                rounds: combat.round
              };

              if (p1Socket && p1Socket.connected) {
                p1Socket.emit('space:combatEnd', victoryData);
              }

              if (p2Socket && p2Socket.connected) {
                p2Socket.emit('space:combatEnd', victoryData);
              }

              // Clean up combat
              activeCombats.delete(combat.id);
              return;
            }
          }
        }
      }

      const newRoundData = {
        round: combat.round,
        player1Hull: combat.player1.hull,
        player2Hull: combat.player2.hull,
        activePlayer: combat.activePlayer  // Include active player in round data
      };

      // Emit to both players with safety checks
      const p1Socket = io.sockets.sockets.get(combat.player1.id);
      const p2Socket = io.sockets.sockets.get(combat.player2.id);

      let roundNotified = 0;
      if (p1Socket && p1Socket.connected) {
        p1Socket.emit('space:newRound', newRoundData);
        roundNotified++;
      }

      if (p2Socket && p2Socket.connected) {
        p2Socket.emit('space:newRound', newRoundData);
        roundNotified++;
      }

      combatLog.info(`[SPACE:ROUND] Round ${combat.round} notifications sent to ${roundNotified}/2 players`);
    } else {
      // Switch active player
      combat.activePlayer = combat.activePlayer === combat.player1.id ? combat.player2.id : combat.player1.id;

      const turnChangeData = {
        activePlayer: combat.activePlayer,
        round: combat.round
      };

      const p1Socket = io.sockets.sockets.get(combat.player1.id);
      const p2Socket = io.sockets.sockets.get(combat.player2.id);

      if (p1Socket && p1Socket.connected) {
        p1Socket.emit('space:turnChange', turnChangeData);
      }

      if (p2Socket && p2Socket.connected) {
        p2Socket.emit('space:turnChange', turnChangeData);
      }

      combatLog.info(`[SPACE:TURN_CHANGE] Active player: ${combat.activePlayer}`);

      // SOLO MODE: If it's dummy AI's turn, execute AI action automatically
      if (isDummyAI(combat.activePlayer)) {
        combatLog.info(`[SOLO MODE] AI turn detected after missile launch, executing AI action...`);
        // Give a brief delay so the UI can update
        setTimeout(() => {
          executeAITurn(combat, io);
        }, 1000);  // 1 second delay
      }
    }
  });

  // STAGE 11: Handle point defense against missiles
  socket.on('space:pointDefense', (data) => {
    // SESSION 7: Rate limiting
    if (!checkRateLimit(socket.id)) {
      socketLog.warn(`⛔ Player ${connectionId} rate limited (space:pointDefense)`);
      socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
      return;
    }

    updateConnectionActivity(socket.id); // SESSION 7: Track activity
    combatLog.info(`[SPACE:POINT_DEFENSE] Player ${connectionId} using point defense against ${data.missileId}`);

    // Find combat for this player
    let combat = null;
    for (const [combatId, c] of activeCombats.entries()) {
      if (c.player1.id === socket.id || c.player2.id === socket.id) {
        combat = c;
        break;
      }
    }

    if (!combat) {
      combatLog.info(`[SPACE:POINT_DEFENSE] No active combat found for player ${connectionId}`);
      socket.emit('space:error', { message: 'No active combat found' });
      return;
    }

    // Determine attacker and defender
    const isPlayer1 = socket.id === combat.player1.id;
    const defenderPlayer = isPlayer1 ? combat.player1 : combat.player2;
    const defenderSocket = socket;

    // Attempt point defense
    const result = combat.missileTracker.pointDefense(
      data.missileId,
      defenderPlayer,
      defenderPlayer.crew.gunner || 0
    );

    if (!result.success) {
      combatLog.info(`[SPACE:POINT_DEFENSE] Point defense failed: ${result.reason}`);
      socket.emit('space:error', { message: `Point defense failed: ${result.reason}` });
      return;
    }

    combatLog.info(`[SPACE:POINT_DEFENSE] Result: ${result.destroyed ? 'DESTROYED' : 'MISSED'} (roll: ${result.total})`);

    // Emit to both players
    const pdData = {
      missileId: data.missileId,
      destroyed: result.destroyed,
      roll: result.roll,
      total: result.total,
      defender: defenderPlayer.name
    };

    const p1Socket = io.sockets.sockets.get(combat.player1.id);
    const p2Socket = io.sockets.sockets.get(combat.player2.id);

    if (p1Socket && p1Socket.connected) {
      p1Socket.emit('space:pointDefenseResult', pdData);
    }

    if (p2Socket && p2Socket.connected) {
      p2Socket.emit('space:pointDefenseResult', pdData);
    }
  });

  // STAGE 11: Handle sandcaster defense
  socket.on('space:useSandcaster', (data) => {
    // SESSION 7: Rate limiting
    if (!checkRateLimit(socket.id)) {
      socketLog.warn(`⛔ Player ${connectionId} rate limited (space:useSandcaster)`);
      socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
      return;
    }

    updateConnectionActivity(socket.id); // SESSION 7: Track activity
    combatLog.info(`[SPACE:SANDCASTER] Player ${connectionId} using sandcaster`);

    // Find combat for this player
    let combat = null;
    for (const [combatId, c] of activeCombats.entries()) {
      if (c.player1.id === socket.id || c.player2.id === socket.id) {
        combat = c;
        break;
      }
    }

    if (!combat) {
      combatLog.info(`[SPACE:SANDCASTER] No active combat found for player ${connectionId}`);
      socket.emit('space:error', { message: 'No active combat found' });
      return;
    }

    // Determine defender
    const isPlayer1 = socket.id === combat.player1.id;
    const defenderPlayer = isPlayer1 ? combat.player1 : combat.player2;

    // Check range (sandcasters only work at adjacent or close)
    if (!canUseSandcaster(combat.range.toLowerCase())) {
      combatLog.info(`[SPACE:SANDCASTER] Cannot use sandcaster at ${combat.range}`);
      socket.emit('space:error', { message: 'Sandcasters only work at adjacent or close range' });
      return;
    }

    // Check ammo
    if (defenderPlayer.ammo.sandcaster <= 0) {
      combatLog.info(`[SPACE:SANDCASTER] No sandcaster ammo remaining: ${connectionId}`);
      socket.emit('space:noAmmo', { message: 'No sandcaster ammo remaining!' });
      return;
    }

    // Use sandcaster
    const result = useSandcaster({
      gunnerSkill: defenderPlayer.crew.gunner || 0,
      attackType: data.attackType || 'laser',
      ammoRemaining: defenderPlayer.ammo.sandcaster
    });

    // Decrement ammo
    defenderPlayer.ammo.sandcaster--;

    combatLog.info(`[SPACE:SANDCASTER] Result: ${result.success ? 'SUCCESS' : 'FAILED'} (armor bonus: ${result.armorBonus})`);

    // Emit result back to defender
    const sandData = {
      success: result.success,
      armorBonus: result.armorBonus,
      roll: result.roll,
      total: result.total,
      ammoRemaining: defenderPlayer.ammo.sandcaster
    };

    socket.emit('space:sandcasterResult', sandData);

    // Store temporary armor bonus for this attack (if successful)
    if (result.success) {
      defenderPlayer.tempArmorBonus = result.armorBonus;
      combatLog.info(`[SPACE:SANDCASTER] Temporary armor bonus: +${result.armorBonus}`);
    }
  });

  // Handle end turn
  socket.on('space:endTurn', () => {
    // SESSION 7: Rate limiting
    if (!checkRateLimit(socket.id)) {
      socketLog.warn(`⛔ Player ${connectionId} rate limited (space:endTurn)`);
      socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
      return;
    }

    updateConnectionActivity(socket.id); // SESSION 7: Track activity
    combatLog.info(`[SPACE:END_TURN] Player ${connectionId} ending turn`);

    // Find combat for this player
    let combat = null;

    for (const [combatId, c] of activeCombats.entries()) {
      if (c.player1.id === socket.id || c.player2.id === socket.id) {
        combat = c;
        break;
      }
    }

    if (!combat) {
      combatLog.info(`[SPACE:END_TURN] No active combat found for player ${connectionId}`);
      return;
    }

    // Mark turn as complete for this player
    combat.turnComplete[socket.id] = true;

    combatLog.info(`[SPACE:END_TURN] Turn complete for ${connectionId}`);

    // HOTFIX: Safe emit for round/turn transitions with null checks
    // Check if both players have completed their turns
    if (combat.turnComplete[combat.player1.id] && combat.turnComplete[combat.player2.id]) {
      // Start new round
      combat.round++;
      combat.turnComplete = { [combat.player1.id]: false, [combat.player2.id]: false };

      // BUGFIX: Set active player for new round (round-robin alternating)
      // Player 1 goes first on odd rounds, Player 2 on even rounds
      combat.activePlayer = (combat.round % 2 === 1) ? combat.player1.id : combat.player2.id;

      combatLog.info(`[SPACE:ROUND] Starting round ${combat.round}, active player: ${combat.activePlayer === combat.player1.id ? 'Player 1' : 'Player 2'}`);

      const newRoundData = {
        round: combat.round,
        player1Hull: combat.player1.hull,
        player2Hull: combat.player2.hull,
        activePlayer: combat.activePlayer  // Include active player in round data
      };

      // Emit to both players with safety checks (skips dummy AI)
      let roundNotified = 0;
      if (emitToPlayer(io, combat.player1.id, 'space:newRound', newRoundData)) {
        roundNotified++;
      } else if (!isDummyAI(combat.player1.id)) {
        socketLog.error(` Cannot notify player1 of new round (disconnected): ${combat.player1.id}`);
      }

      if (emitToPlayer(io, combat.player2.id, 'space:newRound', newRoundData)) {
        roundNotified++;
      } else if (!isDummyAI(combat.player2.id)) {
        socketLog.error(` Cannot notify player2 of new round (disconnected): ${combat.player2.id}`);
      }

      combatLog.info(`[SPACE:ROUND] Round ${combat.round} notifications sent to ${roundNotified} player(s)`);

      // SOLO MODE: If new round starts with AI turn, execute it
      if (isDummyAI(combat.activePlayer)) {
        combatLog.info(`[SOLO MODE] New round starts with AI turn, executing...`);
        setTimeout(() => {
          executeAITurn(combat, io);
        }, 1500);  // 1.5 second delay for new round
      }
    } else {
      // Switch active player
      combat.activePlayer = combat.activePlayer === combat.player1.id ? combat.player2.id : combat.player1.id;

      const turnChangeData = {
        activePlayer: combat.activePlayer,
        round: combat.round
      };

      // Emit to both players with safety checks (skips dummy AI)
      let turnNotified = 0;
      if (emitToPlayer(io, combat.player1.id, 'space:turnChange', turnChangeData)) {
        turnNotified++;
      } else if (!isDummyAI(combat.player1.id)) {
        socketLog.error(` Cannot notify player1 of turn change (disconnected): ${combat.player1.id}`);
      }

      if (emitToPlayer(io, combat.player2.id, 'space:turnChange', turnChangeData)) {
        turnNotified++;
      } else if (!isDummyAI(combat.player2.id)) {
        socketLog.error(` Cannot notify player2 of turn change (disconnected): ${combat.player2.id}`);
      }

      combatLog.info(`[SPACE:TURN_CHANGE] Active player: ${combat.activePlayer}, notifications sent to ${turnNotified} player(s)`);

      // SOLO MODE: If it's dummy AI's turn, execute AI action automatically
      if (isDummyAI(combat.activePlayer)) {
        combatLog.info(`[SOLO MODE] AI turn detected, executing AI action...`);
        // Give a brief delay so the UI can update
        setTimeout(() => {
          executeAITurn(combat, io);
        }, 1000);  // 1 second delay
      }
    }
  });

  // SOLO MODE: Handle battle abandon
  socket.on('space:abandonBattle', () => {
    combatLog.info(`[SOLO MODE] Player ${connectionId} abandoned battle`);

    // Find and cleanup combat state
    let combatId = null;
    for (const [id, combat] of activeCombats.entries()) {
      if (combat.player1.id === socket.id || combat.player2.id === socket.id) {
        combatId = id;
        break;
      }
    }

    if (combatId) {
      activeCombats.delete(combatId);
      combatLog.info(`[SOLO MODE] Combat ${combatId} cleaned up after abandon`);
    }

    // Reset player state
    socket.spaceSelection = null;

    // Send confirmation
    socket.emit('space:battleAbandoned');
  });

  // ======== OPERATIONS: Starship Operations VTT Socket Handlers ========
  // These handlers support the multi-role crew management system
  // Namespace: ops:* events

  // Track operations session state for this socket
  let opsSession = {
    campaignId: null,
    accountId: null,
    isGM: false,
    isGuest: false,
    shipId: null,
    role: null
  };

  // --- Campaign Management (GM) ---

  // Get all campaigns (GM login)
  socket.on('ops:getCampaigns', () => {
    try {
      const campaigns = operations.getAllCampaigns();
      socket.emit('ops:campaigns', { campaigns });
      socketLog.info(`[OPS] Retrieved ${campaigns.length} campaigns`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to get campaigns', error: error.message });
      socketLog.error('[OPS] Error getting campaigns:', error);
    }
  });

  // Create new campaign
  socket.on('ops:createCampaign', (data) => {
    try {
      const { name, gmName } = data;
      if (!name || !gmName) {
        socket.emit('ops:error', { message: 'Campaign name and GM name are required' });
        return;
      }
      const campaign = operations.createCampaign(name, gmName);
      socket.emit('ops:campaignCreated', { campaign });
      socketLog.info(`[OPS] Campaign created: ${campaign.id} "${name}" by ${gmName}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to create campaign', error: error.message });
      socketLog.error('[OPS] Error creating campaign:', error);
    }
  });

  // Select campaign (GM loads campaign data)
  socket.on('ops:selectCampaign', (data) => {
    try {
      const { campaignId } = data;
      const fullData = operations.getFullCampaignData(campaignId);
      if (!fullData) {
        socket.emit('ops:error', { message: 'Campaign not found' });
        return;
      }
      opsSession.campaignId = campaignId;
      opsSession.isGM = true;
      socket.join(`ops:campaign:${campaignId}`);
      socket.emit('ops:campaignData', fullData);
      socketLog.info(`[OPS] GM selected campaign: ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to load campaign', error: error.message });
      socketLog.error('[OPS] Error loading campaign:', error);
    }
  });

  // Update campaign settings
  socket.on('ops:updateCampaign', (data) => {
    try {
      const { campaignId, updates } = data;
      if (!opsSession.isGM || opsSession.campaignId !== campaignId) {
        socket.emit('ops:error', { message: 'Not authorized to update this campaign' });
        return;
      }
      const campaign = operations.updateCampaign(campaignId, updates);
      io.to(`ops:campaign:${campaignId}`).emit('ops:campaignUpdated', { campaign });
      socketLog.info(`[OPS] Campaign updated: ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to update campaign', error: error.message });
      socketLog.error('[OPS] Error updating campaign:', error);
    }
  });

  // Delete campaign
  socket.on('ops:deleteCampaign', (data) => {
    try {
      const { campaignId } = data;
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can delete campaigns' });
        return;
      }
      operations.deleteCampaign(campaignId);
      socket.emit('ops:campaignDeleted', { campaignId });
      socketLog.info(`[OPS] Campaign deleted: ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to delete campaign', error: error.message });
      socketLog.error('[OPS] Error deleting campaign:', error);
    }
  });

  // --- Player Slot Management (GM) ---

  // Create player slot
  socket.on('ops:createPlayerSlot', (data) => {
    try {
      const { campaignId, slotName } = data;
      if (!opsSession.isGM || opsSession.campaignId !== campaignId) {
        socket.emit('ops:error', { message: 'Not authorized' });
        return;
      }
      const account = operations.createPlayerSlot(campaignId, slotName);
      io.to(`ops:campaign:${campaignId}`).emit('ops:playerSlotCreated', { account });
      socketLog.info(`[OPS] Player slot created: ${account.id} "${slotName}"`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to create player slot', error: error.message });
      socketLog.error('[OPS] Error creating player slot:', error);
    }
  });

  // Delete player slot
  socket.on('ops:deletePlayerSlot', (data) => {
    try {
      const { accountId } = data;
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can delete player slots' });
        return;
      }
      operations.deletePlayerSlot(accountId);
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:playerSlotDeleted', { accountId });
      socketLog.info(`[OPS] Player slot deleted: ${accountId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to delete player slot', error: error.message });
      socketLog.error('[OPS] Error deleting player slot:', error);
    }
  });

  // --- Player Join Flow ---

  // Player joins campaign by code/ID
  socket.on('ops:joinCampaignAsPlayer', (data) => {
    try {
      const { campaignId } = data;
      const campaign = operations.getCampaign(campaignId);
      if (!campaign) {
        socket.emit('ops:error', { message: 'Campaign not found. Check the code and try again.' });
        return;
      }
      const players = operations.getPlayerAccountsByCampaign(campaignId);
      opsSession.campaignId = campaignId;
      socket.join(`ops:campaign:${campaignId}`);
      socket.emit('ops:campaignJoined', {
        campaign,
        availableSlots: players.filter(p => !p.last_login || Date.now() - new Date(p.last_login).getTime() > 300000)
      });
      socketLog.info(`[OPS] Player viewing campaign: ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to join campaign', error: error.message });
      socketLog.error('[OPS] Error joining campaign:', error);
    }
  });

  // Player selects their slot
  socket.on('ops:selectPlayerSlot', (data) => {
    try {
      const { accountId } = data;
      const account = operations.getPlayerAccount(accountId);
      if (!account) {
        socket.emit('ops:error', { message: 'Player slot not found' });
        return;
      }
      operations.recordPlayerLogin(accountId);
      opsSession.accountId = accountId;
      opsSession.isGuest = false;
      // Get ships available for this campaign
      const ships = operations.getPartyShips(account.campaign_id);
      socket.emit('ops:playerSlotSelected', {
        account,
        ships,
        availableRoles: operations.ALL_ROLES
      });
      // Notify others in campaign
      socket.to(`ops:campaign:${account.campaign_id}`).emit('ops:playerJoined', {
        accountId,
        slotName: account.slot_name
      });
      socketLog.info(`[OPS] Player selected slot: ${accountId} "${account.slot_name}"`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to select player slot', error: error.message });
      socketLog.error('[OPS] Error selecting player slot:', error);
    }
  });

  // Guest joins campaign (any role, skill 0)
  socket.on('ops:joinAsGuest', (data) => {
    try {
      const { campaignId, guestName } = data;
      const campaign = operations.getCampaign(campaignId);
      if (!campaign) {
        socket.emit('ops:error', { message: 'Campaign not found' });
        return;
      }
      // Guest doesn't get a database account, just session state
      opsSession.campaignId = campaignId;
      opsSession.isGuest = true;
      opsSession.guestName = guestName || 'Guest';
      socket.join(`ops:campaign:${campaignId}`);
      // Get ships available
      const ships = operations.getPartyShips(campaignId);
      socket.emit('ops:guestJoined', {
        campaign,
        ships,
        availableRoles: operations.ALL_ROLES,
        guestName: opsSession.guestName,
        defaultSkill: 0  // Guests always start with skill 0
      });
      socketLog.info(`[OPS] Guest "${opsSession.guestName}" joined campaign: ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to join as guest', error: error.message });
      socketLog.error('[OPS] Error joining as guest:', error);
    }
  });

  // GM overrides guest skill level
  socket.on('ops:setGuestSkill', (data) => {
    try {
      const { targetSocketId, role, skillLevel } = data;
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can set guest skill levels' });
        return;
      }
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit('ops:skillOverride', { role, skillLevel });
        socketLog.info(`[OPS] GM set guest skill: ${role} = ${skillLevel}`);
      }
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to set guest skill', error: error.message });
    }
  });

  // --- Character Import ---

  // Import character data
  socket.on('ops:importCharacter', (data) => {
    try {
      const { characterData } = data;
      if (!opsSession.accountId && !opsSession.isGuest) {
        socket.emit('ops:error', { message: 'Must select a player slot first' });
        return;
      }
      if (opsSession.isGuest) {
        // For guests, just store in session
        opsSession.character = characterData;
        socket.emit('ops:characterImported', { character: characterData });
        socketLog.info(`[OPS] Guest character set: ${characterData.name}`);
      } else {
        const account = operations.importCharacter(opsSession.accountId, characterData);
        socket.emit('ops:characterImported', { character: account.character_data });
        socketLog.info(`[OPS] Character imported: ${characterData.name}`);
      }
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to import character', error: error.message });
      socketLog.error('[OPS] Error importing character:', error);
    }
  });

  // --- Ship & Role Selection ---

  // Select ship
  socket.on('ops:selectShip', (data) => {
    try {
      const { shipId } = data;
      const ship = operations.getShip(shipId);
      if (!ship) {
        socket.emit('ops:error', { message: 'Ship not found' });
        return;
      }
      opsSession.shipId = shipId;
      if (opsSession.accountId) {
        operations.updatePlayerAccount(opsSession.accountId, { ship_id: shipId });
      }
      // Get crew already on this ship
      const crew = operations.getPlayersByShip(shipId);
      const npcCrew = operations.getNPCCrewByShip(shipId);
      socket.emit('ops:shipSelected', {
        ship,
        crew,
        npcCrew,
        takenRoles: crew.map(c => c.role).filter(r => r)
      });
      socketLog.info(`[OPS] Ship selected: ${shipId} "${ship.name}"`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to select ship', error: error.message });
      socketLog.error('[OPS] Error selecting ship:', error);
    }
  });

  // Assign role (with validation for multiple identical roles)
  socket.on('ops:assignRole', (data) => {
    try {
      const { role } = data;
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Must select a ship first' });
        return;
      }
      // Note: isRoleAvailable checks if role is taken by another player
      // For ships with multiple identical roles (e.g., 2 gunners), we'd need
      // to check ship configuration for max slots per role (future enhancement)
      if (!opsSession.isGuest) {
        const isAvailable = operations.isRoleAvailable(opsSession.shipId, role, opsSession.accountId);
        if (!isAvailable) {
          socket.emit('ops:error', { message: `Role "${role}" is already taken on this ship` });
          return;
        }
        operations.assignRole(opsSession.accountId, role);
      }
      opsSession.role = role;
      socket.emit('ops:roleAssigned', { role });
      // Notify others in campaign
      socket.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:crewUpdate', {
        shipId: opsSession.shipId,
        accountId: opsSession.accountId,
        slotName: opsSession.isGuest ? opsSession.guestName : null,
        role
      });
      socketLog.info(`[OPS] Role assigned: ${role}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to assign role', error: error.message });
      socketLog.error('[OPS] Error assigning role:', error);
    }
  });

  // --- Bridge Operations ---

  // Join bridge (player ready to operate)
  socket.on('ops:joinBridge', () => {
    try {
      if (!opsSession.shipId || !opsSession.role) {
        socket.emit('ops:error', { message: 'Must select ship and role before joining bridge' });
        return;
      }
      socket.join(`ops:bridge:${opsSession.shipId}`);
      // Get current bridge state
      const ship = operations.getShip(opsSession.shipId);
      const crew = operations.getPlayersByShip(opsSession.shipId);
      const npcCrew = operations.getNPCCrewByShip(opsSession.shipId);
      const campaign = operations.getCampaign(opsSession.campaignId);
      const logs = operations.getShipLog(opsSession.shipId, { limit: 50 });
      const roleView = operations.ROLE_VIEWS[opsSession.role] || operations.ROLE_VIEWS.pilot;
      socket.emit('ops:bridgeJoined', {
        ship,
        crew,
        npcCrew,
        campaign,
        logs,
        role: opsSession.role,
        roleView,
        alertStatus: ship.current_state.alertStatus || 'NORMAL'
      });
      // Notify bridge
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:crewOnBridge', {
        accountId: opsSession.accountId,
        role: opsSession.role,
        name: opsSession.isGuest ? opsSession.guestName : null
      });
      socketLog.info(`[OPS] Joined bridge: ${opsSession.shipId} as ${opsSession.role}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to join bridge', error: error.message });
      socketLog.error('[OPS] Error joining bridge:', error);
    }
  });

  // GM starts session
  socket.on('ops:startSession', () => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can start session' });
        return;
      }
      // Add log entry
      const ships = operations.getPartyShips(opsSession.campaignId);
      const campaign = operations.getCampaign(opsSession.campaignId);
      ships.forEach(ship => {
        operations.addLogEntry(ship.id, opsSession.campaignId, {
          gameDate: campaign.current_date,
          entryType: 'session',
          message: 'Session started',
          actor: 'GM'
        });
      });
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:sessionStarted', {
        gameDate: campaign.current_date,
        currentSystem: campaign.current_system
      });
      socketLog.info(`[OPS] Session started for campaign: ${opsSession.campaignId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to start session', error: error.message });
      socketLog.error('[OPS] Error starting session:', error);
    }
  });

  // Add ship log entry
  socket.on('ops:addLogEntry', (data) => {
    try {
      const { message, entryType } = data;
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const campaign = operations.getCampaign(opsSession.campaignId);
      const entry = operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: entryType || 'note',
        message,
        actor: opsSession.isGuest ? opsSession.guestName : opsSession.role
      });
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:logEntry', { entry });
      socketLog.info(`[OPS] Log entry added: ${message.substring(0, 50)}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to add log entry', error: error.message });
      socketLog.error('[OPS] Error adding log entry:', error);
    }
  });

  // GM advances time
  socket.on('ops:advanceTime', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can advance time' });
        return;
      }
      const { hours = 0, minutes = 0 } = data;
      const campaign = operations.getCampaign(opsSession.campaignId);
      // Parse current date (format: YYYY-DDD HH:MM)
      const [datePart, timePart] = campaign.current_date.split(' ');
      const [year, day] = datePart.split('-').map(Number);
      const [currentHours, currentMinutes] = (timePart || '00:00').split(':').map(Number);

      let newMinutes = currentMinutes + minutes;
      let newHours = currentHours + hours + Math.floor(newMinutes / 60);
      newMinutes = newMinutes % 60;
      let newDay = day + Math.floor(newHours / 24);
      newHours = newHours % 24;
      let newYear = year + Math.floor((newDay - 1) / 365);
      newDay = ((newDay - 1) % 365) + 1;

      const newDate = `${newYear}-${String(newDay).padStart(3, '0')} ${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
      operations.updateCampaign(opsSession.campaignId, { current_date: newDate });

      // Log time advance
      const ships = operations.getPartyShips(opsSession.campaignId);
      ships.forEach(ship => {
        operations.addLogEntry(ship.id, opsSession.campaignId, {
          gameDate: newDate,
          entryType: 'time',
          message: `Time advanced: +${hours}h ${minutes}m`,
          actor: 'GM'
        });
      });

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:timeAdvanced', {
        previousDate: campaign.current_date,
        newDate,
        hoursAdvanced: hours,
        minutesAdvanced: minutes
      });
      socketLog.info(`[OPS] Time advanced to: ${newDate}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to advance time', error: error.message });
      socketLog.error('[OPS] Error advancing time:', error);
    }
  });

  // Set alert status (Captain or GM)
  socket.on('ops:setAlertStatus', (data) => {
    try {
      const { status } = data;
      if (!opsSession.isGM && opsSession.role !== 'captain') {
        socket.emit('ops:error', { message: 'Only Captain or GM can change alert status' });
        return;
      }
      if (!['NORMAL', 'YELLOW', 'RED'].includes(status)) {
        socket.emit('ops:error', { message: 'Invalid alert status' });
        return;
      }
      operations.updateShipState(opsSession.shipId, { alertStatus: status });
      const campaign = operations.getCampaign(opsSession.campaignId);
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'alert',
        message: `Alert status changed to ${status}`,
        actor: opsSession.isGM ? 'GM' : 'Captain'
      });
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:alertStatusChanged', {
        status,
        alertInfo: operations.ALERT_STATUS[status]
      });
      socketLog.info(`[OPS] Alert status changed: ${status}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to set alert status', error: error.message });
      socketLog.error('[OPS] Error setting alert status:', error);
    }
  });

  // --- Ship Management (GM) ---

  // Add ship to campaign
  socket.on('ops:addShip', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can add ships' });
        return;
      }
      const { name, shipData, isPartyShip } = data;
      const ship = operations.addShip(opsSession.campaignId, name, shipData, {
        isPartyShip: isPartyShip !== false,
        visibleToPlayers: true
      });
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:shipAdded', { ship });
      socketLog.info(`[OPS] Ship added: ${ship.id} "${name}"`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to add ship', error: error.message });
      socketLog.error('[OPS] Error adding ship:', error);
    }
  });

  // Delete ship
  socket.on('ops:deleteShip', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can delete ships' });
        return;
      }
      const { shipId } = data;
      operations.deleteShip(shipId);
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:shipDeleted', { shipId });
      socketLog.info(`[OPS] Ship deleted: ${shipId}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Failed to delete ship', error: error.message });
      socketLog.error('[OPS] Error deleting ship:', error);
    }
  });

  // ======== END OPERATIONS HANDLERS ========

  socket.on('disconnect', () => {
    const conn = connections.get(socket.id);
    const duration = Date.now() - conn.connected;
    const disconnectedShip = conn.ship;

    socketLog.info(` Player ${connectionId} (${disconnectedShip || 'spectator'}) disconnected after ${duration}ms`);

    // HOTFIX: Check if disconnecting player is in active space combat
    let combatFound = null;
    for (const [combatId, combat] of activeCombats.entries()) {
      if (combat.player1.id === socket.id || combat.player2.id === socket.id) {
        combatFound = { id: combatId, combat };
        break;
      }
    }

    if (combatFound) {
      combatLog.info(`[SPACE:FORFEIT] Player ${connectionId} disconnected during active combat ${combatFound.id}`);

      // Determine winner (the player who DIDN'T disconnect)
      const isPlayer1 = combatFound.combat.player1.id === socket.id;
      const winnerId = isPlayer1 ? combatFound.combat.player2.id : combatFound.combat.player1.id;
      const winnerSocket = io.sockets.sockets.get(winnerId);

      // Clean up combat state
      activeCombats.delete(combatFound.id);
      combatLog.info(`[SPACE:COMBAT] Combat ${combatFound.id} ended due to disconnect. ${activeCombats.size} combats remaining.`);

      // Notify winner with null check
      if (winnerSocket && winnerSocket.connected) {
        winnerSocket.emit('space:combatEnd', {
          winner: isPlayer1 ? 'player2' : 'player1',
          loser: isPlayer1 ? 'player1' : 'player2',
          reason: 'opponent_disconnected',
          finalHull: {
            player1: combatFound.combat.player1.hull,
            player2: combatFound.combat.player2.hull
          },
          rounds: combatFound.combat.round
        });
        combatLog.info(`[SPACE:VICTORY] Opponent disconnected, victory awarded to ${winnerId}`);
      } else {
        socketLog.error(` Winner also disconnected, combat ${combatFound.id} ends with no notification`);
      }
    }

    connections.delete(socket.id);
    socketLog.info(` ${connections.size} players remaining`);

    // Broadcast updated game state to remaining players
    socket.broadcast.emit('playerLeft', {
      playerId: connectionId,
      ship: disconnectedShip,
      totalPlayers: connections.size,
      assignments: getShipAssignments()
    });
  });
});

// REST API endpoint for combat (for testing)
app.post('/api/combat', (req, res) => {
  const { attacker, target, range, dodge } = req.body;
  
  const attackerShip = SHIPS[attacker];
  const targetShip = SHIPS[target];
  
  if (!attackerShip || !targetShip) {
    return res.status(400).json({ error: 'Invalid ship' });
  }
  
  const result = resolveAttack(attackerShip, targetShip, { range, dodge });
  const breakdown = getAttackBreakdown(result);
  
  res.json({
    result,
    breakdown,
    formatted: formatAttackResult(result)
  });
});

// Health check endpoint (for Docker/k8s liveness probes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: require('./package.json').version,
    environment: config.env || process.env.NODE_ENV || 'development'
  });
});

// Readiness check endpoint (for Docker/k8s readiness probes)
app.get('/ready', (req, res) => {
  // Application is ready if server is listening and key systems initialized
  const ready = server.listening && typeof gameState !== 'undefined';

  const status = ready ? 200 : 503;
  res.status(status).json({
    status: ready ? 'ready' : 'not ready',
    timestamp: new Date().toISOString(),
    checks: {
      serverListening: server.listening,
      gameStateInitialized: typeof gameState !== 'undefined',
      socketIOReady: typeof io !== 'undefined'
    }
  });
});

// Status endpoint (legacy - detailed game state for debugging)
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    stage: 4,
    players: connections.size,
    assignments: getShipAssignments(),
    currentRound: gameState.currentRound,
    currentTurn: gameState.currentTurn,
    uptime: process.uptime()
  });
});

// SESSION 6: Register Test API for Puppeteer/Puppetry automation
// Only enabled when NODE_ENV=test or ENABLE_TEST_API=true
registerTestAPI(app, io, activeCombats, connections);

// Start server
server.listen(config.server.port, () => {
  log.info('========================================');
  log.info('TRAVELLER COMBAT VTT - STAGE 11 COMPLETE');
  log.info('========================================');
  log.info(`Server running on http://localhost:${config.server.port}`);
  log.info(`Environment: ${config.env}`);
  log.info(`Log Level: ${config.logging.level}`);
  log.info(`Client Logging: ${config.logging.clientLogging ? 'ENABLED' : 'DISABLED'}`);
  log.info('');
  log.info('Current Features:');
  log.info('- Missiles (4D6 damage, 1 band movement per round)');
  log.info('- Point defense (shoot down missiles, 2D6+Gunner ≥ 8)');
  log.info('- Sandcasters (1D + Effect armor bonus)');
  log.info('- Ammo tracking (12 missiles, 20 sand canisters per turret)');
  log.info('- Turn/phase tracker UI with visual indicators');
  log.info('- Player feedback system with secure logging');
  log.info('- Version display (Version 0.11)');
  log.info('- Multiple weapon types (Pulse Laser, Beam Laser, Missile)');
  log.info('- Hex-based movement system');
  log.info('- Initiative-based turn order (2d6 + pilot skill)');
  log.info('- Crew management (Pilot, Gunner, Engineer)');
  log.info('- Server-side combat resolution (TDD)');
  log.info('');
  log.info('Status: Stage 11 Complete - Missiles, Sandcasters & UI');
  log.info('Version: 0.11 - Released 2025-11-11');
  log.info('');
  log.info('Instructions:');
  log.info('1. Open browser to http://localhost:' + config.server.port);
  log.info('2. Two players connect to select ships');
  log.info('3. Players move ships, launch missiles, use sandcasters');
  log.info('4. Initiative determines turn order each round');
  log.info('5. Combat with full tactical options');
  log.info('========================================');
});

process.on('SIGTERM', () => {
  log.info('Shutting down gracefully...');
  server.close(() => {
    log.info('Server closed');
    process.exit(0);
  });
});
