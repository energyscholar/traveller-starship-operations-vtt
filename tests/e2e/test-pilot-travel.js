#!/usr/bin/env node
/**
 * E2E Test: Pilot In-System Travel
 *
 * Part of the Multi-Stage Jump Use Case:
 * 1. Ship starts docked at Flammarion Highport
 * 2. Pilot undocks and travels to Mainworld Jump Point
 * 3. Astrogator initiates jump to next system (separate test)
 * 4. On arrival, pilot travels from jump exit to destination
 *
 * This test covers step 1-2: Pilot undocks and travels to jump point
 *
 * Campaign: DFFFC87E (seeded test campaign)
 * Starting location: Flammarion Highport (loc-dock-highport)
 * Destination: Mainworld Jump Point (loc-mainworld-jump)
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');

const CAMPAIGN_CODE = 'DFFFC87E';
const PLAYER_SLOT = 'Von Sydo'; // Second slot for pilot

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1400,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('=== Pilot In-System Travel Test ===');
  console.log('Use Case: Undock from Highport → Travel to Jump Point\n');

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

  // Step 5: Select Von Sydo slot (second player slot)
  console.log('5. Selecting player slot:', PLAYER_SLOT);
  const slotSelected = await page.evaluate((slotName) => {
    const btns = Array.from(document.querySelectorAll('button'));
    // Find Join button next to Von Sydo
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
    // Fallback: click second Join button
    const joinBtns = btns.filter(b => b.textContent.trim() === 'Join');
    if (joinBtns.length > 1) {
      joinBtns[1].click();
      return 'second-slot';
    }
    return null;
  }, PLAYER_SLOT);
  console.log('   Slot selected:', slotSelected);
  await new Promise(r => setTimeout(r, 2000));

  // Step 6: Select Pilot role
  console.log('6. Selecting Pilot role...');
  const roleResult = await page.evaluate(() => {
    const pilotCard = document.querySelector('[data-role-id="pilot"]');
    if (pilotCard) {
      pilotCard.click();
      return { found: true, taken: pilotCard.classList.contains('taken') };
    }
    return { found: false };
  });
  console.log('   Role card:', roleResult);
  await new Promise(r => setTimeout(r, 1000));

  // Step 7: Click Join Bridge
  console.log('7. Joining bridge as Pilot...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const joinBtn = btns.find(b => b.textContent.includes('Join Bridge'));
    if (joinBtn) joinBtn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  // Step 8: Check current location
  console.log('8. Checking current location...');
  const locationInfo = await page.evaluate(() => {
    // Look for location info in pilot panel or ship status
    const locationEl = document.querySelector('.current-location, [data-location]');
    const shipState = window.state?.shipState || {};
    return {
      locationId: shipState.locationId,
      docked: shipState.docked,
      systemName: window.state?.campaign?.current_system
    };
  });
  console.log('   Location:', locationInfo);

  // Take screenshot of pilot view
  await page.screenshot({ path: '/tmp/pilot-test-1.png', fullPage: false });
  console.log('   Screenshot saved: /tmp/pilot-test-1.png');

  // Handle confirm dialogs throughout
  page.on('dialog', async dialog => {
    console.log('    Dialog:', dialog.message());
    await dialog.accept();
  });

  // Step 9: Open hamburger menu
  console.log('9. Opening hamburger menu...');
  await page.evaluate(() => {
    const menuBtn = document.querySelector('.hamburger-btn, #hamburger-btn, [title*="menu"]') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent === '☰');
    if (menuBtn) menuBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: '/tmp/pilot-test-2.png', fullPage: false });

  // Step 10: Click "Star System" in menu
  console.log('10. Clicking Star System in menu...');
  const menuResult = await page.evaluate(() => {
    const menuItems = document.querySelectorAll('.menu-item, .sidebar-item, a, button');
    for (const item of menuItems) {
      if (item.textContent.includes('Star System') || item.textContent.includes('System Map')) {
        item.click();
        return item.textContent.trim();
      }
    }
    return 'not found';
  });
  console.log('    Clicked:', menuResult);
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/tmp/pilot-test-3.png', fullPage: false });

  // Step 11: Press 'P' hotkey to open Places panel
  console.log('11. Pressing P hotkey to open Places...');
  await page.keyboard.press('p');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/pilot-test-4.png', fullPage: false });

  // Step 12: List places in the panel
  console.log('12. Finding destinations in Places panel...');
  const placesInfo = await page.evaluate(() => {
    // Look for places panel/overlay content
    const placeItems = document.querySelectorAll('.place-item, .places-list li, [data-place-id], .destination-item');
    return Array.from(placeItems).map(p => ({
      id: p.dataset?.placeId || p.dataset?.locationId || p.id,
      text: p.textContent?.trim().substring(0, 50)
    }));
  });
  console.log('    Places found:', JSON.stringify(placesInfo.slice(0, 6)));

  // Step 13: RIGHT-CLICK on "Orbit - Flammarion" to open destination panel
  console.log('13. Right-clicking Orbit - Flammarion to open destination panel...');
  const rightClickResult = await page.evaluate(() => {
    const items = document.querySelectorAll('.place-item, [data-place-id]');
    for (const item of items) {
      const text = item.textContent || '';
      if (text.includes('Orbit - Flammarion')) {
        // Dispatch right-click (contextmenu) event
        const rect = item.getBoundingClientRect();
        const event = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 2,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        });
        item.dispatchEvent(event);
        return 'right-clicked: Orbit - Flammarion';
      }
    }
    return 'Orbit - Flammarion not found';
  });
  console.log('    Result:', rightClickResult);
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/tmp/pilot-test-5.png', fullPage: false });

  // Step 14: Check what panel opened - should show Set Course and Travel buttons
  console.log('14. Checking destination panel...');
  const panelInfo = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const setCourseBtn = btns.find(b => b.textContent?.includes('Set Course'));
    const travelBtn = btns.find(b => b.textContent?.trim() === 'Travel');
    return {
      setCourseFound: !!setCourseBtn,
      setCourseDisabled: setCourseBtn?.disabled,
      travelFound: !!travelBtn,
      travelDisabled: travelBtn?.disabled
    };
  });
  console.log('    Panel buttons:', panelInfo);

  // Step 15: Press 'S' hotkey to Set Course
  console.log('15. Pressing S hotkey to Set Course...');
  await page.keyboard.press('s');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/tmp/pilot-test-6.png', fullPage: false });

  // Step 16: Check Travel button is now active
  console.log('16. Checking if Travel button is now active...');
  const travelState = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const travelBtn = btns.find(b => b.textContent?.trim() === 'Travel');
    if (travelBtn) {
      return {
        found: true,
        disabled: travelBtn.disabled,
        className: travelBtn.className
      };
    }
    return { found: false };
  });
  console.log('    Travel button state:', travelState);

  // Step 17: Press 'T' hotkey to Travel
  console.log('17. Pressing T hotkey to Travel...');
  await page.keyboard.press('t');
  console.log('    Pressed T - should be traveling now');
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: '/tmp/pilot-test-7.png', fullPage: false });

  // Step 18: Verify new location
  console.log('18. Verifying new location...');
  const newLocation = await page.evaluate(() => {
    const shipState = window.state?.shipState || {};
    // Also check header bar for location
    const headerLocation = document.querySelector('.header-location, [class*="location"]');
    return {
      locationId: shipState.locationId,
      locationName: shipState.locationName || shipState.location,
      headerText: headerLocation?.textContent?.trim()
    };
  });
  console.log('    New location:', newLocation);

  // Final screenshot
  await page.screenshot({ path: '/tmp/pilot-test-8.png', fullPage: false });
  console.log('    Screenshot saved: /tmp/pilot-test-8.png');

  console.log('\n=== Pilot Travel Test Complete ===');
  console.log('Ship should now be at jump point, ready for Astrogator to initiate jump.');

  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
})();
