/**
 * Damage Control ViewModel Tests
 * Verifies damage control ViewModel wraps state without duplication
 */

const { createDamageControlViewModel, getDamageControlState } = require('../../lib/viewmodels/role-viewmodels/damage-control-viewmodel');

function runTests() {
  console.log('=== Damage Control ViewModel Tests ===\n');
  const results = { passed: 0, failed: 0 };

  // Mock data with damage
  const mockShipState = { hull: { current: 80 } };
  const mockTemplate = { hull: 100 };
  const mockDamagedSystems = [{ id: 'sensors', name: 'Sensors', damage: 2 }];
  const mockFires = [{ id: 'fire1', location: 'Engineering', severity: 2 }];
  const mockBreaches = [];

  // Test 1: ViewModel wraps state correctly
  const vm = createDamageControlViewModel(mockShipState, mockTemplate, mockDamagedSystems, mockFires, mockBreaches);
  const state = getDamageControlState(mockShipState, mockTemplate, mockDamagedSystems, mockFires, mockBreaches);

  if (vm.data && state) {
    console.log('✓ ViewModel data wraps state');
    results.passed++;
  } else {
    console.log('✗ ViewModel data missing');
    results.failed++;
  }

  // Test 2: Derived statusBadge for emergency (fire active)
  if (vm.derived && vm.derived.statusBadge === 'EMERGENCY') {
    console.log('✓ derived.statusBadge is "EMERGENCY" with active fire');
    results.passed++;
  } else {
    console.log(`✗ statusBadge wrong: "${vm.derived?.statusBadge}"`);
    results.failed++;
  }

  // Test 3: Hull display values
  if (vm.derived.hullText && vm.derived.hullPercentText) {
    console.log(`✓ hull displays: "${vm.derived.hullText}", "${vm.derived.hullPercentText}"`);
    results.passed++;
  } else {
    console.log('✗ hull display values missing');
    results.failed++;
  }

  // Test 4: Damage count display
  if (vm.derived.damageCountText && vm.derived.fireCountText) {
    console.log(`✓ damage displays: "${vm.derived.damageCountText}", "${vm.derived.fireCountText}"`);
    results.passed++;
  } else {
    console.log('✗ damage display values missing');
    results.failed++;
  }

  // Test 5: Actions have enabled/reason structure
  if (vm.actions.firefighting && typeof vm.actions.firefighting.enabled === 'boolean') {
    console.log('✓ actions.firefighting has enabled property');
    results.passed++;
  } else {
    console.log('✗ actions.firefighting structure wrong');
    results.failed++;
  }

  // Test 6: Firefighting enabled with active fires
  if (vm.actions.firefighting.enabled === true) {
    console.log('✓ firefighting enabled with active fire');
    results.passed++;
  } else {
    console.log(`✗ firefighting not enabled: "${vm.actions.firefighting.reason}"`);
    results.failed++;
  }

  // Test 7: ViewModel type and version
  if (vm.type === 'damage-control' && vm.version === 1) {
    console.log('✓ type is "damage-control" and version is 1');
    results.passed++;
  } else {
    console.log(`✗ type="${vm.type}", version=${vm.version}`);
    results.failed++;
  }

  // Test 8: All clear state
  const clearVm = createDamageControlViewModel({ hull: { current: 100 } }, mockTemplate, [], [], []);
  if (clearVm.derived.statusBadge === 'ALL CLEAR' && clearVm.derived.statusClass === 'all-clear') {
    console.log('✓ all-clear status displays correctly');
    results.passed++;
  } else {
    console.log(`✗ all-clear wrong: badge="${clearVm.derived.statusBadge}", class="${clearVm.derived.statusClass}"`);
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
