/**
 * Steward ViewModel Tests
 */

const { createStewardViewModel } = require('../../lib/viewmodels/role-viewmodels/steward-viewmodel');

function runTests() {
  console.log('=== Steward ViewModel Tests ===\n');
  const results = { passed: 0, failed: 0 };

  // Test 1: ViewModel structure
  const vm = createStewardViewModel({}, [], {});
  if (vm.type === 'steward' && vm.version === 1 && vm.data && vm.derived && vm.actions) {
    console.log('✓ ViewModel has correct structure');
    results.passed++;
  } else {
    console.log('✗ ViewModel structure wrong');
    results.failed++;
  }

  // Test 2: Low provisions changes status
  const vmLow = createStewardViewModel({}, [], { current: 10, max: 100 });
  if (vmLow.derived.statusBadge === 'LOW SUPPLIES' && vmLow.actions.rationing.enabled === true) {
    console.log('✓ Low provisions shows LOW SUPPLIES and enables rationing');
    results.passed++;
  } else {
    console.log(`✗ Wrong status: "${vmLow.derived.statusBadge}", rationing=${vmLow.actions.rationing.enabled}`);
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
