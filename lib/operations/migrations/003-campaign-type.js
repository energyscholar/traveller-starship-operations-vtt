/**
 * Migration 003: Add Campaign Type
 *
 * AR-241: Solo Exploration Campaign
 *
 * Adds campaign_type column to distinguish multiplayer vs solo campaigns.
 * Values: 'multiplayer' (default), 'solo_explorer', 'solo_gm'
 */

/**
 * Apply migration
 * @param {Database} db - better-sqlite3 database instance
 */
function up(db) {
  console.log('[Migration 003] Adding campaign_type column...');

  const hasCampaignType = db.prepare(`
    SELECT COUNT(*) as count FROM pragma_table_info('campaigns')
    WHERE name = 'campaign_type'
  `).get().count > 0;

  if (!hasCampaignType) {
    db.exec(`ALTER TABLE campaigns ADD COLUMN campaign_type TEXT DEFAULT 'multiplayer'`);
    console.log('[Migration 003] Added campaign_type to campaigns');
  }

  console.log('[Migration 003] Complete');
}

/**
 * Rollback migration
 * @param {Database} db - better-sqlite3 database instance
 */
function down(db) {
  console.log('[Migration 003] Rolling back campaign_type column...');
  // SQLite doesn't support DROP COLUMN before 3.35.0
  // Column is nullable with default, harmless to leave
  console.log('[Migration 003] Rollback: Column left in place (has default, harmless)');
}

/**
 * Check if migration has been applied
 * @param {Database} db - better-sqlite3 database instance
 * @returns {boolean}
 */
function isApplied(db) {
  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM pragma_table_info('campaigns')
      WHERE name = 'campaign_type'
    `).get();
    return result.count > 0;
  } catch {
    return false;
  }
}

module.exports = {
  id: '003-campaign-type',
  description: 'Add campaign_type column for solo/multiplayer distinction',
  up,
  down,
  isApplied
};
