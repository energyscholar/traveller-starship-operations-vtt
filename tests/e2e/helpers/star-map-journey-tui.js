#!/usr/bin/env node
/**
 * AR-222: Star Map Journey TUI Demo
 *
 * Interactive terminal demo showing ship travel through star systems.
 * Demonstrates:
 * - Ship icons on system map (ASCII)
 * - Travel routes with dotted lines
 * - Start point, turnaround point, end point
 * - Newtonian flip-and-burn trajectory
 * - Story narration at each location
 *
 * Run: node tests/e2e/helpers/star-map-journey-tui.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// === CONFIGURATION ===
const SUBSECTOR_DIR = path.join(__dirname, '..', '..', '..', 'data', 'star-systems', 'spinward-marches');

// Ship data
const SHIP = {
  name: 'ISS Firefly',
  type: 'Far Trader',
  thrust: 1,  // 1G
  fuel: 40,
  fuelCapacity: 40,
  crew: 6,
  position: { x: 0, y: 0, orbitAU: 0 },
  velocity: { x: 0, y: 0 },
  destination: null,
  travelPhase: 'idle'  // idle, accelerating, coasting, decelerating, arrived
};

// Journey waypoints
const JOURNEY = [
  { system: 'Regina', action: 'start', story: 'The crew boards at Regina Highport, cargo holds full of agricultural equipment.' },
  { system: 'Regina', location: 'gas-giant', action: 'travel', story: 'Pilot plots course to the gas giant for fuel skimming.' },
  { system: 'Regina', location: 'jump-point', action: 'travel', story: 'Full tanks. Course set for Efate. Jump drive spooling up.' },
  { system: 'Efate', action: 'jump', story: 'Emerging from jumpspace at Efate. The industrial world fills the viewscreen.' },
  { system: 'Efate', location: 'mainworld', action: 'travel', story: 'Approaching Efate Highport for cargo delivery.' },
  { system: 'Efate', location: 'jump-point', action: 'travel', story: 'Cargo delivered. New contract: medical supplies to Alell.' },
  { system: 'Alell', action: 'jump', story: 'Jump complete. Alell is a garden world, green and blue.' },
  { system: 'Alell', location: 'mainworld', action: 'travel', story: 'Final approach to Alell Downport. Mission complete.' }
];

// Terminal colors
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m'
};

// === DATA LOADING ===

const INDIVIDUAL_DIR = path.join(__dirname, '..', '..', '..', 'data', 'star-systems');

// Cache for loaded systems
const systemCache = new Map();

function findSystem(name) {
  if (systemCache.has(name.toLowerCase())) {
    return systemCache.get(name.toLowerCase());
  }

  // First try individual system files (rich data)
  const individualFile = path.join(INDIVIDUAL_DIR, name.toLowerCase().replace(/\s+/g, '-') + '.json');
  if (fs.existsSync(individualFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(individualFile, 'utf8'));
      systemCache.set(name.toLowerCase(), data);
      return data;
    } catch (e) { /* try subsector */ }
  }

  // Fall back to subsector files
  const files = fs.readdirSync(SUBSECTOR_DIR).filter(f => f.startsWith('subsector-'));
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(SUBSECTOR_DIR, file), 'utf8'));
    for (const sys of data.systems) {
      if (sys.name.toLowerCase() === name.toLowerCase()) {
        systemCache.set(name.toLowerCase(), sys);
        return sys;
      }
    }
  }
  return null;
}

// === ASCII MAP RENDERING ===

const MAP_WIDTH = 60;
const MAP_HEIGHT = 20;
const AU_SCALE = 2;  // 1 AU = 2 chars

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

