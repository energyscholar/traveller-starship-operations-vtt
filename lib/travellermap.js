/**
 * TravellerMap API Proxy Module
 * Proxies requests to travellermap.com to avoid CORS issues
 * Includes SQLite caching with 24-hour TTL
 *
 * API Documentation: https://travellermap.com/doc/api
 *
 * Stage 4 - Autorun 3
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database file location (same as operations db)
const DB_PATH = path.join(__dirname, '../data/campaigns/operations.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database connection
const db = new Database(DB_PATH);

// Cache TTL in milliseconds (24 hours)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// TravellerMap API base URL
const TRAVELLER_MAP_BASE = 'https://travellermap.com/api';

/**
 * Initialize the cache table
 */
function initializeCacheTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS travellermap_cache (
      cache_key TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL,
      response_data TEXT NOT NULL,
      cached_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    )
  `);

  // Index for expiration cleanup
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cache_expires ON travellermap_cache(expires_at)
  `);
}

// Initialize on module load
initializeCacheTable();

/**
 * Generate cache key from endpoint and params
 * @param {string} endpoint - API endpoint name
 * @param {Object} params - Query parameters
 * @returns {string} Cache key
 */
function generateCacheKey(endpoint, params) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return `${endpoint}:${sortedParams}`;
}

/**
 * Get cached response if valid
 * @param {string} cacheKey - Cache key
 * @returns {Object|null} Cached data or null if not found/expired
 */
function getFromCache(cacheKey) {
  const now = new Date().toISOString();
  const row = db.prepare(`
    SELECT response_data FROM travellermap_cache
    WHERE cache_key = ? AND expires_at > ?
  `).get(cacheKey, now);

  if (row) {
    try {
      return JSON.parse(row.response_data);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Store response in cache
 * @param {string} cacheKey - Cache key
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Response data
 */
function storeInCache(cacheKey, endpoint, data) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_MS).toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO travellermap_cache (cache_key, endpoint, response_data, cached_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(cacheKey, endpoint, JSON.stringify(data), now.toISOString(), expiresAt);
}

/**
 * Clean up expired cache entries
 */
function cleanupExpiredCache() {
  const now = new Date().toISOString();
  db.prepare('DELETE FROM travellermap_cache WHERE expires_at < ?').run(now);
}

/**
 * Fetch from TravellerMap API with caching
 * @param {string} endpoint - API endpoint (e.g., 'search', 'jumpworlds')
 * @param {Object} params - Query parameters
 * @param {boolean} useCache - Whether to use caching (default true)
 * @returns {Promise<Object>} API response
 */
async function fetchFromTravellerMap(endpoint, params, useCache = true) {
  const cacheKey = generateCacheKey(endpoint, params);

  // Check cache first
  if (useCache) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return { ...cached, _cached: true };
    }
  }

  // Build URL with query params
  const url = new URL(`${TRAVELLER_MAP_BASE}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TravellerCombatVTT/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`TravellerMap API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Store in cache
    if (useCache) {
      storeInCache(cacheKey, endpoint, data);
    }

    return { ...data, _cached: false };
  } catch (error) {
    throw new Error(`Failed to fetch from TravellerMap: ${error.message}`);
  }
}

/**
 * Fetch image from TravellerMap (for jump maps)
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<{buffer: Buffer, contentType: string}>} Image data
 */
async function fetchImageFromTravellerMap(endpoint, params) {
  const url = new URL(`${TRAVELLER_MAP_BASE}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'TravellerCombatVTT/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`TravellerMap API error: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/png';

    return { buffer, contentType };
  } catch (error) {
    throw new Error(`Failed to fetch image from TravellerMap: ${error.message}`);
  }
}

// ============ PUBLIC API FUNCTIONS ============

/**
 * Search for worlds by name or attributes
 * @param {string} query - Search query (supports wildcards, exact:, like:, uwp:, etc.)
 * @returns {Promise<Object>} Search results
 */
async function searchWorlds(query) {
  return fetchFromTravellerMap('search', { q: query });
}

/**
 * Get world data at specific location
 * @param {string} sector - Sector name (e.g., 'Spinward Marches')
 * @param {string} hex - Hex coordinate (e.g., '1910')
 * @returns {Promise<Object>} World data
 */
async function getWorld(sector, hex) {
  return fetchFromTravellerMap('credits', { sector, hex });
}

/**
 * Get worlds within jump range
 * @param {string} sector - Sector name
 * @param {string} hex - Hex coordinate
 * @param {number} jump - Jump range (1-6, default 2)
 * @returns {Promise<Object>} Jump destinations
 */
async function getJumpWorlds(sector, hex, jump = 2) {
  return fetchFromTravellerMap('jumpworlds', { sector, hex, jump: Math.min(6, Math.max(1, jump)) });
}

/**
 * Get jump map image URL parameters
 * @param {string} sector - Sector name
 * @param {string} hex - Hex coordinate
 * @param {number} jump - Jump range
 * @param {string} style - Map style (poster, atlas, candy, draft, fasa, terminal, mongoose)
 * @returns {Object} Parameters for jumpmap endpoint
 */
function getJumpMapParams(sector, hex, jump = 2, style = 'terminal') {
  return {
    sector,
    hex,
    jump: Math.min(6, Math.max(1, jump)),
    style,
    scale: 48
  };
}

/**
 * Fetch jump map image
 * @param {string} sector - Sector name
 * @param {string} hex - Hex coordinate
 * @param {number} jump - Jump range
 * @param {string} style - Map style
 * @returns {Promise<{buffer: Buffer, contentType: string}>} Image data
 */
async function getJumpMapImage(sector, hex, jump = 2, style = 'terminal') {
  const params = getJumpMapParams(sector, hex, jump, style);
  return fetchImageFromTravellerMap('jumpmap', params);
}

/**
 * Get sector data
 * @param {string} sector - Sector name
 * @returns {Promise<Object>} Sector metadata
 */
async function getSectorData(sector) {
  return fetchFromTravellerMap('metadata', { sector });
}

/**
 * Clear all cached data
 */
function clearCache() {
  db.prepare('DELETE FROM travellermap_cache').run();
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
function getCacheStats() {
  const total = db.prepare('SELECT COUNT(*) as count FROM travellermap_cache').get();
  const valid = db.prepare('SELECT COUNT(*) as count FROM travellermap_cache WHERE expires_at > ?').get(new Date().toISOString());
  return {
    totalEntries: total.count,
    validEntries: valid.count,
    expiredEntries: total.count - valid.count
  };
}

module.exports = {
  searchWorlds,
  getWorld,
  getJumpWorlds,
  getJumpMapImage,
  getJumpMapParams,
  getSectorData,
  clearCache,
  getCacheStats,
  cleanupExpiredCache,
  // Low-level access for custom queries
  fetchFromTravellerMap,
  fetchImageFromTravellerMap
};
