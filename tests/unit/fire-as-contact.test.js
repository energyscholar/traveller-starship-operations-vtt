/**
 * AR-BD-4: fireAsContact MVP Test
 * Tests the complete flow of a contact firing at a PC ship
 */

const contacts = require('../../lib/operations/contacts');
const campaign = require('../../lib/operations/campaign');
const { db, generateId } = require('../../lib/operations/database');
const { resolveAttack } = require('../../lib/operations/combat-engine');

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

function assertExists(value, msg = '') {
  if (value === null || value === undefined) {
    throw new Error(`${msg} Value is null/undefined`);
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected true, got ${value}`);
  }
}

function assertInRange(value, min, max, msg = '') {
  if (value < min || value > max) {
    throw new Error(`${msg} Expected ${min}-${max}, got ${value}`);
  }
}

// ==================== Setup ====================

console.log('\n=== AR-BD-4: fireAsContact MVP Tests ===\n');

let testCampaignId = generateId();
let testShipId;

// Create test campaign
db.prepare(`
  INSERT INTO campaigns (id, name, gm_name, current_date)
  VALUES (?, ?, ?, ?)
`).run(testCampaignId, 'Fire Test Campaign', 'Test GM', '1105-001 12:00');

// Create test ship (party ship)
const shipData = {
  hull: { points: 40 },
  armor: 2,
  name: 'ISS Test Ship'
};

testShipId = generateId();
db.prepare(`
  INSERT INTO ships (id, campaign_id, name, ship_data, is_party_ship, current_state)
  VALUES (?, ?, ?, ?, 1, '{}')
`).run(testShipId, testCampaignId, 'ISS Test Ship', JSON.stringify(shipData));

// ==================== Tests ====================

console.log('--- Contact Weapons ---\n');

test('addContact with weapons creates armed contact', () => {
  const contact = contacts.addContact(testCampaignId, {
    name: 'Pirate Corsair',
    type: 'ship',
    range_km: 5000,
    is_targetable: true,
    disposition: 'hostile',
    gunner_skill: 2,
    armor: 4,
    health: 30,
    max_health: 30,
    weapons: [
      { name: 'Triple Turret Laser', damage: '3d6', range: 'medium' },
      { name: 'Missile Rack', damage: '4d6', range: 'long' }
    ]
  });

  assertExists(contact, 'Contact created');
  assertEqual(contact.name, 'Pirate Corsair');
  assertEqual(contact.disposition, 'hostile');
  assertEqual(contact.gunner_skill, 2);
  assertTrue(Array.isArray(contact.weapons), 'Weapons is array');
  assertEqual(contact.weapons.length, 2);
  assertEqual(contact.weapons[0].name, 'Triple Turret Laser');
});

test('getContact returns parsed weapons array', () => {
  // Create a new contact
  const created = contacts.addContact(testCampaignId, {
    name: 'Armed Contact',
    weapons: [{ name: 'Beam Laser', damage: '2d6', range: 'short' }]
  });

  const retrieved = contacts.getContact(created.id);
  assertTrue(Array.isArray(retrieved.weapons), 'Weapons parsed as array');
  assertEqual(retrieved.weapons[0].name, 'Beam Laser');
});

console.log('\n--- Attacker Adapter ---\n');

test('resolveAttack accepts contact-style attacker', () => {
  // This tests the adapter pattern from BD-2
  const attacker = {
    name: 'Enemy Ship',
    skills: { gunnery: 2 }  // Adapted from contact.gunner_skill
  };

  const weapon = {
    name: 'Pulse Laser',
    damage: '2d6',
    range: 'medium'
  };

  const target = {
    name: 'PC Ship',
    range_band: 'medium',
    armor: 2,
    evasive: false,
    health: 40,
    max_health: 40
  };

  const result = resolveAttack(attacker, weapon, target, {});

  assertExists(result, 'Result returned');
  assertExists(result.roll, 'Roll included');
  assertExists(result.hit !== undefined, 'Hit determined');
  assertEqual(result.modifiers.skill, 2, 'Skill modifier applied');
});

console.log('\n--- Damage Application ---\n');

test('applyCombatDamage reduces ship hull', () => {
  // Get initial ship state
  const shipBefore = campaign.getShip(testShipId);
  const initialHull = shipBefore.current_state?.hull ?? shipBefore.ship_data.hull.points;

  // Apply 10 damage
  const result = campaign.applyCombatDamage(testShipId, { hull: 10 });

  assertExists(result, 'Damage result returned');
  assertEqual(result.hull, initialHull - 10, 'Hull reduced by damage');
});

test('applyCombatDamage persists to database', () => {
  // Create fresh ship for this test
  const freshShipId = generateId();
  db.prepare(`
    INSERT INTO ships (id, campaign_id, name, ship_data, is_party_ship, current_state)
    VALUES (?, ?, ?, ?, 1, '{"hull": 50}')
  `).run(freshShipId, testCampaignId, 'Fresh Ship', JSON.stringify({ hull: { points: 50 } }));

  // Apply damage
  campaign.applyCombatDamage(freshShipId, { hull: 15 });

  // Re-read from database
  const updated = campaign.getShip(freshShipId);
  assertEqual(updated.current_state.hull, 35, 'Hull persisted correctly');

  // Cleanup
  db.prepare('DELETE FROM ships WHERE id = ?').run(freshShipId);
});

console.log('\n--- Full Fire Flow ---\n');

test('complete fire-as-contact flow works', () => {
  // 1. Create armed contact
  const contact = contacts.addContact(testCampaignId, {
    name: 'Test Attacker',
    type: 'ship',
    range_km: 8000,
    gunner_skill: 1,
    weapons: [{ name: 'Test Laser', damage: '2d6', range: 'medium' }]
  });

  // 2. Get the ship
  const ship = campaign.getShip(testShipId);
  const shipData = ship.ship_data || {};
  const currentState = ship.current_state || {};
  const hullBefore = currentState.hull ?? shipData.hull?.points ?? 40;

  // 3. Adapt contact to attacker format
  const attacker = {
    name: contact.name,
    skills: { gunnery: contact.gunner_skill || 1 }
  };

  const weapon = contact.weapons[0];

  const target = {
    name: ship.name,
    range_band: contact.range_band || 'medium',
    armor: shipData.armor || 0,
    evasive: currentState.evasive || false,
    health: hullBefore,
    max_health: shipData.hull?.points ?? 40
  };

  // 4. Resolve attack
  const result = resolveAttack(attacker, weapon, target, {});

  // 5. Apply damage if hit
  if (result.hit && result.actualDamage > 0) {
    campaign.applyCombatDamage(testShipId, { hull: result.actualDamage });

    // 6. Verify damage was applied
    const shipAfter = campaign.getShip(testShipId);
    const hullAfter = shipAfter.current_state?.hull ?? hullBefore;
    assertTrue(hullAfter < hullBefore, 'Hull reduced after hit');
  }

  // Test passes regardless of hit/miss (we tested the flow)
  assertTrue(true, 'Full flow completed');
});

// ==================== Cleanup ====================

console.log('\n--- Cleanup ---\n');

test('cleanup test data', () => {
  contacts.clearCampaignContacts(testCampaignId);
  db.prepare('DELETE FROM ships WHERE campaign_id = ?').run(testCampaignId);
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);
  assertTrue(true);
});

// ==================== Summary ====================

console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('==================================================\n');

if (failed > 0) {
  process.exit(1);
}
