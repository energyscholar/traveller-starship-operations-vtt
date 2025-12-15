/**
 * Account Management for Traveller Starship Operations VTT
 * Handles GM accounts, player slots, and character management
 */

const { db, generateId, touchUpdatedAt } = require('./database');
const starSystemLoader = require('./star-system-loader');

// Crew roles available in the system
const CREW_ROLES = {
  COMBAT: [
    'pilot',
    'captain',
    'astrogator',
    'engineer',
    'sensor_operator',
    'gunner',
    'damage_control'
  ],
  SUPPORT: [
    'marines',
    'medic',
    'steward',
    'cargo_master'
  ],
  CUSTOM: 'custom'
};

const ALL_ROLES = [...CREW_ROLES.COMBAT, ...CREW_ROLES.SUPPORT];

/**
 * Create a new campaign
 * @param {string} name - Campaign name
 * @param {string} gmName - GM's name
 * @returns {Object} Created campaign
 */
function createCampaign(name, gmName) {
  const id = generateId();
  const stmt = db.prepare(`
    INSERT INTO campaigns (id, name, gm_name)
    VALUES (?, ?, ?)
  `);
  stmt.run(id, name, gmName);
  return getCampaign(id);
}

/**
 * Get a campaign by ID
 * @param {string} id - Campaign ID
 * @returns {Object|null} Campaign object or null
 */
function getCampaign(id) {
  const stmt = db.prepare('SELECT * FROM campaigns WHERE id = ?');
  return stmt.get(id);
}

/**
 * Get a campaign by partial code (first 8 chars of ID)
 * @param {string} code - Partial campaign code (case insensitive)
 * @returns {Object|null} Campaign object or null
 */
function getCampaignByCode(code) {
  // Normalize to lowercase for comparison
  const normalizedCode = code.toLowerCase();
  const stmt = db.prepare('SELECT * FROM campaigns WHERE LOWER(SUBSTR(id, 1, 8)) = ?');
  return stmt.get(normalizedCode);
}

/**
 * Get all campaigns (for GM to select)
 * @returns {Array} List of campaigns
 */
function getAllCampaigns() {
  const stmt = db.prepare('SELECT * FROM campaigns ORDER BY updated_at DESC');
  return stmt.all();
}

/**
 * Update campaign settings
 * @param {string} id - Campaign ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated campaign
 */
