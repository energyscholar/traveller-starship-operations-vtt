/**
 * Medic ViewModel Tests
 */

const { createMedicViewModel } = require('../../lib/viewmodels/role-viewmodels/medic-viewmodel');

function runTests() {
  console.log('=== Medic ViewModel Tests ===\n');
  const results = { passed: 0, failed: 0 };

  // Test 1: ViewModel structure
  const vm = createMedicViewModel({}, [], {});
  if (vm.type === 'medic' && vm.version === 1 && vm.data && vm.derived && vm.actions) {
    console.log('✓ ViewModel has correct structure');
    results.passed++;
  } else {
    console.log('✗ ViewModel structure wrong');
    results.failed++;
  }

  // Test 2: Injured crew changes status
  const injuredCrew = [{ name: 'Smith', wounds: 2, status: 'injured' }];
  const vmInjured = createMedicViewModel({}, injuredCrew, {});
  if (vmInjured.derived.statusBadge === 'CASUALTIES' && vmInjured.actions.treat.enabled === true) {
    console.log('✓ Injured crew shows CASUALTIES and enables treat');
    results.passed++;
  } else {
    console.log(`✗ Wrong status: "${vmInjured.derived.statusBadge}", treat=${vmInjured.actions.treat.enabled}`);
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
