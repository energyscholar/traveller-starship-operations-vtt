#!/usr/bin/env node
/**
 * QA Sanity Check - E2E Tests
 *
 * Catches common issues before manual testing:
 * 1. Solo Demo campaign exists and is accessible
 * 2. Campaign data integrity (current_system, current_hex populated)
 * 3. Top bar shows hex AND system name
 * 4. System JSON loads correctly (no "Invalid" errors)
 * 5. Ship panel loads (ASCII or SVG)
 *
 * Run: npm run test:e2e tests/e2e/qa-sanity-check.e2e.js
 */

const { withBrowser } = require('./helpers/browser-with-cleanup');

const BASE_URL = 'http://localhost:3000/operations';
const TIMEOUT = 30000;

// Simple sleep function (Puppeteer compatible)
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Test results tracking
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.log(`  ✗ ${message}`);
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('QA SANITY CHECK - E2E TESTS');
  console.log('========================================\n');

  await withBrowser(async (browser, page) => {
    // Collect console errors
    const consoleErrors = [];
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' || text.includes('Invalid') || text.includes('ERROR')) {
        consoleErrors.push(text);
      }
    });

    // ==================== TEST 1: Solo Demo Availability ====================
    console.log('TEST 1: Solo Demo Availability');

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: TIMEOUT });
    await sleep(1000);

    // Check for Solo Demo button
    const soloBtn = await page.$('#btn-solo-demo');
    assert(soloBtn !== null, 'Solo Demo button exists');

    // Also check page has login screen
    const loginScreen = await page.$('#login-screen');
    const loginVisible = loginScreen
      ? await page.evaluate(el => !el.classList.contains('hidden'), loginScreen)
      : false;
    console.log(`  Login screen visible: ${loginVisible}`);

    // ==================== TEST 2: Join Solo Demo ====================
    console.log('\nTEST 2: Join Solo Demo Campaign');

    if (soloBtn) {
      await soloBtn.click();
      await sleep(2000);

      // Wait for player setup screen or bridge
      const playerSetup = await page.$('#player-setup-screen.active');
      const bridge = await page.$('#bridge-screen.active');
      assert(playerSetup !== null || bridge !== null, 'Navigated to player setup or bridge');

      // If on player setup, select a role and join
      if (playerSetup) {
        // Select Captain role
        const captainRole = await page.$('[data-role-id="captain"]');
        if (captainRole) {
          await captainRole.click();
          await sleep(500);
        }

        // Click join button
        const joinBtn = await page.$('#btn-join-bridge');
        if (joinBtn) {
          await joinBtn.click();
          await sleep(2000);
        }
      }
    }

    // ==================== TEST 3: Top Bar Display ====================
    console.log('\nTEST 3: Top Bar Display');

    const hexEl = await page.$('#bridge-hex');
    const hexText = hexEl ? await page.evaluate(el => el.textContent, hexEl) : '';
    console.log(`  bridge-hex content: "${hexText}"`);

    // Should show both hex AND system name (format: "3124 · Mora")
    const hasHex = /\d{4}/.test(hexText);
    const hasDot = hexText.includes('·');
    const hasSystemName = hexText.length > 6 && hexText !== '----';

    assert(hasHex, 'Top bar shows hex coordinate');
    assert(hasDot || hasSystemName, 'Top bar has separator or shows system name');

    const locationEl = await page.$('#bridge-location');
    const locationText = locationEl ? await page.evaluate(el => el.textContent, locationEl) : '';
    console.log(`  bridge-location content: "${locationText}"`);
    assert(locationText && locationText !== 'System' && locationText !== 'Unknown',
      'Location display shows actual location');

    // ==================== TEST 4: No Critical Console Errors ====================
    console.log('\nTEST 4: Console Error Check');

    const invalidJsonErrors = consoleErrors.filter(e => e.includes('Invalid system JSON'));
    const criticalErrors = consoleErrors.filter(e =>
      e.includes('TypeError') ||
      e.includes('ReferenceError') ||
      e.includes('Cannot read') ||
      e.includes('undefined is not')
    );

    console.log(`  Total console messages: ${consoleErrors.length}`);
    if (invalidJsonErrors.length > 0) {
      console.log('  Invalid JSON errors:', invalidJsonErrors.slice(0, 3));
    }
    if (criticalErrors.length > 0) {
      console.log('  Critical errors:', criticalErrors.slice(0, 3));
    }

    assert(invalidJsonErrors.length === 0, 'No "Invalid system JSON" errors');
    assert(criticalErrors.length === 0, `No critical JS errors (found ${criticalErrors.length})`);

    // ==================== TEST 5: Ship Panel Loads ====================
    console.log('\nTEST 5: Ship Panel');

    const shipPanel = await page.$('#ship-status-panel');
    const hasSvg = await page.$('#ship-status-panel svg') !== null;
    const hasAscii = await page.$('.ship-ascii-art') !== null;

    console.log(`  Ship panel exists: ${shipPanel !== null}`);
    console.log(`  Has SVG: ${hasSvg}, Has ASCII: ${hasAscii}`);

    assert(shipPanel !== null, 'Ship status panel exists');
    assert(hasSvg || hasAscii, 'Ship diagram (SVG or ASCII) loaded');

    // ==================== SUMMARY ====================
    console.log('\n========================================');
    console.log('QA SANITY CHECK RESULTS');
    console.log('========================================');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failures.length > 0) {
      console.log('\nFailures:');
      failures.forEach(f => console.log(`  - ${f}`));
    }

    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  }, { timeout: TIMEOUT });
}

// Run tests
runTests().catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
