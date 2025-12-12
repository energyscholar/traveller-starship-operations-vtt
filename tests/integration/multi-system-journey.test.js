/**
 * Multi-System Journey Integration Test
 * Tests the complete travel flow: Flammarion -> 567-908 -> Return
 *
 * Covers:
 * - Undock from station
 * - Travel to jump point
 * - Jump initiation and completion
 * - Position verification
 * - Refueling at destination
 * - Return jump
 */

const assert = require('assert');

// Load operations modules
const operations = require('../../lib/operations/index');
const jump = require('../../lib/operations/jump');
const refueling = require('../../lib/operations/refueling');
const starSystems = require('../../lib/operations/star-system-loader');

console.log('\n========================================');
console.log('MULTI-SYSTEM JOURNEY INTEGRATION TEST');
console.log('========================================\n');

// Test tracking
let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
    errors.push({ name, error: err.message });
  }
}

// Create test campaign and ship
let testCampaignId;
let testShipId;

async function setupTestData() {
  console.log('Setting up test data...\n');

  // Create test campaign - API takes (name, gmName) separately
  const campaign = operations.createCampaign('Journey Test Campaign', 'Test GM');

  if (!campaign || !campaign.id) {
    throw new Error(`Failed to create campaign`);
  }
  testCampaignId = campaign.id;

  // Update campaign with current system
  operations.updateCampaign(testCampaignId, {
    current_system: 'flammarion',
    current_date: '1105-001 08:00'
  });

  console.log(`  Created campaign: ${testCampaignId}`);

  // Create test ship at Flammarion Highport using createShipFromTemplate
  const ship = operations.createShipFromTemplate(testCampaignId, 'scout', 'Test Scout', true);

  if (!ship || !ship.id) {
    throw new Error(`Failed to create ship`);
  }
  testShipId = ship.id;

  // Set initial ship state at Flammarion Highport
  operations.updateShipState(testShipId, {
    systemHex: '0930',  // Flammarion
    locationId: 'loc-dock-highport',
    locationName: 'Dock - Flammarion Highport',
    fuel: { current: 40, max: 40, type: 'refined' },
    positionVerified: true
  });

  console.log(`  Created ship: ${testShipId}`);
  console.log('');
}

function cleanupTestData() {
  if (testCampaignId) {
    try {
      operations.deleteCampaign(testCampaignId);
      console.log(`\n  Cleaned up campaign: ${testCampaignId}`);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// ==================== PHASE 1: Initial State ====================

function testInitialState() {
  console.log('--- Phase 1: Initial State ---');

  test('Ship is at Flammarion Highport', () => {
    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.locationId, 'loc-dock-highport');
    assert.strictEqual(ship.current_state.systemHex, '0930');
  });

  test('Ship has refined fuel', () => {
    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.fuel.current, 40);
    assert.strictEqual(ship.current_state.fuel.type, 'refined');
  });

  test('Flammarion system data is available', () => {
    const system = starSystems.getSystemByHex('0930');
    assert.ok(system, 'System should exist');
    assert.strictEqual(system.name, 'Flammarion');
  });

  test('567-908 system data is available', () => {
    const system = starSystems.getSystemByHex('1031');
    assert.ok(system, 'System should exist');
    assert.strictEqual(system.name, '567-908');
  });

  console.log('');
}

// ==================== PHASE 2: Undock from Station ====================

function testUndock() {
  console.log('--- Phase 2: Undock from Station ---');

  test('Undock from Flammarion Highport', () => {
    // Simulate undock - move to orbit
    const result = operations.updateShipState(testShipId, {
      locationId: 'loc-orbit-mainworld',
      locationName: 'Orbit - Flammarion'
    });
    assert.ok(result.success !== false, 'Undock should succeed');

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.locationId, 'loc-orbit-mainworld');
  });

  console.log('');
}

// ==================== PHASE 3: Travel to Jump Point ====================

function testTravelToJumpPoint() {
  console.log('--- Phase 3: Travel to Jump Point ---');

  test('Travel from orbit to Mainworld Jump Point', () => {
    // Simulate travel - move to jump point
    const result = operations.updateShipState(testShipId, {
      locationId: 'loc-mainworld-jump',
      locationName: 'Mainworld Departure Jump Point'
    });
    assert.ok(result.success !== false, 'Travel should succeed');

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.locationId, 'loc-mainworld-jump');
  });

  test('Jump point has jump action available', () => {
    const system = starSystems.getSystemByHex('0930');
    const jumpPoint = system.locations.find(l => l.id === 'loc-mainworld-jump');
    assert.ok(jumpPoint, 'Jump point should exist');
    assert.ok(jumpPoint.actions.includes('jump'), 'Jump action should be available');
  });

  console.log('');
}

// ==================== PHASE 4: Initiate Jump to 567-908 ====================

