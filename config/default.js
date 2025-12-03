/**
 * Default Configuration
 * Base settings shared across all environments
 */

module.exports = {
  // Server settings
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0'
  },

  // Database settings
  database: {
    combatPath: './data/traveller-combat.db',
    operationsPath: './data/campaigns/operations.db'
  },

  // Security settings
  security: {
    // CORS - allow all in dev, restricted in prod
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : null,
    // Enable puppetry eval() debugging system
    // WARNING: This is a security risk - XSS via spearphishing possible
    enablePuppetry: true,
    // Enable test API endpoints
    enableTestApi: false
  },

  // Feature flags
  features: {
    // Operations VTT features
    operations: {
      enabled: true,
      // Allow GM to assign roles to PCs/NPCs
      gmRoleAssignment: false,
      // Max players per campaign
      maxPlayersPerCampaign: 10,
      // Max ships per campaign
      maxShipsPerCampaign: 5
    },
    // Combat VTT features
    combat: {
      enabled: true,
      // Solo mode
      soloModeEnabled: true
    }
  },

  // Logging
  logging: {
    level: 'info',
    console: true,
    timestamps: true
  },

  // Session/connection settings
  connections: {
    // Socket.io ping interval (ms)
    pingInterval: 25000,
    // Socket.io ping timeout (ms)
    pingTimeout: 60000,
    // Graceful shutdown timeout (ms)
    shutdownTimeout: 10000
  }
};
