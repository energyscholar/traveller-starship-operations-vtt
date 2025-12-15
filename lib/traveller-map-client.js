/**
 * TravellerMap API Client
 * AR-120: Fetches sector/subsector data from travellermap.com
 *
 * Features:
 * - Toggleable caching (GM setting)
 * - File cache for offline use
 * - Memory cache for session performance
 * - Graceful fallback when API unavailable
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://travellermap.com/api';
const CACHE_DIR = path.join(__dirname, '../data/subsectors');
const SYSTEM_CACHE_DIR = path.join(__dirname, '../data/star-systems');

// Memory cache for session
const memoryCache = new Map();

// Default settings (can be overridden by GM settings)
let cacheEnabled = true;

/**
 * Set cache enabled/disabled (called from GM settings)
 * @param {boolean} enabled
 */
function setCacheEnabled(enabled) {
  cacheEnabled = enabled;
  if (!enabled) {
    memoryCache.clear();
  }
}

/**
 * Get cache status
 * @returns {boolean}
 */
function isCacheEnabled() {
  return cacheEnabled;
}

/**
 * Clear all caches
 */
function clearCache() {
  memoryCache.clear();
}

/**
 * Fetch data from TravellerMap API
 * @param {string} endpoint - API endpoint path
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Parsed JSON response
 */
async function fetchFromAPI(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TravellerMap API error: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  // SEC format returns text, parse it
  const text = await response.text();
  return parseSecFormat(text);
}

/**
 * Parse SEC (sector data) format from TravellerMap
 * @param {string} text - Raw SEC format text
 * @returns {Object} Parsed sector data
 */
function parseSecFormat(text) {
  const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  const systems = [];

  for (const line of lines) {
    // Skip header lines
    if (line.startsWith('Hex') || line.startsWith('---')) continue;
    if (line.length < 30) continue;

    let name, hex, uwp, remarks, zone, pbg, allegiance, stars;

    // Detect format: T5 starts with 4-digit hex, Classic starts with name
    const isT5Format = /^\d{4}\s/.test(line);

    if (isT5Format) {
      // T5 Second Survey format: Hex Name UWP Remarks {Ix} (Ex) [Cx] N B Z PBG W A Stellar
      hex = line.substring(0, 4).trim();
      name = line.substring(5, 26).trim();
      uwp = line.substring(26, 35).trim();
      // Find zone (A or R) and PBG in the later part of line
      // Zone is typically after [Cx] block, followed by bases, then zone, then PBG
      const match = line.match(/\]\s*\S*\s+(\S*)\s+([-AR ])\s+(\d{3})\s+\d+\s+(\S+)\s+(.+)$/);
      if (match) {
        zone = match[2].trim();
        pbg = match[3];
        allegiance = match[4];
        stars = match[5];
      } else {
        zone = '';
        pbg = '';
        allegiance = '';
        stars = '';
      }
      // Remarks are between UWP and {Ix}
      const ixMatch = line.indexOf('{');
      remarks = ixMatch > 35 ? line.substring(35, ixMatch).trim() : '';
    } else {
      // Classic SEC format: Name Hex UWP Bases Remarks Zone PBG Allegiance Stars
      name = line.substring(0, 18).trim();
      hex = line.substring(18, 22).trim();
      uwp = line.substring(23, 32).trim();
      const bases = line.substring(33, 35).trim();
      remarks = line.substring(36, 52).trim();
      zone = line.substring(53, 54).trim();
      pbg = line.substring(55, 58).trim();
      allegiance = line.substring(59, 63).trim();
      stars = line.substring(64).trim();
    }

    if (hex && uwp && /^[A-EX]\w{6,7}-\w$/.test(uwp)) {
      systems.push({
        name: name || `System ${hex}`,
        hex,
        uwp,
        remarks,
        zone: zone === ' ' || zone === '-' ? '' : zone,
        pbg,
        allegiance,
        stars
      });
    }
  }

  return { systems };
}

/**
 * Get subsector data (with caching)
 * @param {string} sector - Sector name (e.g., 'Spinward Marches')
 * @param {string} subsector - Subsector letter (A-P) or name
 * @returns {Promise<Object>} Subsector data with systems array
 */
