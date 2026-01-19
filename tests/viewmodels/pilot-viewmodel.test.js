/**
 * Pilot ViewModel Tests
 * Verifies pilot ViewModel wraps state without duplication
 */

const { createPilotViewModel } = require('../../lib/viewmodels/role-viewmodels/pilot-viewmodel');
const { getPilotState } = require('../../lib/engine/roles/pilot-state');

function runTests() {
  console.log('=== Pilot ViewModel Tests ===\n');
  const results = { passed: 0, failed: 0 };

  // Mock data - normal flight
  const mockShipState = { mDrive: { disabled: false }, jDrive: { disabled: false } };
  const mockTemplate = { thrust: 2, jump: 2 };
  const mockCampaign = { currentSystem: 'Regina', currentLocation: 'Orbit' };
  const mockJumpStatus = { inJump: false, plotted: false };
  const mockFlightConditions = null;
  const mockPendingTravel = null;

  // Test 1: ViewModel wraps state correctly
  const vm = createPilotViewModel(mockShipState, mockTemplate, mockCampaign, mockJumpStatus, mockFlightConditions, mockPendingTravel);
  const state = getPilotState(mockShipState, mockTemplate, mockCampaign, mockJumpStatus, mockFlightConditions, mockPendingTravel);

  if (vm.data && state) {
    console.log('✓ ViewModel data wraps state');
    results.passed++;
  } else {
    console.log('✗ ViewModel data missing');
    results.failed++;
  }

  // Test 2: Derived statusBadge for normal flight
  if (vm.derived && vm.derived.statusBadge) {
    console.log(`✓ derived.statusBadge exists: "${vm.derived.statusBadge}"`);
    results.passed++;
  } else {
    console.log('✗ derived.statusBadge missing');
    results.failed++;
  }

  // Test 3: Navigation display values
  if (vm.derived.locationText !== undefined && vm.derived.thrustText) {
    console.log(`✓ navigation display: location="${vm.derived.locationText}", thrust="${vm.derived.thrustText}"`);
    results.passed++;
  } else {
    console.log('✗ navigation display missing');
    results.failed++;
  }

  // Test 4: Actions have enabled/reason structure
  if (vm.actions.setThrust && typeof vm.actions.setThrust.enabled === 'boolean') {
    console.log('✓ actions.setThrust has enabled property');
    results.passed++;
  } else {
    console.log('✗ actions.setThrust structure wrong');
    results.failed++;
  }

  // Test 5: ViewModel type and version
  if (vm.type === 'pilot' && vm.version === 1) {
    console.log('✓ type is "pilot" and version is 1');
    results.passed++;
  } else {
    console.log(`✗ type="${vm.type}", version=${vm.version}`);
    results.failed++;
  }

  // Test 6: In-jump state changes display
  const jumpVm = createPilotViewModel(mockShipState, mockTemplate, mockCampaign, { inJump: true, hoursRemaining: 168 }, null, null);
  if (jumpVm.derived.statusBadge === 'IN JUMP' && jumpVm.derived.statusClass === 'in-jump') {
    console.log('✓ in-jump status displays correctly');
    results.passed++;
  } else {
    console.log(`✗ in-jump status wrong: badge="${jumpVm.derived.statusBadge}", class="${jumpVm.derived.statusClass}"`);
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
