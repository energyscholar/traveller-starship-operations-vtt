/**
 * Realistic Star System Generator
 *
 * Generates physically plausible star systems with:
 * - Proper orbital spacing (modified Titius-Bode)
 * - Binary/trinary star handling with S-type/P-type zones
 * - Realistic planetary types by orbital distance
 * - Rare objects at appropriate frequencies
 * - Max 20 objects per system for data management
 *
 * Based on:
 * - Exoplanet statistics from Kepler/TESS missions
 * - N-body stability calculations
 * - Traveller canon for game compatibility
 */

const {
  STELLAR_TYPES,
  RARE_OBJECTS,
  parseSpectralClass,
  calculateStellarProperties,
  calculateHabitableZone,
  calculateBinaryOrbits
} = require('./stellar-physics');

// === CONFIGURATION ===
const MAX_OBJECTS_PER_SYSTEM = 20;  // Hard limit for data management
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// === SEEDED RNG ===
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Generate deterministic UID for celestial object
 */
function generateUID(hex, type, index, parentId = null) {
  const base = parentId
    ? `${hex}-${parentId}-${type}-${index}`
    : `${hex}-${type}-${index}`;
  const hash = hashCode(base).toString(16).slice(0, 4);
  return `${base}-${hash}`;
}

// === ORBITAL MECHANICS ===

/**
 * Generate orbital distances using modified Titius-Bode relation
 * Real planetary systems show roughly geometric spacing
 * @param {number} innerLimit - Inner orbital limit (AU)
 * @param {number} outerLimit - Outer orbital limit (AU)
 * @param {number} count - Number of orbits to generate
 * @param {Function} rng - Seeded random function
 * @returns {number[]} Array of orbital distances in AU
 */
function generateOrbitalDistances(innerLimit, outerLimit, count, rng) {
  if (count === 0) return [];

  const orbits = [];
  const ratio = Math.pow(outerLimit / innerLimit, 1 / count);

  // Add some randomness to spacing (±20%)
  let currentOrbit = innerLimit;
  for (let i = 0; i < count; i++) {
    const jitter = 0.8 + rng() * 0.4;  // 0.8-1.2
    orbits.push(currentOrbit * jitter);
    currentOrbit *= ratio;
  }

  return orbits.sort((a, b) => a - b);
}

/**
 * Check if orbit is in a resonance (3:2, 2:1, etc.)
 * Resonances can be stable or unstable
 */
function checkResonance(orbit1, orbit2) {
  const ratio = orbit2 / orbit1;
  const resonances = [
    { ratio: 1.5, name: '3:2', stable: true },
    { ratio: 2.0, name: '2:1', stable: true },
    { ratio: 2.5, name: '5:2', stable: false },
    { ratio: 3.0, name: '3:1', stable: false }
  ];

  for (const res of resonances) {
    if (Math.abs(ratio - res.ratio) < 0.1) {
      return res;
    }
  }
  return null;
}

// === PLANETARY TYPES ===

