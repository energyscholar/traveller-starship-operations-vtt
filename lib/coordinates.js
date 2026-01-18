/**
 * Unified Coordinate System for Traveller Starship Operations
 *
 * Handles:
 * - Absolute positions (km from system origin)
 * - Hierarchical orbital dynamics (body orbiting body)
 * - Transit/movement along courses
 * - Reference frame transforms
 *
 * All distances in km unless otherwise specified.
 * All times in hours unless otherwise specified.
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/** Kilometers in one Astronomical Unit */
const AU_IN_KM = 149597870.7;

/** Approximate cruise speed at 1G acceleration (km/h) */
const KM_PER_HOUR_1G = 35000;

// =============================================================================
// UNIT CONVERSIONS
// =============================================================================

/**
 * Convert Astronomical Units to kilometers
 * @param {number} au - Distance in AU
 * @returns {number} Distance in km
 */
function auToKm(au) {
  return au * AU_IN_KM;
}

/**
 * Convert kilometers to Astronomical Units
 * @param {number} km - Distance in km
 * @returns {number} Distance in AU
 */
function kmToAu(km) {
  return km / AU_IN_KM;
}

// =============================================================================
// POSITION AND VELOCITY CREATION
// =============================================================================

/**
 * Create a position object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} [z=0] - Z coordinate
 * @param {string} [unit='km'] - Unit of measurement
 * @returns {{x: number, y: number, z: number, unit: string}}
 */
function createPosition(x, y, z = 0, unit = 'km') {
  return { x, y, z, unit };
}

/**
 * Create a velocity object
 * @param {number} x - X component
 * @param {number} y - Y component
 * @param {number} [z=0] - Z component
 * @param {string} [unit='km/h'] - Unit of measurement
 * @returns {{x: number, y: number, z: number, unit: string}}
 */
function createVelocity(x, y, z = 0, unit = 'km/h') {
  return { x, y, z, unit };
}

// =============================================================================
// DISTANCE CALCULATIONS
// =============================================================================

/**
 * Normalize a position to km
 * @param {{x: number, y: number, z: number, unit?: string}} pos
 * @returns {{x: number, y: number, z: number}}
 */
function normalizeToKm(pos) {
  if (pos.unit === 'au') {
    return {
      x: auToKm(pos.x),
      y: auToKm(pos.y),
      z: auToKm(pos.z || 0)
    };
  }
  return { x: pos.x, y: pos.y, z: pos.z || 0 };
}

/**
 * Calculate distance between two positions
 * @param {{x: number, y: number, z?: number, unit?: string}} p1
 * @param {{x: number, y: number, z?: number, unit?: string}} p2
 * @returns {number} Distance in km
 */