function renderSystemMap(system, shipPos, route = null) {
  const lines = [];
  const map = [];

  // Initialize empty map
  for (let y = 0; y < MAP_HEIGHT; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      map[y][x] = ' ';
    }
  }

  const centerX = Math.floor(MAP_WIDTH / 2);
  const centerY = Math.floor(MAP_HEIGHT / 2);

  // Place objects
  const objects = system.celestialObjects || [];
  const objectPositions = [];

  for (const obj of objects) {
    // Skip objects without proper positioning (like Highport which orbits planet)
    if (obj.orbitAU === undefined && obj.type !== 'Star') continue;

    const orbitAU = obj.orbitAU || 0;
    const bearing = (obj.bearing || 0) * Math.PI / 180;

    // Convert to map coordinates
    const x = centerX + Math.round(orbitAU * AU_SCALE * Math.cos(bearing));
    const y = centerY + Math.round(orbitAU * AU_SCALE * 0.5 * Math.sin(bearing));

    if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
      let char, color;
      const objType = (obj.type || '').toLowerCase();

      if (objType === 'star' || obj.stellarClass) {
        char = '*';  // ASCII-safe star
        color = COLORS.yellow;
      } else if (objType === 'gas giant' || obj.type === 'Gas Giant') {
        char = 'G';
        color = COLORS.magenta;
      } else if (objType === 'planet' || obj.uwp) {
        // Check if mainworld
        const isMain = obj.isMainworld || obj.inGoldilocks || (obj.uwp && obj.uwp.length > 5);
        char = isMain ? 'O' : 'o';
        color = isMain ? COLORS.green : COLORS.cyan;
      } else if (objType === 'moon') {
        char = '.';
        color = COLORS.dim;
      } else if (objType === 'highport' || objType === 'station') {
        char = '+';
        color = COLORS.white;
      } else {
        char = '?';
        color = COLORS.dim;
      }
      map[y][x] = color + char + COLORS.reset;
      objectPositions.push({ obj, x, y });
    }
  }

  // Draw route if exists
  if (route) {
    drawRoute(map, route, centerX, centerY);
  }

  // Draw ship (offset slightly if on same spot as celestial object)
  let shipX = centerX + Math.round(shipPos.orbitAU * AU_SCALE * Math.cos(shipPos.bearing * Math.PI / 180));
  let shipY = centerY + Math.round(shipPos.orbitAU * AU_SCALE * 0.5 * Math.sin(shipPos.bearing * Math.PI / 180));

  // If ship is on same spot as an object, offset it
  if (map[shipY] && map[shipY][shipX] && map[shipY][shipX] !== ' ') {
    // Try to find adjacent empty spot
    const offsets = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [-1,-1]];
    for (const [dx, dy] of offsets) {
      const nx = shipX + dx, ny = shipY + dy;
      if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && map[ny][nx] === ' ') {
        shipX = nx;
        shipY = ny;
        break;
      }
    }
  }

  if (shipX >= 0 && shipX < MAP_WIDTH && shipY >= 0 && shipY < MAP_HEIGHT) {
    map[shipY][shipX] = COLORS.bright + COLORS.red + '>' + COLORS.reset;
  }

  // Build output
  lines.push(COLORS.cyan + '╔' + '═'.repeat(MAP_WIDTH) + '╗' + COLORS.reset);
  lines.push(COLORS.cyan + '║' + COLORS.reset + COLORS.bright +
             ` ${system.name} System `.padStart(MAP_WIDTH/2 + 8).padEnd(MAP_WIDTH) +
             COLORS.reset + COLORS.cyan + '║' + COLORS.reset);
  lines.push(COLORS.cyan + '╠' + '═'.repeat(MAP_WIDTH) + '╣' + COLORS.reset);

  for (let y = 0; y < MAP_HEIGHT; y++) {
    let line = COLORS.cyan + '║' + COLORS.reset;
    for (let x = 0; x < MAP_WIDTH; x++) {
      line += map[y][x];
    }
    line += COLORS.cyan + '║' + COLORS.reset;
    lines.push(line);
  }

  lines.push(COLORS.cyan + '╚' + '═'.repeat(MAP_WIDTH) + '╝' + COLORS.reset);

  // Legend
  lines.push('');
  lines.push(COLORS.dim + `  ${COLORS.yellow}*${COLORS.dim} Star  ${COLORS.green}O${COLORS.dim} Mainworld  ` +
             `${COLORS.cyan}o${COLORS.dim} Planet  ${COLORS.magenta}G${COLORS.dim} Gas Giant  ` +
             `${COLORS.white}+${COLORS.dim} Station  ${COLORS.red}>${COLORS.dim} Ship` + COLORS.reset);

  return lines;
}

