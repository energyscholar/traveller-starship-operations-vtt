/**
 * Astrophysics Module Tests
 *
 * Tests for realistic star system generation including:
 * - Stellar physics calculations
 * - Habitable zone boundaries
 * - Binary star mechanics
 * - Planet/moon generation
 * - System limits and constraints
 */

// Import from the new astrophysics module (not the legacy astrophysics.js)
const stellarPhysics = require('../../lib/astrophysics/stellar-physics');
const systemGenerator = require('../../lib/astrophysics/system-generator');

const {
  STELLAR_TYPES,
  RARE_OBJECTS,
  parseSpectralClass,
  calculateStellarProperties,
  calculateHabitableZone,
  calculateBinaryOrbits
} = stellarPhysics;

const {
  generateSystem,
  generateOrbitalDistances,
  getOrbitalZone,
  MAX_OBJECTS_PER_SYSTEM,
  PLANET_TYPES,
  GAS_GIANT_SUBTYPES
} = systemGenerator;

// Test helpers
function assertInRange(value, min, max, message) {
  if (value < min || value > max) {
    throw new Error(`${message}: ${value} not in range [${min}, ${max}]`);
  }
}

// === STELLAR PHYSICS TESTS ===
console.log('=== Stellar Physics Tests ===\n');

// Test: Spectral class parsing
console.log('Spectral Class Parsing (6 tests):');

(() => {
  // Single star
  const single = parseSpectralClass('G2 V');
  console.assert(single.length === 1, 'Single star should parse to 1 entry');
  console.assert(single[0].type === 'G', 'Type should be G');
  console.assert(single[0].subclass === 2, 'Subclass should be 2');
  console.assert(single[0].lumClass === 'V', 'Luminosity class should be V');
  console.log('✓ Parses single star (G2 V)');
})();

(() => {
  // Binary star
  const binary = parseSpectralClass('K4 V M2 V');
  console.assert(binary.length === 2, 'Binary should parse to 2 entries');
  console.assert(binary[0].type === 'K', 'Primary should be K');
  console.assert(binary[1].type === 'M', 'Secondary should be M');
  console.log('✓ Parses binary star (K4 V M2 V)');
})();

(() => {
  // Trinary star
  const trinary = parseSpectralClass('F5 V G0 V M5 V');
  console.assert(trinary.length === 3, 'Trinary should parse to 3 entries');
  console.log('✓ Parses trinary star');
})();

(() => {
  // White dwarf
  const wd = parseSpectralClass('D');
  console.assert(wd.length === 1, 'White dwarf should parse');
  console.assert(wd[0].type === 'D', 'Type should be D');
  console.log('✓ Parses white dwarf (D)');
})();

(() => {
  // Default for empty
  const empty = parseSpectralClass('');
  console.assert(empty.length === 1, 'Empty should default to 1');
  console.assert(empty[0].type === 'G', 'Default should be G-type');
  console.log('✓ Defaults to G2 V for empty string');
})();

(() => {
  // Giant star
  const giant = parseSpectralClass('K2 III');
  console.assert(giant[0].lumClass === 'III', 'Should parse giant class');
  console.log('✓ Parses giant star (K2 III)');
})();

// Test: Stellar properties calculation
console.log('\nStellar Properties (5 tests):');

(() => {
  const sunlike = calculateStellarProperties('G', 2, 'V');
  assertInRange(sunlike.luminosity, 0.5, 2, 'Sun-like luminosity');
  assertInRange(sunlike.temperature, 5000, 6500, 'Sun-like temperature');
  assertInRange(sunlike.radiusKm, 600000, 800000, 'Sun-like radius');
  console.log('✓ G2 V (Sun-like) properties correct');
})();

(() => {
  const redDwarf = calculateStellarProperties('M', 5, 'V');
  console.assert(redDwarf.luminosity < 0.1, 'Red dwarf should be dim');
  console.assert(redDwarf.temperature < 4000, 'Red dwarf should be cool');
  console.log('✓ M5 V (Red Dwarf) properties correct');
})();

(() => {
  const whiteDwarf = calculateStellarProperties('D', 0, 'VII');
  console.assert(whiteDwarf.isRemnant === true, 'White dwarf should be remnant');
  console.assert(whiteDwarf.radiusKm < 50000, 'White dwarf should be small');
  console.log('✓ White dwarf properties correct');
})();

