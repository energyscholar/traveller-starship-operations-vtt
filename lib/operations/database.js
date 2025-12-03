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

  // Add captain_name column if it doesn't exist (for Hail feature)
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN captain_name TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add scan_level column if it doesn't exist
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN scan_level INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }

  // NPC Contacts table - NPCs that players know (Autorun 6)
  // visible_to is JSON array of player_account IDs or "all"
  db.exec(`
    CREATE TABLE IF NOT EXISTS npc_contacts (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      location TEXT,
      description TEXT,
      loyalty INTEGER DEFAULT 0,
      visible_to TEXT DEFAULT '[]',
      notes TEXT,
      portrait TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // Mail table - In-game messages (Autorun 6)
  // recipient_type: 'player' (specific player), 'role' (to role), 'ship' (to ship)
  db.exec(`
    CREATE TABLE IF NOT EXISTS mail (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_type TEXT DEFAULT 'npc',
      recipient_id TEXT,
      recipient_type TEXT DEFAULT 'player',
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      sent_date TEXT NOT NULL,
      delivery_date TEXT,
      is_read INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'normal',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // Player feedback table - Bug reports and feature requests (Autorun 6)
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id TEXT,
      player_name TEXT,
      feedback_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'new',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    )
  `);

  // Events/Triggers table - GM prep events with conditions (Autorun 7)
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      event_type TEXT DEFAULT 'manual',
      trigger_date TEXT,
      trigger_condition TEXT,
      trigger_event_id TEXT,
      description TEXT,
      player_text TEXT,
      reveals_to_trigger TEXT DEFAULT '[]',
      emails_to_send TEXT DEFAULT '[]',
      npcs_to_reveal TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending',
      triggered_at TEXT,
      tags TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // Handouts table - Documents, images, maps for players (Autorun 7)
  db.exec(`
    CREATE TABLE IF NOT EXISTS handouts (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      title TEXT NOT NULL,
      handout_type TEXT DEFAULT 'document',
      content_text TEXT,
      file_url TEXT,
      visibility TEXT DEFAULT 'hidden',
      visible_to TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // Prepped Locations table - Scenes and places for GM prep (Autorun 7)
  // Hierarchical locations with visibility controls
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      location_type TEXT DEFAULT 'scene',
      parent_id TEXT,
      description_gm TEXT,
      description_players TEXT,
      atmosphere TEXT,
      connected_to TEXT DEFAULT '[]',
      map_url TEXT,
      hazards TEXT DEFAULT '[]',
      npcs_present TEXT DEFAULT '[]',
      visibility TEXT DEFAULT 'hidden',
      discovered_by TEXT DEFAULT '[]',
      uwp TEXT,
      trade_codes TEXT,
      tags TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE SET NULL
    )
  `);

  // NPC Dossiers table - Full NPC profiles for GM prep (Autorun 7)
  // Extends npc_contacts with stats, motivations, visibility controls
  db.exec(`
    CREATE TABLE IF NOT EXISTS npc_dossiers (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      role TEXT DEFAULT 'neutral',
      portrait_url TEXT,
      stats TEXT,
      skills TEXT,
      personality TEXT,
      motivation_public TEXT,
      motivation_hidden TEXT,
      background TEXT,
      location_id TEXT,
      location_text TEXT,
      current_status TEXT DEFAULT 'alive',
      visibility TEXT DEFAULT 'hidden',
      visible_to TEXT DEFAULT '[]',
      known_as TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // Staged reveals table - GM prep content for reveals (Autorun 7)
  // visibility: 'hidden' (GM only), 'partial' (some players), 'revealed' (all)
  // visible_to: JSON array of player_account IDs when visibility='partial'
  db.exec(`
    CREATE TABLE IF NOT EXISTS staged_reveals (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'plot',
      summary TEXT,
      full_text TEXT,
      handout_id TEXT,
      visibility TEXT DEFAULT 'hidden',
      visible_to TEXT DEFAULT '[]',
      trigger_type TEXT,
      trigger_value TEXT,
      order_index INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      revealed_at TEXT,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // Ship Weapons table - Weapons mounted on ships (Autorun 14)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ship_weapons (
      id TEXT PRIMARY KEY,
      ship_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      mount TEXT NOT NULL,
      damage TEXT NOT NULL,
      range TEXT NOT NULL,
      ammo_current INTEGER,
      ammo_max INTEGER,
      status TEXT DEFAULT 'ready',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE
    )
  `);

  // Combat Log table - Record of combat actions (Autorun 14)
  db.exec(`
    CREATE TABLE IF NOT EXISTS combat_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      weapon TEXT,
      roll_data TEXT,
      result TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // Characters table - Player characters with stats and skills (Autorun 9)
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      player_account_id TEXT,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      species TEXT DEFAULT 'Human',
      homeworld TEXT,
      age INTEGER,
      -- UPP Stats (stored as integers 0-15, displayed as hex)
      str INTEGER DEFAULT 7,
      dex INTEGER DEFAULT 7,
      end INTEGER DEFAULT 7,
      int INTEGER DEFAULT 7,
      edu INTEGER DEFAULT 7,
      soc INTEGER DEFAULT 7,
      psi INTEGER,
      -- Career and skills
      careers TEXT DEFAULT '[]',
      skills TEXT DEFAULT '{}',
      -- Equipment
      equipment TEXT DEFAULT '[]',
      weapons TEXT DEFAULT '[]',
      armor TEXT,
      credits INTEGER DEFAULT 0,
      ship_shares INTEGER DEFAULT 0,
      -- Import metadata
      import_confidence INTEGER,
      import_raw_text TEXT,
      -- Timestamps
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (player_account_id) REFERENCES player_accounts(id) ON DELETE SET NULL
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

    CREATE INDEX IF NOT EXISTS idx_npc_contacts_campaign
    ON npc_contacts(campaign_id);

    CREATE INDEX IF NOT EXISTS idx_mail_campaign
    ON mail(campaign_id);

    CREATE INDEX IF NOT EXISTS idx_mail_recipient
    ON mail(recipient_id);

    CREATE INDEX IF NOT EXISTS idx_feedback_campaign
    ON player_feedback(campaign_id);

    CREATE INDEX IF NOT EXISTS idx_staged_reveals_campaign
    ON staged_reveals(campaign_id);

    CREATE INDEX IF NOT EXISTS idx_npc_dossiers_campaign
    ON npc_dossiers(campaign_id);

    CREATE INDEX IF NOT EXISTS idx_locations_campaign
    ON locations(campaign_id);

    CREATE INDEX IF NOT EXISTS idx_events_campaign
    ON events(campaign_id);

    CREATE INDEX IF NOT EXISTS idx_handouts_campaign
    ON handouts(campaign_id);

    CREATE INDEX IF NOT EXISTS idx_ship_weapons_ship
    ON ship_weapons(ship_id);

    CREATE INDEX IF NOT EXISTS idx_combat_log_campaign
    ON combat_log(campaign_id);
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
  // Autorun 6: Add stellar_info JSON column for extended star data
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN stellar_info TEXT`);
  } catch {
    // Column already exists
  }
  // Autorun 6: Add scan_level column to track sensor scan depth per contact
  // 0=UNKNOWN, 1=PASSIVE, 2=ACTIVE, 3=DEEP
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN scan_level INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }

  // Autorun 7: Add email queue columns for draft/queued/sent workflow
  try {
    db.exec(`ALTER TABLE mail ADD COLUMN status TEXT DEFAULT 'sent'`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE mail ADD COLUMN queued_for_date TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE mail ADD COLUMN trigger_event_id TEXT`);
  } catch {
    // Column already exists
  }

  // Autorun 14: Add armor and disposition columns to contacts for combat
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN armor INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN disposition TEXT DEFAULT 'unknown'`);
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
 * SECURITY: Table name validated against whitelist to prevent SQL injection
 */
const VALID_TABLES = new Set([
  'campaigns', 'player_accounts', 'ships', 'npc_crew', 'session_state',
  'ship_log', 'contacts', 'npc_contacts', 'mail', 'player_feedback',
  'events', 'handouts', 'locations', 'npc_dossiers', 'staged_reveals',
  'ship_weapons', 'combat_log', 'characters'
]);

function touchUpdatedAt(table, id) {
  if (!VALID_TABLES.has(table)) {
    throw new Error(`touchUpdatedAt: invalid table "${table}"`);
  }
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
