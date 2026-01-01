/**
 * AR-227: Route Planner
 *
 * A* pathfinding for Traveller jump routes
 * Inspired by TravellerMap API (/api/route)
 *
 * Features:
 * - A* shortest path between systems
 * - Jump distance constraint (1-6 parsecs)
 * - Optional refueling constraint (gas giant/starport)
 * - Red/Amber zone avoidance
 * - Multi-sector support (future)
 *
 * Usage:
 *   const route = findRoute('0101', '3240', { jump: 2 });
 *   // Returns: { path: ['0101', '0303', '0505', ...], jumps: 5, valid: true }
 */

const sectorLoader = require('./sector-loader');

/**
 * Calculate hex distance between two hex strings
 * Uses cube coordinate conversion for accurate hex distance
 * @param {string} hex1 - First hex (e.g., "1815")
 * @param {string} hex2 - Second hex (e.g., "1910")
 * @returns {number} Distance in parsecs
 */
function hexDistance(hex1, hex2) {
  const col1 = parseInt(hex1.substring(0, 2));
  const row1 = parseInt(hex1.substring(2, 4));
  const col2 = parseInt(hex2.substring(0, 2));
  const row2 = parseInt(hex2.substring(2, 4));

  // Convert offset to cube coordinates
  const x1 = col1 - Math.floor(row1 / 2);
  const z1 = row1;
  const y1 = -x1 - z1;

  const x2 = col2 - Math.floor(row2 / 2);
  const z2 = row2;
  const y2 = -x2 - z2;

  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2));
}

/**
 * Get all systems within jump range of a given hex
 * @param {string} fromHex - Source hex
 * @param {number} jumpRange - Maximum jump distance
 * @param {Array} allSystems - Array of system objects with hex property
 * @returns {Array} Systems within range
 */
function getSystemsInRange(fromHex, jumpRange, allSystems) {
  return allSystems.filter(sys => {
    const dist = hexDistance(fromHex, sys.hex);
    return dist > 0 && dist <= jumpRange;
  });
}

/**
 * Check if a system is valid for the route
 * @param {Object} system - System object
 * @param {Object} options - Route options
 * @returns {boolean} True if system can be used as waypoint
 */
function isValidWaypoint(system, options) {
  // Check zone restrictions
  if (options.noRed && system.zone === 'Red') {
    return false;
  }
  if (options.noAmber && system.zone === 'Amber') {
    return false;
  }

  // Check refueling requirement
  if (options.requireRefuel) {
    const hasGasGiant = (system.gg || 0) > 0;
    const hasStarport = system.uwp && !['X', 'E'].includes(system.uwp[0]);
    if (!hasGasGiant && !hasStarport) {
      return false;
    }
  }

  // Check wilderness-only (gas giant refueling only)
  if (options.wildernessOnly) {
    const hasGasGiant = (system.gg || 0) > 0;
    if (!hasGasGiant) {
      return false;
    }
  }

  return true;
}

/**
 * A* pathfinding for jump routes
 * @param {string} startHex - Starting hex
 * @param {string} endHex - Destination hex
 * @param {Object} options - Route options
 * @param {number} options.jump - Jump range (1-6, default 2)
 * @param {boolean} options.noRed - Avoid Red zones
 * @param {boolean} options.noAmber - Avoid Amber zones
 * @param {boolean} options.requireRefuel - Require refueling at each stop
 * @param {boolean} options.wildernessOnly - Only wilderness refueling (gas giants)
 * @param {string} options.sector - Sector name (default: Spinward Marches)
 * @returns {Object} Route result
 */
function findRoute(startHex, endHex, options = {}) {
  const {
    jump = 2,
    noRed = true,
    noAmber = false,
    requireRefuel = false,
    wildernessOnly = false,
    sector = 'Spinward Marches'
  } = options;

  // Load sector data
  const sectorData = sectorLoader.loadSector(sector);
  if (!sectorData) {
    return {
      valid: false,
      error: `Sector not found: ${sector}`,
      path: []
    };
  }

  const allSystems = sectorData.systems;
  const systemsByHex = new Map(allSystems.map(s => [s.hex, s]));

  // Validate start and end
  const startSystem = systemsByHex.get(startHex);
  const endSystem = systemsByHex.get(endHex);

  if (!startSystem) {
    return { valid: false, error: `Start system not found: ${startHex}`, path: [] };
  }
  if (!endSystem) {
    return { valid: false, error: `End system not found: ${endHex}`, path: [] };
  }

  // Check if direct jump is possible
  const directDist = hexDistance(startHex, endHex);
  if (directDist <= jump) {
    return {
      valid: true,
      path: [startHex, endHex],
      systems: [startSystem.name, endSystem.name],
      jumps: 1,
      totalParsecs: directDist,
      message: 'Direct jump possible'
    };
  }

  // A* implementation
  const openSet = new Set([startHex]);
  const cameFrom = new Map();
  const gScore = new Map(); // Cost from start
  const fScore = new Map(); // Estimated total cost

  gScore.set(startHex, 0);
  fScore.set(startHex, hexDistance(startHex, endHex));

  while (openSet.size > 0) {
    // Get node with lowest fScore
    let current = null;
    let lowestF = Infinity;
    for (const hex of openSet) {
      const f = fScore.get(hex) || Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = hex;
      }
    }

    if (current === endHex) {
      // Reconstruct path
      const path = [current];
      const systems = [systemsByHex.get(current).name];
      let totalParsecs = 0;

      while (cameFrom.has(current)) {
        const prev = cameFrom.get(current);
        totalParsecs += hexDistance(prev, current);
        current = prev;
        path.unshift(current);
        systems.unshift(systemsByHex.get(current).name);
      }

      return {
        valid: true,
        path,
        systems,
        jumps: path.length - 1,
        totalParsecs,
        message: `Route found: ${path.length - 1} jumps`
      };
    }

    openSet.delete(current);

    // Get neighbors (systems within jump range)
    const neighbors = getSystemsInRange(current, jump, allSystems);

    for (const neighbor of neighbors) {
      // Skip invalid waypoints
      if (!isValidWaypoint(neighbor, { noRed, noAmber, requireRefuel, wildernessOnly })) {
        continue;
      }

      const tentativeG = (gScore.get(current) || Infinity) + 1; // Each jump costs 1

      if (tentativeG < (gScore.get(neighbor.hex) || Infinity)) {
        cameFrom.set(neighbor.hex, current);
        gScore.set(neighbor.hex, tentativeG);
        fScore.set(neighbor.hex, tentativeG + hexDistance(neighbor.hex, endHex) / jump);
        openSet.add(neighbor.hex);
      }
    }
  }

  // No path found
  return {
    valid: false,
    error: 'No valid route found',
    path: [],
    message: `No route from ${startSystem.name} to ${endSystem.name} with Jump-${jump}`
  };
}

