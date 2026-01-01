/**
 * AR-222: Astrophysics Engine
 *
 * Generates realistic star systems with:
 * - Goldilocks zone calculation based on stellar luminosity
 * - UWP-driven mainworld placement
 * - Gas giant variety (5 size classes)
 * - IMPORTANT: Moons orbit parent planet, NOT the star
 * - Deterministic seeded RNG for reproducibility
 */

// === STELLAR DATA ===
const STELLAR_DATA = {
  'O': { luminosity: 30000, temp: 40000, radius: 6.6, color: '#9bb0ff', name: 'Blue Giant' },
  'B': { luminosity: 25, temp: 20000, radius: 3.0, color: '#aabfff', name: 'Blue-White' },
  'A': { luminosity: 5, temp: 8500, radius: 1.7, color: '#cad7ff', name: 'White' },
  'F': { luminosity: 1.5, temp: 6500, radius: 1.2, color: '#f8f7ff', name: 'Yellow-White' },
  'G': { luminosity: 1.0, temp: 5800, radius: 1.0, color: '#fff4ea', name: 'Yellow (Sol-type)' },
  'K': { luminosity: 0.4, temp: 4500, radius: 0.8, color: '#ffd2a1', name: 'Orange' },
  'M': { luminosity: 0.04, temp: 3200, radius: 0.5, color: '#ffcc6f', name: 'Red Dwarf' },
  'L': { luminosity: 0.001, temp: 1800, radius: 0.1, color: '#ff6633', name: 'Brown Dwarf' },
  'D': { luminosity: 0.01, temp: 10000, radius: 0.01, color: '#ffffff', name: 'White Dwarf' },
  'T': { luminosity: 0.0001, temp: 1200, radius: 0.08, color: '#cc3300', name: 'Brown Dwarf' }
};

// === GAS GIANT TYPES ===
const GAS_GIANT_TYPES = [
  { name: 'Super-Jupiter', radiusKm: [70000, 90000], massEarth: [300, 1000], probability: 0.15 },
  { name: 'Jupiter-like', radiusKm: [50000, 70000], massEarth: [100, 300], probability: 0.35 },
  { name: 'Saturn-like', radiusKm: [35000, 50000], massEarth: [50, 100], probability: 0.25, hasRings: true },
  { name: 'Ice Giant', radiusKm: [20000, 35000], massEarth: [15, 50], probability: 0.20 },
  { name: 'Sub-Neptune', radiusKm: [15000, 20000], massEarth: [5, 15], probability: 0.05 }
];

// === DETERMINISTIC RNG ===
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
 * Generate a smart deterministic UID for a celestial object
 * Format: {hex}-{type}-{index} with hash suffix for uniqueness
 * These IDs are stable for DB override storage
 * @param {string} hex - System hex (e.g., '1910')
 * @param {string} type - Object type (e.g., 'star', 'planet', 'gas-giant', 'moon')
 * @param {number} index - Index within type
 * @param {string} parentId - Optional parent ID for moons
 * @returns {string} Deterministic UID
 */
function generateUID(hex, type, index, parentId = null) {
  const base = parentId
    ? `${hex}-${parentId}-${type}-${index}`
    : `${hex}-${type}-${index}`;
  // Add short hash suffix for collision resistance
  const hash = hashCode(base).toString(16).slice(0, 4);
  return `${base}-${hash}`;
}

// === GOLDILOCKS ZONE ===
/**
 * Calculate habitable zone boundaries based on stellar luminosity
 * @param {string} stellarClass - e.g., 'G2 V', 'K4 V', 'M2 V'
 * @returns {Object} { inner, outer, optimal } in AU
 */
function calculateGoldilocks(stellarClass) {
  const classLetter = stellarClass ? stellarClass[0].toUpperCase() : 'G';
  const L = STELLAR_DATA[classLetter]?.luminosity || 1.0;

  return {
    inner: Math.sqrt(L / 1.1),   // Too hot inside
    outer: Math.sqrt(L / 0.53),  // Too cold outside
    optimal: Math.sqrt(L)        // Earth-equivalent insolation
  };
}

// === MAINWORLD PLACEMENT ===
/**
 * Place mainworld based on UWP atmosphere
 * @param {string} uwp - Universal World Profile (e.g., 'A867974-C')
 * @param {Object} goldilocks - Zone boundaries from calculateGoldilocks()
 * @param {Function} rng - Seeded random function
 * @returns {number} Orbit distance in AU
 */