async function getSubsector(sector, subsector) {
  const cacheKey = `subsector:${sector}:${subsector}`;

  // Check memory cache
  if (cacheEnabled && memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  // Check file cache
  const fileName = `${sector.toLowerCase().replace(/\s+/g, '-')}-${subsector.toLowerCase()}.json`;
  const filePath = path.join(CACHE_DIR, fileName);

  if (cacheEnabled && fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      memoryCache.set(cacheKey, data);
      return data;
    } catch (err) {
      console.warn(`[TravellerMap] Cache read error: ${err.message}`);
    }
  }

  // Fetch from API
  try {
    const data = await fetchFromAPI('/sec', {
      sector,
      subsector,
      type: 'SecondSurvey'
    });

    // Transform to our format
    const result = {
      name: `${sector} - Subsector ${subsector}`,
      sector,
      subsectorLetter: subsector,
      systems: data.systems.map(sys => ({
        hex: sys.hex,
        name: sys.name,
        uwp: sys.uwp,
        starport: sys.uwp[0],
        techLevel: parseInt(sys.uwp[8], 36) || 0,
        bases: (sys.bases || []).filter(b => b && b !== '-'),
        zone: sys.zone,
        remarks: sys.remarks,
        allegiance: sys.allegiance,
        stellar: sys.stars
      }))
    };

    // Cache to memory
    if (cacheEnabled) {
      memoryCache.set(cacheKey, result);

      // Cache to file
      try {
        if (!fs.existsSync(CACHE_DIR)) {
          fs.mkdirSync(CACHE_DIR, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
      } catch (err) {
        console.warn(`[TravellerMap] Cache write error: ${err.message}`);
      }
    }

    return result;
  } catch (err) {
    console.error(`[TravellerMap] API fetch error: ${err.message}`);

    // Try file cache even if caching disabled (offline fallback)
    if (fs.existsSync(filePath)) {
      console.log(`[TravellerMap] Using offline cache for ${sector}/${subsector}`);
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    throw err;
  }
}

/**
 * Get full sector data
 * @param {string} sector - Sector name
 * @returns {Promise<Object>} Sector data with all systems
 */
async function getSector(sector) {
  const cacheKey = `sector:${sector}`;

  if (cacheEnabled && memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  const data = await fetchFromAPI('/sec', {
    sector,
    type: 'SecondSurvey'
  });

  const result = {
    name: sector,
    systems: data.systems
  };

  if (cacheEnabled) {
    memoryCache.set(cacheKey, result);
  }

  return result;
}

/**
 * Search for a world by name
 * @param {string} query - World name to search
 * @returns {Promise<Array>} Matching worlds
 */
async function searchWorld(query) {
  const data = await fetchFromAPI('/search', { q: query });
  return data.Results?.Items || [];
}

/**
 * Get world at specific coordinates
 * @param {string} sector - Sector name
 * @param {string} hex - Hex coordinate (e.g., '0930')
 * @returns {Promise<Object>} World data
 */
async function getWorldAtHex(sector, hex) {
  const results = await fetchFromAPI('/coordinates', { sector, hex });
  return results;
}

/**
 * Get worlds within jump range
 * @param {string} sector - Sector name
 * @param {string} hex - Starting hex
 * @param {number} jump - Jump range (1-6)
 * @returns {Promise<Array>} Reachable worlds
 */
async function getJumpWorlds(sector, hex, jump = 2) {
  const data = await fetchFromAPI('/jumpworlds', { sector, hex, jump });
  return data.Worlds || [];
}

/**
 * Calculate jump route between two worlds
 * @param {string} startSector - Starting sector
 * @param {string} startHex - Starting hex
 * @param {string} endSector - Destination sector
 * @param {string} endHex - Destination hex
 * @param {number} jump - Ship's jump rating
 * @returns {Promise<Array>} Route waypoints
 */
async function getJumpRoute(startSector, startHex, endSector, endHex, jump = 2) {
  const start = `${startSector} ${startHex}`;
  const end = `${endSector} ${endHex}`;
  const data = await fetchFromAPI('/route', { start, end, jump });
  return data.Route || [];
}

/**
 * List all available sectors
 * @returns {Promise<Array>} Sector list
 */
async function listSectors() {
  const data = await fetchFromAPI('/universe');
  return data.Sectors || [];
}

module.exports = {
  // Settings
  setCacheEnabled,
  isCacheEnabled,
  clearCache,

  // Core API
  getSubsector,
  getSector,
  searchWorld,
  getWorldAtHex,

  // Extended features (AR-121)
  getJumpWorlds,
  getJumpRoute,
  listSectors,

  // Low-level
  fetchFromAPI,
  parseSecFormat
};
