#!/usr/bin/env node
/**
 * LR Hard Mode: Interactive Exploration
 *
 * Goals:
 * - Click all over the app to learn navigation
 * - Track fuel consumption
 * - Watch for anomalies
 * - Document findings
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');
const { sleep, verifyState } = require('./helpers/click-or-hotkey');

const CAMPAIGN_CODE = 'DFFFC87E';

// Tracking state
const FINDINGS = {
  fuelLog: [],
  anomalies: [],
  buttonsFound: [],
  panelsVisited: [],
  errors: []
};

(async () => {
  console.log('=== LR HARD MODE: Interactive Exploration ===\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1600,1000'],
    slowMo: 100  // Slow down to watch what's happening
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      FINDINGS.errors.push(text);
      console.log('  [ERROR]', text.substring(0, 100));
    }
  });

  // Handle dialogs
  page.on('dialog', async dialog => {
    console.log('  [DIALOG]', dialog.message().substring(0, 60));
    await dialog.accept();
  });

  try {
    // ============================================
    // PHASE 1: LOGIN AS CAPTAIN
    // ============================================
    console.log('--- PHASE 1: LOGIN ---');
    await page.goto(fullUrl, { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Explore login screen buttons
    const loginButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button'))
        .map(b => b.textContent.trim())
        .filter(t => t.length > 0 && t.length < 30);
    });
    console.log('Login buttons found:', loginButtons);
    FINDINGS.buttonsFound.push({ screen: 'login', buttons: loginButtons });

    // Login as player
    await page.evaluate(() => {
      document.querySelectorAll('button').forEach(b => {
        if (b.textContent.includes('Player')) b.click();
      });
    });
    await sleep(1000);
    await page.type('#campaign-code', CAMPAIGN_CODE);
    await page.evaluate(() => {
      document.querySelectorAll('button').forEach(b => {
        if (b.textContent.includes('Join as Player')) b.click();
      });
    });
    await sleep(2000);

    // Select first slot
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      btns.find(b => b.textContent.trim() === 'Join')?.click();
    });
    await sleep(2000);

    // Select Captain
    await page.evaluate(() => {
      document.querySelector('[data-role-id="captain"]')?.click();
    });
    await sleep(1000);
    await page.evaluate(() => {
      document.querySelectorAll('button').forEach(b => {
        if (b.textContent.includes('Join Bridge')) b.click();
      });
    });
    await sleep(3000);
    console.log('✓ Logged in as Captain\n');

    // ============================================
    // PHASE 2: INITIAL STATE CHECK
    // ============================================
    console.log('--- PHASE 2: INITIAL STATE ---');

    // Get comprehensive state
    const initialState = await page.evaluate(() => ({
      system: window.state?.campaign?.current_system,
      hex: window.state?.campaign?.current_hex,
      location: window.state?.shipState?.locationId,
      locationName: window.state?.shipState?.locationName,
      docked: window.state?.shipState?.docked,
      inJump: window.state?.jumpStatus?.inJump,
      fuel: window.state?.fuelStatus,
      ship: {
        name: window.state?.ship?.name,
        tonnage: window.state?.ship?.tonnage,
        jump: window.state?.ship?.jump,
        thrust: window.state?.ship?.thrust
      }
    }));
    console.log('Initial state:', JSON.stringify(initialState, null, 2));
    FINDINGS.fuelLog.push({ time: 'start', ...initialState.fuel });

    // Request fresh fuel status
    await page.evaluate(() => window.state?.socket?.emit('ops:getFuelStatus'));
    await sleep(1000);
    const freshFuel = await page.evaluate(() => window.state?.fuelStatus);
    console.log('Fresh fuel status:', JSON.stringify(freshFuel));

    await page.screenshot({ path: '/tmp/lr-01-initial.png' });

    // ============================================
    // PHASE 3: EXPLORE BRIDGE UI
    // ============================================
    console.log('\n--- PHASE 3: EXPLORE BRIDGE UI ---');

    // Find all visible buttons
    const bridgeButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button:not([disabled])'))
        .map(b => ({
          text: b.textContent.trim().substring(0, 30),
          id: b.id || null,
          class: b.className.substring(0, 30)
        }))
        .filter(b => b.text.length > 0);
    });
    console.log(`Found ${bridgeButtons.length} buttons on bridge`);
    FINDINGS.buttonsFound.push({ screen: 'bridge', buttons: bridgeButtons.slice(0, 20) });

    // Test panel hotkeys
    console.log('\nTesting panel hotkeys...');
    for (const key of ['1', '2', '3', '4']) {
      await page.keyboard.press(key);
      await sleep(800);
      const panelState = await page.evaluate(() => {
        const expanded = document.querySelector('.panel-expanded, .expanded');
        return expanded ? expanded.id || expanded.className.substring(0, 30) : 'none';
      });
      console.log(`  Key ${key}: ${panelState}`);
      await page.keyboard.press('Escape');
      await sleep(500);
    }

    // ============================================
    // PHASE 4: EXPLORE CAPTAIN SUB-PANELS
    // ============================================
    console.log('\n--- PHASE 4: CAPTAIN SUB-PANELS ---');

    await page.keyboard.press('2'); // Open role panel
    await sleep(1000);

    // Find sub-panel switcher buttons
    const subPanels = ['captain', 'pilot', 'astrogator', 'engineer'];
    for (const panel of subPanels) {
      console.log(`\nSwitching to ${panel} sub-panel...`);
      await page.evaluate((p) => {
        if (typeof window.switchCaptainPanel === 'function') {
          window.switchCaptainPanel(p);
        }
      }, panel);
      await sleep(1000);

      // Catalog what's in this panel
      const panelContents = await page.evaluate(() => {
        const rolePanel = document.getElementById('role-panel') ||
                         document.querySelector('.role-panel-content');
        if (!rolePanel) return { buttons: [], inputs: [] };

        return {
          buttons: Array.from(rolePanel.querySelectorAll('button'))
            .map(b => b.textContent.trim().substring(0, 25))
            .filter(t => t.length > 0),
          inputs: Array.from(rolePanel.querySelectorAll('input, select'))
            .map(i => i.id || i.name || i.placeholder || 'unknown')
        };
      });
      console.log(`  Buttons: ${panelContents.buttons.slice(0, 8).join(', ')}`);
      console.log(`  Inputs: ${panelContents.inputs.join(', ')}`);
      FINDINGS.panelsVisited.push({ panel, ...panelContents });

      await page.screenshot({ path: `/tmp/lr-panel-${panel}.png` });
    }

    await page.keyboard.press('Escape');
    await sleep(500);

    // ============================================
    // PHASE 5: EXPLORE SYSTEM MAP
    // ============================================
    console.log('\n--- PHASE 5: SYSTEM MAP ---');

    // Open hamburger menu
    await page.evaluate(() => {
      document.querySelector('.hamburger-btn, #btn-bridge-menu')?.click();
    });
    await sleep(1000);

    // Find menu items
    const menuItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.menu-item, .sidebar-item'))
        .map(i => i.textContent.trim().substring(0, 30));
    });
    console.log('Menu items:', menuItems);

    // Click Star System
    await page.evaluate(() => {
      document.querySelectorAll('.menu-item, a, button').forEach(item => {
        if (item.textContent.includes('Star System')) item.click();
      });
    });
    await sleep(2000);
    await page.screenshot({ path: '/tmp/lr-02-systemmap.png' });

    // Open Places panel
    await page.keyboard.press('p');
    await sleep(1500);

    // Catalog places
    const places = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.place-item, [data-place-id]'))
        .map(p => ({
          text: p.textContent.trim().substring(0, 40),
          id: p.dataset?.placeId || null
        }));
    });
    console.log(`Places found (${places.length}):`);
    places.slice(0, 8).forEach(p => console.log(`  - ${p.text}`));

    await page.screenshot({ path: '/tmp/lr-03-places.png' });

    // ============================================
    // PHASE 6: TRAVEL TO JUMP POINT
    // ============================================
    console.log('\n--- PHASE 6: TRAVEL TO JUMP POINT ---');

    // Find and select jump point
    const jumpPointSelected = await page.evaluate(() => {
      const places = document.querySelectorAll('.place-item, [data-place-id]');
      for (const p of places) {
        if (p.textContent.includes('System Departure') ||
            p.textContent.includes('Jump Point') ||
            p.textContent.includes('Mainworld Departure')) {
          const rect = p.getBoundingClientRect();
          p.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true, cancelable: true, view: window, button: 2,
            clientX: rect.left + 10, clientY: rect.top + 10
          }));
          return p.textContent.trim().substring(0, 40);
        }
      }
      return null;
    });
    console.log('Selected:', jumpPointSelected);
    await sleep(2000);

    // Set course
    await page.keyboard.press('s');
    await sleep(2000);

    // Check fuel BEFORE travel
    await page.evaluate(() => window.state?.socket?.emit('ops:getFuelStatus'));
    await sleep(500);
    const fuelBefore = await page.evaluate(() => window.state?.fuelStatus);
    console.log('Fuel before travel:', fuelBefore?.total, 'tons');
    FINDINGS.fuelLog.push({ time: 'before_travel', ...fuelBefore });

    // Travel
    console.log('Traveling...');
    await page.keyboard.press('t');
    await sleep(5000);

    // Check fuel AFTER travel
    await page.evaluate(() => window.state?.socket?.emit('ops:getFuelStatus'));
    await sleep(500);
    const fuelAfter = await page.evaluate(() => window.state?.fuelStatus);
    console.log('Fuel after travel:', fuelAfter?.total, 'tons');
    FINDINGS.fuelLog.push({ time: 'after_travel', ...fuelAfter });

    // Check if fuel changed
    if (fuelBefore?.total !== fuelAfter?.total) {
      console.log(`  FUEL CONSUMED: ${fuelBefore?.total - fuelAfter?.total} tons`);
    } else {
      console.log('  NOTE: In-system travel did not consume fuel');
    }

    await page.screenshot({ path: '/tmp/lr-04-at-jumppoint.png' });

    // ============================================
    // PHASE 7: ATTEMPT JUMP
    // ============================================
    console.log('\n--- PHASE 7: JUMP TO ASTELTINE ---');

    // Close system map
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      btns.find(b => b.textContent.trim() === 'Close')?.click();
    });
    await sleep(1500);

    // Open astrogator panel
    await page.keyboard.press('2');
    await sleep(1000);
    await page.evaluate(() => window.switchCaptainPanel('astrogator'));
    await sleep(1500);

    // Enter destination
    const destInput = await page.$('#jump-destination');
    if (destInput) {
      await destInput.click({ clickCount: 3 });
      await destInput.type('Asteltine');
    }
    await sleep(1000);

    // Plot course
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      btns.find(b => b.textContent.includes('Plot Course'))?.click();
    });
    await sleep(2000);

    // Check what the plot result shows
    const plotResult = await page.evaluate(() => {
      const resultDiv = document.getElementById('jump-plot-result');
      return resultDiv?.textContent?.substring(0, 200) || 'not found';
    });
    console.log('Plot result:', plotResult.substring(0, 100));

    // Fuel before jump
    await page.evaluate(() => window.state?.socket?.emit('ops:getFuelStatus'));
    await sleep(500);
    const fuelBeforeJump = await page.evaluate(() => window.state?.fuelStatus);
    console.log('Fuel before jump:', fuelBeforeJump?.total, 'tons');
    FINDINGS.fuelLog.push({ time: 'before_jump', ...fuelBeforeJump });

    // Initiate jump
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      btns.find(b => b.textContent.includes('Initiate Jump'))?.click();
    });
    await sleep(3000);

    // Check jump status
    const jumpStatus = await page.evaluate(() => ({
      inJump: window.state?.jumpStatus?.inJump,
      destination: window.state?.jumpStatus?.destination,
      fuelUsed: window.state?.jumpStatus?.fuelUsed
    }));
    console.log('Jump status:', jumpStatus);

    // Fuel after initiating
    await page.evaluate(() => window.state?.socket?.emit('ops:getFuelStatus'));
    await sleep(500);
    const fuelAfterInit = await page.evaluate(() => window.state?.fuelStatus);
    console.log('Fuel after jump initiate:', fuelAfterInit?.total, 'tons');
    FINDINGS.fuelLog.push({ time: 'after_jump_init', ...fuelAfterInit });

    if (fuelBeforeJump?.total !== fuelAfterInit?.total) {
      const used = fuelBeforeJump.total - fuelAfterInit.total;
      console.log(`  🔥 JUMP FUEL CONSUMED: ${used} tons`);
    }

    await page.screenshot({ path: '/tmp/lr-05-jump-initiated.png' });

    // Skip to exit
    console.log('\nSkipping to jump exit...');
    await page.evaluate(() => window.skipToJumpExit?.());
    await sleep(3000);

    // Refresh and exit
    await page.evaluate(() => window.switchCaptainPanel?.('captain'));
    await sleep(500);
    await page.evaluate(() => window.switchCaptainPanel?.('astrogator'));
    await sleep(1500);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      btns.find(b => b.textContent.includes('Exit Jump'))?.click();
    });
    await sleep(3000);

    // Final state
    const finalState = await page.evaluate(() => ({
      system: window.state?.campaign?.current_system,
      inJump: window.state?.jumpStatus?.inJump
    }));
    console.log('Final system:', finalState.system);

    // Final fuel
    await page.evaluate(() => window.state?.socket?.emit('ops:getFuelStatus'));
    await sleep(500);
    const finalFuel = await page.evaluate(() => window.state?.fuelStatus);
    console.log('Final fuel:', finalFuel?.total, 'tons');
    FINDINGS.fuelLog.push({ time: 'final', ...finalFuel });

    await page.screenshot({ path: '/tmp/lr-06-arrived.png' });

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('=== LR HARD MODE SUMMARY ===');
    console.log('='.repeat(50));

    console.log('\n📊 FUEL LOG:');
    FINDINGS.fuelLog.forEach(f => {
      console.log(`  ${f.time}: ${f?.total}/${f?.max}t`);
    });

    console.log('\n🔍 PANELS VISITED:', FINDINGS.panelsVisited.length);

    console.log('\n⚠️  ERRORS CAPTURED:', FINDINGS.errors.length);
    FINDINGS.errors.slice(0, 5).forEach(e => console.log(`  - ${e.substring(0, 80)}`));

    console.log('\n📸 Screenshots saved to /tmp/lr-*.png');

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    FINDINGS.anomalies.push(err.message);
    await page.screenshot({ path: '/tmp/lr-error.png' });
  }

  // Keep browser open for manual inspection
  console.log('\n⏳ Browser staying open for 30s for inspection...');
  await sleep(30000);

  await browser.close();
  console.log('\n✅ LR Complete');
})();
