#!/usr/bin/env node
/**
 * Generate star system JSON files from TravellerMap API data
 * AR-122: Enhanced with API integration, validation, batch modes
 *
 * Usage:
 *   node scripts/generate-star-systems-v2.js --system mora
 *   node scripts/generate-star-systems-v2.js --subsector Regina --sector "Spinward Marches"
 *   node scripts/generate-star-systems-v2.js --sector "Spinward Marches"
 *   node scripts/generate-star-systems-v2.js --deep-space --sector "Spinward Marches" --subsector Mora
 *   node scripts/generate-star-systems-v2.js --validate
 */

const fs = require('fs');
const path = require('path');
const travellerMapClient = require('../lib/traveller-map-client');

const STAR_SYSTEMS_DIR = path.join(__dirname, '../data/star-systems');
const INDEX_FILE = path.join(STAR_SYSTEMS_DIR, '_index.json');
const SCHEMA_FILE = path.join(__dirname, '../data/schemas/star-system.schema.json');
const DEEP_SPACE_TEMPLATE = path.join(STAR_SYSTEMS_DIR, 'templates/deep-space.template.json');

// Subsector letter to name mapping for Spinward Marches
const SM_SUBSECTOR_MAP = {
  A: 'Cronor', B: 'Jewell', C: 'Vilis', D: 'Rhylanor',
  E: 'Querion', F: 'Regina', G: 'Lanth', H: 'Aramis',
  I: 'Darrian', J: 'Sword Worlds', K: 'Lunion', L: 'Mora',
  M: 'Five Sisters', N: 'District 268', O: 'Trojan Reach', P: "Trin's Veil"
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    system: null,
    subsector: null,
    sector: 'Spinward Marches',
    deepSpace: false,
    validate: false,
    force: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--system' && args[i + 1]) opts.system = args[++i];
    else if (arg === '--subsector' && args[i + 1]) opts.subsector = args[++i];
    else if (arg === '--sector' && args[i + 1]) opts.sector = args[++i];
    else if (arg === '--deep-space') opts.deepSpace = true;
    else if (arg === '--validate') opts.validate = true;
    else if (arg === '--force') opts.force = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
  }

  return opts;
}

function showHelp() {
  console.log(`
Star System Generator v2 (AR-122)

Usage:
  node scripts/generate-star-systems-v2.js [options]

Options:
  --system <name>       Generate single system by name
  --subsector <name>    Generate all systems in subsector
  --sector <name>       Sector name (default: "Spinward Marches")
  --deep-space          Generate deep space templates for empty hexes
  --validate            Validate all existing system files
  --force               Overwrite existing files
  --help, -h            Show this help

Examples:
  node scripts/generate-star-systems-v2.js --system mora
  node scripts/generate-star-systems-v2.js --subsector Regina
  node scripts/generate-star-systems-v2.js --sector "Spinward Marches" --subsector Mora
  node scripts/generate-star-systems-v2.js --deep-space --subsector Mora
  node scripts/generate-star-systems-v2.js --validate
`);
}

// UWP parsing
function parseUWP(uwp) {
  const chars = uwp.split('');
  const hexToNum = c => parseInt(c, 36) || 0;
  return {
    starport: chars[0],
    size: hexToNum(chars[1]),
    atmosphere: hexToNum(chars[2]),
    hydrographics: hexToNum(chars[3]),
    population: hexToNum(chars[4]),
    government: hexToNum(chars[5]),
    lawLevel: hexToNum(chars[6]),
    techLevel: hexToNum(chars[8] || '0')
  };
}

function getAtmosphereDesc(atmo) {
  const types = ['None', 'Trace', 'Very Thin Tainted', 'Very Thin', 'Thin Tainted', 'Thin',
    'Standard', 'Standard Tainted', 'Dense', 'Dense Tainted', 'Exotic', 'Corrosive',
    'Insidious', 'Dense High', 'Thin Low', 'Unusual'];
  return types[atmo] || 'Unknown';
}

function getStarportClass(port) {
  const classes = { A: 'Excellent', B: 'Good', C: 'Routine', D: 'Poor', E: 'Frontier', X: 'None' };
  return classes[port] || 'Unknown';
}

