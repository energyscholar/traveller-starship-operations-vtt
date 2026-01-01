#!/usr/bin/env node
/**
 * AR-225: TravellerMap Gentle Scraper
 *
 * Politely fetches comprehensive data from TravellerMap API to enrich
 * our sector pack with all the subtle details:
 *
 * - X-boat routes and trade routes
 * - Naval, Scout, Way Station, Depot bases
 * - Importance ratings ({Ix})
 * - Economic/Cultural extensions
 * - Spinward Main membership
 * - Travel zones (Amber, Red)
 * - High population indicators
 * - Subsector capitals
 *
 * POLITE: 2 second delay between API requests (~15 min total runtime)
 *
 * Usage: node scripts/ar-225-travellermap-scraper.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SECTOR = 'Spinward Marches';
const SECTOR_SLUG = 'spinward-marches';
const DELAY_MS = 2000;  // 2 seconds between requests - be polite!
const DRY_RUN = process.argv.includes('--dry-run');

// Paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const SECTORS_DIR = path.join(DATA_DIR, 'sectors');
const OUTPUT_FILE = path.join(SECTORS_DIR, `${SECTOR_SLUG}.enriched.json`);

// ═══════════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE - What to look for
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base Codes - Imperial and Non-Imperial
 * Source: https://wiki.travellerrpg.com/Base_Code
 */
const BASE_CODES = {
  // Imperial
  'A': { type: 'Naval+Scout', faction: 'Imperial', desc: 'Naval Base and Scout Base' },
  'B': { type: 'Naval+Way', faction: 'Imperial', desc: 'Naval Base and Way Station' },
  'D': { type: 'Depot', faction: 'Imperial', desc: 'Naval Depot - major fleet base' },
  'N': { type: 'Naval', faction: 'Imperial', desc: 'Imperial Naval Base' },
  'S': { type: 'Scout', faction: 'Imperial', desc: 'Imperial Scout Base' },
  'W': { type: 'Way', faction: 'Imperial', desc: 'Way Station - X-boat support' },

  // Zhodani
  'K': { type: 'Naval', faction: 'Zhodani', desc: 'Zhodani Naval Base' },
  'M': { type: 'Military', faction: 'Zhodani', desc: 'Zhodani Military Base' },
  'X': { type: 'Relay', faction: 'Zhodani', desc: 'Zhodani Relay Station' },
  'Y': { type: 'Depot', faction: 'Zhodani', desc: 'Zhodani Depot' },
  'Z': { type: 'Naval+Military', faction: 'Zhodani', desc: 'Zhodani Naval and Military Base' },

  // Vargr
  'C': { type: 'Corsair', faction: 'Vargr', desc: 'Vargr Corsair Base' },
  'G': { type: 'Naval', faction: 'Vargr', desc: 'Vargr Naval Base' },
  'H': { type: 'Naval+Corsair', faction: 'Vargr', desc: 'Vargr Naval and Corsair Base' },

  // Other
  'E': { type: 'Embassy', faction: 'Hiver', desc: 'Hiver Embassy Center' },
  'F': { type: 'Military+Naval', faction: 'Non-Imperial', desc: 'Military and Naval Base' },
  'J': { type: 'Naval', faction: 'Non-Imperial', desc: 'Naval Base' },
  'L': { type: 'Naval', faction: 'Hiver', desc: 'Hiver Naval Base' },
  'O': { type: 'Outpost', faction: 'Kkree', desc: "K'kree Naval Outpost" },
  'P': { type: 'Naval', faction: 'Droyne', desc: 'Droyne Naval Base' },
  'Q': { type: 'Garrison', faction: 'Droyne', desc: 'Droyne Military Garrison' },
  'R': { type: 'Clan', faction: 'Aslan', desc: 'Aslan Clan Base' },
  'T': { type: 'Tlaukhu', faction: 'Aslan', desc: 'Aslan Tlaukhu Base' },
  'U': { type: 'Tlaukhu+Clan', faction: 'Aslan', desc: 'Aslan Tlaukhu and Clan Base' },
  'V': { type: 'Exploration', faction: 'Non-Imperial', desc: 'Scout/Exploration Base' }
};

