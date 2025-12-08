// Traveller Starship Operations VTT
// Purpose: Multi-role crew management for starship operations
//
// Architecture:
//   lib/state/           - Connection and session state management
//   lib/services/        - Rate limiting, performance metrics, connection management
//   lib/operations/      - Operations layer (combat, database, campaigns)
//   lib/socket-handlers/ - Socket.io event handlers (operations, utility)
//   lib/routes/          - REST API endpoints
//
// This file is a thin orchestration layer that:
//   1. Sets up Express/Socket.io
//   2. Initializes state modules
//   3. Registers handler modules
//   4. Starts the server

const express = require('express');
const path = require('path');
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


// SECURITY: Basic security headers
app.use((req, res, next) => {
  // CSP: Allow self, inline scripts/styles (for onclick handlers), data URLs for images
  // frame-src allows embedding TravellerMap.com in shared map iframe
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; connect-src 'self' ws: wss:; font-src 'self'; " +
    "frame-src https://travellermap.com https://*.travellermap.com"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Serve Operations VTT from root
app.use(express.static('public/operations'));
// Also serve from /operations for backwards compatibility
app.use('/operations', express.static('public/operations'));
// Serve lib directory for client-side modules (Stage 12.4)
app.use('/lib', express.static('lib'));
// Serve data directory for ship templates (Stage 12)
app.use('/data', express.static('data'));
app.use(express.json());

// TravellerMap tile proxy with caching
const tileProxy = require('./lib/operations/tile-proxy');

app.get('/api/map/tile', async (req, res) => {
  try {
    const { x, y, scale, options, style } = req.query;

    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing x or y parameter' });
    }

    const result = await tileProxy.getTile({
      x: parseFloat(x),
      y: parseFloat(y),
      scale: scale ? parseFloat(scale) : 64,
      options: options || '',
      style: style || ''
    });

    res.set('Content-Type', result.contentType);
    res.set('X-Cache-Source', result.source);
    res.set('Cache-Control', 'public, max-age=259200'); // 72 hours
    res.send(result.data);
  } catch (error) {
    serverLog.error('[TILE-PROXY] Error:', error.message);
    res.status(502).json({ error: 'Failed to fetch tile', message: error.message });
  }
});

// Poster/JumpMap proxy - same pattern as tile proxy
app.get('/api/map/poster', async (req, res) => {
  try {
    const { sector, hex, jump, scale, style, options } = req.query;

    if (!sector) {
      return res.status(400).json({ error: 'Missing sector parameter' });
    }

    // Build TravellerMap URL based on whether it's a jumpmap or sector poster
    let mapUrl;
    if (hex) {
      // Jump map centered on a hex
      mapUrl = `https://travellermap.com/api/jumpmap?sector=${encodeURIComponent(sector)}&hex=${hex}&jump=${jump || 2}&style=${style || 'poster'}`;
    } else {
      // Sector poster
      mapUrl = `https://travellermap.com/api/poster?sector=${encodeURIComponent(sector)}&scale=${scale || 32}&style=${style || 'poster'}`;
      if (options) mapUrl += `&options=${options}`;
    }

    // Fetch from TravellerMap
    const response = await fetch(mapUrl, {
      headers: { 'User-Agent': 'TravellerCombatVTT/1.0 (polite-cache)' }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `TravellerMap returned ${response.status}` });
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=259200'); // 72 hours
    res.send(imageBuffer);
  } catch (error) {
    serverLog.error('[POSTER-PROXY] Error:', error.message);
    res.status(502).json({ error: 'Failed to fetch poster', message: error.message });
  }
});

app.get('/api/map/cache/status', (req, res) => {
  res.json({
    stats: tileProxy.getStats(),
    info: tileProxy.getCacheInfo(),
    enabled: tileProxy.isEnabled()
  });
});

app.post('/api/map/cache/toggle', (req, res) => {
  const { enabled } = req.body;
  tileProxy.setEnabled(enabled !== false);
  res.json({ enabled: tileProxy.isEnabled() });
});

app.post('/api/map/cache/clear', (req, res) => {
  tileProxy.clearCache();
  res.json({ success: true, info: tileProxy.getCacheInfo() });
});

// AR-28: System cache endpoints (Encyclopedia data)
const systemCache = require('./lib/operations/system-cache');

app.get('/api/cache/system/:sector/:hex', (req, res) => {
  const { sector, hex } = req.params;
  const system = systemCache.getCachedSystem(sector, hex);
  res.json({ found: !!system, system });
});

app.get('/api/cache/status', (req, res) => {
  const status = systemCache.getCacheStatus();
  const stats = systemCache.getCacheStats();
  res.json({ ...status, stats });
});

app.get('/api/cache/stats', (req, res) => {
  res.json(systemCache.getCacheStats());
});

app.post('/api/cache/clear', (req, res) => {
  const { sector } = req.body || {};
  const result = systemCache.clearCache(sector);
  res.json(result);
});

// AR-29.7: Subsector data API
const fs = require('fs');
const subsectorPath = path.join(__dirname, 'data', 'subsectors');
app.get('/api/subsectors/:id', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(subsectorPath, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Subsector '${id}' not found` });
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (err) {
    console.error('Failed to load subsector:', err);
    res.status(500).json({ error: 'Failed to load subsector data' });
  }
});

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

// Operations sessions tracking
const activeSessions = state.getActiveCombats(); // Reusing for operations sessions

// SESSION 7: Performance profiling (from lib/services)
const { performanceMetrics } = services;

// Log performance metrics periodically
intervals.push(setInterval(() => {
  services.updateMetrics(connections.size, activeSessions.size);
  log.info('📊 Performance Metrics:', services.getFormattedMetrics());
}, 60000)); // Log every minute

// Socket.io connection handling
io.on('connection', (socket) => {
  const connectionId = state.incrementConnectionCount();

  connections.set(socket.id, {
    id: connectionId,
    connected: Date.now(),
    lastActivity: Date.now()
  });

  performanceMetrics.connections.total++;
  socketLog.info(`Connection ${connectionId} established (socket: ${socket.id})`);
  socketLog.info(`${connections.size} active connections`);

  // Register utility handlers (client:log, player:feedback, ping)
  const utilityHandlers = require('./lib/socket-handlers/utility.handlers');
  utilityHandlers.register(socket, io, connectionId);

  // Register Operations VTT handlers
  const operationsHandlers = require('./lib/socket-handlers/operations.handlers');
  operationsHandlers.register(socket, io, { connections, activeSessions });

  // Register disconnect handler
  const disconnectHandler = require('./lib/socket-handlers/disconnect.handler');
  socket.on('disconnect', disconnectHandler.createHandler(socket, io, {
    connections,
    activeSessions,
    connectionId
  }));
});

// API Routes
const apiRoutes = require('./lib/routes/api.routes');
apiRoutes.register(app, {
  server,
  connections,
  config
});

// Test API for automation (only in test/dev mode)
registerTestAPI(app, io, activeSessions, connections);

// Start server
server.listen(config.server.port, () => {
  log.info('========================================');
  log.info('TRAVELLER STARSHIP OPERATIONS VTT');
  log.info('========================================');
  log.info(`Server running on http://localhost:${config.server.port}`);
  log.info(`Environment: ${config.env}`);
  log.info('');
  log.info('Features:');
  log.info('- Multi-role crew stations (Captain, Pilot, Astrogator, Engineer, Gunner, etc.)');
  log.info('- Campaign management with persistent state');
  log.info('- Interstellar jump plotting and execution');
  log.info('- Sensor contacts and tactical display');
  log.info('- Weapons authorization flow (Captain → Gunner)');
  log.info('- Ship systems and damage tracking');
  log.info('- Real-time multi-player synchronization');
  log.info('');
  log.info('Instructions:');
  log.info(`1. Open http://localhost:${config.server.port}/`);
  log.info('2. GM creates campaign, players join with code');
  log.info('3. Each player selects crew role on bridge');
  log.info('4. GM advances time and manages encounters');
  log.info('');
  log.info('Database: npm run db:reset');
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
