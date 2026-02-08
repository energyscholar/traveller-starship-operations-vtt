#!/usr/bin/env node
/**
 * TravellerWorlds.com World Map Cache Script
 *
 * Downloads SVG and PNG world maps using Puppeteer (headless browser).
 * TravellerWorlds renders maps CLIENT-SIDE with JavaScript — no HTTP fetch works.
 *
 * Usage:
 *   node scripts/cache-world-maps.js --corridor    # All 9 Milagro→Collace worlds
 *   node scripts/cache-world-maps.js --hex 1632    # Single world by hex
 *   node scripts/cache-world-maps.js --resume      # Skip existing files
 *   node scripts/cache-world-maps.js --svg-only    # Skip PNG
 *   node scripts/cache-world-maps.js --png-only    # Skip SVG
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../data/world-maps');
const POLITE_DELAY_MS = 2000;
const PAGE_TIMEOUT_MS = 30000;
const USER_AGENT = 'TravellerCombatVTT/1.0 (polite-cache)';

// Corridor worlds: Milagro → Collace
const CORRIDOR_WORLDS = [
  { hex: '1632', name: 'Milagro',   uwp: 'E31178A-7' },
  { hex: '1532', name: 'Elixabeth', uwp: 'B426467-8' },
  { hex: '1533', name: 'Forine',    uwp: 'D3129B8-A' },
  { hex: '1433', name: 'Noctocol',  uwp: 'E7A5747-8' },
  { hex: '1434', name: 'Tarkine',   uwp: 'C566662-7' },
  { hex: '1435', name: 'Dallia',    uwp: 'B885883-9' },
  { hex: '1436', name: 'Talos',     uwp: 'E433532-9' },
  { hex: '1337', name: 'Judice',    uwp: 'E9B2000-0' },
  { hex: '1237', name: 'Collace',   uwp: 'B628943-D' },
];

// Parse arguments
const args = process.argv.slice(2);
const CORRIDOR_MODE = args.includes('--corridor');
const RESUME_MODE = args.includes('--resume');
const SVG_ONLY = args.includes('--svg-only');
const PNG_ONLY = args.includes('--png-only');
const hexIdx = args.indexOf('--hex');
const SINGLE_HEX = hexIdx !== -1 ? args[hexIdx + 1] : null;

function buildUrl(world) {
  const seed = `${world.hex}${world.hex}`;
  return `https://www.travellerworlds.com/?hex=${world.hex}&sector=Spinward+Marches&name=${encodeURIComponent(world.name)}&uwp=${world.uwp}&seed=${seed}&mapOnly=1`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cacheWorld(page, world, index, total) {
  const svgPath = path.join(OUTPUT_DIR, `${world.hex}-${world.name}.svg`);
  const pngPath = path.join(OUTPUT_DIR, `${world.hex}-${world.name}.png`);

  // Check resume mode
  const svgExists = fs.existsSync(svgPath);
  const pngExists = fs.existsSync(pngPath);

  if (RESUME_MODE) {
    const svgDone = SVG_ONLY ? svgExists : (PNG_ONLY ? true : svgExists);
    const pngDone = PNG_ONLY ? pngExists : (SVG_ONLY ? true : pngExists);
    if (svgDone && pngDone) {
      console.log(`  [${index + 1}/${total}] ${world.name} (${world.hex}): SKIPPED (exists)`);
      return { world, status: 'skipped' };
    }
  }

  const url = buildUrl(world);
  console.log(`  [${index + 1}/${total}] ${world.name} (${world.hex}): Loading...`);

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: PAGE_TIMEOUT_MS });

    // Wait for SVG to render
    await page.waitForSelector('#worldMapSVG > *', { timeout: PAGE_TIMEOUT_MS });

    // Extra wait for rendering to complete
    await sleep(2000);

    let svgSize = 0;
    let pngSize = 0;

    // Extract SVG
    if (!PNG_ONLY) {
      const svgContent = await page.evaluate(() => {
        const svg = document.getElementById('worldMapSVG');
        if (!svg) return null;
        return svg.outerHTML;
      });

      if (svgContent) {
        fs.writeFileSync(svgPath, svgContent, 'utf8');
        svgSize = Math.round(svgContent.length / 1024);
      } else {
        console.log(`    WARNING: No SVG element found for ${world.name}`);
      }
    }

    // Capture PNG screenshot
    if (!SVG_ONLY) {
      const svgBounds = await page.evaluate(() => {
        const svg = document.getElementById('worldMapSVG');
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });

      if (svgBounds && svgBounds.width > 0 && svgBounds.height > 0) {
        await page.screenshot({
          path: pngPath,
          clip: {
            x: Math.max(0, Math.floor(svgBounds.x)),
            y: Math.max(0, Math.floor(svgBounds.y)),
            width: Math.ceil(svgBounds.width),
            height: Math.ceil(svgBounds.height),
          },
        });
        const stat = fs.statSync(pngPath);
        pngSize = Math.round(stat.size / 1024);
      } else {
        console.log(`    WARNING: Could not get SVG bounds for PNG screenshot of ${world.name}`);
      }
    }

    console.log(`    Cached: SVG ${svgSize}KB, PNG ${pngSize}KB`);
    return { world, status: 'success', svgSize, pngSize };
  } catch (err) {
    console.error(`    ERROR: ${world.name} — ${err.message}`);
    return { world, status: 'error', error: err.message };
  }
}

async function main() {
  // Determine which worlds to cache
  let worlds;
  if (SINGLE_HEX) {
    const w = CORRIDOR_WORLDS.find(w => w.hex === SINGLE_HEX);
    if (!w) {
      console.error(`Unknown hex: ${SINGLE_HEX}. Known corridor hexes: ${CORRIDOR_WORLDS.map(w => w.hex).join(', ')}`);
      process.exit(1);
    }
    worlds = [w];
  } else if (CORRIDOR_MODE) {
    worlds = CORRIDOR_WORLDS;
  } else {
    console.log('Usage: node scripts/cache-world-maps.js --corridor|--hex <HEX> [--resume] [--svg-only] [--png-only]');
    process.exit(0);
  }

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`\nWorld Map Cache Script`);
  console.log(`=====================`);
  console.log(`Worlds: ${worlds.length}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Resume: ${RESUME_MODE}`);
  console.log(`Mode: ${SVG_ONLY ? 'SVG only' : PNG_ONLY ? 'PNG only' : 'SVG + PNG'}`);
  console.log('');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setViewport({ width: 1400, height: 1200 });

    const results = [];
    for (let i = 0; i < worlds.length; i++) {
      const result = await cacheWorld(page, worlds[i], i, worlds.length);
      results.push(result);

      // Polite delay between requests
      if (i < worlds.length - 1) {
        await sleep(POLITE_DELAY_MS);
      }
    }

    // Summary
    console.log('\n--- Summary ---');
    const success = results.filter(r => r.status === 'success');
    const skipped = results.filter(r => r.status === 'skipped');
    const errors = results.filter(r => r.status === 'error');

    console.log(`Success: ${success.length}/${worlds.length}`);
    if (skipped.length > 0) console.log(`Skipped: ${skipped.length} (already existed)`);
    if (errors.length > 0) {
      console.log(`Errors: ${errors.length}`);
      errors.forEach(e => console.log(`  - ${e.world.name}: ${e.error}`));
    }
  } finally {
    if (browser) await browser.close();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
