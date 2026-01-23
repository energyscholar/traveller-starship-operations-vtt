// Traveller Starship Operations VTT
// Purpose: Multi-role crew management for starship operations
//
// Architecture:
//   lib/state/           - Connection and session state management
//   lib/services/        - Rate limiting, performance metrics, connection management
//   lib/operations/      - Operations layer (combat, database, campaigns)
//   lib/socket-handlers/ - Socket.io event handlers (operations, utility)
//   lib/routes/          - REST API endpoints
//   lib/server/          - Express, Socket.io, and routes setup (AR-250)
//
// This file is a thin orchestration layer that:
//   1. Sets up Express/Socket.io
//   2. Initializes state modules
//   3. Registers handler modules
//   4. Starts the server

const express = require('express');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { server: log, socket: socketLog } = require('./lib/logger');

// Auth routes
const authRoutes = require('./lib/auth/routes/auth-routes');
const testAuthRoutes = require('./lib/auth/routes/test-auth');

// AR-250: Extracted setup modules
const { createSocketConfig } = require('./lib/server/socket-setup');
const { registerAllRoutes } = require('./lib/server/routes-setup');

// Express and HTTP server
const app = express();
const server = require('http').createServer(app);

// Socket.io with extracted config
const io = require('socket.io')(server, createSocketConfig());

// State and services
const state = require('./lib/state');
const services = require('./lib/services');
const { registerTestAPI } = require('./lib/test-api');

// Security headers
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; connect-src 'self' ws: wss:; font-src 'self'; " +
    "frame-src https://travellermap.com https://*.travellermap.com"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Cache control for dev
if (config.server.disableCache) {
  app.use((req, res, next) => {
    if (req.path.endsWith('.js') || req.path.endsWith('.css') || req.path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });
}

// Static files
// URL SWAP: V2 is now default, V1 moved to /operations/legacy
app.use('/operations/legacy', express.static('public/operations'));
app.use(express.static('public/operations-v2'));
app.use('/operations', express.static('public/operations-v2'));
app.use('/lib', express.static('lib'));
app.use('/data', express.static('data'));
app.use(express.json());
app.use(cookieParser());

// Auth routes
app.use('/auth', authRoutes);
if (process.env.NODE_ENV !== 'production') {
  app.use('/auth/test', testAuthRoutes);
}

// AR-250: Register all API routes from extracted module
registerAllRoutes(app, { log });

// State tracking
const connections = state.getConnections();
const activeSessions = state.getActiveCombats();
const { performanceMetrics, IDLE_TIMEOUT_MS, CONNECTION_CHECK_INTERVAL } = services;

// Intervals for graceful shutdown
const intervals = [];

// Idle connection cleanup
intervals.push(setInterval(() => {
  const now = Date.now();
  let disconnectedCount = 0;
  for (const [socketId, conn] of connections.entries()) {
    if (now - conn.lastActivity > IDLE_TIMEOUT_MS) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket?.connected) {
        socketLog.warn(`⏱️  Player ${conn.id} idle, disconnecting`);
        socket.disconnect(true);
        disconnectedCount++;
      }
    }
  }
  if (disconnectedCount > 0) socketLog.info(`🧹 Cleaned ${disconnectedCount} idle connections`);
}, CONNECTION_CHECK_INTERVAL));

// Performance metrics logging
intervals.push(setInterval(() => {
  services.updateMetrics(connections.size, activeSessions.size);
  log.info('📊 Performance Metrics:', services.getFormattedMetrics());
}, 60000));

// Socket.io connection handling
io.on('connection', (socket) => {
  const connectionId = state.incrementConnectionCount();
  connections.set(socket.id, { id: connectionId, connected: Date.now(), lastActivity: Date.now() });
  performanceMetrics.connections.total++;
  socketLog.info(`Connection ${connectionId} established (${connections.size} active)`);

  require('./lib/socket-handlers/utility.handlers').register(socket, io, connectionId);
  require('./lib/socket-handlers/operations.handlers').register(socket, io, { connections, activeSessions });
  socket.on('disconnect', require('./lib/socket-handlers/disconnect.handler').createHandler(socket, io, {
    connections, activeSessions, connectionId
  }));
});

// Additional API routes
require('./lib/routes/api.routes').register(app, { server, connections, config });
registerTestAPI(app, io, activeSessions, connections);

// Git version info
const { execSync } = require('child_process');
let gitInfo = 'unknown';
try {
  const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  const date = execSync('git log -1 --format=%ci', { encoding: 'utf8' }).trim();
  gitInfo = `${hash} (${date})`;
} catch (e) { gitInfo = `build-${new Date().toISOString()}`; }

// Start server
server.listen(config.server.port, () => {
  log.info('========================================');
  log.info('TRAVELLER STARSHIP OPERATIONS VTT');
  log.info(`VERSION: ${gitInfo}`);
  log.info('========================================');
  log.info(`Server: http://localhost:${config.server.port} | Env: ${config.env}`);
  log.info('Test: npm run test:fast | Full: npm test | E2E: npm run test:e2e <file>');
  log.info('========================================');

  // AR-289: Initialize solo demo campaign after all modules loaded
  // AR-300.2: Initialize Tuesday campaign after all modules loaded
  const { initSoloDemo, initTuesdayCampaign } = require('./lib/operations/database');
  initSoloDemo();
  initTuesdayCampaign();
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  log.info(`${signal} received, shutting down...`);
  intervals.forEach(i => clearInterval(i));
  io.close(() => log.info('Socket.IO closed'));
  server.close(() => { log.info('HTTP closed'); process.exit(0); });
  setTimeout(() => { log.error('Forced shutdown'); process.exit(1); }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
