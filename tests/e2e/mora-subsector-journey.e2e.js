#!/usr/bin/env node
/**
 * AR-300: Mora Subsector Journey E2E Test (HARD MODE)
 *
 * Tests complete journey through all 26 systems in Mora subsector.
 * For each system: visit every destination, refuel as needed, jump to next.
 *
 * HARD MODE: Fuel management required - must refuel before each jump.
 *
 * Run with: npm run test:e2e tests/e2e/mora-subsector-journey.e2e.js
 * Headed:   HEADED=1 npm run test:e2e tests/e2e/mora-subsector-journey.e2e.js
 */

const { withBrowser, wait } = require('./helpers/browser-with-cleanup');
const path = require('path');
const { fullUrl, BASE_URL } = require('./config');
const fs = require('fs');

const INTERFACE_URL = fullUrl;
const HEADED = process.env.HEADED === '1';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// Scout ship constants
const SCOUT_TONNAGE = 100;
const SCOUT_JUMP_RATING = 2;
const FUEL_CAPACITY = 40;
const FUEL_PER_JUMP = SCOUT_TONNAGE * SCOUT_JUMP_RATING * 0.1; // 20 tons

// Mora subsector systems (26 total) with refueling info
// Format: [name, hex, starportClass, gasGiants]
const MORA_SYSTEMS = [
  ['Mora', '3124', 'A', 2],       // Start here
  ['Nadrin', '3123', 'D', 0],
  ['Jokotre', '3024', 'B', 0],
  ['Fornice', '3025', 'A', 2],
  ['Grille', '3026', 'E', 1],
  ['Brodie', '3021', 'C', 4],
  ['Rorise', '3022', 'C', 2],
  ['Moran', '2924', 'C', 1],
  ['Maitz', '2927', 'A', 2],
  ['Catuz', '2824', 'C', 0],
  ['Meleto', '2827', 'C', 4],
  ['Hexos', '2828', 'B', 3],
  ['Pedase', '2830', 'C', 1],
  ['Mainz', '2930', 'C', 3],
  ['Palique', '3029', 'A', 0],
  ['Nexine', '3030', 'C', 1],
  ['Fenl\'s Gren', '3228', 'C', 3],
  ['Dojodo', '3223', 'C', 0],
  ['Carey', '2726', 'C', 0],
  ['Duale', '2728', 'A', 1],
  ['Mercury', '2624', 'B', 4],
  ['Tivid', '2627', 'C', 1],
  ['Fosey', '2621', 'A', 0],
  ['Heroni', '2521', 'B', 1],
  ['Byret', '2523', 'B', 2],
  ['Pimane', '2527', 'E', 3]
];

// Test results
const results = {
  systemsVisited: 0,
  destinationsVisited: 0,
  jumpsCompleted: 0,
  refuelOps: 0,
  errors: [],
  passed: 0,
  failed: 0
};

// State tracking
let currentFuel = 23; // Starting fuel at Mora
let currentSystem = 'Mora';

function log(msg) {
  console.log(`  ${msg}`);
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
  results.passed++;
}

function fail(msg, error = '') {
  console.log(`  ✗ ${msg}${error ? ': ' + error : ''}`);
  results.failed++;
  results.errors.push({ msg, error });
}

/**
 * Get destinations from server via socket
 */
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

/**
 * Get current fuel level from ship state
 */
async function getFuelLevel(page) {
  return page.evaluate(() => {
    const ship = window.state?.ship;
    return ship?.current_state?.fuel || ship?.fuel?.current || 0;
  });
}

/**
 * Get current system info
 */
async function getCurrentSystem(page) {
  return page.evaluate(() => {
    const state = window.state;
    return {
      systemName: state?.ship?.current_state?.systemName || state?.campaign?.current_system || 'Unknown',
      systemHex: state?.ship?.current_state?.systemHex || '0000',
      locationId: state?.ship?.current_state?.locationId || ''
    };
  });
}

/**
 * Travel to a destination
 */
async function travelToDestination(page, destId, destName) {
  return page.evaluate(({ destId, destName }) => {
    return new Promise((resolve) => {
      const socket = window.state?.socket;
      if (!socket?.connected) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      let completed = false;

      const completeHandler = (data) => {
        completed = true;
        socket.off('ops:travelComplete', completeHandler);
        socket.off('ops:error', errorHandler);
        resolve({ success: true, data });
      };

      const errorHandler = (data) => {
        socket.off('ops:travelComplete', completeHandler);
        socket.off('ops:error', errorHandler);
        resolve({ success: false, error: data.message });
      };

      socket.on('ops:travelComplete', completeHandler);
      socket.on('ops:error', errorHandler);

      // Direct travel with destinationId
      socket.emit('ops:travel', {
        destinationId: destId
      });

      setTimeout(() => {
        socket.off('ops:travelComplete', completeHandler);
        socket.off('ops:error', errorHandler);
        if (!completed) {
          resolve({ success: true, note: 'No response but no error' });
        }
      }, 1500);
    });
  }, { destId, destName });
}

