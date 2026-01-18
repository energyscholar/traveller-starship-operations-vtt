/**
 * Core Operations Handlers
 * Handles: ping, reconnect, puppeteer auth
 */

/**
 * Register core handlers
 * @param {Object} ctx - Shared context from context.js
 */
function register(ctx) {
  const { socket, io, opsSession, operations, socketLog, connectedSockets, slotReservations } = ctx;

  // Helper: update activity on every event to prevent idle disconnect
  const keepAlive = () => ctx.updateConnectionActivity(socket.id);

  // Update activity on any ops: event (use onAny for catch-all)
  socket.onAny((eventName) => {
    if (eventName.startsWith('ops:')) {
      keepAlive();
    }
  });

  // Heartbeat to keep connection alive
  socket.on('ops:ping', () => {
    keepAlive();
    socket.emit('ops:pong');
  });

  // --- PUP-A1: Puppeteer Authentication Handler ---
  socket.on('ops:puppeteerAuth', (data, callback) => {
    try {
      const { testKey, testMode } = data || {};

      // SECURITY: In production, only accept explicit PUPPETEER_TEST_KEY
      // In dev/test, also accept any testKey starting with 'test_'
      const isProd = process.env.NODE_ENV === 'production';
      const isValidKey = testKey && (
        testKey === process.env.PUPPETEER_TEST_KEY ||
        (!isProd && testKey.startsWith('test_'))
      );

      if (!isValidKey) {
        socketLog.warn(`[OPS] Puppeteer auth failed: invalid test key from ${socket.id}`);
        if (callback) callback({ success: false, error: 'Invalid test key' });
        return;
      }

      // Mark this socket as a Puppeteer/test connection
      opsSession.isPuppeteer = true;
      opsSession.testMode = testMode || 'standard';

      socketLog.info(`[OPS] Puppeteer authenticated: ${socket.id} (mode: ${opsSession.testMode})`);

      if (callback) {
        callback({
          success: true,
          capabilities: {
            canResetDb: true,
            canSimulateTime: true,
            canInjectContacts: true,
            canBypassAuth: true
          },
          socketId: socket.id
        });
      }
    } catch (err) {
      socketLog.error('[OPS] Puppeteer auth error:', err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // Puppeteer test utility: Get current server state for assertions
  socket.on('ops:puppeteerGetState', (data, callback) => {
    if (!opsSession.isPuppeteer) {
      if (callback) callback({ success: false, error: 'Not authenticated as Puppeteer' });
      return;
    }

    try {
      const { campaignId } = data || {};
      const result = {
        success: true,
        session: { ...opsSession },
        connectedSockets: connectedSockets.size
      };

      if (campaignId) {
        result.campaign = operations.getCampaign(campaignId);
        result.players = operations.getPlayerAccountsByCampaign(campaignId);
        result.ships = operations.getShipsByCampaign(campaignId, true);
      }

      if (callback) callback(result);
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // --- Session Reconnect ---
  socket.on('ops:reconnect', (data) => {
    try {
      const { campaignId, accountId, shipId, role, isGM } = data;

      const campaign = operations.getCampaign(campaignId);
      if (!campaign) {
        socket.emit('ops:reconnectFailed', { reason: 'Campaign not found' });
        return;
      }

      if (isGM) {
        opsSession.campaignId = campaignId;
        opsSession.isGM = true;
        socket.join(`ops:campaign:${campaignId}`);
        const players = operations.getPlayerAccountsByCampaign(campaignId);
        const ships = operations.getShipsByCampaign(campaignId, true);
        socket.emit('ops:reconnected', {
          screen: 'gm-setup',
          campaign,
          players,
          ships
        });
        socketLog.info(`[OPS] GM reconnected to campaign: ${campaignId}`);
      } else if (accountId) {
        const account = operations.getPlayerAccount(accountId);
        if (!account) {
          socket.emit('ops:reconnectFailed', { reason: 'Player slot not found' });
          return;
        }

        if (slotReservations.has(accountId) && slotReservations.get(accountId) !== socket.id) {
          socket.emit('ops:reconnectFailed', { reason: 'Slot in use by another connection' });
          return;
        }

        slotReservations.set(accountId, socket.id);
        // Set up session (opsSession is already in connectedSockets by reference)
        opsSession.campaignId = campaignId;
        opsSession.accountId = accountId;
        opsSession.shipId = shipId || null;
        opsSession.role = role || null;
        socket.join(`ops:campaign:${campaignId}`);

        if (shipId && role) {
          const ship = operations.getShip(shipId);
          if (ship) {
            socket.join(`ops:bridge:${shipId}`);
            const crew = operations.getPlayersByShip(shipId);
            const logs = operations.getShipLog(shipId, 50);
            socket.emit('ops:reconnected', {
              screen: 'bridge',
              campaign,
              ship,
              crew,
              role,
              logs
            });
            socketLog.info(`[OPS] Player reconnected to bridge: ${accountId} as ${role}`);
          } else {
            socket.emit('ops:reconnectFailed', { reason: 'Ship not found' });
          }
        } else {
          const ships = operations.getPartyShips(campaignId);
          socket.emit('ops:reconnected', {
            screen: 'player-setup',
            campaign,
            account,
            ships,
            availableRoles: operations.ALL_ROLES
          });
          socketLog.info(`[OPS] Player reconnected to setup: ${accountId}`);
        }
      } else {
        socket.emit('ops:reconnectFailed', { reason: 'Invalid reconnect data' });
      }
    } catch (error) {
      socket.emit('ops:reconnectFailed', { reason: error.message });
      socketLog.error('[OPS] Error reconnecting:', error);
    }
  });
}

module.exports = { register };
