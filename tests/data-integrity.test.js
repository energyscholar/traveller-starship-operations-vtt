/**
 * AR-134: Data Integrity Tests
 * Validates foreign key relationships, required fields, and data constraints
 */

const { db } = require('../lib/operations/database');

console.log('=== Data Integrity Tests ===\n');

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

function assertTrue(condition, msg = '') {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
}

// =============================================================================
// Foreign Key Integrity Tests
// =============================================================================

console.log('--- Foreign Key Integrity ---\n');

test('player_accounts reference valid campaigns', () => {
  const orphans = db.prepare(`
    SELECT pa.id, pa.slot_name, pa.campaign_id
    FROM player_accounts pa
    LEFT JOIN campaigns c ON pa.campaign_id = c.id
    WHERE pa.campaign_id IS NOT NULL AND c.id IS NULL
  `).all();
  assertEqual(orphans.length, 0, `Found ${orphans.length} orphan player_accounts: ${JSON.stringify(orphans)}`);
});

test('player_accounts reference valid ships', () => {
  const orphans = db.prepare(`
    SELECT pa.id, pa.slot_name, pa.ship_id
    FROM player_accounts pa
    LEFT JOIN ships s ON pa.ship_id = s.id
    WHERE pa.ship_id IS NOT NULL AND s.id IS NULL
  `).all();
  assertEqual(orphans.length, 0, `Found ${orphans.length} player_accounts with invalid ships: ${JSON.stringify(orphans)}`);
});

test('ships reference valid campaigns', () => {
  const orphans = db.prepare(`
    SELECT s.id, s.name, s.campaign_id
    FROM ships s
    LEFT JOIN campaigns c ON s.campaign_id = c.id
    WHERE s.campaign_id IS NOT NULL AND c.id IS NULL
  `).all();
  assertEqual(orphans.length, 0, `Found ${orphans.length} orphan ships: ${JSON.stringify(orphans)}`);
});

test('npc_crew reference valid ships', () => {
  const orphans = db.prepare(`
    SELECT nc.id, nc.name, nc.ship_id
    FROM npc_crew nc
    LEFT JOIN ships s ON nc.ship_id = s.id
    WHERE nc.ship_id IS NOT NULL AND s.id IS NULL
  `).all();
  assertEqual(orphans.length, 0, `Found ${orphans.length} orphan npc_crew: ${JSON.stringify(orphans)}`);
});

test('session_state references valid campaigns', () => {
  const orphans = db.prepare(`
    SELECT ss.campaign_id
    FROM session_state ss
    LEFT JOIN campaigns c ON ss.campaign_id = c.id
    WHERE c.id IS NULL
  `).all();
  assertEqual(orphans.length, 0, `Found ${orphans.length} orphan session_state: ${JSON.stringify(orphans)}`);
});

test('ship_log references valid ships', () => {
  const orphans = db.prepare(`
    SELECT sl.id, sl.ship_id
    FROM ship_log sl
    LEFT JOIN ships s ON sl.ship_id = s.id
    WHERE s.id IS NULL
  `).all();
  assertEqual(orphans.length, 0, `Found ${orphans.length} orphan ship_log entries: ${JSON.stringify(orphans)}`);
});

test('contacts reference valid campaigns', () => {
  const orphans = db.prepare(`
    SELECT ct.id, ct.name, ct.campaign_id
    FROM contacts ct
    LEFT JOIN campaigns c ON ct.campaign_id = c.id
    WHERE c.id IS NULL
  `).all();
  assertEqual(orphans.length, 0, `Found ${orphans.length} orphan contacts: ${JSON.stringify(orphans)}`);
});

test('npc_contacts reference valid campaigns', () => {
  const orphans = db.prepare(`
    SELECT nc.id, nc.name, nc.campaign_id
    FROM npc_contacts nc
    LEFT JOIN campaigns c ON nc.campaign_id = c.id
    WHERE c.id IS NULL
  `).all();
  assertEqual(orphans.length, 0, `Found ${orphans.length} orphan npc_contacts: ${JSON.stringify(orphans)}`);
});

test('mail references valid campaigns', () => {
  const orphans = db.prepare(`
    SELECT m.id, m.subject, m.campaign_id
    FROM mail m
    LEFT JOIN campaigns c ON m.campaign_id = c.id
    WHERE c.id IS NULL
  `).all();
  assertEqual(orphans.length, 0, `Found ${orphans.length} orphan mail: ${JSON.stringify(orphans)}`);
});

test('handouts reference valid campaigns', () => {
  const orphans = db.prepare(`
    SELECT h.id, h.title, h.campaign_id
    FROM handouts h
    LEFT JOIN campaigns c ON h.campaign_id = c.id
    WHERE c.id IS NULL
  `).all();
  assertEqual(orphans.length, 0, `Found ${orphans.length} orphan handouts: ${JSON.stringify(orphans)}`);
});

test('locations reference valid campaigns', () => {
  const orphans = db.prepare(`
    SELECT l.id, l.name, l.campaign_id
    FROM locations l
    LEFT JOIN campaigns c ON l.campaign_id = c.id
    WHERE c.id IS NULL
  `).all();
  assertEqual(orphans.length, 0, `Found ${orphans.length} orphan locations: ${JSON.stringify(orphans)}`);
});

