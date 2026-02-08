/**
 * Shared broadcast helpers for socket handlers and TUI
 * Both socket handlers and TUI call these to notify connected clients.
 */

/**
 * Broadcast to all clients in a campaign room
 * @param {Object} io - Socket.io server instance
 * @param {string} room - Room name (e.g., 'ops:campaign:abc123')
 * @param {string} event - Event name to emit
 * @param {*} payload - Data to send
 */
function broadcastStateChange(io, room, event, payload) {
  if (io && room) {
    io.to(room).emit(event, payload);
  }
}

/**
 * Broadcast with visibility filtering (sensors/contacts)
 * Calls filterFn on each socket in the room to determine if they should receive the event.
 * Falls back to broadcastStateChange if no filterFn provided.
 * @param {Object} io - Socket.io server instance
 * @param {string} room - Room name
 * @param {string} event - Event name to emit
 * @param {*} payload - Data to send
 * @param {Function} [filterFn] - (socket) => boolean, return true to include
 */
function broadcastToVisible(io, room, event, payload, filterFn) {
  if (!io || !room) return;
  if (!filterFn) {
    io.to(room).emit(event, payload);
    return;
  }
  const sockets = io.sockets && io.sockets.adapter && io.sockets.adapter.rooms.get(room);
  if (!sockets) return;
  for (const socketId of sockets) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket && filterFn(socket)) {
      socket.emit(event, payload);
    }
  }
}

/**
 * Notify a specific socket (bump, relieve, assignment, error)
 * @param {Object} socket - Individual socket connection
 * @param {string} event - Event name to emit
 * @param {*} payload - Data to send
 */
function notifySocket(socket, event, payload) {
  if (socket) {
    socket.emit(event, payload);
  }
}

/**
 * Broadcast to others in room (exclude sender)
 * @param {Object} socket - Sender's socket connection
 * @param {string} room - Room name
 * @param {string} event - Event name to emit
 * @param {*} payload - Data to send
 */
function broadcastToOthers(socket, room, event, payload) {
  if (socket && room) {
    socket.to(room).emit(event, payload);
  }
}

module.exports = {
  broadcastStateChange,
  broadcastToVisible,
  notifySocket,
  broadcastToOthers
};