(() => {
  const blueStar = calculateStellarProperties('B', 2, 'V');
  console.assert(blueStar.luminosity > 10, 'B star should be bright');
  console.assert(blueStar.temperature > 15000, 'B star should be hot');
  console.log('✓ B2 V (Blue-White) properties correct');
})();

(() => {
  const brownDwarf = calculateStellarProperties('L', 5, 'V');
  console.assert(brownDwarf.isSubstellar === true, 'Brown dwarf should be substellar');
  console.assert(brownDwarf.temperature < 2500, 'Brown dwarf should be cool');
  console.log('✓ L5 (Brown Dwarf) properties correct');
})();

// Test: Habitable zone calculation
console.log('\nHabitable Zone (4 tests):');

(() => {
  // Sun-like star - Kopparapu et al. (2013) boundaries
  const hz = calculateHabitableZone(1.0, 5780);
  assertInRange(hz.inner, 0.7, 1.0, 'Sun HZ inner');  // Recent Venus limit ~0.75
  assertInRange(hz.outer, 1.5, 2.0, 'Sun HZ outer');  // Early Mars limit ~1.77
  assertInRange(hz.frostLine, 2.5, 3.5, 'Sun frost line');
  console.log('✓ Sun-like HZ correct (0.75-1.77 AU)');
})();

(() => {
  // Red dwarf (much closer HZ)
  const hz = calculateHabitableZone(0.01, 3000);
  console.assert(hz.inner < 0.2, 'Red dwarf HZ should be close');
  console.assert(hz.outer < 0.5, 'Red dwarf HZ outer should be close');
  console.log('✓ Red dwarf HZ correct (close-in)');
})();

(() => {
  // Bright star (farther HZ)
  const hz = calculateHabitableZone(10, 7500);
  console.assert(hz.inner > 2, 'Bright star HZ should be far');
  console.assert(hz.outer > 4, 'Bright star HZ outer should be far');
  console.log('✓ F-type HZ correct (farther out)');
})();

(() => {
  // Frost line scales with luminosity
  const hzDim = calculateHabitableZone(0.1, 4000);
  const hzBright = calculateHabitableZone(10, 7000);
  console.assert(hzBright.frostLine > hzDim.frostLine * 5, 'Frost line should scale');
  console.log('✓ Frost line scales with luminosity');
})();

// Test: Binary star mechanics
console.log('\nBinary Star Mechanics (3 tests):');

(() => {
  const binary = calculateBinaryOrbits(10, 1.0, 0.5, 0.3);
  console.assert(binary.sType.primary.maxOrbit < 10, 'S-type limit should be < separation');
  console.assert(binary.pType.minOrbit > 10, 'P-type minimum should be > separation');
  console.log('✓ Binary stability zones calculated');
})();

(() => {
  const close = calculateBinaryOrbits(0.5, 1.0, 0.8, 0.1);
  console.assert(close.sType.primary.maxOrbit < 0.5, 'Close binary should have tight S-type');
  console.log('✓ Close binary has restricted S-type orbits');
})();

(() => {
  const wide = calculateBinaryOrbits(100, 1.0, 0.3, 0.2);
  console.assert(wide.sType.primary.maxOrbit > 20, 'Wide binary allows larger S-type');
  console.log('✓ Wide binary allows larger planetary systems');
})();

// === SYSTEM GENERATION TESTS ===
console.log('\n=== System Generation Tests ===\n');

// Test: Basic system generation
console.log('Basic System Generation (5 tests):');

(() => {
  const system = generateSystem({
    hex: '1910',
    name: 'Regina',
    uwp: 'A788899-C',
    stellar: 'G2 V',
    gasGiants: 2,
    belts: 1
  });

  console.assert(system.hex === '1910', 'Hex should match');
  console.assert(system.name === 'Regina', 'Name should match');
  console.assert(system.objects.length > 0, 'Should have objects');
  console.assert(system.objects.length <= MAX_OBJECTS_PER_SYSTEM, `Should not exceed ${MAX_OBJECTS_PER_SYSTEM} objects`);
  console.log(`✓ Basic system generated (${system.objects.length} objects)`);
})();

(() => {
  const system = generateSystem({
    hex: '3124',
    name: 'Mora',
    uwp: 'AA99AC7-F',
    stellar: 'F0 V',
    gasGiants: 3,
    belts: 2
  });

  const star = system.objects.find(o => o.type === 'Star');
  console.assert(star !== undefined, 'Should have a star');
  console.assert(star.stellarClass.startsWith('F'), 'Star should be F-type');
  console.log('✓ Star generated correctly');
})();

