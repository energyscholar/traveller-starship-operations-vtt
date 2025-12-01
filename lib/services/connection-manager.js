/**
 * Connection Manager Service
 * Tracks connection activity and handles idle connection cleanup
 */

const state = require('../state');

// Connection management constants
const IDLE_TIMEOUT_MS = 300000; // 5 minutes (was 30 seconds - too aggressive for Operations UI)
const CONNECTION_CHECK_INTERVAL = 10000; // Check every 10 seconds

/**
 * Update connection activity timestamp
 * @param {string} socketId - Socket ID
 */
function updateConnectionActivity(socketId) {
  const conn = state.getConnection(socketId);
  if (conn) {
    conn.lastActivity = Date.now();
  }
}

/**
 * Check if a connection is idle
 * @param {Object} conn - Connection object
 * @returns {boolean} True if idle
 */
function isConnectionIdle(conn) {
  const now = Date.now();
  const idleTime = now - conn.lastActivity;
  return idleTime > IDLE_TIMEOUT_MS;
}

/**
 * Get idle connections
 * @returns {Array} Array of [socketId, conn] pairs that are idle
 */
function getIdleConnections() {
  const connections = state.getConnections();
  const idle = [];

  for (const [socketId, conn] of connections.entries()) {
    if (isConnectionIdle(conn)) {
      idle.push([socketId, conn]);
    }
  }

  return idle;
}

module.exports = {
  IDLE_TIMEOUT_MS,
  CONNECTION_CHECK_INTERVAL,
  updateConnectionActivity,
  isConnectionIdle,
  getIdleConnections
};
