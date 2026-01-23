/**
 * AR-250: Socket.io Setup Module
 *
 * Socket.io configuration, CORS, and connection handling.
 * Extracted from server.js for separation of concerns.
 *
 * @module lib/server/socket-setup
 */

const { socketAuthMiddleware } = require('../auth/middleware/socket-auth');

/**
 * Get allowed origins for CORS
 * @returns {string[]} Array of allowed origins
 */
function getAllowedOrigins() {
  const origins = [];

  // User-specified origins take priority
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()));
  }

  // Auto-detect Render.com deployment
  if (process.env.RENDER_EXTERNAL_URL) {
    origins.push(process.env.RENDER_EXTERNAL_URL);
  }

  // Render.com service name
  if (process.env.RENDER && process.env.RENDER_SERVICE_NAME) {
    origins.push(`https://${process.env.RENDER_SERVICE_NAME}.onrender.com`);
  }

  // Fallback known Render URL
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    origins.push('https://traveller-starship-operations-vtt.onrender.com');
  }

  // Auto-detect Fly.io deployment
  if (process.env.FLY_APP_NAME) {
    origins.push(`https://${process.env.FLY_APP_NAME}.fly.dev`);
  }

  // Fallback known Fly.io URL
  if (process.env.NODE_ENV === 'production') {
    origins.push('https://traveller-starship-operations-vtt.fly.dev');
  }

  // Development defaults
  if (origins.length === 0) {
    return ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080'];
  }

  return origins;
}

/**
 * Create Socket.io CORS configuration
 * @returns {object} CORS config object
 */
function createCorsConfig() {
  return {
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();

      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development, also allow any localhost
      if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        return callback(null, true);
      }

      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true
  };
}

/**
 * Create Socket.io server configuration
 * @returns {object} Socket.io config
 */
function createSocketConfig() {
  return {
    cors: createCorsConfig(),
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true
  };
}

/**
 * Configure Socket.io server
 * @param {Server} io - Socket.io server instance
 * @param {object} options - Configuration options
 */
function configureSocket(io, options = {}) {
  const { log = console } = options;

  // Connection logging
  io.on('connection', (socket) => {
    log.info?.(`[Socket] New connection: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      log.info?.(`[Socket] Disconnect: ${socket.id} (${reason})`);
    });

    socket.on('error', (err) => {
      log.error?.(`[Socket] Error on ${socket.id}: ${err.message}`);
    });
  });

  // Authentication middleware
  io.use(socketAuthMiddleware);
}

/**
 * Get socket room helpers
 * @param {Server} io
 * @returns {object} Room helper functions
 */
function getRoomHelpers(io) {
  return {
    /**
     * Get sockets in a room
     * @param {string} room
     * @returns {Promise<Set>}
     */
    async getSocketsInRoom(room) {
      return io.in(room).allSockets();
    },

    /**
     * Broadcast to room
     * @param {string} room
     * @param {string} event
     * @param {object} data
     */
    broadcastToRoom(room, event, data) {
      io.to(room).emit(event, data);
    },

    /**
     * Get room count
     * @param {string} room
     * @returns {Promise<number>}
     */
    async getRoomCount(room) {
      const sockets = await io.in(room).allSockets();
      return sockets.size;
    }
  };
}

module.exports = {
  getAllowedOrigins,
  createCorsConfig,
  createSocketConfig,
  configureSocket,
  getRoomHelpers
};
