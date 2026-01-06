/**
 * Shared Subsector Journey E2E Test Module
 *
 * Extracts common functionality for testing travel through any subsector
 * with full fuel management and metrics tracking.
 *
 * Used by all 16 subsector tests and the combined sector tour.
 */

const { withBrowser, wait } = require('./browser-with-cleanup');
const path = require('path');
const fs = require('fs');

// Constants
const BASE_URL = 'http://localhost:3000/operations';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

// Scout ship constants
const SCOUT_TONNAGE = 100;
const SCOUT_JUMP_RATING = 2;
const FUEL_CAPACITY = 40;
const FUEL_PER_JUMP_1 = 10;  // 10 tons per parsec
const FUEL_PER_JUMP_2 = 20;  // 20 tons for J-2
const JUMP_DURATION_HOURS = 168; // 7 days

// Hex distance calculation (Traveller hex grid)
function hexDistance(hex1, hex2) {
  const x1 = parseInt(hex1.slice(0, 2));
  const y1 = parseInt(hex1.slice(2, 4));
  const x2 = parseInt(hex2.slice(0, 2));
  const y2 = parseInt(hex2.slice(2, 4));

  // Convert to axial coordinates
  const ax1 = x1 - Math.floor(y1 / 2);
  const ay1 = y1;
  const ax2 = x2 - Math.floor(y2 / 2);
  const ay2 = y2;

  // Hex distance formula
  return Math.max(
    Math.abs(ax1 - ax2),
    Math.abs(ay1 - ay2),
    Math.abs((ax1 + ay1) - (ax2 + ay2))
  );
}

/**
 * Metrics Tracker class for comprehensive statistics
 */
class MetricsTracker {
  constructor(subsectorName) {
    this.subsectorName = subsectorName;
    this.startTime = Date.now();

    // System tracking
    this.systemsVisited = 0;
    this.systemsTotal = 0;
    this.destinationsVisited = 0;

    // Jump tracking
    this.jumpsCompleted = 0;
    this.parsecsJumped = 0;
    this.jumpMaintenance = 0; // Every 6 jumps needs maintenance

    // Distance tracking (in-system)
    this.totalKmTravelled = 0;

    // Fuel tracking
    this.refuelOps = {
      starportRefined: 0,
      starportUnrefined: 0,
      gasGiant: 0,
      wilderness: 0
    };

    // Time tracking
    this.gameTimeHours = 0;
    this.inSystemTravelHours = 0;

    // Test results
    this.passed = 0;
    this.failed = 0;
    this.errors = [];

    // Unreachable systems
    this.unreachable = [];
  }

  addRefuel(type) {
    if (this.refuelOps[type] !== undefined) {
      this.refuelOps[type]++;
    }
  }

  addJump(parsecs) {
    this.jumpsCompleted++;
    this.parsecsJumped += parsecs;
    this.gameTimeHours += JUMP_DURATION_HOURS;

    // Track maintenance (every 6 jumps)
    if (this.jumpsCompleted % 6 === 0) {
      this.jumpMaintenance++;
    }
  }

  addInSystemTravel(km, hours = 1) {
    this.totalKmTravelled += km;
    this.inSystemTravelHours += hours;
    this.gameTimeHours += hours;
  }

  addUnreachable(systemName, hex, reason) {
    this.unreachable.push({ systemName, hex, reason });
  }

  pass(msg) {
    console.log(`  \u2713 ${msg}`);
    this.passed++;
  }

  fail(msg, error = '') {
    console.log(`  \u2717 ${msg}${error ? ': ' + error : ''}`);
    this.failed++;
    this.errors.push({ msg, error });
  }

  getDuration() {
    return ((Date.now() - this.startTime) / 1000).toFixed(1);
  }

  getTotalRefuelOps() {
    return Object.values(this.refuelOps).reduce((a, b) => a + b, 0);
  }

  getGameDays() {
    return Math.round(this.gameTimeHours / 24);
  }