function placeMainworld(uwp, goldilocks, rng) {
  if (!uwp || uwp.length < 4) return goldilocks.optimal;

  const atmo = parseInt(uwp[2], 16);
  const size = parseInt(uwp[1], 16);

  // Standard atmosphere (4-6) → optimal goldilocks
  if (atmo >= 4 && atmo <= 6) {
    return goldilocks.optimal * (0.95 + rng() * 0.1);
  }
  // Thin atmosphere (2-3) → inner edge
  if (atmo >= 2 && atmo <= 3) {
    return goldilocks.inner * (1.05 + rng() * 0.15);
  }
  // Dense atmosphere (7-9) → outer edge
  if (atmo >= 7 && atmo <= 9) {
    return goldilocks.outer * (0.85 + rng() * 0.1);
  }
  // No atmosphere (0-1) or exotic (A+) → varies by size
  if (size > 5) {
    return goldilocks.outer * (1.2 + rng() * 0.5);
  }
  return goldilocks.inner * (0.4 + rng() * 0.3);
}

// === GAS GIANT GENERATION ===
/**
 * Generate a gas giant with proper variety
 * @param {string} stellarClass - Primary star class
 * @param {number} index - Which gas giant (0 = first, closest to frost line)
 * @param {number} seed - Random seed
 * @returns {Object} Gas giant data
 */
function generateGasGiant(stellarClass, index, seed) {
  const rng = seededRandom(seed);
  const goldilocks = calculateGoldilocks(stellarClass);

  // Position: beyond frost line (2-3x goldilocks outer edge)
  const frostLine = goldilocks.outer * 2.5;
  const orbitAU = frostLine + (index * frostLine * (0.5 + rng() * 0.5));

  // Select type based on probabilities (inner giants tend to be larger)
  let typeRoll = rng();
  if (index === 0) typeRoll *= 0.5;  // Bias toward larger types

  let selectedType = GAS_GIANT_TYPES[GAS_GIANT_TYPES.length - 1];
  let cumulative = 0;
  for (const type of GAS_GIANT_TYPES) {
    cumulative += type.probability;
    if (typeRoll < cumulative) {
      selectedType = type;
      break;
    }
  }

  const radiusKm = selectedType.radiusKm[0] +
    rng() * (selectedType.radiusKm[1] - selectedType.radiusKm[0]);

  return {
    id: `gas-giant-${index}`,
    type: 'Gas Giant',
    subtype: selectedType.name,
    name: `Gas Giant ${index + 1}`,
    orbitAU: orbitAU,
    radiusKm: Math.round(radiusKm),
    hasRings: selectedType.hasRings || rng() < 0.15,
    // Moons will be added later with planet-relative orbits
    moons: []
  };
}

// === MOON GENERATION ===
/**
 * Generate moons for a parent body
 * CRITICAL: Moons orbit their PARENT PLANET, not the star!
 * Moon positions are relative to parent, not absolute system coordinates.
 *
 * @param {Object} parent - Parent body (planet or gas giant)
 * @param {number} seed - Random seed
 * @param {string} sectorHex - Optional hex for smart UID generation
 * @returns {Object[]} Array of moon objects
 */
function generateMoons(parent, seed, sectorHex = null) {
  const rng = seededRandom(seed);
  const moons = [];

  // Determine moon count based on parent type
  let maxMoons = 0;
  if (parent.type === 'Gas Giant') {
    if (parent.subtype === 'Super-Jupiter') maxMoons = 8;
    else if (parent.subtype === 'Jupiter-like') maxMoons = 6;
    else if (parent.subtype === 'Saturn-like') maxMoons = 7;
    else maxMoons = 4;
  } else if (parent.radiusKm > 5000) {
    maxMoons = 2;
  } else {
    maxMoons = 1;
  }

  const moonCount = Math.floor(rng() * (maxMoons + 1));

  for (let i = 0; i < moonCount; i++) {
    // IMPORTANT: Moon orbit is relative to parent planet!
    // Distance is in planetary radii (e.g., 2.5 = 2.5x parent radius from center)
    const minOrbit = 1.5;  // Roche limit approximation
    const maxOrbit = 20 + (maxMoons * 5);  // Outer limit scales with system size
    const orbitRadii = minOrbit + rng() * (maxOrbit - minOrbit);

    // Convert to km for absolute positioning when needed
    const orbitKm = orbitRadii * parent.radiusKm;

    // Moon size (smaller moons further out)
    const sizeFactor = 1 - (orbitRadii / maxOrbit) * 0.5;
    const maxRadiusKm = parent.type === 'Gas Giant' ? 2500 : 1000;
    const radiusKm = 50 + rng() * maxRadiusKm * sizeFactor;

    // Smart UID: hex-parentId-moon-i-hash (or fallback to parent-based)
    const moonId = sectorHex
      ? generateUID(sectorHex, 'moon', i, parent.id)
      : `${parent.id}-moon-${i}`;

    moons.push({
      id: moonId,
      type: 'Moon',
      name: `${parent.name} ${String.fromCharCode(97 + i)}`,  // a, b, c, ...
      parentId: parent.id,
      // Moon position is RELATIVE to parent
      orbitRadii: orbitRadii,        // In parent radii
      orbitKm: Math.round(orbitKm),  // In km from parent center
      radiusKm: Math.round(radiusKm),
      // NOT stored: orbitAU (moons don't orbit the star!)
      _note: 'Moon orbit is relative to parent planet, not the star'
    });
  }

  return moons;
}

