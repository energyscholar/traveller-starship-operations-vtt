/**
 * Operations Refueling System Tests
 * Tests for fuel types, sources, refueling, and processing
 */

const refueling = require('../lib/operations/refueling');
const { db, generateId } = require('../lib/operations/database');
const campaign = require('../lib/operations/campaign');
const accounts = require('../lib/operations/accounts');

// Test utilities
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected true, got ${value}`);
  }
}

function assertFalse(value, msg = '') {
  if (value) {
    throw new Error(`${msg} Expected false, got ${value}`);
  }
}

// ==================== Setup ====================

console.log('\n=== Refueling System Tests ===\n');

// Create test campaign
const testCampaignId = generateId();
db.prepare(`
  INSERT INTO campaigns (id, name, gm_name, current_date, current_system)
  VALUES (?, 'Test Campaign', 'Test GM', '1105-001 12:00', 'Regina')
`).run(testCampaignId);

// Create test ship with fuel processor
const testShipId = generateId();
const testShipData = {
  type: 'Free Trader',
  tonnage: 200,
  fuel: 40,
  jumpRating: 2,
  fuelProcessor: true,
  fuelScoops: true
};

db.prepare(`
  INSERT INTO ships (id, campaign_id, name, ship_data, current_state, is_party_ship, visible_to_players)
  VALUES (?, ?, 'Test Ship', ?, ?, 1, 1)
`).run(
  testShipId,
  testCampaignId,
  JSON.stringify(testShipData),
  JSON.stringify({ fuel: 40 })
);

// ==================== Fuel Types Tests ====================

console.log('Fuel Types (3 tests):');

test('FUEL_TYPES has correct structure', () => {
  assertTrue(refueling.FUEL_TYPES.refined !== undefined, 'refined');
  assertTrue(refueling.FUEL_TYPES.unrefined !== undefined, 'unrefined');
  assertTrue(refueling.FUEL_TYPES.processed !== undefined, 'processed');
});

test('Refined fuel has no penalties', () => {
  const refined = refueling.FUEL_TYPES.refined;
  assertEqual(refined.dmModifier, 0);
  assertEqual(refined.misjumpRisk, 0);
});

test('Unrefined fuel has -2 DM and 5% misjump risk', () => {
  const unrefined = refueling.FUEL_TYPES.unrefined;
  assertEqual(unrefined.dmModifier, -2);
  assertEqual(unrefined.misjumpRisk, 0.05);
});

// ==================== Fuel Sources Tests ====================

console.log('\nFuel Sources (4 tests):');

test('FUEL_SOURCES has correct structure', () => {
  assertTrue(refueling.FUEL_SOURCES.starportRefined !== undefined);
  assertTrue(refueling.FUEL_SOURCES.starportUnrefined !== undefined);
  assertTrue(refueling.FUEL_SOURCES.gasGiant !== undefined);
  assertTrue(refueling.FUEL_SOURCES.wilderness !== undefined);
});

test('Starport refined costs 500 Cr/ton', () => {
  assertEqual(refueling.FUEL_SOURCES.starportRefined.cost, 500);
  assertEqual(refueling.FUEL_SOURCES.starportRefined.fuelType, 'refined');
});

test('Starport unrefined costs 100 Cr/ton', () => {
  assertEqual(refueling.FUEL_SOURCES.starportUnrefined.cost, 100);
  assertEqual(refueling.FUEL_SOURCES.starportUnrefined.fuelType, 'unrefined');
});

test('Gas giant skimming is free but requires skill check', () => {
  assertEqual(refueling.FUEL_SOURCES.gasGiant.cost, 0);
  assertEqual(refueling.FUEL_SOURCES.gasGiant.fuelType, 'unrefined');
  assertTrue(refueling.FUEL_SOURCES.gasGiant.skillCheck !== null);
});

// ==================== Fuel Status Tests ====================

console.log('\nFuel Status (3 tests):');

test('getFuelStatus returns correct structure', () => {
  const status = refueling.getFuelStatus(testShipId);
  assertTrue(typeof status.total === 'number');
  assertTrue(typeof status.max === 'number');
  assertTrue(status.breakdown !== undefined);
  assertTrue(typeof status.percentFull === 'number');
});

test('Ship starts with full fuel', () => {
  const status = refueling.getFuelStatus(testShipId);
  assertEqual(status.total, 40);
  assertEqual(status.max, 40);
  assertEqual(status.percentFull, 100);
});

test('getAvailableSources returns array of sources', () => {
  const sources = refueling.getAvailableSources(testCampaignId);
  assertTrue(Array.isArray(sources));
  assertTrue(sources.length > 0);
});

// ==================== Refueling Tests ====================

console.log('\nRefueling Operations (6 tests):');

// Create a second test ship for refueling tests (to avoid state issues)
const refuelShipId = generateId();
db.prepare(`
  INSERT INTO ships (id, campaign_id, name, ship_data, current_state, is_party_ship, visible_to_players)
  VALUES (?, ?, 'Refuel Test Ship', ?, ?, 1, 1)