const PLANET_TYPES = {
  // Hot zone (< 0.5 AU equivalent)
  'hot': [
    { type: 'Molten', probability: 0.3, radiusRange: [2000, 8000], hasAtmosphere: false },
    { type: 'Hot Rocky', probability: 0.5, radiusRange: [3000, 8000], hasAtmosphere: 'thin' },
    { type: 'Hot Jupiter', probability: 0.2, radiusRange: [50000, 80000], hasAtmosphere: true }
  ],
  // Inner zone (0.5-1.5x HZ inner)
  'inner': [
    { type: 'Rocky', probability: 0.4, radiusRange: [3000, 8000], hasAtmosphere: 'variable' },
    { type: 'Super-Earth', probability: 0.3, radiusRange: [8000, 15000], hasAtmosphere: true },
    { type: 'Venus-like', probability: 0.2, radiusRange: [5000, 7000], hasAtmosphere: 'dense' },
    { type: 'Dwarf', probability: 0.1, radiusRange: [1000, 3000], hasAtmosphere: false }
  ],
  // Habitable zone
  'habitable': [
    { type: 'Terrestrial', probability: 0.4, radiusRange: [5000, 8000], hasAtmosphere: true },
    { type: 'Ocean World', probability: 0.2, radiusRange: [6000, 12000], hasAtmosphere: true },
    { type: 'Super-Earth', probability: 0.25, radiusRange: [8000, 15000], hasAtmosphere: true },
    { type: 'Mars-like', probability: 0.15, radiusRange: [3000, 5000], hasAtmosphere: 'thin' }
  ],
  // Outer zone (beyond frost line)
  'outer': [
    { type: 'Ice Giant', probability: 0.35, radiusRange: [20000, 35000], hasAtmosphere: true },
    { type: 'Gas Giant', probability: 0.35, radiusRange: [40000, 80000], hasAtmosphere: true },
    { type: 'Ice Dwarf', probability: 0.2, radiusRange: [1000, 3000], hasAtmosphere: 'trace' },
    { type: 'Sub-Neptune', probability: 0.1, radiusRange: [15000, 20000], hasAtmosphere: true }
  ],
  // Far outer (>20 AU equivalent)
  'farOuter': [
    { type: 'Kuiper Object', probability: 0.4, radiusRange: [500, 2000], hasAtmosphere: false },
    { type: 'Ice Dwarf', probability: 0.3, radiusRange: [1000, 3000], hasAtmosphere: 'trace' },
    { type: 'Captured Rogue', probability: 0.1, radiusRange: [3000, 15000], hasAtmosphere: 'variable' },
    { type: 'Distant Giant', probability: 0.2, radiusRange: [20000, 50000], hasAtmosphere: true }
  ]
};

// Gas giant subtypes
const GAS_GIANT_SUBTYPES = [
  { name: 'Super-Jupiter', radiusRange: [70000, 90000], massEarthRange: [300, 1000], probability: 0.15 },
  { name: 'Jupiter-like', radiusRange: [55000, 70000], massEarthRange: [100, 300], probability: 0.35 },
  { name: 'Saturn-like', radiusRange: [40000, 55000], massEarthRange: [50, 100], probability: 0.25, hasRings: true },
  { name: 'Ice Giant', radiusRange: [20000, 35000], massEarthRange: [14, 50], probability: 0.20 },
  { name: 'Mini-Neptune', radiusRange: [15000, 20000], massEarthRange: [5, 14], probability: 0.05 }
];

/**
 * Determine zone for a given orbit
 */
function getOrbitalZone(orbitAU, hz) {
  if (orbitAU < hz.inner * 0.5) return 'hot';
  if (orbitAU < hz.conservative) return 'inner';
  if (orbitAU <= hz.outerConservative) return 'habitable';
  if (orbitAU < hz.frostLine * 4) return 'outer';
  return 'farOuter';
}

/**
 * Select planet type based on orbital zone
 */
function selectPlanetType(zone, rng) {
  const types = PLANET_TYPES[zone] || PLANET_TYPES.outer;
  let roll = rng();
  let cumulative = 0;

  for (const type of types) {
    cumulative += type.probability;
    if (roll < cumulative) return type;
  }
  return types[types.length - 1];
}

/**
 * Select gas giant subtype
 */
function selectGasGiantSubtype(isInner, rng) {
  let roll = rng();
  // Inner gas giants (from migration) tend to be larger
  if (isInner) roll *= 0.6;

  let cumulative = 0;
  for (const subtype of GAS_GIANT_SUBTYPES) {
    cumulative += subtype.probability;
    if (roll < cumulative) return subtype;
  }
  return GAS_GIANT_SUBTYPES[1];  // Default Jupiter-like
}

// === ASTEROID BELT GENERATION ===

const BELT_TYPES = [
  { name: 'Inner Belt', composition: 'metallic', probability: 0.3 },
  { name: 'Main Belt', composition: 'rocky', probability: 0.5 },
  { name: 'Outer Belt', composition: 'icy', probability: 0.2 }
];

/**
 * Determine if there should be a belt at this orbit
 * Belts form where giant planet gravity prevents accretion
 */
function shouldHaveBelt(orbit, gasGiantOrbits, hz, rng) {
  // Check for nearby gas giant resonances
  for (const ggOrbit of gasGiantOrbits) {
    const ratio = orbit / ggOrbit;
    // 2:1 and 3:1 resonances with Jupiter create asteroid belts
    if (ratio > 0.3 && ratio < 0.5) {
      return rng() < 0.7;  // High probability near inner resonances
    }
  }
  return rng() < 0.1;  // Low base probability
}

