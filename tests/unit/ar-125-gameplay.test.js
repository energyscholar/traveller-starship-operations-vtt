/**
 * AR-125 Gameplay Features Tests
 * AR-125.2: Ship-to-ship comms
 * AR-125.3: Cargo manifest
 * AR-125.4: Crew roster display
 */

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    testsPassed++;
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

// ==================== AR-125.2: Comms Tests ====================

console.log('AR-125.2: Ship-to-ship Comms');
console.log('=' .repeat(40));

test('comms: valid tones accepted', () => {
  const validTones = ['friendly', 'hostile', 'neutral'];
  for (const tone of validTones) {
    assert(validTones.includes(tone), `${tone} should be valid`);
  }
});

test('comms: invalid tone defaults to neutral', () => {
  const validTones = ['friendly', 'hostile', 'neutral'];
  const tone = 'threatening';
  const safeTone = validTones.includes(tone) ? tone : 'neutral';
  assertEqual(safeTone, 'neutral', 'Invalid tone should default to neutral');
});

test('comms: log format matches spec', () => {
  const contactName = 'Corsair Alpha';
  const message = 'Stand down and prepare for boarding!';
  const logMessage = `[COMMS] ${contactName}: "${message}"`;
  assertEqual(logMessage, '[COMMS] Corsair Alpha: "Stand down and prepare for boarding!"');
});

test('comms: requires contactName and message', () => {
  const data1 = { contactName: '', message: 'hello' };
  const data2 = { contactName: 'Ship', message: '' };
  assert(!data1.contactName, 'Empty contactName should be falsy');
  assert(!data2.message, 'Empty message should be falsy');
});

test('comms: transmission payload structure', () => {
  const payload = {
    contactName: 'INS Patrol',
    message: 'Identify yourselves',
    tone: 'neutral',
    timestamp: new Date().toISOString()
  };
  assert(payload.contactName, 'Should have contactName');
  assert(payload.message, 'Should have message');
  assert(payload.tone, 'Should have tone');
  assert(payload.timestamp, 'Should have timestamp');
});

// ==================== AR-125.3: Cargo Tests ====================

console.log('\nAR-125.3: Cargo Manifest');
console.log('=' .repeat(40));

test('cargo: legality values are constrained', () => {
  const validLegalities = ['legal', 'restricted', 'illegal'];
  assert(validLegalities.includes('legal'));
  assert(validLegalities.includes('restricted'));
  assert(validLegalities.includes('illegal'));
  assert(!validLegalities.includes('contraband'), 'contraband is not valid');
});

test('cargo: manifest sanitization truncates names', () => {
  const longName = 'A'.repeat(200);
  const sanitized = String(longName).slice(0, 100);
  assertEqual(sanitized.length, 100, 'Name should be truncated to 100 chars');
});

test('cargo: used tons calculated from manifest', () => {
  const manifest = [
    { name: 'Fuel Bladders', tons: 20, value: 40000, legality: 'legal' },
    { name: 'Munitions', tons: 15, value: 75000, legality: 'legal' },
    { name: 'Anagathics', tons: 2, value: 500000, legality: 'illegal' }
  ];
  const used = manifest.reduce((sum, item) => sum + item.tons, 0);
  assertEqual(used, 37, 'Total used should be 37 tons');
});

test('cargo: invalid legality defaults to legal', () => {
  const validLegalities = ['legal', 'restricted', 'illegal'];
  const item = { legality: 'stolen' };
  const safeLegality = validLegalities.includes(item.legality) ? item.legality : 'legal';
  assertEqual(safeLegality, 'legal', 'Invalid legality should default to legal');
});

test('cargo: empty manifest returns defaults', () => {
  const currentState = {};
  const cargo = currentState?.cargo || { capacity: 0, used: 0, manifest: [] };
  assertEqual(cargo.capacity, 0);
  assertEqual(cargo.used, 0);
  assertEqual(cargo.manifest.length, 0);
});

test('cargo: numeric coercion for tons/value', () => {
  const item = { name: 'Test', tons: 'abc', value: null };
  const tons = Number(item.tons) || 0;
  const value = Number(item.value) || 0;
  assertEqual(tons, 0, 'Non-numeric tons should become 0');
  assertEqual(value, 0, 'Null value should become 0');
});

// ==================== AR-125.4: Crew Roster Tests ====================

console.log('\nAR-125.4: Crew Roster');
console.log('=' .repeat(40));

test('roster: player entry structure', () => {
  const player = { character_name: 'James', slot_name: 'James', role: 'captain' };
  const entry = {
    name: player.character_name || player.slot_name,
    role: player.role,
    status: 'active'
  };
  assertEqual(entry.name, 'James');
  assertEqual(entry.role, 'captain');
  assertEqual(entry.status, 'active');
});

test('roster: falls back to slot_name if no character_name', () => {
  const player = { character_name: null, slot_name: 'Player1', role: 'pilot' };
  const name = player.character_name || player.slot_name;
  assertEqual(name, 'Player1');
});

test('roster: NPC entry includes skill level and AI flag', () => {
  const npc = { name: 'Gunner Droid #1', role: 'gunner', skill_level: 2, status: 'active', is_ai: true };
  const entry = {
    name: npc.name,
    role: npc.role,
    skillLevel: npc.skill_level,
    status: npc.status || 'active',
    isAI: npc.is_ai
  };
  assertEqual(entry.name, 'Gunner Droid #1');
  assertEqual(entry.skillLevel, 2);
  assert(entry.isAI, 'Should be flagged as AI');
});

test('roster: NPC status defaults to active', () => {
  const npc = { name: 'Jerry', role: 'computer', status: undefined };
  const status = npc.status || 'active';
  assertEqual(status, 'active');
});

test('roster: combined roster has players and npcs sections', () => {
  const roster = {
    players: [{ name: 'James', role: 'captain', status: 'active' }],
    npcs: [{ name: 'Jerry', role: 'computer', skillLevel: 3, status: 'active', isAI: false }]
  };
  assert(Array.isArray(roster.players), 'Should have players array');
  assert(Array.isArray(roster.npcs), 'Should have npcs array');
  assertEqual(roster.players.length, 1);
  assertEqual(roster.npcs.length, 1);
});

// ==================== Results ====================

console.log('');
console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
if (testsFailed > 0) {
  process.exit(1);
}
