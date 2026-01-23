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

  // Connect to TUI
  socket.on('tui:connect', async () => {
    try {
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

      // Create new WebSocket session
      const session = new WebSocketSession(socket);
      tuiSessions.set(socket.id, session);

      socketLog.info(`[TUI] WebSocket TUI connected: ${socket.id}`);

      // Notify client that connection is ready
      socket.emit('tui:connected');

      // Start the TUI main menu
      // Import dynamically to avoid circular dependencies
      const { main } = require('../../../bin/tui-menu');

      // Run TUI in background - it will use the session for I/O
      main(session).catch((err) => {
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

  // Disconnect from TUI
  socket.on('tui:disconnect', () => {
    const session = tuiSessions.get(socket.id);
    if (session) {
      session.close();
      tuiSessions.delete(socket.id);
      socketLog.info(`[TUI] WebSocket TUI disconnected: ${socket.id}`);
    }
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
