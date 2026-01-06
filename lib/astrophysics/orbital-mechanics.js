/**
 * Orbital Mechanics Module
 *
 * Calculates deterministic planetary positions based on:
 * - System-specific seed (from system name)
 * - Planet index (ensures no two planets have same initial position)
 * - Campaign date (elapsed time from epoch)
 * - Orbital period (Kepler's 3rd law)
 *
 * Reference epoch: 1100-001 00:00 (Day 1 of Year 1100)
 */

// Reference epoch - all orbital calculations relative to this
const EPOCH_YEAR = 1100;
const EPOCH_DAY = 1;

/**
 * Simple string hash for deterministic seeding
 * @param {string} str - String to hash
 * @returns {number} Hash value 0-359 (degrees)
 */
function hashToDegrees(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash % 360);
}

/**
 * Parse Imperial date string to components
 * Supports formats: "1115-310", "1115-310 14:00", "310-1115"
 * @param {string} dateStr - Date string
 * @returns {{ year: number, day: number, hours: number, minutes: number }}
 */
function parseImperialDate(dateStr) {
  if (!dateStr) return { year: EPOCH_YEAR, day: EPOCH_DAY, hours: 0, minutes: 0 };

  const [datePart, timePart] = dateStr.split(' ');
  const parts = datePart.split('-').map(Number);

  let year, day;
  if (parts[0] > 999) {
    // Format: YEAR-DAY (e.g., 1115-310)
    [year, day] = parts;
  } else {
    // Format: DAY-YEAR (e.g., 310-1115)
    [day, year] = parts;
  }

  const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
  return { year, day: day || 1, hours: hours || 0, minutes: minutes || 0 };
}

/**
 * Calculate days since epoch
 * @param {string} dateStr - Current Imperial date
 * @returns {number} Days since epoch
 */
function daysSinceEpoch(dateStr) {
  const date = parseImperialDate(dateStr);
  const epochDays = (EPOCH_YEAR * 365) + EPOCH_DAY;
  const currentDays = (date.year * 365) + date.day + (date.hours / 24) + (date.minutes / 1440);
  return currentDays - epochDays;
}

/**
 * Calculate orbital period in days using Kepler's 3rd law
 * Period = sqrt(a^3) years for circular orbits around 1 solar mass
 * @param {number} orbitAU - Orbital radius in AU
 * @returns {number} Orbital period in days
 */
function orbitalPeriodDays(orbitAU) {
  if (orbitAU <= 0) return 365; // Default to 1 year
  const periodYears = Math.pow(orbitAU, 1.5);
  return periodYears * 365;
}

/**
 * Calculate initial bearing for a planet (deterministic per system)
 * @param {string} systemName - Name of the star system
 * @param {number} planetIndex - Index of planet in system
 * @returns {number} Initial bearing in degrees (0-359)
 */
function getInitialBearing(systemName, planetIndex) {
  // Combine system name with planet index for unique seed
  const seed = `${systemName}-planet-${planetIndex}`;
  return hashToDegrees(seed);
}

/**
 * Calculate current orbital position
 * @param {Object} params
 * @param {string} params.systemName - Name of the star system
 * @param {number} params.planetIndex - Index of planet in system
 * @param {number} params.orbitAU - Orbital radius in AU
 * @param {string} params.currentDate - Current Imperial date string
 * @returns {number} Current bearing in degrees (0-359)
 */
function calculateOrbitalPosition({ systemName, planetIndex, orbitAU, currentDate }) {
  // Get deterministic initial position
  const initialBearing = getInitialBearing(systemName, planetIndex);

  // Calculate days since epoch
  const elapsedDays = daysSinceEpoch(currentDate);

  // Calculate orbital period
  const periodDays = orbitalPeriodDays(orbitAU);

  // Calculate how many degrees the planet has traveled
  const orbitsFraction = elapsedDays / periodDays;
  const degreesTraveled = orbitsFraction * 360;

  // Current position (initial + traveled, wrapped to 0-360)
  const currentBearing = (initialBearing + degreesTraveled) % 360;

  return currentBearing >= 0 ? currentBearing : currentBearing + 360;
}

/**
 * Calculate orbital positions for all planets in a system
 * @param {Object} system - System object with name and planets array
 * @param {string} currentDate - Current Imperial date
 * @returns {Map<number, number>} Map of planetIndex -> bearing
 */
function calculateSystemOrbits(system, currentDate) {
  const orbits = new Map();

  if (!system?.planets) return orbits;

  system.planets.forEach((planet, index) => {
    const bearing = calculateOrbitalPosition({
      systemName: system.name,
      planetIndex: index,
      orbitAU: planet.orbitAU || 1,
      currentDate
    });
    orbits.set(index, bearing);
  });

  return orbits;
}

/**
 * Get animation offset for visual eye candy
 * Adds a small animated movement on top of true position
 * @param {number} elapsedMs - Milliseconds since page load
 * @param {number} orbitAU - Orbital radius (outer planets animate slower)
 * @returns {number} Animation offset in degrees
 */
function getAnimationOffset(elapsedMs, orbitAU) {
  // Speed: inner planets (0.5 AU) animate faster than outer (10 AU)
  const speed = 0.001 / Math.sqrt(Math.max(0.1, orbitAU));
  return (elapsedMs * speed) % 360;
}

module.exports = {
  // Core calculations
  calculateOrbitalPosition,
  calculateSystemOrbits,
  getInitialBearing,
  orbitalPeriodDays,
  daysSinceEpoch,

  // Animation
  getAnimationOffset,

  // Utilities
  parseImperialDate,
  hashToDegrees,

  // Constants
  EPOCH_YEAR,
  EPOCH_DAY
};
