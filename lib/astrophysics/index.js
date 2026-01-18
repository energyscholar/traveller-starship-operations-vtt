/**
 * Astrophysics Module Index
 *
 * Provides realistic star system generation based on:
 * - Real stellar physics and classification
 * - Exoplanet statistics from Kepler/TESS
 * - Binary/trinary orbital mechanics
 * - Traveller RPG canon compatibility
 */

const stellarPhysics = require('./stellar-physics');
const systemGenerator = require('./system-generator');

module.exports = {
  // Re-export all stellar physics
  ...stellarPhysics,

  // Re-export system generator
  ...systemGenerator
};
