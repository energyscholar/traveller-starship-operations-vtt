/**
 * Engineer ViewModel Tests
 * Verifies engineer ViewModel wraps state without duplication
 */

const { createEngineerViewModel } = require('../../lib/viewmodels/role-viewmodels/engineer-viewmodel');
const { getEngineerState } = require('../../lib/engine/roles/engineer-state');

function runTests() {
  console.log('=== Engineer ViewModel Tests ===\n');
  const results = { passed: 0, failed: 0 };

  // Mock data
  const mockShipState = { fuel: { current: 20, max: 40 }, power: { used: 80, max: 100 } };
  const mockTemplate = { fuel: 40, power: 100 };
  const mockSystemStatus = { mDrive: 'operational', jDrive: 'operational', power: 'operational' };
  const mockDamagedSystems = [{ id: 'sensors', name: 'Sensors', damage: 2 }];
  const mockFuelStatus = { total: 20, max: 40, percentFull: 50, canJump: true, hasFuelProcessor: true, breakdown: { refined: 15, unrefined: 5 } };
  const mockRepairQueue = [];

  // Test 1: ViewModel wraps state correctly
  const vm = createEngineerViewModel(mockShipState, mockTemplate, mockSystemStatus, mockDamagedSystems, mockFuelStatus, mockRepairQueue);
  const state = getEngineerState(mockShipState, mockTemplate, mockSystemStatus, mockDamagedSystems, mockFuelStatus, mockRepairQueue);

  if (vm.data && state) {
    console.log('✓ ViewModel data wraps state');
    results.passed++;
  } else {
    console.log('✗ ViewModel data missing');
    results.failed++;
  }

  // Test 2: Derived statusBadge exists
  if (vm.derived && vm.derived.statusBadge) {
    console.log(`✓ derived.statusBadge exists: "${vm.derived.statusBadge}"`);
    results.passed++;
  } else {
    console.log('✗ derived.statusBadge missing');
    results.failed++;
  }

  // Test 3: Derived statusClass exists
  if (vm.derived && vm.derived.statusClass) {
    console.log(`✓ derived.statusClass exists: "${vm.derived.statusClass}"`);
    results.passed++;
  } else {
    console.log('✗ derived.statusClass missing');
    results.failed++;
  }

  // Test 4: Fuel display values exist
  if (vm.derived.fuelText && vm.derived.fuelPercentText) {
    console.log(`✓ fuel display values: "${vm.derived.fuelText}", "${vm.derived.fuelPercentText}"`);
    results.passed++;
  } else {
    console.log('✗ fuel display values missing');
    results.failed++;
  }

  // Test 5: Actions have enabled/reason structure
  if (vm.actions.repair && typeof vm.actions.repair.enabled === 'boolean' &&
      (vm.actions.repair.reason === null || typeof vm.actions.repair.reason === 'string')) {
    console.log('✓ actions.repair has enabled and reason');
    results.passed++;
  } else {
    console.log('✗ actions.repair structure wrong');
    console.log('  Got:', JSON.stringify(vm.actions.repair));
    results.failed++;
  }

  // Test 6: Actions structure includes adjustPower (always enabled)
  if (vm.actions.adjustPower && vm.actions.adjustPower.enabled === true) {
    console.log('✓ adjustPower action always enabled');
    results.passed++;
  } else {
    console.log('✗ adjustPower action should be enabled');
    results.failed++;
  }

  // Test 7: ViewModel type and version
  if (vm.type === 'engineer' && vm.version === 1) {
    console.log('✓ type is "engineer" and version is 1');
    results.passed++;
  } else {
    console.log(`✗ type="${vm.type}", version=${vm.version}`);
    results.failed++;
  }

  // Test 8: No damaged systems disables repair
  const vmNoDamage = createEngineerViewModel(mockShipState, mockTemplate, mockSystemStatus, [], mockFuelStatus, mockRepairQueue);
  if (vmNoDamage.actions.repair.enabled === false && vmNoDamage.actions.repair.reason) {
    console.log(`✓ repair disabled when no damage: "${vmNoDamage.actions.repair.reason}"`);
    results.passed++;
  } else {
    console.log('✗ repair should be disabled when no damage');
    results.failed++;
  }

  console.log(`\n=== Results: ${results.passed}/${results.passed + results.failed} passed ===`);
  console.log(`PASSED: ${results.passed}/${results.passed + results.failed}`);
  return results.failed === 0;
}

if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };
