/**
 * Star System Loader - Tiered Data Loading (AR-116, AR-224)
 *
 * Two-tier data structure:
 * - Tier 1 (Index): Lightweight metadata for all systems (~500KB for 20k)
 * - Tier 2 (Full): Complete system data, lazy loaded on demand (~5KB each)
 *
 * AR-224: Now supports sector pack files (.sector) as primary source
 * with fallback to individual JSON files.
 *
 * Single-system constraint: Only 1 full system loaded at a time
 * (gameplay never needs multiple systems simultaneously)
 *
 * This module handles canonical/seed systems stored as JSON.
 * For procedurally generated systems, see star-systems.js
 */

const fs = require('fs');
const path = require('path');

// AR-224: Try to load sector loader for packed sector support
let sectorLoader = null;
try {
  sectorLoader = require('../sector-loader');
} catch (e) {
  // Sector loader not available, use individual files only
}

const SYSTEMS_DIR = path.join(__dirname, '../../data/star-systems');

// AR-224: Configuration - set to true to use sector packs
const USE_SECTOR_PACK = true;
const DEFAULT_SECTOR = 'Spinward Marches';

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
 * AR-224: Try to get system from sector pack
 * @param {string} identifier - System ID, name, or hex
 * @returns {Object|null} System data or null if not found/not available
 */
function tryGetFromSectorPack(identifier) {
  if (!USE_SECTOR_PACK || !sectorLoader) return null;

  try {
    // First, try the identifier directly (works for hex and exact names)
    let system = sectorLoader.getSystem(identifier, {
      sector: DEFAULT_SECTOR,
      includeCelestial: true,
      includeLocations: true
    });

    // If not found and we have an index, try to get hex from index entry
    // This handles cases where ID (e.g., "fenl-s-gren") differs from name ("Fenl's Gren")
    if (!system && systemsById) {
      const indexEntry = systemsById.get(identifier);
      if (indexEntry && indexEntry.hex) {
        system = sectorLoader.getSystem(indexEntry.hex, {
          sector: DEFAULT_SECTOR,
          includeCelestial: true,
          includeLocations: true
        });
      }
    }

    if (system) {
      // Apply gas giant jump points (AR-136)
      return generateGasGiantJumpPoints(system);
    }
  } catch (e) {
    // Sector pack lookup failed, will fall back to individual files
  }

  return null;
}

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
 * AR-224: Now tries sector pack first, falls back to individual files
 * @param {string} systemId - System identifier (e.g., 'dorannia')
 * @returns {Object|null} System data or null if not found
 */
