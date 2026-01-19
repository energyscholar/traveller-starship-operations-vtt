/**
 * NPC Location System - Audit Tests
 * These tests encode the invariants the Generator must satisfy.
 *
 * Run: node tests/npc-location.test.js
 */

const { strict: assert } = require('assert');

// Test runner
function runTests(tests) {
  let passed = 0, failed = 0;
  for (const [name, fn] of Object.entries(tests)) {
    try {
      fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (e) {
      console.log(`✗ ${name}: ${e.message}`);
      failed++;
    }
  }
  console.log(`\n${passed}/${passed + failed} tests passed`);
  return failed === 0;
}

// Will be imported from implementation
let npcLocation;
let db;

// === SCHEMA TESTS ===

const schemaTests = {
  'npc_location_history table exists': () => {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='npc_location_history'"
    ).get();
    assert.ok(result, 'npc_location_history table should exist');
  },

  'npc_dossiers has npc_location column': () => {
    const info = db.prepare("PRAGMA table_info(npc_dossiers)").all();
    const col = info.find(c => c.name === 'npc_location');
    assert.ok(col, 'npc_dossiers should have npc_location column');
  },

  'npc_dossiers has is_mobile column': () => {
    const info = db.prepare("PRAGMA table_info(npc_dossiers)").all();
    const col = info.find(c => c.name === 'is_mobile');
    assert.ok(col, 'npc_dossiers should have is_mobile column');
  },

  'npc_personae has npc_location column': () => {
    const info = db.prepare("PRAGMA table_info(npc_personae)").all();
    const col = info.find(c => c.name === 'npc_location');
    assert.ok(col, 'npc_personae should have npc_location column');
  },

  'npc_personae has is_mobile column': () => {
    const info = db.prepare("PRAGMA table_info(npc_personae)").all();
    const col = info.find(c => c.name === 'is_mobile');
    assert.ok(col, 'npc_personae should have is_mobile column');
  },

  'npc_contacts has npc_location column': () => {
    const info = db.prepare("PRAGMA table_info(npc_contacts)").all();
    const col = info.find(c => c.name === 'npc_location');
    assert.ok(col, 'npc_contacts should have npc_location column');
  },

  'npc_contacts has is_mobile column': () => {
    const info = db.prepare("PRAGMA table_info(npc_contacts)").all();
    const col = info.find(c => c.name === 'is_mobile');
    assert.ok(col, 'npc_contacts should have is_mobile column');
  }
};

// === VALIDATION TESTS ===

const validationTests = {
  'validateNPCLocation accepts valid location': () => {
    const result = npcLocation.validateNPCLocation({
      sector: 'Spinward Marches',
      hex: '1910',
      systemName: 'Regina'
    });
    assert.ok(result.valid, 'Valid location should pass');
    assert.deepEqual(result.warnings, []);
  },

  'validateNPCLocation accepts null hex (unknown location)': () => {
    const result = npcLocation.validateNPCLocation({
      sector: 'Spinward Marches',
      hex: null,
      systemName: null
    });
    assert.ok(result.valid, 'Null hex should be allowed');
  },

  'validateNPCLocation rejects invalid hex format': () => {
    const result = npcLocation.validateNPCLocation({
      sector: 'Spinward Marches',
      hex: '19',  // Not 4 digits
      systemName: 'Bad'
    });
    assert.ok(!result.valid, 'Invalid hex should fail');
    assert.ok(result.warnings.some(w => w.includes('hex')));
  },

  'validateNPCLocation rejects hex without sector': () => {
    const result = npcLocation.validateNPCLocation({
      hex: '1910',  // No sector
      systemName: 'Regina'
    });
    assert.ok(!result.valid, 'Hex without sector should fail');
    assert.ok(result.warnings.some(w => w.includes('sector')));
  },

  'validateNPCLocation accepts empty object': () => {
    const result = npcLocation.validateNPCLocation({});
    assert.ok(result.valid, 'Empty location (unknown) should be valid');
  },

  'validateNPCLocation accepts uncertainty values': () => {
    const result = npcLocation.validateNPCLocation({
      sector: 'Spinward Marches',
      uncertainty: 'sector'
    });
    assert.ok(result.valid, 'Uncertainty should be allowed');
  }
};

// === CRUD TESTS ===