function drawRoute(map, route, centerX, centerY) {
  const { start, end, turnaround, phase } = route;

  // Convert AU positions to map coords
  const startX = centerX + Math.round(start.orbitAU * AU_SCALE * Math.cos(start.bearing * Math.PI / 180));
  const startY = centerY + Math.round(start.orbitAU * AU_SCALE * 0.5 * Math.sin(start.bearing * Math.PI / 180));
  const endX = centerX + Math.round(end.orbitAU * AU_SCALE * Math.cos(end.bearing * Math.PI / 180));
  const endY = centerY + Math.round(end.orbitAU * AU_SCALE * 0.5 * Math.sin(end.bearing * Math.PI / 180));
  const turnX = Math.round((startX + endX) / 2);
  const turnY = Math.round((startY + endY) / 2);

  // Draw dotted line from start to end
  const dx = endX - startX;
  const dy = endY - startY;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  if (steps > 0) {
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(startX + (dx * i / steps));
      const y = Math.round(startY + (dy * i / steps));

      if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
        // Dotted pattern
        if (i % 2 === 0 && map[y][x] === ' ') {
          const isPastTurnaround = i > steps / 2;
          const color = isPastTurnaround ? COLORS.blue : COLORS.yellow;
          map[y][x] = color + '·' + COLORS.reset;
        }
      }
    }

    // Mark turnaround point
    if (turnX >= 0 && turnX < MAP_WIDTH && turnY >= 0 && turnY < MAP_HEIGHT) {
      map[turnY][turnX] = COLORS.bright + COLORS.white + 'T' + COLORS.reset;
    }

    // Mark start
    if (startX >= 0 && startX < MAP_WIDTH && startY >= 0 && startY < MAP_HEIGHT && map[startY][startX] === ' ') {
      map[startY][startX] = COLORS.green + 'S' + COLORS.reset;
    }

    // Mark end
    if (endX >= 0 && endX < MAP_WIDTH && endY >= 0 && endY < MAP_HEIGHT && map[endY][endX] === ' ') {
      map[endY][endX] = COLORS.red + 'E' + COLORS.reset;
    }
  }
}

// === TRAVEL PHYSICS ===

function calculateFlightPath(start, end, thrustG = 1) {
  // Simplified Newtonian mechanics
  // Distance in AU, convert to km for calculations
  const AU_KM = 149597870.7;
  const G_MS2 = 9.81;

  const startBearing = start.bearing * Math.PI / 180;
  const endBearing = end.bearing * Math.PI / 180;

  // Calculate straight-line distance
  const x1 = start.orbitAU * Math.cos(startBearing);
  const y1 = start.orbitAU * Math.sin(startBearing);
  const x2 = end.orbitAU * Math.cos(endBearing);
  const y2 = end.orbitAU * Math.sin(endBearing);

  const distanceAU = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
  const distanceKm = distanceAU * AU_KM;

  // Flip-and-burn: accelerate half, decelerate half
  const accelMs2 = thrustG * G_MS2;
  const halfDistanceM = distanceKm * 1000 / 2;

  // Time to midpoint: t = sqrt(2d/a)
  const timeToMidpointS = Math.sqrt(2 * halfDistanceM / accelMs2);
  const totalTimeS = timeToMidpointS * 2;

  // Max velocity at turnaround
  const maxVelocityMs = accelMs2 * timeToMidpointS;

  return {
    distanceAU,
    distanceKm: Math.round(distanceKm),
    totalTimeHours: Math.round(totalTimeS / 3600 * 10) / 10,
    maxVelocityKms: Math.round(maxVelocityMs / 1000),
    turnaround: {
      orbitAU: (start.orbitAU + end.orbitAU) / 2,
      bearing: (start.bearing + end.bearing) / 2
    }
  };
}

