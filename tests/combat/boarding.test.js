/**
 * Boarding Action Tests
 * C2: canBoard, resolveBoarding, difficulty presets
 */

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    if (!process.env.TEST_QUIET) console.log(`  PASS: ${name}`);
  } catch (error) {
    testsFailed++;
    console.error(`  FAIL: ${name}`);
    console.error(`    ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Not equal'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log('Boarding Action Tests');
console.log('='.repeat(50));

const { canBoard, resolveBoarding, DIFFICULTY } = require('../../lib/operations/boarding');

// ─── canBoard ─────────────────────────────────────────────

console.log('\n--- canBoard ---');

test('canBoard: null target is not boardable', () => {
  const result = canBoard(null);
  assert(!result.boardable, 'Should not be boardable');
});

test('canBoard: friendly vessel is not boardable', () => {
  const result = canBoard({ disposition: 'friendly', health: 10, maxHealth: 40 });
  assert(!result.boardable, 'Should not be boardable');
  assert(result.reason.includes('friendly'), 'Reason should mention friendly');
});

test('canBoard: healthy hostile is not boardable', () => {
  const result = canBoard({ disposition: 'hostile', health: 35, maxHealth: 40 });
  assert(!result.boardable, 'Should not be boardable');
  assert(result.reason.includes('25%'), 'Should mention 25% threshold');
});

test('canBoard: <25% HP is boardable', () => {
  const result = canBoard({ disposition: 'hostile', health: 9, maxHealth: 40 });
  assert(result.boardable, 'Should be boardable');
  assert(result.reason.includes('damaged'), 'Should mention damage');
});

test('canBoard: exactly 25% HP is boardable', () => {
  const result = canBoard({ disposition: 'hostile', health: 10, maxHealth: 40 });
  assert(result.boardable, 'Should be boardable at exactly 25%');
});

test('canBoard: 0 HP is boardable', () => {
  const result = canBoard({ disposition: 'hostile', health: 0, maxHealth: 40 });
  assert(result.boardable, 'Should be boardable');
});

test('canBoard: disabled status is boardable', () => {
  const result = canBoard({ disposition: 'hostile', health: 30, maxHealth: 40, status: 'disabled' });
  assert(result.boardable, 'Should be boardable');
  assert(result.reason.includes('disabled'), 'Should mention disabled');
});

test('canBoard: drifting status is boardable', () => {
  const result = canBoard({ disposition: 'hostile', health: 30, maxHealth: 40, status: 'drifting' });
  assert(result.boardable, 'Should be boardable');
});

// ─── DIFFICULTY presets ───────────────────────────────────

console.log('\n--- Difficulty ---');

test('DIFFICULTY has all 4 presets', () => {
  assert(DIFFICULTY.light, 'Should have light');
  assert(DIFFICULTY.moderate, 'Should have moderate');
  assert(DIFFICULTY.heavy, 'Should have heavy');
  assert(DIFFICULTY.desperate, 'Should have desperate');
});

test('light difficulty has negative modifier', () => {
  assert(DIFFICULTY.light.defenderMod < 0, 'Should be negative');
});

test('desperate difficulty has high positive modifier', () => {
  assert(DIFFICULTY.desperate.defenderMod > 0, 'Should be positive');
  assert(DIFFICULTY.desperate.defenderMod >= 4, 'Should be >= 4');
});

// ─── resolveBoarding ─────────────────────────────────────

console.log('\n--- resolveBoarding ---');

test('resolveBoarding returns required fields', () => {
  const result = resolveBoarding({
    marineCount: 4,
    meleeSkill: 2,
    strDM: 1,
    defenderCrew: 3,
    defenderSkill: 0,
    difficulty: 'moderate'
  });

  assert(typeof result.success === 'boolean', 'Should have success');
  assert(typeof result.margin === 'number', 'Should have margin');
  assert(typeof result.attackerRoll === 'number', 'Should have attacker roll');
  assert(typeof result.defenderRoll === 'number', 'Should have defender roll');
  assert(typeof result.marineCasualties === 'number', 'Should have marine casualties');
  assert(typeof result.defenderCasualties === 'number', 'Should have defender casualties');
  assert(typeof result.narration === 'string', 'Should have narration');
  assert(typeof result.captured === 'boolean', 'Should have captured');
  assertEqual(result.captured, result.success, 'Captured should match success');
});

test('resolveBoarding rolls are in valid 2D6 range', () => {
  const result = resolveBoarding({
    marineCount: 4, defenderCrew: 3
  });
  assert(result.attackerRoll >= 2 && result.attackerRoll <= 12, 'Attacker roll in range');
  assert(result.defenderRoll >= 2 && result.defenderRoll <= 12, 'Defender roll in range');
});

test('resolveBoarding marine casualties do not exceed marine count', () => {
  // Run many times to catch edge cases
  for (let i = 0; i < 20; i++) {
    const result = resolveBoarding({
      marineCount: 3, defenderCrew: 10, difficulty: 'desperate'
    });
    assert(result.marineCasualties <= 3, `Casualties ${result.marineCasualties} exceed marine count 3`);
  }
});

test('resolveBoarding defender casualties do not exceed defender crew', () => {
  for (let i = 0; i < 20; i++) {
    const result = resolveBoarding({
      marineCount: 10, meleeSkill: 3, strDM: 2, defenderCrew: 2, difficulty: 'light'
    });
    assert(result.defenderCasualties <= 2, `Casualties ${result.defenderCasualties} exceed crew 2`);
  }
});

test('resolveBoarding narration is non-empty', () => {
  const result = resolveBoarding({ marineCount: 4, defenderCrew: 3 });
  assert(result.narration.length > 0, 'Narration should not be empty');
});

test('resolveBoarding with light difficulty favors attacker', () => {
  // Statistical test: run 100 times with light difficulty and strong marines
  let wins = 0;
  for (let i = 0; i < 100; i++) {
    const result = resolveBoarding({
      marineCount: 8, meleeSkill: 3, strDM: 1, defenderCrew: 2, defenderSkill: 0, difficulty: 'light'
    });
    if (result.success) wins++;
  }
  // With strong marines vs weak defenders on light, should win majority
  assert(wins > 50, `Expected >50 wins with light difficulty, got ${wins}`);
});

test('resolveBoarding defaults to moderate difficulty', () => {
  const result = resolveBoarding({
    marineCount: 4, defenderCrew: 4
  });
  assertEqual(result.difficulty, 'Moderate Resistance', 'Should default to moderate');
});

// ─── Integration: Full boarding scenario ──────────────────

console.log('\n--- Integration ---');

test('full boarding scenario: disable then board', () => {
  // Simulate: corsair at 25% HP, marines board
  const corsair = { disposition: 'hostile', health: 8, maxHealth: 35 };
  const boardCheck = canBoard(corsair);
  assert(boardCheck.boardable, 'Damaged corsair should be boardable');

  const result = resolveBoarding({
    marineCount: 6,
    meleeSkill: 2,
    strDM: 1,
    defenderCrew: 4,
    defenderSkill: 1,
    difficulty: 'moderate'
  });

  // Verify structure regardless of outcome
  assert(typeof result.success === 'boolean', 'Should have outcome');
  assert(result.marineCasualties >= 0, 'Casualties >= 0');
  assert(result.defenderCasualties >= 0, 'Defender casualties >= 0');
  assert(result.narration.length > 10, 'Should have meaningful narration');
});

// ─── Summary ──────────────────────────────────────────────

console.log('\n' + '='.repeat(50));
console.log(`PASSED: ${testsPassed}/${testsPassed + testsFailed}`);
if (testsFailed > 0) {
  console.log(`FAILED: ${testsFailed}`);
  process.exit(1);
}
