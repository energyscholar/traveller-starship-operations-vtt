-- Traveller Starship Operations VTT - Database Schema
-- Version: 1.0
-- Created: 2025-12-01
--
-- Usage: This file defines the complete database schema.
-- To recreate the database, use destroy-db.sql first, then this file.

-- ==================== CAMPAIGNS ====================
-- GM's campaign management
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gm_name TEXT NOT NULL,
  current_date TEXT DEFAULT '1105-001',      -- Imperial calendar date (DDD-YYYY)
  current_system TEXT DEFAULT 'Milagro',       -- Current star system
  god_mode INTEGER DEFAULT 0,                 -- GM god mode enabled
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaigns_gm ON campaigns(gm_name);

-- ==================== PLAYER ACCOUNTS ====================
-- Named slots prepared by GM for players to join
CREATE TABLE IF NOT EXISTS player_accounts (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  slot_name TEXT NOT NULL,                    -- "James", "Player 2", etc.
  character_name TEXT,                        -- Imported character name
  character_data TEXT,                        -- JSON: full character sheet
  ship_id TEXT,                               -- Currently assigned ship
  role TEXT,                                  -- Current bridge role
  last_login TEXT,                            -- Last activity timestamp
  socket_id TEXT,                             -- Current socket connection
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (ship_id) REFERENCES ships(id)
);

CREATE INDEX IF NOT EXISTS idx_players_campaign ON player_accounts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_players_ship ON player_accounts(ship_id);

-- ==================== SHIPS ====================
-- Ships in the campaign (player ships, NPC ships, stations)
CREATE TABLE IF NOT EXISTS ships (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,                         -- Ship name
  template_id TEXT,                           -- Base template ID (scout, trader, etc.)
  ship_data TEXT,                             -- JSON: static ship specs (hull, weapons, etc.)
  current_state TEXT,                         -- JSON: dynamic state (damage, fuel, power, etc.)
  visible_to_players INTEGER DEFAULT 0,       -- 1 = visible on sensors
  is_party_ship INTEGER DEFAULT 0,            -- 1 = player-controlled ship
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

CREATE INDEX IF NOT EXISTS idx_ships_campaign ON ships(campaign_id);

-- ==================== NPC CREW ====================
-- NPC crew members on ships
CREATE TABLE IF NOT EXISTS npc_crew (
  id TEXT PRIMARY KEY,
  ship_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,                         -- pilot, engineer, gunner, etc.
  skill_level INTEGER DEFAULT 1,              -- Skill rating 0-4
  personality TEXT,                           -- Brief personality notes
  is_ai INTEGER DEFAULT 0,                    -- 1 = AI/robot crew
  status TEXT DEFAULT 'active',               -- active, injured, incapacitated
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ship_id) REFERENCES ships(id)
);

CREATE INDEX IF NOT EXISTS idx_npc_ship ON npc_crew(ship_id);

-- ==================== SHIP LOG ====================
-- Ship's log entries
CREATE TABLE IF NOT EXISTS ship_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ship_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,   -- Real-world timestamp
  game_date TEXT,                             -- In-game date
  entry_type TEXT,                            -- event, combat, status, captain, system
  message TEXT NOT NULL,
  actor TEXT,                                 -- Who made the entry
  FOREIGN KEY (ship_id) REFERENCES ships(id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

CREATE INDEX IF NOT EXISTS idx_log_ship ON ship_log(ship_id);
CREATE INDEX IF NOT EXISTS idx_log_campaign ON ship_log(campaign_id);

-- ==================== CONTACTS ====================
-- Sensor contacts in the campaign
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,                         -- Contact name/designation
  type TEXT,                                  -- Ship type, asteroid, station, etc.
  bearing INTEGER DEFAULT 0,                  -- Bearing in degrees (0-359)
  range_km INTEGER DEFAULT 0,                 -- Range in kilometers
  range_band TEXT,                            -- close, short, medium, long, veryLong, distant, extreme
  transponder TEXT,                           -- Transponder ID (if broadcasting)
  signature TEXT DEFAULT 'normal',            -- faint, normal, strong, military
  visible_to TEXT DEFAULT 'all',              -- all, gm, specific_roles
  gm_notes TEXT,                              -- Hidden GM notes
  is_targetable INTEGER DEFAULT 0,            -- Can be targeted by weapons
  weapons_free INTEGER DEFAULT 0,             -- Pre-authorized for weapons fire
  health INTEGER DEFAULT 0,                   -- Current health (for targetable objects)
  max_health INTEGER DEFAULT 0,               -- Max health
  weapons TEXT,                               -- JSON array of weapons [{name, damage, range}]
  gunner_skill INTEGER DEFAULT 1,             -- NPC gunner skill for attack rolls
  armor INTEGER DEFAULT 0,                    -- Armor rating for damage reduction
  disposition TEXT DEFAULT 'unknown',         -- hostile, neutral, friendly, unknown
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_campaign ON contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_contacts_disposition ON contacts(disposition);

-- ==================== FUEL TANKS ====================
-- Individual fuel tanks for ships (for detailed fuel management)
CREATE TABLE IF NOT EXISTS fuel_tanks (
  id TEXT PRIMARY KEY,
  ship_id TEXT NOT NULL,
  tank_name TEXT NOT NULL,                    -- Main Tank, Reserve, Drop Tank, etc.
  capacity INTEGER NOT NULL,                  -- Max fuel in tons
  current_fuel INTEGER NOT NULL,              -- Current fuel in tons
  fuel_type TEXT DEFAULT 'refined',           -- refined, unrefined, mixed
  is_drop_tank INTEGER DEFAULT 0,             -- 1 = can be jettisoned
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ship_id) REFERENCES ships(id)
);

CREATE INDEX IF NOT EXISTS idx_fuel_ship ON fuel_tanks(ship_id);

-- ==================== VIEWS ====================
-- Useful views for common queries

-- Active campaigns with player counts
CREATE VIEW IF NOT EXISTS v_campaign_summary AS
SELECT
  c.id,
  c.name,
  c.gm_name,
  c.current_date,
  c.current_system,
  COUNT(DISTINCT p.id) as player_count,
  COUNT(DISTINCT s.id) as ship_count
FROM campaigns c
LEFT JOIN player_accounts p ON p.campaign_id = c.id
LEFT JOIN ships s ON s.campaign_id = c.id
GROUP BY c.id;

-- Ship crew roster (players + NPCs)
CREATE VIEW IF NOT EXISTS v_ship_roster AS
SELECT
  s.id as ship_id,
  s.name as ship_name,
  'player' as crew_type,
  p.slot_name as name,
  p.role,
  p.last_login as status_time
FROM ships s
JOIN player_accounts p ON p.ship_id = s.id
UNION ALL
SELECT
  s.id as ship_id,
  s.name as ship_name,
  'npc' as crew_type,
  n.name,
  n.role,
  n.created_at as status_time
FROM ships s
JOIN npc_crew n ON n.ship_id = s.id;
