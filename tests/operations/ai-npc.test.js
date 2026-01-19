/**
 * AI NPC Response System Tests
 * Tests for lib/operations/ai-npc.js
 * Tests exports and basic functionality without requiring full DB setup
 */

const aiNpc = require('../../lib/operations/ai-npc');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected truthy, got ${value}`);
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected ${expected}, got ${actual}`);
  }
}

console.log('=== AI NPC Tests ===\n');

// Test 1: AI_STATUS constants exist
test('AI_STATUS has expected values', () => {
  assertTrue(aiNpc.AI_STATUS, 'Should have AI_STATUS');
  assertTrue(aiNpc.AI_STATUS.PENDING, 'Should have PENDING');
  assertTrue(aiNpc.AI_STATUS.APPROVED, 'Should have APPROVED');
});

// Test 2: Module exports hasAIKey function
test('hasAIKey is exported as function', () => {
  assertTrue(typeof aiNpc.hasAIKey === 'function', 'Should be function');
});

// Test 3: hasAIKey returns boolean
test('hasAIKey returns boolean', () => {
  const result = aiNpc.hasAIKey('nonexistent_campaign');
  assertEqual(typeof result, 'boolean', 'Should return boolean');
});

// Test 4: Module exports buildNPCPrompt function
test('buildNPCPrompt is exported as function', () => {
  assertTrue(typeof aiNpc.buildNPCPrompt === 'function', 'Should be function');
});

// Test 5: buildNPCPrompt creates prompt structure
test('buildNPCPrompt creates prompt', () => {
  const npc = { name: 'Test NPC', personality: 'Gruff' };
  const context = { playerMessage: 'Hello', situation: 'Docked' };
  const result = aiNpc.buildNPCPrompt(npc, context);
  assertTrue(result, 'Should return prompt');
});

// Test 6: Module exports queueForReview function
test('queueForReview is exported as function', () => {
  assertTrue(typeof aiNpc.queueForReview === 'function', 'Should be function');
});

// Test 7: Module exports getPendingResponses function
test('getPendingResponses is exported as function', () => {
  assertTrue(typeof aiNpc.getPendingResponses === 'function', 'Should be function');
});

// Test 8: getPendingResponses returns array
test('getPendingResponses returns array for nonexistent campaign', () => {
  const result = aiNpc.getPendingResponses('nonexistent_campaign');
  assertTrue(Array.isArray(result), 'Should return array');
});

// Test 9: Module exports isAIAvailable function
test('isAIAvailable is exported as function', () => {
  assertTrue(typeof aiNpc.isAIAvailable === 'function', 'Should be function');
});

// Test 10: Module exports generateNPCResponse function
test('generateNPCResponse is exported as function', () => {
  assertTrue(typeof aiNpc.generateNPCResponse === 'function', 'Should be function');
});

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
console.log(`PASSED: ${passed}/${passed + failed}`);

if (failed > 0) process.exit(1);
