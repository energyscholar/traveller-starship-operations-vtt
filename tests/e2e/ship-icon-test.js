#!/usr/bin/env node
/**
 * Simple Ship Icon Movement Test
 *
 * Joins Solo Demo, travels between a few destinations in Mora,
 * and takes screenshots showing the ship icon position changes.
 */

const { withBrowser, wait } = require('./helpers/browser-with-cleanup');
const path = require('path');
const { fullUrl } = require('./config');

const BASE_URL = fullUrl;
const SCREENSHOT_DIR = path.join(__dirname, '../../Screenshots');

async function joinSoloDemoAsCaptain(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
  await wait(1000);

  // Click Solo Demo button
  const soloClicked = await page.evaluate(() => {
    const btn = document.getElementById('btn-solo-demo');
    if (btn && btn.offsetParent !== null) {
      btn.click();
      return true;
    }
    return false;
  });
  if (!soloClicked) return false;
  await wait(2000);

  // Select Captain role
  await page.evaluate(() => {
    const roleBtn = document.querySelector('[data-role="captain"]') ||
                    document.querySelector('.role-card');
    if (roleBtn) roleBtn.click();
  });
  await wait(500);

  // Join bridge
  await page.evaluate(() => {
    const btn = document.getElementById('btn-join-bridge');
    if (btn && !btn.disabled) btn.click();
  });
  await wait(3000);
  return true;
}

async function getDestinations(page) {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      const socket = window.state?.socket;
      if (!socket?.connected) {
        resolve({ error: 'Socket not connected' });
        return;
      }
      const handler = (data) => {
        socket.off('ops:destinations', handler);
        resolve(data);
      };
      socket.on('ops:destinations', handler);
      socket.emit('ops:getDestinations');
      setTimeout(() => {
        socket.off('ops:destinations', handler);
        resolve({ error: 'Timeout' });
      }, 5000);
    });
  });
}

async function travelTo(page, destId) {
  const result = await page.evaluate((destId) => {
    return new Promise((resolve) => {
      const socket = window.state?.socket;
      if (!socket?.connected) {
        resolve({ error: 'Socket not connected' });
        return;
      }
      const handler = (data) => {
        socket.off('ops:travelComplete', handler);
        resolve({ success: true, data, received: true });
      };
      socket.on('ops:travelComplete', handler);
      socket.emit('ops:travel', { destinationId: destId });
      setTimeout(() => {
        socket.off('ops:travelComplete', handler);
        resolve({ success: true, note: 'timeout - no event received' });
      }, 3000);
    });
  }, destId);

  // Log travel result
  if (result.received) {
    console.log(`     Travel complete: ${result.data?.locationId}`);
  } else if (result.note) {
    console.log(`     ${result.note}`);
  }
  return result;
}

async function getCurrentLocation(page) {
  return page.evaluate(() => {
    const s = window.state || {};
    // Prefer shipState (updated by socket handlers) over ship.current_state (initial load)
    return s.shipState?.locationId ||
           s.ship?.current_state?.locationId ||
           'unknown';
  });
}

async function takeSystemMapScreenshot(page, filename) {
  // Open the System Map overlay
  await page.evaluate(() => {
    if (typeof window.showSystemMap === 'function') {
      window.showSystemMap();
    }
  });
  await wait(800);

  // Click the "Ship" button to center and zoom on ship
  await page.evaluate(() => {
    const shipBtn = document.getElementById('btn-show-ship');
    if (shipBtn) shipBtn.click();
  });
  await wait(500);

  // Zoom in 6 times for better detail (~0.5 AU scale)
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => {
      const zoomIn = document.getElementById('btn-system-zoom-in');
      if (zoomIn) zoomIn.click();
    });
    await wait(150);
  }

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: false
  });
  console.log(`  Screenshot: ${filename}`);

  // Close overlay for next operation
  await page.evaluate(() => {
    const closeBtn = document.getElementById('btn-system-map-close');
    if (closeBtn) closeBtn.click();
  });
  await wait(300);
}

async function run() {
  console.log('=== Ship Icon Movement Test ===\n');

  await withBrowser(async (browser, page) => {
    await page.setViewport({ width: 1400, height: 900 });

    // Join as captain
    console.log('1. Joining Solo Demo as Captain...');
    const joined = await joinSoloDemoAsCaptain(page);
    if (!joined) throw new Error('Failed to join');

    let loc = await getCurrentLocation(page);
    console.log(`   Starting location: ${loc}`);

    // Take initial screenshot
    console.log('\n2. Taking initial screenshot...');
    await takeSystemMapScreenshot(page, 'ship-icon-1-start.png');

    // Get destinations
    const destResult = await getDestinations(page);
    if (destResult.error) throw new Error(destResult.error);

    const destinations = destResult.destinations || [];
    console.log(`   Found ${destinations.length} destinations`);
    // Log actual destination IDs for debugging
    destinations.slice(0, 5).forEach(d => console.log(`     - ${d.id}: ${d.name}`));

    // Debug: Show celestial object IDs in current system
    const celestialIds = await page.evaluate(() => {
      const sys = window.systemMapState?.system;
      if (!sys?.celestialObjects) return 'No celestial objects';
      return sys.celestialObjects.slice(0, 5).map(o => o.id).join(', ');
    });
    console.log(`   Celestial IDs: ${celestialIds}`);

    // Travel to 3 different locations, taking screenshots
    // Use dynamic destinations from the current system
    const toVisit = ['jump_point', 'orbit-3124-mainworld', 'loc-exit-jump'];
    let screenshotNum = 2;

    for (const destId of toVisit) {
      const dest = destinations.find(d => d.id === destId);
      if (!dest) {
        console.log(`   Skipping ${destId} (not found)`);
        continue;
      }

      console.log(`\n${screenshotNum}. Traveling to ${dest.name}...`);
      await travelTo(page, destId);
      await wait(1500); // Wait for map update

      loc = await getCurrentLocation(page);
      console.log(`   Now at: ${loc}`);

      screenshotNum++;
      await takeSystemMapScreenshot(page, `ship-icon-${screenshotNum}-${destId.replace(/[^a-z0-9]/gi, '-')}.png`);
    }

    console.log('\n=== Test Complete ===');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

  }, { timeout: 60000, headed: process.env.HEADED === '1' });
}

run().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
