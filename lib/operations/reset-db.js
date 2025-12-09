#!/usr/bin/env node
/**
 * Reset Operations Database
 *
 * Usage:
 *   node lib/operations/reset-db.js          # Clean test data, keep Dorannia
 *   node lib/operations/reset-db.js --full   # Full reset, recreate everything
 *
 * This script:
 * 1. Removes all test campaigns (name contains "Test" or "Integration")
 * 2. Re-seeds the Dorannia campaign with fresh data
 */

// Debug: First line of execution
console.log('[RESET-DB] Script starting...');
console.log('[RESET-DB] CWD:', process.cwd());
console.log('[RESET-DB] Node version:', process.version);

try {
  console.log('[RESET-DB] Loading database module...');
  var { db, cleanupTestData, generateId } = require('./database');
  console.log('[RESET-DB] Database module loaded, db object:', typeof db);
} catch (err) {
  console.error('[RESET-DB] ERROR loading database:', err.message);
  console.error(err.stack);
  process.exit(1);
}

try {
  console.log('[RESET-DB] Loading seed-dorannia module...');
  var { seedDoranniaCampaign, CAMPAIGN } = require('./seed-dorannia');
  console.log('[RESET-DB] Seed module loaded');
} catch (err) {
  console.error('[RESET-DB] ERROR loading seed-dorannia:', err.message);
  console.error(err.stack);
  process.exit(1);
}

const args = process.argv.slice(2);
const fullReset = args.includes('--full');

console.log('========================================');
console.log('OPERATIONS DATABASE RESET');
console.log('========================================\n');

// Step 1: Clean up test data
console.log('Step 1: Cleaning test campaigns...');

// Extended cleanup - also catch "IntegrationTest" campaigns
const testCampaigns = db.prepare(
  "SELECT id, name FROM campaigns WHERE name LIKE '%Test%' OR name LIKE '%Integration%'"
).all();

let cleaned = 0;
for (const campaign of testCampaigns) {
  console.log(`  Removing: ${campaign.name} (${campaign.id.substring(0, 8)}...)`);

  // Delete related data (cascade doesn't always work with SQLite)
  db.prepare('DELETE FROM ship_log WHERE campaign_id = ?').run(campaign.id);
  db.prepare('DELETE FROM contacts WHERE campaign_id = ?').run(campaign.id);
  db.prepare('DELETE FROM session_state WHERE campaign_id = ?').run(campaign.id);

  const ships = db.prepare('SELECT id FROM ships WHERE campaign_id = ?').all(campaign.id);
  for (const ship of ships) {
    db.prepare('DELETE FROM npc_crew WHERE ship_id = ?').run(ship.id);
  }
  db.prepare('DELETE FROM ships WHERE campaign_id = ?').run(campaign.id);
  db.prepare('DELETE FROM player_accounts WHERE campaign_id = ?').run(campaign.id);
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaign.id);
  cleaned++;
}

console.log(`  Cleaned ${cleaned} test campaign(s)\n`);

// Step 2: Full reset if requested
if (fullReset) {
  console.log('Step 2: Full reset - clearing ALL data...');
  db.prepare('DELETE FROM ship_log').run();
  db.prepare('DELETE FROM contacts').run();
  db.prepare('DELETE FROM session_state').run();
  db.prepare('DELETE FROM npc_crew').run();
  db.prepare('DELETE FROM ships').run();
  db.prepare('DELETE FROM player_accounts').run();
  db.prepare('DELETE FROM campaigns').run();
  console.log('  All data cleared\n');
}

// Step 3: Ensure campaign exists
console.log('Step 3: Seeding "Travelling the Spinward Marches" campaign...\n');
const campaignId = seedDoranniaCampaign();

// Step 4: Verify
console.log('\n========================================');
console.log('DATABASE STATUS');
console.log('========================================');

const campaigns = db.prepare('SELECT id, name, gm_name, current_system FROM campaigns ORDER BY name').all();
console.log(`\nCampaigns: ${campaigns.length}`);
for (const c of campaigns) {
  const code = c.id.substring(0, 8).toUpperCase();
  console.log(`  - ${c.name} (GM: ${c.gm_name}) - Code: ${code}`);
}

const totalPlayers = db.prepare('SELECT COUNT(*) as count FROM player_accounts').get().count;
const totalShips = db.prepare('SELECT COUNT(*) as count FROM ships').get().count;
const totalContacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;

console.log(`\nTotal records:`);
console.log(`  Players: ${totalPlayers}`);
console.log(`  Ships: ${totalShips}`);
console.log(`  Contacts: ${totalContacts}`);

console.log('\n========================================');
console.log('RESET COMPLETE');
console.log('========================================');
console.log('\nRestart server to apply changes:');
console.log('  npm start');
console.log('========================================\n');
