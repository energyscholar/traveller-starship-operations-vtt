/**
 * AR-115: Database UID Normalization Tests
 *
 * Tests for migrations 001, 002 and runner
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const migration001 = require('../lib/operations/migrations/001-system-uids');
const migration002 = require('../lib/operations/migrations/002-populate-system-uids');
const { runMigrations, rollbackMigrations, getMigrationStatus } = require('../lib/operations/migrations/runner');

function runTests() {
  console.log('=== AR-115: UID Migration Tests ===\n');

  let passed = 0;
  let failed = 0;
  let testDb = null;
  const testDbPath = path.join(__dirname, 'test-migration.db');

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (err) {
      console.log(`❌ ${name}: ${err.message}`);
      failed++;
    }
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function setup() {
    // Clean up any existing test db
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    testDb = new Database(testDbPath);

    // Create minimal schema matching production
    testDb.exec(`
      CREATE TABLE campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        gm_name TEXT NOT NULL,
        current_system TEXT DEFAULT 'Regina',
        current_sector TEXT,
        current_hex TEXT
      );

      CREATE TABLE locations (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        name TEXT NOT NULL,
        system_name TEXT
      );

      CREATE TABLE contacts (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        name TEXT,
        last_location TEXT
      );
    `);
  }

  function teardown() {
    if (testDb) {
      testDb.close();
      testDb = null;
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  }

  // Setup
  setup();

  test('Migration 001 has required exports', () => {
    assert(migration001.id === '001-system-uids', 'Should have correct id');
    assert(typeof migration001.up === 'function', 'Should have up function');
    assert(typeof migration001.down === 'function', 'Should have down function');
    assert(typeof migration001.isApplied === 'function', 'Should have isApplied function');
  });

  test('isApplied returns false before migration', () => {
    assert(migration001.isApplied(testDb) === false, 'Should not be applied yet');
  });

  test('up() adds system_uid to campaigns', () => {
    migration001.up(testDb);

    const cols = testDb.prepare(`PRAGMA table_info(campaigns)`).all();
    const hasUid = cols.some(c => c.name === 'system_uid');
    assert(hasUid, 'campaigns should have system_uid column');
  });

  test('up() adds system_uid to locations', () => {
    const cols = testDb.prepare(`PRAGMA table_info(locations)`).all();
    const hasUid = cols.some(c => c.name === 'system_uid');
    assert(hasUid, 'locations should have system_uid column');
  });

  test('up() adds system_uid to contacts', () => {
    const cols = testDb.prepare(`PRAGMA table_info(contacts)`).all();
    const hasUid = cols.some(c => c.name === 'system_uid');
    assert(hasUid, 'contacts should have system_uid column');
  });

  test('isApplied returns true after migration', () => {
    assert(migration001.isApplied(testDb) === true, 'Should be applied');
  });

  test('up() is idempotent (can run twice)', () => {
    // Should not throw
    migration001.up(testDb);
    assert(true, 'Second run should not throw');
  });

  test('Existing data preserved after migration 001', () => {
    // Insert data before checking
    testDb.prepare(`INSERT INTO campaigns (id, name, gm_name, current_system) VALUES (?, ?, ?, ?)`)
      .run('test-1', 'Test Campaign', 'GM', 'Flammarion');

    const campaign = testDb.prepare(`SELECT * FROM campaigns WHERE id = ?`).get('test-1');
    assert(campaign.current_system === 'Flammarion', 'Existing data should be preserved');
    assert(campaign.system_uid === null, 'New column should be null');
  });

  // Migration 002 tests
  console.log('\n--- Migration 002: Populate UIDs ---');

  test('Migration 002 has required exports', () => {
    assert(migration002.id === '002-populate-system-uids', 'Should have correct id');
    assert(typeof migration002.up === 'function', 'Should have up function');
    assert(typeof migration002.down === 'function', 'Should have down function');
  });

  test('Migration 002 populates system_uid from name', () => {
    migration002.up(testDb);

    const campaign = testDb.prepare(`SELECT * FROM campaigns WHERE id = ?`).get('test-1');
    assert(campaign.system_uid === 'flammarion', `Expected flammarion, got ${campaign.system_uid}`);
  });

  test('Migration 002 rollback clears UIDs', () => {
    migration002.down(testDb);

    const campaign = testDb.prepare(`SELECT * FROM campaigns WHERE id = ?`).get('test-1');
    assert(campaign.system_uid === null, 'UID should be cleared after rollback');
  });

  // Runner tests
  console.log('\n--- Migration Runner ---');

  // Reset for runner tests
  teardown();
  setup();

  test('Runner creates migrations table', () => {
    runMigrations(testDb, { verbose: false });

    const tables = testDb.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'
    `).all();
    assert(tables.length === 1, 'migrations table should exist');
  });

  test('Runner applies all migrations', () => {
    const status = getMigrationStatus(testDb);
    const allApplied = status.every(m => m.applied);
    assert(allApplied, 'All migrations should be applied');
  });

  test('Runner skips already applied migrations', () => {
    const result = runMigrations(testDb, { verbose: false });
    assert(result.applied.length === 0, 'No migrations should be applied on second run');
    assert(result.skipped.length === 2, 'Both migrations should be skipped');
  });

  test('getMigrationStatus returns correct info', () => {
    const status = getMigrationStatus(testDb);
    assert(status.length === 2, 'Should have 2 migrations');
    assert(status[0].id === '001-system-uids', 'First should be 001');
    assert(status[1].id === '002-populate-system-uids', 'Second should be 002');
  });

  // Teardown
  teardown();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(50));

  return { passed, failed };
}

module.exports = { runTests };

if (require.main === module) {
  const result = runTests();
  process.exit(result.failed > 0 ? 1 : 0);
}
