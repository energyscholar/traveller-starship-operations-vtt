/**
 * Wiki Cache - Fast O(1) Lookup Module
 *
 * Provides rapid access to cached Traveller wiki data.
 * Uses prebuilt indices for instant lookups by hex, name, or slug.
 *
 * Usage:
 *   const wikiCache = require('./wiki-cache');
 *
 *   // Get system by hex (O(1))
 *   const mora = wikiCache.getByHex('3124');
 *
 *   // Get system by name (O(1))
 *   const regina = wikiCache.getByName('Regina');
 *
 *   // Get raw wiki content
 *   const html = wikiCache.getRawHtml('3124');
 *   const text = wikiCache.getTextContent('3124');
 *
 *   // Check cache status
 *   const status = wikiCache.getStatus();
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '../data/wiki-cache');
const INDEX_FILE = path.join(CACHE_DIR, 'index.json');

// In-memory index (loaded once, kept in memory)
let _index = null;
let _indexLoaded = false;

// System content cache (lazy-loaded)
const _systemCache = new Map();

/**
 * Load index into memory (called once on first access)
 */
function ensureIndex() {
  if (_indexLoaded) return _index;

  if (fs.existsSync(INDEX_FILE)) {
    _index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } else {
    _index = {
      meta: { totalSystems: 0, fetchedSystems: 0 },
      byHex: {},
      byName: {},
      bySlug: {},
      systems: []
    };
  }
  _indexLoaded = true;
  return _index;
}

/**
 * Get system info by hex coordinate (O(1))
 * @param {string} hex - Hex coordinate (e.g., '3124')
 * @returns {Object|null} System index entry
 */
function getByHex(hex) {
  const index = ensureIndex();
  return index.byHex[hex] || null;
}

/**
 * Get system info by name (O(1))
 * @param {string} name - System name (case-insensitive)
 * @returns {Object|null} System index entry
 */
function getByName(name) {
  const index = ensureIndex();
  const hex = index.byName[name.toLowerCase()];
  return hex ? index.byHex[hex] : null;
}

/**
 * Get system info by slug (O(1))
 * @param {string} slug - URL-safe slug
 * @returns {Object|null} System index entry
 */
function getBySlug(slug) {
  const index = ensureIndex();
  const hex = index.bySlug[slug];
  return hex ? index.byHex[hex] : null;
}

/**
 * Get full cached data for a system (includes content)
 * @param {string} hex - Hex coordinate
 * @returns {Object|null} Full cache entry with rawHtml and textContent
 */
function getFullCache(hex) {
  // Check in-memory cache first
  if (_systemCache.has(hex)) {
    return _systemCache.get(hex);
  }

  // Load from disk
  const cachePath = path.join(CACHE_DIR, 'systems', `${hex}.json`);
  if (fs.existsSync(cachePath)) {
    const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    _systemCache.set(hex, data);
    return data;
  }

  return null;
}

/**
 * Get raw HTML content for a system
 * @param {string} hex - Hex coordinate
 * @returns {string|null} Raw HTML content
 */
function getRawHtml(hex) {
  const cache = getFullCache(hex);
  return cache?.rawHtml || null;
}

/**
 * Get text content (HTML stripped) for a system
 * @param {string} hex - Hex coordinate
 * @returns {string|null} Text content
 */
function getTextContent(hex) {
  const cache = getFullCache(hex);
  return cache?.textContent || null;
}

/**
 * Get cache status
 * @returns {Object} Cache statistics
 */
function getStatus() {
  const index = ensureIndex();
  return {
    isAvailable: _index !== null && index.meta.fetchedSystems > 0,
    totalSystems: index.meta.totalSystems,
    fetchedSystems: index.meta.fetchedSystems,
    systemsWithContent: index.meta.systemsWithContent,
    lastUpdated: index.meta.lastUpdated,
    cacheDir: CACHE_DIR
  };
}

/**
 * Get list of all cached system hexes
 * @returns {string[]} Array of hex coordinates
 */
function getAllHexes() {
  const index = ensureIndex();
  return Object.keys(index.byHex);
}

/**
 * Get list of systems with wiki content
 * @returns {Object[]} Array of system entries with content
 */
function getSystemsWithContent() {
  const index = ensureIndex();
  return index.systems.filter(s => s.hasContent);
}

/**
 * Search text content across all systems
 * @param {string} pattern - Search pattern (string or regex)
 * @returns {Object[]} Array of {hex, name, matches} objects
 */