// === MOON GENERATION ===

/**
 * Generate moons for a planet
 * Moon count and size depend on planet type
 */
function generateMoons(parent, seed, hex, rng) {
  const moons = [];

  // Determine max moons based on parent type
  let maxMoons = 0;
  const radiusKm = parent.radiusKm;

  if (radiusKm > 50000) maxMoons = 8;       // Gas giant
  else if (radiusKm > 20000) maxMoons = 5;  // Ice giant
  else if (radiusKm > 8000) maxMoons = 3;   // Super-Earth
  else if (radiusKm > 3000) maxMoons = 2;   // Terrestrial
  else maxMoons = 1;                         // Small

  // Reduce for hot zone (tidal stripping)
  if (parent.zone === 'hot') maxMoons = Math.floor(maxMoons * 0.3);

  const moonCount = Math.floor(rng() * (maxMoons + 1));

  for (let i = 0; i < moonCount; i++) {
    // Moon orbit in parent radii (Roche limit ~2.5 for fluid body)
    const minOrbit = 2.5;
    const maxOrbit = 30 + maxMoons * 5;
    const orbitRadii = minOrbit + rng() * (maxOrbit - minOrbit);

    // Moon size (smaller moons further out, generally)
    const sizeFactor = 1 - (orbitRadii / maxOrbit) * 0.6;
    const maxMoonRadius = radiusKm > 50000 ? 3000 : radiusKm * 0.3;
    const moonRadius = 50 + rng() * maxMoonRadius * sizeFactor;

    // Named moons for gas giants (a, b, c...), numbered for others
    const moonName = radiusKm > 20000
      ? `${parent.name} ${String.fromCharCode(97 + i)}`
      : `${parent.name} Moon ${i + 1}`;

    moons.push({
      id: generateUID(hex, 'moon', i, parent.id),
      type: 'Moon',
      name: moonName,
      parentId: parent.id,
      orbitRadii: Math.round(orbitRadii * 10) / 10,
      orbitKm: Math.round(orbitRadii * radiusKm),
      bearing: Math.round(rng() * 360),
      radiusKm: Math.round(moonRadius),
      tideLocked: orbitRadii < 10
    });
  }

  return moons;
}

// === MAIN SYSTEM GENERATOR ===

/**
 * Generate a complete star system
 * @param {Object} params - Generation parameters
 * @param {string} params.hex - Sector hex coordinate
 * @param {string} params.name - System name
 * @param {string} params.uwp - Universal World Profile
 * @param {string} params.stellar - Stellar classification (e.g., 'G2 V', 'M0 V M4 V')
 * @param {number} params.gasGiants - Number of gas giants (from UWP)
 * @param {number} params.belts - Number of planetoid belts
 * @param {Object} [params.wikiData] - Optional canonical wiki data
 * @returns {Object} Complete system data
 */
