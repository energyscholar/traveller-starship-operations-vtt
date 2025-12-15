/**
 * API Routes
 * REST API endpoints for the Traveller Combat VTT
 */

const { resolveAttack, formatAttackResult, getAttackBreakdown, SHIPS } = require('../combat');
const travellerMap = require('../travellermap');

/**
 * Register API routes
 * @param {Express} app - Express application
 * @param {Object} deps - Dependencies { server, connections, gameState, getShipAssignments }
 */
function register(app, deps) {
  const { server, connections, gameState, getShipAssignments, config } = deps;

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
    const memUsage = process.memoryUsage();
    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: require('../../package.json').version,
      environment: config.env || process.env.NODE_ENV || 'development',
      metrics: {
        connections: connections?.size || 0,
        activeCombats: gameState?.activeCombats?.size || 0,
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
        }
      }
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
        socketIOReady: true
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

  // ============ TravellerMap Proxy API (Stage 4 - Autorun 3) ============

  // Search for worlds by name or attributes
  // GET /api/travellermap/search?q=Regina
  app.get('/api/travellermap/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: 'Missing search query (q)' });
      }
      const result = await travellerMap.searchWorlds(q);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get world data at specific location
  // GET /api/travellermap/world?sector=Spinward+Marches&hex=1910
  app.get('/api/travellermap/world', async (req, res) => {
    try {
      const { sector, hex } = req.query;
      if (!sector || !hex) {
        return res.status(400).json({ error: 'Missing sector or hex parameter' });
      }
      const result = await travellerMap.getWorld(sector, hex);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get worlds within jump range
  // GET /api/travellermap/jumpworlds?sector=Spinward+Marches&hex=1910&jump=2
  app.get('/api/travellermap/jumpworlds', async (req, res) => {
    try {
      const { sector, hex, jump = 2 } = req.query;
      if (!sector || !hex) {
        return res.status(400).json({ error: 'Missing sector or hex parameter' });
      }
      const result = await travellerMap.getJumpWorlds(sector, hex, parseInt(jump, 10));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Proxy jump map image (to avoid CORS issues)
  // GET /api/travellermap/jumpmap?sector=Spinward+Marches&hex=1910&jump=2&style=terminal
  app.get('/api/travellermap/jumpmap', async (req, res) => {
    try {
      const { sector, hex, jump = 2, style = 'terminal' } = req.query;
      if (!sector || !hex) {
        return res.status(400).json({ error: 'Missing sector or hex parameter' });
      }
      const { buffer, contentType } = await travellerMap.getJumpMapImage(
        sector,
        hex,
        parseInt(jump, 10),
        style
      );
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=86400'); // 24 hour browser cache
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get sector metadata
  // GET /api/travellermap/sector?sector=Spinward+Marches
  app.get('/api/travellermap/sector', async (req, res) => {
    try {
      const { sector } = req.query;
      if (!sector) {
        return res.status(400).json({ error: 'Missing sector parameter' });
      }
      const result = await travellerMap.getSectorData(sector);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // AR-121: Calculate jump route between worlds
  // GET /api/travellermap/route?startSector=Spinward+Marches&startHex=1910&endSector=Spinward+Marches&endHex=0807&jump=2
  app.get('/api/travellermap/route', async (req, res) => {
    try {
      const { startSector, startHex, endSector, endHex, jump = 2 } = req.query;
      if (!startSector || !startHex || !endSector || !endHex) {
        return res.status(400).json({
          error: 'Missing required parameters: startSector, startHex, endSector, endHex'
        });
      }
      const result = await travellerMap.getJumpRoute(
        startSector,
        startHex,
        endSector,
        endHex,
        parseInt(jump, 10)
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // AR-121: Convert coordinates
  // GET /api/travellermap/coordinates?sector=Spinward+Marches&hex=1910
  app.get('/api/travellermap/coordinates', async (req, res) => {
    try {
      const { sector, hex } = req.query;
      if (!sector || !hex) {
        return res.status(400).json({ error: 'Missing sector or hex parameter' });
      }
      const result = await travellerMap.getCoordinates(sector, hex);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // AR-121: List all available sectors
  // GET /api/travellermap/sectors
  app.get('/api/travellermap/sectors', async (req, res) => {
    try {
      const result = await travellerMap.listSectors();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Cache statistics
  // GET /api/travellermap/cache/stats
  app.get('/api/travellermap/cache/stats', (req, res) => {
    const stats = travellerMap.getCacheStats();
    res.json(stats);
  });

  // Clear cache (admin operation)
  // POST /api/travellermap/cache/clear
  app.post('/api/travellermap/cache/clear', (req, res) => {
    travellerMap.clearCache();
    res.json({ success: true, message: 'Cache cleared' });
  });

}

module.exports = {
  register
};