const crudTests = {
  'setNPCLocation stores location in dossiers': () => {
    // Setup: create a test NPC
    const npcId = 'test-npc-' + Date.now();
    db.prepare(`
      INSERT INTO npc_dossiers (id, campaign_id, name)
      VALUES (?, '00000000-0000-4000-8000-000000000001', 'Test NPC')
    `).run(npcId);

    const location = {
      sector: 'Spinward Marches',
      hex: '1910',
      systemName: 'Regina'
    };

    const result = npcLocation.setNPCLocation(npcId, 'dossiers', location);
    assert.ok(result.success, 'setNPCLocation should succeed');

    // Verify storage
    const row = db.prepare('SELECT npc_location FROM npc_dossiers WHERE id = ?').get(npcId);
    const stored = JSON.parse(row.npc_location);
    assert.equal(stored.hex, '1910');

    // Cleanup
    db.prepare('DELETE FROM npc_dossiers WHERE id = ?').run(npcId);
  },

  'getNPCLocation retrieves stored location': () => {
    const npcId = 'test-npc-get-' + Date.now();
    const location = {
      sector: 'Deneb',
      hex: '0505',
      systemName: 'Mora'
    };

    db.prepare(`
      INSERT INTO npc_dossiers (id, campaign_id, name, npc_location)
      VALUES (?, '00000000-0000-4000-8000-000000000001', 'Test NPC', ?)
    `).run(npcId, JSON.stringify(location));

    const retrieved = npcLocation.getNPCLocation(npcId, 'dossiers');
    assert.equal(retrieved.hex, '0505');
    assert.equal(retrieved.sector, 'Deneb');

    db.prepare('DELETE FROM npc_dossiers WHERE id = ?').run(npcId);
  },

  'getNPCLocation returns null for no location': () => {
    const npcId = 'test-npc-null-' + Date.now();
    db.prepare(`
      INSERT INTO npc_dossiers (id, campaign_id, name)
      VALUES (?, '00000000-0000-4000-8000-000000000001', 'Test NPC')
    `).run(npcId);

    const retrieved = npcLocation.getNPCLocation(npcId, 'dossiers');
    assert.equal(retrieved, null);

    db.prepare('DELETE FROM npc_dossiers WHERE id = ?').run(npcId);
  },

  'setNPCLocation rejects invalid table': () => {
    assert.throws(() => {
      npcLocation.setNPCLocation('any-id', 'invalid_table', {});
    }, /table/i);
  }
};

// === MOBILITY & HISTORY TESTS ===

const mobilityTests = {
  'moveNPC creates history entry for mobile NPC': () => {
    const npcId = 'test-mobile-' + Date.now();

    // Create mobile NPC with initial location
    db.prepare(`
      INSERT INTO npc_dossiers (id, campaign_id, name, is_mobile, npc_location)
      VALUES (?, '00000000-0000-4000-8000-000000000001', 'Mobile NPC', 1, ?)
    `).run(npcId, JSON.stringify({ sector: 'Spinward Marches', hex: '1910' }));

    const newLocation = {
      sector: 'Spinward Marches',
      hex: '1106',
      systemName: 'Efate'
    };

    const result = npcLocation.moveNPC(npcId, 'dossiers', newLocation, '1105-100', 'Relocated');
    assert.ok(result.success);
    assert.ok(result.historyId, 'Should return history ID');

    // Verify history
    const history = db.prepare(
      'SELECT * FROM npc_location_history WHERE npc_id = ?'
    ).all(npcId);
    assert.ok(history.length >= 1, 'History should have entry');

    // Cleanup
    db.prepare('DELETE FROM npc_dossiers WHERE id = ?').run(npcId);
    db.prepare('DELETE FROM npc_location_history WHERE npc_id = ?').run(npcId);
  },

  'moveNPC does NOT create history for non-mobile NPC': () => {
    const npcId = 'test-static-' + Date.now();

    // Create non-mobile NPC
    db.prepare(`
      INSERT INTO npc_dossiers (id, campaign_id, name, is_mobile, npc_location)
      VALUES (?, '00000000-0000-4000-8000-000000000001', 'Static NPC', 0, ?)
    `).run(npcId, JSON.stringify({ sector: 'Spinward Marches', hex: '1910' }));

    const newLocation = { sector: 'Spinward Marches', hex: '1106' };
    npcLocation.moveNPC(npcId, 'dossiers', newLocation);

    // Verify no history
    const history = db.prepare(
      'SELECT * FROM npc_location_history WHERE npc_id = ?'
    ).all(npcId);
    assert.equal(history.length, 0, 'Non-mobile NPC should not have history');

    // Cleanup
    db.prepare('DELETE FROM npc_dossiers WHERE id = ?').run(npcId);
  },

  'getLocationHistory returns ordered entries': () => {
    const npcId = 'test-history-' + Date.now();

    db.prepare(`
      INSERT INTO npc_dossiers (id, campaign_id, name, is_mobile)
      VALUES (?, '00000000-0000-4000-8000-000000000001', 'History NPC', 1)
    `).run(npcId);

    // Add some history
    db.prepare(`
      INSERT INTO npc_location_history (npc_id, npc_table, location_data, game_date, notes)
      VALUES (?, 'dossiers', ?, '1105-001', 'First')
    `).run(npcId, JSON.stringify({ hex: '0101' }));

    db.prepare(`
      INSERT INTO npc_location_history (npc_id, npc_table, location_data, game_date, notes)
      VALUES (?, 'dossiers', ?, '1105-050', 'Second')
    `).run(npcId, JSON.stringify({ hex: '0202' }));

    const history = npcLocation.getLocationHistory(npcId, 'dossiers');
    assert.equal(history.length, 2);
    // Should be ordered by created_at DESC (most recent first)
    assert.equal(history[0].notes, 'Second');

    // Cleanup
    db.prepare('DELETE FROM npc_dossiers WHERE id = ?').run(npcId);
    db.prepare('DELETE FROM npc_location_history WHERE npc_id = ?').run(npcId);
  }
};

