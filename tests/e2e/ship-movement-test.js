/**
 * E2E Test: Verify ship icon moves on System Map when traveling
 *
 * 1. Join Solo Demo as Captain
 * 2. Screenshot initial position
 * 3. Travel to a different location
 * 4. Screenshot new position
 * 5. Compare screenshots
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');
const path = require('path');

const BASE_URL = fullUrl;
const SCREENSHOT_DIR = path.join(__dirname, '../../Screenshots');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('=== Ship Movement E2E Test ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // 1. Load page and join Solo Demo
    console.log('1. Loading Operations page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    await sleep(1000);

    // Click Solo Demo button
    console.log('2. Joining Solo Demo...');
    const soloClicked = await page.evaluate(() => {
      const btn = document.getElementById('btn-solo-demo');
      if (btn && btn.offsetParent !== null) {
        btn.click();
        return true;
      }
      return false;
    });
    if (!soloClicked) throw new Error('Solo Demo button not found');
    await sleep(2000);

    // Select Captain role
    console.log('3. Selecting Captain role...');
    await page.evaluate(() => {
      const roleBtn = document.querySelector('[data-role="captain"]') ||
                      document.querySelector('.role-card');
      if (roleBtn) roleBtn.click();
    });
    await sleep(500);

    // Click Join Bridge
    console.log('4. Joining bridge...');
    await page.evaluate(() => {
      const btn = document.getElementById('btn-join-bridge');
      if (btn && !btn.disabled) btn.click();
    });
    await sleep(3000); // Longer wait for bridge to fully load

    // Check state - debug both sources
    const stateInfo = await page.evaluate(() => {
      const s = window.state || {};
      return {
        hasSocket: !!s.socket,
        socketConnected: s.socket?.connected,
        hasShip: !!s.ship,
        shipStateLocId: s.shipState?.locationId,
        currentStateLocId: s.ship?.current_state?.locationId,
        systemName: s.ship?.current_state?.systemName || s.campaign?.current_system
      };
    });
    console.log(`   State: shipState.locationId=${stateInfo.shipStateLocId}, ship.current_state.locationId=${stateInfo.currentStateLocId}`);

    // Use shipState as primary (updated by socket handlers)
    const initialLocation = stateInfo.shipStateLocId || stateInfo.currentStateLocId || 'docked';
    console.log(`   Current location: ${initialLocation}`);

    // 5. Take initial screenshot
    console.log('5. Taking initial screenshot...');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'ship-movement-1-initial.png'),
      fullPage: false
    });

    // 6. Get destinations via socket
    console.log('6. Getting destinations via socket...');
    const destResult = await page.evaluate(() => {
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

    if (destResult.error) {
      throw new Error(`Failed to get destinations: ${destResult.error}`);
    }

    const destinations = destResult.destinations || [];
    console.log(`   Found ${destinations.length} destinations`);

    if (destinations.length === 0) {
      throw new Error('No destinations available');
    }

    // Pick a destination different from current
    const dest = destinations.find(d => d.id !== initialLocation) || destinations[0];
    console.log(`   Traveling to: ${dest.name} (${dest.id})`);

    // 7. Travel to destination (ops:travel event with destinationId)
    console.log('7. Initiating travel...');
    const travelResult = await page.evaluate((destId) => {
      return new Promise((resolve) => {
        const socket = window.state?.socket;
        if (!socket?.connected) {
          resolve({ error: 'Socket not connected' });
          return;
        }
        const handler = (data) => {
          socket.off('ops:travelComplete', handler);
          resolve({ success: true, data });
        };
        socket.on('ops:travelComplete', handler);
        socket.emit('ops:travel', { destinationId: destId });
        setTimeout(() => {
          socket.off('ops:travelComplete', handler);
          resolve({ error: 'Timeout' });
        }, 10000);
      });
    }, dest.id);

    if (travelResult.error) {
      console.log(`   Travel result: ${travelResult.error}`);
    } else {
      console.log(`   Travel complete! New locationId: ${travelResult.data?.locationId}`);
    }
    await sleep(2000); // Wait for UI update and state sync

    // 8. Take screenshot after travel
    console.log('8. Taking post-travel screenshot...');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'ship-movement-2-after-travel.png'),
      fullPage: false
    });

    // Get new location - debug both state sources
    const newLocationDebug = await page.evaluate(() => {
      const s = window.state || {};
      return {
        shipState: s.shipState?.locationId,
        currentState: s.ship?.current_state?.locationId
      };
    });
    console.log(`   State debug: shipState=${newLocationDebug.shipState}, currentState=${newLocationDebug.currentState}`);
    const newLocation = newLocationDebug.shipState || newLocationDebug.currentState || 'unknown';
    console.log(`   New location: ${newLocation}`);

    // 9. Verify location changed
    console.log('\n=== RESULTS ===');
    if (initialLocation !== newLocation) {
      console.log(`✓ Ship moved from "${initialLocation}" to "${newLocation}"`);
      console.log('✓ Screenshots saved to Screenshots/ directory');
      console.log('\nCompare:');
      console.log('  - ship-movement-1-initial.png');
      console.log('  - ship-movement-2-after-travel.png');
    } else {
      console.log(`✗ Ship did NOT move - still at "${initialLocation}"`);
    }

  } catch (err) {
    console.error('\n✗ Test failed:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }

  console.log('\n=== Test Complete ===');
}

runTest();
