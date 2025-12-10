// Ship Registry Tests
// Tests for the JSON-based ship database with indexing and caching
// Run with: node tests/unit/ship-registry.test.js

const { ShipRegistry, resetRegistry } = require('../../lib/ship-registry');
const { TestRunner, assertEqual, assertTrue, assertArrayEqual, assertThrows } = require('../test-helpers');

const runner = new TestRunner('Ship Registry');

function test(description, fn) {
  runner.test(description, () => {
    resetRegistry();
    fn();
  });
}

runner.section('BASIC SHIP LOADING');

test('Load scout ship from JSON', () => {
  const registry = new ShipRegistry();
  const scout = registry.getShip('scout');

  assertEqual(scout.id, 'scout');
  assertEqual(scout.name, 'Scout');
  assertEqual(scout.tonnage, 100);
  assertEqual(scout.role, 'exploration');
  assertEqual(scout.hull, 40);  // Traveller rules: 100 tons = 40 hull
  assertEqual(scout.armour, 4);
  assertEqual(scout.thrust, 2);
});

test('Load free trader from JSON', () => {
  const registry = new ShipRegistry();
  const trader = registry.getShip('free_trader');

  assertEqual(trader.id, 'free_trader');
  assertEqual(trader.name, 'Free Trader');
  assertEqual(trader.tonnage, 200);
  assertEqual(trader.role, 'trading');
  assertEqual(trader.hull, 80);  // Traveller rules: 200 tons = 80 hull
  assertEqual(trader.armour, 2);
  assertEqual(trader.thrust, 1);
});

test('Throw error for non-existent ship', () => {
  const registry = new ShipRegistry();
  assertThrows(
    () => registry.getShip('nonexistent'),
    'Ship not found in index'
  );
});

runner.section('WEAPON RESOLUTION');

test('Resolve scout weapons (triple turret)', () => {
  const registry = new ShipRegistry();
  const scout = registry.getShip('scout');

  assertEqual(scout.turrets.length, 1);
  assertEqual(scout.turrets[0].weaponObjects.length, 3);
  assertEqual(scout.turrets[0].weaponObjects[0].id, 'pulse_laser');
  assertEqual(scout.turrets[0].weaponObjects[1].id, 'sandcaster');
  assertEqual(scout.turrets[0].weaponObjects[2].id, 'missile_rack');
});

test('Resolve free trader weapons (dual single turrets)', () => {
  const registry = new ShipRegistry();
  const trader = registry.getShip('free_trader');

  assertEqual(trader.turrets.length, 2);
  assertEqual(trader.turrets[0].weaponObjects.length, 1);
  assertEqual(trader.turrets[1].weaponObjects.length, 1);
  assertEqual(trader.turrets[0].weaponObjects[0].id, 'beam_laser');
  assertEqual(trader.turrets[1].weaponObjects[0].id, 'beam_laser');
});

test('Load pulse laser weapon traits', () => {
  const registry = new ShipRegistry();
  const scout = registry.getShip('scout');
  const pulseLaser = scout.turrets[0].weaponObjects[0];

  assertEqual(pulseLaser.name, 'Pulse Laser');
  assertEqual(pulseLaser.damage, '2d6');
  assertEqual(pulseLaser.type, 'energy');
  assertTrue(pulseLaser.traits !== undefined);
  assertTrue(pulseLaser.traits.ammo === null);
});

test('Load missile range bonuses', () => {
  const registry = new ShipRegistry();
  const scout = registry.getShip('scout');
  const missiles = scout.turrets[0].weaponObjects[2];

  assertEqual(missiles.id, 'missile_rack');
  assertEqual(missiles.traits.rangeBonuses.long, 2);
  assertEqual(missiles.traits.rangeBonuses.very_long, 2);
  assertEqual(missiles.traits.rangeBonuses.distant, 2);
});

test('Lookup weapon directly by ID', () => {
  const registry = new ShipRegistry();
  const weapon = registry.getWeapon('pulse_laser');

  assertEqual(weapon.id, 'pulse_laser');
  assertEqual(weapon.name, 'Pulse Laser');
  assertEqual(weapon.damage, '2d6');
});

runner.section('DERIVED DATA');