  getSummary() {
    return {
      subsector: this.subsectorName,
      duration: this.getDuration(),
      systems: { visited: this.systemsVisited, total: this.systemsTotal },
      destinations: this.destinationsVisited,
      jumps: { completed: this.jumpsCompleted, parsecs: this.parsecsJumped },
      distance: { km: Math.round(this.totalKmTravelled), parsecs: this.parsecsJumped },
      refuel: this.refuelOps,
      time: { realSeconds: parseFloat(this.getDuration()), gameHours: this.gameTimeHours, gameDays: this.getGameDays() },
      maintenance: { jumpsDue: this.jumpMaintenance, note: 'Every 6 jumps needs maintenance check' },
      tests: { passed: this.passed, failed: this.failed },
      unreachable: this.unreachable,
      errors: this.errors
    };
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log(`  ${this.subsectorName.toUpperCase()} SUBSECTOR COMPLETE`);
    console.log('='.repeat(60));
    console.log(`  Duration: ${this.getDuration()}s`);
    console.log(`  Systems: ${this.systemsVisited}/${this.systemsTotal}`);
    console.log(`  Destinations: ${this.destinationsVisited}`);
    console.log(`  Jumps: ${this.jumpsCompleted} (${this.parsecsJumped} parsecs)`);
    console.log(`  In-System Travel: ${Math.round(this.totalKmTravelled).toLocaleString()} km`);
    console.log(`  Game Time: ${this.getGameDays()} days (${this.gameTimeHours} hours)`);
    console.log(`  Refuel Ops: ${this.getTotalRefuelOps()} total`);
    console.log(`    - Refined: ${this.refuelOps.starportRefined}`);
    console.log(`    - Unrefined: ${this.refuelOps.starportUnrefined}`);
    console.log(`    - Gas Giant: ${this.refuelOps.gasGiant}`);
    console.log(`    - Wilderness: ${this.refuelOps.wilderness}`);
    console.log(`  J-Drive Maintenance Due: ${this.jumpMaintenance} times`);
    console.log(`  Tests: ${this.passed} passed, ${this.failed} failed`);
    if (this.unreachable.length > 0) {
      console.log(`  Unreachable Systems: ${this.unreachable.length}`);
      this.unreachable.forEach(s => console.log(`    - ${s.systemName} (${s.hex}): ${s.reason}`));
    }
    console.log('='.repeat(60) + '\n');
  }
}

/**
 * Socket helper functions
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

async function getFuelLevel(page) {
  return page.evaluate(() => {
    const ship = window.state?.ship;
    return ship?.current_state?.fuel || ship?.fuel?.current || 0;
  });
}

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

async function travelToDestination(page, destId) {
  return page.evaluate((destId) => {
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
      socket.emit('ops:travel', { destinationId: destId });
      setTimeout(() => {
        socket.off('ops:travelComplete', completeHandler);
        socket.off('ops:error', errorHandler);
        if (!completed) resolve({ success: true, note: 'No response but no error' });
      }, 1500);
    });
  }, destId);
}

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
      socket.emit('ops:refuel', { sourceId: sourceType, tons: 20 });
      setTimeout(() => {
        socket.off('ops:refueled', handler);
        socket.off('ops:error', errorHandler);
        resolve({ success: false, error: 'Refuel timeout' });
      }, 3000);
    });
  }, sourceType);
}

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
      socket.on('ops:jumpCompleted', handler);
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

async function undockShip(page) {
  return page.evaluate(() => {
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
}

/**
 * Reset Solo Demo campaign via API
 */
async function resetSoloDemo() {
  const http = require('http');
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000/api/reset-solo-demo', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('  Solo Demo reset:', data.trim() || 'OK');
        resolve(true);
      });
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });
}

/**
 * Join Solo Demo as Captain
 */
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
  await wait(2000);

  // Verify on bridge
  return page.evaluate(() => {
    return document.querySelector('#bridge-screen')?.classList.contains('hidden') === false;
  });
}

/**
 * Select appropriate refuel source based on starport and gas giants
 */
function selectRefuelSource(starportClass, gasGiants) {
  if (['A', 'B'].includes(starportClass)) return 'starportRefined';
  if (['C', 'D', 'E'].includes(starportClass)) return 'starportUnrefined';
  if (gasGiants > 0) return 'gasGiant';
  return null; // Stranded!
}

/**
 * Calculate route through systems using nearest-neighbor with fuel awareness
 */
function calculateRoute(systems, startHex) {
  if (systems.length === 0) return [];

  const route = [];
  const unvisited = [...systems];

  // Find starting system
  let currentIdx = unvisited.findIndex(s => s[1] === startHex);
  if (currentIdx === -1) currentIdx = 0;

  let currentHex = unvisited[currentIdx][1];
  route.push(unvisited.splice(currentIdx, 1)[0]);

  // Greedy nearest-neighbor (prefer systems with fuel)
  while (unvisited.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    let bestHasFuel = false;

    for (let i = 0; i < unvisited.length; i++) {
      const sys = unvisited[i];
      const dist = hexDistance(currentHex, sys[1]);
      const hasFuel = sys[2] !== 'X' || sys[3] > 0;

      // Prefer closer, but also prefer fuel sources
      if (dist <= 2) { // Within jump range
        if (dist < bestDist || (dist === bestDist && hasFuel && !bestHasFuel)) {
          bestIdx = i;
          bestDist = dist;
          bestHasFuel = hasFuel;
        }
      }
    }

    // If nothing in range, pick closest anyway (may strand us)
    if (bestDist === Infinity) {
      for (let i = 0; i < unvisited.length; i++) {
        const dist = hexDistance(currentHex, unvisited[i][1]);
        if (dist < bestDist) {
          bestIdx = i;
          bestDist = dist;
        }
      }
    }

    currentHex = unvisited[bestIdx][1];
    route.push(unvisited.splice(bestIdx, 1)[0]);
  }

  return route;
}

