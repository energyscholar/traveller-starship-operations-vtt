/**
 * Development Configuration
 * Settings for local development
 */

module.exports = {
  // Development-specific overrides
  security: {
    // Allow all origins in development
    allowedOrigins: null,
    // Enable puppetry for debugging and testing
    enablePuppetry: true,
    // Enable test API for development testing
    enableTestApi: true
  },

  // More verbose logging in dev
  logging: {
    level: 'debug',
    console: true,
    timestamps: true
  },

  // Feature flags for testing
  features: {
    operations: {
      // Enable experimental features in dev
      gmRoleAssignment: true
    }
  }
};
