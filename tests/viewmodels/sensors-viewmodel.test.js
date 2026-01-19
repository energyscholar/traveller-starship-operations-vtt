/**
 * Sensors ViewModel Tests
 * Verifies sensors ViewModel wraps state without duplication
 */

const { createSensorsViewModel } = require('../../lib/viewmodels/role-viewmodels/sensors-viewmodel');
const { getSensorsState } = require('../../lib/engine/roles/sensors-state');

function runTests() {
  console.log('=== Sensors ViewModel Tests ===\n');
  const results = { passed: 0, failed: 0 };

  // Mock data with contacts
  const mockShipState = { sensors: { active: true, lock: null } };
  const mockContacts = [
    { id: 'c1', designation: 'Hostile-1', marking: 'hostile', type: 'ship', range_km: 1000 },
    { id: 'c2', designation: 'Neutral-1', marking: 'neutral', type: 'ship', range_km: 5000 }
  ];
  const mockEnvironmental = null;
  const mockPanelMode = 'expanded';

  // Test 1: ViewModel wraps state correctly
  const vm = createSensorsViewModel(mockShipState, mockContacts, mockEnvironmental, mockPanelMode);
  const state = getSensorsState(mockShipState, mockContacts, mockEnvironmental, mockPanelMode);

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

  // Test 3: Contact counts display
  if (vm.derived.contactCountText && vm.derived.threatCountText) {
    console.log(`✓ contact displays: "${vm.derived.contactCountText}", "${vm.derived.threatCountText}"`);
    results.passed++;
  } else {
    console.log('✗ contact display values missing');
    results.failed++;
  }

  // Test 4: Actions have enabled/reason structure
  if (vm.actions.scan && typeof vm.actions.scan.enabled === 'boolean') {
    console.log('✓ actions.scan has enabled property');
    results.passed++;
  } else {
    console.log('✗ actions.scan structure wrong');
    results.failed++;
  }

  // Test 5: ViewModel type and version
  if (vm.type === 'sensors' && vm.version === 1) {
    console.log('✓ type is "sensors" and version is 1');
    results.passed++;
  } else {
    console.log(`✗ type="${vm.type}", version=${vm.version}`);
    results.failed++;
  }

  // Test 6: No contacts changes behavior
  const vmNoContacts = createSensorsViewModel(mockShipState, [], null, mockPanelMode);
  if (vmNoContacts.actions.scan.enabled === false && vmNoContacts.actions.scan.reason) {
    console.log(`✓ scan disabled with no contacts: "${vmNoContacts.actions.scan.reason}"`);
    results.passed++;
  } else {
    console.log('✗ scan should be disabled with no contacts');
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
