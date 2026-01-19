#!/usr/bin/env node
/**
 * UC-5: Single Jump
 * Complexity: 4 stars
 *
 * Tests: Astrogator can plot course, initiate jump, exit jump space
 * Prereq: Ship should be at a Jump Point (runs UC-2 + UC-3 abbreviated)
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');
const {
  clickOrHotkey,
  clickSelector,
  clickButtonText,
  typeInput,
  pressKey,
  sleep,
  verifyState,
  writeTodoForFailures,
  clearFailures
} = require('./helpers/click-or-hotkey');

const CAMPAIGN_CODE = 'DFFFC87E';
const DESTINATION = 'Asteltine';

(async () => {
  clearFailures();
  console.log('=== UC-5: Single Jump ===\n');

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
    // --- SETUP: Login as Captain ---
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

    const startSystem = await page.evaluate(() => window.state?.campaign?.current_system);
    console.log(`  Starting system: ${startSystem}\n`);

    // --- UC-5: Single Jump ---
    console.log('--- UC-5: Single Jump ---');

    // Step 5.1: Expand role panel
    console.log('5.1 Expanding role panel...');
    await pressKey(page, '2', 'Role Panel Toggle');
    await sleep(1500);

    // Step 5.2: Switch to Astrogator sub-panel
    console.log('5.2 Switching to Astrogator panel...');
    const panelSwitch = await page.evaluate(() => {
      // Try button in captain panel switcher
      const btns = Array.from(document.querySelectorAll('button'));
      const astroBtn = btns.find(b =>
        b.textContent.includes('Astrogator') ||
        b.title?.includes('jump')
      );
      if (astroBtn) {
        astroBtn.click();
        return 'clicked button';
      }
      // Try window function
      if (typeof window.switchCaptainPanel === 'function') {
        window.switchCaptainPanel('astrogator');
        return 'called switchCaptainPanel';
      }
      return 'not found';
    });
    console.log(`  ✓ Panel switch: ${panelSwitch}`);
    await sleep(1500);

    // Step 5.3: Enter destination
    console.log(`5.3 Entering destination: ${DESTINATION}...`);
    const destTyped = await typeInput(page, '#jump-destination', DESTINATION, 'Jump Destination');
    if (!destTyped) {
      // Try finding input by other means
      await page.evaluate((dest) => {
        const inputs = document.querySelectorAll('input[type="text"]');
        for (const inp of inputs) {
          if (inp.placeholder?.includes('destination') || inp.id?.includes('destination')) {
            inp.value = dest;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }, DESTINATION);
    }
    await sleep(1000);

    // Step 5.4: Plot Course
    console.log('5.4 Plotting jump course...');
    await clickOrHotkey(page, {
      selector: null,
      text: 'Plot Course',
      name: 'Plot Course Button'
    });
    await sleep(2000);

    // Step 5.5: Initiate Jump
    console.log('5.5 Initiating jump...');
    await clickOrHotkey(page, {
      selector: null,
      text: 'Initiate Jump',
      name: 'Initiate Jump Button'
    });
    await sleep(3000);

    // Check jump status
    const jumpStarted = await page.evaluate(() => ({
      inJump: window.state?.jumpStatus?.inJump,
      destination: window.state?.jumpStatus?.destination
    }));
    console.log(`  Jump status: ${JSON.stringify(jumpStarted)}`);

    if (!jumpStarted.inJump) {
      console.log('  ⚠ Jump may not have started, continuing anyway...');
    }

    // Step 5.6: Skip to exit (testing shortcut)
    console.log('5.6 Skipping to jump exit...');
    await page.evaluate(() => {
      if (typeof window.skipToJumpExit === 'function') {
        window.skipToJumpExit();
      }
    });
    await sleep(3000);

    // Step 5.7: Refresh panel to see Exit button
    console.log('5.7 Refreshing panel...');
    await page.evaluate(() => {
      if (typeof window.switchCaptainPanel === 'function') {
        window.switchCaptainPanel('captain');
      }
    });
    await sleep(500);
    await page.evaluate(() => {
      if (typeof window.switchCaptainPanel === 'function') {
        window.switchCaptainPanel('astrogator');
      }
    });
    await sleep(1500);

    // Step 5.8: Exit Jump Space
    console.log('5.8 Exiting jump space...');
    await clickOrHotkey(page, {
      selector: null,
      text: 'Exit Jump',
      name: 'Exit Jump Space Button'
    });
    await sleep(3000);

    // Verification
    console.log('\n--- Verification ---');
    const result = await verifyState(page, () => ({
      inJump: window.state?.jumpStatus?.inJump,
      currentSystem: window.state?.campaign?.current_system,
      needsVerification: window.state?.shipState?.needs_position_verification
    }), 'Final state');

    await page.screenshot({ path: '/tmp/uc5-jump-result.png' });
    console.log('  Screenshot: /tmp/uc5-jump-result.png');

    // Result
    console.log('\n=== UC-5 Result ===');
    if (result.currentSystem === DESTINATION) {
      console.log('PASS: Jump completed successfully');
      console.log(`  From: ${startSystem}`);
      console.log(`  To: ${result.currentSystem}`);
    } else if (result.currentSystem && result.currentSystem !== startSystem) {
      console.log('PARTIAL: Arrived at different system');
      console.log(`  Expected: ${DESTINATION}`);
      console.log(`  Got: ${result.currentSystem}`);
    } else {
      console.log('FAIL: System did not change');
      console.log(`  Still at: ${result.currentSystem}`);
      console.log(`  inJump: ${result.inJump}`);
    }

  } catch (err) {
    console.error('ERROR:', err.message);
    await page.screenshot({ path: '/tmp/uc5-error.png' });
  }

  writeTodoForFailures('uc5-single-jump');

  await sleep(2000);
  await browser.close();
})();