/**
 * Trade Classification Codes
 * Source: https://wiki.travellerrpg.com/Trade_Classification
 */
const TRADE_CODES = {
  // Economic
  'Ag': { category: 'economic', desc: 'Agricultural', meaning: 'Ideal for farming' },
  'In': { category: 'economic', desc: 'Industrial', meaning: 'Major manufacturing' },
  'Ri': { category: 'economic', desc: 'Rich', meaning: 'High living standards' },
  'Na': { category: 'economic', desc: 'Non-Agricultural', meaning: 'Must import food' },
  'Ni': { category: 'economic', desc: 'Non-Industrial', meaning: 'Limited manufacturing' },
  'Po': { category: 'economic', desc: 'Poor', meaning: 'Low resources' },

  // Population
  'Hi': { category: 'population', desc: 'High Population', meaning: '1 billion+ inhabitants', display: 'CAPITALS' },
  'Lo': { category: 'population', desc: 'Low Population', meaning: '<10,000 inhabitants' },
  'Ba': { category: 'population', desc: 'Barren', meaning: 'No population' },
  'Di': { category: 'population', desc: 'Die Back', meaning: 'Depopulated' },
  'Ph': { category: 'population', desc: 'Pre-High', meaning: '100M-1B inhabitants' },

  // Planetary
  'As': { category: 'planetary', desc: 'Asteroid Belt', meaning: 'No primary world' },
  'De': { category: 'planetary', desc: 'Desert', meaning: 'No surface water' },
  'Fl': { category: 'planetary', desc: 'Fluid Oceans', meaning: 'Non-water oceans' },
  'Ga': { category: 'planetary', desc: 'Garden World', meaning: 'Paradise conditions' },
  'He': { category: 'planetary', desc: 'Hellworld', meaning: 'Extremely hostile' },
  'Ic': { category: 'planetary', desc: 'Ice-Capped', meaning: 'Frozen world' },
  'Oc': { category: 'planetary', desc: 'Ocean World', meaning: '>90% water' },
  'Va': { category: 'planetary', desc: 'Vacuum', meaning: 'No atmosphere' },
  'Wa': { category: 'planetary', desc: 'Water World', meaning: '90%+ water coverage' },

  // Climate
  'Co': { category: 'climate', desc: 'Cold', meaning: 'Low temperature' },
  'Fr': { category: 'climate', desc: 'Frozen', meaning: 'Below survivability' },
  'Ho': { category: 'climate', desc: 'Hot', meaning: 'High temperature' },
  'Tr': { category: 'climate', desc: 'Tropic', meaning: 'Warm climate' },
  'Tu': { category: 'climate', desc: 'Tundra', meaning: 'Cold but habitable' },

  // Political
  'Cp': { category: 'political', desc: 'Subsector Capital', meaning: 'Regional admin center' },
  'Cs': { category: 'political', desc: 'Sector Capital', meaning: 'Governs sector' },
  'Cx': { category: 'political', desc: 'Imperial Capital', meaning: 'Interstellar seat' },
  'Cy': { category: 'political', desc: 'Colony', meaning: 'Dependent world' },
  'Mr': { category: 'political', desc: 'Military Rule', meaning: 'Military government' },

  // Special
  'An': { category: 'special', desc: 'Ancients Site', meaning: 'Ancient tech remnants' },
  'Da': { category: 'special', desc: 'Dangerous', meaning: 'Hazardous conditions' },
  'Fo': { category: 'special', desc: 'Forbidden', meaning: 'Travel prohibited' },
  'Ht': { category: 'special', desc: 'High Tech', meaning: 'TL 12+' },
  'Lt': { category: 'special', desc: 'Low Tech', meaning: 'TL 5 or less' },
  'Pz': { category: 'special', desc: 'Puzzle', meaning: 'Poorly understood' },
  'Rs': { category: 'special', desc: 'Research Station', meaning: 'Scientific facility' },
  'Sa': { category: 'special', desc: 'Satellite', meaning: 'Orbits gas giant' },
  'Xb': { category: 'special', desc: 'X-Boat Station', meaning: 'Imperial comms relay' }
};

