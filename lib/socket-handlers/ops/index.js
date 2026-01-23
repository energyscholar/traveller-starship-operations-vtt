/**
 * Operations Handler Registry
 * Thin orchestrator that imports and registers all handler modules
 *
 * Pattern: Module Registry with Shared Context
 * Each module exports a register(ctx) function that registers socket handlers
 */

const { createContext, connectedSockets, slotReservations, campaignCombatState, getConnectedPlayers, isSlotReserved } = require('./context');

// Handler modules
const coreHandlers = require('./core');
const campaignHandlers = require('./campaign');
const playerHandlers = require('./player');
const bridgeHandlers = require('./bridge');
const sensorsHandlers = require('./sensors');
const shipHandlers = require('./ship');
const engineeringHandlers = require('./engineering');
const astrogationHandlers = require('./astrogation');
const fuelHandlers = require('./fuel');
const gmHandlers = require('./gm');
const commsHandlers = require('./comms');
const combatHandlers = require('./combat');
const feedbackHandlers = require('./feedback');
const sharedMapHandlers = require('./shared-map');
const captainHandlers = require('./captain');
const starSystemHandlers = require('./star-system');
const pilotHandlers = require('./pilot');
const aiNpcHandlers = require('./ai-npc');
const medicHandlers = require('./medic');
const stewardHandlers = require('./steward');
const libraryHandlers = require('./library');
const chatHandlers = require('./chat');
const tuiHandlers = require('./tui');

// Registry of all handler modules
const handlerModules = [
  coreHandlers,
  campaignHandlers,
  playerHandlers,
  bridgeHandlers,
  sensorsHandlers,
  shipHandlers,
  engineeringHandlers,
  astrogationHandlers,
  fuelHandlers,
  gmHandlers,
  commsHandlers,
  combatHandlers,
  feedbackHandlers,
  sharedMapHandlers,
  captainHandlers,
  starSystemHandlers,
  pilotHandlers,
  aiNpcHandlers,
  medicHandlers,
  stewardHandlers,
  libraryHandlers,
  chatHandlers,
  tuiHandlers
];

/**
 * Register all operations socket handlers for a connection
 * @param {Socket} socket - Socket.io socket instance
 * @param {Object} io - Socket.io server instance
 */
function register(socket, io) {
  // Create session state for this socket
  const opsSession = {
    campaignId: null,
    shipId: null,
    accountId: null,
    isGM: false,
    isGuest: false,
    guestName: null,
    role: null,
    playerName: null
  };

  // Create shared context for all handlers
  const ctx = createContext(socket, io, opsSession);

  // Track this connection
  connectedSockets.set(socket.id, opsSession);

  // Register all handler modules
  for (const module of handlerModules) {
    module.register(ctx);
  }

  // AR-168: Debug handler to forward client logs to server console
  socket.on('ops:clientDebug', (data) => {
    const { socket: socketLog } = require('../../logger');
    socketLog.info(`[CLIENT] ${data.tag || 'DEBUG'}:`, data.message, data.data || '');
  });

  // Disconnect handler - cleanup connection tracking
  socket.on('disconnect', () => {
    try {
      // AR-108.2: Remove all event listeners to prevent memory leak on reconnect
      socket.removeAllListeners();
      if (opsSession.accountId) {
        slotReservations.delete(opsSession.accountId);
        if (opsSession.campaignId) {
          io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:slotStatusUpdate', {
            accountId: opsSession.accountId,
            status: 'available'
          });
          io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:crewUpdate', {
            action: 'disconnected',
            accountId: opsSession.accountId,
            role: opsSession.role,
            shipId: opsSession.shipId
          });
        }
      }
      connectedSockets.delete(socket.id);
      const { socket: socketLog } = require('../../logger');
      socketLog.info(`[OPS] Socket disconnected: ${socket.id}, released slot: ${opsSession.accountId || 'none'}`);
    } catch (error) {
      const { socket: socketLog } = require('../../logger');
      socketLog.error('[OPS] Error handling disconnect:', error);
    }
  });
}

module.exports = {
  register,
  getConnectedPlayers,
  isSlotReserved,
  connectedSockets,
  slotReservations,
  campaignCombatState
};
