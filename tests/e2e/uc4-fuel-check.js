#!/usr/bin/env node
/**
 * UC-4: Fuel Check
 * Complexity: 2 stars
 *
 * Tests: Check fuel status via socket emit
 * Prereq: Logged in (runs UC-2 abbreviated)
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');
const {
  clickButtonText,
  clickSelector,
  typeInput,
  sleep,
  verifyState,
  writeTodoForFailures,
  clearFailures
} = require('./helpers/click-or-hotkey');

const CAMPAIGN_CODE = 'DFFFC87E';

(async () => {
  clearFailures();
  console.log('=== UC-4: Fuel Check ===\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1400,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  page.on('dialog', async dialog => {
    console.log('  Dialog:', dialog.message().substring(0, 50));
    await dialog.accept();
  });

  try {
    // --- SETUP: Login as Captain (UC-2 abbreviated) ---
    console.log('--- Setup: Login as Captain ---');
    await page.goto(fullUrl, { waitUntil: 'networkidle2' });
    await sleep(2000);

    await clickButtonText(page, 'Player', 'Player Login');
    await sleep(1000);
    await typeInput(page, '#campaign-code', CAMPAIGN_CODE, 'Campaign Code');
    await clickButtonText(page, 'Join as Player', 'Join Campaign');
    await sleep(2000);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      btns.find(b => b.textContent.trim() === 'Join')?.click();
    });
    await sleep(2000);

    await clickSelector(page, '[data-role-id="captain"]', 'Captain Role');
    await sleep(1000);
    await clickButtonText(page, 'Join Bridge', 'Join Bridge');
    await sleep(3000);
    console.log('  ✓ Logged in as Captain\n');

    // --- UC-4: Fuel Check ---
    console.log('--- UC-4: Fuel Check ---');

    // Step 4.1: Request fuel status via socket
    console.log('4.1 Requesting fuel status...');
    await page.evaluate(() => {
      window.state?.socket?.emit('ops:getFuelStatus');
    });
    await sleep(2000);

    // Step 4.2: Verify fuel values
    console.log('4.2 Reading fuel status...');
    const fuelStatus = await page.evaluate(() => window.state?.fuelStatus);

    console.log('\n--- Verification ---');
    console.log('  Fuel Status:', JSON.stringify(fuelStatus, null, 2));

    // Also check ship template for max
    const shipFuel = await page.evaluate(() => ({
      templateFuel: window.state?.ship?.fuel,
      shipStateFuel: window.state?.shipState?.fuel
    }));
    console.log('  Ship Fuel Config:', JSON.stringify(shipFuel, null, 2));

    await page.screenshot({ path: '/tmp/uc4-fuel-result.png' });
    console.log('  Screenshot: /tmp/uc4-fuel-result.png');

    // Result
    console.log('\n=== UC-4 Result ===');
    if (fuelStatus && fuelStatus.total !== undefined) {
      console.log('PASS: Fuel status retrieved');
      console.log(`  Total: ${fuelStatus.total} / ${fuelStatus.max} tons`);
      if (fuelStatus.breakdown) {
        console.log(`  Refined: ${fuelStatus.breakdown.refined || 0}t`);
        console.log(`  Unrefined: ${fuelStatus.breakdown.unrefined || 0}t`);
        console.log(`  Processed: ${fuelStatus.breakdown.processed || 0}t`);
      }
    } else {
      console.log('FAIL: Fuel status not available');
      console.log('  fuelStatus:', fuelStatus);
    }

  } catch (err) {
    console.error('ERROR:', err.message);
    await page.screenshot({ path: '/tmp/uc4-error.png' });
  }

  writeTodoForFailures('uc4-fuel-check');

  await sleep(2000);
  await browser.close();
})();