/**
 * Allegiance Codes
 */
const ALLEGIANCES = {
  'ImDd': { name: 'Third Imperium, Domain of Deneb', short: 'Imperial' },
  'ZhIN': { name: 'Zhodani Consulate, Iadr Nsobl Province', short: 'Zhodani' },
  'NaHu': { name: 'Non-Aligned, Human-dominated', short: 'Non-Aligned' },
  'NaXX': { name: 'Non-Aligned, unclaimed', short: 'Unclaimed' },
  'CsIm': { name: 'Client state, Third Imperium', short: 'Imperial Client' },
  'CsZh': { name: 'Client state, Zhodani Consulate', short: 'Zhodani Client' },
  'DaCf': { name: 'Darrian Confederation', short: 'Darrian' },
  'SwCf': { name: 'Sword Worlds Confederation', short: 'Sword Worlds' }
};

// ═══════════════════════════════════════════════════════════════════════════
// SPINWARD MAIN - Systems on the Jump-1 trade route
// ═══════════════════════════════════════════════════════════════════════════

// These will be populated from route analysis
let spinwardMainSystems = new Set();

// Named segments of the Spinward Main
const SPINWARD_MAIN_SEGMENTS = {
  'Regina Cluster': [],
  'Bowman Arm': [],
  'Mora Arm': [],
  'Darrian Cluster': [],
  'Glisten Arm': [],
  'Gram Arm': []
};

// ═══════════════════════════════════════════════════════════════════════════
// API FETCHING
// ═══════════════════════════════════════════════════════════════════════════

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'TravellerCombatVTT/1.0 (polite scraper)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchJSON(url) {
  const data = await fetch(url);
  return JSON.parse(data);
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA PARSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse base codes into structured data
 */
function parseBases(baseStr) {
  if (!baseStr || baseStr.trim() === '') return { codes: [], parsed: [] };

  const codes = baseStr.trim().split('');
  const parsed = codes.map(code => {
    const info = BASE_CODES[code];
    return info ? { code, ...info } : { code, type: 'Unknown', faction: 'Unknown', desc: `Unknown base code: ${code}` };
  });

  return { codes, parsed };
}

/**
 * Parse trade/remarks codes
 */
function parseRemarks(remarkStr) {
  if (!remarkStr) return { codes: [], parsed: [], isHighPop: false, isCapital: false, hasXboat: false };

  // Split on spaces, handling parenthetical sophont codes
  const parts = remarkStr.trim().split(/\s+/);
  const codes = [];
  const parsed = [];
  let isHighPop = false;
  let isCapital = false;
  let hasXboat = false;

  for (const part of parts) {
    // Skip sophont codes like (Tethmari) or O:0304 references
    if (part.startsWith('(') || part.includes(':')) continue;

    const info = TRADE_CODES[part];
    if (info) {
      codes.push(part);
      parsed.push({ code: part, ...info });

      if (part === 'Hi') isHighPop = true;
      if (part === 'Cp' || part === 'Cs' || part === 'Cx') isCapital = true;
      if (part === 'Xb') hasXboat = true;
    }
  }

  return { codes, parsed, isHighPop, isCapital, hasXboat };
}

/**
 * Parse importance extension {+/-N}
 */
function parseImportance(ixStr) {
  if (!ixStr) return { value: 0, raw: '' };
  const match = ixStr.match(/\{\s*([+-]?\d+)\s*\}/);
  return match ? { value: parseInt(match[1], 10), raw: ixStr } : { value: 0, raw: ixStr };
}

/**
 * Parse economic extension (Ex)
 */
function parseEconomic(exStr) {
  if (!exStr) return null;
  const match = exStr.match(/\(([A-Z0-9+-]+)\)/i);
  return match ? { raw: match[1] } : null;
}

/**
 * Parse cultural extension [Cx]
 */