function getSystem(systemId) {
  // Ensure index is loaded (builds hash maps)
  getSystemIndex();

  // O(1) lookup via hash map
  const systemEntry = systemsById.get(systemId);

  if (!systemEntry) {
    // AR-224: Try sector pack for unknown ID (might be by hex or name)
    const fromPack = tryGetFromSectorPack(systemId);
    if (fromPack) {
      activeSystemId = fromPack.id;
      activeSystemData = fromPack;
      return fromPack;
    }
    console.warn(`[StarSystems] System not found: ${systemId}`);
    return null;
  }

  // Special systems (jumpspace) cached separately - always use individual file
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

  // AR-224: Try sector pack first for non-special systems
  const fromPack = tryGetFromSectorPack(systemId);
  if (fromPack) {
    activeSystemId = systemId;
    activeSystemData = fromPack;
    return fromPack;
  }

  // Fallback: Load from individual JSON file
  const systemPath = path.join(SYSTEMS_DIR, systemEntry.file);

  try {
    let systemData = JSON.parse(fs.readFileSync(systemPath, 'utf8'));
    // AR-136: Generate gas giant jump points
    systemData = generateGasGiantJumpPoints(systemData);
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
 * Generate destinations from celestial objects (server-side equivalent of client generatePlacesFromCelestial)
 * @param {Object} system - System data with celestialObjects, uwp, hasNaval, hasScout
 * @returns {Array} Generated destination locations
 */
function generateDestinations(system) {
  if (!system) return [];

  const celestialObjects = system.celestialObjects || [];
  const starportClass = system.uwp?.[0] || 'X';
  const systemName = system.name || 'Unknown';
  const hasNaval = system.hasNaval || false;
  const hasScout = system.hasScout || false;

  const places = [];

  // 1. System Jump Point
  places.push({
    id: 'jump_point',
    name: 'Jump Point',
    type: 'navigation',
    description: '100-diameter safe jump distance from primary'
  });

  // 2. Process celestial objects
  celestialObjects.forEach(obj => {
    switch (obj.type) {
      case 'Planet':
        places.push({
          id: `orbit-${obj.id}`,
          name: `Orbit - ${obj.name}`,
          type: 'orbit',
          linkedTo: obj.id
        });
        break;

      case 'Gas Giant':
      case 'Ice Giant':
        places.push({
          id: `orbit-${obj.id}`,
          name: `Orbit - ${obj.name}`,
          type: 'orbit',
          linkedTo: obj.id
        });
        places.push({
          id: `skim-${obj.id}`,
          name: `${obj.name} - Skim Point`,
          type: 'fuel',
          linkedTo: obj.id
        });
        places.push({
          id: `jump-${obj.id}`,
          name: `${obj.name} - Jump Point`,
          type: 'navigation',
          linkedTo: obj.id
        });
        break;

      case 'Highport':
      case 'Station':
        places.push({
          id: `dock-${obj.id}`,
          name: obj.name,
          type: 'dock',
          linkedTo: obj.id
        });
        break;

      case 'Moon':
        places.push({
          id: `orbit-${obj.id}`,
          name: `Orbit - ${obj.name}`,
          type: 'orbit',
          linkedTo: obj.id
        });
        break;

      case 'Belt':
      case 'Asteroid Belt':
      case 'Planetoid Belt':
        places.push({
          id: `belt-${obj.id}`,
          name: obj.name || 'Asteroid Belt',
          type: 'mining',
          linkedTo: obj.id
        });
        break;
    }
  });

  // 3. Naval Base
  if (hasNaval) {
    places.push({
      id: 'naval-base',
      name: `${systemName} Naval Base`,
      type: 'military'
    });
  }

  // 4. Scout Base
  if (hasScout) {
    places.push({
      id: 'scout-base',
      name: `${systemName} Scout Base`,
      type: 'military'
    });
  }

  // 5. Starport facilities
  const mainworld = celestialObjects.find(obj => obj.uwp);
  if (mainworld && starportClass && starportClass !== 'X') {
    const hasHighportInObjects = celestialObjects.some(obj => obj.type === 'Highport');

    if (!hasHighportInObjects && ['A', 'B'].includes(starportClass)) {
      places.push({
        id: 'highport',
        name: `${systemName} Highport`,
        type: 'dock',
        linkedTo: mainworld.id
      });
    }

    places.push({
      id: 'downport',
      name: `${systemName} Downport`,
      type: 'dock',
      linkedTo: mainworld.id
    });
  }

  return places;
}

/**
 * Get all destinations for a system (static locations + generated)
 * @param {string} systemId - System identifier
 * @returns {Array} All available destinations
 */
function getAllDestinations(systemId) {
  const system = getSystem(systemId);
  if (!system) return [];

  // Start with static locations from sector file
  const staticLocations = system.locations || [];

  // Generate dynamic destinations
  const generatedDestinations = generateDestinations(system);

  // Merge: generated first, then static (static can override)
  const destinationMap = new Map();
  generatedDestinations.forEach(d => destinationMap.set(d.id, d));
  staticLocations.forEach(d => destinationMap.set(d.id, d));

  return Array.from(destinationMap.values());
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
  generateDestinations,
  getAllDestinations,
  clearCache,
  preloadSystems,
  getActiveSystemId,
  clearActiveSystem,
  SYSTEMS_DIR,
  generateGasGiantJumpPoints
};

/**
 * AR-136: Generate jump points for gas giants at 100 planetary diameters
 * @param {Object} systemData - System data with celestialObjects
 * @returns {Object} systemData with jump points added
 */
function generateGasGiantJumpPoints(systemData) {
  if (!systemData?.celestialObjects) return systemData;

  const gasGiants = systemData.celestialObjects.filter(obj => obj.type === 'Gas Giant');

  gasGiants.forEach(gg => {
    const jumpPointId = `${gg.id}-jumppoint`;

    // Check if jump point already exists
    if (systemData.celestialObjects.find(obj => obj.id === jumpPointId)) return;

    // 100 diameters = 200 * radiusKm
    const jumpDistanceKm = 200 * (gg.radiusKm || 50000); // Default 50,000km radius if not set
    const jumpDistanceAU = jumpDistanceKm / 149597870.7; // Convert to AU

    // Place jump point at same orbital position as gas giant, offset by jump distance
    // For simplicity, add to orbitAU (jump point is at outer edge of 100-diameter limit)
    const jumpOrbitAU = gg.orbitAU + jumpDistanceAU;

    systemData.celestialObjects.push({
      id: jumpPointId,
      name: `${gg.name} Jump Point`,
      type: 'Jump Point',
      orbitAU: jumpOrbitAU,
      bearing: gg.bearing || 0,
      radiusKm: 1000, // Nominal size for display
      parentId: gg.id,
      transponder: 'NONE',
      gmNotes: `Safe jump limit (100 diameters from ${gg.name}). Distance: ${Math.round(jumpDistanceKm).toLocaleString()} km from gas giant.`,
      cameraSettings: {
        zoomMultiplier: 0.3,
        offsetX: 0,
        offsetY: 0,
        description: 'Jump point view'
      }
    });
  });

  return systemData;
}
