// Traveller Starship Operations VTT
// Purpose: Multi-role crew management for starship operations
// Status: Operations VTT with legacy space combat support
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

// CORS configuration - lockdown for production
// Set ALLOWED_ORIGINS env var for production (comma-separated list)
// Example: ALLOWED_ORIGINS=https://your-app.com,https://www.your-app.com
const getAllowedOrigins = () => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  }
  // Development defaults - allow localhost variations
  return ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080'];
};

const io = require('socket.io')(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();
      // Allow requests with no origin (mobile apps, curl, etc.) in development
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        log.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('CORS: Origin not allowed'));
      }
    },
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

// Track intervals for graceful shutdown
const intervals = [];

// Periodic check for idle connections
intervals.push(setInterval(() => {
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
}, CONNECTION_CHECK_INTERVAL));

// Stage 8.8: Track active space combat sessions (from lib/state)
const activeCombats = state.getActiveCombats();

// SESSION 7: Combat state optimization constants (from lib/state)
const COMBAT_INACTIVE_TIMEOUT_MS = state.COMBAT_INACTIVE_TIMEOUT_MS;
const COMBAT_HISTORY_LIMIT = state.COMBAT_HISTORY_LIMIT;
const COMBAT_CHECK_INTERVAL = 60000; // Check every minute

// Prune inactive combats
intervals.push(setInterval(() => {
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
}, COMBAT_CHECK_INTERVAL));

// Combat activity and history management now in lib/state/combat-state.js
// Use: state.updateCombatActivity(combatId) and state.trimCombatHistory(combat)

// SESSION 7: Performance profiling (from lib/services)
const { performanceMetrics } = services;

// Log performance metrics periodically
intervals.push(setInterval(() => {
  services.updateMetrics(connections.size, activeCombats.size);
  log.info('📊 Performance Metrics:', services.getFormattedMetrics());
}, 60000)); // Log every minute

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
  log.info('TRAVELLER STARSHIP OPERATIONS VTT');
  log.info('========================================');
  log.info(`Server running on http://localhost:${config.server.port}`);
  log.info(`Environment: ${config.env}`);
  log.info(`Log Level: ${config.logging.level}`);
  log.info(`Client Logging: ${config.logging.clientLogging ? 'ENABLED' : 'DISABLED'}`);
  log.info('');
  log.info('Operations Features:');
  log.info('- Multi-role crew stations (Captain, Pilot, Astrogator, Engineer, etc.)');
  log.info('- Campaign management with persistent state');
  log.info('- Interstellar jump plotting and execution');
  log.info('- Sensor contacts and tactical display');
  log.info('- Weapons authorization flow (Captain → Gunner)');
  log.info('- Ship systems and damage tracking');
  log.info('- Real-time multi-player synchronization');
  log.info('- Role-specific information and controls');
  log.info('');
  log.info('Legacy Space Combat (at /combat):');
  log.info('- Tactical hex-based movement');
  log.info('- Missiles, point defense, sandcasters');
  log.info('- Initiative-based turn order');
  log.info('');
  log.info('Instructions:');
  log.info('1. Open http://localhost:' + config.server.port + '/operations/');
  log.info('2. GM creates campaign, players join with code');
  log.info('3. Each player selects crew role on bridge');
  log.info('4. GM advances time and manages encounters');
  log.info('========================================');
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  log.info(`${signal} received, shutting down gracefully...`);

  // Clear all intervals
  intervals.forEach(interval => clearInterval(interval));
  log.info(`Cleared ${intervals.length} intervals`);

  // Close Socket.IO connections
  io.close(() => {
    log.info('Socket.IO connections closed');
  });

  // Close HTTP server
  server.close(() => {
    log.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    log.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