// Calculate orbital distance based on atmosphere (Goldilocks zone)
function calculateOrbitAU(atmosphere) {
  if (atmosphere >= 3 && atmosphere <= 8) {
    const distFromIdeal = Math.abs(atmosphere - 6);
    return 1.0 + distFromIdeal * 0.1 + (Math.random() - 0.5) * 0.1;
  }
  if (atmosphere < 3) return 0.4 + Math.random() * 0.4;
  return 1.5 + Math.random() * 1.0;
}

// Get stellar info based on spectral class
function getStellarInfo(stellarClass) {
  const [type, luminosity] = (stellarClass || 'G2 V').split(' ');
  const spectral = type[0];

  const info = {
    O: { temp: '30,000-50,000 K', lum: '30,000-1,000,000 Solar', mass: '16-150 Solar', hz: '10-50 AU', desc: 'Blue supergiant' },
    B: { temp: '10,000-30,000 K', lum: '25-30,000 Solar', mass: '2-16 Solar', hz: '3-10 AU', desc: 'Blue-white giant' },
    A: { temp: '7,500-10,000 K', lum: '5-25 Solar', mass: '1.4-2.1 Solar', hz: '1.5-3 AU', desc: 'White main sequence' },
    F: { temp: '6,000-7,500 K', lum: '1.5-5 Solar', mass: '1.04-1.4 Solar', hz: '1.2-1.8 AU', desc: 'Yellow-white main sequence' },
    G: { temp: '5,200-6,000 K', lum: '0.6-1.5 Solar', mass: '0.8-1.04 Solar', hz: '0.8-1.2 AU', desc: 'Yellow main sequence (Sol-like)' },
    K: { temp: '3,700-5,200 K', lum: '0.08-0.6 Solar', mass: '0.45-0.8 Solar', hz: '0.4-0.8 AU', desc: 'Orange main sequence' },
    M: { temp: '2,400-3,700 K', lum: '0.0001-0.08 Solar', mass: '0.08-0.45 Solar', hz: '0.1-0.4 AU', desc: 'Red dwarf' },
    D: { temp: '4,000-100,000 K', lum: '0.0001-0.01 Solar', mass: '0.2-1.4 Solar', hz: 'N/A', desc: 'White dwarf' }
  };

  const data = info[spectral] || info.G;
  return {
    temperature: data.temp,
    luminosity: data.lum,
    mass: data.mass,
    habitableZone: data.hz,
    description: data.desc
  };
}

