/**
 * BattleState Tests
 * Tests for lib/operations/BattleState.js
 */

const { BattleState } = require('../../lib/operations/BattleState');

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
    throw new Error(`${msg} Expected truthy, got ${value}`);
  }
}

console.log('=== BattleState Tests ===\n');

// Test 1: Constructor sets campaignId
test('constructor sets campaignId', () => {
  const bs = new BattleState('test-campaign');
  assertEqual(bs.campaignId, 'test-campaign', 'Should have campaignId');
});

// Test 2: Initial state is IDLE
test('initial state is IDLE', () => {
  const bs = new BattleState();
  assertEqual(bs.state, 'IDLE', 'Should start IDLE');
});

// Test 3: transition validates allowed transitions
test('transition allows valid state changes', () => {
  const bs = new BattleState();
  bs.transition('COMBAT');
  assertEqual(bs.state, 'COMBAT', 'Should be COMBAT');
});

// Test 4: transition rejects invalid transitions
test('transition rejects invalid state changes', () => {
  const bs = new BattleState();
  let threw = false;
  try {
    bs.transition('RESETTING'); // Invalid from IDLE
  } catch (e) {
    threw = true;
  }
  assertTrue(threw, 'Should throw on invalid transition');
});

// Test 5: setPcShip stores ship data
test('setPcShip stores ship data', () => {
  const bs = new BattleState();
  bs.setPcShip({ id: 'ship1', name: 'Test Ship' });
  const ship = bs.getPcShip();
  assertEqual(ship.id, 'ship1', 'Should have ship id');
  assertEqual(ship.name, 'Test Ship', 'Should have ship name');
});

// Test 6: addContact adds to contacts Map
test('addContact adds contact', () => {
  const bs = new BattleState();
  bs.addContact({ id: 'c1', name: 'Enemy' });
  const contact = bs.getContact('c1');
  assertTrue(contact, 'Should return contact');
  assertEqual(contact.name, 'Enemy', 'Name should match');
});

// Test 7: getContacts returns array copy
test('getContacts returns array', () => {
  const bs = new BattleState();
  bs.addContact({ id: 'c1', name: 'Enemy1' });
  bs.addContact({ id: 'c2', name: 'Enemy2' });
  const contacts = bs.getContacts();
  assertTrue(Array.isArray(contacts), 'Should return array');
  assertEqual(contacts.length, 2, 'Should have 2 contacts');
});

// Test 8: Version increments on changes
test('version increments on state change', () => {
  const bs = new BattleState();
  const v0 = bs.version;
  bs.transition('COMBAT');
  assertTrue(bs.version > v0, 'Version should increment');
});

// Test 9: createSnapshot saves state
test('createSnapshot returns state object', () => {
  const bs = new BattleState('test');
  bs.setPcShip({ id: 'ship1', name: 'Ship' });
  bs.addContact({ id: 'c1', name: 'Enemy' });
  bs.transition('COMBAT');
  const snapshot = bs.createSnapshot();
  assertTrue(snapshot, 'Should return snapshot');
  assertEqual(snapshot.state, 'COMBAT', 'Snapshot should have state');
});

// Test 10: getFullState returns complete state
test('getFullState returns complete state', () => {
  const bs = new BattleState('test');
  bs.setPcShip({ id: 'ship1', name: 'Ship' });
  bs.addContact({ id: 'c1', name: 'Enemy' });
  bs.transition('COMBAT');
  const fullState = bs.getFullState();
  assertTrue(fullState, 'Should return full state');
  assertEqual(fullState.state, 'COMBAT', 'Should include state');
  assertTrue(fullState.pcShip, 'Should include pcShip');
  assertTrue(Array.isArray(fullState.contacts), 'Should include contacts');
});

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
console.log(`PASSED: ${passed}/${passed + failed}`);

if (failed > 0) process.exit(1);
