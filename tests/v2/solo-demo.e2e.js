/**
 * V2 Solo Demo E2E Test
 * Tests that Solo Demo mode auto-joins the bridge
 */

const puppeteer = require('puppeteer');
const assert = require('assert');

// V2 is now the default at root, or at /operations
const BASE_URL = 'http://localhost:3000/';

async function runTest() {
  console.log('=== Solo Demo E2E Test ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[OPS-V2]') || text.includes('Error') || text.includes('error')) {
        console.log('  Browser:', text);
      }
    });

    page.on('pageerror', err => console.log('  Page error:', err.message));

    // Navigate to V2 interface
    console.log('1. Loading V2 interface...');
    const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log(`   Page status: ${response.status()}`);

    // Wait a moment for JS to initialize
    await new Promise(r => setTimeout(r, 1000));

    // Check if page loaded
    const hasApp = await page.evaluate(() => document.getElementById('app') !== null);
    console.log(`   App container found: ${hasApp}`);

    // Wait for login options to be visible
    await page.waitForSelector('.login-options', { timeout: 5000 });
    console.log('   Login screen visible');

    // Click Solo Demo button
    console.log('2. Clicking Solo Demo...');
    await page.click('[data-action="soloDemo"]');

    // Wait for either bridge-screen OR player-setup-screen
    // The bug is that it shows player-setup-screen instead of bridge-screen
    console.log('3. Waiting for navigation...');

    // Give it time to process
    await new Promise(r => setTimeout(r, 2000));

    // Check which screen is visible
    const bridgeVisible = await page.evaluate(() => {
      const bridge = document.getElementById('bridge-screen');
      return bridge && window.getComputedStyle(bridge).display !== 'none';
    });

    const setupVisible = await page.evaluate(() => {
      const setup = document.getElementById('player-setup-screen');
      return setup && window.getComputedStyle(setup).display !== 'none';
    });

    console.log(`   Bridge screen visible: ${bridgeVisible}`);
    console.log(`   Setup screen visible: ${setupVisible}`);

    // The expected behavior: Solo Demo should auto-join bridge
    if (bridgeVisible) {
      console.log('\n✅ PASS: Solo Demo auto-joined bridge');

      // Additional check: verify we see captain panel or role panel
      const hasRolePanel = await page.evaluate(() => {
        return document.querySelector('.role-panel') !== null ||
               document.querySelector('#role-panel') !== null;
      });
      console.log(`   Role panel present: ${hasRolePanel}`);

      return { passed: true };
    } else if (setupVisible) {
      console.log('\n❌ FAIL: Solo Demo stopped at setup screen instead of auto-joining bridge');
      return { passed: false, reason: 'Stopped at player-setup-screen' };
    } else {
      console.log('\n❌ FAIL: Neither bridge nor setup screen visible');
      return { passed: false, reason: 'Unknown screen state' };
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    return { passed: false, reason: error.message };
  } finally {
    await browser.close();
  }
}

// Run test
runTest().then(result => {
  console.log('\n=== Test Complete ===');
  process.exit(result.passed ? 0 : 1);
}).catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
