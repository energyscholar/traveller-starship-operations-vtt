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
      role_instance INTEGER DEFAULT 1,
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

  // Contacts table - Sensor contacts visible in campaign
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      name TEXT,
      type TEXT DEFAULT 'unknown',
      bearing INTEGER DEFAULT 0,
      range_km INTEGER DEFAULT 0,
      range_band TEXT DEFAULT 'distant',
      transponder TEXT,
      signature TEXT DEFAULT 'normal',
      visible_to TEXT DEFAULT 'all',
      gm_notes TEXT,
      is_targetable INTEGER DEFAULT 0,
      weapons_free INTEGER DEFAULT 0,
      health INTEGER DEFAULT 0,
      max_health INTEGER DEFAULT 0,
      uwp TEXT,
      celestial INTEGER DEFAULT 0,
      stellar_class TEXT,
      trade_codes TEXT,
      wiki_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
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

    CREATE INDEX IF NOT EXISTS idx_contacts_campaign
    ON contacts(campaign_id);
  `);

  // Migrations for existing databases
  // Add role_instance column if it doesn't exist
  try {
    db.exec(`ALTER TABLE player_accounts ADD COLUMN role_instance INTEGER DEFAULT 1`);
  } catch {
    // Column already exists, ignore error
  }

  // Add targetable/health columns to contacts table for destructible objects
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN is_targetable INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN health INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN max_health INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN weapons_free INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }

  // Stage 5: Add quirk columns to player_accounts for role personalization
  try {
    db.exec(`ALTER TABLE player_accounts ADD COLUMN quirk_text TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE player_accounts ADD COLUMN quirk_icon TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE player_accounts ADD COLUMN role_title TEXT`);
  } catch {
    // Column already exists
  }
  // Stage 6: Add sector/hex for TravellerMap jump map integration
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN current_sector TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN current_hex TEXT`);
  } catch {
    // Column already exists
  }
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

/**
 * Clean up test data (campaigns with "Test" in name)
 * Useful after test failures leave orphaned data
 */
function cleanupTestData() {
  const testCampaigns = db.prepare(
    "SELECT id FROM campaigns WHERE name LIKE '%Test%'"
  ).all();

  let cleaned = 0;
  for (const campaign of testCampaigns) {
    // Delete related data
    db.prepare('DELETE FROM ship_log WHERE campaign_id = ?').run(campaign.id);
    db.prepare('DELETE FROM contacts WHERE campaign_id = ?').run(campaign.id);
    const ships = db.prepare('SELECT id FROM ships WHERE campaign_id = ?').all(campaign.id);
    for (const ship of ships) {
      db.prepare('DELETE FROM npc_crew WHERE ship_id = ?').run(ship.id);
    }
    db.prepare('DELETE FROM ships WHERE campaign_id = ?').run(campaign.id);
    db.prepare('DELETE FROM player_accounts WHERE campaign_id = ?').run(campaign.id);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaign.id);
    cleaned++;
  }
  return cleaned;
}

// Export database and utilities
module.exports = {
  db,
  generateId,
  touchUpdatedAt,
  cleanupTestData,
  DB_PATH
};