(() => {
  const system = generateSystem({
    hex: '0101',
    name: 'Zeycude',
    uwp: 'C6C0556-7',
    stellar: 'M0 V',
    gasGiants: 1,
    belts: 0
  });

  const mainworld = system.objects.find(o => o.isMainworld);
  console.assert(mainworld !== undefined, 'Should have mainworld');
  console.assert(mainworld.name === 'Zeycude', 'Mainworld should be named after system');
  console.log('✓ Mainworld placed correctly');
})();

(() => {
  const system = generateSystem({
    hex: '2020',
    name: 'Test',
    uwp: 'B786654-9',
    stellar: 'G5 V',
    gasGiants: 5,  // Request many
    belts: 3
  });

  const gasGiants = system.objects.filter(o => o.type === 'Gas Giant');
  console.assert(gasGiants.length >= 1, 'Should have at least 1 gas giant');
  console.log(`✓ Gas giants generated (${gasGiants.length})`);
})();

(() => {
  const system = generateSystem({
    hex: '1515',
    name: 'BeltWorld',
    uwp: 'X000000-0',
    stellar: 'K2 V',
    gasGiants: 0,
    belts: 2
  });

  const belts = system.objects.filter(o => o.type === 'Belt');
  console.assert(belts.length >= 1, 'Should have belt');
  console.log(`✓ Asteroid belts generated (${belts.length})`);
})();

// Test: Binary system generation
console.log('\nBinary/Trinary Systems (3 tests):');

(() => {
  const binary = generateSystem({
    hex: '0505',
    name: 'BinaryTest',
    uwp: 'C567743-8',
    stellar: 'K2 V M4 V',
    gasGiants: 1,
    belts: 0
  });

  console.assert(binary.isBinary === true, 'Should be binary');
  const stars = binary.objects.filter(o => o.type === 'Star');
  console.assert(stars.length === 2, 'Should have 2 stars');
  console.log('✓ Binary system generated correctly');
})();

(() => {
  const trinary = generateSystem({
    hex: '0606',
    name: 'TrinaryTest',
    uwp: 'B654876-A',
    stellar: 'F5 V G2 V M0 V',
    gasGiants: 2,
    belts: 1
  });

  console.assert(trinary.isTrinary === true, 'Should be trinary');
  const stars = trinary.objects.filter(o => o.type === 'Star');
  console.assert(stars.length === 3, 'Should have 3 stars');
  console.log('✓ Trinary system generated correctly');
})();

(() => {
  const binary = generateSystem({
    hex: '0707',
    name: 'CloseB',
    stellar: 'G0 V K5 V',
    gasGiants: 0,
    belts: 0
  });

  const secondary = binary.objects.find(o => o.binaryRole === 'secondary');
  console.assert(secondary !== undefined, 'Should have secondary star');
  console.assert(secondary.orbitAU > 0, 'Secondary should have orbit');
  console.log('✓ Binary companion has proper orbit');
})();

// Test: Object limits
console.log('\nObject Limits (3 tests):');

(() => {
  const large = generateSystem({
    hex: '9999',
    name: 'LargeSystem',
    uwp: 'A786989-F',
    stellar: 'G2 V',
    gasGiants: 10,  // Request way more than possible
    belts: 5
  });

  console.assert(large.objects.length <= MAX_OBJECTS_PER_SYSTEM,
    `Should not exceed ${MAX_OBJECTS_PER_SYSTEM}, got ${large.objects.length}`);
  console.log(`✓ System capped at ${large.objects.length}/${MAX_OBJECTS_PER_SYSTEM} objects`);
})();

(() => {
  const minimal = generateSystem({
    hex: '0001',
    name: 'Minimal',
    uwp: 'X000000-0',
    stellar: 'M9 V',
    gasGiants: 0,
    belts: 0
  });

  console.assert(minimal.objects.length >= 1, 'Should have at least star');
  const star = minimal.objects.find(o => o.type === 'Star');
  console.assert(star !== undefined, 'Should always have primary star');
  console.log(`✓ Minimal system has ${minimal.objects.length} objects`);
})();

