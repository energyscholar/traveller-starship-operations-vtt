/**
 * V2 E2E Tests - Login Flows
 * Tests GM login, Player login, and Solo Demo flows
 */

const { withBrowser, collectLogs, wait, safeClick } = require('../helpers/browser-with-cleanup');

const BASE_URL = 'http://localhost:3000/';

async function runTests() {
  console.log('=== V2 Login Flows E2E Tests ===\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Login screen loads
  try {
    console.log('TEST 1: Login screen loads');
    await withBrowser(async (browser, page) => {
      const { errors } = collectLogs(page);

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await wait(500);

      // Check for login options
      await page.waitForSelector('.login-options', { timeout: 5000 });

      const gmButton = await page.$('[data-action="gmLogin"]');
      const playerButton = await page.$('[data-action="playerLogin"]');
      const soloButton = await page.$('[data-action="soloDemo"]');

      if (!gmButton) throw new Error('GM Login button not found');
      if (!playerButton) throw new Error('Player Login button not found');
      if (!soloButton) throw new Error('Solo Demo button not found');

      if (errors.length > 0) {
        console.log('  Console errors:', errors);
      }

      console.log('  PASS: All login buttons present');
    }, { timeout: 15000 });
    passed++;
  } catch (err) {
    console.log('  FAIL:', err.message);
    failed++;
  }

  // Test 2: GM Login shows campaign select
  try {
    console.log('TEST 2: GM Login shows campaign select');
    await withBrowser(async (browser, page) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForSelector('[data-action="gmLogin"]', { timeout: 5000 });

      await safeClick(page, '[data-action="gmLogin"]');
      await wait(500);

      // Should show campaign select
      const campaignSelect = await page.$('#campaign-select');
      const isVisible = await page.evaluate(el => {
        return el && !el.classList.contains('hidden');
      }, campaignSelect);

      if (!isVisible) throw new Error('Campaign select not visible after GM login');

      console.log('  PASS: Campaign select shown');
    }, { timeout: 15000 });
    passed++;
  } catch (err) {
    console.log('  FAIL:', err.message);
    failed++;
  }

  // Test 3: Player Login shows code input
  try {
    console.log('TEST 3: Player Login shows code input');
    await withBrowser(async (browser, page) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForSelector('[data-action="playerLogin"]', { timeout: 5000 });

      await safeClick(page, '[data-action="playerLogin"]');
      await wait(500);

      // Should show player select with code input
      const playerSelect = await page.$('#player-select');
      const isVisible = await page.evaluate(el => {
        return el && !el.classList.contains('hidden');
      }, playerSelect);

      if (!isVisible) throw new Error('Player select not visible');

      const codeInput = await page.$('#campaign-code');
      if (!codeInput) throw new Error('Campaign code input not found');

      console.log('  PASS: Player code input shown');
    }, { timeout: 15000 });
    passed++;
  } catch (err) {
    console.log('  FAIL:', err.message);
    failed++;
  }

  // Test 4: Solo Demo auto-joins bridge
  try {
    console.log('TEST 4: Solo Demo auto-joins bridge');
    await withBrowser(async (browser, page) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForSelector('[data-action="soloDemo"]', { timeout: 5000 });

      await safeClick(page, '[data-action="soloDemo"]');

      // Wait for bridge screen
      await wait(2000);

      const bridgeVisible = await page.evaluate(() => {
        const bridge = document.getElementById('bridge-screen');
        return bridge && window.getComputedStyle(bridge).display !== 'none';
      });

      if (!bridgeVisible) {
        // Take screenshot on failure
        await page.screenshot({ path: 'test-failure-solo.png' });
        throw new Error('Bridge screen not visible after solo demo');
      }

      console.log('  PASS: Solo demo reached bridge');
    }, { timeout: 20000 });
    passed++;
  } catch (err) {
    console.log('  FAIL:', err.message);
    failed++;
  }

  // Test 5: Back button returns to login
  try {
    console.log('TEST 5: Back button returns to login');
    await withBrowser(async (browser, page) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForSelector('[data-action="gmLogin"]', { timeout: 5000 });

      // Go to GM login
      await safeClick(page, '[data-action="gmLogin"]');
      await wait(500);

      // Click back
      await safeClick(page, '[data-action="backToLogin"]');
      await wait(500);

      // Should show login options again
      const loginOptions = await page.$('.login-options');
      const isVisible = await page.evaluate(el => {
        return el && window.getComputedStyle(el).display !== 'none';
      }, loginOptions);

      if (!isVisible) throw new Error('Login options not visible after back');

      console.log('  PASS: Back returns to login');
    }, { timeout: 15000 });
    passed++;
  } catch (err) {
    console.log('  FAIL:', err.message);
    failed++;
  }

  // Test 6: GM can create campaign
  try {
    console.log('TEST 6: GM campaign list loads');
    await withBrowser(async (browser, page) => {
      const { logs } = collectLogs(page);

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForSelector('[data-action="gmLogin"]', { timeout: 5000 });

      await safeClick(page, '[data-action="gmLogin"]');
      await wait(1000);

      // Check for campaign list element
      const campaignList = await page.$('#campaign-list');
      if (!campaignList) throw new Error('Campaign list not found');

      // Check socket connected
      const hasSocketLog = logs.some(l => l.includes('[OPS-V2]'));
      if (!hasSocketLog) {
        console.log('  Warning: No [OPS-V2] logs found');
      }

      console.log('  PASS: Campaign list present');
    }, { timeout: 15000 });
    passed++;
  } catch (err) {
    console.log('  FAIL:', err.message);
    failed++;
  }

  // Summary
  console.log('\n--- Summary ---');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);

  return { passed, failed };
}

// Run if called directly
if (require.main === module) {
  runTests().then(result => {
    console.log('\n=== Test Complete ===');
    process.exit(result.failed > 0 ? 1 : 0);
  }).catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
