/**
 * Stellar Physics Constants & Calculations
 *
 * Based on real astrophysics:
 * - Harvard spectral classification (OBAFGKM)
 * - Stefan-Boltzmann law for luminosity
 * - Habitable zone calculations from Kopparapu et al. (2013)
 * - Binary star orbital mechanics
 */

// === PHYSICAL CONSTANTS ===
const SOLAR_MASS_KG = 1.989e30;
const SOLAR_RADIUS_KM = 696340;
const SOLAR_LUMINOSITY = 3.828e26;  // Watts
const AU_KM = 149597870.7;
const EARTH_MASS_KG = 5.972e24;
const JUPITER_MASS_KG = 1.898e27;

// === STELLAR CLASSIFICATION ===
// Based on real stellar data from astronomy databases
const STELLAR_TYPES = {
  // Main Sequence Stars
  'O': {
    luminosity: [30000, 1000000],  // Solar luminosities (range)
    mass: [16, 150],               // Solar masses
    radius: [6.6, 20],             // Solar radii
    temp: [30000, 52000],          // Kelvin
    lifetime: [1, 10],             // Million years
    color: '#9bb0ff',
    name: 'Blue Giant',
    rarity: 0.00003                // Very rare
  },
  'B': {
    luminosity: [25, 30000], mass: [2.1, 16], radius: [1.8, 6.6],
    temp: [10000, 30000], lifetime: [10, 100], color: '#aabfff',
    name: 'Blue-White', rarity: 0.0013
  },
  'A': {
    luminosity: [5, 25], mass: [1.4, 2.1], radius: [1.4, 1.8],
    temp: [7500, 10000], lifetime: [100, 1000], color: '#cad7ff',
    name: 'White', rarity: 0.006
  },
  'F': {
    luminosity: [1.5, 5], mass: [1.04, 1.4], radius: [1.15, 1.4],
    temp: [6000, 7500], lifetime: [1000, 4000], color: '#f8f7ff',
    name: 'Yellow-White', rarity: 0.03
  },
  'G': {
    luminosity: [0.6, 1.5], mass: [0.8, 1.04], radius: [0.96, 1.15],
    temp: [5200, 6000], lifetime: [4000, 15000], color: '#fff4ea',
    name: 'Yellow (Sol-type)', rarity: 0.076
  },
  'K': {
    luminosity: [0.08, 0.6], mass: [0.45, 0.8], radius: [0.7, 0.96],
    temp: [3700, 5200], lifetime: [15000, 50000], color: '#ffd2a1',
    name: 'Orange Dwarf', rarity: 0.121
  },
  'M': {
    luminosity: [0.0001, 0.08], mass: [0.08, 0.45], radius: [0.1, 0.7],
    temp: [2400, 3700], lifetime: [50000, 1000000], color: '#ffcc6f',
    name: 'Red Dwarf', rarity: 0.765  // Most common!
  },

  // Stellar Remnants & Special Types
  'D': {  // White Dwarf
    luminosity: [0.0001, 0.01], mass: [0.5, 1.4], radius: [0.008, 0.02],
    temp: [4000, 40000], lifetime: [Infinity], color: '#ffffff',
    name: 'White Dwarf', rarity: 0.04,
    isRemnant: true,
    description: 'Compact remnant of low/medium mass star'
  },
  'N': {  // Neutron Star
    luminosity: [0.00001, 0.001], mass: [1.4, 2.1], radius: [0.00001, 0.00002],
    temp: [100000, 1000000], lifetime: [Infinity], color: '#aaaaff',
    name: 'Neutron Star', rarity: 0.001,
    isRemnant: true,
    description: 'Ultra-dense remnant of massive star supernova'
  },
  'L': {  // Brown Dwarf (L-type)
    luminosity: [0.00001, 0.001], mass: [0.013, 0.08], radius: [0.08, 0.12],
    temp: [1300, 2200], lifetime: [Infinity], color: '#ff6633',
    name: 'Brown Dwarf', rarity: 0.05,
    isSubstellar: true,
    description: 'Failed star - too small for hydrogen fusion'
  },
  'T': {  // Brown Dwarf (T-type, cooler)
    luminosity: [0.000001, 0.00001], mass: [0.013, 0.05], radius: [0.08, 0.1],
    temp: [700, 1300], lifetime: [Infinity], color: '#cc3300',
    name: 'Cool Brown Dwarf', rarity: 0.03,
    isSubstellar: true,
    description: 'Very cool brown dwarf with methane atmosphere'
  },
  'Y': {  // Brown Dwarf (Y-type, coldest)
    luminosity: [0.0000001, 0.000001], mass: [0.013, 0.03], radius: [0.08, 0.1],
    temp: [300, 700], lifetime: [Infinity], color: '#993300',
    name: 'Ultra-cool Brown Dwarf', rarity: 0.01,
    isSubstellar: true,
    description: 'Coldest brown dwarfs, nearly planet-like temperatures'
  },
  'III': { // Red Giant (luminosity class III)
    luminosity: [50, 1000], mass: [0.5, 10], radius: [10, 100],
    temp: [3000, 5000], lifetime: [100, 1000], color: '#ff9966',
    name: 'Red Giant', rarity: 0.02,
    isEvolved: true,
    description: 'Evolved star in helium-burning phase'
  }
};

