/**
 * AR-250: System Map Calculations Module
 *
 * Pure math and physics functions for system map.
 * No state, no rendering - just calculations.
 *
 * @module system-map-calculations
 */

// Physical constants
export const CONSTANTS = {
  AU_IN_KM: 149597870.7,  // 1 AU in kilometers
  G_IN_MS2: 9.81,         // 1G in m/s²
  SECONDS_PER_HOUR: 3600,
  HOURS_PER_DAY: 24
};

/**
 * Convert AU to kilometers
 * @param {number} au - Distance in AU
 * @returns {number} Distance in km
 */
export function auToKm(au) {
  return au * CONSTANTS.AU_IN_KM;
}

/**
 * Convert kilometers to AU
 * @param {number} km - Distance in km
 * @returns {number} Distance in AU
 */
export function kmToAu(km) {
  return km / CONSTANTS.AU_IN_KM;
}

/**
 * Calculate AU to pixels conversion at given zoom
 * @param {number} baseAuToPixels - Base AU to pixels ratio
 * @param {number} zoom - Current zoom level
 * @returns {number} Pixels per AU
 */
export function getAuToPixels(baseAuToPixels, zoom) {
  return baseAuToPixels * zoom;
}

/**
 * Get Y-axis scale for isometric view
 * @param {string} viewMode - 'isometric' or 'topdown'
 * @returns {number} Y scale factor
 */
export function getYScale(viewMode) {
  return viewMode === 'isometric' ? 0.3 : 1.0;
}

/**
 * Calculate orbital position at given time
 * @param {number} orbitAU - Orbital radius in AU
 * @param {number} time - Current time value
 * @param {number} orbitalPeriod - Orbital period (optional)
 * @param {number} initialAngle - Starting angle in radians (optional)
 * @returns {object} {x, y} position in AU
 */
export function getOrbitPosition(orbitAU, time, orbitalPeriod = null, initialAngle = 0) {
  // Default period based on Kepler's third law approximation
  const period = orbitalPeriod || Math.sqrt(orbitAU * orbitAU * orbitAU) * 365.25;
  const angle = initialAngle + (time / period) * 2 * Math.PI;

  return {
    x: orbitAU * Math.cos(angle),
    y: orbitAU * Math.sin(angle)
  };
}

/**
 * Convert world coordinates to screen coordinates
 * @param {number} worldX - X in AU
 * @param {number} worldY - Y in AU
 * @param {number} centerX - Screen center X
 * @param {number} centerY - Screen center Y
 * @param {number} auToPixels - Pixels per AU
 * @param {number} offsetX - View offset X
 * @param {number} offsetY - View offset Y
 * @param {number} yScale - Y-axis scale factor
 * @returns {object} {x, y} screen coordinates
 */
export function worldToScreen(worldX, worldY, centerX, centerY, auToPixels, offsetX, offsetY, yScale = 1.0) {
  return {
    x: centerX + worldX * auToPixels + offsetX,
    y: centerY + worldY * auToPixels * yScale + offsetY
  };
}

/**
 * Convert screen coordinates to world coordinates
 * @param {number} screenX - Screen X
 * @param {number} screenY - Screen Y
 * @param {number} centerX - Screen center X
 * @param {number} centerY - Screen center Y
 * @param {number} auToPixels - Pixels per AU
 * @param {number} offsetX - View offset X
 * @param {number} offsetY - View offset Y
 * @param {number} yScale - Y-axis scale factor
 * @returns {object} {x, y} world coordinates in AU
 */
export function screenToWorld(screenX, screenY, centerX, centerY, auToPixels, offsetX, offsetY, yScale = 1.0) {
  return {
    x: (screenX - centerX - offsetX) / auToPixels,
    y: (screenY - centerY - offsetY) / (auToPixels * yScale)
  };
}

