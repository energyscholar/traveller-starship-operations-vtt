#!/usr/bin/env node
/**
 * Generate Canonical Star Systems for Spinward Marches
 *
 * Uses realistic astrophysics + wiki data to generate complete star systems:
 * - Reads sector file for UWP, stellar class, gas giants, belts
 * - Consults wiki cache for canonical names
 * - Generates physically realistic systems (max 20 objects)
 * - Outputs to subsector JSON files
 *
 * Usage:
 *   node scripts/generate-spinward-marches-systems.js           # Generate all
 *   node scripts/generate-spinward-marches-systems.js --dry-run # Preview
 *   node scripts/generate-spinward-marches-systems.js --hex 3124 # Single system
 */

const fs = require('fs');
const path = require('path');

// Import the new astrophysics module
const { generateSystem } = require('../lib/astrophysics/system-generator');
const { parseSpectralClass, calculateStellarProperties, calculateHabitableZone } = require('../lib/astrophysics/stellar-physics');

// Paths
const SECTOR_FILE = path.join(__dirname, '../data/sectors/spinward-marches.sector');
const WIKI_CACHE_DIR = path.join(__dirname, '../data/wiki-cache');
const SUBSECTOR_DIR = path.join(__dirname, '../data/star-systems/spinward-marches');

// Parse arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SINGLE_HEX = args.includes('--hex') ? args[args.indexOf('--hex') + 1] : null;
const VERBOSE = args.includes('--verbose') || args.includes('-v');

// Subsector mapping
const SUBSECTOR_INFO = {
  'A': { name: 'Cronor', colRange: [1, 8], rowRange: [1, 10] },
  'B': { name: 'Jewell', colRange: [9, 16], rowRange: [1, 10] },
  'C': { name: 'Vilis', colRange: [17, 24], rowRange: [1, 10] },
  'D': { name: 'Rhylanor', colRange: [25, 32], rowRange: [1, 10] },
  'E': { name: 'Querion', colRange: [1, 8], rowRange: [11, 20] },
  'F': { name: 'Regina', colRange: [9, 16], rowRange: [11, 20] },
  'G': { name: 'Lanth', colRange: [17, 24], rowRange: [11, 20] },
  'H': { name: 'Aramis', colRange: [25, 32], rowRange: [11, 20] },
  'I': { name: 'Darrian', colRange: [1, 8], rowRange: [21, 30] },
  'J': { name: 'Sword Worlds', colRange: [9, 16], rowRange: [21, 30] },
  'K': { name: 'Lunion', colRange: [17, 24], rowRange: [21, 30] },
  'L': { name: 'Mora', colRange: [25, 32], rowRange: [21, 30] },
  'M': { name: 'Five Sisters', colRange: [1, 8], rowRange: [31, 40] },
  'N': { name: 'District 268', colRange: [9, 16], rowRange: [31, 40] },
  'O': { name: 'Glisten', colRange: [17, 24], rowRange: [31, 40] },
  'P': { name: "Trin's Veil", colRange: [25, 32], rowRange: [31, 40] }
};

/**
 * Get subsector letter for a hex
 */
function getSubsector(hex) {
  const col = parseInt(hex.substring(0, 2));
  const row = parseInt(hex.substring(2, 4));

  for (const [letter, info] of Object.entries(SUBSECTOR_INFO)) {
    if (col >= info.colRange[0] && col <= info.colRange[1] &&
        row >= info.rowRange[0] && row <= info.rowRange[1]) {
      return letter;
    }
  }
  return null;
}

/**
 * Load wiki cache for a system
 */
function loadWikiCache(hex) {
  const cachePath = path.join(WIKI_CACHE_DIR, 'systems', `${hex}.json`);
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Extract canonical celestial names from wiki content
 * This parses wiki text for named planets, moons, etc.
 */
function extractWikiNames(wikiData) {
  if (!wikiData?.textContent) return null;

  const text = wikiData.textContent;
  const names = {
    star: null,
    planets: [],
    gasGiants: [],
    moons: [],
    belts: []
  };

  // Look for star name patterns
  // Example: "Dimoph is the primary star of the Mora system"
  const starMatch = text.match(/(\w+)\s+is\s+(?:the\s+)?(?:primary|main)\s+star/i);
  if (starMatch) names.star = starMatch[1];

  // Look for planet lists in wiki format
  // Example: "Murguil, Elicar, Mora (mainworld), Guarek Belt, Gigig, Gogog"
  // Note: Using non-global patterns to get capture groups
  const celestialPatterns = [
    /(?:planets?|worlds?)\s*(?:include|are|:)\s*([^.]+)/i,
    /(?:gas\s*giants?)\s*(?:include|are|:)\s*([^.]+)/i,
    /orbit(?:ing|al)?\s+(?:bodies|objects)\s*(?:include|are|:)\s*([^.]+)/i
  ];

  for (const pattern of celestialPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Extract comma-separated names
      const nameList = match[1].split(/[,;]/).map(n => n.trim()).filter(n => n.length > 0 && n.length < 30);
      names.planets.push(...nameList);
    }
  }

  return names.star || names.planets.length > 0 ? names : null;
}

