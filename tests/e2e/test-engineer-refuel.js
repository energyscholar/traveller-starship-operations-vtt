#!/usr/bin/env node
/**
 * E2E Test: Engineer Refueling Operations
 *
 * Part of the Multi-Stage Jump Use Case:
 * 1. Pilot travels to destination
 * 2. Engineer refuels ship (THIS TEST)
 * 3. Astrogator initiates jump
 *
 * This test covers: Engineer refueling from starport
 *
 * Campaign: DFFFC87E (seeded test campaign)
 * Ship starts with 30 tons fuel (capacity 125)
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

  console.log('=== Engineer Refuel Test ===');
  console.log('Use Case: Refuel ship at starport\n');

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

  // Step 5: Select Max slot (engineer)
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
    // Fallback: click third Join button (Max is third slot)
    const joinBtns = btns.filter(b => b.textContent.trim() === 'Join');
    if (joinBtns.length > 2) {
      joinBtns[2].click();
      return 'third-slot';
    }
    return null;
  }, PLAYER_SLOT);
  console.log('   Slot selected:', slotSelected);
  await new Promise(r => setTimeout(r, 2000));

  // Step 6: Select Engineer role
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
  await new Promise(r => setTimeout(r, 1000));

  // Step 7: Click Join Bridge
  console.log('7. Joining bridge as Engineer...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const joinBtn = btns.find(b => b.textContent.includes('Join Bridge'));
    if (joinBtn) joinBtn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  // Handle dialogs
  page.on('dialog', async dialog => {
    console.log('    Dialog:', dialog.message());
    await dialog.accept();
  });

  // Step 8: Check current fuel status
  console.log('8. Checking fuel status...');
  const fuelInfo = await page.evaluate(() => {
    const fuelEl = document.querySelector('.fuel-status, [class*="fuel"]');
    const shipState = window.state?.shipState || {};
    return {
      fuel: shipState.fuel,
      fuelStatus: window.state?.fuelStatus,
      fuelText: fuelEl?.textContent?.substring(0, 100)
    };
  });
  console.log('   Fuel:', JSON.stringify(fuelInfo));

  await page.screenshot({ path: '/tmp/engineer-test-1.png', fullPage: false });
  console.log('   Screenshot saved: /tmp/engineer-test-1.png');

  // Step 9: Find and click Refuel button
  console.log('9. Looking for Refuel button...');
  const refuelBtnInfo = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const refuelBtn = btns.find(b => b.textContent.includes('Refuel'));
    if (refuelBtn) {
      return {
        found: true,
        text: refuelBtn.textContent.trim(),
        disabled: refuelBtn.disabled
      };
    }
    return { found: false, allButtons: btns.map(b => b.textContent.trim()).slice(0, 10) };
  });
  console.log('   Refuel button:', refuelBtnInfo);

  // Step 10: Click Refuel button
  console.log('10. Clicking Refuel button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const refuelBtn = btns.find(b => b.textContent.includes('Refuel'));
    if (refuelBtn) refuelBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/tmp/engineer-test-2.png', fullPage: false });

  // Step 11: Check refuel modal
  console.log('11. Checking refuel modal...');
  const modalInfo = await page.evaluate(() => {
    const modal = document.querySelector('.modal, [class*="modal"]');
    const sourceSelect = document.getElementById('refuel-source');
    const amountInput = document.getElementById('refuel-amount');
    return {
      modalVisible: !!modal && modal.offsetParent !== null,
      hasSourceSelect: !!sourceSelect,
      sourceOptions: sourceSelect ? Array.from(sourceSelect.options).map(o => o.text) : [],
      amountValue: amountInput?.value
    };
  });
  console.log('   Modal:', modalInfo);

  // Step 12: Select first fuel source and set amount
  console.log('12. Selecting fuel source and amount...');
  await page.evaluate(() => {
    const sourceSelect = document.getElementById('refuel-source');
    if (sourceSelect && sourceSelect.options.length > 0) {
      sourceSelect.selectedIndex = 0;
      sourceSelect.dispatchEvent(new Event('change'));
    }
    const amountInput = document.getElementById('refuel-amount');
    if (amountInput) {
      amountInput.value = '50';
      amountInput.dispatchEvent(new Event('input'));
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: '/tmp/engineer-test-3.png', fullPage: false });

  // Step 13: Click Max button to fill tank
  console.log('13. Clicking Max button...');
  await page.evaluate(() => {
    const maxBtn = document.getElementById('btn-refuel-max');
    if (maxBtn) maxBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Step 14: Execute refuel
  console.log('14. Executing refuel...');
  await page.evaluate(() => {
    const executeBtn = document.getElementById('btn-execute-refuel');
    if (executeBtn) executeBtn.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: '/tmp/engineer-test-4.png', fullPage: false });

  // Step 15: Verify fuel increased
  console.log('15. Verifying fuel after refuel...');
  const newFuelInfo = await page.evaluate(() => {
    const shipState = window.state?.shipState || {};
    return {
      fuel: shipState.fuel,
      fuelStatus: window.state?.fuelStatus
    };
  });
  console.log('   New fuel:', JSON.stringify(newFuelInfo));

  // Final screenshot
  await page.screenshot({ path: '/tmp/engineer-test-5.png', fullPage: false });
  console.log('   Screenshot saved: /tmp/engineer-test-5.png');

  console.log('\n=== Engineer Refuel Test Complete ===');
  console.log('Ship should now have more fuel.');

  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
})();
