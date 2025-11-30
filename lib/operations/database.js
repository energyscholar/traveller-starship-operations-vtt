/**
 * Database module for Traveller Starship Operations VTT
 * Uses better-sqlite3 for synchronous SQLite operations
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database file location
const DB_PATH = path.join(__dirname, '../../data/campaigns/operations.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Better performance for concurrent access

/**
 * Initialize database schema
 */
function initializeSchema() {
  // Campaigns table - GM's campaign management
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gm_name TEXT NOT NULL,
      current_date TEXT DEFAULT '1105-001',
      current_system TEXT DEFAULT 'Regina',
      god_mode INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Player accounts table - Named slots prepared by GM
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_accounts (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      slot_name TEXT NOT NULL,
      character_name TEXT,
      character_data TEXT,
      ship_id TEXT,
      role TEXT,
      last_login TEXT,
      preferences TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      UNIQUE(campaign_id, slot_name)
    )
  `);

  // Ships table - Ships available in campaign
  db.exec(`
    CREATE TABLE IF NOT EXISTS ships (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      template_id TEXT,
      ship_data TEXT NOT NULL,
      visible_to_players INTEGER DEFAULT 1,
      is_party_ship INTEGER DEFAULT 0,
      current_state TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // NPC Crew table - NPCs that fill unfilled roles
  db.exec(`
    CREATE TABLE IF NOT EXISTS npc_crew (
      id TEXT PRIMARY KEY,
      ship_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      skill_level INTEGER DEFAULT 0,
      personality TEXT,
      is_ai INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE
    )
  `);

  // Session state table - Active session data
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_state (
      campaign_id TEXT PRIMARY KEY,
      state_data TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // Ship log table - Auto and manual log entries
  db.exec(`
    CREATE TABLE IF NOT EXISTS ship_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ship_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      game_date TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      message TEXT NOT NULL,
      actor TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_player_accounts_campaign
    ON player_accounts(campaign_id);

    CREATE INDEX IF NOT EXISTS idx_ships_campaign
    ON ships(campaign_id);

    CREATE INDEX IF NOT EXISTS idx_npc_crew_ship
    ON npc_crew(ship_id);

    CREATE INDEX IF NOT EXISTS idx_ship_log_ship
    ON ship_log(ship_id);
  `);
}

// Initialize schema on module load
initializeSchema();

/**
 * Generate a UUID v4
 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Update the updated_at timestamp
 */
function touchUpdatedAt(table, id) {
  const stmt = db.prepare(`UPDATE ${table} SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
  stmt.run(id);
}

// Export database and utilities
module.exports = {
  db,
  generateId,
  touchUpdatedAt,
  DB_PATH
};