// === STAR GENERATION ===
function generateStar(stellarClass, seed) {
  const rng = seededRandom(seed);
  const classLetter = stellarClass ? stellarClass[0].toUpperCase() : 'G';
  const data = STELLAR_DATA[classLetter] || STELLAR_DATA['G'];
  const goldilocks = calculateGoldilocks(stellarClass);

  // Parse subclass (e.g., G2 → 2)
  const subclass = parseInt(stellarClass?.slice(1)) || 5;

  // Format habitableZone as string matching existing data format
  const hzInner = goldilocks.inner.toFixed(1);
  const hzOuter = goldilocks.outer.toFixed(1);

  return {
    id: 'primary-star',
    type: 'Star',
    name: 'Primary',
    orbitAU: 0,
    bearing: 0,
    radiusKm: Math.round(data.radius * 696340),  // Solar radii to km
    stellarClass: stellarClass || 'G2 V',
    stellarInfo: {
      temperature: `${(data.temp * 0.9).toFixed(0)}-${(data.temp * 1.1).toFixed(0)} K`,
      luminosity: `${(data.luminosity * 0.8).toFixed(1)}-${(data.luminosity * 1.2).toFixed(1)} Solar`,
      mass: `${(data.radius * 0.9).toFixed(1)}-${(data.radius * 1.1).toFixed(1)} Solar`,
      habitableZone: `${hzInner}-${hzOuter} AU`,
      description: data.name
    },
    color: data.color,
    cameraSettings: {
      zoomMultiplier: 0.15,
      offsetX: 0.25,
      offsetY: 0.1,
      description: 'Wide view with inner system visible'
    }
  };
}

// === ROCKY PLANET GENERATION ===
function generateRockyPlanet(goldilocks, zone, index, seed) {
  const rng = seededRandom(seed);

  let orbitAU;
  if (zone === 'inner') {
    orbitAU = goldilocks.inner * (0.3 + index * 0.25 + rng() * 0.15);
  } else {
    orbitAU = goldilocks.outer * (1.5 + index * 0.5 + rng() * 0.3);
  }

  const radiusKm = 2000 + rng() * 6000;  // 2000-8000 km

  return {
    id: `rocky-${zone}-${index}`,
    type: 'Planet',
    subtype: zone === 'inner' ? 'Rocky Inner' : 'Outer Dwarf',
    name: `Planet ${index + 1}`,
    orbitAU: orbitAU,
    radiusKm: Math.round(radiusKm),
    atmosphere: zone === 'inner' && rng() > 0.7 ? 'thin' : 'none'
  };
}

// === COMPLETE SYSTEM GENERATION ===
/**
 * Generate a complete star system
 * @param {string} sectorHex - Sector hex (e.g., '0101')
 * @param {string} uwp - Universal World Profile
 * @param {string} stellarClass - Primary star class
 * @param {number} gasGiantCount - Number of gas giants
 * @returns {Object[]} Array of celestial objects
 */