test('Calculate scout critical thresholds', () => {
  const registry = new ShipRegistry();
  const scout = registry.getShip('scout');

  // Critical hits trigger at 90%, 80%, 70%, 60%, 50%, 40%, 30%, 20%, 10% of max hull
  assertArrayEqual(scout.critThresholds, [36, 32, 28, 24, 20, 16, 12, 8, 4]);
  assertEqual(scout.maxHull, 40);
});

test('Calculate free trader critical thresholds', () => {
  const registry = new ShipRegistry();
  const trader = registry.getShip('free_trader');

  // Critical hits trigger at 90%, 80%, 70%, 60%, 50%, 40%, 30%, 20%, 10% of max hull
  assertArrayEqual(trader.critThresholds, [72, 64, 56, 48, 40, 32, 24, 16, 8]);
  assertEqual(trader.maxHull, 80);
});

test('Verify crew requirements loaded', () => {
  const registry = new ShipRegistry();
  const scout = registry.getShip('scout');

  assertEqual(scout.crewRequirements.pilot, 1);
  assertEqual(scout.crewRequirements.gunner, 1);
  assertEqual(scout.crewRequirements.engineer, 1);
});

runner.section('CACHING BEHAVIOR (4 tests)');

test('Cache loaded ships (same object returned)', () => {
  const registry = new ShipRegistry();
  const scout1 = registry.getShip('scout');
  const scout2 = registry.getShip('scout');

  assertTrue(scout1 === scout2, 'Should return same cached object');
});

test('Track cache hits and misses', () => {
  const registry = new ShipRegistry();

  assertEqual(registry.stats.cacheHits, 0);
  assertEqual(registry.stats.cacheMisses, 0);

  registry.getShip('scout'); // Miss
  assertEqual(registry.stats.cacheMisses, 1);
  assertEqual(registry.stats.cacheHits, 0);

  registry.getShip('scout'); // Hit
  assertEqual(registry.stats.cacheHits, 1);

  registry.getShip('scout'); // Hit
  assertEqual(registry.stats.cacheHits, 2);
});

test('Track files loaded count', () => {
  const registry = new ShipRegistry();

  assertEqual(registry.stats.filesLoaded, 0);

  registry.getShip('scout');
  // Index + scout.json + weapons.json = 3
  assertEqual(registry.stats.filesLoaded, 3);

  registry.getShip('scout'); // From cache
  assertEqual(registry.stats.filesLoaded, 3);

  registry.getShip('free_trader'); // New ship (weapons cached)
  assertEqual(registry.stats.filesLoaded, 4);
});

test('Clear cache resets stats', () => {
  const registry = new ShipRegistry();

  registry.getShip('scout');
  registry.getShip('scout');

  assertTrue(registry.stats.cacheHits > 0);
  assertTrue(registry.stats.filesLoaded > 0);

  registry.clearCache();

  assertEqual(registry.stats.cacheHits, 0);
  assertEqual(registry.stats.cacheMisses, 0);
  assertEqual(registry.stats.filesLoaded, 0);
});

runner.section('SHIP INSTANCE CREATION (4 tests)');

test('Create ship instance from template', () => {
  const registry = new ShipRegistry();
  const instance = registry.createShipInstance('scout');

  assertEqual(instance.id, 'scout');
  assertTrue(instance.instanceId !== undefined);
  assertTrue(instance.instanceId.startsWith('scout_'));
});

test('Initialize instance runtime state', () => {
  const registry = new ShipRegistry();
  const instance = registry.createShipInstance('scout');

  assertEqual(instance.currentHull, 40);  // Scout has 40 hull
  assertTrue(instance.crew !== undefined);
  assertTrue(instance.crew.pilot === null);
  assertArrayEqual(instance.crew.gunners, []);
  assertArrayEqual(instance.criticals, []);
  assertEqual(instance.stance, 'neutral');
});

test('Support custom instance options', () => {
  const registry = new ShipRegistry();
  const instance = registry.createShipInstance('scout', {
    instanceId: 'test_001',
    name: 'Wanderer',
    stance: 'aggressive',
    position: { q: 5, r: 5 }
  });

  assertEqual(instance.instanceId, 'test_001');
  assertEqual(instance.customName, 'Wanderer');
  assertEqual(instance.stance, 'aggressive');
  assertEqual(instance.position.q, 5);
});