/**
 * Find multiple alternative routes
 * @param {string} startHex - Starting hex
 * @param {string} endHex - Destination hex
 * @param {Object} options - Route options
 * @param {number} maxRoutes - Maximum routes to return (default 3)
 * @returns {Array} Array of route results
 */
function findAlternativeRoutes(startHex, endHex, options = {}, maxRoutes = 3) {
  const routes = [];
  const usedPaths = new Set();

  // Get primary route
  const primary = findRoute(startHex, endHex, options);
  if (primary.valid) {
    routes.push(primary);
    usedPaths.add(primary.path.join(','));
  }

  // Try with different jump ratings to get alternatives
  for (let j = (options.jump || 2) - 1; j >= 1 && routes.length < maxRoutes; j--) {
    const alt = findRoute(startHex, endHex, { ...options, jump: j });
    if (alt.valid && !usedPaths.has(alt.path.join(','))) {
      alt.jumpUsed = j;
      routes.push(alt);
      usedPaths.add(alt.path.join(','));
    }
  }

  return routes;
}

/**
 * Calculate route with refueling stops
 * Returns route with fuel consumption info
 */
function findRouteWithFuel(startHex, endHex, options = {}) {
  const route = findRoute(startHex, endHex, { ...options, requireRefuel: true });

  if (!route.valid) {
    // Try without refuel requirement
    const fallback = findRoute(startHex, endHex, options);
    if (fallback.valid) {
      fallback.warning = 'Route may require drop tanks or wilderness refueling';
    }
    return fallback;
  }

  // Add fuel info to each stop
  const sectorData = sectorLoader.loadSector(options.sector || 'Spinward Marches');
  const systemsByHex = new Map(sectorData.systems.map(s => [s.hex, s]));

  route.stops = route.path.map((hex, i) => {
    const sys = systemsByHex.get(hex);
    return {
      hex,
      name: sys.name,
      jump: i > 0 ? hexDistance(route.path[i-1], hex) : 0,
      refuel: {
        gasGiant: (sys.gg || 0) > 0,
        starport: sys.uwp ? sys.uwp[0] : 'X',
        canRefuel: (sys.gg || 0) > 0 || (sys.uwp && !['X', 'E'].includes(sys.uwp[0]))
      }
    };
  });

  return route;
}

/**
 * Get all systems reachable from a starting point
 * @param {string} startHex - Starting hex
 * @param {number} maxJumps - Maximum number of jumps
 * @param {Object} options - Route options
 * @returns {Map} Map of hex -> { jumps, path }
 */
function getReachableSystems(startHex, maxJumps = 3, options = {}) {
  const {
    jump = 2,
    noRed = true,
    sector = 'Spinward Marches'
  } = options;

  const sectorData = sectorLoader.loadSector(sector);
  const allSystems = sectorData.systems;
  const systemsByHex = new Map(allSystems.map(s => [s.hex, s]));

  const reachable = new Map();
  reachable.set(startHex, { jumps: 0, path: [startHex] });

  const queue = [[startHex, 0, [startHex]]];

  while (queue.length > 0) {
    const [current, jumps, path] = queue.shift();

    if (jumps >= maxJumps) continue;

    const neighbors = getSystemsInRange(current, jump, allSystems);

    for (const neighbor of neighbors) {
      if (reachable.has(neighbor.hex)) continue;
      if (noRed && neighbor.zone === 'Red') continue;

      const newPath = [...path, neighbor.hex];
      reachable.set(neighbor.hex, { jumps: jumps + 1, path: newPath });
      queue.push([neighbor.hex, jumps + 1, newPath]);
    }
  }

  return reachable;
}

module.exports = {
  findRoute,
  findAlternativeRoutes,
  findRouteWithFuel,
  getReachableSystems,
  hexDistance,
  getSystemsInRange,
  isValidWaypoint
};
