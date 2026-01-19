#!/usr/bin/env node
/**
 * UC-6: Multi-Stage Jump Use Case (Refactored with click-or-hotkey)
 * Complexity: 5 stars (Hardest)
 *
 * Combines Pilot, Engineer, and Astrogator roles for a complete jump sequence:
 * 1. Captain joins bridge (access to all sub-panels)
 * 2. Pilot travels from Highport to Jump Point
 * 3. Engineer checks fuel status
 * 4. Astrogator plots and initiates jump
 * 5. Jump completes at destination system
 *
 * Campaign: DFFFC87E (seeded test campaign)
 * Starting: Flammarion Highport
 * Destination: Asteltine (Jump-1)
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
  console.log('=== UC-6: Multi-Stage Jump Test ===');
  console.log(`Route: Flammarion Highport → Jump Point → ${DESTINATION}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1400,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // Handle all dialogs
  page.on('dialog', async dialog => {
    console.log('    Dialog:', dialog.type(), '-', dialog.message().substring(0, 50));
    await dialog.accept();
  });

  try {
    // ============================================
    // PHASE 1: Join as Captain
    // ============================================
    console.log('--- PHASE 1: JOIN AS CAPTAIN ---');

    console.log('1.1 Navigating to Operations...');
    await page.goto(fullUrl, { waitUntil: 'networkidle2' });
    await sleep(2000);

    console.log('1.2 Joining campaign as player...');
    await clickOrHotkey(page, {
      selector: '#btn-player-login',
      text: 'Player',
      name: 'Player Login Button'
    });

    await typeInput(page, '#campaign-code', CAMPAIGN_CODE, 'Campaign Code');

    await clickOrHotkey(page, {
      selector: '#btn-join-campaign',
      text: 'Join as Player',
      name: 'Join Campaign Button'
    });
    await sleep(2000);

    console.log('1.3 Selecting James slot (captain/pilot)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const joinBtns = btns.filter(b => b.textContent.trim() === 'Join');
      if (joinBtns[0]) joinBtns[0].click();
    });
    console.log('  ✓ Selected first slot');
    await sleep(2000);

    console.log('1.4 Selecting Captain role...');
    await clickOrHotkey(page, {
      selector: '[data-role-id="captain"]',
      name: 'Captain Role Card'
    });

    await clickOrHotkey(page, {
      text: 'Join Bridge',
      name: 'Join Bridge Button'
    });
    await sleep(3000);

    // Check starting location
    const startLocation = await page.evaluate(() => window.state?.shipState?.locationName);
    const startSystem = await page.evaluate(() => window.state?.campaign?.current_system);
    console.log('   Starting location:', startLocation);
    console.log('   Starting system:', startSystem);

    // ============================================
    // PHASE 2: Navigate to Jump Point
    // ============================================
    console.log('\n--- PHASE 2: TRAVEL TO JUMP POINT ---');

    console.log('2.1 Opening Star System map...');
    await clickOrHotkey(page, {
      selector: '.hamburger-btn, #btn-bridge-menu',
      text: '☰',
      name: 'Hamburger Menu'
    });

    await page.evaluate(() => {
      document.querySelectorAll('.menu-item, a, button').forEach(item => {
        if (item.textContent.includes('Star System')) item.click();
      });
    });
    console.log('  ✓ Clicked Star System menu item');
    await sleep(2000);

    console.log('2.2 Opening Places panel...');
    await clickOrHotkey(page, {
      text: 'Places',
      hotkey: 'p',
      name: 'Places Panel Toggle'
    });

    console.log('2.3 Finding Mainworld Jump Point...');
    const jumpPoint = await page.evaluate(() => {
      const places = document.querySelectorAll('.place-item, [data-place-id]');
      for (const p of places) {
        if (p.textContent.includes('Mainworld Departure') || p.textContent.includes('Jump Point') || p.textContent.includes('System Departure')) {
          const rect = p.getBoundingClientRect();
          p.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true, cancelable: true, view: window, button: 2,
            clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2
          }));
          return p.textContent.trim().substring(0, 40);
        }
      }
      return 'not found';
    });
    console.log('   Jump point:', jumpPoint);
    await sleep(2000);

    console.log('2.4 Setting course...');
    await clickOrHotkey(page, {
      text: 'Set Course',
      hotkey: 's',
      name: 'Set Course Button'
    });

    console.log('2.5 Traveling...');
    await clickOrHotkey(page, {
      text: 'Travel',
      hotkey: 't',
      name: 'Travel Button',
      waitMs: 4000
    });

    const newLocation = await page.evaluate(() => window.state?.shipState?.locationName);
    console.log('   New location:', newLocation);
    await page.screenshot({ path: '/tmp/uc6-1-pilot.png' });

    // ============================================
    // PHASE 3: Check Fuel (Engineer perspective)
    // ============================================
    console.log('\n--- PHASE 3: FUEL CHECK ---');

    console.log('3.1 Checking fuel status...');
    await page.evaluate(() => window.state?.socket?.emit('ops:getFuelStatus'));
    await sleep(1000);
    const fuelStatus = await page.evaluate(() => window.state?.fuelStatus);
    console.log('   Fuel:', fuelStatus?.total + '/' + fuelStatus?.max, 'tons');
    if (fuelStatus?.breakdown) {
      console.log('   Breakdown:', JSON.stringify(fuelStatus.breakdown));
    }

    // ============================================
    // PHASE 4: Plot Jump (Astrogator via Captain panel)
    // ============================================
    console.log('\n--- PHASE 4: ASTROGATOR JUMP ---');

    console.log('4.1 Closing Star System view...');
    await clickOrHotkey(page, {
      text: 'Close',
      hotkey: 'Escape',
      name: 'Close System Map Button'
    });

    console.log('4.2 Expanding role panel...');
    await pressKey(page, '2', 'Role Panel Toggle');

    console.log('4.3 Switching to Astrogator panel...');
    const panelSwitch = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const astroBtn = btns.find(b => b.textContent.includes('Astrogator') || b.title?.includes('jumps'));
      if (astroBtn) {
        astroBtn.click();
        return 'clicked: ' + astroBtn.textContent.trim();
      }
      if (typeof window.switchCaptainPanel === 'function') {
        window.switchCaptainPanel('astrogator');
        return 'called switchCaptainPanel';
      }
      return 'astrogator button not found';
    });
    console.log('   Panel switch:', panelSwitch);
    await sleep(1500);
    await page.screenshot({ path: '/tmp/uc6-astro-panel.png' });

    console.log('4.4 Entering destination:', DESTINATION);
    const destTyped = await typeInput(page, '#jump-destination', DESTINATION, 'Jump Destination');
    if (!destTyped) {
      console.log('   ⚠ Trying alternate input method');
      await page.evaluate((dest) => {
        const inputs = document.querySelectorAll('input');
        for (const inp of inputs) {
          if (inp.placeholder?.toLowerCase().includes('destination') || inp.id?.includes('destination')) {
            inp.value = dest;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }, DESTINATION);
    }

    console.log('4.5 Clicking Plot Course...');
    await clickOrHotkey(page, {
      text: 'Plot Course',
      name: 'Plot Course Button',
      waitMs: 2000
    });
    await page.screenshot({ path: '/tmp/uc6-plotted.png' });

    console.log('4.6 Initiating jump...');
    await clickOrHotkey(page, {
      text: 'Initiate Jump',
      name: 'Initiate Jump Button',
      waitMs: 3000
    });

    // Check jump status
    const jumpStatus = await verifyState(page, () => ({
      inJump: window.state?.jumpStatus?.inJump,
      destination: window.state?.jumpStatus?.destination,
      shipInJump: window.state?.shipState?.inJump
    }), 'Jump status');
    await page.screenshot({ path: '/tmp/uc6-2-jump.png' });

    // ============================================
    // PHASE 5: Complete Jump
    // ============================================
    console.log('\n--- PHASE 5: COMPLETE JUMP ---');

    if (jumpStatus.inJump || jumpStatus.shipInJump) {
      console.log('5.1 Ship is in jump space - skipping to exit...');
      const skipResult = await page.evaluate(() => {
        if (typeof window.skipToJumpExit === 'function') {
          window.skipToJumpExit();
          return 'called skipToJumpExit';
        }
        return 'skipToJumpExit not found';
      });
      console.log('   Skip result:', skipResult);
      await sleep(3000);

      const postSkipStatus = await verifyState(page, () => ({
        inJump: window.state?.jumpStatus?.inJump,
        canExit: window.state?.jumpStatus?.canExit,
        current_system: window.state?.campaign?.current_system
      }), 'Post-skip status');
      await page.screenshot({ path: '/tmp/uc6-post-skip.png' });

      console.log('5.2 Refreshing panel...');
      await page.evaluate(() => window.switchCaptainPanel?.('captain'));
      await sleep(500);
      await page.evaluate(() => window.switchCaptainPanel?.('astrogator'));
      await sleep(1500);
      await page.screenshot({ path: '/tmp/uc6-refreshed.png' });

      console.log('5.3 Completing jump...');
      await clickOrHotkey(page, {
        text: 'Exit Jump',
        name: 'Exit Jump Space Button',
        waitMs: 3000
      });
    } else {
      console.log('   ⚠ Jump may not have started, checking state...');
    }

    // Final status
    const finalResult = await verifyState(page, () => ({
      system: window.state?.campaign?.current_system,
      inJump: window.state?.jumpStatus?.inJump,
      needsVerification: window.state?.shipState?.needs_position_verification
    }), 'Final state');
    await page.screenshot({ path: '/tmp/uc6-3-arrival.png' });

    // ============================================
    // Summary
    // ============================================
    console.log('\n=== UC-6 Result ===');
    if (finalResult.system === DESTINATION) {
      console.log('PASS: Multi-stage jump completed successfully');
      console.log(`  From: ${startSystem}`);
      console.log(`  To: ${finalResult.system}`);
    } else if (finalResult.system && finalResult.system !== startSystem) {
      console.log('PARTIAL: Arrived at different system');
      console.log(`  Expected: ${DESTINATION}`);
      console.log(`  Got: ${finalResult.system}`);
    } else {
      console.log('FAIL: System did not change');
      console.log(`  Still at: ${finalResult.system || startSystem}`);
      console.log(`  inJump: ${finalResult.inJump}`);
    }
    console.log('\nScreenshots saved to /tmp/uc6-*.png');

  } catch (err) {
    console.error('ERROR:', err.message);
    await page.screenshot({ path: '/tmp/uc6-error.png' });
  }

  // Write TODOs for any click failures
  writeTodoForFailures('uc6-multistage-jump');

  await sleep(3000);
  await browser.close();
})();