test('Instance mutation does not affect template', () => {
  const registry = new ShipRegistry();
  const instance1 = registry.createShipInstance('scout');
  const instance2 = registry.createShipInstance('scout');

  instance1.currentHull = 5;
  instance1.crew.pilot = { id: 'test' };

  assertEqual(instance2.currentHull, 40);  // Scout has 40 hull
  assertTrue(instance2.crew.pilot === null);
});

runner.section('INDEX & SEARCH (7 tests)');

test('List all ships from index', () => {
  const registry = new ShipRegistry();
  const ships = registry.listShips();

  // Index includes: scout, free_trader, gorram
  assertTrue(ships.length >= 3, `Expected at least 3 ships, got ${ships.length}`);
  assertTrue(ships.some(s => s.id === 'scout'), 'Scout should be in index');
  assertTrue(ships.some(s => s.id === 'free_trader'), 'Free Trader should be in index');
  assertTrue(ships.some(s => s.id === 'gorram'), 'Gorram should be in index');
});

test('Search by role', () => {
  const registry = new ShipRegistry();

  // AR-20: Now have scout + safari_ship as exploration
  const exploration = registry.searchShips({ role: 'exploration' });
  assertTrue(exploration.length >= 1, 'Should find at least one exploration ship');
  assertTrue(exploration.some(s => s.id === 'scout'), 'Scout should be exploration');

  // AR-20: Now have free_trader, far_trader, subsidised_merchant
  const trading = registry.searchShips({ role: 'trading' });
  assertTrue(trading.length >= 1, 'Should find at least one trading ship');
  assertTrue(trading.some(s => s.id === 'free_trader'), 'Free Trader should be trading');
});

test('Search by tonnage range', () => {
  const registry = new ShipRegistry();

  // AR-20: Small ships now include scout (100dT) + small craft
  const small = registry.searchShips({ maxTonnage: 150 });
  assertTrue(small.length >= 1, 'Should find at least one small ship');
  assertTrue(small.some(s => s.id === 'scout'), 'Scout should be in small ships');

  // Large ships: free_trader (200t), gorram (600t)
  const large = registry.searchShips({ minTonnage: 150 });
  assertTrue(large.length >= 2, `Expected at least 2 large ships, got ${large.length}`);
  assertTrue(large.some(s => s.id === 'free_trader'), 'Free Trader should be in large ships');
  assertTrue(large.some(s => s.id === 'gorram'), 'Gorram should be in large ships');
});

test('Search by name substring', () => {
  const registry = new ShipRegistry();

  const scouts = registry.searchShips({ name: 'scout' });
  assertTrue(scouts.length >= 1, 'Should find at least one scout');
  assertTrue(scouts.some(s => s.id === 'scout'), 'Scout should be found');

  // AR-20: Now have free_trader + far_trader
  const traders = registry.searchShips({ name: 'trader' });
  assertTrue(traders.length >= 1, 'Should find at least one trader');
  assertTrue(traders.some(s => s.id === 'free_trader'), 'Free Trader should be found');
});

test('Search with multiple criteria', () => {
  const registry = new ShipRegistry();

  // AR-20: Trading ships 150dT+ now includes free_trader, far_trader, subsidised_merchant
  const results = registry.searchShips({
    role: 'trading',
    minTonnage: 150
  });

  assertTrue(results.length >= 1, 'Should find at least one trading ship 150dT+');
  assertTrue(results.some(s => s.id === 'free_trader'), 'Free Trader should be found');
});

test('Return empty array for no matches', () => {
  const registry = new ShipRegistry();

  // Search for a role that doesn't exist
  const results = registry.searchShips({ role: 'nonexistent_role_xyz' });
  assertEqual(results.length, 0);
});

test('Search for military ships', () => {
  const registry = new ShipRegistry();

  // Gorram is a military ship
  const results = registry.searchShips({ role: 'military' });
  assertTrue(results.length >= 1, 'Should find at least one military ship');
  assertTrue(results.some(s => s.id === 'gorram'), 'Gorram should be a military ship');
});

runner.finish();