// === LUMINOSITY CLASS MODIFIERS ===
const LUMINOSITY_CLASSES = {
  'Ia': { radiusMult: 100, lumMult: 10000, name: 'Bright Supergiant' },
  'Ib': { radiusMult: 50, lumMult: 5000, name: 'Supergiant' },
  'II': { radiusMult: 25, lumMult: 1000, name: 'Bright Giant' },
  'III': { radiusMult: 10, lumMult: 100, name: 'Giant' },
  'IV': { radiusMult: 2, lumMult: 5, name: 'Subgiant' },
  'V': { radiusMult: 1, lumMult: 1, name: 'Main Sequence' },
  'VI': { radiusMult: 0.8, lumMult: 0.5, name: 'Subdwarf' },
  'VII': { radiusMult: 0.01, lumMult: 0.001, name: 'White Dwarf' }
};

/**
 * Parse stellar classification string
 * @param {string} stellarClass - e.g., 'G2 V', 'K4 III', 'M2 V M5 V'
 * @returns {Object[]} Array of parsed star data
 */
function parseSpectralClass(stellarClass) {
  if (!stellarClass) return [{ type: 'G', subclass: 2, lumClass: 'V' }];

  const stars = [];
  // Match patterns like "G2 V", "K4 III", "M2", "D", etc.
  const pattern = /([OBAFGKMLTYNDIII]+)(\d)?(?:\s*(Ia|Ib|II|III|IV|V|VI|VII))?/gi;
  let match;

  while ((match = pattern.exec(stellarClass)) !== null) {
    const type = match[1].toUpperCase().charAt(0);
    const subclass = parseInt(match[2]) || 5;
    const lumClass = match[3] || 'V';

    if (STELLAR_TYPES[type]) {
      stars.push({ type, subclass, lumClass });
    }
  }

  return stars.length > 0 ? stars : [{ type: 'G', subclass: 2, lumClass: 'V' }];
}

/**
 * Calculate stellar properties from spectral class
 * @param {string} type - Spectral type (O, B, A, F, G, K, M, etc.)
 * @param {number} subclass - Subclass 0-9
 * @param {string} lumClass - Luminosity class (V, IV, III, etc.)
 * @returns {Object} Stellar properties
 */
function calculateStellarProperties(type, subclass = 5, lumClass = 'V') {
  const base = STELLAR_TYPES[type] || STELLAR_TYPES['G'];
  const lumMod = LUMINOSITY_CLASSES[lumClass] || LUMINOSITY_CLASSES['V'];

  // Interpolate within type based on subclass (0 = hot end, 9 = cool end)
  const t = subclass / 9;

  const luminosity = (base.luminosity[0] + t * (base.luminosity[1] - base.luminosity[0])) * lumMod.lumMult;
  const mass = base.mass[0] + t * (base.mass[1] - base.mass[0]);
  const radius = (base.radius[0] + t * (base.radius[1] - base.radius[0])) * lumMod.radiusMult;
  const temp = base.temp[1] - t * (base.temp[1] - base.temp[0]);

  return {
    luminosity,           // Solar luminosities
    mass,                 // Solar masses
    radius,               // Solar radii
    radiusKm: radius * SOLAR_RADIUS_KM,
    temperature: temp,    // Kelvin
    color: base.color,
    name: `${base.name}${lumMod.name !== 'Main Sequence' ? ` ${lumMod.name}` : ''}`,
    lifetime: base.lifetime,
    isRemnant: base.isRemnant || false,
    isSubstellar: base.isSubstellar || false,
    isEvolved: base.isEvolved || false
  };
}

/**
 * Calculate habitable zone boundaries
 * Based on Kopparapu et al. (2013) formulas
 * @param {number} luminosity - Stellar luminosity in Solar units
 * @param {number} temperature - Stellar effective temperature in Kelvin
 * @returns {Object} Habitable zone boundaries in AU
 */
