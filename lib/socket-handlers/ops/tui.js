/**
 * TUI Socket Handlers - Web TUI relay
 * Connects xterm.js client to TUI menu system
 */

const { WebSocketSession } = require('../../tui/websocket-session');
const { isAuthRequired } = require('../../config/auth-config');

// Track active TUI sessions per socket
const tuiSessions = new Map();

/**
 * Register TUI handlers
 * @param {Object} ctx - Handler context
 */
function register(ctx) {
  const { socket, socketLog } = ctx;

  // Connect to TUI (accepts optional { role, player } payload)
  socket.on('tui:connect', async (payload) => {
    try {
      const data = payload || {};
      const role = typeof data.role === 'string' ? data.role.toLowerCase() : null;
      const player = typeof data.player === 'string' ? data.player : null;

      // Check auth if required
      if (isAuthRequired() && !socket.user) {
        socketLog.warn(`[TUI] Unauthorized connect attempt: ${socket.id}`);
        socket.emit('tui:error', { message: 'Authentication required' });
        return;
      }

      // Clean up existing session if any
      if (tuiSessions.has(socket.id)) {
        const oldSession = tuiSessions.get(socket.id);
        oldSession.close();
        tuiSessions.delete(socket.id);
      }

      // Create new WebSocket session with identity
      const session = new WebSocketSession(socket, { role, player });
      tuiSessions.set(socket.id, session);

      socketLog.info(`[TUI] WebSocket TUI connected: ${socket.id}${player ? ` player=${player}` : ''}${role ? ` role=${role}` : ''}`);

      // Notify client that connection is ready
      socket.emit('tui:connected');

      // Start the TUI main menu
      // Import dynamically to avoid circular dependencies
      const { main } = require('../../../bin/tui-menu');

      // Pass role option to skip main menu if provided
      const menuOptions = {};
      if (role) menuOptions.role = role;

      // Run TUI in background - it will use the session for I/O
      main(session, menuOptions).catch((err) => {
        socketLog.error(`[TUI] Menu error: ${err.message}`);
        socket.emit('tui:error', { message: err.message });
      }).finally(() => {
        // Clean up when TUI exits
        if (tuiSessions.has(socket.id)) {
          tuiSessions.delete(socket.id);
          socket.emit('tui:closed');
        }
      });

    } catch (error) {
      socketLog.error(`[TUI] Connect error: ${error.message}`);
      socket.emit('tui:error', { message: error.message });
    }
  });

  // Handle input from client
  socket.on('tui:input', (data) => {
    // Input is forwarded directly via the session's socket listeners
    // The WebSocketSession handles this via its registered handlers
  });

  // Token refresh heartbeat
  socket.on('tui:heartbeat', () => {
    // Check if session is still valid
    if (!tuiSessions.has(socket.id)) {
      socket.emit('tui:heartbeat:ack', { valid: false, reason: 'no_session' });
      return;
    }

    // Check auth if required
    if (isAuthRequired() && !socket.user) {
      socket.emit('tui:heartbeat:ack', { valid: false, reason: 'auth_expired' });
      return;
    }

    socket.emit('tui:heartbeat:ack', { valid: true });
  });

  // Disconnect from TUI
  socket.on('tui:disconnect', () => {
    const session = tuiSessions.get(socket.id);
    if (session) {
      session.close();
      tuiSessions.delete(socket.id);
      socketLog.info(`[TUI] WebSocket TUI disconnected: ${socket.id}`);
    }
  });

  // GM Narration — broadcast narrative text to all connected TUI sessions
  socket.on('gm:narration', (payload) => {
    const { opsSession, io } = ctx;
    if (!opsSession.isGM) {
      socket.emit('tui:error', { message: 'GM only' });
      return;
    }

    const data = payload || {};
    const text = typeof data.text === 'string' ? data.text : '';
    const source = typeof data.source === 'string' ? data.source : 'manual';

    if (!text) {
      socket.emit('tui:error', { message: 'Narration text required' });
      return;
    }

    socketLog.info(`[TUI] GM narration from ${source}: ${text.substring(0, 80)}...`);

    // Broadcast narration to all TUI sessions via their sockets
    for (const [socketId, session] of tuiSessions) {
      session.socket.emit('tui:narration', { text, source });
    }
  });

  // GM Note — private note stored for session review (NOT broadcast to players)
  socket.on('gm:note', (payload) => {
    const { opsSession, operations } = ctx;
    if (!opsSession.isGM) {
      socket.emit('tui:error', { message: 'GM only' });
      return;
    }

    const data = payload || {};
    const text = typeof data.text === 'string' ? data.text : '';
    const category = typeof data.category === 'string' ? data.category : 'general';

    if (!text) {
      socket.emit('tui:error', { message: 'Note text required' });
      return;
    }

    socketLog.info(`[TUI] GM note [${category}]: ${text.substring(0, 80)}`);

    // Store as log entry if campaign/ship context available
    if (opsSession.shipId && opsSession.campaignId) {
      try {
        operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
          type: 'gm_note',
          category,
          text,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        socketLog.warn(`[TUI] Failed to store GM note: ${e.message}`);
      }
    }

    // Acknowledge receipt to sender only
    socket.emit('gm:note:ack', { stored: true, category });
  });

  // Clean up on socket disconnect
  socket.on('disconnect', () => {
    const session = tuiSessions.get(socket.id);
    if (session) {
      session.close();
      tuiSessions.delete(socket.id);
    }
  });
}

module.exports = { register, tuiSessions };
