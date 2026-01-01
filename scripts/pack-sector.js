#!/usr/bin/env node
/**
 * AR-224: Sector Packer
 *
 * Packs an entire sector (all individual system files) into a single
 * optimized .sector file with smart UIDs and lazy expansion support.
 *
 * Usage: node scripts/pack-sector.js [sector-name]
 * Default: Spinward Marches
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const SYSTEMS_DIR = path.join(DATA_DIR, 'star-systems');
const SECTORS_DIR = path.join(DATA_DIR, 'sectors');
const INDEX_FILE = path.join(SYSTEMS_DIR, '_index.json');

// Config
const SECTOR_NAME = process.argv[2] || 'Spinward Marches';
const SECTOR_SLUG = SECTOR_NAME.toLowerCase().replace(/\s+/g, '-');

// Stats
const stats = {
  systemsLoaded: 0,
  celestialObjects: 0,
  locations: 0,
  errors: []
};

/**
 * Generate a 4-char hash suffix for UIDs
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash);
}

/**
 * Generate smart UID for an object
 */
function generateUID(hex, type, index, parentId = null) {
  const base = parentId
    ? `${hex}-${parentId}-${type}-${index}`
    : `${hex}-${type}-${index}`;
  const hash = hashCode(base).toString(16).slice(0, 4).padStart(4, '0');
  return `${base}-${hash}`;
}

/**
 * Compact stellar format: "G2 V" → "G2V", "G2 V + M5 V" → "G2V+M5V"
 */
function compactStellar(stellar) {
  if (!stellar) return 'G2V';
  if (typeof stellar === 'string') return stellar.replace(/\s+/g, '');
  if (stellar.primary) {
    let compact = stellar.primary.replace(/\s+/g, '');
    if (stellar.secondary) {
      compact += '+' + stellar.secondary.replace(/\s+/g, '');
    }
    return compact;
  }
  return 'G2V';
}

/**
 * Compact trade codes array
 */
function compactTradeCodes(tradeCodes) {
  if (!tradeCodes) return [];
  if (Array.isArray(tradeCodes)) return tradeCodes;
  return tradeCodes.split(/\s+/).filter(Boolean);
}

/**
 * Load a single system file
 */
function loadSystem(filename) {
  const filepath = path.join(SYSTEMS_DIR, filename);
  try {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    return data;
  } catch (err) {
    stats.errors.push({ file: filename, error: err.message });
    return null;
  }
}

/**
 * Compact a system for the sector pack
 */
function compactSystem(system) {
  const compact = {
    id: system.id || system.name.toLowerCase().replace(/\s+/g, '-'),
    hex: system.hex,
    name: system.name,
    uwp: system.uwp,
    sub: system.subsector || '',
    stellar: compactStellar(system.stellar),
    gg: system.gasGiants || 0,
    pb: system.planetoidBelts || 0,
    worlds: system.worlds || 0,
    tc: compactTradeCodes(system.tradeCodes),
    alleg: system.allegiance || 'Im',
    bases: Array.isArray(system.bases) ? system.bases.join('') : (system.bases || '')
  };

  // Optional fields (only if present)
  if (system.wikiUrl) compact.wiki = system.wikiUrl;
  if (system.notes) compact.notes = system.notes;
  if (system.special) compact.special = true;

  return compact;
}

/**
 * Process celestial objects for a system
 */
function processCelestialObjects(system) {
  if (!system.celestialObjects || !Array.isArray(system.celestialObjects)) {
    return [];
  }

  return system.celestialObjects.map((obj, index) => {
    // Keep essential fields, remove redundant data
    const compact = {
      id: obj.id,
      name: obj.name,
      type: obj.type,
      orbitAU: obj.orbitAU,
      bearing: obj.bearing,
      radiusKm: obj.radiusKm
    };

    // Optional fields
    if (obj.parent) compact.parent = obj.parent;
    if (obj.parentId) compact.parentId = obj.parentId;
    if (obj.orbitKm) compact.orbitKm = obj.orbitKm;
    if (obj.orbitRadii) compact.orbitRadii = obj.orbitRadii;
    if (obj.stellarClass) compact.stellarClass = obj.stellarClass;
    if (obj.stellarInfo) compact.stellarInfo = obj.stellarInfo;
    if (obj.uwp) compact.uwp = obj.uwp;
    if (obj.atmosphere) compact.atm = obj.atmosphere;
    if (obj.breathable) compact.breathable = true;
    if (obj.inGoldilocks) compact.goldilocks = true;
    if (obj.isMainworld) compact.mainworld = true;
    if (obj.subtype) compact.subtype = obj.subtype;
    if (obj.transponder && obj.transponder !== 'NONE') compact.transponder = obj.transponder;
    if (obj.gmNotes) compact.notes = obj.gmNotes;
    if (obj.cameraSettings) compact.cam = obj.cameraSettings;
    if (obj.moons && obj.moons.length > 0) compact.moons = obj.moons;

    stats.celestialObjects++;
    return compact;
  });
}

