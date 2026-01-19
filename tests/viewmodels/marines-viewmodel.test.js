/**
 * Marines ViewModel Tests
 */

const { createMarinesViewModel } = require('../../lib/viewmodels/role-viewmodels/marines-viewmodel');

function runTests() {
  console.log('=== Marines ViewModel Tests ===\n');
  const results = { passed: 0, failed: 0 };

  // Test 1: ViewModel structure
  const vm = createMarinesViewModel({}, [], {});
  if (vm.type === 'marines' && vm.version === 1 && vm.data && vm.derived && vm.actions) {
    console.log('✓ ViewModel has correct structure');
    results.passed++;
  } else {
    console.log('✗ ViewModel structure wrong');
    results.failed++;
  }

  // Test 2: Ready marines enables deploy
  const squad = [{ name: 'Sgt Jones', status: 'ready' }, { name: 'Pvt Smith', status: 'ready' }];
  const vmReady = createMarinesViewModel({}, squad, {});
  if (vmReady.derived.statusBadge === 'READY' && vmReady.actions.deploy.enabled === true) {
    console.log('✓ Ready marines shows READY and enables deploy');
    results.passed++;
  } else {
    console.log(`✗ Wrong status: "${vmReady.derived.statusBadge}", deploy=${vmReady.actions.deploy.enabled}`);
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