test('npc_dossiers reference valid campaigns', () => {
  const orphans = db.prepare(`
    SELECT nd.id, nd.name, nd.campaign_id
    FROM npc_dossiers nd
    LEFT JOIN campaigns c ON nd.campaign_id = c.id
    WHERE c.id IS NULL
  `).all();
  assertEqual(orphans.length, 0, `Found ${orphans.length} orphan npc_dossiers: ${JSON.stringify(orphans)}`);
});

test('ship_weapons reference valid ships', () => {
  const orphans = db.prepare(`
    SELECT sw.id, sw.name, sw.ship_id
    FROM ship_weapons sw
    LEFT JOIN ships s ON sw.ship_id = s.id
    WHERE s.id IS NULL
  `).all();
  assertEqual(orphans.length, 0, `Found ${orphans.length} orphan ship_weapons: ${JSON.stringify(orphans)}`);
});

// =============================================================================
// Role Value Constraints
// =============================================================================

console.log('\n--- Role Value Constraints ---\n');

const VALID_ROLES = ['gm', 'captain', 'pilot', 'astrogator', 'engineer', 'sensors', 'gunner', 'marine', 'medic', 'observer', 'steward', 'comms'];

test('player_accounts have valid roles', () => {
  const invalidRoles = db.prepare(`
    SELECT id, slot_name, role FROM player_accounts
    WHERE role IS NOT NULL
  `).all().filter(pa => !VALID_ROLES.includes(pa.role?.toLowerCase()));

  if (invalidRoles.length > 0) {
    throw new Error(`Found ${invalidRoles.length} invalid roles: ${JSON.stringify(invalidRoles.map(p => ({ name: p.slot_name, role: p.role })))}`);
  }
});

test('npc_crew have valid roles', () => {
  const crew = db.prepare(`SELECT id, name, role FROM npc_crew WHERE role IS NOT NULL`).all();
  const invalidRoles = crew.filter(c => !VALID_ROLES.includes(c.role?.toLowerCase()));

  if (invalidRoles.length > 0) {
    throw new Error(`Found ${invalidRoles.length} invalid NPC crew roles: ${JSON.stringify(invalidRoles.map(c => ({ name: c.name, role: c.role })))}`);
  }
});

// =============================================================================
// Required Field Tests
// =============================================================================

console.log('\n--- Required Fields ---\n');

test('campaigns have names', () => {
  const unnamed = db.prepare(`SELECT id FROM campaigns WHERE name IS NULL OR name = ''`).all();
  assertEqual(unnamed.length, 0, `Found ${unnamed.length} campaigns without names`);
});

test('ships have names', () => {
  const unnamed = db.prepare(`SELECT id FROM ships WHERE name IS NULL OR name = ''`).all();
  assertEqual(unnamed.length, 0, `Found ${unnamed.length} ships without names`);
});

test('player_accounts have slot names', () => {
  const unnamed = db.prepare(`SELECT id FROM player_accounts WHERE slot_name IS NULL OR slot_name = ''`).all();
  assertEqual(unnamed.length, 0, `Found ${unnamed.length} player_accounts without slot names`);
});

// =============================================================================
// Data Consistency Tests
// =============================================================================

console.log('\n--- Data Consistency ---\n');

test('ships have valid ship_data JSON', () => {
  const ships = db.prepare(`SELECT id, name, ship_data FROM ships`).all();
  const invalid = ships.filter(s => {
    try {
      JSON.parse(s.ship_data);
      return false;
    } catch {
      return true;
    }
  });
  assertEqual(invalid.length, 0, `Found ${invalid.length} ships with invalid ship_data JSON`);
});

test('ships have valid current_state JSON', () => {
  const ships = db.prepare(`SELECT id, name, current_state FROM ships WHERE current_state IS NOT NULL`).all();
  const invalid = ships.filter(s => {
    try {
      JSON.parse(s.current_state);
      return false;
    } catch {
      return true;
    }
  });
  assertEqual(invalid.length, 0, `Found ${invalid.length} ships with invalid current_state JSON`);
});

test('player_accounts have valid role_instance >= 1', () => {
  const invalid = db.prepare(`
    SELECT id, slot_name, role_instance
    FROM player_accounts
    WHERE role_instance IS NOT NULL AND role_instance < 1
  `).all();
  assertEqual(invalid.length, 0, `Found ${invalid.length} player_accounts with invalid role_instance`);
});

// =============================================================================
// Table Existence Tests
// =============================================================================

console.log('\n--- Table Existence ---\n');

const EXPECTED_TABLES = [
  'campaigns', 'player_accounts', 'ships', 'npc_crew', 'session_state',
  'ship_log', 'contacts', 'npc_contacts', 'mail', 'player_feedback',
  'events', 'handouts', 'locations', 'npc_dossiers', 'staged_reveals',
  'ship_weapons', 'combat_log', 'characters', 'system_cache', 'generated_systems'
];

test('all expected tables exist', () => {
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all().map(t => t.name);
  const missing = EXPECTED_TABLES.filter(t => !tables.includes(t));
  if (missing.length > 0) {
    throw new Error(`Missing tables: ${missing.join(', ')}`);
  }
});

// =============================================================================
// Summary
// =============================================================================

console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
}
