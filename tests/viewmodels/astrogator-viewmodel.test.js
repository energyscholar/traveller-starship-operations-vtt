/**
 * Astrogator ViewModel Tests
 * Verifies astrogator ViewModel wraps state without duplication
 */

const { createAstrogatorViewModel } = require('../../lib/viewmodels/role-viewmodels/astrogator-viewmodel');
const { getAstrogatorState } = require('../../lib/engine/roles/astrogator-state');

function runTests() {
  console.log('=== Astrogator ViewModel Tests ===\n');
  const results = { passed: 0, failed: 0 };

  // Mock data
  const mockShipState = { jDrive: { disabled: false } };
  const mockTemplate = { jump: 2, fuel: 40 };
  const mockJumpStatus = { inJump: false, plotted: false, destination: null };
  const mockCampaign = { currentSystem: 'Regina', sector: 'Spinward Marches' };
  const mockSystemStatus = { jDrive: 'operational' };

  // Test 1: ViewModel wraps state correctly
  const vm = createAstrogatorViewModel(mockShipState, mockTemplate, mockJumpStatus, mockCampaign, mockSystemStatus);
  const state = getAstrogatorState(mockShipState, mockTemplate, mockJumpStatus, mockCampaign, mockSystemStatus);

  if (vm.data && state) {
    console.log('✓ ViewModel data wraps state');
    results.passed++;
  } else {
    console.log('✗ ViewModel data missing');
    results.failed++;
  }

  // Test 2: Derived statusBadge for standby
  if (vm.derived && vm.derived.statusBadge === 'STANDBY') {
    console.log('✓ derived.statusBadge is "STANDBY" when no jump plotted');
    results.passed++;
  } else {
    console.log(`✗ statusBadge wrong: "${vm.derived?.statusBadge}"`);
    results.failed++;
  }

  // Test 3: Jump rating display
  if (vm.derived.jumpRatingText && vm.derived.jumpRangeText) {
    console.log(`✓ jump displays: "${vm.derived.jumpRatingText}", "${vm.derived.jumpRangeText}"`);
    results.passed++;
  } else {
    console.log('✗ jump display values missing');
    results.failed++;
  }

  // Test 4: Actions have enabled/reason structure
  if (vm.actions.plotJump && typeof vm.actions.plotJump.enabled === 'boolean') {
    console.log('✓ actions.plotJump has enabled property');
    results.passed++;
  } else {
    console.log('✗ actions.plotJump structure wrong');
    results.failed++;
  }

  // Test 5: ViewModel type and version
  if (vm.type === 'astrogator' && vm.version === 1) {
    console.log('✓ type is "astrogator" and version is 1');
    results.passed++;
  } else {
    console.log(`✗ type="${vm.type}", version=${vm.version}`);
    results.failed++;
  }

  // Test 6: In-jump status changes display
  const inJumpStatus = { inJump: true, destination: 'Efate', hoursRemaining: 120 };
  const jumpVm = createAstrogatorViewModel(mockShipState, mockTemplate, inJumpStatus, mockCampaign, mockSystemStatus);
  if (jumpVm.derived.statusBadge === 'IN JUMP' && jumpVm.derived.statusClass === 'in-jump') {
    console.log('✓ in-jump status displays correctly');
    results.passed++;
  } else {
    console.log(`✗ in-jump wrong: badge="${jumpVm.derived.statusBadge}", class="${jumpVm.derived.statusClass}"`);
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
