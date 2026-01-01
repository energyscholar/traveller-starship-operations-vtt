/**
 * AR-224: Sector Loader
 *
 * Loads and expands sector pack files (.sector) with tiered loading:
 * - Tier 1: Index (hex lookup, names, UWP) - always loaded
 * - Tier 2: System summary (trade codes, allegiance, bases)
 * - Tier 3: Celestial objects (planets, moons, stations)
 * - Tier 4: On-demand generation (procedural details)
 *
 * Provides lazy expansion from compact to full format.
 */

const fs = require('fs');
const path = require('path');

const SECTORS_DIR = path.join(__dirname, '../data/sectors');
const FALLBACK_DIR = path.join(__dirname, '../data/star-systems');

// Cache for loaded sectors
const sectorCache = new Map();

// Active expanded system (only one at a time for memory)
let activeSystem = null;
let activeSystemHex = null;

/**
 * Load a sector pack file
 * @param {string} sectorName - Sector name or slug (e.g., "Spinward Marches" or "spinward-marches")
 * @returns {Object} Sector pack data
 */
function loadSector(sectorName) {
  const slug = sectorName.toLowerCase().replace(/\s+/g, '-');

  if (sectorCache.has(slug)) {
    return sectorCache.get(slug);
  }

  const sectorPath = path.join(SECTORS_DIR, `${slug}.sector`);

  if (!fs.existsSync(sectorPath)) {
    throw new Error(`Sector not found: ${sectorName} (looked for ${sectorPath})`);
  }

  const sectorData = JSON.parse(fs.readFileSync(sectorPath, 'utf-8'));
  sectorCache.set(slug, sectorData);

  return sectorData;
}

/**
 * Get sector registry (list of available sectors)
 * @returns {Object} Registry with sector metadata
 */
function getSectorRegistry() {
  const registryPath = path.join(SECTORS_DIR, '_registry.json');

  if (!fs.existsSync(registryPath)) {
    return { version: '1.0', sectors: {} };
  }

  return JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
}

/**
 * List all available sectors
 * @returns {Array<{name, slug, systems, checksum}>} Sector summaries
 */
function listSectors() {
  const registry = getSectorRegistry();
  return Object.entries(registry.sectors).map(([slug, info]) => ({
    slug,
    name: info.name,
    systems: info.systems,
    checksum: info.checksum
  }));
}

/**
 * Expand stellar shorthand to full format
 * @param {string} compact - Compact stellar (e.g., "G2V", "G2V+M5V")
 * @returns {Object} Expanded stellar object
 */
function expandStellar(compact) {
  if (!compact) {
    return { primary: 'G2 V', type: 'Single' };
  }

  if (typeof compact === 'object') {
    return compact; // Already expanded
  }

  const parts = compact.split('+');
  const primary = parts[0].replace(/([OBAFGKM]\d?)([IV]+)/i, '$1 $2');

  if (parts.length > 1) {
    const secondary = parts[1].replace(/([OBAFGKM]\d?)([IV]+)/i, '$1 $2');
    return { primary, secondary, type: 'Binary' };
  }

  return { primary, type: 'Single' };
}

/**
 * Parse starport type and facilities
 * @param {string} uwp - UWP string
 * @returns {Object} Starport details
 */
function parseStarport(uwp) {
  if (!uwp || uwp.length < 1) {
    return { class: 'X', quality: 'None', downport: false, highport: false };
  }

  const starportCode = uwp[0].toUpperCase();
  const starportInfo = {
    'A': { class: 'A', quality: 'Excellent', downport: true, highport: true },
    'B': { class: 'B', quality: 'Good', downport: true, highport: true },
    'C': { class: 'C', quality: 'Routine', downport: true, highport: false },
    'D': { class: 'D', quality: 'Poor', downport: true, highport: false },
    'E': { class: 'E', quality: 'Frontier', downport: true, highport: false },
    'X': { class: 'X', quality: 'None', downport: false, highport: false }
  };

  return starportInfo[starportCode] || starportInfo['X'];
}