function generateSystem(params) {
  const { hex, name, uwp, stellar, gasGiants = 0, belts = 0, wikiData = null } = params;

  const seed = hashCode(hex + name);
  const rng = seededRandom(seed);
  const objects = [];

  // === PARSE STELLAR DATA ===
  const stars = parseSpectralClass(stellar);
  const isBinary = stars.length >= 2;
  const isTrinary = stars.length >= 3;

  // === GENERATE STARS ===
  const primaryProps = calculateStellarProperties(stars[0].type, stars[0].subclass, stars[0].lumClass);
  const hz = calculateHabitableZone(primaryProps.luminosity, primaryProps.temperature);

  // Primary star
  const primaryStar = {
    id: generateUID(hex, 'star', 0),
    type: 'Star',
    name: name,  // Primary star named after system
    stellarClass: `${stars[0].type}${stars[0].subclass} ${stars[0].lumClass}`,
    orbitAU: 0,
    bearing: 0,
    radiusKm: Math.round(primaryProps.radiusKm),
    temperature: primaryProps.temperature,
    luminosity: primaryProps.luminosity,
    color: primaryProps.color,
    description: primaryProps.name,
    habitableZone: {
      inner: Math.round(hz.inner * 100) / 100,
      outer: Math.round(hz.outer * 100) / 100,
      frostLine: Math.round(hz.frostLine * 100) / 100
    }
  };
  objects.push(primaryStar);

  let binaryData = null;

  // Secondary star (if binary)
  if (isBinary) {
    const secondaryProps = calculateStellarProperties(stars[1].type, stars[1].subclass, stars[1].lumClass);

    // Binary separation: 0.1-1000 AU with log distribution
    const separationAU = Math.pow(10, -1 + rng() * 4);
    binaryData = calculateBinaryOrbits(separationAU, primaryProps.mass, secondaryProps.mass, 0.1 + rng() * 0.5);

    const secondary = {
      id: generateUID(hex, 'star', 1),
      type: 'Star',
      name: `${name} B`,
      stellarClass: `${stars[1].type}${stars[1].subclass} ${stars[1].lumClass}`,
      orbitAU: separationAU,
      bearing: Math.round(rng() * 360),
      radiusKm: Math.round(secondaryProps.radiusKm),
      temperature: secondaryProps.temperature,
      luminosity: secondaryProps.luminosity,
      color: secondaryProps.color,
      description: secondaryProps.name,
      binaryRole: 'secondary'
    };
    objects.push(secondary);

    // Tertiary star (if trinary)
    if (isTrinary) {
      const tertiaryProps = calculateStellarProperties(stars[2].type, stars[2].subclass, stars[2].lumClass);
      const tertiarySep = separationAU * (5 + rng() * 10);  // Much further out

      const tertiary = {
        id: generateUID(hex, 'star', 2),
        type: 'Star',
        name: `${name} C`,
        stellarClass: `${stars[2].type}${stars[2].subclass} ${stars[2].lumClass}`,
        orbitAU: tertiarySep,
        bearing: Math.round(rng() * 360),
        radiusKm: Math.round(tertiaryProps.radiusKm),
        temperature: tertiaryProps.temperature,
        luminosity: tertiaryProps.luminosity,
        color: tertiaryProps.color,
        description: tertiaryProps.name,
        binaryRole: 'tertiary'
      };
      objects.push(tertiary);
    }
  }

  // === DETERMINE ORBITAL LIMITS ===
  let innerLimit = hz.inner * 0.2;  // Hot zone starts
  let outerLimit = hz.frostLine * 20;  // Far outer system

  // Binary system limits
  if (binaryData) {
    innerLimit = Math.max(innerLimit, 0.1);
    // S-type: planets only within stability limit around primary
    if (binaryData.separation < 10) {
      outerLimit = Math.min(outerLimit, binaryData.sType.primary.maxOrbit);
    }
  }

  // === GENERATE PLANETS ===
  // Count limits: reserve space for moons and belts
  const maxPlanets = Math.min(8, MAX_OBJECTS_PER_SYSTEM - objects.length - belts * 1 - gasGiants * 2);
  const planetCount = Math.min(maxPlanets, 2 + Math.floor(rng() * 5));

  // Generate orbital distances
  const orbits = generateOrbitalDistances(innerLimit, outerLimit, planetCount, rng);

  // Track gas giant orbits for belt placement
  const gasGiantOrbits = [];
  let gasGiantsPlaced = 0;
  let planetIndex = 0;

  for (let i = 0; i < orbits.length && objects.length < MAX_OBJECTS_PER_SYSTEM - 2; i++) {
    const orbitAU = orbits[i];
    const zone = getOrbitalZone(orbitAU, hz);

    // Decide: planet or gas giant?
    const isGasGiantOrbit = zone === 'outer' || zone === 'farOuter';
    const placeGasGiant = isGasGiantOrbit && gasGiantsPlaced < gasGiants && rng() < 0.7;

    if (placeGasGiant) {
      // Gas Giant
      const subtype = selectGasGiantSubtype(zone === 'inner', rng);
      const radius = subtype.radiusRange[0] + rng() * (subtype.radiusRange[1] - subtype.radiusRange[0]);

      const gg = {
        id: generateUID(hex, 'gas-giant', gasGiantsPlaced),
        type: 'Gas Giant',
        subtype: subtype.name,
        name: zone === 'outer' ? `${name} Major` : `${name} ${ROMAN_NUMERALS[planetIndex]}`,
        orbitAU: Math.round(orbitAU * 100) / 100,
        bearing: Math.round(rng() * 360),
        radiusKm: Math.round(radius),
        hasRings: subtype.hasRings || rng() < 0.2,
        zone,
        moons: []
      };

      // Generate moons
      if (objects.length < MAX_OBJECTS_PER_SYSTEM - 3) {
        gg.moons = generateMoons(gg, seed + 100 + gasGiantsPlaced, hex, rng);
        // Only add moons if we have space
        const moonsToAdd = gg.moons.slice(0, MAX_OBJECTS_PER_SYSTEM - objects.length - 1);
        objects.push(...moonsToAdd);
      }

      objects.push(gg);
      gasGiantOrbits.push(orbitAU);
      gasGiantsPlaced++;
    } else {
      // Rocky/terrestrial planet
      const planetType = selectPlanetType(zone, rng);
      const radius = planetType.radiusRange[0] + rng() * (planetType.radiusRange[1] - planetType.radiusRange[0]);

      const planet = {
        id: generateUID(hex, 'planet', planetIndex),
        type: 'Planet',
        subtype: planetType.type,
        name: `${name} ${ROMAN_NUMERALS[planetIndex]}`,
        orbitAU: Math.round(orbitAU * 100) / 100,
        bearing: Math.round(rng() * 360),
        radiusKm: Math.round(radius),
        zone,
        atmosphere: planetType.hasAtmosphere,
        moons: []
      };

      // Generate moons for larger planets
      if (radius > 5000 && objects.length < MAX_OBJECTS_PER_SYSTEM - 2) {
        planet.moons = generateMoons(planet, seed + 200 + planetIndex, hex, rng);
        const moonsToAdd = planet.moons.slice(0, MAX_OBJECTS_PER_SYSTEM - objects.length - 1);
        objects.push(...moonsToAdd);
      }

      objects.push(planet);
    }
    planetIndex++;
  }

  // Place remaining gas giants if needed
  while (gasGiantsPlaced < gasGiants && objects.length < MAX_OBJECTS_PER_SYSTEM - 1) {
    const orbitAU = hz.frostLine * (3 + gasGiantsPlaced * 2 + rng() * 2);
    const subtype = selectGasGiantSubtype(false, rng);
    const radius = subtype.radiusRange[0] + rng() * (subtype.radiusRange[1] - subtype.radiusRange[0]);

    const gg = {
      id: generateUID(hex, 'gas-giant', gasGiantsPlaced),
      type: 'Gas Giant',
      subtype: subtype.name,
      name: gasGiantsPlaced === 0 ? `${name} Major` : `${name} Minor`,
      orbitAU: Math.round(orbitAU * 100) / 100,
      bearing: Math.round(rng() * 360),
      radiusKm: Math.round(radius),
      hasRings: subtype.hasRings || rng() < 0.2,
      zone: 'outer',
      moons: []
    };

    objects.push(gg);
    gasGiantOrbits.push(orbitAU);
    gasGiantsPlaced++;
  }

  // === PLACE MAINWORLD ===
  // Find or create the mainworld based on UWP
  if (uwp && uwp.length >= 8) {
    const atmoCode = parseInt(uwp[2], 16) || 0;
    const sizeCode = parseInt(uwp[1], 16) || 5;

    // Calculate mainworld orbit from UWP
    let mainworldOrbit;
    if (atmoCode >= 4 && atmoCode <= 9) {
      // Breathable atmosphere → habitable zone
      mainworldOrbit = hz.optimal * (0.9 + rng() * 0.2);
    } else if (atmoCode <= 3) {
      // Thin/no atmosphere → inner zone
      mainworldOrbit = hz.inner * (0.5 + rng() * 0.3);
    } else {
      // Exotic atmosphere → varies
      mainworldOrbit = hz.outer * (0.8 + rng() * 0.4);
    }

    // Check if there's already a planet at similar orbit to designate
    let mainworldDesignated = false;
    for (const obj of objects) {
      if (obj.type === 'Planet' && Math.abs(obj.orbitAU - mainworldOrbit) < mainworldOrbit * 0.3) {
        obj.isMainworld = true;
        obj.name = name;
        obj.uwp = uwp;
        mainworldDesignated = true;
        break;
      }
    }

    // Create new mainworld if needed
    if (!mainworldDesignated && objects.length < MAX_OBJECTS_PER_SYSTEM) {
      const mainworld = {
        id: generateUID(hex, 'mainworld', 0),
        type: 'Planet',
        subtype: 'Mainworld',
        name: name,
        isMainworld: true,
        uwp: uwp,
        orbitAU: Math.round(mainworldOrbit * 100) / 100,
        bearing: Math.round(rng() * 360),
        radiusKm: 3000 + sizeCode * 800,
        zone: getOrbitalZone(mainworldOrbit, hz),
        atmosphere: getAtmosphereFromUWP(atmoCode),
        moons: []
      };
      objects.push(mainworld);
    }
  }

  // === ADD ASTEROID BELTS ===
  for (let i = 0; i < belts && objects.length < MAX_OBJECTS_PER_SYSTEM; i++) {
    // Place belt between planets or at typical locations
    let beltOrbit;
    if (gasGiantOrbits.length > 0 && i === 0) {
      // Inner belt: between mainworld and first gas giant
      beltOrbit = gasGiantOrbits[0] * (0.4 + rng() * 0.2);
    } else {
      // Outer belt
      beltOrbit = hz.frostLine * (1.5 + i * 2 + rng());
    }

    const belt = {
      id: generateUID(hex, 'belt', i),
      type: 'Belt',
      name: i === 0 ? `${name} Belt` : `Outer Belt ${i}`,
      orbitAU: Math.round(beltOrbit * 100) / 100,
      width: Math.round(beltOrbit * 0.2 * 100) / 100,  // 20% of orbit
      composition: i === 0 ? 'rocky' : 'icy'
    };
    objects.push(belt);
  }

  // === ADD RARE OBJECTS (occasional) ===
  for (const [key, rare] of Object.entries(RARE_OBJECTS)) {
    if (rng() < rare.probability && objects.length < MAX_OBJECTS_PER_SYSTEM) {
      if (key === 'hotJupiter' && gasGiantsPlaced > 0) continue;  // Already have gas giants

      const rareObj = {
        id: generateUID(hex, 'rare', 0),
        type: rare.type,
        name: `${rare.type}`,
        description: rare.description,
        orbitAU: key === 'hotJupiter' ? 0.05 + rng() * 0.1 : hz.frostLine * (10 + rng() * 20),
        bearing: Math.round(rng() * 360),
        radiusKm: rare.radiusKm || 5000 + rng() * 10000,
        hazardous: rare.hazardous || false,
        isRare: true
      };
      objects.push(rareObj);
      break;  // Only one rare object per system
    }
  }

  // === SORT BY ORBIT ===
  objects.sort((a, b) => (a.orbitAU || 0) - (b.orbitAU || 0));

  // === RETURN SYSTEM DATA ===
  return {
    hex,
    name,
    stellar: stellar || 'G2 V',
    uwp,
    objectCount: objects.length,
    isBinary,
    isTrinary,
    habitableZone: {
      inner: hz.inner,
      outer: hz.outer,
      frostLine: hz.frostLine
    },
    objects
  };
}

/**
 * Get atmosphere description from UWP code
 */
function getAtmosphereFromUWP(code) {
  const atmospheres = [
    'None', 'Trace', 'Very Thin Tainted', 'Very Thin',
    'Thin Tainted', 'Thin', 'Standard', 'Standard Tainted',
    'Dense', 'Dense Tainted', 'Exotic', 'Corrosive',
    'Insidious', 'Dense High', 'Thin Low', 'Unusual'
  ];
  return atmospheres[code] || 'Unknown';
}

module.exports = {
  generateSystem,
  generateOrbitalDistances,
  getOrbitalZone,
  selectPlanetType,
  generateMoons,
  MAX_OBJECTS_PER_SYSTEM,
  PLANET_TYPES,
  GAS_GIANT_SUBTYPES,
  BELT_TYPES
};