function calculateHabitableZone(luminosity, temperature = 5780) {
  // Kopparapu coefficients for different HZ limits
  const teff = temperature - 5780;  // Offset from Sun

  // Conservative HZ (liquid water on surface)
  const recentVenus = 1.7763 + 1.4335e-4 * teff + 3.3954e-9 * teff * teff;
  const runawayGreenhouse = 1.0385 + 1.2456e-4 * teff + 1.4612e-8 * teff * teff;
  const maxGreenhouse = 0.3507 + 5.9578e-5 * teff + 1.6707e-9 * teff * teff;
  const earlyMars = 0.3207 + 5.4471e-5 * teff + 1.5275e-9 * teff * teff;

  const sqrtL = Math.sqrt(luminosity);

  return {
    inner: sqrtL / Math.sqrt(recentVenus),        // Venus-like (too hot)
    conservative: sqrtL / Math.sqrt(runawayGreenhouse),  // Conservative inner
    optimal: sqrtL,                                // Earth-equivalent
    outerConservative: sqrtL / Math.sqrt(maxGreenhouse), // Conservative outer
    outer: sqrtL / Math.sqrt(earlyMars),          // Mars-like (too cold)
    frostLine: sqrtL * 2.7                        // Water ice condenses
  };
}

/**
 * Calculate binary star orbital mechanics
 * Determines stable zones for S-type and P-type planetary orbits
 * @param {number} separation - Binary separation in AU
 * @param {number} mass1 - Primary mass in Solar masses
 * @param {number} mass2 - Secondary mass in Solar masses
 * @param {number} eccentricity - Orbital eccentricity (0-1)
 * @returns {Object} Stable orbital zones
 */
function calculateBinaryOrbits(separation, mass1, mass2, eccentricity = 0.3) {
  const totalMass = mass1 + mass2;
  const massRatio = mass2 / mass1;

  // Holman & Wiegert (1999) stability limits
  const perihelion = separation * (1 - eccentricity);
  const aphelion = separation * (1 + eccentricity);

  // S-type orbits (around one star)
  // Critical semi-major axis: a_crit = 0.464 * a_bin * (1 - e)
  const sTypeLimit = 0.464 * separation * (1 - 0.38 * eccentricity - 0.631 * massRatio);

  // P-type orbits (around both stars)
  // Minimum safe distance: a_min = 1.6 * a_bin * (1 + e)
  const pTypeMinimum = 1.6 * separation * (1 + eccentricity);

  // Binary orbital period (Kepler's third law)
  const orbitalPeriod = Math.sqrt(Math.pow(separation, 3) / totalMass);  // Years

  return {
    separation,
    perihelion,
    aphelion,
    sType: {
      primary: { maxOrbit: sTypeLimit, stable: true },
      secondary: { maxOrbit: sTypeLimit * massRatio, stable: massRatio > 0.1 }
    },
    pType: {
      minOrbit: pTypeMinimum,
      stable: true
    },
    orbitalPeriod,
    barycenter: separation * mass2 / totalMass
  };
}

// === RARE STELLAR OBJECTS (Traveller Canon) ===
const RARE_OBJECTS = {
  'pulsar': {
    probability: 0.0001,  // Very rare
    type: 'Pulsar',
    description: 'Rapidly rotating neutron star emitting radio beams',
    hazardous: true,
    radiusKm: 10,
    rotationPeriod: '0.001-30 seconds'
  },
  'magnetar': {
    probability: 0.00001,  // Extremely rare
    type: 'Magnetar',
    description: 'Neutron star with extreme magnetic field',
    hazardous: true,
    radiusKm: 10
  },
  'blackHole': {
    probability: 0.00001,  // Extremely rare (stellar mass)
    type: 'Black Hole',
    description: 'Collapsed massive star - event horizon',
    hazardous: true,
    radiusKm: 30  // Schwarzschild radius for ~10 solar masses
  },
  'roguePlanet': {
    probability: 0.05,  // Fairly common (captured)
    type: 'Rogue Planet',
    description: 'Planet ejected from original system, now captured',
    hazardous: false
  },
  'hotJupiter': {
    probability: 0.01,  // ~1% of systems (from migration)
    type: 'Hot Jupiter',
    description: 'Gas giant in very close orbit (migration)',
    hazardous: false
  },
  'protoplanetaryDisk': {
    probability: 0.001,  // Young systems only
    type: 'Protoplanetary Disk',
    description: 'Disk of gas and dust - forming planets',
    hazardous: false
  }
};

module.exports = {
  // Constants
  SOLAR_MASS_KG,
  SOLAR_RADIUS_KM,
  SOLAR_LUMINOSITY,
  AU_KM,
  EARTH_MASS_KG,
  JUPITER_MASS_KG,

  // Data
  STELLAR_TYPES,
  LUMINOSITY_CLASSES,
  RARE_OBJECTS,

  // Functions
  parseSpectralClass,
  calculateStellarProperties,
  calculateHabitableZone,
  calculateBinaryOrbits
};