function updateCampaign(id, updates) {
  const allowedFields = [
    'name', 'current_date', 'current_system', 'current_sector', 'current_hex', 'god_mode',
    'home_system', 'location_history', 'favorite_locations',
    'in_deep_space', 'deep_space_reference', 'deep_space_bearing', 'deep_space_distance',
    'system_uid',  // AR-115: UID normalization
    'require_position_verification',  // AR-124: Toggle position verification after jump
    'jumps_use_fuel'  // AR-124: Toggle fuel consumption for jumps
  ];
  const setClause = [];
  const values = [];

  // AR-115: Auto-resolve system_uid when current_system is set
  if (updates.current_system && !updates.system_uid) {
    const system = starSystemLoader.getSystemByName(updates.current_system);
    if (system) {
      updates.system_uid = system.id;
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (setClause.length > 0) {
    values.push(id);
    const stmt = db.prepare(`
      UPDATE campaigns
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(...values);
  }

  return getCampaign(id);
}

/**
 * Delete a campaign and all related data
 * @param {string} id - Campaign ID
 */
function deleteCampaign(id) {
  const stmt = db.prepare('DELETE FROM campaigns WHERE id = ?');
  stmt.run(id);
}

/**
 * AR-115: Get current system data for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object|null} Full system data or null
 */
function getCampaignSystem(campaignId) {
  const campaign = getCampaign(campaignId);
  if (!campaign) return null;

  // Prefer system_uid lookup (O(1)), fall back to name lookup
  if (campaign.system_uid) {
    return starSystemLoader.getSystem(campaign.system_uid);
  }
  if (campaign.current_system) {
    return starSystemLoader.getSystemByName(campaign.current_system);
  }
  return null;
}

/**
 * AR-115: Set campaign system by UID (preferred) or name
 * @param {string} campaignId - Campaign ID
 * @param {string} systemIdOrName - System ID or name
 * @returns {Object} Updated campaign
 */
function setCampaignSystem(campaignId, systemIdOrName) {
  // Try as ID first
  let system = starSystemLoader.getSystem(systemIdOrName);
  if (!system) {
    // Fall back to name lookup
    system = starSystemLoader.getSystemByName(systemIdOrName);
  }

  if (!system) {
    throw new Error(`System not found: ${systemIdOrName}`);
  }

  return updateCampaign(campaignId, {
    current_system: system.name,
    system_uid: system.id,
    current_sector: system.sector || null,
    current_hex: system.hex || null
  });
}

/**
 * AR-21: Duplicate a campaign (copies campaign settings only, not players/ships)
 * @param {string} id - Source campaign ID
 * @returns {Object} New campaign
 */
function duplicateCampaign(id) {
  const source = getCampaign(id);
  if (!source) {
    throw new Error('Campaign not found');
  }
  const newId = generateId();
  const stmt = db.prepare(`
    INSERT INTO campaigns (id, name, gm_name, current_date, current_system, current_sector, current_hex, god_mode, system_uid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    newId,
    `${source.name} (Copy)`,
    source.gm_name,
    source.current_date,
    source.current_system,
    source.current_sector,
    source.current_hex,
    source.god_mode,
    source.system_uid  // AR-115: Copy system_uid
  );
  return getCampaign(newId);
}

/**
 * AR-21: Export campaign data to JSON
 * @param {string} id - Campaign ID
 * @returns {Object} Campaign export data
 */
function exportCampaign(id) {
  const campaign = getCampaign(id);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Get all player accounts
  const players = getPlayerAccountsByCampaign(id);

  // Get ships directly from database to avoid circular dependency
  const ships = db.prepare('SELECT * FROM ships WHERE campaign_id = ?').all(id);

  // Get characters directly from database
  const characters = db.prepare('SELECT * FROM characters WHERE campaign_id = ?').all(id);

  // Get ship logs (optional table, may not exist in test env)
  let shipLogs = [];
  try {
    shipLogs = db.prepare('SELECT * FROM ship_logs WHERE campaign_id = ? ORDER BY game_date DESC').all(id);
  } catch (e) {
    // Table may not exist in test environment
  }

  return {
    manifest: {
      version: '1.0',
      format: 'campaign-json',
      campaignName: campaign.name,
      exportedAt: new Date().toISOString()
    },
    campaign,
    players,
    ships,
    characters,
    shipLogs
  };
}

/**
 * AR-21: Import campaign from JSON
 * @param {Object} data - Exported campaign data
 * @param {string} gmName - GM name for new campaign
 * @returns {Object} Newly created campaign
 */
function importCampaign(data, gmName) {
  if (!data.manifest || data.manifest.format !== 'campaign-json') {
    throw new Error('Invalid campaign export format');
  }

  const idMap = new Map(); // old ID -> new ID

  // Create new campaign
  const newCampaignId = generateId();
  const oldCampaign = data.campaign;
  db.prepare(`
    INSERT INTO campaigns (id, name, gm_name, current_date, current_system, current_sector, current_hex, god_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newCampaignId,
    `${oldCampaign.name} (Imported)`,
    gmName,
    oldCampaign.current_date,
    oldCampaign.current_system,
    oldCampaign.current_sector,
    oldCampaign.current_hex,
    oldCampaign.god_mode || 0
  );
  idMap.set(oldCampaign.id, newCampaignId);

  // Import ships
  for (const ship of (data.ships || [])) {
    const newShipId = generateId();
    db.prepare(`
      INSERT INTO ships (id, campaign_id, name, ship_class, tonnage, hull_current, hull_max,
        armor, thrust, is_party_ship, is_hidden, fuel_current, fuel_max, power_current, power_max, crew_current, crew_max)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newShipId, newCampaignId, ship.name, ship.ship_class, ship.tonnage || 0,
      ship.hull_current || 0, ship.hull_max || 0, ship.armor || 0, ship.thrust || 0,
      ship.is_party_ship || 0, ship.is_hidden || 0, ship.fuel_current || 0, ship.fuel_max || 0,
      ship.power_current || 0, ship.power_max || 0, ship.crew_current || 0, ship.crew_max || 0
    );
    idMap.set(ship.id, newShipId);
  }

  // Import player accounts
  for (const player of (data.players || [])) {
    const newPlayerId = generateId();
    const newShipId = idMap.get(player.ship_id) || null;
    db.prepare(`
      INSERT INTO player_accounts (id, campaign_id, slot_name, ship_id, role, role_instance)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(newPlayerId, newCampaignId, player.slot_name, newShipId, player.role, player.role_instance);
    idMap.set(player.id, newPlayerId);
  }

  // Import characters
  for (const char of (data.characters || [])) {
    const newCharId = generateId();
    const newPlayerId = idMap.get(char.player_account_id) || null;
    db.prepare(`
      INSERT INTO characters (id, campaign_id, player_account_id, name, species, homeworld,
        strength, dexterity, endurance, intellect, education, social_standing)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newCharId, newCampaignId, newPlayerId, char.name || 'Unnamed',
      char.species || 'Human', char.homeworld || 'Unknown',
      char.strength || 7, char.dexterity || 7, char.endurance || 7,
      char.intellect || 7, char.education || 7, char.social_standing || 7
    );
    idMap.set(char.id, newCharId);
  }

  return getCampaign(newCampaignId);
}

// ==================== Player Accounts ====================

/**
 * Create a player account slot (GM action)
 * @param {string} campaignId - Campaign ID
 * @param {string} slotName - Player's display name (e.g., "Alice")
 * @returns {Object} Created player account
 */
function createPlayerSlot(campaignId, slotName) {
  const id = generateId();
  const stmt = db.prepare(`
    INSERT INTO player_accounts (id, campaign_id, slot_name)
    VALUES (?, ?, ?)
  `);
  stmt.run(id, campaignId, slotName);
  return getPlayerAccount(id);
}

/**
 * Get a player account by ID
 * @param {string} id - Account ID
 * @returns {Object|null} Player account or null
 */
function getPlayerAccount(id) {
  const stmt = db.prepare('SELECT * FROM player_accounts WHERE id = ?');
  const account = stmt.get(id);
  if (account) {
    account.character_data = account.character_data ? JSON.parse(account.character_data) : null;
    account.preferences = JSON.parse(account.preferences || '{}');
  }
  return account;
}

/**
 * Get all player accounts for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Array} List of player accounts
 */
function getPlayerAccountsByCampaign(campaignId) {
  const stmt = db.prepare(`
    SELECT * FROM player_accounts
    WHERE campaign_id = ?
    ORDER BY slot_name
  `);
  return stmt.all(campaignId).map(account => ({
    ...account,
    character_data: account.character_data ? JSON.parse(account.character_data) : null,
    preferences: JSON.parse(account.preferences || '{}')
  }));
}

/**
 * Update player account (player or GM action)
 * @param {string} id - Account ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated account
 */
function updatePlayerAccount(id, updates) {
  const allowedFields = ['slot_name', 'character_name', 'character_data', 'ship_id', 'role', 'role_instance', 'last_login', 'preferences', 'quirk_text', 'quirk_icon', 'role_title'];
  const setClause = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = ?`);
      // Serialize objects to JSON
      if (key === 'character_data' || key === 'preferences') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  }

  if (setClause.length > 0) {
    values.push(id);
    const stmt = db.prepare(`
      UPDATE player_accounts
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(...values);
  }

  return getPlayerAccount(id);
}

/**
 * Record player login
 * @param {string} id - Account ID
 * @returns {Object} Updated account
 */
function recordPlayerLogin(id) {
  return updatePlayerAccount(id, {
    last_login: new Date().toISOString()
  });
}

/**
 * Delete a player slot
 * @param {string} id - Account ID
 */
function deletePlayerSlot(id) {
  const stmt = db.prepare('DELETE FROM player_accounts WHERE id = ?');
  stmt.run(id);
}

/**
 * Import character data (minimal format)
 * @param {string} accountId - Account ID
 * @param {Object} characterData - Character information
 * @returns {Object} Updated account
 */
function importCharacter(accountId, characterData) {
  // Validate minimal character structure
  const { name, skills = {}, stats = {} } = characterData;

  if (!name) {
    throw new Error('Character must have a name');
  }

  // Normalize skills (lowercase keys)
  const normalizedSkills = {};
  for (const [key, value] of Object.entries(skills)) {
    normalizedSkills[key.toLowerCase()] = Number(value) || 0;
  }

  // Normalize stats
  const normalizedStats = {};
  for (const [key, value] of Object.entries(stats)) {
    normalizedStats[key.toUpperCase()] = Number(value) || 7; // Default 7 if not specified
  }

  const character = {
    name,
    skills: normalizedSkills,
    stats: normalizedStats,
    importedAt: new Date().toISOString()
  };

  return updatePlayerAccount(accountId, {
    character_name: name,
    character_data: character
  });
}

/**
 * Assign role to player
 * @param {string} accountId - Account ID
 * @param {string} role - Role name
 * @param {number} roleInstance - Role instance (1 for single roles, 1-N for multiple)
 * @returns {Object} Updated account
 */
function assignRole(accountId, role, roleInstance = 1) {
  const normalizedRole = role.toLowerCase();

  // Validate role
  if (!ALL_ROLES.includes(normalizedRole) && normalizedRole !== 'custom') {
    throw new Error(`Invalid role: ${role}. Valid roles: ${ALL_ROLES.join(', ')}`);
  }

  return updatePlayerAccount(accountId, { role: normalizedRole, role_instance: roleInstance });
}

/**
 * NAV-4: Clear player's role (go off-duty)
 * @param {string} accountId - Player account ID
 * @returns {Object} Updated account
 */
function clearRole(accountId) {
  return updatePlayerAccount(accountId, { role: null, role_instance: null });
}

/**
 * Get players assigned to a specific ship
 * @param {string} shipId - Ship ID
 * @returns {Array} List of player accounts on ship
 */
function getPlayersByShip(shipId) {
  const stmt = db.prepare(`
    SELECT * FROM player_accounts
    WHERE ship_id = ?
    ORDER BY role, role_instance, slot_name
  `);
  return stmt.all(shipId).map(account => ({
    ...account,
    character_data: account.character_data ? JSON.parse(account.character_data) : null,
    preferences: JSON.parse(account.preferences || '{}')
  }));
}

/**
 * Check if role is available on ship (not taken by another player)
 * @param {string} shipId - Ship ID
 * @param {string} role - Role to check
 * @param {string} excludeAccountId - Account ID to exclude (for updating own role)
 * @returns {boolean} True if role is available
 */
function isRoleAvailable(shipId, role, excludeAccountId = null) {
  let query = 'SELECT COUNT(*) as count FROM player_accounts WHERE ship_id = ? AND role = ?';
  const params = [shipId, role.toLowerCase()];

  if (excludeAccountId) {
    query += ' AND id != ?';
    params.push(excludeAccountId);
  }

  const stmt = db.prepare(query);
  const result = stmt.get(...params);
  return result.count === 0;
}

/**
 * Check if specific role instance is available on ship
 * @param {string} shipId - Ship ID
 * @param {string} role - Role to check
 * @param {number} roleInstance - Role instance (1 for single roles, 1-N for multiple)
 * @param {string} excludeAccountId - Account ID to exclude (for updating own role)
 * @returns {boolean} True if role instance is available
 */
function isRoleInstanceAvailable(shipId, role, roleInstance, excludeAccountId = null) {
  let query = 'SELECT COUNT(*) as count FROM player_accounts WHERE ship_id = ? AND role = ? AND role_instance = ?';
  const params = [shipId, role.toLowerCase(), roleInstance];

  if (excludeAccountId) {
    query += ' AND id != ?';
    params.push(excludeAccountId);
  }

  const stmt = db.prepare(query);
  const result = stmt.get(...params);
  return result.count === 0;
}

/**
 * AR-135: Get the account currently holding a role
 * @param {string} shipId - Ship ID
 * @param {string} role - Role name
 * @param {number} roleInstance - Role instance (default 1)
 * @returns {Object|null} Account data or null if not held
 */
function getRoleHolder(shipId, role, roleInstance = 1) {
  const stmt = db.prepare(`
    SELECT * FROM player_accounts
    WHERE ship_id = ? AND role = ? AND role_instance = ?
  `);
  return stmt.get(shipId, role.toLowerCase(), roleInstance) || null;
}

/**
 * AR-135: Bump player to observer role
 * @param {string} accountId - Account to bump
 */
function bumpToObserver(accountId) {
  const stmt = db.prepare(`
    UPDATE player_accounts
    SET role = 'observer', role_instance = 1
    WHERE id = ?
  `);
  stmt.run(accountId);
}

// Export all functions
module.exports = {
  // Constants
  CREW_ROLES,
  ALL_ROLES,

  // Campaign functions
  createCampaign,
  getCampaign,
  getCampaignByCode,
  getAllCampaigns,
  updateCampaign,
  deleteCampaign,
  duplicateCampaign,
  exportCampaign,
  importCampaign,
  getCampaignSystem,   // AR-115
  setCampaignSystem,   // AR-115

  // Player account functions
  createPlayerSlot,
  getPlayerAccount,
  getPlayerAccountsByCampaign,
  updatePlayerAccount,
  recordPlayerLogin,
  deletePlayerSlot,
  importCharacter,
  assignRole,
  clearRole,
  getPlayersByShip,
  isRoleAvailable,
  isRoleInstanceAvailable,
  getRoleHolder,      // AR-135
  bumpToObserver      // AR-135
};
