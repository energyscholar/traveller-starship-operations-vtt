#!/usr/bin/env node
/**
 * World Map Terrain Extraction
 *
 * Parses TravellerWorlds SVG maps → hex-by-hex terrain.json files.
 * Part of the Three-Tier World Map System (Tier 2: automated extraction).
 *
 * Usage:
 *   node scripts/extract-terrain.js --file <path>    # Single SVG
 *   node scripts/extract-terrain.js --corridor        # All 9 corridor worlds
 *   node scripts/extract-terrain.js --all             # All SVGs in data/world-maps/
 *   node scripts/extract-terrain.js --verify          # Validate existing terrain.json
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const DATA_DIR = path.join(__dirname, '../data/world-maps');
const WIKI_INDEX = path.join(__dirname, '../data/wiki-cache/index.json');

// Known color-to-terrain mapping (fallback if legend parsing fails)
const TERRAIN_COLOR_MAP = {
  'rgb(103, 74, 53)': 'wasteland',
  'rgb(103,74,53)': 'wasteland',
  'rgb(181, 100, 59)': 'clear',
  'rgb(181,100,59)': 'clear',
  'rgb(65, 103, 183)': 'ocean',
  'rgb(65,103,183)': 'ocean',
  'rgb(81, 81, 81)': 'mountain',
  'rgb(81,81,81)': 'mountain',
  'white': 'ice_cap',
  'rgb(255, 255, 255)': 'ice_cap',
  'rgb(255,255,255)': 'ice_cap',
  'rgb(200, 130, 180)': 'domed_city',
  'rgb(200,130,180)': 'domed_city',
  'rgb(170, 120, 90)': 'exotic_terrain',
  'rgb(170,120,90)': 'exotic_terrain',
  'rgb(220, 220, 220)': 'ice_cap',
  'rgb(220,220,220)': 'ice_cap',
  'rgb(140, 90, 60)': 'rural',
  'rgb(140,90,60)': 'rural',
  'rgb(160, 50, 50)': 'starport',
  'rgb(160,50,50)': 'starport',
  'rgb(150, 100, 70)': 'desert',
  'rgb(150,100,70)': 'desert',
  '#687033': 'rural',
  'rgb(104, 112, 51)': 'rural',
  'rgb(104,112,51)': 'rural',
  'rgb(0, 128, 0)': 'vegetation',
  'rgb(0,128,0)': 'vegetation',
  'rgb(34, 139, 34)': 'forest',
  'rgb(34,139,34)': 'forest',
  'rgb(144, 238, 144)': 'grassland',
  'rgb(144,238,144)': 'grassland',
  'rgb(172, 115, 57)': 'clear',
  'rgb(172,115,57)': 'clear',
};

// Corridor worlds metadata
const CORRIDOR_WORLDS = {
  '1632': { name: 'Milagro',   uwp: 'E31178A-7', tradeCodes: ['Ic', 'Na', 'Pi'] },
  '1532': { name: 'Elixabeth', uwp: 'B426467-8', tradeCodes: ['Ni'] },
  '1533': { name: 'Forine',    uwp: 'D3129B8-A', tradeCodes: ['Hi', 'In', 'Na', 'Va'] },
  '1433': { name: 'Noctocol',  uwp: 'E7A5747-8', tradeCodes: ['Fl'] },
  '1434': { name: 'Tarkine',   uwp: 'C566662-7', tradeCodes: ['Ag', 'Ni', 'Ri'] },
  '1435': { name: 'Dallia',    uwp: 'B885883-9', tradeCodes: ['Ri', 'Ga'] },
  '1436': { name: 'Talos',     uwp: 'E433532-9', tradeCodes: ['Ni', 'Po'] },
  '1337': { name: 'Judice',    uwp: 'E9B2000-0', tradeCodes: ['Ba', 'Fl'] },
  '1237': { name: 'Collace',   uwp: 'B628943-D', tradeCodes: ['Hi', 'In'] },
};

function extractFillColor(style) {
  if (!style) return null;
  const match = style.match(/fill:\s*([^;]+)/);
  if (!match) return null;
  return match[1].trim();
}

function classifyTerrain(fillColor) {
  if (!fillColor) return 'unknown';
  // Normalize
  const normalized = fillColor.replace(/\s+/g, '');
  // Try direct lookup
  for (const [key, terrain] of Object.entries(TERRAIN_COLOR_MAP)) {
    if (key.replace(/\s+/g, '') === normalized) return terrain;
  }
  return 'unknown';
}

function parseSVG(svgContent) {
  const $ = cheerio.load(svgContent, { xmlMode: true });
  const viewBox = $('svg').attr('viewBox') || '0 0 1010 830';
  const [, , vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number);

  // Extract all hex polygons
  const hexes = [];
  const colorSet = new Set();

  $('polygon').each((i, el) => {
    const style = $(el).attr('style') || '';
    const pts = $(el).attr('points');
    if (!pts) return;

    // Skip non-hex polygons (outlines, borders)
    if (style.includes('fill:none') || style.includes('fill: none')) return;

    // Parse vertices
    const coords = pts.trim().split(/\s+/).map(p => {
      const [x, y] = p.split(',').map(Number);
      return { x, y };
    });

    if (coords.length < 3 || coords.some(c => isNaN(c.x) || isNaN(c.y))) return;

    // Calculate centroid
    const cx = coords.reduce((s, c) => s + c.x, 0) / coords.length;
    const cy = coords.reduce((s, c) => s + c.y, 0) / coords.length;

    // Filter out legend polygons (bottom 20% of SVG) and hexes outside viewBox
    if (cy > vbHeight * 0.80) return;
    if (cx > vbWidth * 1.02) return; // Allow small overshoot

    const fillColor = extractFillColor(style);
    if (fillColor) colorSet.add(fillColor);
    const terrain = classifyTerrain(fillColor);

    hexes.push({ cx, cy, terrain, fillColor, nVerts: coords.length });
  });

  // Extract icons (paths and circles that may indicate features)
  const icons = [];
  $('circle').each((i, el) => {
    const cx = parseFloat($(el).attr('cx'));
    const cy = parseFloat($(el).attr('cy'));
    const r = parseFloat($(el).attr('r'));
    if (isNaN(cx) || isNaN(cy)) return;
    if (cy > vbHeight * 0.80) return; // Skip legend
    const fill = $(el).attr('fill') || extractFillColor($(el).attr('style') || '');
    icons.push({ type: 'circle', cx, cy, r, fill });
  });

  return { hexes, icons, viewBox: { width: vbWidth, height: vbHeight }, colorSet };
}

function clusterValues(values, tolerance) {
  // Cluster nearby values and return sorted unique cluster centers
  const sorted = [...values].sort((a, b) => a - b);
  const clusters = [];
  let current = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] <= tolerance) {
      current.push(sorted[i]);
    } else {
      clusters.push(current.reduce((s, v) => s + v, 0) / current.length);
      current = [sorted[i]];
    }
  }
  clusters.push(current.reduce((s, v) => s + v, 0) / current.length);
  return clusters;
}

function normalizeToGrid(hexes, viewBox) {
  if (hexes.length === 0) return [];

  // Cluster X and Y centroid positions to find grid lines
  // Tolerance: hex polygons have width ~32, height ~35, so centroids within
  // ~8px horizontally or ~10px vertically are the same grid position
  const xClusters = clusterValues(hexes.map(h => h.cx), 8);
  const yClusters = clusterValues(hexes.map(h => h.cy), 10);

  // Map each hex to its nearest cluster index
  return hexes.map(h => {
    let bestCol = 0, bestColDist = Infinity;
    for (let i = 0; i < xClusters.length; i++) {
      const d = Math.abs(h.cx - xClusters[i]);
      if (d < bestColDist) { bestColDist = d; bestCol = i; }
    }
    let bestRow = 0, bestRowDist = Infinity;
    for (let i = 0; i < yClusters.length; i++) {
      const d = Math.abs(h.cy - yClusters[i]);
      if (d < bestRowDist) { bestRowDist = d; bestRow = i; }
    }
    // Invert Y for latitude (top = positive)
    const lat = -(bestRow - Math.floor(yClusters.length / 2));
    return { col: bestCol, lat, terrain: h.terrain };
  });
}

function extractWorld(svgPath) {
  const basename = path.basename(svgPath, '.svg');
  const hexMatch = basename.match(/^(\d{4})-(.+)$/);
  if (!hexMatch) {
    console.error(`Cannot parse hex from filename: ${basename}`);
    return null;
  }

  const hex = hexMatch[1];
  const name = hexMatch[2];
  const worldMeta = CORRIDOR_WORLDS[hex] || { name, uwp: 'UNKNOWN', tradeCodes: [] };

  console.log(`  Extracting ${name} (${hex})...`);

  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const { hexes, icons, viewBox, colorSet } = parseSVG(svgContent);

  // Normalize to grid
  const gridHexes = normalizeToGrid(hexes, viewBox);

  // Build terrain color map from observed colors
  const terrainColorMap = {};
  colorSet.forEach(color => {
    terrainColorMap[color] = classifyTerrain(color);
  });

  // Compute summary
  const terrainCounts = {};
  gridHexes.forEach(h => {
    terrainCounts[h.terrain] = (terrainCounts[h.terrain] || 0) + 1;
  });

  // Find grid bounds
  const cols = gridHexes.map(h => h.col);
  const lats = gridHexes.map(h => h.lat);
  const colRange = cols.length > 0 ? [Math.min(...cols), Math.max(...cols)] : [0, 0];
  const latRange = lats.length > 0 ? [Math.min(...lats), Math.max(...lats)] : [0, 0];

  // Warnings (expected count scales with viewBox area)
  const expectedHexes = Math.round(147 * (viewBox.width * viewBox.height) / (1010 * 830));
  if (gridHexes.length < expectedHexes * 0.3) console.log(`    WARNING: Only ${gridHexes.length} hexes (expected ~${expectedHexes})`);
  if (terrainCounts['unknown'] > 0) console.log(`    WARNING: ${terrainCounts['unknown']} unknown terrain hexes`);

  const result = {
    hex,
    name: worldMeta.name,
    uwp: worldMeta.uwp,
    tradeCodes: worldMeta.tradeCodes,
    mapSeed: `${hex}${hex}`,
    sourceUrl: `https://www.travellerworlds.com/?hex=${hex}&sector=Spinward+Marches&name=${encodeURIComponent(worldMeta.name)}&uwp=${worldMeta.uwp}&seed=${hex}${hex}&mapOnly=1`,
    extractedAt: new Date().toISOString(),
    grid: {
      cols: colRange[1] - colRange[0] + 1,
      rows: latRange[1] - latRange[0] + 1,
      coordinateSystem: 'col,lat',
      colRange,
      latRange,
    },
    terrainColorMap,
    hexes: gridHexes,
    icons: icons.map(ic => ({
      type: ic.type,
      cx: Math.round(ic.cx),
      cy: Math.round(ic.cy),
      fill: ic.fill,
    })),
    summary: {
      totalHexes: gridHexes.length,
      terrainCounts,
    },
  };

  // Write output
  const outPath = svgPath.replace('.svg', '.terrain.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  console.log(`    ${gridHexes.length} hexes, ${Object.keys(terrainCounts).length} terrain types`);
  console.log(`    Grid: ${result.grid.cols}×${result.grid.rows}, cols ${colRange[0]}-${colRange[1]}, lats ${latRange[0]}-${latRange[1]}`);
  Object.entries(terrainCounts).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
    console.log(`      ${t}: ${c}`);
  });

  return result;
}

// Parse arguments
const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
const SINGLE_FILE = fileIdx !== -1 ? args[fileIdx + 1] : null;
const CORRIDOR_MODE = args.includes('--corridor');
const ALL_MODE = args.includes('--all');
const VERIFY_MODE = args.includes('--verify');

function main() {
  let svgFiles;

  if (SINGLE_FILE) {
    svgFiles = [SINGLE_FILE];
  } else if (CORRIDOR_MODE) {
    svgFiles = Object.keys(CORRIDOR_WORLDS).map(hex => {
      const name = CORRIDOR_WORLDS[hex].name;
      return path.join(DATA_DIR, `${hex}-${name}.svg`);
    }).filter(f => fs.existsSync(f));
  } else if (ALL_MODE) {
    svgFiles = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.svg'))
      .map(f => path.join(DATA_DIR, f));
  } else if (VERIFY_MODE) {
    const terrainFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.terrain.json'));
    console.log(`Verifying ${terrainFiles.length} terrain files...`);
    let errors = 0;
    terrainFiles.forEach(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
        if (!data.hex || !data.hexes || !data.summary) {
          console.log(`  INVALID: ${f} — missing required fields`);
          errors++;
        } else {
          console.log(`  OK: ${f} — ${data.summary.totalHexes} hexes`);
        }
      } catch (e) {
        console.log(`  ERROR: ${f} — ${e.message}`);
        errors++;
      }
    });
    console.log(`\n${terrainFiles.length - errors}/${terrainFiles.length} valid`);
    return;
  } else {
    console.log('Usage: node scripts/extract-terrain.js --corridor|--file <path>|--all|--verify');
    return;
  }

  console.log(`\nTerrain Extraction`);
  console.log(`==================`);
  console.log(`Files: ${svgFiles.length}`);
  console.log('');

  const results = [];
  svgFiles.forEach(f => {
    if (!fs.existsSync(f)) {
      console.log(`  SKIP: ${f} — not found`);
      return;
    }
    const result = extractWorld(f);
    if (result) results.push(result);
  });

  console.log(`\n--- Summary ---`);
  console.log(`Extracted: ${results.length}/${svgFiles.length}`);
  results.forEach(r => {
    console.log(`  ${r.name} (${r.hex}): ${r.summary.totalHexes} hexes`);
  });
}

main();
