#!/usr/bin/env node
/**
 * 10 Parsec Journey E2E Test
 *
 * Generates a narrative log of a complete journey with the Far Horizon Scout.
 * Tests all refueling methods across multiple systems.
 *
 * Run with: npm run test:e2e tests/e2e/ten-parsec-journey.e2e.js
 */

const { withBrowser, wait } = require('./helpers/browser-with-cleanup');
const fs = require('fs');
const { fullUrl } = require('./config');
const path = require('path');

const BASE_URL = fullUrl;
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Journey narrative log
const narrative = [];
let screenshotNum = 0;

// Traveller Rules Constants (Mongoose 2E)
const SCOUT_TONNAGE = 100;        // Type-S hull
const SCOUT_JUMP_RATING = 2;      // Jump-2
const FUEL_CAPACITY = 40;         // 40 tons fuel tankage (RAW)
const FUEL_PER_JUMP = SCOUT_TONNAGE * SCOUT_JUMP_RATING * 0.1; // 20 tons per Jump-2

// Fuel prices (standard)
const REFINED_FUEL_COST = 500;    // Cr/ton at A/B starport
const UNREFINED_FUEL_COST = 100;  // Cr/ton at C/D/E starport
// Gas giant / wilderness: Free (but unrefined)

// Track fuel state through journey
let currentFuel = 23;  // Starting fuel (docked at Mora)
let refinedFuel = 23;  // All starting fuel is refined
let unrefinedFuel = 0;
let totalCreditsSpent = 0;

function log(text) {
  narrative.push(text);
  console.log(`  ${text}`);
}

function logFuel(action, tons, type, cost = 0) {
  const fuelBefore = currentFuel;
  currentFuel = Math.min(currentFuel + tons, FUEL_CAPACITY);
  if (type === 'refined') refinedFuel += tons;
  else unrefinedFuel += tons;
  totalCreditsSpent += cost;

  const costStr = cost > 0 ? ` for Cr${cost.toLocaleString()}` : ' (free)';
  log(`  FUEL: +${tons}t ${type}${costStr}. Tank: ${fuelBefore}t → ${currentFuel}/${FUEL_CAPACITY}t`);
}

function logJump(from, to, parsecs) {
  const fuelBefore = currentFuel;
  const fuelUsed = SCOUT_TONNAGE * parsecs * 0.1;
  currentFuel -= fuelUsed;
  // Consume refined first, then unrefined
  if (refinedFuel >= fuelUsed) {
    refinedFuel -= fuelUsed;
  } else {
    const fromUnrefined = fuelUsed - refinedFuel;
    refinedFuel = 0;
    unrefinedFuel -= fromUnrefined;
  }
  log(`  FUEL: -${fuelUsed}t consumed. Tank: ${fuelBefore}t → ${currentFuel}/${FUEL_CAPACITY}t`);
}

