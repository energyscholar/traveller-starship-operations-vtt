/**
 * Operations Handler Tests
 * Fast smoke tests for MVC refactor safety net
 *
 * NOTE: These tests verify the operations module functions work correctly.
 * They will be deleted after MVC refactor is stable (per TODO).
 */

const operations = require('../lib/operations');

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

function assertArray(value, msg = '') {
  if (!Array.isArray(value)) {
    throw new Error(`${msg} Expected array, got ${typeof value}`);
  }
}

// ==================== Campaign Tests ====================

console.log('\n=== Operations Handler Tests ===\n');
console.log('--- Campaign Functions ---\n');

let testCampaignId = null;

test('createCampaign creates and returns campaign', () => {
  const campaign = operations.createCampaign('Test Campaign', 'Test GM');
  assertExists(campaign, 'Campaign');
  assertExists(campaign.id, 'Campaign ID');
  assertEqual(campaign.name, 'Test Campaign', 'Name');
  assertEqual(campaign.gm_name, 'Test GM', 'GM Name');
  testCampaignId = campaign.id;
});

test('getCampaign returns campaign by ID', () => {
  const campaign = operations.getCampaign(testCampaignId);
  assertExists(campaign, 'Campaign');
  assertEqual(campaign.id, testCampaignId, 'ID match');
});

test('getAllCampaigns returns array', () => {
  const campaigns = operations.getAllCampaigns();
  assertArray(campaigns, 'Campaigns');
});

test('updateCampaign updates fields', () => {
  const updated = operations.updateCampaign(testCampaignId, {
    current_system: 'Mora'
  });
  assertEqual(updated.current_system, 'Mora', 'System updated');
});

// ==================== Player Account Tests ====================

console.log('\n--- Player Account Functions ---\n');

let testAccountId = null;

test('createPlayerSlot creates player account', () => {
  const account = operations.createPlayerSlot(testCampaignId, 'Alice');
  assertExists(account, 'Account');
  assertExists(account.id, 'Account ID');
  assertEqual(account.slot_name, 'Alice', 'Slot name');
  testAccountId = account.id;
});

test('getPlayerAccount returns account by ID', () => {
  const account = operations.getPlayerAccount(testAccountId);
  assertExists(account, 'Account');
  assertEqual(account.id, testAccountId, 'ID match');
});

test('getPlayerAccountsByCampaign returns array', () => {
  const accounts = operations.getPlayerAccountsByCampaign(testCampaignId);
  assertArray(accounts, 'Accounts');
});

test('importCharacter imports character data', () => {
  const account = operations.importCharacter(testAccountId, {
    name: 'Captain Kirk',
    skills: { pilot: 2, leadership: 3 },
    stats: { DEX: 9, INT: 10 }
  });
  assertExists(account.character_data, 'Character data');
  assertEqual(account.character_name, 'Captain Kirk', 'Character name');
});

test('assignRole assigns role to player', () => {
  const account = operations.assignRole(testAccountId, 'captain');
  assertEqual(account.role, 'captain', 'Role assigned');
});

test('isRoleAvailable returns boolean', () => {
  const available = operations.isRoleAvailable('nonexistent-ship', 'pilot');
  assertEqual(typeof available, 'boolean', 'Returns boolean');
});

// ==================== Ship Tests ====================

console.log('\n--- Ship Functions ---\n');

let testShipId = null;

test('addShip creates ship', () => {
  const ship = operations.addShip(testCampaignId, 'Beowulf', {
    type: 'Free Trader',
    tonnage: 200
  }, { isPartyShip: true });
  assertExists(ship, 'Ship');
  assertExists(ship.id, 'Ship ID');
  assertEqual(ship.name, 'Beowulf', 'Ship name');
  testShipId = ship.id;
});

test('getShip returns ship by ID', () => {
  const ship = operations.getShip(testShipId);
  assertExists(ship, 'Ship');
  assertEqual(ship.id, testShipId, 'ID match');
});

test('getShipsByCampaign returns array', () => {
  const ships = operations.getShipsByCampaign(testCampaignId);
  assertArray(ships, 'Ships');
});

