/**
 * Ship Systems Tests
 * Tests system damage, status effects, and repairs
 */

const shipSystems = require('../lib/operations/ship-systems');
const { db, generateId } = require('../lib/operations/database');
const campaign = require('../lib/operations/campaign');

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

console.log('\n=== Ship Systems Tests ===\n');

let testCampaignId = generateId();
let testShipId = generateId();

// Create test campaign
db.prepare(`
  INSERT INTO campaigns (id, name, gm_name, current_date)
  VALUES (?, ?, ?, ?)
`).run(testCampaignId, 'Systems Test Campaign', 'Test GM', '1105-001 12:00');

// Create test ship
db.prepare(`
  INSERT INTO ships (id, campaign_id, name, template_id, ship_data, current_state)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(
  testShipId,
  testCampaignId,
  'Test Ship',
  'scout',
  JSON.stringify({ hull: 40, thrust: 2 }),
  JSON.stringify({})
);

// ==================== System Status Tests ====================

console.log('--- System Status ---\n');

test('getSystemStatuses returns all systems for undamaged ship', () => {
  const ship = campaign.getShip(testShipId);
  const statuses = shipSystems.getSystemStatuses(ship);

  assertTrue(statuses.mDrive !== undefined, 'mDrive status');
  assertTrue(statuses.powerPlant !== undefined, 'powerPlant status');
  assertTrue(statuses.sensors !== undefined, 'sensors status');
  assertTrue(statuses.jDrive !== undefined, 'jDrive status');
  assertTrue(statuses.computer !== undefined, 'computer status');
  assertTrue(statuses.armour !== undefined, 'armour status');
});

test('Undamaged ship has zero severity for all systems', () => {
  const ship = campaign.getShip(testShipId);
  const statuses = shipSystems.getSystemStatuses(ship);

  assertEqual(statuses.mDrive.totalSeverity, 0);
  assertEqual(statuses.sensors.totalSeverity, 0);
  assertEqual(statuses.powerPlant.totalSeverity, 0);
});

test('getDamagedSystems returns empty array for undamaged ship', () => {
  const ship = campaign.getShip(testShipId);
  const damaged = shipSystems.getDamagedSystems(ship);

  assertEqual(damaged.length, 0);
});

// ==================== Apply Damage Tests ====================

console.log('\n--- Apply Damage ---\n');

test('applySystemDamage adds crit to system', () => {
  const result = shipSystems.applySystemDamage(testShipId, 'mDrive', 2);

  assertTrue(result.success);
  assertEqual(result.location, 'mDrive');
  assertEqual(result.severity, 2);
  assertEqual(result.totalSeverity, 2);
});

test('Ship now shows mDrive as damaged', () => {
  const ship = campaign.getShip(testShipId);
  const statuses = shipSystems.getSystemStatuses(ship);

  assertEqual(statuses.mDrive.totalSeverity, 2);
  assertTrue(statuses.mDrive.crits.length > 0);
});

test('Multiple crits accumulate severity', () => {
  shipSystems.applySystemDamage(testShipId, 'mDrive', 1);

  const ship = campaign.getShip(testShipId);
  const statuses = shipSystems.getSystemStatuses(ship);

  assertEqual(statuses.mDrive.totalSeverity, 3); // 2 + 1
});

test('getDamagedSystems includes damaged system', () => {
  const ship = campaign.getShip(testShipId);
  const damaged = shipSystems.getDamagedSystems(ship);

  assertTrue(damaged.includes('mDrive'));
});

test('applySystemDamage rejects invalid system', () => {
  const result = shipSystems.applySystemDamage(testShipId, 'invalidSystem', 1);

  assertFalse(result.success);
  assertTrue(result.error.includes('Invalid system'));
});

test('applySystemDamage rejects invalid severity', () => {
  const result = shipSystems.applySystemDamage(testShipId, 'sensors', 7);

  assertFalse(result.success);
  assertTrue(result.error.includes('Severity must be 1-6'));
});

// ==================== Repair Tests ====================

console.log('\n--- Repair System ---\n');

test('repairSystem attempts repair on damaged system', () => {
  // First apply damage to sensors
  shipSystems.applySystemDamage(testShipId, 'sensors', 1);

  // Attempt repair with high skill
  const result = shipSystems.repairSystem(testShipId, 'sensors', 3);

  // Result should have roll info regardless of success
  assertTrue(result.roll !== undefined);
  assertTrue(result.skill !== undefined);
  assertEqual(result.location, 'sensors');
});

test('repairSystem returns error for undamaged system', () => {
  const result = shipSystems.repairSystem(testShipId, 'jDrive', 2);

  assertFalse(result.success);
  assertTrue(result.error.includes('No damage'));
});

// ==================== Clear Damage Tests ====================

console.log('\n--- Clear Damage ---\n');

test('clearSystemDamage clears single system', () => {
  // Make sure mDrive has damage
  const beforeShip = campaign.getShip(testShipId);
  const beforeStatus = shipSystems.getSystemStatuses(beforeShip);
  assertTrue(beforeStatus.mDrive.totalSeverity > 0, 'mDrive should have damage');

  // Clear mDrive damage
  const result = shipSystems.clearSystemDamage(testShipId, 'mDrive');

  assertTrue(result.success);

  // Check it's cleared
  const afterShip = campaign.getShip(testShipId);
  const afterStatus = shipSystems.getSystemStatuses(afterShip);
  assertEqual(afterStatus.mDrive.totalSeverity, 0);
});

test('clearSystemDamage clears all damage', () => {
  // Apply some damage
  shipSystems.applySystemDamage(testShipId, 'powerPlant', 2);
  shipSystems.applySystemDamage(testShipId, 'computer', 1);

  // Clear all
  const result = shipSystems.clearSystemDamage(testShipId, 'all');

  assertTrue(result.success);

  // Check everything is cleared
  const ship = campaign.getShip(testShipId);
  const damaged = shipSystems.getDamagedSystems(ship);
  assertEqual(damaged.length, 0);
});

test('clearSystemDamage rejects invalid system', () => {
  const result = shipSystems.clearSystemDamage(testShipId, 'notASystem');

  assertFalse(result.success);
});

// ==================== System Effects Tests ====================

console.log('\n--- System Effects ---\n');

test('mDrive damage applies thrust penalty', () => {
  shipSystems.clearSystemDamage(testShipId, 'all');
  shipSystems.applySystemDamage(testShipId, 'mDrive', 2);

  const ship = campaign.getShip(testShipId);
  const statuses = shipSystems.getSystemStatuses(ship);

  assertEqual(statuses.mDrive.thrustPenalty, 2);
  assertEqual(statuses.mDrive.controlDM, -2);
});

test('High severity mDrive damage disables drive', () => {
  shipSystems.clearSystemDamage(testShipId, 'all');
  shipSystems.applySystemDamage(testShipId, 'mDrive', 5);

  const ship = campaign.getShip(testShipId);
  const statuses = shipSystems.getSystemStatuses(ship);

  assertTrue(statuses.mDrive.disabled);
});

test('Sensors damage limits max range', () => {
  shipSystems.clearSystemDamage(testShipId, 'all');
  shipSystems.applySystemDamage(testShipId, 'sensors', 2);

  const ship = campaign.getShip(testShipId);
  const statuses = shipSystems.getSystemStatuses(ship);

  assertEqual(statuses.sensors.maxRange, 'medium');
});

test('jDrive any damage disables jump', () => {
  shipSystems.clearSystemDamage(testShipId, 'all');
  shipSystems.applySystemDamage(testShipId, 'jDrive', 1);

  const ship = campaign.getShip(testShipId);
  const statuses = shipSystems.getSystemStatuses(ship);

  assertTrue(statuses.jDrive.disabled);
});

// ==================== AR-194 Failure Registry Tests ====================

console.log('\n--- AR-194: Failure Registry ---\n');

test('FAILURE_REGISTRY has entries for all major systems', () => {
  assertTrue(shipSystems.FAILURE_REGISTRY.mDrive.length > 0, 'mDrive');
  assertTrue(shipSystems.FAILURE_REGISTRY.jDrive.length > 0, 'jDrive');
  assertTrue(shipSystems.FAILURE_REGISTRY.powerPlant.length > 0, 'powerPlant');
  assertTrue(shipSystems.FAILURE_REGISTRY.sensors.length > 0, 'sensors');
  assertTrue(shipSystems.FAILURE_REGISTRY.computer.length > 0, 'computer');
});

test('Failure reasons have required fields', () => {
  const reason = shipSystems.FAILURE_REGISTRY.mDrive[0];
  assertTrue(reason.id !== undefined, 'id');
  assertTrue(reason.name !== undefined, 'name');
  assertTrue(reason.description !== undefined, 'description');
  assertTrue(reason.flavorText !== undefined, 'flavorText');
});

test('getRandomFailureReason returns valid reason', () => {
  const reason = shipSystems.getRandomFailureReason('mDrive');
  assertTrue(reason !== null);
  assertTrue(reason.id.startsWith('mdrive-'));
});

test('getFailureReasonById finds correct reason', () => {
  const reason = shipSystems.getFailureReasonById('mdrive-bearing');
  assertTrue(reason !== null);
  assertEqual(reason.name, 'Bearing Failure');
});

test('getFailureReasonById returns null for invalid ID', () => {
  const reason = shipSystems.getFailureReasonById('invalid-id');
  assertEqual(reason, null);
});

// ==================== AR-194 Random Failure Tests ====================

console.log('\n--- AR-194: Random Failures ---\n');

test('triggerRandomFailure creates damage with failure reason', () => {
  shipSystems.clearSystemDamage(testShipId, 'all');
  const result = shipSystems.triggerRandomFailure(testShipId, { system: 'mDrive' });

  assertTrue(result.success);
  assertEqual(result.location, 'mDrive');
  assertTrue(result.severity >= 1 && result.severity <= 2);
  assertTrue(result.failureReason !== null);
});

test('triggerRandomFailure with specific severity', () => {
  shipSystems.clearSystemDamage(testShipId, 'all');
  const result = shipSystems.triggerRandomFailure(testShipId, { system: 'sensors', severity: 2 });

  assertTrue(result.success);
  assertEqual(result.severity, 2);
});

test('triggerRandomFailure random system selection works', () => {
  shipSystems.clearSystemDamage(testShipId, 'all');
  const result = shipSystems.triggerRandomFailure(testShipId);

  assertTrue(result.success);
  assertTrue(shipSystems.SHIP_SYSTEMS.includes(result.location));
});

// ==================== AR-194 Status Level Tests ====================

console.log('\n--- AR-194: Status Levels ---\n');

test('getSystemStatusLevel returns GREEN for undamaged', () => {
  shipSystems.clearSystemDamage(testShipId, 'all');
  const ship = campaign.getShip(testShipId);
  const level = shipSystems.getSystemStatusLevel(ship, 'mDrive');

  assertEqual(level, 'GREEN');
});

test('getSystemStatusLevel returns YELLOW for severity 1-2', () => {
  shipSystems.clearSystemDamage(testShipId, 'all');
  shipSystems.applySystemDamage(testShipId, 'mDrive', 1);

  const ship = campaign.getShip(testShipId);
  assertEqual(shipSystems.getSystemStatusLevel(ship, 'mDrive'), 'YELLOW');

  shipSystems.applySystemDamage(testShipId, 'mDrive', 1);
  const ship2 = campaign.getShip(testShipId);
  assertEqual(shipSystems.getSystemStatusLevel(ship2, 'mDrive'), 'YELLOW');
});

test('getSystemStatusLevel returns RED for severity 3+', () => {
  shipSystems.clearSystemDamage(testShipId, 'all');
  shipSystems.applySystemDamage(testShipId, 'mDrive', 3);

  const ship = campaign.getShip(testShipId);
  assertEqual(shipSystems.getSystemStatusLevel(ship, 'mDrive'), 'RED');
});

test('getAllSystemStatusLevels returns all systems', () => {
  shipSystems.clearSystemDamage(testShipId, 'all');
  const ship = campaign.getShip(testShipId);
  const levels = shipSystems.getAllSystemStatusLevels(ship);

  assertEqual(levels.mDrive, 'GREEN');
  assertEqual(levels.jDrive, 'GREEN');
  assertEqual(levels.powerPlant, 'GREEN');
});

test('getSystemsNeedingAttention returns damaged systems', () => {
  shipSystems.clearSystemDamage(testShipId, 'all');
  shipSystems.applySystemDamage(testShipId, 'mDrive', 1);
  shipSystems.applySystemDamage(testShipId, 'sensors', 3);

  const ship = campaign.getShip(testShipId);
  const attention = shipSystems.getSystemsNeedingAttention(ship);

  assertEqual(attention.length, 2);
  // Should be sorted by severity (highest first)
  assertEqual(attention[0].system, 'sensors');
  assertEqual(attention[0].level, 'RED');
  assertEqual(attention[1].system, 'mDrive');
  assertEqual(attention[1].level, 'YELLOW');
});

// ==================== Cleanup ====================

shipSystems.clearSystemDamage(testShipId, 'all');
db.prepare('DELETE FROM ships WHERE id = ?').run(testShipId);
db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);

// ==================== Results ====================

console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
}