function parseCultural(cxStr) {
  if (!cxStr) return null;
  const match = cxStr.match(/\[([A-Z0-9]+)\]/i);
  return match ? { raw: match[1] } : null;
}

/**
 * Parse PBG (Population multiplier, Belts, Gas giants)
 */
function parsePBG(pbgStr) {
  if (!pbgStr || pbgStr.length < 3) return { popMult: 0, belts: 0, gasGiants: 0 };
  return {
    popMult: parseInt(pbgStr[0], 10) || 0,
    belts: parseInt(pbgStr[1], 10) || 0,
    gasGiants: parseInt(pbgStr[2], 10) || 0
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCRAPING LOGIC
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeSpinwardMarches() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  AR-225: TravellerMap Gentle Scraper');
  console.log(`  Sector: ${SECTOR}`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const result = {
    sector: SECTOR,
    scraped: new Date().toISOString(),
    source: 'https://travellermap.com',
    politeDelay: DELAY_MS,
    systems: {},
    routes: [],
    stats: {
      totalSystems: 0,
      navalBases: 0,
      scoutBases: 0,
      wayStations: 0,
      xboatSystems: 0,
      highPopWorlds: 0,
      capitals: 0,
      amberZones: 0,
      redZones: 0,
      routeCount: 0
    }
  };

  // Step 1: Fetch sector metadata (routes, borders)
  console.log('Step 1: Fetching sector metadata...');
  await delay(DELAY_MS);

  const metadataUrl = `https://travellermap.com/api/metadata?sector=${encodeURIComponent(SECTOR)}`;
  console.log(`  GET ${metadataUrl}`);
  const metadata = await fetchJSON(metadataUrl);

  // Extract routes
  if (metadata.Routes) {
    result.routes = metadata.Routes.map(r => ({
      start: r.Start,
      end: r.End,
      allegiance: r.Allegiance || null,
      startOffsetX: r.StartOffsetX || 0,
      endOffsetX: r.EndOffsetX || 0,
      startOffsetY: r.StartOffsetY || 0,
      endOffsetY: r.EndOffsetY || 0
    }));
    result.stats.routeCount = result.routes.length;
    console.log(`  Found ${result.routes.length} trade/X-boat routes`);

    // Mark systems on routes
    for (const route of result.routes) {
      spinwardMainSystems.add(route.start);
      spinwardMainSystems.add(route.end);
    }
    console.log(`  ${spinwardMainSystems.size} systems on trade routes`);
  }

  // Step 2: Fetch full sector data
  console.log('\nStep 2: Fetching sector data (Tab Delimited)...');
  await delay(DELAY_MS);

  const secUrl = `https://travellermap.com/api/sec?sector=${encodeURIComponent(SECTOR)}&type=TabDelimited`;
  console.log(`  GET ${secUrl}`);
  const secData = await fetch(secUrl);

  // Parse tab-delimited data
  const lines = secData.trim().split('\n');
  const headers = lines[0].split('\t');

  console.log(`  Parsing ${lines.length - 1} systems...`);

  // Column indices
  const col = {};
  headers.forEach((h, i) => col[h] = i);

  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split('\t');
    const hex = fields[col['Hex']];
    const name = fields[col['Name']];

    // Parse all fields
    const bases = parseBases(fields[col['Bases']]);
    const remarks = parseRemarks(fields[col['Remarks']]);
    const importance = parseImportance(fields[col['{Ix}']]);
    const economic = parseEconomic(fields[col['(Ex)']]);
    const cultural = parseCultural(fields[col['[Cx]']]);
    const pbg = parsePBG(fields[col['PBG']]);
    const zone = fields[col['Zone']] || '';
    const allegiance = fields[col['Allegiance']] || '';
    const stars = fields[col['Stars']] || '';
    const worlds = parseInt(fields[col['W']] || '0', 10);

    // Build enriched system data
    const system = {
      hex,
      name,
      uwp: fields[col['UWP']],
      subsector: fields[col['SS']],

      // Bases
      bases: bases.parsed,
      baseCodes: bases.codes.join(''),
      hasNavalBase: bases.codes.includes('N') || bases.codes.includes('A') || bases.codes.includes('B'),
      hasScoutBase: bases.codes.includes('S') || bases.codes.includes('A'),
      hasWayStation: bases.codes.includes('W') || bases.codes.includes('B'),
      hasDepot: bases.codes.includes('D'),

      // Trade codes
      tradeCodes: remarks.codes,
      tradeDetails: remarks.parsed,
      isHighPop: remarks.isHighPop,
      isCapital: remarks.isCapital,
      hasXboatStation: remarks.hasXboat,

      // Travel zone
      zone: zone === 'A' ? 'Amber' : zone === 'R' ? 'Red' : 'Green',
      isAmber: zone === 'A',
      isRed: zone === 'R',

      // Extensions
      importance: importance.value,
      importanceRaw: importance.raw,
      economic: economic?.raw || null,
      cultural: cultural?.raw || null,

      // PBG
      populationMultiplier: pbg.popMult,
      planetoidBelts: pbg.belts,
      gasGiants: pbg.gasGiants,

      // Politics
      allegiance,
      allegianceInfo: ALLEGIANCES[allegiance] || { name: allegiance, short: allegiance },

      // Stellar
      stars,
      worldCount: worlds,

      // Route membership
      onTradeRoute: spinwardMainSystems.has(hex),
      onSpinwardMain: spinwardMainSystems.has(hex)  // Will refine later
    };

    result.systems[hex] = system;
    result.stats.totalSystems++;

    // Update stats
    if (system.hasNavalBase) result.stats.navalBases++;
    if (system.hasScoutBase) result.stats.scoutBases++;
    if (system.hasWayStation) result.stats.wayStations++;
    if (system.hasXboatStation || system.hasWayStation) result.stats.xboatSystems++;
    if (system.isHighPop) result.stats.highPopWorlds++;
    if (system.isCapital) result.stats.capitals++;
    if (system.isAmber) result.stats.amberZones++;
    if (system.isRed) result.stats.redZones++;
  }

  // Step 3: Analyze Spinward Main segments
  console.log('\nStep 3: Analyzing Spinward Main...');
  analyzeSpinwardMain(result);

  // Step 4: Print summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SCRAPING COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total Systems:    ${result.stats.totalSystems}`);
  console.log(`  Trade Routes:     ${result.stats.routeCount}`);
  console.log(`  Naval Bases:      ${result.stats.navalBases}`);
  console.log(`  Scout Bases:      ${result.stats.scoutBases}`);
  console.log(`  Way Stations:     ${result.stats.wayStations}`);
  console.log(`  X-Boat Systems:   ${result.stats.xboatSystems}`);
  console.log(`  High Pop Worlds:  ${result.stats.highPopWorlds}`);
  console.log(`  Capitals:         ${result.stats.capitals}`);
  console.log(`  Amber Zones:      ${result.stats.amberZones}`);
  console.log(`  Red Zones:        ${result.stats.redZones}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Save output
  if (!DRY_RUN) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`Saved to: ${OUTPUT_FILE}`);
  } else {
    console.log('DRY RUN - no file written');
  }

  return result;
}

/**
 * Analyze which systems are on the Spinward Main
 * The Spinward Main is the Jump-1 trade route network
 */
function analyzeSpinwardMain(result) {
  // For now, mark all systems on routes as Spinward Main candidates
  // A more sophisticated analysis would trace Jump-1 paths

  let mainCount = 0;
  for (const hex of Object.keys(result.systems)) {
    if (spinwardMainSystems.has(hex)) {
      result.systems[hex].onSpinwardMain = true;
      mainCount++;
    }
  }

  console.log(`  ${mainCount} systems on Spinward Main trade network`);
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

scrapeSpinwardMarches()
  .then(() => {
    console.log('\n✓ Scraping complete. Be polite to APIs!');
  })
  .catch(err => {
    console.error('Scraping failed:', err);
    process.exit(1);
  });
