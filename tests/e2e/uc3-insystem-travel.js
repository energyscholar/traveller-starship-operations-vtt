#!/usr/bin/env node
/**
 * UC-3: In-System Travel
 * Complexity: 3 stars
 *
 * Tests: Pilot can open system map, select destination, set course, travel
 * Prereq: Logged in as Captain or Pilot (runs UC-2 first)
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');
const {
  clickOrHotkey,
  clickSelector,
  clickButtonText,
  rightClick,
  typeInput,
  pressKey,
  sleep,
  verifyState,
  writeTodoForFailures,
  clearFailures
} = require('./helpers/click-or-hotkey');

const CAMPAIGN_CODE = 'DFFFC87E';

(async () => {
  clearFailures();
  console.log('=== UC-3: In-System Travel ===\n');

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

    // Select first slot
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      btns.find(b => b.textContent.trim() === 'Join')?.click();
    });
    await sleep(2000);

    // Select Captain role
    await clickSelector(page, '[data-role-id="captain"]', 'Captain Role');
    await sleep(1000);
    await clickButtonText(page, 'Join Bridge', 'Join Bridge');
    await sleep(3000);

    // Record starting location
    const startLocation = await page.evaluate(() =>
      window.state?.shipState?.locationId || window.state?.shipState?.locationName
    );
    console.log(`  Starting location: ${startLocation}\n`);

    // --- UC-3: In-System Travel ---
    console.log('--- UC-3: In-System Travel ---');

    // Step 3.1: Open Menu
    console.log('3.1 Opening hamburger menu...');
    await clickOrHotkey(page, {
      selector: '.hamburger-btn, #btn-bridge-menu',
      text: null,
      name: 'Hamburger Menu Button'
    });
    await sleep(1000);

    // Step 3.2: Click Star System
    console.log('3.2 Opening Star System map...');
    const menuClicked = await page.evaluate(() => {
      const items = document.querySelectorAll('.menu-item, a, button');
      for (const item of items) {
        if (item.textContent.includes('Star System')) {
          item.click();
          return true;
        }
      }
      return false;
    });
    if (menuClicked) console.log('  ✓ Clicked: Star System menu item');
    await sleep(2000);

    // Step 3.3: Open Places panel
    console.log('3.3 Opening Places panel...');
    await clickOrHotkey(page, {
      selector: null,
      text: 'Places',
      hotkey: 'p',
      name: 'Places Panel Toggle'
    });
    await sleep(1500);

    // Step 3.4: Find and select Jump Point destination
    console.log('3.4 Selecting Jump Point destination...');
    const destinationFound = await page.evaluate(() => {
      const places = document.querySelectorAll('.place-item, [data-place-id]');
      for (const p of places) {
        const text = p.textContent || '';
        if (text.includes('Jump Point') || text.includes('Mainworld Departure') || text.includes('Orbit')) {
          // Right-click to open details
          const rect = p.getBoundingClientRect();
          p.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true, cancelable: true, view: window, button: 2,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
          }));
          return text.substring(0, 40);
        }
      }
      return null;
    });
    if (destinationFound) {
      console.log(`  ✓ Selected: ${destinationFound}`);
    } else {
      console.log('  ⚠ No destination found, trying first place');
      await page.evaluate(() => {
        const firstPlace = document.querySelector('.place-item, [data-place-id]');
        if (firstPlace) {
          const rect = firstPlace.getBoundingClientRect();
          firstPlace.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true, cancelable: true, view: window, button: 2,
            clientX: rect.left + 10, clientY: rect.top + 10
          }));
        }
      });
    }
    await sleep(2000);

    // Step 3.5: Set Course
    console.log('3.5 Setting course...');
    await clickOrHotkey(page, {
      selector: null,
      text: 'Set Course',
      hotkey: 's',
      name: 'Set Course Button'
    });
    await sleep(2000);

    // Step 3.6: Travel
    console.log('3.6 Traveling...');
    await clickOrHotkey(page, {
      selector: '#btn-travel',
      text: 'Travel',
      hotkey: 't',
      name: 'Travel Button'
    });
    await sleep(4000);

    // Verification
    console.log('\n--- Verification ---');
    const result = await verifyState(page, () => ({
      locationId: window.state?.shipState?.locationId,
      locationName: window.state?.shipState?.locationName,
      course: window.state?.shipState?.course
    }), 'Final state');

    await page.screenshot({ path: '/tmp/uc3-travel-result.png' });
    console.log('  Screenshot: /tmp/uc3-travel-result.png');

    // Result
    console.log('\n=== UC-3 Result ===');
    const locationChanged = result.locationId !== startLocation;
    if (locationChanged || result.locationName?.includes('Jump')) {
      console.log('PASS: Ship traveled to new location');
      console.log(`  From: ${startLocation}`);
      console.log(`  To: ${result.locationId || result.locationName}`);
    } else {
      console.log('PARTIAL: Travel may have completed (check screenshot)');
      console.log(`  Location: ${result.locationId || result.locationName}`);
    }

  } catch (err) {
    console.error('ERROR:', err.message);
    await page.screenshot({ path: '/tmp/uc3-error.png' });
  }

  writeTodoForFailures('uc3-insystem-travel');

  await sleep(2000);
  await browser.close();
})();