`).run(
  refuelShipId,
  testCampaignId,
  JSON.stringify(testShipData),
  JSON.stringify({ fuel: 20 }) // Start with half fuel
);

test('canRefuel validates capacity', () => {
  const result = refueling.canRefuel(refuelShipId, 'starportUnrefined', 10);
  assertTrue(result.canRefuel);
  assertEqual(typeof result.cost, 'number');
  assertEqual(typeof result.timeHours, 'number');
});

test('canRefuel rejects invalid source', () => {
  const result = refueling.canRefuel(refuelShipId, 'invalidSource', 10);
  assertFalse(result.canRefuel);
  assertTrue(result.error.includes('Invalid'));
});

test('canRefuel rejects zero amount', () => {
  const result = refueling.canRefuel(refuelShipId, 'starportUnrefined', 0);
  assertFalse(result.canRefuel);
  assertTrue(result.error.includes('Invalid'));
});

test('refuel adds fuel correctly', () => {
  const result = refueling.refuel(refuelShipId, testCampaignId, 'starportUnrefined', 10);
  assertTrue(result.success);
  assertEqual(result.fuelAdded, 10);
  assertEqual(result.fuelType, 'unrefined');
});

test('refuel calculates cost correctly', () => {
  const check = refueling.canRefuel(refuelShipId, 'starportUnrefined', 5);
  assertEqual(check.cost, 500); // 5 tons * 100 Cr/ton
});

test('canRefuel rejects when tank is full', () => {
  // Fill the tank
  refueling.refuel(refuelShipId, testCampaignId, 'starportUnrefined', 10);
  const result = refueling.canRefuel(refuelShipId, 'starportUnrefined', 10);
  assertFalse(result.canRefuel);
  assertTrue(result.error.includes('capacity'));
});

// ==================== Fuel Processing Tests ====================

console.log('\nFuel Processing (4 tests):');

// Create ship with unrefined fuel for processing tests
const processShipId = generateId();
db.prepare(`
  INSERT INTO ships (id, campaign_id, name, ship_data, current_state, is_party_ship, visible_to_players)
  VALUES (?, ?, 'Process Test Ship', ?, ?, 1, 1)
`).run(
  processShipId,
  testCampaignId,
  JSON.stringify(testShipData),
  JSON.stringify({
    fuel: 30,
    fuelBreakdown: { refined: 10, unrefined: 20, processed: 0 }
  })
);

test('canProcessFuel validates ship has processor', () => {
  const result = refueling.canProcessFuel(processShipId, 10);
  assertTrue(result.canProcess);
  assertEqual(typeof result.timeHours, 'number');
});

test('canProcessFuel validates unrefined amount', () => {
  const result = refueling.canProcessFuel(processShipId, 100);
  assertFalse(result.canProcess);
  assertTrue(result.error.includes('unrefined'));
});

test('startFuelProcessing creates job', () => {
  const result = refueling.startFuelProcessing(processShipId, testCampaignId, 10);
  assertTrue(result.success);
  assertEqual(result.timeHours, 1); // 10 tons at 10 tons/hour
  assertEqual(result.tons, 10);
});

test('checkFuelProcessing reports in progress', () => {
  const result = refueling.checkFuelProcessing(processShipId, testCampaignId);
  assertTrue(result.inProgress);
  assertFalse(result.completed);
});

// ==================== Fuel Consumption Tests ====================

console.log('\nFuel Consumption (5 tests):');

// Create ship with mixed fuel for consumption tests
const consumeShipId = generateId();
db.prepare(`
  INSERT INTO ships (id, campaign_id, name, ship_data, current_state, is_party_ship, visible_to_players)
  VALUES (?, ?, 'Consume Test Ship', ?, ?, 1, 1)
`).run(
  consumeShipId,
  testCampaignId,
  JSON.stringify(testShipData),
  JSON.stringify({
    fuel: 30,
    fuelBreakdown: { refined: 15, unrefined: 10, processed: 5 }
  })
);

test('consumeFuel prioritizes refined', () => {
  const result = refueling.consumeFuel(consumeShipId, 5);
  assertTrue(result.success);
  assertEqual(result.consumed, 5);
  assertTrue(result.penalties === null); // Only refined used
});

test('consumeFuel uses processed after refined', () => {
  // Consume remaining refined (10) and some processed
  const result = refueling.consumeFuel(consumeShipId, 12);
  assertTrue(result.success);
  assertTrue(result.penalties === null); // Still no unrefined
});

// Create fresh ship for unrefined consumption test
const unrefConsumeShipId = generateId();
db.prepare(`
  INSERT INTO ships (id, campaign_id, name, ship_data, current_state, is_party_ship, visible_to_players)
  VALUES (?, ?, 'Unref Consume Ship', ?, ?, 1, 1)
`).run(
  unrefConsumeShipId,
  testCampaignId,
  JSON.stringify(testShipData),
  JSON.stringify({
    fuel: 20,
    fuelBreakdown: { refined: 5, unrefined: 15, processed: 0 }
  })
);

test('consumeFuel applies penalties for unrefined', () => {
  const result = refueling.consumeFuel(unrefConsumeShipId, 10);
  assertTrue(result.success);
  assertTrue(result.penalties !== null);
  assertEqual(result.penalties.dmModifier, -2);
});

test('consumeFuel fails when insufficient', () => {
  const result = refueling.consumeFuel(unrefConsumeShipId, 100);
  assertFalse(result.success);
  assertTrue(result.error.includes('Insufficient'));
});

test('getJumpFuelPenalties predicts unrefined usage', () => {
  // Create fresh ship
  const penaltyShipId = generateId();
  db.prepare(`
    INSERT INTO ships (id, campaign_id, name, ship_data, current_state, is_party_ship, visible_to_players)
    VALUES (?, ?, 'Penalty Test Ship', ?, ?, 1, 1)
  `).run(
    penaltyShipId,
    testCampaignId,
    JSON.stringify(testShipData),
    JSON.stringify({
      fuel: 20,
      fuelBreakdown: { refined: 5, unrefined: 10, processed: 5 }
    })
  );

  const penalties = refueling.getJumpFuelPenalties(penaltyShipId, 15);
  assertTrue(penalties.hasUnrefined);
  assertEqual(penalties.dmModifier, -2);
  assertEqual(penalties.misjumpRisk, 0.05);
});

// ==================== Summary ====================

console.log('\n' + '='.repeat(50));
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
