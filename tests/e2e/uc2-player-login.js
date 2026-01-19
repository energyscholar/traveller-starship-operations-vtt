#!/usr/bin/env node
/**
 * UC-2: Player Login & Role Select
 * Complexity: 2 stars
 *
 * Tests: Player can join campaign, select slot, pick role, join bridge
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');
const {
  clickOrHotkey,
  clickSelector,
  clickButtonText,
  typeInput,
  sleep,
  verifyState,
  writeTodoForFailures,
  clearFailures
} = require('./helpers/click-or-hotkey');

const CAMPAIGN_CODE = 'DFFFC87E';

(async () => {
  clearFailures();
  console.log('=== UC-2: Player Login & Role Select ===\n');

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
    // Step 2.1: Navigate
    console.log('2.1 Navigating to Operations...');
    await page.goto(fullUrl, { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Step 2.2: Click Player
    console.log('2.2 Clicking Player login...');
    await clickOrHotkey(page, {
      selector: '#btn-player-login',
      text: 'Player',
      name: 'Player Login Button'
    });

    // Step 2.3: Enter campaign code
    console.log('2.3 Entering campaign code...');
    await sleep(1000);
    await typeInput(page, '#campaign-code', CAMPAIGN_CODE, 'Campaign Code Input');

    // Step 2.4: Join Campaign
    console.log('2.4 Joining campaign...');
    await clickOrHotkey(page, {
      selector: '#btn-join-campaign',
      text: 'Join as Player',
      name: 'Join Campaign Button'
    });
    await sleep(2000);

    // Step 2.5: Select Slot (first available)
    console.log('2.5 Selecting player slot...');
    const slotClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const joinBtns = btns.filter(b => b.textContent.trim() === 'Join');
      if (joinBtns.length > 0) {
        joinBtns[0].click();
        return joinBtns[0].closest('tr')?.textContent?.substring(0, 30) || 'first slot';
      }
      return null;
    });
    console.log(`  ✓ Selected: ${slotClicked}`);
    await sleep(2000);

    // Step 2.6: Select Role (Captain)
    console.log('2.6 Selecting Captain role...');
    await clickOrHotkey(page, {
      selector: '[data-role-id="captain"]',
      text: null,
      name: 'Captain Role Card'
    });
    await sleep(1000);

    // Step 2.7: Join Bridge
    console.log('2.7 Joining bridge...');
    await clickOrHotkey(page, {
      selector: null,
      text: 'Join Bridge',
      name: 'Join Bridge Button'
    });
    await sleep(3000);

    // Verification
    console.log('\n--- Verification ---');
    const result = await verifyState(page, () => ({
      currentScreen: window.state?.currentScreen,
      playerRole: window.state?.playerRole,
      crewSlot: window.state?.crewSlot?.name
    }), 'Final state');

    // Screenshot
    await page.screenshot({ path: '/tmp/uc2-player-login-result.png' });
    console.log('  Screenshot: /tmp/uc2-player-login-result.png');

    // Result
    console.log('\n=== UC-2 Result ===');
    if (result.currentScreen === 'bridge' && result.playerRole) {
      console.log('PASS: Player successfully joined bridge');
      console.log(`  Role: ${result.playerRole}`);
      console.log(`  Crew: ${result.crewSlot}`);
    } else {
      console.log('FAIL: Did not reach bridge with role');
      console.log('  Screen:', result.currentScreen);
      console.log('  Role:', result.playerRole);
    }

  } catch (err) {
    console.error('ERROR:', err.message);
    await page.screenshot({ path: '/tmp/uc2-error.png' });
  }

  writeTodoForFailures('uc2-player-login');

  await sleep(2000);
  await browser.close();
})();
