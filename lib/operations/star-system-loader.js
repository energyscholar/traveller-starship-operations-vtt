/**
 * Star System Loader - Tiered Data Loading (AR-116)
 *
 * Two-tier data structure:
 * - Tier 1 (Index): Lightweight metadata for all systems (~500KB for 20k)
 * - Tier 2 (Full): Complete system data, lazy loaded on demand (~5KB each)
 *
 * Single-system constraint: Only 1 full system loaded at a time
 * (gameplay never needs multiple systems simultaneously)
 *
 * This module handles canonical/seed systems stored as JSON.
 * For procedurally generated systems, see star-systems.js
 */

const fs = require('fs');
const path = require('path');

const SYSTEMS_DIR = path.join(__dirname, '../../data/star-systems');

// Tier 1: Index cache (loaded once, kept in memory)
let indexCache = null;

// Tier 2: Single active system (only 1 at a time)
let activeSystemId = null;
let activeSystemData = null;

// Hash maps for O(1) lookups (built on first index access)
let systemsById = null;    // id -> index entry
let systemsByHex = null;   // hex -> index entry
let systemsByName = null;  // name.toLowerCase() -> index entry

// Cache for special systems (jumpspace) - kept separate
const specialSystemCache = new Map();

/**
 * Build hash maps for O(1) lookups
 * Called once when index is first loaded
 */
function buildIndexMaps(systems) {
  systemsById = new Map();
  systemsByHex = new Map();
  systemsByName = new Map();

  for (const sys of systems) {
    systemsById.set(sys.id, sys);
    if (sys.hex) {
      systemsByHex.set(sys.hex, sys);
    }
    systemsByName.set(sys.name.toLowerCase(), sys);
  }
}

/**
 * Get the system index (list of all available systems)
 * @returns {Object} Index with systems array and metadata
 */
function getSystemIndex() {
  if (!indexCache) {
    const indexPath = path.join(SYSTEMS_DIR, '_index.json');
    indexCache = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    buildIndexMaps(indexCache.systems);
  }
  return indexCache;
}

/**
 * Get list of all system IDs
 * @returns {string[]} Array of system IDs
 */
function listSystems() {
  const index = getSystemIndex();
  return index.systems.map(s => s.id);
}

/**
 * Get list of all systems with basic metadata (for dropdowns)
 * @returns {Array<{id, name, hex, subsector}>} System summaries
 */
function listSystemSummaries() {
  const index = getSystemIndex();
  return index.systems
    .filter(s => !s.special) // Exclude pseudo-systems like jumpspace
    .map(s => ({
      id: s.id,
      name: s.name,
      hex: s.hex,
      subsector: s.subsector
    }))
    .sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical
}

/**
 * Load a star system by ID (Tier 2 data - lazy loaded)
 * Single-system constraint: loading a new system replaces the previous
 * @param {string} systemId - System identifier (e.g., 'dorannia')
 * @returns {Object|null} System data or null if not found
 */
function getSystem(systemId) {
  // Ensure index is loaded (builds hash maps)
  getSystemIndex();

  // O(1) lookup via hash map
  const systemEntry = systemsById.get(systemId);

  if (!systemEntry) {
    console.warn(`[StarSystems] System not found: ${systemId}`);
    return null;
  }

  // Special systems (jumpspace) cached separately
  if (systemEntry.special) {
    if (specialSystemCache.has(systemId)) {
      return specialSystemCache.get(systemId);
    }
    const systemPath = path.join(SYSTEMS_DIR, systemEntry.file);
    try {
      const systemData = JSON.parse(fs.readFileSync(systemPath, 'utf8'));
      specialSystemCache.set(systemId, systemData);
      return systemData;
    } catch (error) {
      console.error(`[StarSystems] Error loading ${systemId}:`, error.message);
      return null;
    }
  }

  // Return cached if same system
  if (activeSystemId === systemId && activeSystemData) {
    return activeSystemData;
  }

  // Load new system (replaces previous)
  const systemPath = path.join(SYSTEMS_DIR, systemEntry.file);

  try {
    const systemData = JSON.parse(fs.readFileSync(systemPath, 'utf8'));
    // Replace active system (single-system constraint)
    activeSystemId = systemId;
    activeSystemData = systemData;
    return systemData;
  } catch (error) {
    console.error(`[StarSystems] Error loading ${systemId}:`, error.message);
    return null;
  }
}