/**
 * Calculate distance between two points
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number} Distance
 */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance in AU between two points
 * @param {object} p1 - {x, y} in AU
 * @param {object} p2 - {x, y} in AU
 * @returns {number} Distance in AU
 */
export function distanceAU(p1, p2) {
  return distance(p1.x, p1.y, p2.x, p2.y);
}

/**
 * Calculate brachistochrone travel time
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} thrustG - Thrust in G
 * @returns {object} Travel calculation result
 */
export function calculateTravelTime(distanceKm, thrustG = 1) {
  if (distanceKm <= 0 || thrustG <= 0) {
    return { hours: 0, formatted: '0h' };
  }

  const distanceM = distanceKm * 1000;
  const accelMS2 = thrustG * CONSTANTS.G_IN_MS2;

  // t = 2 * sqrt(d / a) for brachistochrone trajectory
  const timeSeconds = 2 * Math.sqrt(distanceM / accelMS2);
  const timeHours = timeSeconds / CONSTANTS.SECONDS_PER_HOUR;

  return {
    seconds: timeSeconds,
    hours: timeHours,
    days: timeHours / CONSTANTS.HOURS_PER_DAY,
    turnoverKm: distanceKm / 2,
    formatted: formatTravelTime(timeHours)
  };
}

/**
 * Calculate travel time from AU distance
 * @param {number} distanceAU - Distance in AU
 * @param {number} thrustG - Thrust in G
 * @returns {object} Travel calculation result
 */
export function calculateTravelTimeAU(distanceAU, thrustG = 1) {
  return calculateTravelTime(auToKm(distanceAU), thrustG);
}

/**
 * Format travel time for display
 * @param {number} hours - Time in hours
 * @returns {string} Formatted time string
 */
export function formatTravelTime(hours) {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  const days = hours / 24;
  if (days < 7) {
    return `${days.toFixed(1)}d`;
  }
  const weeks = days / 7;
  return `${weeks.toFixed(1)}w`;
}

/**
 * Format distance for display
 * @param {number} km - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export function formatDistance(km) {
  if (km < 1000) {
    return `${Math.round(km)} km`;
  }
  if (km < 1000000) {
    return `${(km / 1000).toFixed(1)}k km`;
  }
  if (km < CONSTANTS.AU_IN_KM * 0.1) {
    return `${(km / 1000000).toFixed(2)}M km`;
  }
  return `${kmToAu(km).toFixed(3)} AU`;
}

/**
 * Calculate maximum velocity at turnover
 * @param {number} distanceKm - Distance in km
 * @param {number} thrustG - Thrust in G
 * @returns {number} Max velocity in km/s
 */
export function calculateMaxVelocity(distanceKm, thrustG) {
  const distanceM = distanceKm * 1000;
  const accelMS2 = thrustG * CONSTANTS.G_IN_MS2;
  const maxVelocityMS = Math.sqrt(accelMS2 * distanceM);
  return maxVelocityMS / 1000;
}

/**
 * Calculate body position at given time
 * @param {object} body - Body object with orbit data
 * @param {number} time - Current time
 * @returns {object} {x, y} position in AU
 */
export function getBodyPosition(body, time) {
  if (!body || !body.orbit) {
    return { x: 0, y: 0 };
  }

  const orbitAU = body.orbit.semiMajorAxis || body.orbit.radius || 1;
  const period = body.orbit.period || null;
  const initialAngle = body.orbit.initialAngle || 0;

  return getOrbitPosition(orbitAU, time, period, initialAngle);
}

/**
 * Check if point is within circle
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} cx - Circle center X
 * @param {number} cy - Circle center Y
 * @param {number} radius - Circle radius
 * @returns {boolean}
 */
export function pointInCircle(px, py, cx, cy, radius) {
  return distance(px, py, cx, cy) <= radius;
}

/**
 * Clamp a value between min and max
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Ease-out interpolation (deceleration)
 * @param {number} t - Time factor (0-1)
 * @returns {number}
 */
export function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}