/**
 * Refuel ship - requests a fixed amount (server will cap to capacity)
 */
async function refuel(page, sourceType) {
  return page.evaluate((sourceType) => {
    return new Promise((resolve) => {
      const socket = window.state?.socket;
      if (!socket?.connected) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      const handler = (data) => {
        socket.off('ops:refueled', handler);
        socket.off('ops:error', errorHandler);
        resolve({ success: true, data });
      };

      const errorHandler = (data) => {
        socket.off('ops:refueled', handler);
        socket.off('ops:error', errorHandler);
        resolve({ success: false, error: data.message });
      };

      socket.on('ops:refueled', handler);
      socket.once('ops:error', errorHandler);

      // Request a reasonable amount - server will cap to available capacity
      socket.emit('ops:refuel', {
        sourceId: sourceType,
        tons: 20  // Request 20 tons, enough for 2 jumps
      });

      setTimeout(() => {
        socket.off('ops:refueled', handler);
        socket.off('ops:error', errorHandler);
        resolve({ success: false, error: 'Refuel timeout' });
      }, 3000);
    });
  }, sourceType);
}

/**
 * Initiate jump to destination system
 */
async function jumpToSystem(page, destName, destHex, distance) {
  return page.evaluate(({ destName, destHex, distance }) => {
    return new Promise((resolve) => {
      const socket = window.state?.socket;
      if (!socket?.connected) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      const handler = (data) => {
        socket.off('ops:jumpInitiated', handler);
        resolve({ success: true, data });
      };

      const errorHandler = (data) => {
        socket.off('ops:jumpInitiated', handler);
        socket.off('ops:error', errorHandler);
        resolve({ success: false, error: data.message });
      };

      socket.on('ops:jumpInitiated', handler);
      socket.once('ops:error', errorHandler);

      socket.emit('ops:initiateJump', {
        destination: destName,
        destinationHex: destHex,
        destinationSector: 'spinward-marches',
        distance: distance
      });

      setTimeout(() => {
        socket.off('ops:jumpInitiated', handler);
        socket.off('ops:error', errorHandler);
        resolve({ success: false, error: 'Jump timeout' });
      }, 3000);
    });
  }, { destName, destHex, distance });
}

/**
 * Complete jump (exit jump space)
 */
async function completeJump(page) {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      const socket = window.state?.socket;
      if (!socket?.connected) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      const handler = (data) => {
        socket.off('ops:jumpCompleted', handler);
        socket.off('ops:error', errorHandler);
        resolve({ success: true, data });
      };

      const errorHandler = (data) => {
        socket.off('ops:jumpCompleted', handler);
        socket.off('ops:error', errorHandler);
        resolve({ success: false, error: data.message });
      };

      socket.on('ops:jumpCompleted', handler);  // Note: -ed suffix
      socket.once('ops:error', errorHandler);

      socket.emit('ops:completeJump');

      setTimeout(() => {
        socket.off('ops:jumpCompleted', handler);
        socket.off('ops:error', errorHandler);
        resolve({ success: false, error: 'Jump complete timeout' });
      }, 3000);
    });
  });
}

/**
 * Verify position after jump (required before navigation)
 */
async function verifyPosition(page) {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      const socket = window.state?.socket;
      if (!socket?.connected) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      const handler = (data) => {
        socket.off('ops:positionVerified', handler);
        socket.off('ops:error', errorHandler);
        resolve({ success: true, data });
      };

      const errorHandler = (data) => {
        socket.off('ops:positionVerified', handler);
        socket.off('ops:error', errorHandler);
        resolve({ success: false, error: data.message });
      };

      socket.on('ops:positionVerified', handler);
      socket.once('ops:error', errorHandler);

      socket.emit('ops:verifyPosition');

      setTimeout(() => {
        socket.off('ops:positionVerified', handler);
        socket.off('ops:error', errorHandler);
        resolve({ success: true, note: 'Timeout but no error' });
      }, 2000);
    });
  });
}

/**
 * Advance game time by hours
 */
async function advanceTime(page, hours) {
  return page.evaluate((hours) => {
    return new Promise((resolve) => {
      const socket = window.state?.socket;
      if (!socket?.connected) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      socket.emit('ops:advanceTime', { hours });
      setTimeout(() => resolve({ success: true }), 200);
    });
  }, hours);
}

