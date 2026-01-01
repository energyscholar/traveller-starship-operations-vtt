#!/usr/bin/env node
/**
 * AR-222: Generate Complete Spinward Marches Sector Data
 *
 * Fetches system data from TravellerMap API, generates celestial objects
 * using the astrophysics engine, and writes 16 subsector JSON files.
 *
 * Run: node scripts/generate-spinward-marches.js
 *
 * Output:
 * - data/star-systems/spinward-marches/subsector-*.json (16 files)
 * - data/star-systems/spinward-marches/_sector-meta.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const {
  calculateGoldilocks,
  generateSystem,
  calculateOptimalCamera,
  hashCode
} = require('../lib/astrophysics');

// === CONFIGURATION ===
const SECTOR_NAME = 'Spinward Marches';
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'star-systems', 'spinward-marches');
const EXISTING_DIR = path.join(__dirname, '..', 'data', 'star-systems');
const API_BASE = 'https://travellermap.com';

// Cache for existing system files
const existingSystemsCache = new Map();

// Subsector definitions (A-P)
const SUBSECTORS = [
  { letter: 'A', name: 'Cronor', colRange: [1, 8], rowRange: [1, 10] },
  { letter: 'B', name: 'Jewell', colRange: [9, 16], rowRange: [1, 10] },
  { letter: 'C', name: 'Vilis', colRange: [17, 24], rowRange: [1, 10] },
  { letter: 'D', name: 'Rhylanor', colRange: [25, 32], rowRange: [1, 10] },
  { letter: 'E', name: 'Querion', colRange: [1, 8], rowRange: [11, 20] },
  { letter: 'F', name: 'Regina', colRange: [9, 16], rowRange: [11, 20] },
  { letter: 'G', name: 'Lanth', colRange: [17, 24], rowRange: [11, 20] },
  { letter: 'H', name: 'Aramis', colRange: [25, 32], rowRange: [11, 20] },
  { letter: 'I', name: 'Darrian', colRange: [1, 8], rowRange: [21, 30] },
  { letter: 'J', name: 'Sword Worlds', colRange: [9, 16], rowRange: [21, 30] },
  { letter: 'K', name: 'Lunion', colRange: [17, 24], rowRange: [21, 30] },
  { letter: 'L', name: 'Mora', colRange: [25, 32], rowRange: [21, 30] },
  { letter: 'M', name: 'Five Sisters', colRange: [1, 8], rowRange: [31, 40] },
  { letter: 'N', name: 'District 268', colRange: [9, 16], rowRange: [31, 40] },
  { letter: 'O', name: 'Glisten', colRange: [17, 24], rowRange: [31, 40] },
  { letter: 'P', name: 'Trin\'s Veil', colRange: [25, 32], rowRange: [31, 40] }
];

// === EXISTING FILE LOADING ===
function loadExistingSystems() {
  log('Loading existing star system files for merge...');

  const indexPath = path.join(EXISTING_DIR, '_index.json');
  if (!fs.existsSync(indexPath)) {
    log('No existing index found, will generate all systems');
    return;
  }

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  let loaded = 0;
  let withEncyclopedia = 0;

  for (const entry of index.systems || []) {
    if (entry.special) continue;  // Skip jumpspace etc

    const filePath = path.join(EXISTING_DIR, entry.file);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Index by system name (lowercase, normalized)
        const key = data.name.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '-');
        existingSystemsCache.set(key, data);
        loaded++;
        if (data.wikiUrl || data.celestialObjects?.length > 0) {
          withEncyclopedia++;
        }
      } catch (err) {
        log(`  Warning: Failed to load ${entry.file}: ${err.message}`);
      }
    }
  }

  log(`Loaded ${loaded} existing systems (${withEncyclopedia} with encyclopedia data)`);
}

function getExistingSystem(name) {
  const key = name.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '-');
  return existingSystemsCache.get(key);
}

// === LOGGING ===
function log(message) {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] ${message}`);
}

function logProgress(phase, current, total, detail) {
  const pct = Math.round((current / total) * 100);
  log(`Phase ${phase}: ${pct}% (${current}/${total}) - ${detail}`);
}

// === API FETCHING ===
function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function fetchSECData() {
  log('Fetching SEC data from TravellerMap...');

  const url = `${API_BASE}/api/sec?sector=${encodeURIComponent(SECTOR_NAME)}&type=SecondSurvey`;

  try {
    const data = await fetchURL(url);
    const lines = data.split('\n').filter(line => line.trim() && !line.startsWith('#'));

    log(`Received ${lines.length} lines from TravellerMap`);
    return lines;
  } catch (err) {
    log(`ERROR fetching SEC data: ${err.message}`);
    throw err;
  }
}

// === SEC PARSING ===
// SEC format (Second Survey): Hex Name UWP Bases Remarks Zone PBG Allegiance Stars
// Example: "3235 Trin                 A894A96-F Hi In Cp Ht                          { 5 }  (D9H+4) [9F4E] BEF   NS - 101 8  ImDd G0 V"
function parseSECLine(line) {
  if (!line || line.length < 50) return null;

  try {
    // New format: hex at start (4 chars), then space, then name
    const hex = line.substring(0, 4).trim();
    if (!/^\d{4}$/.test(hex)) return null;  // Skip non-hex lines

    const name = line.substring(5, 20).trim();
    // UWP is 9 characters (e.g., A867974-C)
    const uwp = line.substring(20, 30).trim();

    // Find stellar class at end (after last space)
    const stellarMatch = line.match(/([OBAFGKMLDT]\d?\s*V?[I]*)\s*$/i);
    const stellar = stellarMatch ? stellarMatch[0].trim() : 'G2 V';

    // Find PBG (3 digits near end) - format: PPP
    const pbgMatch = line.match(/\s(\d{3})\s+\d+\s+\w+\s+[OBAFGKMLDT]/);
    const pbg = pbgMatch ? pbgMatch[1] : '000';

    // Gas giants from PBG (third digit)
    const gasGiants = parseInt(pbg[2] || '0', 10) || 0;

    // Find bases (N, S, W etc) - usually after allegiance
    const basesMatch = line.match(/\s([NSW-]+)\s+-\s+\d{3}/);
    const bases = basesMatch ? basesMatch[1].trim() : '';

    return {
      name,
      hex,
      uwp,
      bases,
      remarks: '',
      zone: '',
      pbg,
      allegiance: '',
      stellar,
      gasGiants
    };
  } catch (err) {
    log(`Warning: Failed to parse line: ${line}`);
    return null;
  }
}

// === SUBSECTOR MAPPING ===
function getSubsectorForHex(hex) {
  const col = parseInt(hex.substring(0, 2), 10);
  const row = parseInt(hex.substring(2, 4), 10);

  for (const sub of SUBSECTORS) {
    if (col >= sub.colRange[0] && col <= sub.colRange[1] &&
        row >= sub.rowRange[0] && row <= sub.rowRange[1]) {
      return sub.letter;
    }
  }
  return null;
}

// === EMPTY HEX GENERATION ===
function generateEmptyHexes(subsector, existingSystems) {
  const emptyHexes = [];
  const existingHexes = new Set(existingSystems.map(s => s.hex));

  const sub = SUBSECTORS.find(s => s.letter === subsector);
  if (!sub) return [];

  for (let col = sub.colRange[0]; col <= sub.colRange[1]; col++) {
    for (let row = sub.rowRange[0]; row <= sub.rowRange[1]; row++) {
      const hex = String(col).padStart(2, '0') + String(row).padStart(2, '0');

      if (!existingHexes.has(hex)) {
        const seed = hashCode(`empty-${hex}`);
        emptyHexes.push({
          hex,
          type: 'deep_space',
          name: `Deep Space (${hex})`,
          celestialObjects: [],
          locations: [{
            id: 'waypoint',
            type: 'space',
            name: 'Deep Space Waypoint',
            x: 0,
            y: 0
          }],
          systemCamera: {
            zoom: 0.05,
            offsetX: 0,
            offsetY: 0,
            focusObject: 'waypoint'
          },
          backgroundSeed: seed
        });
      }
    }
  }

  return emptyHexes;
}

// === SYSTEM GENERATION ===
// Merge counters for reporting
let mergeStats = { existing: 0, generated: 0 };

function generateFullSystem(secData) {
  const seed = hashCode(secData.hex);

  // Check for existing system with encyclopedia data first
  const existing = getExistingSystem(secData.name);

  if (existing && existing.celestialObjects && existing.celestialObjects.length > 0) {
    // Use existing rich data (preserves wikiUrl, stellarInfo, gmNotes, etc.)
    mergeStats.existing++;
    return {
      id: existing.id || secData.name.toLowerCase().replace(/\s+/g, '-'),
      hex: secData.hex,  // Use SEC hex (canonical)
      name: secData.name,
      uwp: secData.uwp,
      stellar: existing.stellar || { primary: secData.stellar },
      bases: secData.bases,
      remarks: secData.remarks,
      zone: secData.zone || existing.zone,
      pbg: secData.pbg,
      allegiance: secData.allegiance || existing.allegiance,
      gasGiants: secData.gasGiants,
      // Preserve encyclopedia data
      wikiUrl: existing.wikiUrl,
      tradeCodes: existing.tradeCodes,
      notes: existing.notes,
      worlds: existing.worlds,
      planetoidBelts: existing.planetoidBelts,
      // Use existing celestial objects (have wikiInfo, stellarInfo)
      celestialObjects: existing.celestialObjects,
      locations: existing.locations || generateLocations(secData),
      systemCamera: existing.systemCamera || calculateOptimalCamera(existing.celestialObjects, seed),
      // Mark as merged
      _source: 'existing_encyclopedia'
    };
  }

  // Generate new system (no existing data)
  mergeStats.generated++;
  const celestialObjects = generateSystem(
    secData.hex,
    secData.uwp,
    secData.stellar,
    secData.gasGiants
  );

  const systemCamera = calculateOptimalCamera(celestialObjects, seed);

  return {
    id: secData.name.toLowerCase().replace(/\s+/g, '-'),
    hex: secData.hex,
    name: secData.name,
    uwp: secData.uwp,
    stellar: { primary: secData.stellar },
    bases: secData.bases,
    remarks: secData.remarks,
    zone: secData.zone,
    pbg: secData.pbg,
    allegiance: secData.allegiance,
    gasGiants: secData.gasGiants,
    celestialObjects,
    locations: generateLocations(secData),
    systemCamera,
    _source: 'generated_astrophysics'
  };
}

function generateLocations(secData) {
  const locations = [];
  if (secData.bases && secData.bases.includes('N')) {
    locations.push({ id: 'naval-base', type: 'station', name: 'Naval Base' });
  }
  if (secData.bases && secData.bases.includes('S')) {
    locations.push({ id: 'scout-base', type: 'station', name: 'Scout Base' });
  }
  if (secData.bases && secData.bases.includes('W')) {
    locations.push({ id: 'way-station', type: 'station', name: 'Way Station' });
  }
  return locations;
}

// === FILE WRITING ===
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`Created directory: ${dir}`);
  }
}

function writeSubsectorFile(subsector, systems, emptyHexes) {
  const sub = SUBSECTORS.find(s => s.letter === subsector);
  const filename = `subsector-${subsector.toLowerCase()}-${sub.name.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);

  const data = {
    subsector: subsector,
    name: sub.name,
    sector: SECTOR_NAME,
    hexRange: {
      colMin: sub.colRange[0],
      colMax: sub.colRange[1],
      rowMin: sub.rowRange[0],
      rowMax: sub.rowRange[1]
    },
    generated: new Date().toISOString(),
    systems,
    emptyHexes
  };

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

  const sizeKb = Math.round(fs.statSync(filepath).size / 1024);
  log(`  Wrote ${filename} (${sizeKb} KB) - ${systems.length} systems, ${emptyHexes.length} empty hexes`);

  return filepath;
}

function writeSectorMeta(totalSystems, totalEmpty, subsectorFiles) {
  const meta = {
    sector: SECTOR_NAME,
    generated: new Date().toISOString(),
    generator: 'AR-222 generate-spinward-marches.js',
    totalSystems,
    totalEmptyHexes: totalEmpty,
    subsectorCount: 16,
    subsectorFiles
  };

  const filepath = path.join(OUTPUT_DIR, '_sector-meta.json');
  fs.writeFileSync(filepath, JSON.stringify(meta, null, 2));
  log(`Wrote sector metadata: ${filepath}`);
}

// === MAIN ===
async function main() {
  log('========================================');
  log('AR-222: Spinward Marches Generation');
  log('  (with encyclopedia merge)');
  log('========================================');

  const startTime = Date.now();

  // Phase 0: Load existing encyclopedia data
  log('\nPhase 0: Loading existing encyclopedia data...');
  loadExistingSystems();

  // Phase 1: Fetch
  log('\nPhase 1: Fetching data from TravellerMap...');
  const secLines = await fetchSECData();

  // Phase 2: Parse
  log('\nPhase 2: Parsing SEC data...');
  const systems = [];
  for (const line of secLines) {
    const parsed = parseSECLine(line);
    if (parsed) {
      systems.push(parsed);
    }
  }
  log(`Parsed ${systems.length} systems`);

  // Phase 3: Group by subsector
  log('\nPhase 3: Grouping by subsector...');
  const bySubsector = {};
  for (const sub of SUBSECTORS) {
    bySubsector[sub.letter] = [];
  }
  for (const sys of systems) {
    const sub = getSubsectorForHex(sys.hex);
    if (sub && bySubsector[sub]) {
      bySubsector[sub].push(sys);
    }
  }

  // Phase 4: Generate and write
  log('\nPhase 4: Generating celestial objects and writing files...');
  ensureDir(OUTPUT_DIR);

  let totalSystems = 0;
  let totalEmpty = 0;
  const subsectorFiles = [];

  for (let i = 0; i < SUBSECTORS.length; i++) {
    const sub = SUBSECTORS[i];
    const subSystems = bySubsector[sub.letter];

    logProgress(4, i + 1, SUBSECTORS.length, `Subsector ${sub.letter}: ${sub.name}`);

    // Generate full system data
    const generatedSystems = subSystems.map(sec => generateFullSystem(sec));

    // Generate empty hexes
    const emptyHexes = generateEmptyHexes(sub.letter, subSystems);

    // Write file
    const filepath = writeSubsectorFile(sub.letter, generatedSystems, emptyHexes);
    subsectorFiles.push(path.basename(filepath));

    totalSystems += generatedSystems.length;
    totalEmpty += emptyHexes.length;
  }

  // Phase 5: Write metadata
  log('\nPhase 5: Writing sector metadata...');
  writeSectorMeta(totalSystems, totalEmpty, subsectorFiles);

  // Summary
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  log('\n========================================');
  log('GENERATION COMPLETE');
  log('========================================');
  log(`Total systems: ${totalSystems}`);
  log(`  - From encyclopedia: ${mergeStats.existing}`);
  log(`  - Newly generated:   ${mergeStats.generated}`);
  log(`Total empty hexes: ${totalEmpty}`);
  log(`Output directory: ${OUTPUT_DIR}`);
  log(`Time elapsed: ${elapsed}s`);
  log('========================================');
}

main().catch(err => {
  log(`FATAL ERROR: ${err.message}`);
  console.error(err);
  process.exit(1);
});