function searchContent(pattern) {
  const index = ensureIndex();
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'gi');
  const results = [];

  for (const sys of index.systems) {
    if (!sys.hasContent) continue;

    const text = getTextContent(sys.hex);
    if (!text) continue;

    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      results.push({
        hex: sys.hex,
        name: sys.name,
        matchCount: matches.length,
        matches: matches.slice(0, 5) // First 5 matches
      });
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// INDEX-BASED QUERIES (O(1) lookups)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all systems in a subsector
 * @param {string} subsector - Subsector letter (A-P) or name
 * @returns {string[]} Array of hex coordinates
 */
function getBySubsector(subsector) {
  const index = ensureIndex();
  return index.bySubsector?.[subsector] || [];
}

/**
 * Get all systems by allegiance code
 * @param {string} allegiance - Allegiance code (Im, Zh, Sw, Da, etc.)
 * @returns {string[]} Array of hex coordinates
 */
function getByAllegiance(allegiance) {
  const index = ensureIndex();
  return index.byAllegiance?.[allegiance] || [];
}

/**
 * Get all systems by polity name
 * @param {string} polity - Polity name (Third Imperium, Zhodani Consulate, etc.)
 * @returns {string[]} Array of hex coordinates
 */
function getByPolity(polity) {
  const index = ensureIndex();
  return index.byPolity?.[polity] || [];
}

/**
 * Get all systems by starport class
 * @param {string} starport - Starport class (A/B/C/D/E/X)
 * @returns {string[]} Array of hex coordinates
 */
function getByStarport(starport) {
  const index = ensureIndex();
  return index.byStarport?.[starport] || [];
}

/**
 * Get all systems by fuel source type
 * @param {string} fuelType - 'refined', 'unrefined', 'gas-giant', 'water'
 * @returns {string[]} Array of hex coordinates
 */
function getByFuelSource(fuelType) {
  const index = ensureIndex();
  return index.byFuelSource?.[fuelType] || [];
}

/**
 * Get all systems by fuel availability category
 * @param {string} availability - 'easy', 'moderate', 'difficult', 'scarce'
 * @returns {string[]} Array of hex coordinates
 */
function getByFuelAvailability(availability) {
  const index = ensureIndex();
  return index.byFuelAvailability?.[availability] || [];
}

/**
 * Get all systems with a specific installation type
 * @param {string} installation - 'naval-base', 'scout-base', 'depot', 'highport', etc.
 * @returns {string[]} Array of hex coordinates
 */
function getByInstallation(installation) {
  const index = ensureIndex();
  return index.byInstallation?.[installation] || [];
}

/**
 * Get all systems by travel zone
 * @param {string} zone - 'green', 'amber', 'red'
 * @returns {string[]} Array of hex coordinates
 */
function getByZone(zone) {
  const index = ensureIndex();
  return index.byZone?.[zone] || [];
}

/**
 * Get all systems by population category
 * @param {string} category - 'uninhabited', 'low', 'medium', 'high', 'very-high'
 * @returns {string[]} Array of hex coordinates
 */
function getByPopCategory(category) {
  const index = ensureIndex();
  return index.byPopCategory?.[category] || [];
}

/**
 * Get all systems by tech level category
 * @param {string} category - 'low', 'mid', 'high', 'ultra'
 * @returns {string[]} Array of hex coordinates
 */
function getByTechLevel(category) {
  const index = ensureIndex();
  return index.byTechLevel?.[category] || [];
}

/**
 * Get all systems with specific trade code
 * @param {string} tradeCode - Trade code (Ag, In, Hi, Ri, etc.)
 * @returns {string[]} Array of hex coordinates
 */
function getByTradeCode(tradeCode) {
  const index = ensureIndex();
  return index.byTradeCode?.[tradeCode] || [];
}

/**
 * Get all systems by hydrographics category
 * @param {string} category - 'desert', 'dry', 'wet', 'water-world', 'ocean'
 * @returns {string[]} Array of hex coordinates
 */
function getByHydrographics(category) {
  const index = ensureIndex();
  return index.byHydrographics?.[category] || [];
}

/**
 * Check if system has gas giants
 * @param {boolean} hasGiants - true or false
 * @returns {string[]} Array of hex coordinates
 */
function getByGasGiants(hasGiants) {
  const index = ensureIndex();
  return index.byGasGiants?.[hasGiants ? 'yes' : 'no'] || [];
}

/**
 * Get summary of all available indices and their sizes
 * @returns {Object} Index summary
 */
function getIndexSummary() {
  const index = ensureIndex();
  const summary = {};

  const indexNames = [
    'bySector', 'bySubsector', 'byAllegiance', 'byPolity',
    'byStarport', 'byFuelSource', 'byFuelAvailability', 'byInstallation',
    'byZone', 'byPopCategory', 'byTechLevel', 'byTradeCode',
    'byHydrographics', 'byGasGiants', 'byBase', 'byAtmosphere', 'byHabitability'
  ];

  for (const name of indexNames) {
    if (index[name]) {
      summary[name] = {};
      for (const [key, hexes] of Object.entries(index[name])) {
        summary[name][key] = hexes.length;
      }
    }
  }

  return summary;
}

/**
 * Clear in-memory cache (for memory management)
 */
function clearMemoryCache() {
  _systemCache.clear();
}

/**
 * Reload index from disk
 */
function reloadIndex() {
  _indexLoaded = false;
  _systemCache.clear();
  ensureIndex();
}

module.exports = {
  // Primary lookups (O(1))
  getByHex,
  getByName,
  getBySlug,

  // Content access
  getFullCache,
  getRawHtml,
  getTextContent,

  // Status and meta
  getStatus,
  getAllHexes,
  getSystemsWithContent,
  getIndexSummary,

  // Text search
  searchContent,

  // Index-based queries (O(1))
  getBySubsector,
  getByAllegiance,
  getByPolity,
  getByStarport,
  getByFuelSource,
  getByFuelAvailability,
  getByInstallation,
  getByZone,
  getByPopCategory,
  getByTechLevel,
  getByTradeCode,
  getByHydrographics,
  getByGasGiants,

  // Cache management
  clearMemoryCache,
  reloadIndex
};