/**
 * Parse base codes to descriptive objects
 * @param {string} bases - Base codes (e.g., "NS", "W")
 * @returns {Object} Base details
 */
function parseBases(bases) {
  if (!bases) {
    return { naval: false, scout: false, xboat: false, corsair: false, military: false };
  }

  const baseStr = typeof bases === 'string' ? bases : bases.join('');

  return {
    naval: baseStr.includes('N'),
    scout: baseStr.includes('S'),
    xboat: baseStr.includes('W') || baseStr.includes('X'),  // Way station or X-boat
    corsair: baseStr.includes('C'),
    military: baseStr.includes('M'),
    depot: baseStr.includes('D'),
    codes: baseStr
  };
}

/**
 * Expand a compact system to full format
 * @param {Object} compact - Compact system from sector pack
 * @param {Object} options - Expansion options
 * @returns {Object} Fully expanded system
 */
function expandSystem(compact, options = {}) {
  const starport = parseStarport(compact.uwp);
  const bases = parseBases(compact.bases);

  const full = {
    // Core identity
    id: compact.id,
    hex: compact.hex,
    name: compact.name,
    uwp: compact.uwp,

    // Location
    sector: options.sector || 'Spinward Marches',
    subsector: compact.sub || '',

    // Stellar
    stellar: expandStellar(compact.stellar),

    // Counts
    gasGiants: compact.gg || 0,
    planetoidBelts: compact.pb || 0,
    worlds: compact.worlds || 0,

    // Trade & Politics
    tradeCodes: compact.tc || [],
    allegiance: compact.alleg || 'Im',

    // Facilities
    starport: starport,
    bases: bases,

    // AR-225: Enriched data from TravellerMap
    // Travel zone
    zone: compact.zone || 'Green',
    isAmber: compact.zone === 'Amber',
    isRed: compact.zone === 'Red',

    // Importance
    importance: compact.ix || 0,

    // Population flags
    isHighPop: compact.hiPop || false,
    isCapital: compact.capital || false,

    // Trade route membership
    onTradeRoute: compact.onRoute || false,
    onSpinwardMain: compact.spinwardMain || false,

    // X-boat infrastructure
    hasXboatStation: compact.hasXboat || bases.xboat || false,

    // Economic/Cultural extensions
    economicExtension: compact.ex || null,
    culturalExtension: compact.cx || null,

    // Population multiplier
    populationMultiplier: compact.popMult || 0,

    // Enrichment
    wikiUrl: compact.wiki || null,
    notes: compact.notes || null,
    special: compact.special || false,

    // Source tracking
    _source: 'sector-pack',
    _packed: true
  };

  return full;
}

/**
 * Get system by hex coordinate
 * @param {string} sectorName - Sector name
 * @param {string} hex - 4-digit hex (e.g., "1910")
 * @param {Object} options - { includeCelestial: boolean, includeLocations: boolean }
 * @returns {Object|null} Expanded system or null if not found
 */
function getSystemByHex(sectorName, hex, options = {}) {
  const sector = loadSector(sectorName);

  const index = sector.hexIndex[hex];
  if (index === undefined) {
    return null; // Empty hex
  }

  const compact = sector.systems[index];
  const full = expandSystem(compact, { sector: sector.sector });

  // Add celestial objects if requested
  if (options.includeCelestial && sector.celestialData && sector.celestialData[hex]) {
    full.celestialObjects = expandCelestialObjects(sector.celestialData[hex]);
  }

  // Add locations if requested
  if (options.includeLocations && sector.locations && sector.locations[hex]) {
    full.locations = sector.locations[hex];
  }

  // Cache as active system
  activeSystem = full;
  activeSystemHex = hex;

  return full;
}

/**
 * Get system by name (case-insensitive)
 * @param {string} sectorName - Sector name
 * @param {string} systemName - System name
 * @param {Object} options - Expansion options
 * @returns {Object|null} Expanded system or null
 */
