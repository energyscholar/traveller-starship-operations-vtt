/**
 * Comms ViewModel Tests
 */

const { createCommsViewModel } = require('../../lib/viewmodels/role-viewmodels/comms-viewmodel');

function runTests() {
  console.log('=== Comms ViewModel Tests ===\n');
  const results = { passed: 0, failed: 0 };

  // Test 1: ViewModel structure
  const vm = createCommsViewModel({}, [], {});
  if (vm.type === 'comms' && vm.version === 1 && vm.data && vm.derived && vm.actions) {
    console.log('✓ ViewModel has correct structure');
    results.passed++;
  } else {
    console.log('✗ ViewModel structure wrong');
    results.failed++;
  }

  // Test 2: Jamming disables send
  const vmJammed = createCommsViewModel({}, [], { jammed: true });
  if (vmJammed.derived.statusBadge === 'JAMMED' && vmJammed.actions.send.enabled === false) {
    console.log('✓ Jamming shows JAMMED and disables send');
    results.passed++;
  } else {
    console.log(`✗ Wrong status: "${vmJammed.derived.statusBadge}", send=${vmJammed.actions.send.enabled}`);
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