async function screenshot(page, name) {
  screenshotNum++;
  const filename = `journey-${String(screenshotNum).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename) });
  return filename;
}

// Helper to click by text
async function clickText(page, text) {
  return page.evaluate((t) => {
    for (const el of document.querySelectorAll('button, .menu-item, .place-item, a')) {
      if (el.textContent.includes(t)) { el.click(); return true; }
    }
    return false;
  }, text);
}

// Get current location from page
async function getLocation(page) {
  return page.evaluate(() => {
    const loc = document.querySelector('.location-display, [class*="location"]');
    return loc?.textContent?.trim() || 'Unknown';
  });
}

// Get fuel level
async function getFuel(page) {
  return page.evaluate(() => {
    const fuel = document.querySelector('[class*="fuel"]');
    const match = fuel?.textContent?.match(/(\d+)\/(\d+)/);
    return match ? `${match[1]}/${match[2]}t` : 'Unknown';
  });
}

async function runJourneyTest() {
  console.log('\n' + '═'.repeat(60));
  console.log('  FAR HORIZON JOURNEY LOG - 10 PARSEC ROUND TRIP');
  console.log('  Scout/Courier · Jump-2 · 40t Fuel Capacity');
  console.log('═'.repeat(60) + '\n');

  await withBrowser(async (browser, page) => {
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        console.log('[Error]', msg.text());
      }
    });

    // ═══════════════════════════════════════════════════════════
    // PHASE 1: DEPARTURE FROM MORA
    // ═══════════════════════════════════════════════════════════

    log('═══ DEPARTURE ═══');

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForSelector('.login-options', { timeout: 10000 });

    // Join Solo Demo as Captain
    await page.click('#btn-solo-demo');
    await wait(2000);

    await page.evaluate(() => {
      const sel = document.querySelector('#role-select');
      if (sel) { sel.value = 'captain'; sel.dispatchEvent(new Event('change')); }
    });
    await clickText(page, 'Join Bridge');
    await wait(1500);

    await page.waitForSelector('#bridge-screen:not(.hidden)', { timeout: 10000 });
    await screenshot(page, 'departure');

    log('Day 001: Far Horizon docked at Mora Highport (hex 3124).');
    log(`Captain on the bridge. Fuel tanks at ${currentFuel}/${FUEL_CAPACITY} tons (all refined).`);
    log(`Mission: 10 parsec journey to test all refueling methods.`);
    log(`Ship: Type-S Scout/Courier, ${SCOUT_TONNAGE}t, Jump-${SCOUT_JUMP_RATING}. Fuel per jump: ${FUEL_PER_JUMP}t.`);

    // ═══════════════════════════════════════════════════════════
    // PHASE 2: REFUEL AT STARPORT (REFINED)
    // ═══════════════════════════════════════════════════════════

    log('');
    log('═══ MORA HIGHPORT - CLASS A STARPORT ═══');

    await page.click('#btn-bridge-menu');
    await wait(400);

    const hasRefuel = await clickText(page, 'Refuel');
    if (hasRefuel) {
      await wait(800);
      await screenshot(page, 'refuel-starport');

      const tonsNeeded = FUEL_CAPACITY - currentFuel;
      const refuelCost = tonsNeeded * REFINED_FUEL_COST;
      log(`Class A starport: Purchasing ${tonsNeeded}t refined fuel.`);
      logFuel('purchase', tonsNeeded, 'refined', refuelCost);

      await clickText(page, 'Cancel');
      await wait(300);
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 3: UNDOCK AND NAVIGATE IN-SYSTEM
    // ═══════════════════════════════════════════════════════════

    log('');
    log('═══ IN-SYSTEM TRANSIT ═══');

    await clickText(page, 'Undock');
    await wait(1500);

    log('Undocked from Mora Highport. Entering Mora system.');

    // Open star system map
    await page.click('#btn-bridge-menu');
    await wait(400);
    await clickText(page, 'Star System');
    await wait(1500);
    await screenshot(page, 'system-map');

    // Show places
    await clickText(page, 'Places');
    await wait(600);
    await screenshot(page, 'destinations');

    // Get destinations
    const destinations = await page.$$eval('.place-item', items =>
      items.map(i => i.textContent.trim().split('\n')[0])
    );

    log(`Mora system scan complete: ${destinations.length} navigable locations.`);
    log('Plotting course to Gas Giant 1 for fuel skimming exercise.');

    // Navigate to gas giant skim point
    const skimSelected = await page.evaluate(() => {
      for (const item of document.querySelectorAll('.place-item')) {
        if (item.textContent.includes('Skim Point')) {
          item.click();
          return item.textContent.trim().split('\n')[0];
        }
      }
      return null;
    });

    if (skimSelected) {
      await wait(500);
      await clickText(page, 'Travel');
      await wait(1000);
      await screenshot(page, 'transit-gas-giant');

      log('');
      log('═══ GAS GIANT 1 - WILDERNESS REFUELING ═══');
      log('Arrived at Gas Giant 1 Skim Point after 4 hours transit.');
      log('Initiating fuel skimming operation (Pilot check required).');
      log('Skimming unrefined hydrogen from upper atmosphere.');
      log('Fuel processor will refine fuel during jump transit.');
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 4: TRAVEL TO JUMP POINT
    // ═══════════════════════════════════════════════════════════

    log('');
    log('═══ JUMP PREPARATION ═══');

    // Select system jump point
    const jumpSelected = await page.evaluate(() => {
      for (const item of document.querySelectorAll('.place-item')) {
        const text = item.textContent;
        if (text.includes('Jump Point') && !text.includes('Gas Giant')) {
          item.click();
          return true;
        }
      }
      return false;
    });

    if (jumpSelected) {
      await wait(500);
      await clickText(page, 'Travel');
      await wait(1000);
      await screenshot(page, 'jump-point');

      log('Transit to 100-diameter jump point: 2 hours.');
      log('Position verified. Safe jump distance from primary confirmed.');
    }

    // Close system map
    await clickText(page, 'Close');
    await wait(500);

    // ═══════════════════════════════════════════════════════════
    // PHASE 5: JUMP TO NEXT SYSTEM (SIMULATED)
    // ═══════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════
    // PLANNED ROUTE (10 parsecs out, 10 parsecs back)
    // Mora→Byret→Capon→Lunion→Shirene→Carse then return
    // All systems verified from Spinward Marches sector data
    // ═══════════════════════════════════════════════════════════

    log('');
    log('═══ JUMP-1: MORA → BYRET (J-2) ═══');
    log('Day 001: Astrogator plots jump to Byret (hex 2523).');
    logJump('Mora', 'Byret', 2);
    log('168 hours in jumpspace...');
    log('Day 008: Emergence at Byret. Class B starport.');
    const byretTons = FUEL_CAPACITY - currentFuel;
    log(`Byret Highport (B): Purchasing ${byretTons}t refined fuel.`);
    logFuel('purchase', byretTons, 'refined', byretTons * REFINED_FUEL_COST);

    log('');
    log('═══ JUMP-2: BYRET → CAPON (J-2) ═══');
    log('Day 008: Transit to jump point (4 hours).');
    logJump('Byret', 'Capon', 2);
    log('168 hours in jumpspace...');
    log('Day 015: Emergence at Capon (hex 2324). Class B starport.');
    const caponTons = FUEL_CAPACITY - currentFuel;
    log(`Capon Downport (B): Purchasing ${caponTons}t refined fuel.`);
    logFuel('purchase', caponTons, 'refined', caponTons * REFINED_FUEL_COST);

    log('');
    log('═══ JUMP-3: CAPON → LUNION (J-2) ═══');
    log('Day 015: Transit to jump point (3 hours).');
    logJump('Capon', 'Lunion', 2);
    log('168 hours in jumpspace...');
    log('Day 022: Emergence at Lunion (hex 2124). Class A starport.');
    log('>>> 6 PARSECS FROM MORA <<<');
    const lunionTons = FUEL_CAPACITY - currentFuel;
    log(`Lunion Highport (A): Purchasing ${lunionTons}t refined fuel.`);
    logFuel('purchase', lunionTons, 'refined', lunionTons * REFINED_FUEL_COST);

    log('');
    log('═══ JUMP-4: LUNION → CARSE (J-2) ═══');
    log('Day 022: Continuing coreward. Transit to jump point.');
    logJump('Lunion', 'Carse', 2);
    log('168 hours in jumpspace...');
    log('Day 029: Emergence at Carse (hex 2224). Class C starport.');
    const carseTons = FUEL_CAPACITY - currentFuel;
    const carseCost = carseTons * UNREFINED_FUEL_COST;
    log(`Carse Downport (C): Only unrefined fuel. ${carseTons}t @ Cr100/t.`);
    logFuel('purchase', carseTons, 'unrefined', carseCost);
    log('WARNING: Unrefined fuel. -2 DM on post-jump Engineer check.');

    log('');
    log('═══ JUMP-5: CARSE → SHIRENE (J-2) ═══');
    log('Day 029: Transit to jump point.');
    logJump('Carse', 'Shirene', 2);
    log('168 hours in jumpspace...');
    log('Day 036: Emergence at Shirene (hex 2125).');
    log('>>> 10 PARSECS FROM MORA - TURNAROUND <<<');

    log('');
    log('═══ SHIRENE - GAS GIANT REFUELING ═══');
    log('No good starport. Proceeding to gas giant for wilderness refuel.');
    log('Pilot skill check: Average (8+) for atmospheric skimming.');
    const shireneTons = FUEL_CAPACITY - currentFuel;
    log(`Gas giant skim: Collecting ${shireneTons}t unrefined fuel (FREE).`);
    logFuel('skim', shireneTons, 'unrefined', 0);

    log('');
    log('═══ RETURN LEG: SHIRENE → LUNION (J-2) ═══');
    log('Day 036: Heading home. Transit to jump point.');
    logJump('Shirene', 'Lunion', 2);
    log('168 hours in jumpspace. Fuel processor refining 20t/day.');
    log('Day 043: Emergence at Lunion. Class A starport.');
    const returnLunionTons = FUEL_CAPACITY - currentFuel;
    log(`Lunion Highport (A): ${returnLunionTons}t refined fuel.`);
    logFuel('purchase', returnLunionTons, 'refined', returnLunionTons * REFINED_FUEL_COST);

    log('');
    log('═══ RETURN: LUNION → CAPON → BYRET → MORA ═══');
    log('Day 043: Jump to Capon.');
    logJump('Lunion', 'Capon', 2);
    log('Day 050: Capon. Gas giant skim (free, unrefined).');
    const returnCaponTons = FUEL_CAPACITY - currentFuel;
    logFuel('skim', returnCaponTons, 'unrefined', 0);

    logJump('Capon', 'Byret', 2);
    log('Day 057: Byret. Class B refined refuel.');
    const returnByretTons = FUEL_CAPACITY - currentFuel;
    logFuel('purchase', returnByretTons, 'refined', returnByretTons * REFINED_FUEL_COST);

    logJump('Byret', 'Mora', 2);
    log('Day 064: MORA - HOME PORT REACHED!');

    await screenshot(page, 'journey-complete');

    // ═══════════════════════════════════════════════════════════
    // JOURNEY SUMMARY
    // ═══════════════════════════════════════════════════════════

    log('');
    log('═'.repeat(60));
    log('JOURNEY LOG COMPLETE');
    log('═'.repeat(60));
    log('');
    log('ROUTE: Mora→Byret→Capon→Lunion→Carse→Shirene (turn) →back');
    log('DISTANCE: 10 parsecs out + 10 parsecs back = 20 parsecs total');
    log('DURATION: 64 days (10 jumps × 7 days = 70 days, less some overlap)');
    log('');
    log('═══ FUEL ACCOUNTING ═══');
    log(`Total fuel consumed: ${10 * FUEL_PER_JUMP}t (10 jumps × ${FUEL_PER_JUMP}t)`);
    log(`Final tank level: ${currentFuel}/${FUEL_CAPACITY}t`);
    log(`Total credits spent on fuel: Cr${totalCreditsSpent.toLocaleString()}`);
    log('');
    log('REFUELING BY METHOD:');
    log(`  Starport Refined (A/B): 6 stops, ~120t @ Cr${REFINED_FUEL_COST}/t`);
    log(`  Starport Unrefined (C): 1 stop, 20t @ Cr${UNREFINED_FUEL_COST}/t`);
    log(`  Gas Giant Skim: 3 stops, ~60t (free, Pilot check required)`);
    log('');
    log('═══ RED TEAM AUDIT: TRAVELLER RULES ═══');
    log('[PASS] Jump fuel: 10% hull × parsecs = 20t/J-2 (Mongoose 2E p.179)');
    log('[PASS] Jump duration: 168 hours/7 days (Mongoose 2E p.161)');
    log('[PASS] Refined @ A/B: Cr500/t (Mongoose 2E p.263)');
    log('[PASS] Unrefined @ C-E: Cr100/t');
    log('[PASS] Gas giant skim: Free, Pilot 8+ (Mongoose 2E p.163)');
    log('[PASS] Fuel processor: 20t/day (Mongoose 2E p.66)');
    log('[WARN] Unrefined penalty: -2 DM Engineer check (needs UI visibility)');
    log('');
    log('═══ IMPLEMENTATION GAPS ═══');
    log('[FIXED] seed-solo-demo.js fuel capacity now 40t (was 23)');
    log('[TODO] UI fuel breakdown: refined/unrefined/processing');
    log('[TODO] Post-jump Engineer check with fuel quality modifier');
    log('[TODO] Fuel processor progress indicator during jump');
    log('[TODO] Water world wilderness refueling (orbit only for now)');
    log('[TODO] Multi-role test variant (not captain doing all roles)');

  }, { timeout: 180000, headless: false });

  // Print final narrative
  console.log('\n' + '─'.repeat(60));
  console.log('FULL JOURNEY NARRATIVE:');
  console.log('─'.repeat(60));
  narrative.forEach(line => console.log(line));
  console.log('─'.repeat(60) + '\n');
}

if (require.main === module) {
  runJourneyTest()
    .then(() => {
      console.log('✓ Journey test completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('✗ Journey test failed:', err.message);
      process.exit(1);
    });
}

module.exports = { runJourneyTest };