function getSystemByName(sectorName, systemName, options = {}) {
  const sector = loadSector(sectorName);
  const searchName = systemName.toLowerCase();

  const compact = sector.systems.find(s =>
    s.name.toLowerCase() === searchName
  );

  if (!compact) {
    return null;
  }

  return getSystemByHex(sectorName, compact.hex, options);
}

/**
 * Expand celestial objects from compact format
 * @param {Array} compactObjects - Compact celestial objects
 * @returns {Array} Expanded celestial objects
 */
function expandCelestialObjects(compactObjects) {
  return compactObjects.map(obj => {
    const expanded = {
      id: obj.id,
      name: obj.name,
      type: obj.type,
      orbitAU: obj.orbitAU,
      bearing: obj.bearing,
      radiusKm: obj.radiusKm
    };

    // Expand optional fields
    if (obj.parent) expanded.parent = obj.parent;
    if (obj.parentId) expanded.parentId = obj.parentId;
    if (obj.orbitKm) expanded.orbitKm = obj.orbitKm;
    if (obj.orbitRadii) expanded.orbitRadii = obj.orbitRadii;
    if (obj.stellarClass) expanded.stellarClass = obj.stellarClass;
    if (obj.stellarInfo) expanded.stellarInfo = obj.stellarInfo;
    if (obj.uwp) expanded.uwp = obj.uwp;
    if (obj.atm) expanded.atmosphere = obj.atm;
    if (obj.breathable) expanded.breathable = true;
    if (obj.goldilocks) expanded.inGoldilocks = true;
    if (obj.mainworld) expanded.isMainworld = true;
    if (obj.subtype) expanded.subtype = obj.subtype;
    if (obj.transponder) expanded.transponder = obj.transponder;
    if (obj.notes) expanded.gmNotes = obj.notes;
    if (obj.cam) expanded.cameraSettings = obj.cam;
    if (obj.moons) expanded.moons = obj.moons;

    return expanded;
  });
}

/**
 * Get all system summaries for a sector (for dropdowns)
 * @param {string} sectorName - Sector name
 * @returns {Array<{id, name, hex, subsector, uwp}>} System summaries
 */
function listSystemSummaries(sectorName) {
  const sector = loadSector(sectorName);

  return sector.systems.map(s => ({
    id: s.id,
    name: s.name,
    hex: s.hex,
    subsector: s.sub,
    uwp: s.uwp
  }));
}

/**
 * Get all systems in a subsector
 * @param {string} sectorName - Sector name
 * @param {string} subsector - Subsector letter (A-P)
 * @returns {Array} Systems in subsector
 */
function getSubsectorSystems(sectorName, subsector) {
  const sector = loadSector(sectorName);

  return sector.systems
    .filter(s => s.sub === subsector)
    .map(s => expandSystem(s, { sector: sector.sector }));
}

/**
 * Search systems by partial name
 * @param {string} sectorName - Sector name
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Array} Matching system summaries
 */
function searchSystems(sectorName, query, limit = 10) {
  const sector = loadSector(sectorName);
  const searchQuery = query.toLowerCase();

  return sector.systems
    .filter(s => s.name.toLowerCase().includes(searchQuery))
    .slice(0, limit)
    .map(s => ({
      id: s.id,
      name: s.name,
      hex: s.hex,
      subsector: s.sub,
      uwp: s.uwp
    }));
}

/**
 * Check if a hex has a system
 * @param {string} sectorName - Sector name
 * @param {string} hex - 4-digit hex
 * @returns {boolean} True if hex has a system
 */
function hexHasSystem(sectorName, hex) {
  const sector = loadSector(sectorName);
  return sector.hexIndex[hex] !== undefined;
}

/**
 * Get currently active (cached) system
 * @returns {Object|null} Active system or null
 */
function getActiveSystem() {
  return activeSystem;
}

/**
 * Clear sector cache (for hot reload)
 */
function clearCache() {
  sectorCache.clear();
  activeSystem = null;
  activeSystemHex = null;
}

/**
 * Fallback: Load from individual JSON file
 * Used for systems not in sector pack (custom, special)
 * @param {string} systemId - System ID
 * @returns {Object|null} System data
 */