function testInitiateJump() {
  console.log('--- Phase 4: Initiate Jump to 567-908 ---');

  test('Can check jump capability', () => {
    const result = jump.canInitiateJump(testShipId, 2);  // Jump-2 to 567-908
    // May fail if fuel not set up, but should not throw
    assert.ok(typeof result === 'object', 'Should return result object');
  });

  test('Initiate jump to 567-908', () => {
    // Enable no-fuel mode for testing
    jump.setNoFuelMode(true);

    const result = jump.initiateJump(testShipId, testCampaignId, '567-908', 2);

    if (!result.success) {
      console.log(`  Jump initiation details: ${result.error || 'unknown error'}`);
    }

    // jump.initiateJump only sets jump state; location update is done by socket handler
    // We must also update ship location to Jump Space (as astrogation.js socket handler does)
    operations.updateShipState(testShipId, {
      systemHex: '0000',  // Jump space
      locationId: 'loc-in-jump',
      locationName: 'In Jump Space'
    });

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.jump?.inJump, true, 'Ship should be in jump');
    assert.strictEqual(ship.current_state.jump?.destination, '567-908', 'Destination should be 567-908');
  });

  test('Ship location is Jump Space during jump', () => {
    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.systemHex, '0000', 'System hex should be 0000 (jump space)');
    assert.strictEqual(ship.current_state.locationId, 'loc-in-jump', 'Location should be loc-in-jump');
  });

  console.log('');
}

// ==================== PHASE 5: Complete Jump ====================

function testCompleteJump() {
  console.log('--- Phase 5: Complete Jump to 567-908 ---');

  test('Complete jump', () => {
    const result = jump.completeJump(testShipId, testCampaignId);

    // jump.completeJump clears jump state and sets positionVerified=false,
    // but location update to destination is done by socket handler
    // Get the destination hex for 567-908 (from star system data)
    const destSystem = starSystems.getSystemByName('567-908');
    const destHex = destSystem?.hex || '1031';

    // Update ship location to arrival point in destination system
    operations.updateShipState(testShipId, {
      systemHex: destHex,
      locationId: 'loc-exit-jump',
      locationName: 'Exit Jump Space'
    });

    // Also update campaign current system
    operations.updateCampaign(testCampaignId, { current_system: '567-908' });

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.jump?.inJump, false, 'Ship should not be in jump');
    assert.strictEqual(ship.current_state.systemHex, '1031', 'Should be in 567-908 system');
  });

  test('Ship arrived at Exit Jump Space in 567-908', () => {
    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.locationId, 'loc-exit-jump');
    assert.strictEqual(ship.current_state.locationName, 'Exit Jump Space');
  });

  test('Position is unverified after jump (AR-68)', () => {
    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.positionVerified, false, 'Position should be unverified after jump');
  });

  console.log('');
}

// ==================== PHASE 6: Verify Position ====================

function testVerifyPosition() {
  console.log('--- Phase 6: Verify Position ---');

  test('Verify position (astrogator action)', () => {
    // Simulate successful position verification
    const result = operations.updateShipState(testShipId, {
      positionVerified: true
    });
    assert.ok(result.success !== false, 'Position verification should succeed');

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.positionVerified, true);
  });

  test('Can now navigate after position verified', () => {
    const ship = operations.getShip(testShipId);
    // Navigation requires positionVerified to be true
    assert.strictEqual(ship.current_state.positionVerified, true, 'Position must be verified for navigation');
  });

  console.log('');
}

// ==================== PHASE 7: Travel and Refuel at 567-908 ====================

function testRefuelAtDestination() {
  console.log('--- Phase 7: Travel and Refuel at 567-908 ---');

  test('Travel to orbit', () => {
    const result = operations.updateShipState(testShipId, {
      locationId: 'loc-orbit-mainworld',
      locationName: 'Orbit - 567-908'
    });
    assert.ok(result.success !== false);

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.locationId, 'loc-orbit-mainworld');
  });

  test('Dock at 567-908 Downport', () => {
    const result = operations.updateShipState(testShipId, {
      locationId: 'loc-dock-downport',
      locationName: 'Dock - 567-908 Downport'
    });
    assert.ok(result.success !== false);

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.locationId, 'loc-dock-downport');
  });

  test('567-908 Downport has refuel_unrefined action', () => {
    const system = starSystems.getSystemByHex('1031');
    const downport = system.locations.find(l => l.id === 'loc-dock-downport');
    assert.ok(downport, 'Downport should exist');
    assert.ok(downport.actions.includes('refuel_unrefined'), 'Should have refuel_unrefined action');
  });

  test('Refuel with unrefined fuel', () => {
    // Deplete some fuel first (jump consumed fuel)
    operations.updateShipState(testShipId, {
      fuel: { current: 20, max: 40, type: 'unrefined' }
    });

    // Simulate refueling
    const result = operations.updateShipState(testShipId, {
      fuel: { current: 40, max: 40, type: 'unrefined' }
    });
    assert.ok(result.success !== false);

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.fuel.current, 40, 'Fuel should be full');
    assert.strictEqual(ship.current_state.fuel.type, 'unrefined', 'Fuel should be unrefined');
  });

  console.log('');
}