// === QUERY TESTS ===

const queryTests = {
  'getNPCsAtSystem finds NPCs in hex': () => {
    const npc1 = 'test-query-1-' + Date.now();
    const npc2 = 'test-query-2-' + Date.now();
    const npc3 = 'test-query-3-' + Date.now();
    const campaignId = '00000000-0000-4000-8000-000000000001';

    // NPC at Regina
    db.prepare(`
      INSERT INTO npc_dossiers (id, campaign_id, name, npc_location)
      VALUES (?, ?, 'NPC At Regina', ?)
    `).run(npc1, campaignId, JSON.stringify({ sector: 'Spinward Marches', hex: '1910' }));

    // Another NPC at Regina (personae)
    db.prepare(`
      INSERT INTO npc_personae (id, campaign_id, name, npc_location)
      VALUES (?, ?, 'Persona At Regina', ?)
    `).run(npc2, campaignId, JSON.stringify({ sector: 'Spinward Marches', hex: '1910' }));

    // NPC at different location
    db.prepare(`
      INSERT INTO npc_dossiers (id, campaign_id, name, npc_location)
      VALUES (?, ?, 'NPC Elsewhere', ?)
    `).run(npc3, campaignId, JSON.stringify({ sector: 'Spinward Marches', hex: '1106' }));

    const atRegina = npcLocation.getNPCsAtSystem(campaignId, 'Spinward Marches', '1910');
    assert.equal(atRegina.length, 2, 'Should find 2 NPCs at Regina');

    const ids = atRegina.map(n => n.id);
    assert.ok(ids.includes(npc1));
    assert.ok(ids.includes(npc2));
    assert.ok(!ids.includes(npc3), 'Should not include NPC at different hex');

    // Cleanup
    db.prepare('DELETE FROM npc_dossiers WHERE id IN (?, ?)').run(npc1, npc3);
    db.prepare('DELETE FROM npc_personae WHERE id = ?').run(npc2);
  },

  'getNPCsAtSystem returns empty for no matches': () => {
    const result = npcLocation.getNPCsAtSystem('nonexistent', 'Empty Sector', '9999');
    assert.deepEqual(result, []);
  },

  'getNPCsAtSystem includes table info in results': () => {
    const npcId = 'test-table-info-' + Date.now();
    const campaignId = '00000000-0000-4000-8000-000000000001';

    db.prepare(`
      INSERT INTO npc_contacts (id, campaign_id, name, npc_location)
      VALUES (?, ?, 'Contact NPC', ?)
    `).run(npcId, campaignId, JSON.stringify({ sector: 'Deneb', hex: '0101' }));

    const results = npcLocation.getNPCsAtSystem(campaignId, 'Deneb', '0101');
    assert.equal(results.length, 1);
    assert.equal(results[0].table, 'contacts', 'Should include source table');

    db.prepare('DELETE FROM npc_contacts WHERE id = ?').run(npcId);
  }
};

// === MAIN ===

async function main() {
  console.log('NPC Location System - Audit Tests\n');
  console.log('Loading modules...');

  try {
    // Import after DB is ready
    const database = require('../lib/operations/database');
    db = database.db;
    npcLocation = require('../lib/operations/npc-location');
  } catch (e) {
    console.error('Failed to load modules:', e.message);
    console.log('\nGenerator must create lib/operations/npc-location.js');
    process.exit(1);
  }

  console.log('Modules loaded.\n');

  let allPassed = true;

  console.log('=== SCHEMA TESTS ===\n');
  allPassed = runTests(schemaTests) && allPassed;

  console.log('\n=== VALIDATION TESTS ===\n');
  allPassed = runTests(validationTests) && allPassed;

  console.log('\n=== CRUD TESTS ===\n');
  allPassed = runTests(crudTests) && allPassed;

  console.log('\n=== MOBILITY & HISTORY TESTS ===\n');
  allPassed = runTests(mobilityTests) && allPassed;

  console.log('\n=== QUERY TESTS ===\n');
  allPassed = runTests(queryTests) && allPassed;

  console.log('\n' + '='.repeat(40));
  if (allPassed) {
    console.log('ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log('SOME TESTS FAILED');
    process.exit(1);
  }
}

main();
