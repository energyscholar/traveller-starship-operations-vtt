#!/usr/bin/env node
/**
 * Generate Canonical Star System Data
 *
 * Reads wiki cache and generates canonical celestial object data:
 * - For systems WITH wiki data: Uses exact names from wiki
 * - For systems WITHOUT wiki data: Generates procedural names
 *
 * Updates the sector file's celestialData section.
 *
 * Usage:
 *   node scripts/generate-canonical-systems.js          # Update sector file
 *   node scripts/generate-canonical-systems.js --dry-run # Preview changes
 *   node scripts/generate-canonical-systems.js --system mora # Single system
 */

const fs = require('fs');
const path = require('path');

// Paths
const WIKI_CACHE = path.join(__dirname, '../data/wiki-cache/spinward-marches-wiki.json');
const SECTOR_FILE = path.join(__dirname, '../data/sectors/spinward-marches.sector');
const BACKUP_FILE = path.join(__dirname, '../data/sectors/spinward-marches.sector.backup');

// Parse arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SINGLE_SYSTEM = args.includes('--system') ? args[args.indexOf('--system') + 1] : null;

// ═══════════════════════════════════════════════════════════════════════════
// STELLAR DATA
// ═══════════════════════════════════════════════════════════════════════════

const STELLAR_INFO = {
  'O': { temp: '30000-52000 K', lum: '30000-1000000 Solar', mass: '16-150 Solar', hz: '20-50 AU', desc: 'Blue supergiant', color: '#9bb0ff', radius: 10 },
  'B': { temp: '10000-30000 K', lum: '25-30000 Solar', mass: '2.1-16 Solar', hz: '5-20 AU', desc: 'Blue-white', color: '#aabfff', radius: 5 },
  'A': { temp: '7500-10000 K', lum: '5-25 Solar', mass: '1.4-2.1 Solar', hz: '1.5-3 AU', desc: 'White', color: '#cad7ff', radius: 2 },
  'F': { temp: '6000-7500 K', lum: '1.5-5 Solar', mass: '1.04-1.4 Solar', hz: '1.1-1.8 AU', desc: 'Yellow-white', color: '#f8f7ff', radius: 1.3 },
  'G': { temp: '5200-6000 K', lum: '0.6-1.5 Solar', mass: '0.8-1.04 Solar', hz: '0.8-1.2 AU', desc: 'Yellow (Sol-like)', color: '#fff4ea', radius: 1 },
  'K': { temp: '3700-5200 K', lum: '0.08-0.6 Solar', mass: '0.45-0.8 Solar', hz: '0.4-0.8 AU', desc: 'Orange', color: '#ffd2a1', radius: 0.8 },
  'M': { temp: '2400-3700 K', lum: '0.001-0.08 Solar', mass: '0.08-0.45 Solar', hz: '0.1-0.4 AU', desc: 'Red dwarf', color: '#ffcc6f', radius: 0.5 },
  'D': { temp: '4000-40000 K', lum: '0.001-0.1 Solar', mass: '0.5-1.4 Solar', hz: 'N/A', desc: 'White dwarf', color: '#ffffff', radius: 0.01 },
  'BD': { temp: '300-2000 K', lum: '0.00001 Solar', mass: '0.01-0.08 Solar', hz: 'N/A', desc: 'Brown dwarf', color: '#8b4513', radius: 0.1 }
};

function getStellarInfo(stellarClass) {
  const type = stellarClass?.[0] || 'G';
  return STELLAR_INFO[type] || STELLAR_INFO['G'];
}

function getStarRadius(stellarClass) {
  const info = getStellarInfo(stellarClass);
  return Math.round(696340 * info.radius); // Solar radius in km
}