/**
 * Get the currently active system ID
 * @returns {string|null}
 */
function getActiveSystemId() {
  return activeSystemId;
}

/**
 * Clear the active system (for testing/reset)
 */
function clearActiveSystem() {
  activeSystemId = null;
  activeSystemData = null;
}

/**
 * Get system by hex coordinate
 * @param {string} hex - Hex coordinate (e.g., '1525')
 * @returns {Object|null} System data or null
 */
function getSystemByHex(hex) {
  // Ensure index is loaded (builds hash maps)
  getSystemIndex();

  // O(1) lookup via hash map
  const systemEntry = systemsByHex.get(hex);
  if (!systemEntry) return null;
  return getSystem(systemEntry.id);
}

/**
 * Get system by name (case-insensitive)
 * @param {string} name - System name (e.g., 'Dorannia')
 * @returns {Object|null} System data or null
 */
function getSystemByName(name) {
  if (!name) return null;

  // Ensure index is loaded (builds hash maps)
  getSystemIndex();

  // O(1) lookup via hash map
  const normalizedName = name.toLowerCase().trim();
  const systemEntry = systemsByName.get(normalizedName);
  if (!systemEntry) return null;
  return getSystem(systemEntry.id);
}

/**
 * Get all systems in a subsector
 * @param {string} subsector - Subsector name
 * @returns {Object[]} Array of system data
 */
function getSystemsBySubsector(subsector) {
  const index = getSystemIndex();
  return index.systems
    .filter(s => s.subsector === subsector && !s.special)
    .map(s => getSystem(s.id))
    .filter(Boolean);
}

/**
 * Get Jump Space pseudo-system
 * @returns {Object} Jump space data
 */
function getJumpSpace() {
  return getSystem('jumpspace');
}

/**
 * Get locations for a system
 * @param {string} systemId - System identifier
 * @returns {Array} Location objects
 */
function getSystemLocations(systemId) {
  const system = getSystem(systemId);
  return system?.locations || [];
}

/**
 * Get celestial objects for a system
 * @param {string} systemId - System identifier
 * @returns {Array} Celestial objects
 */
function getCelestialObjects(systemId) {
  const system = getSystem(systemId);
  return system?.celestialObjects || [];
}

/**
 * Check if a system exists
 * @param {string} systemId - System identifier
 * @returns {boolean}
 */
function systemExists(systemId) {
  // Ensure index is loaded (builds hash maps)
  getSystemIndex();

  // O(1) lookup via hash map
  return systemsById.has(systemId);
}

/**
 * Clear cache (for testing or hot reload)
 */
function clearCache() {
  // Clear active system (Tier 2)
  activeSystemId = null;
  activeSystemData = null;
  specialSystemCache.clear();
  // Clear index (Tier 1)
  indexCache = null;
  systemsById = null;
  systemsByHex = null;
  systemsByName = null;
}

/**
 * Preload commonly used systems into cache
 * @param {string[]} systemIds - IDs to preload
 */
function preloadSystems(systemIds) {
  systemIds.forEach(id => getSystem(id));
}

module.exports = {
  getSystemIndex,
  listSystems,
  listSystemSummaries,
  getSystem,
  getSystemByHex,
  getSystemByName,
  getSystemsBySubsector,
  getJumpSpace,
  systemExists,
  getSystemLocations,
  getCelestialObjects,
  clearCache,
  preloadSystems,
  getActiveSystemId,
  clearActiveSystem,
  SYSTEMS_DIR
};
