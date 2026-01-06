// TUI Filter Tests
// Verifies filter hotkeys and message filtering work correctly

const {
  cycleVerbosity,
  toggleCritsOnly,
  toggleDamageOnly,
  togglePhaseEvents,
  setCustomFilter,
  resetFilters,
  shouldShow,
  handleHotkey,
  tagMessage,
  getState,
  setState,
  getFilterStatus
} = require('../../lib/engine/tui-filters');

console.log('========================================');
console.log('TUI FILTER TESTS');
console.log('========================================\n');

let passCount = 0;
let failCount = 0;

function test(description, fn) {
  try {
    resetFilters(); // Reset before each test
    fn();
    console.log(`✓ ${description}`);
    passCount++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  ${error.message}`);
    failCount++;
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertTrue(condition, msg = '') {
  if (!condition) throw new Error(msg || 'Expected true');
}

function assertFalse(condition, msg = '') {
  if (condition) throw new Error(msg || 'Expected false');
}

// ============================================================
// VERBOSITY TESTS
// ============================================================
console.log('--- Verbosity (6 tests) ---\n');

test('Verbosity: Default is NORMAL', () => {
  assertEqual(getState().verbosity, 'NORMAL');
});

test('Verbosity: Cycle through levels', () => {
  assertEqual(cycleVerbosity(), 'DETAILED');
  assertEqual(cycleVerbosity(), 'DEBUG');
  assertEqual(cycleVerbosity(), 'NARRATIVE');
  assertEqual(cycleVerbosity(), 'NORMAL');
});

test('Verbosity: NARRATIVE hides detailed messages', () => {
  setState({ verbosity: 'NARRATIVE' });
  assertTrue(shouldShow({ text: 'Story', level: 'narrative' }));
  assertFalse(shouldShow({ text: 'Details', level: 'detailed' }));
});

test('Verbosity: DETAILED shows all except debug', () => {
  setState({ verbosity: 'DETAILED' });
  assertTrue(shouldShow({ text: 'Story', level: 'narrative' }));
  assertTrue(shouldShow({ text: 'Info', level: 'normal' }));
  assertTrue(shouldShow({ text: 'Roll', level: 'detailed' }));
  assertFalse(shouldShow({ text: 'Debug', level: 'debug' }));
});

test('Verbosity: DEBUG shows everything', () => {
  setState({ verbosity: 'DEBUG' });
  assertTrue(shouldShow({ text: 'Debug', level: 'debug' }));
});

test('Verbosity: Hotkey v cycles', () => {
  const result = handleHotkey('v');
  assertTrue(result.handled);
  assertEqual(getState().verbosity, 'DETAILED');
});

// ============================================================
// TYPE FILTER TESTS
// ============================================================
console.log('\n--- Type Filters (8 tests) ---\n');

test('CritsOnly: Toggle on/off', () => {
  assertFalse(getState().critsOnly);
  assertTrue(toggleCritsOnly());
  assertTrue(getState().critsOnly);
  assertFalse(toggleCritsOnly());
});

test('CritsOnly: Only shows crit messages', () => {
  toggleCritsOnly();
  assertTrue(shouldShow({ text: 'Crit!', type: 'crit' }));
  assertFalse(shouldShow({ text: 'Attack', type: 'attack' }));
  assertFalse(shouldShow({ text: 'Phase', type: 'phase' }));
});

test('DamageOnly: Toggle on/off', () => {
  assertFalse(getState().damageOnly);
  assertTrue(toggleDamageOnly());
  assertTrue(getState().damageOnly);
});

test('DamageOnly: Shows damage and crit messages', () => {
  toggleDamageOnly();
  assertTrue(shouldShow({ text: '10 damage', type: 'damage' }));
  assertTrue(shouldShow({ text: 'Crit!', type: 'crit' }));
  assertFalse(shouldShow({ text: 'Attack', type: 'attack' }));
});

test('CritsOnly and DamageOnly: Mutually exclusive', () => {
  toggleCritsOnly();
  assertTrue(getState().critsOnly);

  toggleDamageOnly();
  assertFalse(getState().critsOnly);
  assertTrue(getState().damageOnly);
});

test('PhaseEvents: Toggle hides phase messages', () => {
  assertTrue(shouldShow({ text: 'Attack phase', type: 'phase' }));
  togglePhaseEvents();
  assertFalse(shouldShow({ text: 'Attack phase', type: 'phase' }));
});

test('Hotkey c toggles crits', () => {
  handleHotkey('c');
  assertTrue(getState().critsOnly);
});

test('Hotkey d toggles damage', () => {
  handleHotkey('d');
  assertTrue(getState().damageOnly);
});

// ============================================================
// CUSTOM FILTER TESTS
// ============================================================
console.log('\n--- Custom Filter (4 tests) ---\n');

test('Custom: Regex filter matches text', () => {
  setCustomFilter('laser');
  assertTrue(shouldShow({ text: 'Pulse laser fires!' }));
  assertFalse(shouldShow({ text: 'Missile launch' }));
});

test('Custom: Case insensitive', () => {
  setCustomFilter('AURORA');
  assertTrue(shouldShow({ text: 'Aurora attacks' }));
});

test('Custom: Clear with null', () => {
  setCustomFilter('test');
  assertFalse(shouldShow({ text: 'nothing' }));
  setCustomFilter(null);
  assertTrue(shouldShow({ text: 'nothing' }));
});

test('Custom: Invalid regex is ignored', () => {
  setCustomFilter('[invalid');
  assertTrue(shouldShow({ text: 'any message' }));
});

// ============================================================
// RESET TESTS
// ============================================================
console.log('\n--- Reset (3 tests) ---\n');

test('Reset: Clears all filters', () => {
  toggleCritsOnly();
  cycleVerbosity();
  setCustomFilter('test');

  resetFilters();

  assertEqual(getState().verbosity, 'NORMAL');
  assertFalse(getState().critsOnly);
  assertEqual(getState().customFilter, null);
});

test('Hotkey a resets filters', () => {
  toggleDamageOnly();
  handleHotkey('a');
  assertFalse(getState().damageOnly);
});

test('Reset: Phase events back to true', () => {
  togglePhaseEvents();
  assertFalse(getState().phaseEvents);
  resetFilters();
  assertTrue(getState().phaseEvents);
});

// ============================================================
// STATUS TESTS
// ============================================================
console.log('\n--- Status Display (3 tests) ---\n');

test('Status: Default shows verbosity', () => {
  const status = getFilterStatus();
  assertTrue(status.includes('V:N'));
});

test('Status: Shows active filters', () => {
  toggleCritsOnly();
  const status = getFilterStatus();
  assertTrue(status.includes('CRITS'));
});

test('Status: Shows custom filter', () => {
  setCustomFilter('aurora');
  const status = getFilterStatus();
  assertTrue(status.includes('/aurora/'));
});

// ============================================================
// TAG MESSAGE TESTS
// ============================================================
console.log('\n--- Tag Message (2 tests) ---\n');

test('TagMessage: Creates proper structure', () => {
  const msg = tagMessage('Test message', { level: 'detailed', type: 'attack' });
  assertEqual(msg.text, 'Test message');
  assertEqual(msg.level, 'detailed');
  assertEqual(msg.type, 'attack');
  assertTrue(msg.timestamp > 0);
});

test('TagMessage: Defaults to normal/info', () => {
  const msg = tagMessage('Simple');
  assertEqual(msg.level, 'normal');
  assertEqual(msg.type, 'info');
});

// ============================================================
// SUMMARY
// ============================================================
console.log('\n========================================');
console.log('TUI FILTER TEST RESULTS');
console.log('========================================');
console.log(`PASSED: ${passCount}/${passCount + failCount}`);
console.log(`FAILED: ${failCount}/${passCount + failCount}`);

if (failCount === 0) {
  console.log('\n✅ ALL TESTS PASSED');
} else {
  console.log('\n❌ SOME TESTS FAILED');
  process.exitCode = 1;
}