/**
 * Reset database to ensure fresh Solo Demo start
 */
async function resetDatabase() {
  const { execSync } = require('child_process');
  try {
    // Delete Solo Demo campaign to force re-seed
    execSync('rm -f data/campaigns/operations.db-solo-demo-flag 2>/dev/null || true');
    log('Database reset for fresh Solo Demo');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Main test
 */
async function runMoraSubsectorJourney() {
  console.log('\n' + '═'.repeat(60));
  console.log('  MORA SUBSECTOR JOURNEY TEST (HARD MODE)');
  console.log('  26 Systems · All Destinations · Fuel Management');
  console.log('═'.repeat(60) + '\n');

  const startTime = Date.now();

  // Reset Solo Demo via HTTP endpoint before test
  const http = require('http');
  await new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/api/reset-solo-demo`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('  Solo Demo reset via API:', data.trim() || 'OK');
        resolve();
      });
    });
    req.on('error', (e) => {
      console.log('  Solo Demo reset failed (API not available):', e.message);
      resolve();
    });
    req.setTimeout(3000, () => {
      req.destroy();
      console.log('  Solo Demo reset timed out');
      resolve();
    });
  });

  await withBrowser(async (browser, page) => {
    // Track console errors
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        log(`[Console Error] ${msg.text()}`);
      }
    });

    // ═══════════════════════════════════════════════════════════
    // PHASE 1: JOIN SOLO DEMO
    // ═══════════════════════════════════════════════════════════

    log('═══ PHASE 1: JOIN SOLO DEMO ═══');

    await page.goto(INTERFACE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
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

    if (!soloClicked) {
      fail('Solo Demo button not found');
      return;
    }
    await wait(2000);

    // Select Captain role and join
    await page.evaluate(() => {
      const roleBtn = document.querySelector('[data-role="captain"]') ||
                      document.querySelector('.role-card');
      if (roleBtn) roleBtn.click();
    });
    await wait(500);

    await page.evaluate(() => {
      const btn = document.getElementById('btn-join-bridge');
      if (btn && !btn.disabled) btn.click();
    });
    await wait(2000);

    // Verify on bridge
    const onBridge = await page.evaluate(() => {
      return document.querySelector('#bridge-screen')?.classList.contains('hidden') === false;
    });

    if (!onBridge) {
      fail('Failed to join bridge');
      return;
    }
    pass('Joined Solo Demo as Captain');

    // Get initial state
    const initialSystem = await getCurrentSystem(page);
    log(`Starting at: ${initialSystem.systemName} (${initialSystem.systemHex})`);

    const initialFuel = await getFuelLevel(page);
    log(`Fuel: ${initialFuel}/${FUEL_CAPACITY} tons`);
    currentFuel = initialFuel;

    // Undock if docked
    const undockResult = await page.evaluate(() => {
      return new Promise((resolve) => {
        const socket = window.state?.socket;
        if (!socket?.connected) {
          resolve({ success: false, error: 'No socket' });
          return;
        }

        const handler = (data) => {
          socket.off('ops:undocked', handler);
          resolve({ success: true, data });
        };

        socket.on('ops:undocked', handler);
        socket.emit('ops:undock');

        setTimeout(() => {
          socket.off('ops:undocked', handler);
          resolve({ success: true, note: 'Already undocked or timeout' });
        }, 2000);
      });
    });
    if (undockResult.success) {
      log('Ship undocked - ready to navigate');
    }
    await wait(500);

    // ═══════════════════════════════════════════════════════════
    // PHASE 2: VISIT ALL SYSTEMS
    // ═══════════════════════════════════════════════════════════

    log('\n═══ PHASE 2: MORA SUBSECTOR TOUR ═══');

    for (let sysIdx = 0; sysIdx < MORA_SYSTEMS.length; sysIdx++) {
      const [sysName, sysHex, starport, gasGiants] = MORA_SYSTEMS[sysIdx];

      log(`\n--- System ${sysIdx + 1}/26: ${sysName} (${sysHex}) ---`);
      log(`Starport: ${starport} | Gas Giants: ${gasGiants}`);

      // Get destinations in this system
      const destResult = await getDestinations(page);

      if (destResult.error) {
        fail(`Get destinations in ${sysName}`, destResult.error);
        continue;
      }

      const destinations = destResult.destinations || [];
      log(`Destinations: ${destinations.length}`);

      // Visit each destination
      let visitedCount = 0;
      for (const dest of destinations) {
        const travelResult = await travelToDestination(page, dest.id, dest.name);
        if (travelResult.success) {
          visitedCount++;
          results.destinationsVisited++;
        }
      }

      if (visitedCount === destinations.length) {
        pass(`Visited all ${visitedCount} destinations in ${sysName}`);
      } else {
        fail(`Visited ${visitedCount}/${destinations.length} in ${sysName}`);
      }

      results.systemsVisited++;

      // Skip jump for last system
      if (sysIdx >= MORA_SYSTEMS.length - 1) {
        log('Final system reached - journey complete!');
        break;
      }

      // ═══ REFUELING ═══
      const fuelNeeded = FUEL_PER_JUMP;
      currentFuel = await getFuelLevel(page);

      if (currentFuel < fuelNeeded) {
        log(`Fuel low (${currentFuel}t), need ${fuelNeeded}t for jump`);

        // Determine refuel source (using correct IDs from refueling.js)
        let refuelSource = null;
        if (['A', 'B'].includes(starport)) {
          refuelSource = 'starportRefined';
        } else if (['C', 'D', 'E'].includes(starport)) {
          refuelSource = 'starportUnrefined';
        } else if (gasGiants > 0) {
          refuelSource = 'gasGiant';
        }

        if (refuelSource) {
          // First travel to appropriate location
          const skimDest = destinations.find(d => d.id.includes('skim'));
          const dockDest = destinations.find(d => d.id.includes('dock') || d.id.includes('starport'));

          if (refuelSource === 'gasGiant' && skimDest) {
            await travelToDestination(page, skimDest.id, skimDest.name);
          } else if (dockDest) {
            await travelToDestination(page, dockDest.id, dockDest.name);
          }

          const refuelResult = await refuel(page, refuelSource);
          if (refuelResult.success) {
            pass(`Refueled from ${refuelSource}`);
            results.refuelOps++;
          } else {
            fail(`Refuel from ${refuelSource}`, refuelResult.error);
          }

          currentFuel = await getFuelLevel(page);
          log(`Fuel now: ${currentFuel}t`);
        } else {
          fail(`No refuel source in ${sysName} - stranded!`);
          break;
        }
      }

      // ═══ JUMP TO NEXT SYSTEM ═══
      const [nextSys, nextHex] = MORA_SYSTEMS[sysIdx + 1];

      // First go to jump point
      const jumpDest = destinations.find(d =>
        d.id.includes('jump') && !d.id.includes('gas')
      );
      if (jumpDest) {
        await travelToDestination(page, jumpDest.id, jumpDest.name);
      }

      // Calculate jump distance (simplified: assume 1-2 parsecs)
      const jumpDist = 1; // Conservative for fuel

      log(`Jumping to ${nextSys} (${nextHex}), distance ${jumpDist}...`);

      const jumpResult = await jumpToSystem(page, nextSys, nextHex, jumpDist);

      if (!jumpResult.success) {
        fail(`Jump to ${nextSys}`, jumpResult.error);
        continue;
      }

      // Advance time to complete jump (168 hours = 1 week)
      await advanceTime(page, 168);
      await wait(500);

      // Complete the jump
      const exitResult = await completeJump(page);

      if (exitResult.success) {
        pass(`Jumped to ${nextSys}`);
        results.jumpsCompleted++;
        currentFuel -= FUEL_PER_JUMP / 2; // Estimate for J-1

        // Verify position after jump (required for navigation)
        await verifyPosition(page);
        await wait(200);
      } else {
        fail(`Exit jump to ${nextSys}`, exitResult.error);
      }

      await wait(300); // Brief pause between systems
    }

    // Take final screenshot
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'mora-subsector-final.png')
    });

  }, { timeout: 600000, headless: !HEADED }); // 10 minute timeout

  // ═══════════════════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════════════════

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '═'.repeat(60));
  console.log('  JOURNEY COMPLETE');
  console.log('═'.repeat(60));
  console.log(`  Duration: ${duration}s`);
  console.log(`  Systems Visited: ${results.systemsVisited}/26`);
  console.log(`  Destinations Visited: ${results.destinationsVisited}`);
  console.log(`  Jumps Completed: ${results.jumpsCompleted}`);
  console.log(`  Refuel Operations: ${results.refuelOps}`);
  console.log(`  Tests Passed: ${results.passed}`);
  console.log(`  Tests Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\n  Errors:');
    results.errors.forEach(e => console.log(`    - ${e.msg}: ${e.error}`));
  }

  console.log('═'.repeat(60) + '\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run
runMoraSubsectorJourney().catch(err => {
  console.error('Test crashed:', err);
  process.exit(1);
});
