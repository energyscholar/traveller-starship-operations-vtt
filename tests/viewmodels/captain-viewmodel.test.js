/**
 * Captain ViewModel Tests
 * Verifies captain ViewModel wraps state without duplication
 */

const { createCaptainViewModel } = require('../../lib/viewmodels/role-viewmodels/captain-viewmodel');
const { getCaptainState } = require('../../lib/engine/roles/captain-state');

function runTests() {
  console.log('=== Captain ViewModel Tests ===\n');
  const results = { passed: 0, failed: 0 };

  // Mock data
  const mockShipState = { alert: { level: 'green' }, combat: { active: false } };
  const mockTemplate = { name: 'Scout', class: 'Type S' };
  const mockShip = { name: 'ISS Beagle', class: 'Scout' };
  const mockCrewOnline = ['pilot', 'engineer', 'gunner'];
  const mockContacts = [{ id: 'c1', marking: 'hostile' }];
  const mockRescueTargets = [];

  // Test 1: ViewModel wraps state correctly
  const vm = createCaptainViewModel(mockShipState, mockTemplate, mockShip, mockCrewOnline, mockContacts, mockRescueTargets);
  const state = getCaptainState(mockShipState, mockTemplate, mockShip, mockCrewOnline, mockContacts, mockRescueTargets);

  if (vm.data && state) {
    console.log('✓ ViewModel data wraps state');
    results.passed++;
  } else {
    console.log('✗ ViewModel data missing');
    results.failed++;
  }

  // Test 2: Derived statusBadge for normal state
  if (vm.derived && vm.derived.statusBadge === 'NORMAL') {
    console.log(`✓ derived.statusBadge is "NORMAL" for green alert`);
    results.passed++;
  } else {
    console.log(`✗ statusBadge wrong: "${vm.derived?.statusBadge}"`);
    results.failed++;
  }

  // Test 3: Crew count display
  if (vm.derived.crewCountText) {
    console.log(`✓ crewCountText exists: "${vm.derived.crewCountText}"`);
    results.passed++;
  } else {
    console.log('✗ crewCountText missing');
    results.failed++;
  }

  // Test 4: Actions have enabled/reason structure
  if (vm.actions.setAlert && typeof vm.actions.setAlert.enabled === 'boolean') {
    console.log('✓ actions.setAlert has enabled property');
    results.passed++;
  } else {
    console.log('✗ actions.setAlert structure wrong');
    results.failed++;
  }

  // Test 5: ViewModel type and version
  if (vm.type === 'captain' && vm.version === 1) {
    console.log('✓ type is "captain" and version is 1');
    results.passed++;
  } else {
    console.log(`✗ type="${vm.type}", version=${vm.version}`);
    results.failed++;
  }

  // Test 6: Ship info displays correctly
  if (vm.derived.shipNameText && vm.derived.shipClassText) {
    console.log(`✓ ship displays: "${vm.derived.shipNameText}", "${vm.derived.shipClassText}"`);
    results.passed++;
  } else {
    console.log('✗ ship display values missing');
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