function distanceBetween(p1, p2) {
  const n1 = normalizeToKm(p1);
  const n2 = normalizeToKm(p2);

  const dx = n2.x - n1.x;
  const dy = n2.y - n1.y;
  const dz = n2.z - n1.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// =============================================================================
// ORBITAL POSITION CALCULATIONS
// =============================================================================

/**
 * Get position on an orbit at a given time
 * @param {{orbitRadiusKm: number, orbitPeriodHours: number, initialBearing: number}} orbit
 * @param {number} timeHours - Current time in hours
 * @returns {{x: number, y: number, z: number, unit: string}}
 */
function getOrbitalPosition(orbit, timeHours) {
  const { orbitRadiusKm, orbitPeriodHours, initialBearing = 0 } = orbit;

  // Handle stationary points (orbitPeriodHours = 0)
  if (orbitPeriodHours === 0) {
    const bearingRad = (initialBearing * Math.PI) / 180;
    return createPosition(
      orbitRadiusKm * Math.cos(bearingRad),
      orbitRadiusKm * Math.sin(bearingRad),
      0
    );
  }

  // Calculate angular position
  const angularVelocity = (2 * Math.PI) / orbitPeriodHours;
  const initialAngle = (initialBearing * Math.PI) / 180;
  const currentAngle = initialAngle + angularVelocity * timeHours;

  return createPosition(
    orbitRadiusKm * Math.cos(currentAngle),
    orbitRadiusKm * Math.sin(currentAngle),
    0
  );
}

// =============================================================================
// HIERARCHICAL POSITION (body orbiting body)
// =============================================================================

/**
 * Get a body from the system by ID
 * @param {string} bodyId
 * @param {Object} system - Map of body ID to body object
 * @returns {Object|null}
 */
function getBody(bodyId, system) {
  return system[bodyId] || Object.values(system).find(b => b.id === bodyId) || null;
}

/**
 * Get absolute position of a body in the system
 * Recursively calculates position through parent chain
 * @param {Object} body - The body to get position for
 * @param {Object} system - Map of all bodies in system
 * @param {number} timeHours - Current time
 * @returns {{x: number, y: number, z: number, unit: string}}
 */
function getAbsolutePosition(body, system, timeHours) {
  // Star or body with explicit position = use that position
  if (body.type === 'Star' || body.position) {
    return body.position || createPosition(0, 0, 0);
  }

  // No parent = error state, return origin
  if (!body.parentId) {
    return createPosition(0, 0, 0);
  }

  // Get parent's absolute position
  const parent = getBody(body.parentId, system);
  if (!parent) {
    console.warn(`Parent ${body.parentId} not found for ${body.id}`);
    return createPosition(0, 0, 0);
  }

  const parentPos = getAbsolutePosition(parent, system, timeHours);

  // Calculate this body's orbital position relative to parent
  const localPos = getOrbitalPosition({
    orbitRadiusKm: body.orbitRadiusKm || 0,
    orbitPeriodHours: body.orbitPeriodHours || 8760,  // Default 1 year
    initialBearing: body.initialBearing || 0
  }, timeHours);

  // Combine: parent position + local orbital offset
  return createPosition(
    parentPos.x + localPos.x,
    parentPos.y + localPos.y,
    parentPos.z + localPos.z
  );
}

/**
 * Get position of a body relative to another body
 * @param {Object} body - The body to get position for
 * @param {Object} referenceBody - The reference body
 * @param {Object} system - Map of all bodies
 * @param {number} timeHours - Current time
 * @returns {{x: number, y: number, z: number, unit: string}}
 */
function getRelativePosition(body, referenceBody, system, timeHours) {
  const bodyPos = getAbsolutePosition(body, system, timeHours);
  const refPos = getAbsolutePosition(referenceBody, system, timeHours);

  return createPosition(
    bodyPos.x - refPos.x,
    bodyPos.y - refPos.y,
    bodyPos.z - refPos.z
  );
}

// =============================================================================
// TRANSIT / COURSE CALCULATIONS
// =============================================================================

/**
 * Calculate a course between two points
 * @param {{x: number, y: number, z?: number}} from - Start position
 * @param {{x: number, y: number, z?: number}} to - End position
 * @param {number} speedKmH - Travel speed in km/h
 * @returns {{startPosition, endPosition, distanceKm: number, speedKmH: number, durationHours: number}}
 */
function calculateCourse(from, to, speedKmH) {
  const distanceKm = distanceBetween(from, to);
  const durationHours = distanceKm / speedKmH;

  return {
    startPosition: from,
    endPosition: to,
    distanceKm,
    speedKmH,
    durationHours
  };
}

/**
 * Get time to travel between two points
 * @param {{x: number, y: number}} from
 * @param {{x: number, y: number}} to
 * @param {number} speedKmH
 * @returns {number} Time in hours
 */
function getTimeToDestination(from, to, speedKmH) {
  return distanceBetween(from, to) / speedKmH;
}

/**
 * Get position along a course at a given time
 * @param {{startPosition, endPosition, distanceKm: number, speedKmH: number, durationHours: number}} course
 * @param {number} elapsedHours - Time since course started
 * @returns {{x: number, y: number, z: number, unit: string}}
 */
function moveAlongCourse(course, elapsedHours) {
  const { startPosition, endPosition, durationHours } = course;

  // Clamp progress to [0, 1]
  const progress = Math.min(1, Math.max(0, elapsedHours / durationHours));

  // Handle edge case where durationHours is 0 (already at destination)
  if (durationHours === 0 || !isFinite(progress)) {
    return createPosition(endPosition.x, endPosition.y, endPosition.z || 0);
  }

  // Linear interpolation
  return createPosition(
    startPosition.x + (endPosition.x - startPosition.x) * progress,
    startPosition.y + (endPosition.y - startPosition.y) * progress,
    (startPosition.z || 0) + ((endPosition.z || 0) - (startPosition.z || 0)) * progress
  );
}

// =============================================================================
// REFERENCE FRAME TRANSFORMS
// =============================================================================

/**
 * Convert system coordinates to local (planet-relative) coordinates
 * @param {{x: number, y: number, z?: number}} systemPos - Position in system frame
 * @param {{x: number, y: number, z?: number}} originPos - Origin (e.g., planet position)
 * @returns {{x: number, y: number, z: number, unit: string}}
 */
function systemToLocal(systemPos, originPos) {
  return createPosition(
    systemPos.x - originPos.x,
    systemPos.y - originPos.y,
    (systemPos.z || 0) - (originPos.z || 0)
  );
}

/**
 * Convert local (planet-relative) coordinates to system coordinates
 * @param {{x: number, y: number, z?: number}} localPos - Position in local frame
 * @param {{x: number, y: number, z?: number}} originPos - Origin (e.g., planet position)
 * @returns {{x: number, y: number, z: number, unit: string}}
 */
function localToSystem(localPos, originPos) {
  return createPosition(
    localPos.x + originPos.x,
    localPos.y + originPos.y,
    (localPos.z || 0) + (originPos.z || 0)
  );
}

// =============================================================================
// STAR SYSTEM DATA BRIDGE
// =============================================================================

/**
 * Convert star system location data to coordinate system format
 * Bridges between the JSON data format and coordinate calculations
 * @param {Object} system - Star system with celestialObjects and locations
 * @param {string} locationId - Location ID to find
 * @param {number} timeHours - Current game time in hours
 * @returns {{x: number, y: number, z: number, unit: string}|null}
 */
function getLocationPosition(system, locationId, timeHours = 0) {
  if (!system?.locations || !system?.celestialObjects) return null;

  const location = system.locations.find(l => l.id === locationId);
  if (!location) return null;

  // Find parent body (supports both parentId and linkedTo)
  const parentId = location.parentId || location.linkedTo;
  if (!parentId) return null;

  const parentBody = system.celestialObjects.find(o => o.id === parentId);
  if (!parentBody) return null;

  // Build a mini coordinate system from the star system data
  const coordSystem = buildCoordSystem(system, parentId);

  // Get parent body's absolute position
  const parentPos = getAbsolutePosition(coordSystem[parentId], coordSystem, timeHours);

  // Calculate location's offset from parent
  const orbitKm = location.orbitKm || location.orbitalAltitudeKm || 0;
  const bearing = location.bearing || 0;
  const bearingRad = (bearing * Math.PI) / 180;

  // Surface locations (downports) are at planet center for distance purposes
  if (location.surface) {
    return parentPos;
  }

  return createPosition(
    parentPos.x + orbitKm * Math.cos(bearingRad),
    parentPos.y + orbitKm * Math.sin(bearingRad),
    0
  );
}

/**
 * Build a coordinate system from star system celestialObjects
 * @param {Object} system - Star system data
 * @param {string} targetId - ID we need to resolve (walks up parent chain)
 * @returns {Object} Coordinate system map
 */
function buildCoordSystem(system, targetId) {
  const coordSystem = {};
  const celestialObjects = system.celestialObjects || [];

  // Find the star (center of system)
  const star = celestialObjects.find(o => o.type === 'Star');
  if (star) {
    coordSystem[star.id] = {
      id: star.id,
      type: 'Star',
      position: createPosition(0, 0, 0)
    };
  }

  // Add all celestial objects
  for (const obj of celestialObjects) {
    if (obj.type === 'Star') continue;

    // Find parent - could be star or another body
    const parentId = obj.parentId || obj.parent;
    const parent = parentId
      ? celestialObjects.find(o => o.id === parentId)
      : star;

    coordSystem[obj.id] = {
      id: obj.id,
      type: obj.type,
      parentId: parent?.id || star?.id,
      orbitRadiusKm: obj.orbitKm || auToKm(obj.orbitAU || 0),
      orbitPeriodHours: obj.orbitPeriodHours || calculateOrbitPeriod(obj.orbitAU || 0),
      initialBearing: obj.bearing || 0
    };
  }

  return coordSystem;
}

/**
 * Estimate orbital period from semi-major axis (Kepler's 3rd law approximation)
 * @param {number} orbitAU - Orbital radius in AU
 * @returns {number} Period in hours
 */
function calculateOrbitPeriod(orbitAU) {
  if (orbitAU <= 0) return 8760; // Default 1 year
  // P^2 = a^3 for Sun-like star, P in years, a in AU
  const periodYears = Math.sqrt(orbitAU * orbitAU * orbitAU);
  return periodYears * 8760; // Convert to hours
}

/**
 * Calculate distance between two locations in a star system
 * More accurate than simple orbital radius difference
 * @param {Object} system - Star system with celestialObjects and locations
 * @param {string} fromLocationId - Starting location ID
 * @param {string} toLocationId - Destination location ID
 * @param {number} timeHours - Current game time (affects orbital positions)
 * @returns {{distanceKm: number, distanceAU: number}|null}
 */
function getDistanceBetweenLocations(system, fromLocationId, toLocationId, timeHours = 0) {
  const fromPos = getLocationPosition(system, fromLocationId, timeHours);
  const toPos = getLocationPosition(system, toLocationId, timeHours);

  if (!fromPos || !toPos) return null;

  const distanceKm = distanceBetween(fromPos, toPos);
  return {
    distanceKm,
    distanceAU: kmToAu(distanceKm)
  };
}

// =============================================================================
// SHIP POSITION STATE
// =============================================================================

/**
 * Update a ship's position based on the body it's orbiting
 * @param {{orbitingBodyId: string, orbitRadiusKm: number, orbitBearing: number}} ship
 * @param {Object} system - Map of all bodies
 * @param {number} timeHours - Current time
 * @returns {{x: number, y: number, z: number, unit: string}}
 */
function updateOrbitingBody(ship, system, timeHours) {
  const body = getBody(ship.orbitingBodyId, system);
  if (!body) {
    console.warn(`Orbiting body ${ship.orbitingBodyId} not found`);
    return createPosition(0, 0, 0);
  }

  // Get body's absolute position
  const bodyPos = getAbsolutePosition(body, system, timeHours);

  // Add ship's orbital offset (stationary orbit for docked ships)
  const bearingRad = ((ship.orbitBearing || 0) * Math.PI) / 180;
  const orbitRadius = ship.orbitRadiusKm || 0;

  return createPosition(
    bodyPos.x + orbitRadius * Math.cos(bearingRad),
    bodyPos.y + orbitRadius * Math.sin(bearingRad),
    bodyPos.z || 0
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  AU_IN_KM,
  KM_PER_HOUR_1G,

  // Unit conversions
  auToKm,
  kmToAu,

  // Position/velocity creation
  createPosition,
  createVelocity,

  // Distance calculations
  distanceBetween,

  // Orbital mechanics
  getOrbitalPosition,
  getAbsolutePosition,
  getRelativePosition,

  // Transit/movement
  calculateCourse,
  getTimeToDestination,
  moveAlongCourse,

  // Reference frame transforms
  systemToLocal,
  localToSystem,

  // Ship state
  updateOrbitingBody,

  // Star system data bridge (minimal integration)
  getLocationPosition,
  getDistanceBetweenLocations
};