// === STORY DISPLAY ===

function displayStatus(system, waypoint, shipPos, route, flight) {
  clearScreen();

  // Header
  console.log(COLORS.bright + COLORS.cyan);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              AR-222: STAR MAP JOURNEY TUI DEMO               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(COLORS.reset);

  // System map
  const mapLines = renderSystemMap(system, shipPos, route);
  for (const line of mapLines) {
    console.log(line);
  }

  // Ship status
  console.log('');
  console.log(COLORS.bright + '┌─────────────────────────────────────────────────────────────┐' + COLORS.reset);
  console.log(COLORS.bright + `│ ${COLORS.yellow}${SHIP.name}${COLORS.reset}${COLORS.bright} (${SHIP.type})` + ' '.repeat(40 - SHIP.name.length - SHIP.type.length) + '│' + COLORS.reset);
  console.log(COLORS.bright + '├─────────────────────────────────────────────────────────────┤' + COLORS.reset);
  console.log(`  Position: ${shipPos.orbitAU.toFixed(2)} AU @ ${shipPos.bearing.toFixed(0)}°`);
  console.log(`  Fuel: ${SHIP.fuel}/${SHIP.fuelCapacity} tons`);
  if (flight) {
    console.log(`  Distance: ${flight.distanceAU.toFixed(2)} AU (${flight.distanceKm.toLocaleString()} km)`);
    console.log(`  Travel time: ${flight.totalTimeHours} hours`);
    console.log(`  Max velocity: ${flight.maxVelocityKms.toLocaleString()} km/s`);
  }
  console.log(COLORS.bright + '└─────────────────────────────────────────────────────────────┘' + COLORS.reset);

  // Story
  console.log('');
  console.log(COLORS.dim + '─'.repeat(65) + COLORS.reset);
  console.log(COLORS.green + '  📖 ' + waypoint.story + COLORS.reset);
  console.log(COLORS.dim + '─'.repeat(65) + COLORS.reset);

  // Route legend if traveling
  if (route) {
    console.log('');
    console.log(`  ${COLORS.green}S${COLORS.reset}=Start   ${COLORS.yellow}.${COLORS.reset}.${COLORS.yellow}.${COLORS.reset} Accel   ` +
                `${COLORS.white}T${COLORS.reset}=Turnaround   ${COLORS.blue}.${COLORS.reset}.${COLORS.blue}.${COLORS.reset} Decel   ` +
                `${COLORS.red}E${COLORS.reset}=End`);
  }
}

// === ANIMATION ===

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function animateTravel(system, start, end, waypoint) {
  const flight = calculateFlightPath(start, end, SHIP.thrust);
  const route = { start, end, turnaround: flight.turnaround };

  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;

    // Interpolate position along route
    const currentPos = {
      orbitAU: start.orbitAU + (end.orbitAU - start.orbitAU) * progress,
      bearing: start.bearing + (end.bearing - start.bearing) * progress
    };

    // Determine phase
    if (progress < 0.5) {
      SHIP.travelPhase = 'accelerating';
      route.phase = 'accel';
    } else if (progress > 0.5) {
      SHIP.travelPhase = 'decelerating';
      route.phase = 'decel';
    } else {
      SHIP.travelPhase = 'turnaround';
      route.phase = 'turn';
    }

    displayStatus(system, waypoint, currentPos, route, flight);

    // Phase indicator
    const phaseBar = '═'.repeat(Math.floor(progress * 30));
    const remaining = '─'.repeat(30 - Math.floor(progress * 30));
    console.log('');
    console.log(`  Travel: [${COLORS.yellow}${phaseBar}${COLORS.dim}${remaining}${COLORS.reset}] ${Math.round(progress * 100)}%`);
    console.log(`  Phase: ${SHIP.travelPhase.toUpperCase()}`);

    await delay(300);
  }

  SHIP.position = { ...end };
  SHIP.travelPhase = 'arrived';
}