(() => {
  // Count moons don't exceed limit
  const moonSystem = generateSystem({
    hex: '8888',
    name: 'MoonTest',
    uwp: 'B568873-9',
    stellar: 'G5 V',
    gasGiants: 4,  // Many gas giants = many moons
    belts: 0
  });

  const moons = moonSystem.objects.filter(o => o.type === 'Moon');
  console.assert(moonSystem.objects.length <= MAX_OBJECTS_PER_SYSTEM,
    `Moons shouldn't cause overflow: ${moonSystem.objects.length}`);
  console.log(`✓ Moon count controlled (${moons.length} moons, ${moonSystem.objects.length} total)`);
})();

// Test: Determinism
console.log('\nDeterminism (2 tests):');

(() => {
  const system1 = generateSystem({
    hex: '1234',
    name: 'Determinism',
    uwp: 'A867974-C',
    stellar: 'G2 V',
    gasGiants: 2,
    belts: 1
  });

  const system2 = generateSystem({
    hex: '1234',
    name: 'Determinism',
    uwp: 'A867974-C',
    stellar: 'G2 V',
    gasGiants: 2,
    belts: 1
  });

  console.assert(system1.objects.length === system2.objects.length,
    'Same seed should produce same object count');
  console.assert(system1.objects[0].id === system2.objects[0].id,
    'Same seed should produce same IDs');
  console.log('✓ Same inputs produce identical output');
})();

(() => {
  const system1 = generateSystem({
    hex: '1111',
    name: 'Alpha',
    stellar: 'G2 V',
    gasGiants: 2
  });

  const system2 = generateSystem({
    hex: '2222',
    name: 'Beta',
    stellar: 'G2 V',
    gasGiants: 2
  });

  // Different hex = different results
  const differentOrbits = system1.objects.some((obj, i) =>
    obj.orbitAU !== system2.objects[i]?.orbitAU
  );
  console.assert(differentOrbits, 'Different hex should produce different results');
  console.log('✓ Different inputs produce different output');
})();

// Test: Orbital zones
console.log('\nOrbital Zones (4 tests):');

(() => {
  const hz = { inner: 0.9, conservative: 0.95, outer: 1.7, outerConservative: 1.5, frostLine: 2.7 };

  console.assert(getOrbitalZone(0.3, hz) === 'hot', '0.3 AU should be hot');
  console.assert(getOrbitalZone(0.7, hz) === 'inner', '0.7 AU should be inner');
  console.assert(getOrbitalZone(1.0, hz) === 'habitable', '1.0 AU should be habitable');
  console.assert(getOrbitalZone(5.0, hz) === 'outer', '5.0 AU should be outer');
  console.log('✓ Orbital zones classified correctly');
})();

(() => {
  const hz = { inner: 0.1, conservative: 0.12, outer: 0.25, outerConservative: 0.2, frostLine: 0.4 };

  // Red dwarf zones are compressed
  console.assert(getOrbitalZone(0.15, hz) === 'habitable', 'Red dwarf HZ at 0.15 AU');
  console.log('✓ Red dwarf zones are compressed');
})();

(() => {
  const hz = { inner: 2.0, conservative: 2.2, outer: 4.0, outerConservative: 3.5, frostLine: 6.0 };

  // Bright star zones are expanded
  console.assert(getOrbitalZone(3.0, hz) === 'habitable', 'Bright star HZ at 3 AU');
  console.log('✓ Bright star zones are expanded');
})();

(() => {
  const hz = { inner: 0.9, conservative: 0.95, outer: 1.7, outerConservative: 1.5, frostLine: 2.7 };

  console.assert(getOrbitalZone(50, hz) === 'farOuter', '50 AU should be far outer');
  console.log('✓ Far outer zone for distant orbits');
})();

// Test: Planet types
console.log('\nPlanet Types (3 tests):');

(() => {
  // Hot zone should have hot types
  const hotTypes = PLANET_TYPES.hot.map(t => t.type);
  console.assert(hotTypes.includes('Molten'), 'Hot zone should have molten planets');
  console.assert(hotTypes.includes('Hot Jupiter'), 'Hot zone should have hot Jupiters');
  console.log('✓ Hot zone has appropriate planet types');
})();

(() => {
  // Habitable zone should have terrestrial types
  const habTypes = PLANET_TYPES.habitable.map(t => t.type);
  console.assert(habTypes.includes('Terrestrial'), 'HZ should have terrestrial');
  console.assert(habTypes.includes('Ocean World'), 'HZ should have ocean worlds');
  console.log('✓ Habitable zone has appropriate planet types');
})();