/**
 * Generate a complete system with wiki data integration
 */
function generateCanonicalSystem(sectorSystem) {
  // Handle actual field names from sector file
  const hex = sectorSystem.hex;
  const name = sectorSystem.name;
  const uwp = sectorSystem.uwp || 'X000000-0';
  // Stellar may be without space (G2V) - normalize
  const stellar = (sectorSystem.stellar || 'G2 V').replace(/([OBAFGKM])(\d)/, '$1$2 ');
  const gasGiants = sectorSystem.gg || sectorSystem.gasGiants || 0;
  const belts = sectorSystem.pb || sectorSystem.belts || 0;

  // Load wiki cache
  const wikiData = loadWikiCache(hex);
  const wikiNames = wikiData ? extractWikiNames(wikiData) : null;

  // Generate the system using astrophysics engine
  const system = generateSystem({
    hex,
    name,
    uwp,
    stellar: stellar || 'G2 V',
    gasGiants: gasGiants || 0,
    belts: belts || 0,
    wikiData: wikiNames
  });

  // Apply wiki canonical names if available
  if (wikiNames) {
    // Apply star name
    if (wikiNames.star) {
      const primaryStar = system.objects.find(o => o.type === 'Star' && o.orbitAU === 0);
      if (primaryStar) primaryStar.name = wikiNames.star;
    }

    // Apply planet names (in order)
    const planets = system.objects.filter(o => o.type === 'Planet' && !o.isMainworld);
    wikiNames.planets.slice(0, planets.length).forEach((name, i) => {
      if (name && planets[i]) planets[i].name = name;
    });
  }

  // Add metadata
  system.generated = new Date().toISOString();
  system.generator = 'astrophysics-v2';
  system.hasWikiData = !!wikiNames;

  return system;
}

/**
 * Main generation function
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SPINWARD MARCHES CANONICAL SYSTEM GENERATOR');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'GENERATE'}`);
  console.log(`  Target: ${SINGLE_HEX || 'All systems'}`);
  console.log('');

  // Load sector data
  console.log('Loading sector data...');
  const sectorData = JSON.parse(fs.readFileSync(SECTOR_FILE, 'utf8'));
  let systems = sectorData.systems.filter(s => s.hex !== '0000');

  if (SINGLE_HEX) {
    systems = systems.filter(s => s.hex === SINGLE_HEX);
    if (systems.length === 0) {
      console.error(`No system found with hex ${SINGLE_HEX}`);
      process.exit(1);
    }
  }

  console.log(`  Found ${systems.length} systems to process`);

  // Group by subsector
  const bySubsector = {};
  for (const sys of systems) {
    const sub = getSubsector(sys.hex) || 'unknown';
    if (!bySubsector[sub]) bySubsector[sub] = [];
    bySubsector[sub].push(sys);
  }

  // Statistics
  let totalGenerated = 0;
  let totalObjects = 0;
  let withWikiData = 0;
  let binarySystems = 0;
  let rarities = 0;

  // Process each subsector
  for (const [letter, subsectorSystems] of Object.entries(bySubsector)) {
    const info = SUBSECTOR_INFO[letter];
    if (!info) continue;

    console.log(`\nProcessing Subsector ${letter} (${info.name}): ${subsectorSystems.length} systems`);

    const subsectorData = {
      subsector: letter,
      name: info.name,
      sector: 'Spinward Marches',
      generated: new Date().toISOString(),
      systems: []
    };

    for (const sectorSystem of subsectorSystems) {
      try {
        const system = generateCanonicalSystem(sectorSystem);

        subsectorData.systems.push(system);
        totalGenerated++;
        totalObjects += system.objects.length;
        if (system.hasWikiData) withWikiData++;
        if (system.isBinary) binarySystems++;
        if (system.objects.some(o => o.isRare)) rarities++;

        if (VERBOSE) {
          console.log(`  ${system.hex} ${system.name}: ${system.objects.length} objects${system.hasWikiData ? ' [wiki]' : ''}`);
        }
      } catch (error) {
        console.error(`  Error generating ${sectorSystem.hex} ${sectorSystem.name}:`, error.message);
      }
    }

    // Write subsector file
    if (!DRY_RUN) {
      const fileName = `subsector-${letter.toLowerCase()}-${info.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
      const filePath = path.join(SUBSECTOR_DIR, fileName);

      // Ensure directory exists
      if (!fs.existsSync(SUBSECTOR_DIR)) {
        fs.mkdirSync(SUBSECTOR_DIR, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(subsectorData, null, 2));
      console.log(`  → Wrote ${filePath}`);
    }
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  GENERATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Systems Generated: ${totalGenerated}`);
  console.log(`  Total Objects: ${totalObjects} (avg ${(totalObjects / totalGenerated).toFixed(1)} per system)`);
  console.log(`  With Wiki Data: ${withWikiData} (${(withWikiData / totalGenerated * 100).toFixed(1)}%)`);
  console.log(`  Binary/Trinary: ${binarySystems}`);
  console.log(`  Rare Objects: ${rarities}`);
  console.log('');

  if (DRY_RUN) {
    console.log('  (DRY RUN - no files written)');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
