/**
 * Database module for Traveller Starship Operations VTT
 * Uses better-sqlite3 for synchronous SQLite operations
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database file location - use /data volume on Fly.io, local path otherwise
const DB_PATH = process.env.NODE_ENV === 'production' && require('fs').existsSync('/data')
  ? '/data/operations.db'
  : path.join(__dirname, '../../data/campaigns/operations.db');
console.log('[DATABASE] DB_PATH:', DB_PATH);
console.log('[DATABASE] __dirname:', __dirname);

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
console.log('[DATABASE] dataDir:', dataDir);
console.log('[DATABASE] dataDir exists:', fs.existsSync(dataDir));

if (!fs.existsSync(dataDir)) {
  console.log('[DATABASE] Creating data directory...');
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('[DATABASE] Data directory created');
}

// Initialize database
console.log('[DATABASE] Opening database...');
const db = new Database(DB_PATH);
console.log('[DATABASE] Database opened successfully');
db.pragma('journal_mode = WAL'); // Better performance for concurrent access
console.log('[DATABASE] WAL mode enabled');

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
      current_system TEXT DEFAULT 'Milagro',
      system_uid TEXT,
      god_mode INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // AR-115: Add system_uid column if missing (for existing databases)
  try {
    const cols = db.prepare(`PRAGMA table_info(campaigns)`).all();
    if (!cols.some(c => c.name === 'system_uid')) {
      db.exec(`ALTER TABLE campaigns ADD COLUMN system_uid TEXT`);
    }
  } catch (e) {
    // Column already exists or table doesn't exist yet
  }

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
      training_target INTEGER DEFAULT 0,
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

  // BD-1: Add weapons and combat columns for contact-based combat
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN weapons TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN gunner_skill INTEGER DEFAULT 1`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN armor INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN disposition TEXT DEFAULT 'unknown'`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Ion cannon power tracking: power drain effects
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN power INTEGER DEFAULT 100`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN max_power INTEGER DEFAULT 100`);
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

  // AR-130: NPC Personae table - NPCs with AI personalities for email conversations
  db.exec(`
    CREATE TABLE IF NOT EXISTS npc_personae (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      personality TEXT,
      goals TEXT,
      situation TEXT,
      wealth TEXT,
      location TEXT,
      mail_delay_weeks INTEGER DEFAULT 1,
      system_prompt TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // AR-130: NPC-PC Connections - Relationships between NPCs and player characters
  db.exec(`
    CREATE TABLE IF NOT EXISTS npc_pc_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      npc_id TEXT NOT NULL,
      pc_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      relationship TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (npc_id) REFERENCES npc_personae(id) ON DELETE CASCADE,
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

  // AR-28: System cache for TravellerMap data
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_cache (
      id TEXT PRIMARY KEY,
      sector TEXT NOT NULL,
      hex TEXT NOT NULL,
      name TEXT,
      uwp TEXT,
      trade_codes TEXT,
      population TEXT,
      tech_level INTEGER,
      starport TEXT,
      bases TEXT,
      zone TEXT,
      pbg TEXT,
      allegiance TEXT,
      stellar TEXT,
      remarks TEXT,
      cached_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(sector, hex)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_system_cache_sector_hex
    ON system_cache(sector, hex);
  `);

  // AR-29.5: Generated star systems (procedural data)
  db.exec(`
    CREATE TABLE IF NOT EXISTS generated_systems (
      id TEXT PRIMARY KEY,
      sector TEXT NOT NULL,
      hex TEXT NOT NULL,
      name TEXT,
      uwp TEXT,
      stellar_class TEXT,
      system_data TEXT NOT NULL,  -- JSON blob with stars, planets, moons, belts
      seed INTEGER,               -- Random seed used for generation
      generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      modified_by TEXT,           -- GM who customized it
      modified_at TEXT,
      UNIQUE(sector, hex)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_generated_systems_sector_hex
    ON generated_systems(sector, hex);
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

  // AR-29: Add training_target column for auto-spawning training asteroids
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN training_target INTEGER DEFAULT 0`);
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
  // AR-297: Add default_role column for solo play default role
  try {
    db.exec(`ALTER TABLE player_accounts ADD COLUMN default_role TEXT`);
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

  // AR-23: Quick location buttons - home system, location history, favorites
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN home_system TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN location_history TEXT DEFAULT '[]'`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN favorite_locations TEXT DEFAULT '[]'`);
  } catch {
    // Column already exists
  }

  // AR-23: Deep space mode
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN in_deep_space INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN deep_space_reference TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN deep_space_bearing INTEGER`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN deep_space_distance REAL`);
  } catch {
    // Column already exists
  }

  // AR-289: Campaign type for demo/solo campaigns
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN campaign_type TEXT`);
  } catch {
    // Column already exists
  }

  // AR-140: Adventure Modules - packaged content with gating
  db.exec(`
    CREATE TABLE IF NOT EXISTS adventure_modules (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      module_name TEXT NOT NULL,
      module_version TEXT DEFAULT '1.0',
      source_file TEXT,
      imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1,
      manifest TEXT,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // Module content tracking - which imported entities belong to which module
  db.exec(`
    CREATE TABLE IF NOT EXISTS module_content (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      content_type TEXT NOT NULL,
      content_id TEXT NOT NULL,
      is_gated INTEGER DEFAULT 0,
      gate_condition TEXT,
      FOREIGN KEY (module_id) REFERENCES adventure_modules(id) ON DELETE CASCADE
    )
  `);

  // NPC Location System - location history for mobile NPCs
  db.exec(`
    CREATE TABLE IF NOT EXISTS npc_location_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      npc_id TEXT NOT NULL,
      npc_table TEXT NOT NULL CHECK(npc_table IN ('dossiers', 'personae', 'contacts')),
      location_data TEXT NOT NULL,
      game_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // NPC Location System - add npc_location and is_mobile to NPC tables
  try {
    db.exec(`ALTER TABLE npc_dossiers ADD COLUMN npc_location TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE npc_dossiers ADD COLUMN is_mobile INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE npc_personae ADD COLUMN npc_location TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE npc_personae ADD COLUMN is_mobile INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE npc_contacts ADD COLUMN npc_location TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE npc_contacts ADD COLUMN is_mobile INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }

  // Auth System - user accounts for authentication
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'player' CHECK(role IN ('admin', 'gm', 'player')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Auth System - active sessions for token management
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_used_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Auth System - login attempts for brute-force protection
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      ip_address TEXT,
      attempted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      success INTEGER DEFAULT 0
    )
  `);

  // Auth indexes for performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_identifier ON auth_login_attempts(identifier, attempted_at)`);

  // OAuth providers - links external OAuth identities to users
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_providers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      email TEXT,
      display_name TEXT,
      avatar_url TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, provider_user_id)
    )
  `);

  // OAuth indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON oauth_providers(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_oauth_providers_lookup ON oauth_providers(provider, provider_user_id)`);

  // Campaign memberships - links users to campaigns with roles
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('gm', 'player')),
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_active_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, campaign_id)
    )
  `);

  // Campaign membership indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_campaign_memberships_user ON campaign_memberships(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_campaign_memberships_campaign ON campaign_memberships(campaign_id)`);
}

// Initialize schema on module load
initializeSchema();

// Ensure test campaign exists for unit tests (using valid UUID v4)
db.prepare(`
  INSERT OR IGNORE INTO campaigns (id, name, gm_name)
  VALUES ('00000000-0000-4000-8000-000000000001', 'Test Campaign', 'Test GM')
`).run();

// Add test ship for test campaign
db.prepare(`
  INSERT OR IGNORE INTO ships (id, campaign_id, name, is_party_ship, ship_data, current_state)
  VALUES (
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'Test Ship',
    1,
    '{"hull":{"current":100,"max":100},"power":{"current":100,"max":100},"fuel":{"current":100,"max":100}}',
    '{"alertStatus":"NORMAL"}'
  )
`).run();

// Add test player slot for test campaign
db.prepare(`
  INSERT OR IGNORE INTO player_accounts (id, campaign_id, slot_name, role, ship_id, created_at, updated_at)
  VALUES (
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    'Test Player',
    'pilot',
    '00000000-0000-4000-8000-000000000002',
    datetime('now'),
    datetime('now')
  )
`).run();

/**
 * AR-289: Initialize solo demo campaign
 * Called after all modules are loaded to avoid circular dependency
 */
function initSoloDemo() {
  try {
    const { seedSoloDemoCampaign } = require('./seed-solo-demo');
    seedSoloDemoCampaign(false);  // Don't force reset if exists
  } catch (err) {
    console.warn('[DATABASE] Could not auto-seed solo demo:', err.message);
  }
}

/**
 * AR-300.2: Initialize Tuesday campaign
 * Called after all modules are loaded to avoid circular dependency
 */
function initTuesdayCampaign() {
  try {
    const { seedTuesdayCampaign } = require('./seed-tuesday-campaign');
    seedTuesdayCampaign(false);  // Don't force reset if exists
  } catch (err) {
    console.warn('[DATABASE] Could not auto-seed Tuesday campaign:', err.message);
  }
}

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
  'ship_weapons', 'combat_log', 'characters', 'adventure_modules', 'module_content',
  'npc_personae', 'npc_location_history'
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
  initSoloDemo,
  initTuesdayCampaign,
  DB_PATH
};
