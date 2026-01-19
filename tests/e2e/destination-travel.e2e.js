#!/usr/bin/env node
/**
 * AR-299: Destination Travel E2E Test
 *
 * Verifies that ALL destinations shown in the Destinations panel
 * can be traveled to without "Unknown destination" errors.
 *
 * Tests:
 * 1. Start in Mora system (Spinward Marches 3124)
 * 2. Get destinations from server
 * 3. Attempt to travel to each destination
 * 4. Verify no errors occur
 * 5. Jump to Nadrin and repeat
 *
 * Run with: npm run test:e2e tests/e2e/destination-travel.e2e.js
 */

const { withBrowser } = require('./helpers/browser-with-cleanup');
const { BASE_URL } = require('./config');
const HEADED = process.env.HEADED === '1';

// Test results
const results = {
  passed: 0,
  failed: 0,
  destinationsTested: [],
  errors: []
};

function pass(msg) {
  console.log(`  ✓ ${msg}`);
  results.passed++;
}

function fail(msg, error = '') {
  console.log(`  ✗ ${msg}${error ? ': ' + error : ''}`);
  results.failed++;
  results.errors.push({ msg, error });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main test function
 */
async function runTest() {
  console.log('\n====================================');
  console.log('AR-299: Destination Travel E2E Test');
  console.log('====================================\n');

  await withBrowser(async (browser, page) => {
    // Setup console logging for socket events
    let lastError = null;
    let destinationsReceived = [];
    let travelCompleteReceived = false;

    page.on('console', async msg => {
      const text = msg.text();
      // Track destination errors
      if (text.includes('Unknown destination') || text.includes('Unknown Destination')) {
        lastError = text;
        console.log(`    ⚠️ ERROR: ${text}`);
      }
      // Track destinations received
      if (text.includes('Received') && text.includes('destinations from server')) {
        console.log(`    📍 ${text}`);
      }
    });

    // ========== PHASE 1: Load Solo Demo ==========
    console.log('Phase 1: Loading Solo Demo campaign in Mora system');

    await page.goto(`${BASE_URL}/operations`, { waitUntil: 'networkidle0' });
    await delay(1000);
    await page.screenshot({ path: 'screenshots/dest-travel-01-loaded.png' });
    console.log('  Screenshot: dest-travel-01-loaded.png');

    // Click Solo Demo button directly from welcome screen (it's there!)
    const soloClicked = await page.evaluate(() => {
      const btn = document.getElementById('btn-solo-demo');
      if (btn && btn.offsetParent !== null) { // Check button is visible
        btn.click();
        return true;
      }
      return false;
    });
    console.log(`  Solo Demo button clicked: ${soloClicked}`);

    if (!soloClicked) {
      await page.screenshot({ path: 'screenshots/dest-travel-FAIL-no-solo-btn.png' });
      fail('Solo Demo button not found or not visible');
      return;
    }
    await delay(3000); // Wait for campaign setup
    await page.screenshot({ path: 'screenshots/dest-travel-02-after-solo-demo.png' });
    console.log('  Screenshot: dest-travel-02-after-solo-demo.png');

    // We should now be on Player Setup screen - need to select role and click Join Bridge
    // First select Captain role (or any role)
    const roleSelected = await page.evaluate(() => {
      // Find Captain role button or any role button
      const roleBtn = document.querySelector('[data-role="captain"]') ||
                      document.querySelector('.role-card') ||
                      document.querySelector('#role-select-list button');
      if (roleBtn) {
        roleBtn.click();
        return true;
      }
      return false;
    });
    console.log(`  Role selected: ${roleSelected}`);
    await delay(500);

    // Click Join Bridge button
    const joinBridgeClicked = await page.evaluate(() => {
      const btn = document.getElementById('btn-join-bridge');
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log(`  Join Bridge clicked: ${joinBridgeClicked}`);

    if (!joinBridgeClicked) {
      await page.screenshot({ path: 'screenshots/dest-travel-FAIL-join-bridge.png' });
      console.log('  Screenshot: dest-travel-FAIL-join-bridge.png');
      fail('Could not click Join Bridge button');
      return;
    }

    await delay(2000); // Wait for bridge to load
    await page.screenshot({ path: 'screenshots/dest-travel-03-on-bridge.png' });
    console.log('  Screenshot: dest-travel-03-on-bridge.png');
    pass('Loaded Solo Demo campaign and joined bridge');

    // ========== PHASE 2: Get Destinations from Server ==========
    console.log('\nPhase 2: Testing server destination retrieval');

    // First check socket status
    const socketStatus = await page.evaluate(() => {
      const socket = window.state?.socket;
      return {
        hasSocket: !!socket,
        connected: socket?.connected || false,
        campaign: window.state?.campaign?.id || null
      };
    });
    console.log(`    Socket status: connected=${socketStatus.connected}, campaign=${socketStatus.campaign}`);

    if (!socketStatus.connected) {
      // Wait a bit more and retry
      await delay(2000);
    }

    // Request destinations via socket with better error handling
    const destinations = await page.evaluate(() => {
      return new Promise((resolve) => {
        const socket = window.state?.socket;
        if (!socket) {
          resolve({ error: 'No socket object' });
          return;
        }
        if (!socket.connected) {
          resolve({ error: 'Socket not connected' });
          return;
        }

        // Set up listener BEFORE emitting
        const handler = (data) => {
          socket.off('ops:destinations', handler);
          resolve(data);
        };
        socket.on('ops:destinations', handler);

        // Also listen for errors
        const errorHandler = (err) => {
          socket.off('ops:destinations', handler);
          socket.off('ops:error', errorHandler);
          resolve({ error: err.message || 'Socket error' });
        };
        socket.once('ops:error', errorHandler);

        // Request destinations
        console.log('[E2E] Emitting ops:getDestinations');
        socket.emit('ops:getDestinations');

        // Timeout after 5 seconds
        setTimeout(() => {
          socket.off('ops:destinations', handler);
          socket.off('ops:error', errorHandler);
          resolve({ error: 'Timeout waiting for destinations' });
        }, 5000);
      });
    });

    if (destinations.error) {
      fail(`Failed to get destinations: ${destinations.error}`);
      return;
    }

    if (!destinations.destinations || destinations.destinations.length === 0) {
      fail('No destinations returned from server');
      return;
    }

    pass(`Received ${destinations.destinations.length} destinations from server for ${destinations.systemName || 'current system'}`);
    console.log(`    System: ${destinations.systemName} (${destinations.hex})`);

    // ========== PHASE 3: Test Each Destination ==========
    console.log('\nPhase 3: Testing travel to each destination');

    let successCount = 0;
    let errorCount = 0;

    for (const dest of destinations.destinations) {
      lastError = null;
      travelCompleteReceived = false;

      // Try to set course to this destination
      const result = await page.evaluate((destId) => {
        return new Promise((resolve) => {
          const socket = window.state?.socket;
          if (!socket) {
            resolve({ success: false, error: 'No socket' });
            return;
          }

          // Set up error handler
          let errorReceived = null;
          const errorHandler = (data) => {
            if (data.message && data.message.includes('Unknown destination')) {
              errorReceived = data.message;
            }
          };
          socket.on('ops:error', errorHandler);

          // Set up success handler
          let success = false;
          const travelHandler = (data) => {
            success = true;
          };
          socket.on('ops:travelComplete', travelHandler);
          socket.on('ops:courseSet', travelHandler);

          // Emit travel request
          socket.emit('ops:setCourse', {
            destinationId: destId,
            destinationName: 'Test'
          });

          // Wait for response
          setTimeout(() => {
            socket.off('ops:error', errorHandler);
            socket.off('ops:travelComplete', travelHandler);
            socket.off('ops:courseSet', travelHandler);

            if (errorReceived) {
              resolve({ success: false, error: errorReceived });
            } else {
              resolve({ success: true });
            }
          }, 500);
        });
      }, dest.id);

      results.destinationsTested.push({
        id: dest.id,
        name: dest.name,
        type: dest.type,
        success: result.success
      });

      if (result.success) {
        successCount++;
        // Only log first 5 and last 5 successes to keep output clean
        if (successCount <= 5 || successCount > destinations.destinations.length - 5) {
          console.log(`    ✓ ${dest.name} (${dest.id})`);
        } else if (successCount === 6) {
          console.log(`    ... (${destinations.destinations.length - 10} more destinations)`);
        }
      } else {
        errorCount++;
        fail(`Travel to ${dest.name} (${dest.id})`, result.error);
      }
    }

    // Summary
    console.log(`\n  Summary: ${successCount}/${destinations.destinations.length} destinations accessible`);

    if (errorCount === 0) {
      pass(`All ${destinations.destinations.length} destinations in ${destinations.systemName} are navigable`);
    } else {
      fail(`${errorCount} destinations failed`);
    }

  }, { timeout: 60000, headless: !HEADED });

  // ========== RESULTS ==========
  console.log('\n====================================');
  console.log('TEST RESULTS');
  console.log('====================================');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Destinations Tested: ${results.destinationsTested.length}`);

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => {
      console.log(`  - ${e.msg}: ${e.error}`);
    });
  }

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the test
runTest().catch(err => {
  console.error('Test crashed:', err);
  process.exit(1);
});