// Generate a star system JSON from TravellerMap data
function generateSystemFromAPIData(apiSys, sector, subsector) {
  const uwp = parseUWP(apiSys.uwp);
  const id = apiSys.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const stellarParts = (apiSys.stellar || 'G2 V').split(' ');
  const primaryClass = stellarParts.slice(0, 2).join(' ');
  const stellarType = stellarParts.length > 2 ? 'Binary' : 'Single';

  const hasGasGiants = !(apiSys.remarks || '').includes('Ba') && Math.random() > 0.3;
  const gasGiants = hasGasGiants ? Math.floor(Math.random() * 3) + 1 : 0;

  const system = {
    id,
    name: apiSys.name,
    sector,
    subsector,
    hex: apiSys.hex,
    uwp: apiSys.uwp,
    tradeCodes: (apiSys.remarks || '').split(/\s+/).filter(tc => tc.length === 2),
    allegiance: apiSys.allegiance || 'Im',
    bases: [],
    stellar: {
      primary: primaryClass,
      type: stellarType
    },
    worlds: 6 + Math.floor(Math.random() * 8),
    gasGiants,
    planetoidBelts: Math.floor(Math.random() * 2),
    notes: `${getStarportClass(uwp.starport)} starport. TL${uwp.techLevel}.`,
    wikiUrl: `https://wiki.travellerrpg.com/${encodeURIComponent(apiSys.name)}_(world)`,

    celestialObjects: [
      {
        id: `${id}-star`,
        name: `${apiSys.name} Primary`,
        type: 'Star',
        orbitAU: 0,
        bearing: 0,
        radiusKm: 696340 * (getStellarInfo(primaryClass).mass === '0.08-0.45 Solar' ? 0.3 : 1),
        stellarClass: primaryClass,
        stellarInfo: getStellarInfo(primaryClass),
        transponder: 'NONE',
        gmNotes: `${primaryClass} ${stellarType === 'Binary' ? 'with companion' : 'primary'}.`,
        cameraSettings: {
          zoomMultiplier: 0.15,
          offsetX: 0.25,
          offsetY: 0.1,
          description: 'Wide corona view with inner system visible'
        }
      },
      {
        id: `${id}-mainworld`,
        name: apiSys.name,
        type: 'Planet',
        orbitAU: calculateOrbitAU(uwp.atmosphere),
        bearing: Math.floor(Math.random() * 360),
        radiusKm: uwp.size * 800 + 800,
        uwp: apiSys.uwp,
        atmosphere: getAtmosphereDesc(uwp.atmosphere),
        breathable: uwp.atmosphere >= 5 && uwp.atmosphere <= 8,
        inGoldilocks: uwp.atmosphere >= 3 && uwp.atmosphere <= 8,
        transponder: `${apiSys.name.toUpperCase()} CONTROL`,
        gmNotes: `Mainworld. Pop ${uwp.population > 0 ? '10^' + uwp.population : '0'}. TL${uwp.techLevel}.`,
        cameraSettings: {
          zoomMultiplier: 0.8,
          offsetX: 0,
          offsetY: 0,
          description: 'Standard world view'
        }
      }
    ],

    locations: {
      default: `${id}-mainworld`,
      starport: uwp.starport <= 'B' ? `${id}-highport` : `${id}-mainworld`,
      orbit: `${id}-mainworld`
    }
  };

  // Add highport for Class A/B starports
  if (uwp.starport === 'A' || uwp.starport === 'B') {
    system.celestialObjects.push({
      id: `${id}-highport`,
      name: `${apiSys.name} Highport`,
      type: 'Highport',
      parent: `${id}-mainworld`,
      orbitKm: 400,
      bearing: 268,
      radiusKm: 2,
      transponder: `${apiSys.name.toUpperCase()} HIGHPORT`,
      gmNotes: `Class ${uwp.starport} ${getStarportClass(uwp.starport)} starport orbital facility.`,
      celestial: false,
      cameraSettings: {
        zoomMultiplier: 1.0,
        offsetX: 0,
        offsetY: 0,
        description: 'Station approach'
      }
    });
  }

  // Add gas giant if present
  if (gasGiants > 0) {
    system.celestialObjects.push({
      id: `${id}-gasgiant`,
      name: `${apiSys.name} Gas Giant`,
      type: 'Gas Giant',
      orbitAU: 5 + Math.random() * 3,
      bearing: Math.floor(Math.random() * 360),
      radiusKm: 50000 + Math.random() * 20000,
      transponder: 'NONE',
      gmNotes: 'Gas giant suitable for fuel skimming.',
      cameraSettings: {
        zoomMultiplier: 0.5,
        offsetX: 0,
        offsetY: 0,
        description: 'Gas giant view'
      }
    });
  }

  return system;
}

// Generate deep space hex
function generateDeepSpace(hex, sector, subsector) {
  const id = `deep-space-${sector.toLowerCase().replace(/\s+/g, '-')}-${hex}`;

  return {
    id,
    name: `Deep Space (${hex})`,
    sector,
    subsector,
    hex,
    isDeepSpace: true,
    special: true,
    notes: 'Empty hex - no star system present. Used for jump transit or emergency dropout.',

    celestialObjects: [
      {
        id: `${id}-void`,
        name: 'Deep Space',
        type: 'Deep Space',
        orbitAU: 0,
        bearing: 0,
        radiusKm: 0,
        transponder: 'NONE',
        gmNotes: 'Empty space between stars. No natural gravity wells.',
        cameraSettings: {
          zoomMultiplier: 0.1,
          offsetX: 0,
          offsetY: 0,
          description: 'Starfield view'
        }
      }
    ],

    locations: {
      default: `${id}-void`
    }
  };
}

