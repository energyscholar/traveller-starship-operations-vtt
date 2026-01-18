#!/usr/bin/env node
/**
 * Build Complete Wiki Cache for Spinward Marches
 *
 * Fetches and caches ALL wiki pages for all systems in the sector.
 * Stores raw content plus indices for rapid O(1) lookups.
 *
 * Features:
 * - 2-second polite delay between requests
 * - Resumable (tracks progress)
 * - Stores raw wiki content for future parsing
 * - Multiple lookup indices (hex, name, slug)
 * - Metadata for yearly refresh tracking
 *
 * Usage:
 *   node scripts/build-wiki-cache.js           # Full build
 *   node scripts/build-wiki-cache.js --resume  # Continue from last
 *   node scripts/build-wiki-cache.js --status  # Show cache status
 *   node scripts/build-wiki-cache.js --refresh # Force refresh all
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const DELAY_MS = 2000;  // 2 seconds between requests - be polite!
const CACHE_DIR = path.join(__dirname, '../data/wiki-cache');
const INDEX_FILE = path.join(CACHE_DIR, 'index.json');
const SECTOR_FILE = path.join(__dirname, '../data/sectors/spinward-marches.sector');

// Parse arguments
const args = process.argv.slice(2);
const RESUME_MODE = args.includes('--resume');
const STATUS_MODE = args.includes('--status');
const REFRESH_MODE = args.includes('--refresh');
const BUILD_INDICES_ONLY = args.includes('--build-indices');

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function slugify(name) {
  return name.toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'TravellerCombatVTT/1.0 (Educational/Gaming; Caching wiki data)'
      },
      timeout: 30000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode === 404) {
        resolve({ status: 404, content: null });
        return;
      }
      if (res.statusCode !== 200) {
        resolve({ status: res.statusCode, content: null, error: `HTTP ${res.statusCode}` });
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: 200, content: data }));
    });

    request.on('error', err => resolve({ status: 0, content: null, error: err.message }));
    request.on('timeout', () => {
      request.destroy();
      resolve({ status: 0, content: null, error: 'Timeout' });
    });
  });
}

function extractTextContent(html) {
  if (!html) return '';
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// CACHE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  const systemsDir = path.join(CACHE_DIR, 'systems');
  if (!fs.existsSync(systemsDir)) {
    fs.mkdirSync(systemsDir, { recursive: true });
  }
}

function loadIndex() {
  if (fs.existsSync(INDEX_FILE)) {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  }
  return {
    meta: {
      version: 2,
      created: new Date().toISOString(),
      lastUpdated: null,
      totalSystems: 0,
      fetchedSystems: 0,
      systemsWithContent: 0
    },
    // O(1) lookup indices
    byHex: {},           // hex -> system info
    byName: {},          // lowercase name -> hex
    bySlug: {},          // slug -> hex

    // Sector/Subsector indices
    bySector: {},        // sector -> [hexes]
    bySubsector: {},     // subsector letter -> [hexes]

    // Political indices
    byAllegiance: {},    // allegiance code -> [hexes]
    byPolity: {},        // polity name -> [hexes]

    // Starport indices
    byStarport: {},      // starport class (A/B/C/D/E/X) -> [hexes]

    // Population indices
    byPopCategory: {},   // 'uninhabited'/'low'/'medium'/'high'/'very-high' -> [hexes]

    // Environment indices
    byAtmosphere: {},    // atmosphere type -> [hexes]
    byHabitability: {},  // 'habitable'/'marginal'/'hostile' -> [hexes]

    // Trade codes
    byTradeCode: {},     // trade code -> [hexes]

    // Tech level
    byTechLevel: {},     // TL range ('low'/'mid'/'high'/'ultra') -> [hexes]

    // Gas giants
    byGasGiants: {},     // has gas giants (true/false) -> [hexes]

    // Bases
    byBase: {},          // base type ('naval'/'scout'/'both'/'none') -> [hexes]

    // Fuel source indices
    byFuelSource: {},    // fuel type ('refined'/'unrefined'/'gas-giant'/'water') -> [hexes]
    byFuelAvailability: {}, // 'easy'/'moderate'/'difficult'/'scarce' -> [hexes]

    // Installation indices
    byInstallation: {},  // installation type -> [hexes]

    // Water availability
    byHydrographics: {}, // hydro category -> [hexes]

    // Zone (travel advisories)
    byZone: {},          // 'green'/'amber'/'red' -> [hexes]

    // List of all systems
    systems: []
  };
}

function saveIndex(index) {
  index.meta.lastUpdated = new Date().toISOString();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

// ═══════════════════════════════════════════════════════════════════════════
// INDEX BUILDING HELPERS
// ═══════════════════════════════════════════════════════════════════════════

// Allegiance code to polity name mapping
const ALLEGIANCE_NAMES = {
  'Im': 'Third Imperium',
  'Zh': 'Zhodani Consulate',
  'Sw': 'Sword Worlds Confederation',
  'Da': 'Darrian Confederation',
  'So': 'Solomani Confederation',
  'As': 'Aslan Hierate',
  'Va': 'Vargr Extents',
  'Na': 'Non-Aligned',
  'Cs': 'Client State',
  'Dr': 'Droyne',
  '--': 'Unclaimed'
};

// Subsector letter to name mapping for Spinward Marches
const SUBSECTOR_NAMES = {
  'A': 'Cronor', 'B': 'Jewell', 'C': 'Vilis', 'D': 'Rhylanor',
  'E': 'Querion', 'F': 'Regina', 'G': 'Lanth', 'H': 'Aramis',
  'I': 'Darrian', 'J': 'Sword Worlds', 'K': 'Lunion', 'L': 'Mora',
  'M': 'Five Sisters', 'N': 'District 268', 'O': 'Glisten', 'P': "Trin's Veil"
};

function getPopCategory(popDigit) {
  if (popDigit === 0) return 'uninhabited';
  if (popDigit <= 3) return 'low';         // <10,000
  if (popDigit <= 6) return 'medium';      // 10K - 1M
  if (popDigit <= 8) return 'high';        // 1M - 1B
  return 'very-high';                      // 1B+
}

function getTechCategory(tlDigit) {
  if (tlDigit <= 5) return 'low';          // Pre-industrial to early industrial
  if (tlDigit <= 9) return 'mid';          // Industrial to early stellar
  if (tlDigit <= 12) return 'high';        // Interstellar
  return 'ultra';                          // TL13+ (Imperial high tech)
}

function getHabitability(uwp) {
  const atmo = parseInt(uwp?.[2], 16) || 0;
  const hydro = parseInt(uwp?.[3], 16) || 0;

  // Breathable atmospheres with some water
  if ([5, 6, 8].includes(atmo) && hydro >= 1) return 'habitable';

  // Thin/dense but not tainted, or vaccum with any water
  if ([3, 4, 9, 10].includes(atmo) || (atmo === 0 && hydro > 0)) return 'marginal';

  // Everything else
  return 'hostile';
}

function getAtmosphereType(atmo) {
  const types = {
    0: 'vacuum', 1: 'trace', 2: 'very-thin-tainted', 3: 'very-thin',
    4: 'thin-tainted', 5: 'thin', 6: 'standard', 7: 'standard-tainted',
    8: 'dense', 9: 'dense-tainted', 10: 'exotic', 11: 'corrosive',
    12: 'insidious', 13: 'very-dense', 14: 'low', 15: 'unusual'
  };
  return types[atmo] || 'unknown';
}

function getBaseCategory(bases) {
  if (!bases) return 'none';
  const hasNaval = /[ANDB]/.test(bases);
  const hasScout = /[AS]/.test(bases);
  if (hasNaval && hasScout) return 'both';
  if (hasNaval) return 'naval';
  if (hasScout) return 'scout';
  return bases.length > 0 ? 'other' : 'none';
}

// Fuel source availability
// Returns array of available fuel types for a system
function getFuelSources(starport, hasGasGiants, hydro) {
  const sources = [];

  // Starport refined fuel (A, B)
  if (['A', 'B'].includes(starport)) {
    sources.push('refined');
  }

  // Starport unrefined fuel (C, D)
  if (['C', 'D'].includes(starport)) {
    sources.push('unrefined');
  }

  // Gas giant wilderness refueling
  if (hasGasGiants) {
    sources.push('gas-giant');
  }

  // Water-based wilderness refueling
  if (hydro > 0) {
    sources.push('water');
  }

  return sources;
}

// Fuel availability category
function getFuelAvailability(starport, hasGasGiants, hydro) {
  // Easy: Class A/B starport (refined fuel readily available)
  if (['A', 'B'].includes(starport)) return 'easy';

  // Moderate: Class C/D + gas giants OR Class C/D + water
  if (['C', 'D'].includes(starport) || hasGasGiants) return 'moderate';

  // Difficult: Only water available, no starport fuel
  if (hydro > 0) return 'difficult';

  // Scarce: No good fuel options (Class E/X, no gas giants, no water)
  return 'scarce';
}

// Installation types present
function getInstallations(bases, starport, remarks) {
  const installations = [];

  // Naval base
  if (/[NB]/.test(bases || '')) installations.push('naval-base');

  // Scout base/way station
  if (/[S]/.test(bases || '')) installations.push('scout-base');

  // Depot
  if (/[D]/.test(bases || '')) installations.push('depot');

  // Research station (often trade code Rs)
  if (/Rs/.test(remarks || '')) installations.push('research-station');

  // Prison/Penal (trade code Pr or remarks)
  if (/Pr/.test(remarks || '')) installations.push('prison');

  // Military (trade code Mr)
  if (/Mr/.test(remarks || '')) installations.push('military');

  // Highport implied by starport class
  if (['A', 'B'].includes(starport)) installations.push('highport');

  return installations;
}

// Hydrographics category
function getHydroCategory(hydro) {
  if (hydro === 0) return 'desert';      // No free water
  if (hydro <= 3) return 'dry';          // 10-30% water
  if (hydro <= 6) return 'wet';          // 40-60% water
  if (hydro <= 9) return 'water-world';  // 70-90% water
  return 'ocean';                        // 100% water (hydro A)
}

// Travel zone
function getZone(zone) {
  if (zone === 'R') return 'red';
  if (zone === 'A') return 'amber';
  return 'green';
}

function addToIndex(index, key, value, hex) {
  if (!index[key]) index[key] = {};
  if (!index[key][value]) index[key][value] = [];
  if (!index[key][value].includes(hex)) {
    index[key][value].push(hex);
  }
}

function buildAllIndices(index, systems) {
  // Clear existing indices
  index.bySector = {};
  index.bySubsector = {};
  index.byAllegiance = {};
  index.byPolity = {};
  index.byStarport = {};
  index.byPopCategory = {};
  index.byAtmosphere = {};
  index.byHabitability = {};
  index.byTradeCode = {};
  index.byTechLevel = {};
  index.byGasGiants = {};
  index.byBase = {};
  index.byFuelSource = {};
  index.byFuelAvailability = {};
  index.byInstallation = {};
  index.byHydrographics = {};
  index.byZone = {};

  for (const sys of systems) {
    const hex = sys.hex;
    const uwp = sys.uwp || 'X000000-0';
    const starport = uwp[0];
    const popDigit = parseInt(uwp[4], 16) || 0;
    const tlDigit = parseInt(uwp[8], 16) || 0;
    const atmo = parseInt(uwp[2], 16) || 0;

    // Sector (all are Spinward Marches)
    addToIndex(index, 'bySector', 'Spinward Marches', hex);

    // Subsector
    const sub = sys.sub || sys.subsector || '';
    if (sub) {
      addToIndex(index, 'bySubsector', sub, hex);
    }

    // Allegiance
    const alleg = sys.allegiance || sys.alleg || 'Na';
    addToIndex(index, 'byAllegiance', alleg, hex);

    // Polity name
    const polity = ALLEGIANCE_NAMES[alleg] || 'Unknown';
    addToIndex(index, 'byPolity', polity, hex);

    // Starport
    addToIndex(index, 'byStarport', starport, hex);

    // Population category
    addToIndex(index, 'byPopCategory', getPopCategory(popDigit), hex);

    // Atmosphere
    addToIndex(index, 'byAtmosphere', getAtmosphereType(atmo), hex);

    // Habitability
    addToIndex(index, 'byHabitability', getHabitability(uwp), hex);

    // Trade codes
    const tradeCodes = sys.remarks?.split(/\s+/) || [];
    for (const tc of tradeCodes) {
      if (tc && tc.length >= 2) {
        addToIndex(index, 'byTradeCode', tc, hex);
      }
    }

    // Tech level
    addToIndex(index, 'byTechLevel', getTechCategory(tlDigit), hex);

    // Gas giants
    const hasGG = (sys.gg || 0) > 0;
    addToIndex(index, 'byGasGiants', hasGG ? 'yes' : 'no', hex);

    // Bases
    addToIndex(index, 'byBase', getBaseCategory(sys.bases), hex);

    // Fuel sources (multiple per system possible)
    const hydro = parseInt(uwp[3], 16) || 0;
    const fuelSources = getFuelSources(starport, hasGG, hydro);
    for (const src of fuelSources) {
      addToIndex(index, 'byFuelSource', src, hex);
    }

    // Fuel availability
    addToIndex(index, 'byFuelAvailability', getFuelAvailability(starport, hasGG, hydro), hex);

    // Installations (multiple per system)
    const installations = getInstallations(sys.bases, starport, sys.remarks);
    for (const inst of installations) {
      addToIndex(index, 'byInstallation', inst, hex);
    }

    // Hydrographics
    addToIndex(index, 'byHydrographics', getHydroCategory(hydro), hex);

    // Travel zone
    addToIndex(index, 'byZone', getZone(sys.zone), hex);
  }

  return index;
}

function getSystemCachePath(hex) {
  return path.join(CACHE_DIR, 'systems', `${hex}.json`);
}

function loadSystemCache(hex) {
  const cachePath = getSystemCachePath(hex);
  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }
  return null;
}

function saveSystemCache(hex, data) {
  const cachePath = getSystemCachePath(hex);
  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

function showStatus() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  WIKI CACHE STATUS');
  console.log('═══════════════════════════════════════════════════════════════');

  if (!fs.existsSync(INDEX_FILE)) {
    console.log('  No cache found. Run without --status to build.');
    return;
  }

  const index = loadIndex();
  const m = index.meta;

  console.log(`  Version: ${m.version}`);
  console.log(`  Created: ${m.created}`);
  console.log(`  Last Updated: ${m.lastUpdated || 'Never'}`);
  console.log('');
  console.log(`  Total Systems: ${m.totalSystems}`);
  console.log(`  Fetched: ${m.fetchedSystems} (${Math.round(m.fetchedSystems/m.totalSystems*100)}%)`);
  console.log(`  With Content: ${m.systemsWithContent}`);
  console.log('');
  console.log(`  Index Size: byHex=${Object.keys(index.byHex).length}, byName=${Object.keys(index.byName).length}`);

  // Check cache age
  if (m.lastUpdated) {
    const age = Date.now() - new Date(m.lastUpdated).getTime();
    const days = Math.floor(age / (1000 * 60 * 60 * 24));
    console.log(`  Cache Age: ${days} days`);
    if (days > 365) {
      console.log('  ⚠ Cache is over 1 year old - consider refreshing');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN BUILD PROCESS
// ═══════════════════════════════════════════════════════════════════════════

async function buildCache() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  WIKI CACHE BUILDER');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${REFRESH_MODE ? 'REFRESH ALL' : RESUME_MODE ? 'RESUME' : 'BUILD'}`);
  console.log(`  Delay: ${DELAY_MS}ms between requests`);
  console.log('');

  ensureCacheDir();

  // Load sector data for system list
  console.log('Loading sector file...');
  const sectorData = JSON.parse(fs.readFileSync(SECTOR_FILE, 'utf8'));
  const systems = sectorData.systems.filter(s => s.hex !== '0000');
  console.log(`  Found ${systems.length} systems`);

  // Load or create index
  let index = loadIndex();

  // Initialize index with all systems if new
  if (index.systems.length === 0 || REFRESH_MODE) {
    console.log('Initializing index...');
    index.systems = systems.map(s => ({
      hex: s.hex,
      name: s.name,
      slug: slugify(s.name),
      fetched: false
    }));
    index.meta.totalSystems = systems.length;
    index.meta.fetchedSystems = 0;
    index.meta.systemsWithContent = 0;

    // Build lookup indices
    for (const sys of index.systems) {
      index.byHex[sys.hex] = sys;
      index.byName[sys.name.toLowerCase()] = sys.hex;
      index.bySlug[sys.slug] = sys.hex;
    }
    saveIndex(index);
  }

  // Determine what to fetch
  let toFetch;
  if (REFRESH_MODE) {
    toFetch = index.systems;
    console.log(`Refreshing all ${toFetch.length} systems...`);
  } else if (RESUME_MODE) {
    toFetch = index.systems.filter(s => !s.fetched);
    console.log(`Resuming: ${toFetch.length} systems remaining...`);
  } else {
    toFetch = index.systems.filter(s => !s.fetched);
    console.log(`Building: ${toFetch.length} systems to fetch...`);
  }

  if (toFetch.length === 0) {
    console.log('All systems already cached!');
    return;
  }

  const estimatedMinutes = Math.ceil(toFetch.length * DELAY_MS / 60000);
  console.log(`Estimated time: ${estimatedMinutes} minutes`);
  console.log('');
  console.log('Starting fetch...');
  console.log('');

  let fetched = 0;
  let withContent = 0;

  for (let i = 0; i < toFetch.length; i++) {
    const sys = toFetch[i];
    const wikiUrl = `https://wiki.travellerrpg.com/${encodeURIComponent(sys.name)}_(world)`;

    const progress = `[${i + 1}/${toFetch.length}]`;
    process.stdout.write(`${progress} ${sys.name} (${sys.hex})... `);

    const result = await fetchUrl(wikiUrl);

    const cacheEntry = {
      hex: sys.hex,
      name: sys.name,
      slug: sys.slug,
      wikiUrl: wikiUrl,
      fetchedAt: new Date().toISOString(),
      status: result.status,
      hasContent: result.status === 200 && result.content?.length > 1000,
      contentLength: result.content?.length || 0,
      rawHtml: result.content,
      textContent: extractTextContent(result.content),
      error: result.error || null
    };

    // Save individual system cache
    saveSystemCache(sys.hex, cacheEntry);

    // Update index
    const indexEntry = index.byHex[sys.hex];
    indexEntry.fetched = true;
    indexEntry.hasContent = cacheEntry.hasContent;
    indexEntry.fetchedAt = cacheEntry.fetchedAt;

    fetched++;
    if (cacheEntry.hasContent) {
      withContent++;
      console.log(`✓ ${cacheEntry.contentLength} bytes`);
    } else if (result.status === 404) {
      console.log('✗ Not found');
    } else if (result.error) {
      console.log(`✗ ${result.error}`);
    } else {
      console.log(`○ ${result.status}`);
    }

    // Update index periodically
    if (fetched % 10 === 0) {
      index.meta.fetchedSystems = index.systems.filter(s => s.fetched).length;
      index.meta.systemsWithContent = index.systems.filter(s => s.hasContent).length;
      saveIndex(index);
    }

    // Polite delay
    if (i < toFetch.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // Final index save
  index.meta.fetchedSystems = index.systems.filter(s => s.fetched).length;
  index.meta.systemsWithContent = index.systems.filter(s => s.hasContent).length;
  saveIndex(index);

  // Build advanced indices using sector data
  console.log('');
  console.log('Building advanced indices...');
  buildAllIndices(index, systems);
  saveIndex(index);
  console.log('  Done.');

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  BUILD COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Fetched: ${fetched}`);
  console.log(`  With Content: ${withContent}`);
  console.log(`  Total Cached: ${index.meta.fetchedSystems}/${index.meta.totalSystems}`);
  console.log(`  Cache Dir: ${CACHE_DIR}`);
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  if (STATUS_MODE) {
    showStatus();
    return;
  }

  if (BUILD_INDICES_ONLY) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  BUILDING INDICES');
    console.log('═══════════════════════════════════════════════════════════════');

    // Load sector data
    const sectorData = JSON.parse(fs.readFileSync(SECTOR_FILE, 'utf8'));
    const systems = sectorData.systems.filter(s => s.hex !== '0000');
    console.log(`  Found ${systems.length} systems in sector file`);

    // Load existing index
    const index = loadIndex();
    console.log(`  Loaded index with ${Object.keys(index.byHex).length} systems`);

    // Build indices
    console.log('  Building advanced indices...');
    buildAllIndices(index, systems);
    saveIndex(index);

    // Show summary
    console.log('  Done.');
    console.log('');
    console.log('  Index Summary:');
    console.log(`    bySubsector: ${Object.keys(index.bySubsector || {}).length} keys`);
    console.log(`    byAllegiance: ${Object.keys(index.byAllegiance || {}).length} keys`);
    console.log(`    byStarport: ${Object.keys(index.byStarport || {}).length} keys`);
    console.log(`    byFuelSource: ${Object.keys(index.byFuelSource || {}).length} keys`);
    console.log(`    byInstallation: ${Object.keys(index.byInstallation || {}).length} keys`);
    console.log(`    byZone: ${Object.keys(index.byZone || {}).length} keys`);
    return;
  }

  await buildCache();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