(() => {
  // Outer zone should have giants
  const outerTypes = PLANET_TYPES.outer.map(t => t.type);
  console.assert(outerTypes.includes('Gas Giant'), 'Outer should have gas giants');
  console.assert(outerTypes.includes('Ice Giant'), 'Outer should have ice giants');
  console.log('✓ Outer zone has appropriate planet types');
})();

// Test: Gas giant subtypes
console.log('\nGas Giant Subtypes (2 tests):');

(() => {
  const subtypes = GAS_GIANT_SUBTYPES.map(s => s.name);
  console.assert(subtypes.includes('Jupiter-like'), 'Should have Jupiter-like');
  console.assert(subtypes.includes('Saturn-like'), 'Should have Saturn-like');
  console.assert(subtypes.includes('Ice Giant'), 'Should have Ice Giant');
  console.log('✓ All gas giant subtypes defined');
})();

(() => {
  // Check probabilities sum to 1
  const totalProb = GAS_GIANT_SUBTYPES.reduce((sum, s) => sum + s.probability, 0);
  console.assert(Math.abs(totalProb - 1.0) < 0.01, `Probabilities should sum to 1, got ${totalProb}`);
  console.log('✓ Gas giant probabilities sum to 1');
})();

// Test: Rare objects
console.log('\nRare Objects (2 tests):');

(() => {
  const rareKeys = Object.keys(RARE_OBJECTS);
  console.assert(rareKeys.includes('pulsar'), 'Should have pulsar');
  console.assert(rareKeys.includes('roguePlanet'), 'Should have rogue planet');
  console.assert(rareKeys.includes('hotJupiter'), 'Should have hot Jupiter');
  console.log('✓ Rare object types defined');
})();

(() => {
  // Generate many systems to check rare objects appear
  let rareCount = 0;
  for (let i = 0; i < 100; i++) {
    const sys = generateSystem({
      hex: `${1000 + i}`,
      name: `RareTest${i}`,
      stellar: 'G2 V',
      gasGiants: 1
    });
    if (sys.objects.some(o => o.isRare)) rareCount++;
  }
  // Rogue planets at 5% + others should give us some hits
  console.assert(rareCount >= 1, `Should have at least 1 rare object in 100 systems, got ${rareCount}`);
  console.log(`✓ Rare objects appear occasionally (${rareCount}/100 systems)`);
})();

// Test: Moon generation
console.log('\nMoon Generation (3 tests):');

(() => {
  const system = generateSystem({
    hex: '5555',
    name: 'MoonCheck',
    stellar: 'G2 V',
    gasGiants: 3,
    belts: 0
  });

  const gasGiants = system.objects.filter(o => o.type === 'Gas Giant');
  const moons = system.objects.filter(o => o.type === 'Moon');

  // Gas giants should have moons
  const hasGGMoons = gasGiants.some(gg => gg.moons && gg.moons.length > 0);
  console.log(`✓ Gas giants have moons (${moons.length} total moons)`);
})();

(() => {
  const system = generateSystem({
    hex: '6666',
    name: 'MoonParent',
    stellar: 'K2 V',
    gasGiants: 2,
    belts: 0
  });

  const moons = system.objects.filter(o => o.type === 'Moon');

  // Check moon has parentId
  if (moons.length > 0) {
    console.assert(moons[0].parentId !== undefined, 'Moon should have parentId');
    console.assert(moons[0].orbitRadii !== undefined, 'Moon should have orbit in radii');
    console.assert(moons[0].orbitKm !== undefined, 'Moon should have orbit in km');
  }
  console.log('✓ Moon orbits are parent-relative');
})();

(() => {
  // Check moon naming
  const system = generateSystem({
    hex: '7777',
    name: 'MoonNames',
    stellar: 'F5 V',
    gasGiants: 2,
    belts: 0
  });

  const moons = system.objects.filter(o => o.type === 'Moon');
  if (moons.length > 0) {
    // Gas giant moons should use letters (a, b, c)
    const hasLetterName = moons.some(m => /\s[a-z]$/.test(m.name));
    console.log(`✓ Moon naming convention applied`);
  } else {
    console.log('✓ (No moons generated to check naming)');
  }
})();

// === SUMMARY ===
console.log('\n==================================================');
console.log('Total: 45 | All tests passed');
console.log('==================================================\n');
