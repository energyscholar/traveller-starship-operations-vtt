// Traveller Combat VTT - Stage 11 Complete
// Purpose: Missiles, Sandcasters & UI Improvements
// Status: Stage 11 Complete - Missiles, Sandcasters, Turn Tracker, Feedback
//
// MVC REFACTOR COMPLETE - Now ~365 LOC (down from ~2700)
// Architecture:
//   lib/state/           - Connection, combat, game state management
//   lib/services/        - Rate limiting, performance metrics, connection management
//   lib/combat/          - Combat resolution, AI, game logic
//   lib/socket-handlers/ - Socket.io event handlers (legacy, space, operations, utility)
//   lib/routes/          - REST API endpoints
//
// This file is now a thin orchestration layer that:
//   1. Sets up Express/Socket.io
//   2. Initializes state modules
//   3. Registers handler modules
//   4. Starts the server

const express = require('express');
const config = require('./config');
const { server: log, socket: socketLog, game: gameLog, combat: combatLog } = require('./lib/logger');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// SESSION 6: Test API for Puppeteer/Puppetry automation
const { registerTestAPI } = require('./lib/test-api');

// MVC: State modules (extracted from server.js)
const state = require('./lib/state');

// MVC: Services (extracted from server.js)
const services = require('./lib/services');

// MVC: AI module (extracted from server.js)
const {
  createDummyPlayer,
  isDummyAI,
  emitToPlayer,
  makeAIDecision,
  executeAITurn: executeAITurnBase
} = require('./lib/combat/ai');

// MVC: Game logic (extracted from server.js)
const game = require('./lib/combat/game');

// Wrapper to inject activeCombats dependency
function executeAITurn(combat, io) {
  return executeAITurnBase(combat, io, activeCombats);
}

// Serve static files - Operations VTT is the main interface
// Redirect root to operations
app.get('/', (req, res) => {
  res.redirect('/operations/');
});
// Serve combat UI at /combat (legacy space combat interface)
app.use('/combat', express.static('public/combat'));
// Serve operations and other static files
app.use(express.static('public'));
// Serve lib directory for client-side modules (Stage 12.4)
app.use('/lib', express.static('lib'));
// Serve data directory for ship templates (Stage 12)
app.use('/data', express.static('data'));
app.use(express.json());

// Track connections and ship assignments (from lib/state)
const connections = state.getConnections();

// SESSION 7: Connection management and idle timeout (from lib/services)
const IDLE_TIMEOUT_MS = services.IDLE_TIMEOUT_MS;
const CONNECTION_CHECK_INTERVAL = services.CONNECTION_CHECK_INTERVAL;

// SESSION 7: Rate limiting (from lib/services)
const { checkRateLimit } = services;

// Track connection activity (from lib/services)
const { updateConnectionActivity } = services;

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

// Stage 8.8: Track active space combat sessions (from lib/state)
const activeCombats = state.getActiveCombats();

// SESSION 7: Combat state optimization constants (from lib/state)
const COMBAT_INACTIVE_TIMEOUT_MS = state.COMBAT_INACTIVE_TIMEOUT_MS;
const COMBAT_HISTORY_LIMIT = state.COMBAT_HISTORY_LIMIT;
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

// Combat activity and history management now in lib/state/combat-state.js
// Use: state.updateCombatActivity(combatId) and state.trimCombatHistory(combat)

// SESSION 7: Performance profiling (from lib/services)
const { performanceMetrics } = services;

// Log performance metrics periodically
setInterval(() => {
  services.updateMetrics(connections.size, activeCombats.size);
  log.info('📊 Performance Metrics:', services.getFormattedMetrics());
}, 60000); // Log every minute

// Stage 9: AI opponent helpers now in lib/combat/ai/helpers.js
// Imported: createDummyPlayer, isDummyAI, emitToPlayer

// ======== SOLO MODE AI OPPONENT SYSTEM ========
// AI module now in lib/combat/ai/
// Imported: createDummyPlayer, isDummyAI, emitToPlayer, makeAIDecision, executeAITurn

// Stage 3-7: Ship and game state (from lib/state)
const shipState = state.getShipState();
const gameState = state.getGameState();

// Game helpers (from lib/combat/game)
const { generateDefaultCrew } = game;

// Wrapper functions for state and game modules (maintain existing API)
function getAvailableShip() {
  return state.getAvailableShip(connections);
}

function getShipAssignments() {
  return state.getShipAssignments(connections);
}

function resetShipStates() {
  state.resetShipStates();
  gameLog.info(' Ship states reset (hull + ammo + positions)');
}

function startNewRound() {
  return game.startNewRound(shipState, gameState);
}

function endTurn() {
  return game.endTurn(shipState, gameState);
}

function resetGameState() {
  game.resetGameState(gameState);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  log.debug(' ========================================');
  log.debug(' NEW CONNECTION RECEIVED!');
  log.debug(' Socket ID:', socket.id);
  log.debug(' ========================================');

  const connectionId = state.incrementConnectionCount();
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

  // Register utility handlers (client:log, player:feedback, ping)
  // These are extracted to lib/socket-handlers/utility.handlers.js
  const utilityHandlers = require('./lib/socket-handlers/utility.handlers');
  utilityHandlers.register(socket, io, connectionId);

  // Register legacy ground combat handlers (hello, combat, repair, move, reset, start, endTurn)
  // Extracted to lib/socket-handlers/legacy.handlers.js
  const legacyHandlers = require('./lib/socket-handlers/legacy.handlers');
  legacyHandlers.register(socket, io, {
    connections,
    shipState,
    gameState,
    connectionId,
    getShipAssignments,
    startNewRound,
    endTurn: endTurn,
    resetShipStates,
    resetGameState
  });

  // Register space combat handlers (ship selection, fire, missiles, sandcasters, etc.)
  // Extracted to lib/socket-handlers/space.handlers.js
  // NOTE: Future refactor opportunity - apply Command Pattern to break into smaller components
  const spaceHandlers = require('./lib/socket-handlers/space.handlers');
  spaceHandlers.register(socket, io, {
    connections,
    activeCombats,
    connectionId,
    executeAITurn
  });

  // ======== OPERATIONS: Starship Operations VTT Socket Handlers ========
  // Handlers extracted to lib/socket-handlers/operations.handlers.js
  const operationsHandlers = require('./lib/socket-handlers/operations.handlers');
  operationsHandlers.register(socket, io, { connections, activeCombats });
  // ======== END OPERATIONS HANDLERS ========

  // Register disconnect handler (extracted to lib/socket-handlers/disconnect.handler.js)
  const disconnectHandler = require('./lib/socket-handlers/disconnect.handler');
  socket.on('disconnect', disconnectHandler.createHandler(socket, io, {
    connections,
    activeCombats,
    connectionId,
    getShipAssignments
  }));
});

// MVC: API Routes (extracted to lib/routes/api.routes.js)
const apiRoutes = require('./lib/routes/api.routes');
apiRoutes.register(app, {
  server,
  connections,
  gameState,
  getShipAssignments,
  config
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
