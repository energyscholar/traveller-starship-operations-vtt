// Traveller Combat VTT - Configuration
// Central configuration file for all application settings

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    // Disable browser caching for JS/CSS/HTML files
    // Default: true in dev (cache off), false in prod (cache on)
    disableCache: process.env.DISABLE_CACHE !== undefined
      ? process.env.DISABLE_CACHE === 'true'
      : process.env.NODE_ENV !== 'production'
  },

  // Logging Configuration
  logging: {
    // Log level: error, warn, info, debug
    level: process.env.LOG_LEVEL || 'debug',

    // Enable/disable client log forwarding to server
    clientLogging: process.env.CLIENT_LOGGING !== 'false', // Default: true

    // Log file settings (for future use)
    enableFileLogging: process.env.LOG_TO_FILE === 'true', // Default: false
    logDirectory: process.env.LOG_DIR || './logs',

    // Console output colorization
    colorize: process.env.LOG_COLORIZE !== 'false' // Default: true
  },

  // Game Configuration
  // NOTE: These values are not yet wired into application code. See audit 2026-02-11.
  game: {
    turnTimer: parseInt(process.env.TURN_TIMER) || 30,
    autoAssignShips: process.env.AUTO_ASSIGN !== 'false',
    defaultRange: process.env.DEFAULT_RANGE || 'Medium'
  },

  // Environment
  env: process.env.NODE_ENV || 'development',

  // Feature flags
  // NOTE: These values are not yet wired into application code. See audit 2026-02-11.
  features: {
    testMode: process.env.ENABLE_TEST_MODE === 'true',
    debugMode: process.env.DEBUG === 'true'
  },

  // AR-28: Encyclopedia Data Cache
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',  // Default: true
    parsecRadius: parseInt(process.env.CACHE_PARSEC_RADIUS) || 6,  // 1-10 parsecs
    delaySeconds: parseInt(process.env.CACHE_DELAY_SECONDS) || 30,  // Seconds between fetches
    maxDurationMinutes: parseInt(process.env.CACHE_MAX_DURATION) || 5,  // Auto-stop after
    ttlDays: parseInt(process.env.CACHE_TTL_DAYS) || 365,  // Cache expiration (1 year for subsector data)
    debug: process.env.CACHE_DEBUG === 'true'  // Show debug toasts on map
  }
};
