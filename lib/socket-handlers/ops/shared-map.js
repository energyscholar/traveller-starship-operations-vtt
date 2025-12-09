/**
 * AR-27: Shared Map Socket Handlers
 * Handles: shareMap, unshareMap, updateMapView, getMapState
 */

const sharedMap = require('../../operations/shared-map');

/**
 * Register shared map handlers
 * @param {Object} ctx - Shared context from context.js
 */
function register(ctx) {
  const { socket, io, opsSession, socketLog, sanitizeError } = ctx;

  // GM shares map with all players
  socket.on('ops:shareMap', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can share the map' });
        return;
      }
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }

      const { center, sector, hex, zoom } = data || {};
      const state = sharedMap.shareMap(opsSession.campaignId, {
        center,
        sector,
        hex,
        zoom,
        sharedBy: socket.id
      });

      // Broadcast to all in campaign - they should auto-switch to map view
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:mapShared', {
        ...state,
        autoSwitch: true
      });

      socketLog.info(`[OPS] Map shared for campaign: ${opsSession.campaignId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Map', error));
      socketLog.error('[OPS] Error sharing map:', error);
    }
  });

  // GM stops sharing map
  socket.on('ops:unshareMap', () => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can unshare the map' });
        return;
      }
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }

      sharedMap.unshareMap(opsSession.campaignId);

      // Broadcast to all - they should return to role panels
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:mapUnshared', {});

      socketLog.info(`[OPS] Map unshared for campaign: ${opsSession.campaignId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Map', error));
      socketLog.error('[OPS] Error unsharing map:', error);
    }
  });

  // GM updates map view (pan/zoom) - all players follow
  socket.on('ops:updateMapView', (data) => {
    try {
      if (!opsSession.isGM) {
        // Non-GM can't update shared view
        return;
      }
      if (!opsSession.campaignId) {
        return;
      }

      const { center, sector, hex, scale, style, zoom } = data || {};
      const state = sharedMap.updateMapView(opsSession.campaignId, {
        center,
        sector,
        hex,
        scale,
        style,
        zoom
      });

      // Broadcast updated view to all players
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:mapViewUpdated', state);
      socketLog.info(`[OPS] Map view updated: ${sector}/${hex} scale=${scale}`);
    } catch (error) {
      socketLog.error('[OPS] Error updating map view:', error);
    }
  });

  // Get current map state (for reconnecting clients)
  socket.on('ops:getMapState', () => {
    try {
      if (!opsSession.campaignId) {
        socket.emit('ops:mapState', { shared: false });
        return;
      }

      const state = sharedMap.getMapState(opsSession.campaignId);
      socket.emit('ops:mapState', state);
    } catch (error) {
      socket.emit('ops:mapState', { shared: false });
    }
  });

  // AR-28: Start system cache (GM only)
  socket.on('ops:startCaching', async (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can start caching' });
        return;
      }

      const systemCache = require('../../operations/system-cache');
      const { sector, hex } = data || {};

      if (!sector || !hex) {
        socket.emit('ops:error', { message: 'Sector and hex required' });
        return;
      }

      const result = await systemCache.startCaching(sector, hex, (progress) => {
        // Send progress to GM
        socket.emit('ops:cacheProgress', progress);
      });

      socket.emit('ops:cacheStarted', result);
      socketLog.info(`[OPS] Cache started: ${sector} from ${hex}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Cache', error));
      socketLog.error('[OPS] Error starting cache:', error);
    }
  });

  // AR-28: Stop system cache (GM only)
  socket.on('ops:stopCaching', () => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can stop caching' });
        return;
      }

      const systemCache = require('../../operations/system-cache');
      const result = systemCache.stopCaching('manual');
      socket.emit('ops:cacheStopped', result);
      socketLog.info('[OPS] Cache stopped manually');
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Cache', error));
    }
  });

  // AR-28: Get cache status
  socket.on('ops:getCacheStatus', () => {
    try {
      const systemCache = require('../../operations/system-cache');
      const status = systemCache.getCacheStatus();
      const stats = systemCache.getCacheStats();
      socket.emit('ops:cacheStatus', { ...status, stats });
    } catch (error) {
      socket.emit('ops:cacheStatus', { running: false, error: error.message });
    }
  });

  // AR-28: Get cached system data
  socket.on('ops:getCachedSystem', (data) => {
    try {
      const systemCache = require('../../operations/system-cache');
      const { sector, hex } = data || {};

      if (!sector || !hex) {
        socket.emit('ops:cachedSystem', { found: false });
        return;
      }

      const system = systemCache.getCachedSystem(sector, hex);
      socket.emit('ops:cachedSystem', {
        found: !!system,
        system
      });
    } catch (error) {
      socket.emit('ops:cachedSystem', { found: false, error: error.message });
    }
  });

  // AR-38: Clear cache and refresh (GM only)
  socket.on('ops:clearCache', async (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can clear cache' });
        return;
      }

      const systemCache = require('../../operations/system-cache');
      const { sector } = data || {};

      // Clear cache for specific sector or all
      const result = systemCache.clearCache(sector);
      systemCache.resetCacheStats();

      socket.emit('ops:cacheCleared', {
        success: true,
        sector: sector || 'all',
        ...result
      });

      socketLog.info(`[OPS] Cache cleared: ${sector || 'all sectors'}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Cache', error));
      socketLog.error('[OPS] Error clearing cache:', error);
    }
  });
}

module.exports = { register };