function loadFallbackSystem(systemId) {
  const filePath = path.join(FALLBACK_DIR, `${systemId}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  data._source = 'fallback-json';
  return data;
}

/**
 * Unified system getter - tries sector pack first, then fallback
 * @param {string} identifier - System ID, name, or hex
 * @param {Object} options - { sector, includeCelestial, includeLocations }
 * @returns {Object|null} System data
 */
function getSystem(identifier, options = {}) {
  const sectorName = options.sector || 'Spinward Marches';

  // Try by hex first (most common)
  if (/^\d{4}$/.test(identifier)) {
    const result = getSystemByHex(sectorName, identifier, options);
    if (result) return result;
  }

  // Try by name
  const byName = getSystemByName(sectorName, identifier, options);
  if (byName) return byName;

  // Try fallback for special systems
  return loadFallbackSystem(identifier.toLowerCase());
}

/**
 * AR-225: Get trade/X-boat routes for a sector
 * @param {string} sectorName - Sector name
 * @returns {Array} Routes with start/end hexes and allegiance
 */
function getRoutes(sectorName) {
  const sector = loadSector(sectorName);
  return sector.routes || [];
}

/**
 * AR-225: Get systems on trade routes
 * @param {string} sectorName - Sector name
 * @returns {Array} Systems on trade routes
 */
function getTradeRouteSystems(sectorName) {
  const sector = loadSector(sectorName);
  return sector.systems
    .filter(s => s.onRoute || s.spinwardMain)
    .map(s => expandSystem(s, { sector: sector.sector }));
}

/**
 * AR-225: Get systems with X-boat facilities
 * @param {string} sectorName - Sector name
 * @returns {Array} Systems with X-boat stations or way stations
 */
function getXboatSystems(sectorName) {
  const sector = loadSector(sectorName);
  return sector.systems
    .filter(s => s.hasXboat || s.hasWay)
    .map(s => expandSystem(s, { sector: sector.sector }));
}

/**
 * AR-225: Get systems with military bases
 * @param {string} sectorName - Sector name
 * @param {string} type - 'naval', 'scout', 'depot', or 'all'
 * @returns {Array} Systems with specified base type
 */
function getBaseSystems(sectorName, type = 'all') {
  const sector = loadSector(sectorName);
  return sector.systems
    .filter(s => {
      if (type === 'all') return s.hasNaval || s.hasScout || s.hasDepot;
      if (type === 'naval') return s.hasNaval;
      if (type === 'scout') return s.hasScout;
      if (type === 'depot') return s.hasDepot;
      return false;
    })
    .map(s => expandSystem(s, { sector: sector.sector }));
}

/**
 * AR-225: Get amber/red zone systems
 * @param {string} sectorName - Sector name
 * @param {string} zone - 'amber', 'red', or 'all'
 * @returns {Array} Systems in specified zone
 */
function getZoneSystems(sectorName, zone = 'all') {
  const sector = loadSector(sectorName);
  return sector.systems
    .filter(s => {
      if (zone === 'all') return s.zone === 'Amber' || s.zone === 'Red';
      if (zone === 'amber') return s.zone === 'Amber';
      if (zone === 'red') return s.zone === 'Red';
      return false;
    })
    .map(s => expandSystem(s, { sector: sector.sector }));
}

module.exports = {
  // Core loading
  loadSector,
  getSectorRegistry,
  listSectors,

  // System access
  getSystem,
  getSystemByHex,
  getSystemByName,
  getActiveSystem,

  // Listings
  listSystemSummaries,
  getSubsectorSystems,
  searchSystems,
  hexHasSystem,

  // AR-225: Routes and enriched data
  getRoutes,
  getTradeRouteSystems,
  getXboatSystems,
  getBaseSystems,
  getZoneSystems,

  // Expansion helpers
  expandSystem,
  expandStellar,
  expandCelestialObjects,
  parseStarport,
  parseBases,

  // Fallback
  loadFallbackSystem,

  // Cache management
  clearCache
};