// === MAIN DEMO ===

async function runDemo() {
  console.log('Loading system data...');

  let currentSystem = null;
  let currentWaypointIdx = 0;

  // Process each waypoint
  for (const waypoint of JOURNEY) {
    currentWaypointIdx++;

    // Load system if changed
    if (!currentSystem || currentSystem.name !== waypoint.system) {
      currentSystem = findSystem(waypoint.system);
      if (!currentSystem) {
        console.log(`ERROR: System '${waypoint.system}' not found`);
        continue;
      }

      // Position ship at jump point (outer system)
      if (waypoint.action === 'jump') {
        SHIP.position = { orbitAU: 8, bearing: 45 };
      }
    }

    // Determine destination object
    let destination = null;
    if (waypoint.location) {
      const objects = currentSystem.celestialObjects || [];
      if (waypoint.location === 'mainworld') {
        destination = objects.find(o => o.type === 'Planet' && o.uwp);
      } else if (waypoint.location === 'gas-giant') {
        destination = objects.find(o => o.type === 'Gas Giant');
      } else if (waypoint.location === 'jump-point') {
        destination = { orbitAU: 10, bearing: 270, name: 'Jump Point' };
      } else {
        destination = objects.find(o => o.id === waypoint.location || o.name === waypoint.location);
      }
    }

    // Handle different actions
    switch (waypoint.action) {
      case 'start':
        // Initial position at mainworld
        const mainworld = currentSystem.celestialObjects?.find(o => o.type === 'Planet' && o.uwp);
        if (mainworld) {
          SHIP.position = { orbitAU: mainworld.orbitAU || 1, bearing: mainworld.bearing || 0 };
        } else {
          SHIP.position = { orbitAU: 1, bearing: 0 };
        }
        displayStatus(currentSystem, waypoint, SHIP.position, null, null);
        console.log('\n  Press ENTER to continue...');
        await waitForEnter();
        break;

      case 'travel':
        if (destination) {
          const startPos = { ...SHIP.position };
          const endPos = {
            orbitAU: destination.orbitAU || 10,
            bearing: destination.bearing || 270
          };
          await animateTravel(currentSystem, startPos, endPos, waypoint);
          console.log('\n  Press ENTER to continue...');
          await waitForEnter();
        }
        break;

      case 'jump':
        displayStatus(currentSystem, waypoint, SHIP.position, null, null);
        console.log('\n  ' + COLORS.bright + COLORS.magenta + '★ JUMP COMPLETE ★' + COLORS.reset);
        console.log('\n  Press ENTER to continue...');
        await waitForEnter();
        break;
    }
  }

  // Final summary
  clearScreen();
  console.log(COLORS.bright + COLORS.green);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    JOURNEY COMPLETE                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(COLORS.reset);
  console.log('');
  console.log('  Systems visited: Regina → Efate → Alell');
  console.log('  Total jumps: 2');
  console.log('  In-system travels: 5');
  console.log('');
  console.log('  The ' + COLORS.yellow + SHIP.name + COLORS.reset + ' has completed its journey.');
  console.log('  Cargo delivered. Crew paid. Next adventure awaits...');
  console.log('');
}

function waitForEnter() {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('', () => {
      rl.close();
      resolve();
    });
  });
}

// === RUN ===

runDemo().then(() => {
  console.log('Demo complete.');
  process.exit(0);
}).catch(err => {
  console.error('Demo error:', err);
  process.exit(1);
});