function generateSystem(sectorHex, uwp, stellarClass, gasGiantCount = 0) {
  const seed = hashCode(sectorHex);
  const rng = seededRandom(seed);
  const goldilocks = calculateGoldilocks(stellarClass);

  const objects = [];

  // 1. Primary star (smart UID: hex-star-0-hash)
  const star = generateStar(stellarClass, seed);
  star.id = generateUID(sectorHex, 'star', 0);
  objects.push(star);

  // 2. Inner rocky planets (0-2)
  const innerCount = Math.floor(rng() * 3);
  for (let i = 0; i < innerCount; i++) {
    const rocky = generateRockyPlanet(goldilocks, 'inner', i, seed + 10 + i);
    rocky.id = generateUID(sectorHex, 'inner-planet', i);
    objects.push(rocky);
  }

  // 3. Mainworld (in goldilocks zone)
  const mainworldOrbit = placeMainworld(uwp, goldilocks, rng);
  const inGoldilocks = mainworldOrbit >= goldilocks.inner && mainworldOrbit <= goldilocks.outer;
  const atmoCode = parseInt(uwp?.[2] || '0', 16);
  const atmospheres = ['None', 'Trace', 'Very Thin', 'Very Thin', 'Thin', 'Thin', 'Standard',
                       'Dense', 'Dense', 'Dense', 'Exotic', 'Corrosive', 'Insidious'];
  const mainworld = {
    id: generateUID(sectorHex, 'mainworld', 0),
    type: 'Planet',
    name: 'Mainworld',
    isMainworld: true,
    uwp: uwp,
    orbitAU: mainworldOrbit,
    bearing: Math.round(rng() * 360),
    radiusKm: 3000 + parseInt(uwp?.[1] || '5', 16) * 500,  // Size from UWP
    atmosphere: atmospheres[atmoCode] || 'Unknown',
    breathable: atmoCode >= 4 && atmoCode <= 9,
    inGoldilocks: inGoldilocks,
    cameraSettings: {
      zoomMultiplier: 0.8,
      offsetX: 0,
      offsetY: 0,
      description: 'Mainworld centered view'
    }
  };
  objects.push(mainworld);

  // Add mainworld moons with smart UIDs
  if (rng() > 0.5) {
    const mainMoons = generateMoons(mainworld, seed + 50, sectorHex);
    mainworld.moons = mainMoons;
    objects.push(...mainMoons);
  }

  // 4. Gas giants (beyond frost line)
  for (let i = 0; i < gasGiantCount; i++) {
    const gg = generateGasGiant(stellarClass, i, seed + 100 + i);
    gg.id = generateUID(sectorHex, 'gas-giant', i);
    objects.push(gg);

    // Add gas giant moons with smart UIDs
    const ggMoons = generateMoons(gg, seed + 200 + i * 10, sectorHex);
    gg.moons = ggMoons;
    objects.push(...ggMoons);
  }

  // 5. Outer ice dwarfs (occasional)
  if (rng() > 0.6) {
    const dwarf = generateRockyPlanet(goldilocks, 'outer', 0, seed + 300);
    dwarf.id = generateUID(sectorHex, 'outer-planet', 0);
    objects.push(dwarf);
  }

  return objects;
}

// === CAMERA OPTIMIZATION ===
/**
 * Calculate optimal camera position for system view
 * @param {Object[]} objects - Celestial objects
 * @param {number} seed - Random seed
 * @returns {Object} Camera settings
 */
function calculateOptimalCamera(objects, seed) {
  const rng = seededRandom(seed);

  // Find system extent
  const orbits = objects.filter(o => o.orbitAU).map(o => o.orbitAU);
  const maxOrbit = Math.max(...orbits, 1);

  // Find mainworld
  const mainworld = objects.find(o => o.isMainworld);
  const gasGiants = objects.filter(o => o.type === 'Gas Giant');

  let focusObject, zoom, offsetX, offsetY;

  if (mainworld && mainworld.orbitAU < maxOrbit * 0.5) {
    // Mainworld-centric view
    focusObject = mainworld.id;
    zoom = 50 / (maxOrbit * 0.6);
    offsetX = 0.2 + rng() * 0.1;
    offsetY = 0.05 + rng() * 0.1;
  } else if (gasGiants.length >= 2) {
    // Gas giant showcase
    focusObject = gasGiants[0].id;
    zoom = 50 / (maxOrbit * 0.8);
    offsetX = 0.25;
    offsetY = 0.12;
  } else {
    // Full system view
    focusObject = 'primary-star';
    zoom = 50 / (maxOrbit * 1.2);
    offsetX = 0;
    offsetY = 0;
  }

  return {
    zoom: Math.max(0.05, Math.min(5, zoom)),
    offsetX,
    offsetY,
    focusObject
  };
}

module.exports = {
  STELLAR_DATA,
  GAS_GIANT_TYPES,
  hashCode,
  seededRandom,
  generateUID,
  calculateGoldilocks,
  placeMainworld,
  generateGasGiant,
  generateMoons,
  generateStar,
  generateRockyPlanet,
  generateSystem,
  calculateOptimalCamera
};
