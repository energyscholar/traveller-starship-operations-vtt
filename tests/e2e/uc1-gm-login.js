#!/usr/bin/env node
/**
 * UC-1: GM Login & Session Start
 * Complexity: 1 star (Simplest)
 *
 * Tests: GM can login, select campaign, start session
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');
const {
  clickOrHotkey,
  clickSelector,
  clickButtonText,
  sleep,
  verifyState,
  writeTodoForFailures,
  clearFailures
} = require('./helpers/click-or-hotkey');

(async () => {
  clearFailures();
  console.log('=== UC-1: GM Login & Session Start ===\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1400,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // Handle dialogs
  page.on('dialog', async dialog => {
    console.log('  Dialog:', dialog.message().substring(0, 50));
    await dialog.accept();
  });

  try {
    // Step 1.1: Navigate
    console.log('1.1 Navigating to Operations...');
    await page.goto(fullUrl, { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Step 1.2: Click GM Login
    console.log('1.2 Clicking GM Login...');
    const gmLoginClicked = await clickOrHotkey(page, {
      selector: '#btn-gm-login',
      text: 'GM',
      name: 'GM Login Button'
    });

    if (!gmLoginClicked) {
      throw new Error('Failed to click GM Login');
    }

    // Step 1.3: Select Campaign
    console.log('1.3 Selecting campaign...');
    await sleep(1000);
    const campaignClicked = await clickOrHotkey(page, {
      selector: '.campaign-item button',
      text: 'Select',
      name: 'Campaign Select Button'
    });

    if (!campaignClicked) {
      // Try clicking campaign item directly
      await clickSelector(page, '.campaign-item', 'Campaign Item');
    }

    // Step 1.4: Start Session
    console.log('1.4 Starting session...');
    await sleep(1000);
    const startClicked = await clickOrHotkey(page, {
      selector: '#btn-start-session',
      text: 'Start Session',
      name: 'Start Session Button'
    });

    if (!startClicked) {
      throw new Error('Failed to click Start Session');
    }

    await sleep(3000);

    // Verification
    console.log('\n--- Verification ---');
    const result = await verifyState(page, () => ({
      currentScreen: window.state?.currentScreen,
      campaignName: window.state?.campaign?.name,
      campaignId: window.state?.campaign?.id
    }), 'Final state');

    // Screenshot
    await page.screenshot({ path: '/tmp/uc1-gm-login-result.png' });
    console.log('  Screenshot: /tmp/uc1-gm-login-result.png');

    // Result
    console.log('\n=== UC-1 Result ===');
    if (result.currentScreen === 'bridge' || result.campaignName) {
      console.log('PASS: GM successfully logged in and started session');
      console.log(`  Campaign: ${result.campaignName}`);
    } else {
      console.log('FAIL: Did not reach bridge screen');
      console.log('  Current screen:', result.currentScreen);
    }

  } catch (err) {
    console.error('ERROR:', err.message);
    await page.screenshot({ path: '/tmp/uc1-error.png' });
  }

  // Write TODOs for any click failures
  writeTodoForFailures('uc1-gm-login');

  await sleep(2000);
  await browser.close();
})();