// ═══════════════════════════════════════════════════════════════════════════
// PROCEDURAL NAME GENERATION
// ═══════════════════════════════════════════════════════════════════════════

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function generateProceduralNames(systemName, uwp, gasGiants, belts, stellar) {
  const result = {
    stars: [],
    celestialObjects: []
  };

  // Parse stellar classification for multiple stars
  const stellarParts = (stellar || 'G2 V').split(/\s+/).filter(p => /^[OBAFGKM]/.test(p));

  // Primary star
  result.stars.push({
    name: `${systemName}`,
    role: 'primary',
    class: stellarParts[0] || 'G2 V'
  });

  // Secondary/companion stars
  const companions = ['B', 'C', 'D'];
  for (let i = 1; i < stellarParts.length && i <= 3; i++) {
    result.stars.push({
      name: `${systemName} ${companions[i-1]}`,
      role: i === 1 ? 'secondary' : 'tertiary',
      class: stellarParts[i]
    });
  }

  // Mainworld is always the system name
  result.mainworld = systemName;

  // Generate inner planets based on UWP population
  // Higher pop = more developed inner system
  const popDigit = parseInt(uwp?.[4], 16) || 0;
  const innerPlanets = Math.min(Math.floor(popDigit / 3) + 1, 4);

  for (let i = 0; i < innerPlanets; i++) {
    result.celestialObjects.push({
      name: `${systemName} ${ROMAN_NUMERALS[i]}`,
      type: 'Planet',
      orbit: i + 1
    });
  }

  // Gas giants
  const ggCount = parseInt(gasGiants) || 0;
  if (ggCount > 0) {
    const ggNames = ggCount === 1 ? ['Major'] : ['Major', 'Minor', 'Outer'].slice(0, ggCount);
    ggNames.forEach((suffix, idx) => {
      result.celestialObjects.push({
        name: `${systemName} ${suffix}`,
        type: 'Gas Giant',
        orbit: innerPlanets + idx + 1
      });
    });
  }

  // Asteroid belts
  const beltCount = parseInt(belts) || 0;
  for (let i = 0; i < beltCount; i++) {
    result.celestialObjects.push({
      name: beltCount === 1 ? `${systemName} Belt` : `${systemName} Belt ${ROMAN_NUMERALS[i]}`,
      type: 'Belt',
      orbit: innerPlanets + ggCount + i + 1
    });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// CELESTIAL OBJECT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

function slugify(name) {
  return name.toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateCelestialData(hex, systemData, wikiData) {
  const celestialObjects = [];
  const systemName = systemData.name;
  const uwp = systemData.uwp;
  const stellar = systemData.stellar;
  const gg = systemData.gg || 0;
  const pb = systemData.pb || 0;

  // Determine if we have wiki data
  const hasWiki = wikiData?.hasWikiData && (wikiData.stars?.length > 0 || wikiData.celestialObjects?.length > 0);

  let names;
  if (hasWiki) {
    // Use wiki data
    names = {
      stars: wikiData.stars || [],
      celestialObjects: wikiData.celestialObjects || [],
      mainworld: systemName
    };
  } else {
    // Generate procedural names
    names = generateProceduralNames(systemName, uwp, gg, pb, stellar);
  }

  // === STARS ===
  const stellarInfo = getStellarInfo(stellar);

  // Primary star
  const primaryName = names.stars.find(s => s.role === 'primary')?.name || systemName;
  celestialObjects.push({
    id: `${hex}-star-${slugify(primaryName)}`,
    name: primaryName,
    type: 'Star',
    orbitAU: 0,
    bearing: 0,
    radiusKm: getStarRadius(stellar),
    stellarClass: stellar || 'G2 V',
    stellarInfo: {
      temperature: stellarInfo.temp,
      luminosity: stellarInfo.lum,
      mass: stellarInfo.mass,
      habitableZone: stellarInfo.hz,
      description: stellarInfo.desc
    },
    color: stellarInfo.color,
    cameraSettings: {
      zoomMultiplier: 0.15,
      offsetX: 0.25,
      offsetY: 0.1,
      description: 'Wide view with inner system visible'
    }
  });

  // Secondary stars
  const secondary = names.stars.find(s => s.role === 'secondary');
  if (secondary) {
    const secInfo = getStellarInfo(secondary.class);
    celestialObjects.push({
      id: `${hex}-star-${slugify(secondary.name)}`,
      name: secondary.name,
      type: 'Star',
      orbitAU: 0.1 + Math.random() * 0.2,
      bearing: Math.floor(Math.random() * 360),
      radiusKm: getStarRadius(secondary.class),
      stellarClass: secondary.class || 'M0 V',
      stellarInfo: {
        temperature: secInfo.temp,
        luminosity: secInfo.lum,
        description: secInfo.desc
      },
      color: secInfo.color
    });
  }

  // === MAINWORLD ===
  const hzAU = parseFloat(stellarInfo.hz?.split('-')[0]) || 1.0;
  const mainworldAU = hzAU * (0.9 + Math.random() * 0.2);

  celestialObjects.push({
    id: `${hex}-mainworld`,
    name: systemName,
    type: 'Planet',
    isMainworld: true,
    uwp: uwp,
    orbitAU: mainworldAU,
    bearing: Math.floor(Math.random() * 360),
    radiusKm: getWorldRadius(uwp),
    atmosphere: getAtmosphereType(uwp),
    breathable: isBreathable(uwp),
    inGoldilocks: true,
    cameraSettings: {
      zoomMultiplier: 0.8,
      offsetX: 0,
      offsetY: 0,
      description: 'Mainworld centered view'
    }
  });

  // === OTHER CELESTIAL OBJECTS ===
  let orbitIndex = 0;
  for (const obj of names.celestialObjects) {
    if (obj.name === systemName) continue; // Skip mainworld (already added)

    const orbitAU = obj.distanceAU || (mainworldAU + (orbitIndex + 1) * (1 + Math.random()));
    orbitIndex++;

    if (obj.type === 'Gas Giant') {
      celestialObjects.push({
        id: `${hex}-gas-giant-${slugify(obj.name)}`,
        name: obj.name,
        type: 'Gas Giant',
        orbitAU: orbitAU,
        bearing: Math.floor(Math.random() * 360),
        radiusKm: 50000 + Math.floor(Math.random() * 30000),
        hasRings: Math.random() > 0.7,
        cameraSettings: {
          zoomMultiplier: 0.5,
          offsetX: 0,
          offsetY: 0,
          description: 'Gas giant view'
        }
      });
    } else if (obj.type === 'Belt') {
      celestialObjects.push({
        id: `${hex}-belt-${slugify(obj.name)}`,
        name: obj.name,
        type: 'Planetoid Belt',
        orbitAU: orbitAU,
        innerAU: orbitAU * 0.9,
        outerAU: orbitAU * 1.1
      });
    } else if (obj.type === 'Planet') {
      celestialObjects.push({
        id: `${hex}-planet-${slugify(obj.name)}`,
        name: obj.name,
        type: 'Planet',
        subtype: 'Rocky',
        orbitAU: obj.distanceAU || (0.3 + orbitIndex * 0.4),
        bearing: Math.floor(Math.random() * 360),
        radiusKm: 2000 + Math.floor(Math.random() * 5000)
      });
    }
  }

  return celestialObjects;
}

// UWP helpers
function getWorldRadius(uwp) {
  const sizeDigit = parseInt(uwp?.[1], 16) || 5;
  return 800 * sizeDigit; // Rough km
}

function getAtmosphereType(uwp) {
  const atmo = parseInt(uwp?.[2], 16) || 0;
  const types = ['None', 'Trace', 'Very Thin Tainted', 'Very Thin', 'Thin Tainted',
                 'Thin', 'Standard', 'Standard Tainted', 'Dense', 'Dense Tainted',
                 'Exotic', 'Corrosive', 'Insidious', 'Very Dense', 'Low', 'Unusual'];
  return types[atmo] || 'Standard';
}

function isBreathable(uwp) {
  const atmo = parseInt(uwp?.[2], 16) || 0;
  return [5, 6, 8].includes(atmo); // Thin, Standard, Dense (non-tainted)
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  CANONICAL SYSTEM GENERATOR');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'UPDATE'}`);
  console.log(`  System: ${SINGLE_SYSTEM || 'ALL'}`);
  console.log('');

  // Load wiki cache
  let wikiCache = { systems: {} };
  if (fs.existsSync(WIKI_CACHE)) {
    console.log('Loading wiki cache...');
    wikiCache = JSON.parse(fs.readFileSync(WIKI_CACHE, 'utf8'));
    console.log(`  Systems with wiki data: ${wikiCache.meta?.systemsWithWikiData || 0}`);
  } else {
    console.log('No wiki cache found - using procedural generation only');
  }

  // Load sector file
  console.log('Loading sector file...');
  const sectorData = JSON.parse(fs.readFileSync(SECTOR_FILE, 'utf8'));
  console.log(`  Systems: ${sectorData.systems.length}`);

  // Backup sector file
  if (!DRY_RUN) {
    console.log('Creating backup...');
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(sectorData, null, 2));
  }

  // Initialize celestialData if not present
  if (!sectorData.celestialData) {
    sectorData.celestialData = {};
  }

  // Process systems
  const systems = SINGLE_SYSTEM
    ? sectorData.systems.filter(s => s.name.toLowerCase() === SINGLE_SYSTEM.toLowerCase())
    : sectorData.systems.filter(s => s.hex !== '0000');

  console.log(`\nProcessing ${systems.length} systems...\n`);

  let withWiki = 0;
  let procedural = 0;

  for (const system of systems) {
    const hex = system.hex;
    const wikiData = wikiCache.systems[hex];

    const celestialObjects = generateCelestialData(hex, system, wikiData);

    if (wikiData?.hasWikiData) {
      withWiki++;
      if (DRY_RUN) {
        console.log(`[WIKI] ${system.name} (${hex}): ${celestialObjects.length} objects`);
      }
    } else {
      procedural++;
    }

    sectorData.celestialData[hex] = celestialObjects;
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  With wiki data: ${withWiki}`);
  console.log(`  Procedural: ${procedural}`);
  console.log(`  Total: ${withWiki + procedural}`);

  if (!DRY_RUN) {
    console.log('\nSaving sector file...');
    fs.writeFileSync(SECTOR_FILE, JSON.stringify(sectorData, null, 2));
    console.log('Done!');
  } else {
    console.log('\n[DRY RUN - no changes made]');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
