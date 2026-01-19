#!/usr/bin/env node
/**
 * E2E Test: Engineer Process Fuel Operations
 *
 * Tests processing unrefined fuel to remove misjump risk.
 * Ship starts with 30 tons unrefined fuel that needs processing.
 *
 * Campaign: DFFFC87E (seeded test campaign)
 * Ship has: 20 refined + 30 unrefined = 50 tons fuel
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');

const CAMPAIGN_CODE = 'DFFFC87E';
const PLAYER_SLOT = 'Max'; // Engineer slot

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1400,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('=== Engineer Process Fuel Test ===');
  console.log('Use Case: Process unrefined fuel to refined\n');

  // Handle dialogs early - before any interaction
  page.on('dialog', async dialog => {
    console.log('    Dialog:', dialog.type(), '-', dialog.message());
    if (dialog.type() === 'prompt') {
      // Accept with the default value shown in the prompt
      const match = dialog.message().match(/\(0-(\d+)\)/);
      const defaultValue = match ? match[1] : '30';
      await dialog.accept(defaultValue);
    } else {
      await dialog.accept();
    }
  });

  // Step 1: Navigate to Operations
  console.log('1. Opening localhost:3000/operations...');
  await page.goto(fullUrl, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Step 2: Click Player button
  console.log('2. Selecting Player mode...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const playerBtn = btns.find(b => b.textContent.includes('Player'));
    if (playerBtn) playerBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Step 3: Enter campaign code
  console.log('3. Entering campaign code:', CAMPAIGN_CODE);
  await page.type('#campaign-code', CAMPAIGN_CODE);
  await new Promise(r => setTimeout(r, 500));

  // Step 4: Join as Player
  console.log('4. Joining campaign...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const joinBtn = btns.find(b => b.textContent.includes('Join as Player'));
    if (joinBtn) joinBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Step 5: Select Max slot (engineer) - Max is pre-assigned as engineer
  console.log('5. Selecting player slot:', PLAYER_SLOT);
  const slotSelected = await page.evaluate((slotName) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const slotRows = document.querySelectorAll('.slot-row, .player-slot, tr');
    for (const row of slotRows) {
      if (row.textContent.includes(slotName)) {
        const joinBtn = row.querySelector('button') ||
                        btns.find(b => row.contains(b) && b.textContent.trim() === 'Join');
        if (joinBtn) {
          joinBtn.click();
          return slotName;
        }
      }
    }
    // Fallback: click third Join button
    const joinBtns = btns.filter(b => b.textContent.trim() === 'Join');
    if (joinBtns.length > 2) {
      joinBtns[2].click();
      return 'third-slot';
    }
    return null;
  }, PLAYER_SLOT);
  console.log('   Slot selected:', slotSelected);
  await new Promise(r => setTimeout(r, 2000));

  // Step 6: Select Engineer role (Max is already engineer, just confirm)
  console.log('6. Selecting Engineer role...');
  const roleResult = await page.evaluate(() => {
    const engineerCard = document.querySelector('[data-role-id="engineer"]');
    if (engineerCard) {
      engineerCard.click();
      return { found: true, taken: engineerCard.classList.contains('taken') };
    }
    return { found: false };
  });
  console.log('   Role card:', roleResult);
  await new Promise(r => setTimeout(r, 2000));

  // Step 7: Click Join Bridge
  console.log('7. Clicking Join Bridge...');
  const joinResult = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const joinBtn = btns.find(b => b.textContent.includes('Join Bridge'));
    if (joinBtn) {
      joinBtn.click();
      return { clicked: true, text: joinBtn.textContent.trim() };
    }
    return { clicked: false, buttons: btns.map(b => b.textContent.trim()).slice(0, 10) };
  });
  console.log('   Join result:', joinResult);
  await new Promise(r => setTimeout(r, 4000));

  // Step 7b: Verify we're on bridge and maximize role panel with '2' hotkey
  console.log('7b. Checking bridge and maximizing role panel...');
  await page.screenshot({ path: '/tmp/process-fuel-0.png', fullPage: false });
  const bridgeCheck = await page.evaluate(() => {
    const onBridge = !!document.querySelector('#role-panel, .bridge-container');
    const roleTitle = document.getElementById('role-panel-title')?.textContent;
    return { onBridge, roleTitle };
  });
  console.log('   Bridge check:', bridgeCheck);

  // Press '2' to expand role panel (Engineer panel)
  console.log('   Pressing 2 to expand role panel...');
  await page.keyboard.press('2');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/process-fuel-0b.png', fullPage: false });

  // Step 8: Request fuel status and wait for it to load
  console.log('8. Requesting fuel status...');
  await page.evaluate(() => {
    // Request fresh fuel status from server
    window.state?.socket?.emit('ops:getFuelStatus');
  });
  await new Promise(r => setTimeout(r, 2000));

  const fuelInfo = await page.evaluate(() => {
    return {
      fuelStatus: window.state?.fuelStatus,
      shipFuel: window.state?.shipState?.fuel,
      fuelBreakdown: window.state?.fuelStatus?.breakdown || window.state?.shipState?.fuelBreakdown,
      hasUnrefined: (window.state?.fuelStatus?.breakdown?.unrefined || 0) > 0
    };
  });
  console.log('   Fuel status:', JSON.stringify(fuelInfo));

  await page.screenshot({ path: '/tmp/process-fuel-1.png', fullPage: false });
  console.log('   Screenshot saved: /tmp/process-fuel-1.png');

  // Step 9: Find Process Fuel button (search within role panel or expanded panel)
  console.log('9. Looking for Process Fuel button...');
  const processBtnInfo = await page.evaluate(() => {
    // Look in role panel or fullscreen overlay
    const panel = document.querySelector('#role-panel, .fullscreen-overlay, .panel-expanded');
    const btns = panel
      ? Array.from(panel.querySelectorAll('button'))
      : Array.from(document.querySelectorAll('button'));
    const processBtn = btns.find(b => b.textContent.includes('Process Fuel'));
    const refuelBtn = btns.find(b => b.textContent.includes('Refuel') && !b.textContent.includes('Process'));
    if (processBtn) {
      return {
        found: true,
        text: processBtn.textContent.trim(),
        disabled: processBtn.disabled,
        refuelFound: !!refuelBtn
      };
    }
    return {
      found: false,
      refuelFound: !!refuelBtn,
      panelButtons: btns.map(b => b.textContent.trim()).filter(t => t.length < 30).slice(0, 10),
      panelFound: !!panel
    };
  });
  console.log('   Process Fuel button:', processBtnInfo);

  // Step 10: Click Process Fuel button using Puppeteer's click
  console.log('10. Clicking Process Fuel button...');

  // First check state
  const stateCheck = await page.evaluate(() => ({
    campaignId: window.state?.campaignId || 'MISSING',
    selectedShipId: window.state?.selectedShipId || 'MISSING',
    socket: !!window.state?.socket,
    connected: window.state?.socket?.connected
  }));
  console.log('   State check:', stateCheck);

  // Find and click the Process Fuel button
  const processBtnHandle = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent.includes('Process Fuel'));
  });

  if (processBtnHandle) {
    await processBtnHandle.click();
    console.log('   Clicked Process Fuel button');
  } else {
    console.log('   Process Fuel button not found for click');
  }

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/tmp/process-fuel-2.png', fullPage: false });

  // Step 11: Check if processing started (may show notification or update fuel status)
  console.log('11. Checking if processing started...');
  const afterProcessInfo = await page.evaluate(() => {
    return {
      fuelStatus: window.state?.fuelStatus,
      shipFuel: window.state?.shipState?.fuel,
      fuelBreakdown: window.state?.shipState?.fuelBreakdown,
      processing: window.state?.fuelStatus?.processing
    };
  });
  console.log('   After process click:', JSON.stringify(afterProcessInfo));

  // Wait for processing to complete (if it's a time-based operation)
  console.log('12. Waiting for processing...');
  await new Promise(r => setTimeout(r, 3000));

  // Final check
  console.log('13. Final fuel status...');
  const finalFuelInfo = await page.evaluate(() => {
    return {
      fuelStatus: window.state?.fuelStatus,
      fuelBreakdown: window.state?.fuelStatus?.breakdown
    };
  });
  console.log('   Final fuel:', JSON.stringify(finalFuelInfo));

  await page.screenshot({ path: '/tmp/process-fuel-3.png', fullPage: false });
  console.log('   Screenshot saved: /tmp/process-fuel-3.png');

  console.log('\n=== Engineer Process Fuel Test Complete ===');
  console.log('Unrefined fuel should now be processed (or processing started).');

  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
})();
