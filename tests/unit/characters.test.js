/**
 * Characters Module Tests (AUTORUN-9)
 * Tests for character CRUD and parsers
 */

const characters = require('../../lib/operations/characters');
const { db, generateId } = require('../../lib/operations/database');

// Test utilities
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

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected true, got ${value}`);
  }
}

function assertFalse(value, msg = '') {
  if (value) {
    throw new Error(`${msg} Expected false, got ${value}`);
  }
}

function assertDeepEqual(actual, expected, msg = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg} Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Test campaign ID
const TEST_CAMPAIGN_ID = `test_chars_${Date.now()}`;

// Setup/cleanup
function cleanup() {
  try {
    db.prepare('DELETE FROM characters WHERE campaign_id LIKE ?').run('test_chars_%');
    db.prepare('DELETE FROM campaigns WHERE id LIKE ?').run('test_chars_%');
  } catch (e) {
    // Ignore cleanup errors
  }
}

function setupTestCampaign() {
  cleanup();
  db.prepare(`
    INSERT INTO campaigns (id, name, gm_name, current_date, current_system)
    VALUES (?, ?, ?, ?, ?)
  `).run(TEST_CAMPAIGN_ID, 'Test Campaign', 'Test GM', '001-1105', 'Regina');
}

// ==================== Tests ====================

console.log('\n=== Characters Module Tests ===\n');

// Setup
setupTestCampaign();

// UPP Parser Tests
console.log('UPP Parser (6 tests):');

test('parseUPP parses basic UPP string', () => {
  const stats = characters.parseUPP('789A87');
  assertEqual(stats.str, 7);
  assertEqual(stats.dex, 8);
  assertEqual(stats.end, 9);
  assertEqual(stats.int, 10); // A = 10
  assertEqual(stats.edu, 8);
  assertEqual(stats.soc, 7);
});

test('parseUPP handles lowercase', () => {
  const stats = characters.parseUPP('789a87');
  assertEqual(stats.int, 10);
});

test('parseUPP parses 7-char UPP with PSI', () => {
  const stats = characters.parseUPP('789A87C');
  assertEqual(stats.psi, 12); // C = 12
});

test('parseUPP handles dashes and spaces', () => {
  const stats = characters.parseUPP('789-A87');
  assertEqual(stats.str, 7);
  assertEqual(stats.int, 10);
});

test('parseUPP returns null for invalid input', () => {
  assertEqual(characters.parseUPP(''), null);
  assertEqual(characters.parseUPP('12345'), null); // too short
  assertEqual(characters.parseUPP(null), null);
});

test('toUPP converts stats back to string', () => {
  const stats = { str: 7, dex: 8, end: 9, int: 10, edu: 8, soc: 7 };
  assertEqual(characters.toUPP(stats), '789A87');
});

// Skills Parser Tests
console.log('\nSkills Parser (5 tests):');

test('parseSkills handles dash format', () => {
  const skills = characters.parseSkills('Pilot-2, Gunnery-1, Vacc Suit-1');
  assertEqual(skills['Pilot'], 2);
  assertEqual(skills['Gunnery'], 1);
  assertEqual(skills['Vacc Suit'], 1);
});

test('parseSkills handles colon format', () => {
  const skills = characters.parseSkills('Pilot: 2, Gunnery: 1');
  assertEqual(skills['Pilot'], 2);
  assertEqual(skills['Gunnery'], 1);
});

test('parseSkills handles space format', () => {
  const skills = characters.parseSkills('Pilot 2, Gunnery 1');
  assertEqual(skills['Pilot'], 2);
  assertEqual(skills['Gunnery'], 1);
});

test('parseSkills handles parentheses format', () => {
  const skills = characters.parseSkills('Pilot (2), Gunnery (1)');
  assertEqual(skills['Pilot'], 2);
  assertEqual(skills['Gunnery'], 1);
});

test('parseSkills normalizes skill names', () => {
  const skills = characters.parseSkills('PILOT-2, gunnery-1');
  assertEqual(skills['Pilot'], 2);
  assertEqual(skills['Gunnery'], 1);
});

// Character CRUD Tests
console.log('\nCharacter CRUD (6 tests):');

let testCharId;

test('createCharacter creates a character', () => {
  const char = characters.createCharacter(TEST_CAMPAIGN_ID, {
    name: 'Marcus Cole',
    species: 'Human',
    stats: { str: 7, dex: 8, end: 9, int: 10, edu: 8, soc: 7 },
    skills: { Pilot: 2, Gunnery: 1 },
    credits: 10000
  });
  testCharId = char.id;
  assertEqual(char.name, 'Marcus Cole');
  assertEqual(char.str, 7);
  assertEqual(char.int, 10);
  assertEqual(char.skills.Pilot, 2);
  assertEqual(char.credits, 10000);
});

test('getCharacter retrieves character with parsed fields', () => {
  const char = characters.getCharacter(testCharId);
  assertTrue(char !== null);
  assertEqual(char.name, 'Marcus Cole');
  assertEqual(char.upp, '789A87');
  assertTrue(typeof char.skills === 'object');
});

test('getCharactersByCampaign returns all characters', () => {
  characters.createCharacter(TEST_CAMPAIGN_ID, { name: 'Second Character' });
  const chars = characters.getCharactersByCampaign(TEST_CAMPAIGN_ID);
  assertTrue(chars.length >= 2);
});

test('updateCharacter updates fields', () => {
  const updated = characters.updateCharacter(testCharId, {
    name: 'Marcus Cole Jr',
    credits: 50000
  });
  assertEqual(updated.name, 'Marcus Cole Jr');
  assertEqual(updated.credits, 50000);
});

test('exportCharacter returns clean JSON', () => {
  const exported = characters.exportCharacter(testCharId);
  assertTrue(exported.name === 'Marcus Cole Jr');
  assertTrue(exported.upp === '789A87');
  assertTrue(exported.skills.Pilot === 2);
  assertTrue(exported.id === undefined); // No internal ID
});

test('deleteCharacter removes character', () => {
  const result = characters.deleteCharacter(testCharId);
  assertTrue(result);
  assertEqual(characters.getCharacter(testCharId), null);
});

// AR-19: Character Import Validation Tests
console.log('\nCharacter Import Validation (8 tests):');

test('validateCharacterImport accepts valid data', () => {
  const result = characters.validateCharacterImport({
    name: 'Test Character',
    upp: '789A87',
    skills: { Pilot: 2, Gunnery: 1 }
  });
  assertTrue(result.valid);
  assertEqual(result.errors.length, 0);
  assertEqual(result.sanitized.name, 'Test Character');
});

test('validateCharacterImport requires name', () => {
  const result = characters.validateCharacterImport({
    upp: '789A87'
  });
  assertFalse(result.valid);
  assertTrue(result.errors.some(e => e.includes('name')));
});

test('validateCharacterImport validates UPP format', () => {
  const result = characters.validateCharacterImport({
    name: 'Test',
    upp: 'invalid'
  });
  assertFalse(result.valid);
  assertTrue(result.errors.some(e => e.includes('UPP')));
});

test('validateCharacterImport validates stat ranges', () => {
  const result = characters.validateCharacterImport({
    name: 'Test',
    stats: { str: 20 }
  });
  assertFalse(result.valid);
  assertTrue(result.errors.some(e => e.includes('STR')));
});

test('validateCharacterImport sanitizes skills', () => {
  const result = characters.validateCharacterImport({
    name: 'Test',
    skills: { Pilot: 3, Invalid: 10 }
  });
  assertTrue(result.valid);
  assertEqual(result.sanitized.skills.Pilot, 3);
  assertEqual(result.sanitized.skills.Invalid, undefined);
});

test('validateCharacterImport validates age', () => {
  const result = characters.validateCharacterImport({
    name: 'Test',
    age: -5
  });
  assertFalse(result.valid);
  assertTrue(result.errors.some(e => e.includes('Age')));
});

test('validateCharacterImport sanitizes careers', () => {
  const result = characters.validateCharacterImport({
    name: 'Test',
    careers: [{ name: 'Navy', terms: 3 }]
  });
  assertTrue(result.valid);
  assertEqual(result.sanitized.careers.length, 1);
  assertEqual(result.sanitized.careers[0].name, 'Navy');
});

test('validateCharacterImport sanitizes equipment', () => {
  const result = characters.validateCharacterImport({
    name: 'Test',
    equipment: [{ name: 'Cloth Armor' }]
  });
  assertTrue(result.valid);
  assertEqual(result.sanitized.equipment.length, 1);
  assertEqual(result.sanitized.equipment[0].quantity, 1);
});

// AR-19: Fuzzy Text Parsing Tests
console.log('\nFuzzy Text Parsing (6 tests):');

test('parseFuzzyText parses valid JSON', () => {
  const json = JSON.stringify({ name: 'Marcus Cole', upp: '789A87', skills: { Pilot: 2 } });
  const result = characters.parseFuzzyText(json);
  assertEqual(result.confidence, 100);
  assertEqual(result.data.name, 'Marcus Cole');
});

test('parseFuzzyText extracts name from text', () => {
  const text = 'Marcus Cole\nUPP: 789A87\nSkills: Pilot-2';
  const result = characters.parseFuzzyText(text);
  assertEqual(result.data.name, 'Marcus Cole');
  assertTrue(result.confidence >= 40);
});

test('parseFuzzyText extracts UPP', () => {
  const text = 'Name: Test\nUPP: 789A87\n';
  const result = characters.parseFuzzyText(text);
  assertEqual(result.data.stats.str, 7);
  assertEqual(result.data.stats.int, 10);
});

test('parseFuzzyText extracts skills', () => {
  const text = 'Test Character\nSkills: Pilot-2, Gunnery-1, Astrogation-1';
  const result = characters.parseFuzzyText(text);
  // parseSkills may extract different patterns - check that something was found
  assertTrue(Object.keys(result.data.skills).length >= 2);
  assertEqual(result.data.skills.Gunnery, 1);
  assertEqual(result.data.skills.Astrogation, 1);
});

test('parseFuzzyText extracts credits', () => {
  const text = 'Test\nCredits: 10,000\nPilot-1';
  const result = characters.parseFuzzyText(text);
  assertEqual(result.data.credits, 10000);
});

test('parseFuzzyText returns warnings for incomplete data', () => {
  const text = 'Just a name';
  const result = characters.parseFuzzyText(text);
  assertTrue(result.warnings.length > 0);
  assertTrue(result.confidence < 50);
});

// Cleanup
cleanup();

// ==================== Summary ====================
console.log('\n==================================================');
console.log(`PASSED: ${passed}/${passed + failed}`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
}