// Load existing index
function loadIndex() {
  if (fs.existsSync(INDEX_FILE)) {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  }
  return {
    version: '1.0.0',
    description: 'Star system registry for Operations VTT',
    schemaVersion: '1.0',
    systems: [],
    subsectors: []
  };
}

// Save index
function saveIndex(index) {
  // Sort systems by sector, subsector, hex
  index.systems.sort((a, b) => {
    if (a.sector !== b.sector) return (a.sector || '').localeCompare(b.sector || '');
    if (a.subsector !== b.subsector) return (a.subsector || '').localeCompare(b.subsector || '');
    return (a.hex || '').localeCompare(b.hex || '');
  });

  // Update subsectors list
  const subsectors = new Set(index.systems.map(s => s.subsector).filter(Boolean));
  index.subsectors = Array.from(subsectors).sort();

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

// Add system to index
function addToIndex(index, system) {
  // Remove existing entry if present
  index.systems = index.systems.filter(s => s.id !== system.id);

  index.systems.push({
    id: system.id,
    name: system.name,
    hex: system.hex,
    sector: system.sector,
    subsector: system.subsector,
    file: `${system.id}.json`,
    special: system.special || undefined,
    isDeepSpace: system.isDeepSpace || undefined
  });
}

// Validate a system against schema
function validateSystem(system, schema) {
  const errors = [];

  // Required fields
  for (const field of schema.required || []) {
    if (system[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Type checks
  if (system.id && !/^[a-z0-9-]+$/.test(system.id)) {
    errors.push(`Invalid id format: ${system.id}`);
  }
  if (system.hex && !/^\d{4}$/.test(system.hex)) {
    errors.push(`Invalid hex format: ${system.hex}`);
  }
  if (system.uwp && !/^[A-EX][0-9A-Z]{6,7}-[0-9A-Z]$/.test(system.uwp)) {
    errors.push(`Invalid UWP format: ${system.uwp}`);
  }

  // Celestial objects
  if (Array.isArray(system.celestialObjects)) {
    for (const obj of system.celestialObjects) {
      if (!obj.id) errors.push(`Celestial object missing id`);
      if (!obj.name) errors.push(`Celestial object missing name`);
      if (!obj.type) errors.push(`Celestial object missing type`);
    }
  }

  return errors;
}

// Validate all systems
async function validateAllSystems() {
  console.log('Validating all star system files...\n');

  const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
  const files = fs.readdirSync(STAR_SYSTEMS_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));

  let valid = 0;
  let invalid = 0;

  for (const file of files) {
    if (file === 'templates') continue;
    const filepath = path.join(STAR_SYSTEMS_DIR, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) continue;

    try {
      const system = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      const errors = validateSystem(system, schema);

      if (errors.length > 0) {
        console.log(`\x1b[31m✗ ${file}\x1b[0m`);
        errors.forEach(e => console.log(`  - ${e}`));
        invalid++;
      } else {
        console.log(`\x1b[32m✓ ${file}\x1b[0m`);
        valid++;
      }
    } catch (err) {
      console.log(`\x1b[31m✗ ${file}: ${err.message}\x1b[0m`);
      invalid++;
    }
  }

  console.log(`\n${valid} valid, ${invalid} invalid`);
  return invalid === 0;
}

// Main execution
async function main() {
  const opts = parseArgs();

  if (opts.help) {
    showHelp();
    return;
  }

  if (opts.validate) {
    const success = await validateAllSystems();
    process.exit(success ? 0 : 1);
  }

  console.log('Star System Generator v2 (AR-122)\n');

  // Ensure directories exist
  if (!fs.existsSync(STAR_SYSTEMS_DIR)) {
    fs.mkdirSync(STAR_SYSTEMS_DIR, { recursive: true });
  }

  const index = loadIndex();
  let generated = 0;
  let skipped = 0;

  // Generate single system by name
  if (opts.system) {
    console.log(`Searching for system: ${opts.system}...`);
    try {
      const results = await travellerMapClient.searchWorld(opts.system);
      if (results.length === 0) {
        console.error(`System not found: ${opts.system}`);
        process.exit(1);
      }

      // Results are wrapped in World property
      const worlds = results.map(r => r.World).filter(Boolean);
      if (worlds.length === 0) {
        console.error(`System not found: ${opts.system}`);
        process.exit(1);
      }

      // Find exact match or first result
      const match = worlds.find(w => w.Name.toLowerCase() === opts.system.toLowerCase()) || worlds[0];
      const hex = String(match.HexX).padStart(2, '0') + String(match.HexY).padStart(2, '0');
      console.log(`Found: ${match.Name} (${match.Sector} ${hex})`);

      // Determine subsector letter from hex coordinates
      const subsectorCol = Math.floor((match.HexX - 1) / 8);
      const subsectorRow = Math.floor((match.HexY - 1) / 10);
      const subsectorLetter = String.fromCharCode(65 + subsectorRow * 4 + subsectorCol);

      // Get full subsector data
      const sectorData = await travellerMapClient.getSubsector(match.Sector, subsectorLetter);
      const apiSys = sectorData.systems.find(s => s.hex === hex);

      if (!apiSys) {
        console.error('Could not fetch system data');
        process.exit(1);
      }

      // Get subsector name from letter for Spinward Marches
      const subsectorName = SM_SUBSECTOR_MAP[subsectorLetter] || `Subsector ${subsectorLetter}`;
      const system = generateSystemFromAPIData(apiSys, match.Sector, subsectorName);
      const filepath = path.join(STAR_SYSTEMS_DIR, `${system.id}.json`);

      if (fs.existsSync(filepath) && !opts.force) {
        console.log(`  SKIPPED (exists, use --force to overwrite)`);
        skipped++;
      } else {
        fs.writeFileSync(filepath, JSON.stringify(system, null, 2));
        addToIndex(index, system);
        console.log(`  CREATED: ${system.id}.json`);
        generated++;
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  }

  // Generate subsector
  else if (opts.subsector) {
    console.log(`Fetching subsector: ${opts.sector} / ${opts.subsector}...`);

    try {
      const subsectorData = await travellerMapClient.getSubsector(opts.sector, opts.subsector);
      console.log(`Found ${subsectorData.systems.length} systems\n`);

      for (const apiSys of subsectorData.systems) {
        const system = generateSystemFromAPIData(apiSys, opts.sector, opts.subsector);
        const filepath = path.join(STAR_SYSTEMS_DIR, `${system.id}.json`);

        if (fs.existsSync(filepath) && !opts.force) {
          console.log(`  ${system.name} (${system.hex}): SKIPPED`);
          skipped++;
        } else {
          fs.writeFileSync(filepath, JSON.stringify(system, null, 2));
          addToIndex(index, system);
          console.log(`  ${system.name} (${system.hex}): CREATED`);
          generated++;
        }
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  }

  // Generate deep space hexes
  else if (opts.deepSpace) {
    if (!opts.subsector) {
      console.error('--deep-space requires --subsector');
      process.exit(1);
    }

    console.log(`Generating deep space hexes for: ${opts.sector} / ${opts.subsector}...`);

    try {
      const subsectorData = await travellerMapClient.getSubsector(opts.sector, opts.subsector);
      const occupiedHexes = new Set(subsectorData.systems.map(s => s.hex));

      // Generate all hexes in subsector (01-10 x 01-08)
      for (let col = 1; col <= 10; col++) {
        for (let row = 1; row <= 8; row++) {
          const hex = String(col).padStart(2, '0') + String(row).padStart(2, '0');
          if (!occupiedHexes.has(hex)) {
            const system = generateDeepSpace(hex, opts.sector, opts.subsector);
            const filepath = path.join(STAR_SYSTEMS_DIR, `${system.id}.json`);

            if (fs.existsSync(filepath) && !opts.force) {
              skipped++;
            } else {
              fs.writeFileSync(filepath, JSON.stringify(system, null, 2));
              addToIndex(index, system);
              console.log(`  Deep Space (${hex}): CREATED`);
              generated++;
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  }

  else {
    showHelp();
    return;
  }

  // Save updated index
  if (generated > 0) {
    saveIndex(index);
    console.log(`\nIndex updated.`);
  }

  console.log(`\n${generated} generated, ${skipped} skipped`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