test('getPartyShips returns party ships', () => {
  const ships = operations.getPartyShips(testCampaignId);
  assertArray(ships, 'Party ships');
});

test('updateShipState updates current state', () => {
  const ship = operations.updateShipState(testShipId, { alertStatus: 'YELLOW' });
  assertEqual(ship.current_state.alertStatus, 'YELLOW', 'Alert status');
});

// ==================== NPC Crew Tests ====================

console.log('\n--- NPC Crew Functions ---\n');

let testNPCId = null;

test('addNPCCrew creates NPC', () => {
  const npc = operations.addNPCCrew(testShipId, 'Jenkins', 'engineer', {
    skillLevel: 1
  });
  assertExists(npc, 'NPC');
  assertExists(npc.id, 'NPC ID');
  assertEqual(npc.name, 'Jenkins', 'NPC name');
  testNPCId = npc.id;
});

test('getNPCCrewByShip returns array', () => {
  const crew = operations.getNPCCrewByShip(testShipId);
  assertArray(crew, 'NPC crew');
});

// ==================== Ship Log Tests ====================

console.log('\n--- Ship Log Functions ---\n');

test('addLogEntry creates log entry', () => {
  const entry = operations.addLogEntry(testShipId, testCampaignId, {
    gameDate: '1105-001',
    entryType: 'event',
    message: 'Test log entry',
    actor: 'System'
  });
  assertExists(entry, 'Log entry');
  assertExists(entry.id, 'Entry ID');
});

test('getShipLog returns array', () => {
  const logs = operations.getShipLog(testShipId);
  assertArray(logs, 'Ship logs');
});

// ==================== Full Data Tests ====================

console.log('\n--- Full Campaign Data ---\n');

test('getFullCampaignData returns complete data', () => {
  const data = operations.getFullCampaignData(testCampaignId);
  assertExists(data, 'Full data');
  assertExists(data.campaign, 'Campaign');
  assertArray(data.players, 'Players');
  assertArray(data.ships, 'Ships');
});

// ==================== Constants Tests ====================

console.log('\n--- Constants & Config ---\n');

test('ROLE_VIEWS has all roles', () => {
  assertExists(operations.ROLE_VIEWS, 'ROLE_VIEWS');
  assertExists(operations.ROLE_VIEWS.pilot, 'pilot role');
  assertExists(operations.ROLE_VIEWS.captain, 'captain role');
  assertExists(operations.ROLE_VIEWS.engineer, 'engineer role');
});

test('ALERT_STATUS has all statuses', () => {
  assertExists(operations.ALERT_STATUS, 'ALERT_STATUS');
  assertExists(operations.ALERT_STATUS.NORMAL, 'NORMAL');
  assertExists(operations.ALERT_STATUS.YELLOW, 'YELLOW');
  assertExists(operations.ALERT_STATUS.RED, 'RED');
});

test('ALL_ROLES is array of roles', () => {
  assertArray(operations.ALL_ROLES, 'ALL_ROLES');
});

// ==================== Cleanup ====================

console.log('\n--- Cleanup ---\n');

test('deleteNPCCrew removes NPC', () => {
  operations.deleteNPCCrew(testNPCId);
  const npc = operations.getNPCCrew(testNPCId);
  assertEqual(npc, undefined, 'NPC deleted');
});

test('deleteShip removes ship', () => {
  operations.deleteShip(testShipId);
  const ship = operations.getShip(testShipId);
  assertEqual(ship, undefined, 'Ship deleted');
});

test('deletePlayerSlot removes account', () => {
  operations.deletePlayerSlot(testAccountId);
  const account = operations.getPlayerAccount(testAccountId);
  assertEqual(account, undefined, 'Account deleted');
});

test('deleteCampaign removes campaign', () => {
  operations.deleteCampaign(testCampaignId);
  const campaign = operations.getCampaign(testCampaignId);
  assertEqual(campaign, undefined, 'Campaign deleted');
});

// ==================== Summary ====================

console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
}