/**
 * Process locations for a system
 */
function processLocations(system) {
  if (!system.locations || !Array.isArray(system.locations)) {
    return [];
  }

  stats.locations += system.locations.length;
  return system.locations.map(loc => ({
    id: loc.id,
    name: loc.name,
    parent: loc.parent,
    type: loc.type || 'surface',
    desc: loc.description,
    travel: loc.travelTimes
  }));
}

/**
 * Main packing function
 */
function packSector() {
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  AR-224: Sector Packer - ${SECTOR_NAME}`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  // Ensure sectors directory exists
  if (!fs.existsSync(SECTORS_DIR)) {
    fs.mkdirSync(SECTORS_DIR, { recursive: true });
  }

  // Load index
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  const sectorSystems = index.systems.filter(s =>
    s.sector === SECTOR_NAME || s.sector === 'N/A'
  );

  console.log(`Found ${sectorSystems.length} systems in index`);

  // Initialize sector pack
  const sectorPack = {
    format: 'sector-pack-v1',
    sector: SECTOR_NAME,
    generated: new Date().toISOString(),
    meta: {
      subsectors: 16,
      totalSystems: 0,
      totalHexes: 1280,  // 32x40 grid
      emptyHexes: 0
    },
    hexIndex: {},
    systems: [],
    celestialData: {},
    locations: {}
  };

  // Process each system
  for (const indexEntry of sectorSystems) {
    const system = loadSystem(indexEntry.file);
    if (!system) continue;

    const arrayIndex = sectorPack.systems.length;
    const hex = system.hex;

    // Add to hex index
    sectorPack.hexIndex[hex] = arrayIndex;

    // Add compact system
    sectorPack.systems.push(compactSystem(system));

    // Add celestial data
    const celestial = processCelestialObjects(system);
    if (celestial.length > 0) {
      sectorPack.celestialData[hex] = celestial;
    }

    // Add locations
    const locs = processLocations(system);
    if (locs.length > 0) {
      sectorPack.locations[hex] = locs;
    }

    stats.systemsLoaded++;
  }

  // Update meta
  sectorPack.meta.totalSystems = sectorPack.systems.length;
  sectorPack.meta.emptyHexes = sectorPack.meta.totalHexes - sectorPack.meta.totalSystems;

  // Calculate checksum (excluding checksum field itself)
  const contentForHash = JSON.stringify({
    format: sectorPack.format,
    sector: sectorPack.sector,
    systems: sectorPack.systems,
    celestialData: sectorPack.celestialData
  });
  sectorPack.checksum = 'sha256:' + crypto.createHash('sha256')
    .update(contentForHash)
    .digest('hex')
    .slice(0, 16);

  // Write sector file
  const outputPath = path.join(SECTORS_DIR, `${SECTOR_SLUG}.sector`);
  const jsonOutput = JSON.stringify(sectorPack, null, 2);
  fs.writeFileSync(outputPath, jsonOutput);

  // Calculate sizes
  const rawSize = Buffer.byteLength(jsonOutput, 'utf-8');
  const compactJson = JSON.stringify(sectorPack);
  const compactSize = Buffer.byteLength(compactJson, 'utf-8');

  // Print results
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  PACKING COMPLETE`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`  Systems:          ${stats.systemsLoaded}`);
  console.log(`  Celestial Objects: ${stats.celestialObjects}`);
  console.log(`  Locations:        ${stats.locations}`);
  console.log(`  Errors:           ${stats.errors.length}`);
  console.log(`  Output:           ${outputPath}`);
  console.log(`  Size (formatted): ${(rawSize / 1024).toFixed(1)} KB`);
  console.log(`  Size (minified):  ${(compactSize / 1024).toFixed(1)} KB`);
  console.log(`  Checksum:         ${sectorPack.checksum}`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  if (stats.errors.length > 0) {
    console.log('Errors:');
    stats.errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
  }

  // Update registry
  updateRegistry(sectorPack, compactSize);

  return sectorPack;
}

/**
 * Update or create sector registry
 */
function updateRegistry(sectorPack, sizeBytes) {
  const registryPath = path.join(SECTORS_DIR, '_registry.json');
  let registry = { version: '1.0', sectors: {} };

  if (fs.existsSync(registryPath)) {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  }

  registry.sectors[SECTOR_SLUG] = {
    name: SECTOR_NAME,
    file: `${SECTOR_SLUG}.sector`,
    systems: sectorPack.meta.totalSystems,
    checksum: sectorPack.checksum,
    sizeBytes: sizeBytes,
    generated: sectorPack.generated
  };

  registry.updated = new Date().toISOString();

  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  console.log(`Registry updated: ${registryPath}`);
}

// Run
packSector();
