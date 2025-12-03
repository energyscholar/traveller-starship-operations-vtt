/**
 * Configuration Loader
 * Merges default config with environment-specific overrides
 *
 * Usage:
 *   const config = require('./config');
 *   console.log(config.security.enablePuppetry);
 *
 * Environment is determined by NODE_ENV:
 *   - development (default)
 *   - production
 *   - test
 */

const defaultConfig = require('./default');

// Get environment
const env = process.env.NODE_ENV || 'development';

// Load environment-specific config
let envConfig = {};
try {
  envConfig = require(`./${env}`);
} catch (e) {
  console.warn(`No config file for environment: ${env}, using defaults`);
}

/**
 * Deep merge two objects
 * @param {Object} target - Base object
 * @param {Object} source - Override object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

// Merge configs
const config = deepMerge(defaultConfig, envConfig);

// Add environment info
config.env = env;
config.isDev = env === 'development';
config.isProd = env === 'production';
config.isTest = env === 'test';

// Log config on startup (dev only)
if (config.isDev && config.logging.level === 'debug') {
  console.log(`[CONFIG] Environment: ${env}`);
  console.log(`[CONFIG] Puppetry enabled: ${config.security.enablePuppetry}`);
  console.log(`[CONFIG] Test API enabled: ${config.security.enableTestApi}`);
}

module.exports = config;
