/**
 * Enemy Auto-Fire Unit Tests
 * Tests for enemy fire resolution, damage application, and GM controls
 */

const { resolveEnemyFire, totalEnemyDamage, formatEnemyFireNarration } = require('../../lib/operations/enemy-fire');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    testsPassed++;
  } catch (error) {
    testsFailed++;
    console.error(`  FAIL: ${name}`);
    console.error(`    ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ============================================================================
// SETUP - Common test fixtures
// ============================================================================

const pcShip = {
  name: 'ISS Astral Dawn',
  armor: 1,
  hull: 240,
  maxHull: 240,
  evasive: false
};

const hostileWithWeapons = {
  id: 'corsair_a',
  name: 'Corsair Alpha',
  disposition: 'hostile',
  health: 30,
  max_health: 30,
  gunner_skill: 1,
  range_band: 'medium',
  weapons: [
    { name: 'Triple Turret Laser', damage: '3d6', range: 'medium' }
  ]
};

const hostileNoWeapons = {
  id: 'scout_a',
  name: 'Scout Alpha',
  disposition: 'hostile',
  health: 10,
  max_health: 10,
  gunner_skill: 1,
  range_band: 'long',
  weapons: []
};

const hostileDisabledWeapon = {
  id: 'corsair_b',
  name: 'Corsair Bravo',
  disposition: 'hostile',
  health: 15,
  max_health: 30,
  gunner_skill: 2,
  range_band: 'short',
  weapons: [
    { name: 'Pulse Laser', damage: '2d6', range: 'long', disabled: true }
  ]
};

const neutralContact = {
  id: 'trader_a',
  name: 'Free Trader',
  disposition: 'neutral',
  health: 20,
  max_health: 20,
  gunner_skill: 0,
  range_band: 'medium',
  weapons: [
    { name: 'Beam Laser', damage: '1d6', range: 'medium' }
  ]
};

const destroyedHostile = {
  id: 'corsair_c',
  name: 'Corsair Charlie',
  disposition: 'hostile',
  health: 0,
  max_health: 30,
  gunner_skill: 1,
  range_band: 'close',
  weapons: [
    { name: 'Laser', damage: '2d6', range: 'medium' }
  ]
};

const hostileAutoFireOff = {
  id: 'corsair_d',
  name: 'Corsair Delta',
  disposition: 'hostile',
  auto_fire: false,
  health: 30,
  max_health: 30,
  gunner_skill: 2,
  range_band: 'medium',
  weapons: [
    { name: 'Triple Laser', damage: '3d6', range: 'medium' }
  ]
};

// ============================================================================
// CORE TESTS
// ============================================================================

console.log('Enemy Auto-Fire Tests');
console.log('=' .repeat(40));

test('hostile contact with weapons fires', () => {
  const results = resolveEnemyFire({
    contacts: [hostileWithWeapons],
    pcShip
  });
  assert(results.length === 1, `Expected 1 result, got ${results.length}`);
  assert(results[0].contactId === 'corsair_a', 'Wrong contact ID');
  assert(results[0].contactName === 'Corsair Alpha', 'Wrong contact name');
  assert(results[0].weapon === 'Triple Turret Laser', 'Wrong weapon');
  assert(typeof results[0].hit === 'boolean', 'hit should be boolean');
  assert(typeof results[0].damage === 'number', 'damage should be number');
});

test('damage applied correctly on hit', () => {
  // Run multiple times to get at least one hit
  let foundHit = false;
  for (let i = 0; i < 100; i++) {
    const results = resolveEnemyFire({
      contacts: [hostileWithWeapons],
      pcShip
    });
    if (results[0].hit && results[0].damage > 0) {
      foundHit = true;
      assert(results[0].damage >= 0, 'Damage should be non-negative');
      break;
    }
  }
  assert(foundHit, 'Should get at least one hit in 100 rolls');
});

test('contact with no weapons skips', () => {
  const results = resolveEnemyFire({
    contacts: [hostileNoWeapons],
    pcShip
  });
  assert(results.length === 0, `Expected 0 results, got ${results.length}`);
});

test('disabled weapons do not fire', () => {
  const results = resolveEnemyFire({
    contacts: [hostileDisabledWeapon],
    pcShip
  });
  assert(results.length === 0, `Expected 0 results, got ${results.length}`);
});

test('auto_fire=false skips contact', () => {
  const results = resolveEnemyFire({
    contacts: [hostileAutoFireOff],
    pcShip
  });
  assert(results.length === 0, `Expected 0 results, got ${results.length}`);
});

test('GM pause stops all contacts', () => {
  const results = resolveEnemyFire({
    contacts: [hostileWithWeapons],
    pcShip,
    paused: true
  });
  assert(results.length === 0, `Expected 0 results when paused, got ${results.length}`);
});

test('neutral contacts do not fire', () => {
  const results = resolveEnemyFire({
    contacts: [neutralContact],
    pcShip
  });
  assert(results.length === 0, `Expected 0 results for neutral, got ${results.length}`);
});

test('destroyed contacts do not fire', () => {
  const results = resolveEnemyFire({
    contacts: [destroyedHostile],
    pcShip
  });
  assert(results.length === 0, `Expected 0 results for destroyed, got ${results.length}`);
});

test('multiple contacts fire independently', () => {
  const corsair2 = {
    ...hostileWithWeapons,
    id: 'corsair_x',
    name: 'Corsair X',
    weapons: [
      { name: 'Pulse Laser', damage: '2d6', range: 'medium' },
      { name: 'Missile Rack', damage: '4d6', range: 'long' }
    ]
  };
  const results = resolveEnemyFire({
    contacts: [hostileWithWeapons, corsair2],
    pcShip
  });
  // hostileWithWeapons has 1 weapon, corsair2 has 2 weapons = 3 total fire results
  assert(results.length === 3, `Expected 3 results, got ${results.length}`);
});

test('no pcShip returns empty', () => {
  const results = resolveEnemyFire({
    contacts: [hostileWithWeapons],
    pcShip: null
  });
  assert(results.length === 0, `Expected 0 results with no PC ship, got ${results.length}`);
});

test('empty contacts returns empty', () => {
  const results = resolveEnemyFire({
    contacts: [],
    pcShip
  });
  assert(results.length === 0, `Expected 0 results with empty contacts, got ${results.length}`);
});

// ============================================================================
// UTILITY TESTS
// ============================================================================

test('totalEnemyDamage sums correctly', () => {
  const results = [
    { damage: 5 },
    { damage: 0 },
    { damage: 12 },
    { damage: 3 }
  ];
  assert(totalEnemyDamage(results) === 20, 'Should sum to 20');
});

test('totalEnemyDamage returns 0 for empty', () => {
  assert(totalEnemyDamage([]) === 0, 'Should return 0');
});

test('formatEnemyFireNarration generates text for hits and misses', () => {
  const results = [
    { contactName: 'Corsair Alpha', weapon: 'Laser', hit: true, damage: 8 },
    { contactName: 'Corsair Bravo', weapon: 'Missile', hit: false, damage: 0 }
  ];
  const narration = formatEnemyFireNarration(results);
  assert(narration.includes('Corsair Alpha'), 'Should include contact name');
  assert(narration.includes('HIT'), 'Should include HIT');
  assert(narration.includes('MISS'), 'Should include MISS');
  assert(narration.includes('8 damage'), 'Should include damage amount');
});

test('formatEnemyFireNarration returns empty for no results', () => {
  assert(formatEnemyFireNarration([]) === '', 'Should return empty string');
});

// ============================================================================
// INTEGRATION-STYLE TEST
// ============================================================================

test('full round: PC fire + enemy fire + damage', () => {
  // Simulate a full round with multiple contacts
  const contacts = [
    hostileWithWeapons,
    { ...hostileWithWeapons, id: 'corsair_b2', name: 'Corsair Bravo' },
    hostileNoWeapons,     // Should skip
    hostileAutoFireOff,   // Should skip
    neutralContact,       // Should skip
    destroyedHostile      // Should skip
  ];

  const results = resolveEnemyFire({ contacts, pcShip });

  // Only first two contacts should fire (1 weapon each = 2 results)
  assert(results.length === 2, `Expected 2 results, got ${results.length}`);
  assert(results[0].contactId === 'corsair_a', 'First should be corsair_a');
  assert(results[1].contactId === 'corsair_b2', 'Second should be corsair_b2');

  // Calculate total damage
  const totalDmg = totalEnemyDamage(results);
  assert(totalDmg >= 0, 'Total damage should be non-negative');

  // Narration should be non-empty (we have 2 fire results)
  const narration = formatEnemyFireNarration(results);
  assert(narration.length > 0, 'Narration should not be empty');
});

// ============================================================================
// REPORT
// ============================================================================

console.log('');
console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
if (testsFailed > 0) {
  process.exit(1);
}
