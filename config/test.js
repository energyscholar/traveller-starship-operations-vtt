/**
 * Test Configuration
 * Settings for automated testing
 */

module.exports = {
  // Test-specific overrides
  security: {
    // Allow all origins in test
    allowedOrigins: null,
    // Enable puppetry for test automation
    enablePuppetry: true,
    // Enable test API
    enableTestApi: true
  },

  // Database - use test databases
  database: {
    combatPath: './data/test-combat.db',
    operationsPath: './data/test-operations.db'
  },

  // Minimal logging during tests
  logging: {
    level: 'error',
    console: false,
    timestamps: false
  },

  // All features enabled for testing
  features: {
    operations: {
      gmRoleAssignment: true
    }
  }
};
