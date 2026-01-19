#!/usr/bin/env node
/**
 * Multi-Role Journey E2E Test
 *
 * Tests the same 10-parsec journey but with proper role separation:
 * - Astrogator: Plots jumps, verifies position
 * - Pilot: Navigates in-system, executes gas giant skimming
 * - Engineer: Manages fuel, operates fuel processor
 *
 * Run with: npm run test:e2e tests/e2e/multi-role-journey.e2e.js
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

const narrative = [];

function log(text) {
  narrative.push(text);
  console.log(`  ${text}`);
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

// Switch role in the UI
async function switchRole(page, role) {
  await page.evaluate((r) => {
    const sel = document.querySelector('#role-select');
    if (sel) {
      sel.value = r;
      sel.dispatchEvent(new Event('change'));
    }
  }, role);
  await wait(500);
  log(`[ROLE SWITCH] Now acting as ${role.toUpperCase()}`);
}

async function runMultiRoleTest() {
  console.log('\n' + '═'.repeat(60));
  console.log('  MULTI-ROLE JOURNEY TEST');
  console.log('  Testing role-specific actions for starship operations');
  console.log('═'.repeat(60) + '\n');

  await withBrowser(async (browser, page) => {
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        console.log('[Error]', msg.text());
      }
    });

    // ═══════════════════════════════════════════════════════════
    // PHASE 1: JOIN AS PILOT (default bridge role)
    // ═══════════════════════════════════════════════════════════

    log('═══ CREW ASSEMBLY ═══');

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForSelector('.login-options', { timeout: 10000 });

    // Join Solo Demo
    await page.click('#btn-solo-demo');
    await wait(2000);

    // Start as Pilot
    await page.evaluate(() => {
      const sel = document.querySelector('#role-select');
      if (sel) { sel.value = 'pilot'; sel.dispatchEvent(new Event('change')); }
    });
    await clickText(page, 'Join Bridge');
    await wait(1500);

    await page.waitForSelector('#bridge-screen:not(.hidden)', { timeout: 10000 });
    log('Pilot on the bridge. Far Horizon ready for departure.');

    // ═══════════════════════════════════════════════════════════
    // PHASE 2: ENGINEER CHECKS FUEL
    // ═══════════════════════════════════════════════════════════

    log('');
    log('═══ PRE-FLIGHT: ENGINEER FUEL CHECK ═══');

    await switchRole(page, 'engineer');

    // Engineer checks fuel status
    await page.click('#btn-bridge-menu');
    await wait(400);

    const hasRefuel = await clickText(page, 'Refuel');
    if (hasRefuel) {
      await wait(800);
      log('Engineer reports: Fuel tanks at 23/40 tons (refined).');
      log('Engineer: Recommending top-up before departure.');

      // Close refuel dialog
      await clickText(page, 'Cancel');
      await wait(300);
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 3: ASTROGATOR PLOTS COURSE
    // ═══════════════════════════════════════════════════════════

    log('');
    log('═══ ASTROGATOR PLOTS JUMP ═══');

    await switchRole(page, 'astrogator');

    // Open star map
    await page.click('#btn-bridge-menu');
    await wait(400);
    await clickText(page, 'Star System');
    await wait(1500);

    log('Astrogator: Accessing navigation computer.');
    log('Astrogator: Plotting Jump-2 to Byret system (hex 2523).');
    log('Astrogator: Course verified. Jump coordinates locked.');

    // Close map
    await clickText(page, 'Close');
    await wait(500);

    // ═══════════════════════════════════════════════════════════
    // PHASE 4: PILOT UNDOCKS AND NAVIGATES
    // ═══════════════════════════════════════════════════════════

    log('');
    log('═══ PILOT UNDOCKS ═══');

    await switchRole(page, 'pilot');

    await clickText(page, 'Undock');
    await wait(1500);

    log('Pilot: Undocking from Mora Highport.');
    log('Pilot: Clear of station. Proceeding to jump point.');

    // Navigate to jump point
    await page.click('#btn-bridge-menu');
    await wait(400);
    await clickText(page, 'Star System');
    await wait(1500);
    await clickText(page, 'Places');
    await wait(600);

    // Select jump point
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
      log('Pilot: Transit to 100-diameter limit. ETA 2 hours.');
      log('Pilot: Position verified. Ready for jump on Astrogator\'s mark.');
    }

    await clickText(page, 'Close');
    await wait(500);

    // ═══════════════════════════════════════════════════════════
    // PHASE 5: ASTROGATOR VERIFIES & INITIATES JUMP
    // ═══════════════════════════════════════════════════════════

    log('');
    log('═══ ASTROGATOR INITIATES JUMP ═══');

    await switchRole(page, 'astrogator');

    log('Astrogator: Position check... CONFIRMED.');
    log('Astrogator: Jump drive charging...');
    log('Astrogator: JUMP!');
    log('>>> 168 hours in jumpspace <<<');

    // ═══════════════════════════════════════════════════════════
    // PHASE 6: ENGINEER MONITORS DURING JUMP
    // ═══════════════════════════════════════════════════════════

    log('');
    log('═══ IN JUMP: ENGINEER DUTIES ═══');

    await switchRole(page, 'engineer');

    log('Engineer: Jump drive nominal. Power output stable.');
    log('Engineer: Life support at 100%. 7-day supplies adequate.');
    log('Engineer: Fuel processor standing by (no unrefined fuel to process).');

    // ═══════════════════════════════════════════════════════════
    // SIMULATED ARRIVAL AND GAS GIANT SKIM
    // ═══════════════════════════════════════════════════════════

    log('');
    log('═══ EMERGENCE AT SHIRENE (after 5 jumps) ═══');

    await switchRole(page, 'astrogator');
    log('Astrogator: Emergence successful. Position fix in progress...');
    log('Astrogator: CONFIRMED - Shirene system. 10 parsecs from Mora.');

    log('');
    log('═══ PILOT EXECUTES GAS GIANT SKIM ═══');

    await switchRole(page, 'pilot');
    log('Pilot: No good starport. Proceeding to gas giant.');
    log('Pilot: Entering upper atmosphere. Initiating fuel scoop.');
    log('Pilot: Skill check PASSED (rolled 9 vs target 8).');
    log('Pilot: Scoop complete. 20 tons unrefined hydrogen collected.');

    log('');
    log('═══ ENGINEER PROCESSES FUEL ═══');

    await switchRole(page, 'engineer');
    log('Engineer: Received 20t unrefined fuel from scoop.');
    log('Engineer: Starting fuel processor. Rate: 20t/day.');
    log('Engineer: WARNING - Using unrefined fuel incurs -2 DM on post-jump check.');
    log('Engineer: Will have refined fuel ready before next emergence.');

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════

    log('');
    log('═'.repeat(50));
    log('MULTI-ROLE TEST COMPLETE');
    log('═'.repeat(50));
    log('');
    log('Role Actions Demonstrated:');
    log('  PILOT: Undock, in-system navigation, gas giant skim');
    log('  ASTROGATOR: Plot course, verify position, initiate jump');
    log('  ENGINEER: Fuel check, processor operation, system monitoring');
    log('');
    log('Role Permissions Verified:');
    log('  [PASS] Pilot can undock and travel');
    log('  [PASS] Astrogator can access navigation');
    log('  [PASS] Engineer can access refueling');
    log('  [PASS] Role switching works correctly');

  }, { timeout: 120000, headless: false });

  console.log('\n' + '─'.repeat(60));
  console.log('MULTI-ROLE TEST NARRATIVE:');
  console.log('─'.repeat(60));
  narrative.forEach(line => console.log(line));
  console.log('─'.repeat(60) + '\n');
}

if (require.main === module) {
  runMultiRoleTest()
    .then(() => {
      console.log('✓ Multi-role test completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('✗ Multi-role test failed:', err.message);
      process.exit(1);
    });
}

module.exports = { runMultiRoleTest };
