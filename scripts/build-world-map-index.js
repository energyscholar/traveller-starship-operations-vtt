#!/usr/bin/env node
/**
 * World Map Index Builder
 *
 * Scans data/world-maps/ and builds a master index.json for fast AI lookup.
 * Cross-references with wiki-cache for canonical data.
 *
 * Usage:
 *   node scripts/build-world-map-index.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/world-maps');
const WIKI_INDEX = path.join(__dirname, '../data/wiki-cache/index.json');
const OUTPUT = path.join(DATA_DIR, 'index.json');

function loadWikiIndex() {
  try {
    return JSON.parse(fs.readFileSync(WIKI_INDEX, 'utf8'));
  } catch {
    console.log('  WARNING: wiki-cache/index.json not found, using terrain data only');
    return null;
  }
}

function findWorldFiles(hex) {
  const files = fs.readdirSync(DATA_DIR);
  const prefix = hex + '-';
  const matching = files.filter(f => f.startsWith(prefix));

  const result = {};
  for (const f of matching) {
    if (f.endsWith('.svg')) result.svg = f;
    else if (f.endsWith('.png')) result.png = f;
    else if (f.endsWith('.terrain.json')) result.terrain = f;
    else if (f.endsWith('.features.json')) result.features = f;
  }
  return result;
}

function getStatus(files) {
  if (files.features) return 'enriched';
  if (files.terrain) return 'terrain-only';
  return 'cached';
}

function buildQuickStats(terrainData) {
  if (!terrainData) return null;

  const counts = terrainData.summary.terrainCounts;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return {
    totalHexes: terrainData.summary.totalHexes,
    dominantTerrain: sorted[0] ? sorted[0][0] : 'unknown',
    hasOcean: (counts.ocean || 0) > 0,
    hasIceCap: (counts.ice_cap || 0) > 0,
    gridSize: `${terrainData.grid.cols}x${terrainData.grid.rows}`,
  };
}

function buildSettlements(featuresData) {
  if (!featuresData || !featuresData.features) return [];
  return featuresData.features
    .filter(f => f.type === 'starport' || f.type === 'settlement')
    .map(f => ({
      name: f.name,
      type: f.subtype || f.type,
      hex: f.mapHex,
    }));
}

function main() {
  console.log('World Map Index Builder');
  console.log('======================\n');

  const wikiIndex = loadWikiIndex();

  // Find all unique hex codes from filenames
  const allFiles = fs.readdirSync(DATA_DIR);
  const hexCodes = new Set();
  for (const f of allFiles) {
    const m = f.match(/^(\d{4})-/);
    if (m) hexCodes.add(m[1]);
  }

  const worlds = {};
  const byName = {};
  const bySubsector = {};
  const terrainLists = { ocean_worlds: [], ice_worlds: [], garden_worlds: [] };
  const statusCounts = { enriched: 0, 'terrain-only': 0, cached: 0 };
  const enrichedList = [];
  const terrainOnlyList = [];

  for (const hex of [...hexCodes].sort()) {
    const files = findWorldFiles(hex);
    const status = getStatus(files);
    statusCounts[status]++;

    // Load terrain data if available
    let terrainData = null;
    if (files.terrain) {
      try {
        terrainData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, files.terrain), 'utf8'));
      } catch (e) {
        console.log(`  WARNING: Could not parse ${files.terrain}: ${e.message}`);
      }
    }

    // Load features data if available
    let featuresData = null;
    if (files.features) {
      try {
        featuresData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, files.features), 'utf8'));
      } catch (e) {
        console.log(`  WARNING: Could not parse ${files.features}: ${e.message}`);
      }
    }

    // Get world metadata
    const name = terrainData ? terrainData.name :
      (files.svg ? files.svg.replace(/^\d{4}-/, '').replace('.svg', '') : hex);
    const uwp = terrainData ? terrainData.uwp : 'UNKNOWN';
    const tradeCodes = terrainData ? terrainData.tradeCodes : [];

    // Cross-reference with wiki cache for subsector
    let subsector = 'Unknown';
    if (wikiIndex && wikiIndex.systems && wikiIndex.systems[hex]) {
      subsector = wikiIndex.systems[hex].subsector || 'Unknown';
    }

    const quickStats = buildQuickStats(terrainData);
    const settlements = buildSettlements(featuresData);

    worlds[hex] = {
      name,
      uwp,
      tradeCodes,
      subsector,
      files,
      status,
      quickStats,
    };

    if (settlements.length > 0) {
      worlds[hex].settlements = settlements;
    }

    if (featuresData && featuresData.regions) {
      worlds[hex].regions = featuresData.regions.map(r => r.name);
    }

    if (featuresData && featuresData.gmQuickRef && featuresData.gmQuickRef.culturalGroups) {
      worlds[hex].culturalGroups = featuresData.gmQuickRef.culturalGroups;
    }

    // Build lookups
    byName[name] = hex;
    if (!bySubsector[subsector]) bySubsector[subsector] = [];
    bySubsector[subsector].push(hex);

    if (quickStats) {
      if (quickStats.hasOcean) terrainLists.ocean_worlds.push(hex);
      if (quickStats.hasIceCap) terrainLists.ice_worlds.push(hex);
      if (tradeCodes.includes('Ga') || tradeCodes.includes('Ri') || tradeCodes.includes('Ag')) {
        terrainLists.garden_worlds.push(hex);
      }
    }

    if (status === 'enriched') enrichedList.push(hex);
    else if (status === 'terrain-only') terrainOnlyList.push(hex);

    console.log(`  ${hex} ${name}: ${status} (${Object.keys(files).length} files)`);
  }

  const index = {
    version: 1,
    generatedAt: new Date().toISOString(),
    dataDir: 'data/world-maps/',
    schemaVersion: '1.0',
    totalWorlds: hexCodes.size,
    statusCounts,
    worlds,
    lookups: {
      byName,
      bySubsector,
      byTerrain: terrainLists,
      enriched: enrichedList,
      terrainOnly: terrainOnlyList,
    },
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(index, null, 2));
  console.log(`\nIndex written: ${OUTPUT}`);
  console.log(`Total worlds: ${hexCodes.size}`);
  console.log(`Status: ${JSON.stringify(statusCounts)}`);
}

main();
