#!/usr/bin/env node
/**
 * AR-225: Merge Enriched Data into Sector Pack
 *
 * Combines TravellerMap scraped data with our sector pack to add:
 * - Base information (naval, scout, way station, depot)
 * - Trade routes and X-boat routes
 * - Importance ratings
 * - Travel zones (amber, red)
 * - High population indicators
 * - Spinward Main membership
 *
 * Usage: node scripts/merge-enriched-sector.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const SECTORS_DIR = path.join(__dirname, '..', 'data', 'sectors');
const SECTOR_PACK = path.join(SECTORS_DIR, 'spinward-marches.sector');
const ENRICHED_DATA = path.join(SECTORS_DIR, 'spinward-marches.enriched.json');
const OUTPUT_FILE = path.join(SECTORS_DIR, 'spinward-marches.sector');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  AR-225: Merge Enriched Sector Data');
console.log('═══════════════════════════════════════════════════════════════\n');

// Load files
console.log('Loading sector pack...');
const sectorPack = JSON.parse(fs.readFileSync(SECTOR_PACK, 'utf-8'));

console.log('Loading enriched data...');
const enriched = JSON.parse(fs.readFileSync(ENRICHED_DATA, 'utf-8'));

// Stats
const stats = {
  updated: 0,
  basesAdded: 0,
  routesAdded: 0,
  zonesAdded: 0,
  importanceAdded: 0
};

// Add routes to sector pack
console.log('\nMerging routes...');
sectorPack.routes = enriched.routes;
stats.routesAdded = enriched.routes.length;

// Add enriched data to each system
console.log('Merging system data...');

for (const compact of sectorPack.systems) {
  const hex = compact.hex;
  const enrichedSystem = enriched.systems[hex];

  if (!enrichedSystem) {
    console.log(`  Warning: No enriched data for ${compact.name} (${hex})`);
    continue;
  }

  // Merge base codes (use enriched, more authoritative)
  if (enrichedSystem.baseCodes && enrichedSystem.baseCodes.length > 0) {
    compact.bases = enrichedSystem.baseCodes;
    compact.basesParsed = enrichedSystem.bases;
    stats.basesAdded++;
  }

  // Add flags for quick lookups
  compact.hasNaval = enrichedSystem.hasNavalBase || false;
  compact.hasScout = enrichedSystem.hasScoutBase || false;
  compact.hasWay = enrichedSystem.hasWayStation || false;
  compact.hasDepot = enrichedSystem.hasDepot || false;
  compact.hasXboat = enrichedSystem.hasXboatStation || enrichedSystem.hasWayStation || false;

  // Travel zone
  if (enrichedSystem.zone !== 'Green') {
    compact.zone = enrichedSystem.zone;
    stats.zonesAdded++;
  }

  // Importance
  if (enrichedSystem.importance !== 0) {
    compact.ix = enrichedSystem.importance;
    stats.importanceAdded++;
  }

  // Population flags
  compact.hiPop = enrichedSystem.isHighPop || false;
  compact.capital = enrichedSystem.isCapital || false;

  // Spinward Main
  compact.onRoute = enrichedSystem.onTradeRoute || false;
  compact.spinwardMain = enrichedSystem.onSpinwardMain || false;

  // Extensions
  if (enrichedSystem.economic) compact.ex = enrichedSystem.economic;
  if (enrichedSystem.cultural) compact.cx = enrichedSystem.cultural;

  // PBG (if different from what we have)
  if (enrichedSystem.populationMultiplier > 0) {
    compact.popMult = enrichedSystem.populationMultiplier;
  }

  stats.updated++;
}

// Update metadata
sectorPack.enriched = {
  source: 'TravellerMap',
  scraped: enriched.scraped,
  stats: enriched.stats
};

// Recalculate checksum
const crypto = require('crypto');
const contentForHash = JSON.stringify({
  format: sectorPack.format,
  sector: sectorPack.sector,
  systems: sectorPack.systems,
  routes: sectorPack.routes,
  celestialData: sectorPack.celestialData
});
sectorPack.checksum = 'sha256:' + crypto.createHash('sha256')
  .update(contentForHash)
  .digest('hex')
  .slice(0, 16);

// Save
console.log('\nSaving merged sector pack...');
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sectorPack, null, 2));

// Calculate size
const rawSize = Buffer.byteLength(JSON.stringify(sectorPack, null, 2), 'utf-8');
const minSize = Buffer.byteLength(JSON.stringify(sectorPack), 'utf-8');

// Print results
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  MERGE COMPLETE');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Systems Updated:  ${stats.updated}`);
console.log(`  Bases Added:      ${stats.basesAdded}`);
console.log(`  Routes Added:     ${stats.routesAdded}`);
console.log(`  Zones Added:      ${stats.zonesAdded}`);
console.log(`  Importance Added: ${stats.importanceAdded}`);
console.log(`  Output:           ${OUTPUT_FILE}`);
console.log(`  Size (formatted): ${(rawSize / 1024).toFixed(1)} KB`);
console.log(`  Size (minified):  ${(minSize / 1024).toFixed(1)} KB`);
console.log(`  Checksum:         ${sectorPack.checksum}`);
console.log('═══════════════════════════════════════════════════════════════\n');