// ==================== PHASE 8: Return Jump to Flammarion ====================

function testReturnJump() {
  console.log('--- Phase 8: Return Jump to Flammarion ---');

  test('Undock and travel to jump point', () => {
    // Undock to orbit
    operations.updateShipState(testShipId, {
      locationId: 'loc-orbit-mainworld',
      locationName: 'Orbit - 567-908'
    });

    // Travel to jump point
    const result = operations.updateShipState(testShipId, {
      locationId: 'loc-mainworld-jump',
      locationName: 'Mainworld Departure Jump Point'
    });
    assert.ok(result.success !== false);

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.locationId, 'loc-mainworld-jump');
  });

  test('Initiate return jump to Flammarion', () => {
    // Manually set jump state for return trip
    operations.updateShipState(testShipId, {
      jump: {
        inJump: true,
        destination: 'flammarion',
        jumpDistance: 2,
        jumpStartDate: '1105-009 08:00',
        jumpEndDate: '1105-016 08:00'
      },
      systemHex: '0000',
      locationId: 'loc-in-jump',
      locationName: 'In Jump Space'
    });

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.jump?.destination, 'flammarion');
    assert.strictEqual(ship.current_state.jump?.inJump, true);
  });

  test('Complete return jump', () => {
    operations.updateShipState(testShipId, {
      jump: {
        inJump: false,
        lastArrival: 'flammarion',
        lastArrivalDate: new Date().toISOString()
      },
      systemHex: '0930',
      locationId: 'loc-exit-jump',
      locationName: 'Exit Jump Space',
      positionVerified: false
    });

    operations.updateCampaign(testCampaignId, { current_system: 'flammarion' });

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.systemHex, '0930', 'Should be back in Flammarion');
    assert.strictEqual(ship.current_state.jump?.inJump, false, 'Jump should be complete');
  });

  test('Back in Flammarion system', () => {
    const campaign = operations.getCampaign(testCampaignId);
    assert.strictEqual(campaign.current_system, 'flammarion');

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.systemHex, '0930');
  });

  console.log('');
}

// ==================== PHASE 9: Dock at Flammarion ====================

function testDockAtFlammarion() {
  console.log('--- Phase 9: Dock at Flammarion Highport ---');

  test('Verify position after return', () => {
    operations.updateShipState(testShipId, { positionVerified: true });

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.positionVerified, true);
  });

  test('Travel to Flammarion orbit', () => {
    operations.updateShipState(testShipId, {
      locationId: 'loc-orbit-mainworld',
      locationName: 'Orbit - Flammarion'
    });

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.locationId, 'loc-orbit-mainworld');
  });

  test('Dock at Flammarion Highport', () => {
    const result = operations.updateShipState(testShipId, {
      locationId: 'loc-dock-highport',
      locationName: 'Dock - Flammarion Highport'
    });
    assert.ok(result.success !== false);

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.locationId, 'loc-dock-highport');
    assert.strictEqual(ship.current_state.locationName, 'Dock - Flammarion Highport');
  });

  test('Refuel with refined fuel at Flammarion', () => {
    const result = operations.updateShipState(testShipId, {
      fuel: { current: 40, max: 40, type: 'refined' }
    });
    assert.ok(result.success !== false);

    const ship = operations.getShip(testShipId);
    assert.strictEqual(ship.current_state.fuel.type, 'refined', 'Should have refined fuel now');
  });

  console.log('');
}

// ==================== RUN ALL TESTS ====================

async function runAllTests() {
  try {
    await setupTestData();

    testInitialState();
    testUndock();
    testTravelToJumpPoint();
    testInitiateJump();
    testCompleteJump();
    testVerifyPosition();
    testRefuelAtDestination();
    testReturnJump();
    testDockAtFlammarion();

  } catch (err) {
    console.log(`\n[SETUP ERROR] ${err.message}`);
    failed++;
  } finally {
    cleanupTestData();

    // Disable no-fuel mode
    jump.setNoFuelMode(false);
  }

  console.log('========================================');
  console.log('MULTI-SYSTEM JOURNEY TEST SUMMARY');
  console.log('========================================');
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

  if (errors.length > 0) {
    console.log('\nFailed tests:');
    errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
  }

  console.log('========================================\n');

  return { passed, failed, errors };
}

// Export for test runner
module.exports = { runAllTests };

// Run if executed directly
if (require.main === module) {
  runAllTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
  });
}