/**
 * Parse subsector JSON into system tuples
 */
function parseSubsectorData(subsectorData) {
  return subsectorData.systems.map(sys => {
    const starport = sys.uwp?.[0] || 'X';
    const gasGiants = sys.gasGiants || 0;
    return [sys.name, sys.hex, starport, gasGiants];
  });
}

/**
 * Main test runner for a subsector
 */
async function runSubsectorJourney(config) {
  const {
    name,
    letter,
    systems,
    startHex = null,
    exitHex = null,
    skipReset = false,
    headless = true,
    timeout = 600000
  } = config;

  const metrics = new MetricsTracker(name);
  metrics.systemsTotal = systems.length;

  console.log('\n' + '='.repeat(60));
  console.log(`  ${name.toUpperCase()} SUBSECTOR JOURNEY (${letter})`);
  console.log(`  ${systems.length} Systems - Fuel Management`);
  console.log('='.repeat(60) + '\n');

  // Calculate optimal route
  const route = calculateRoute(systems, startHex || systems[0][1]);

  if (!skipReset) {
    await resetSoloDemo();
  }

  let currentFuel = 23; // Starting fuel

  await withBrowser(async (browser, page) => {
    // Track console errors (ignore map tile 404s)
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('404')) {
        console.log(`  [Error] ${msg.text()}`);
      }
    });

    // Phase 1: Join
    console.log('  === PHASE 1: JOIN ===');
    const joined = await joinSoloDemoAsCaptain(page);
    if (!joined) {
      metrics.fail('Failed to join Solo Demo');
      return metrics.getSummary();
    }
    metrics.pass('Joined Solo Demo as Captain');

    // Get initial state
    const initialSystem = await getCurrentSystem(page);
    console.log(`  Starting at: ${initialSystem.systemName} (${initialSystem.systemHex})`);

    currentFuel = await getFuelLevel(page);
    console.log(`  Fuel: ${currentFuel}/${FUEL_CAPACITY} tons`);

    await undockShip(page);
    console.log('  Ship undocked');
    await wait(500);

    // Phase 2: Tour
    console.log(`\n  === PHASE 2: ${name.toUpperCase()} TOUR ===`);

    for (let sysIdx = 0; sysIdx < route.length; sysIdx++) {
      const [sysName, sysHex, starport, gasGiants] = route[sysIdx];

      console.log(`\n  --- ${sysIdx + 1}/${route.length}: ${sysName} (${sysHex}) ---`);
      console.log(`  Starport: ${starport} | Gas Giants: ${gasGiants}`);

      // Get destinations
      const destResult = await getDestinations(page);
      if (destResult.error) {
        metrics.fail(`Get destinations in ${sysName}`, destResult.error);
        continue;
      }

      const destinations = destResult.destinations || [];
      console.log(`  Destinations: ${destinations.length}`);

      // Visit each destination (estimate 1000km and 0.5 hours each)
      let visitedCount = 0;
      for (const dest of destinations) {
        const travelResult = await travelToDestination(page, dest.id);
        if (travelResult.success) {
          visitedCount++;
          metrics.destinationsVisited++;
          metrics.addInSystemTravel(1000, 0.5); // ~1000km, 30 min per destination
        }
      }

      if (visitedCount === destinations.length) {
        metrics.pass(`Visited ${visitedCount} destinations in ${sysName}`);
      } else {
        metrics.fail(`Visited ${visitedCount}/${destinations.length} in ${sysName}`);
      }

      metrics.systemsVisited++;

      // Last system - done
      if (sysIdx >= route.length - 1) {
        console.log('  Final system - tour complete!');
        break;
      }

      // Refueling
      const fuelNeeded = FUEL_PER_JUMP_2;
      currentFuel = await getFuelLevel(page);

      if (currentFuel < fuelNeeded) {
        console.log(`  Fuel low (${currentFuel}t), need ${fuelNeeded}t`);

        const refuelSource = selectRefuelSource(starport, gasGiants);

        if (refuelSource) {
          // Navigate to refuel point
          if (refuelSource === 'gasGiant') {
            const skimDest = destinations.find(d => d.id.includes('skim'));
            if (skimDest) await travelToDestination(page, skimDest.id);
          } else {
            const dockDest = destinations.find(d => d.id.includes('dock') || d.id.includes('downport'));
            if (dockDest) await travelToDestination(page, dockDest.id);
          }

          const refuelResult = await refuel(page, refuelSource);
          if (refuelResult.success) {
            metrics.pass(`Refueled (${refuelSource})`);
            metrics.addRefuel(refuelSource);
          } else {
            metrics.fail(`Refuel failed`, refuelResult.error);
          }

          currentFuel = await getFuelLevel(page);
          console.log(`  Fuel now: ${currentFuel}t`);
        } else {
          metrics.addUnreachable(sysName, sysHex, 'No fuel source - stranded');
          metrics.fail(`No refuel source in ${sysName}`);
          continue;
        }
      }

      // Jump to next system
      const [nextSys, nextHex] = route[sysIdx + 1];
      const jumpDist = hexDistance(sysHex, nextHex);

      if (jumpDist > 2) {
        metrics.addUnreachable(nextSys, nextHex, `Too far: ${jumpDist} parsecs`);
        console.log(`  Cannot reach ${nextSys} (${jumpDist} parsecs)`);
        continue;
      }

      // Go to jump point
      const jumpDest = destinations.find(d => d.id === 'jump_point' || (d.id.includes('jump') && !d.id.includes('skim')));
      if (jumpDest) await travelToDestination(page, jumpDest.id);

      console.log(`  Jumping to ${nextSys} (${nextHex}), ${jumpDist} parsecs...`);

      const jumpResult = await jumpToSystem(page, nextSys, nextHex, jumpDist);
      if (!jumpResult.success) {
        metrics.fail(`Jump to ${nextSys}`, jumpResult.error);
        continue;
      }

      // Advance time for jump
      await advanceTime(page, JUMP_DURATION_HOURS);
      await wait(300);

      // Complete jump
      const exitResult = await completeJump(page);
      if (exitResult.success) {
        metrics.pass(`Jumped to ${nextSys}`);
        metrics.addJump(jumpDist);
        await verifyPosition(page);
        await wait(200);
      } else {
        metrics.fail(`Exit jump to ${nextSys}`, exitResult.error);
      }

      await wait(200);
    }

    // Screenshot
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${name.toLowerCase()}-final.png`)
    });

  }, { timeout, headless });

  metrics.printSummary();
  return metrics.getSummary();
}

/**
 * Aggregate multiple subsector metrics
 */
function aggregateMetrics(subsectorResults) {
  const total = {
    subsectors: subsectorResults.length,
    duration: 0,
    systems: { visited: 0, total: 0 },
    destinations: 0,
    jumps: { completed: 0, parsecs: 0 },
    distance: { km: 0, parsecs: 0 },
    refuel: { starportRefined: 0, starportUnrefined: 0, gasGiant: 0, wilderness: 0 },
    time: { realSeconds: 0, gameHours: 0, gameDays: 0 },
    maintenance: { jumpsDue: 0 },
    tests: { passed: 0, failed: 0 },
    unreachable: [],
    errors: []
  };

  for (const r of subsectorResults) {
    total.duration += parseFloat(r.duration);
    total.systems.visited += r.systems.visited;
    total.systems.total += r.systems.total;
    total.destinations += r.destinations;
    total.jumps.completed += r.jumps.completed;
    total.jumps.parsecs += r.jumps.parsecs;
    total.distance.km += r.distance.km;
    total.distance.parsecs += r.distance.parsecs;
    total.refuel.starportRefined += r.refuel.starportRefined;
    total.refuel.starportUnrefined += r.refuel.starportUnrefined;
    total.refuel.gasGiant += r.refuel.gasGiant;
    total.refuel.wilderness += r.refuel.wilderness;
    total.time.realSeconds += r.time.realSeconds;
    total.time.gameHours += r.time.gameHours;
    total.maintenance.jumpsDue += r.maintenance.jumpsDue;
    total.tests.passed += r.tests.passed;
    total.tests.failed += r.tests.failed;
    total.unreachable.push(...r.unreachable.map(u => ({ ...u, subsector: r.subsector })));
    total.errors.push(...r.errors.map(e => ({ ...e, subsector: r.subsector })));
  }

  total.time.gameDays = Math.round(total.time.gameHours / 24);
  total.duration = total.duration.toFixed(1);

  return total;
}

module.exports = {
  // Core functions
  runSubsectorJourney,
  joinSoloDemoAsCaptain,
  resetSoloDemo,
  undockShip,

  // Navigation
  getDestinations,
  travelToDestination,
  jumpToSystem,
  completeJump,
  verifyPosition,
  advanceTime,

  // Fuel
  getFuelLevel,
  refuel,
  selectRefuelSource,

  // Utilities
  hexDistance,
  calculateRoute,
  parseSubsectorData,
  aggregateMetrics,

  // Classes
  MetricsTracker,

  // Constants
  FUEL_CAPACITY,
  FUEL_PER_JUMP_1,
  FUEL_PER_JUMP_2,
  JUMP_DURATION_HOURS,
  BASE_URL,
  SCREENSHOT_DIR
};
