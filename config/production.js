/**
 * Production Configuration
 * Settings for production deployment
 */

module.exports = {
  // Production-specific overrides
  security: {
    // Restrict CORS in production - must set ALLOWED_ORIGINS env var
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['https://your-domain.com'],
    // SECURITY: Disable puppetry eval() in production to prevent XSS
    // Set ENABLE_PUPPETRY=true to override (not recommended)
    enablePuppetry: process.env.ENABLE_PUPPETRY === 'true',
    // Disable test API in production
    enableTestApi: false
  },

  // Quieter logging in production
  logging: {
    level: 'warn',
    console: true,
    timestamps: true
  },

  // Conservative feature flags for production
  features: {
    operations: {
      // Disable experimental features in prod
      gmRoleAssignment: false
    }
  }
};
