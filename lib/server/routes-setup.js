/**
 * AR-250: Routes Setup Module
 *
 * REST API route registration.
 * Extracted from server.js for separation of concerns.
 *
 * @module lib/server/routes-setup
 */

const path = require('path');
const fs = require('fs');

/**
 * Register version endpoint
 * @param {express.Application} app
 */
function registerVersionRoute(app) {
  const pkg = require('../../package.json');

  app.get('/api/version', (req, res) => {
    res.json({ version: pkg.version });
  });
}

/**
 * Register map proxy routes
 * @param {express.Application} app
 * @param {object} options
 * @param {object} options.tileProxy - Tile proxy module
 * @param {object} options.log - Logger
 */
function registerMapRoutes(app, { tileProxy, log }) {
  // Tile proxy
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
      log.error('[TILE-PROXY] Error:', error.message);
      res.status(502).json({ error: 'Failed to fetch tile', message: error.message });
    }
  });

  // Poster/JumpMap proxy
  app.get('/api/map/poster', async (req, res) => {
    try {
      const { sector, hex, jump, scale, style, options } = req.query;

      if (!sector) {
        return res.status(400).json({ error: 'Missing sector parameter' });
      }

      let mapUrl;
      if (hex) {
        mapUrl = `https://travellermap.com/api/jumpmap?sector=${encodeURIComponent(sector)}&hex=${hex}&jump=${jump || 2}&style=${style || 'poster'}`;
      } else {
        mapUrl = `https://travellermap.com/api/poster?sector=${encodeURIComponent(sector)}&scale=${scale || 32}&style=${style || 'poster'}`;
        if (options) mapUrl += `&options=${options}`;
      }

      const response = await fetch(mapUrl, {
        headers: { 'User-Agent': 'TravellerCombatVTT/1.0 (polite-cache)' }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `TravellerMap returned ${response.status}` });
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());

      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=259200');
      res.send(imageBuffer);
    } catch (error) {
      log.error('[POSTER-PROXY] Error:', error.message);
      res.status(502).json({ error: 'Failed to fetch poster', message: error.message });
    }
  });

  // Cache status/control
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
}

/**
 * Register system cache routes
 * @param {express.Application} app
 * @param {object} systemCache - System cache module
 */
function registerCacheRoutes(app, systemCache) {
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
}

/**
 * Register subsector routes
 * @param {express.Application} app
 */
function registerSubsectorRoutes(app) {
  const subsectorPath = path.join(__dirname, '../../data/subsectors');

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
}

/**
 * Register TravellerMap API routes
 * @param {express.Application} app
 * @param {object} travellerMapClient - TravellerMap client module
 */
function registerTravellerMapRoutes(app, travellerMapClient) {
  // Fetch subsector
  app.get('/api/travellermap/subsector/:sector/:subsector', async (req, res) => {
    const { sector, subsector } = req.params;
    try {
      const data = await travellerMapClient.getSubsector(sector, subsector);
      res.json(data);
    } catch (err) {
      console.error(`[TravellerMap] Failed to fetch ${sector}/${subsector}:`, err.message);
      res.status(500).json({ error: `Failed to fetch subsector: ${err.message}` });
    }
  });

  // Fetch sector
  app.get('/api/travellermap/sector/:sector', async (req, res) => {
    const { sector } = req.params;
    try {
      const data = await travellerMapClient.getSector(sector);
      res.json(data);
    } catch (err) {
      console.error(`[TravellerMap] Failed to fetch sector ${sector}:`, err.message);
      res.status(500).json({ error: `Failed to fetch sector: ${err.message}` });
    }
  });

  // World search
  app.get('/api/travellermap/search', async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" required' });
    }
    try {
      const results = await travellerMapClient.searchWorld(q);
      res.json({ results });
    } catch (err) {
      console.error(`[TravellerMap] Search failed:`, err.message);
      res.status(500).json({ error: `Search failed: ${err.message}` });
    }
  });

  // Cache control
  app.get('/api/travellermap/cache/status', (req, res) => {
    res.json({ enabled: travellerMapClient.isCacheEnabled() });
  });

  app.post('/api/travellermap/cache/toggle', (req, res) => {
    const { enabled } = req.body;
    travellerMapClient.setCacheEnabled(enabled !== false);
    res.json({ enabled: travellerMapClient.isCacheEnabled() });
  });

  app.post('/api/travellermap/cache/clear', (req, res) => {
    travellerMapClient.clearCache();
    res.json({ cleared: true });
  });
}

/**
 * AR-300: Register Solo Demo reset endpoint (for E2E tests)
 * @param {express.Application} app
 */
function registerTestRoutes(app) {
  app.get('/api/reset-solo-demo', (req, res) => {
    try {
      const { seedSoloDemoCampaign, SOLO_DEMO_CAMPAIGN_ID } = require('../operations/seed-solo-demo');
      seedSoloDemoCampaign(true);  // Force reset
      res.json({
        success: true,
        campaignId: SOLO_DEMO_CAMPAIGN_ID,
        message: 'Solo Demo reset to fresh state'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

/**
 * Register all API routes
 * @param {express.Application} app
 * @param {object} options
 */
function registerAllRoutes(app, options = {}) {
  const {
    tileProxy = require('../operations/tile-proxy'),
    systemCache = require('../operations/system-cache'),
    travellerMapClient = require('../traveller-map-client'),
    log = console
  } = options;

  registerVersionRoute(app);
  registerMapRoutes(app, { tileProxy, log });
  registerCacheRoutes(app, systemCache);
  registerSubsectorRoutes(app);
  registerTravellerMapRoutes(app, travellerMapClient);
  registerTestRoutes(app);
}

module.exports = {
  registerVersionRoute,
  registerMapRoutes,
  registerCacheRoutes,
  registerSubsectorRoutes,
  registerTravellerMapRoutes,
  registerTestRoutes,
  registerAllRoutes
};
