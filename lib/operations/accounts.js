/**
 * Account Management for Traveller Starship Operations VTT
 * Handles GM accounts, player slots, and character management
 */

const { db, generateId, touchUpdatedAt } = require('./database');

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
  const allowedFields = ['name', 'current_date', 'current_system', 'god_mode'];
  const setClause = [];
  const values = [];

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
  return stmt.all().map(account => ({
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
  const allowedFields = ['slot_name', 'character_name', 'character_data', 'ship_id', 'role', 'last_login', 'preferences'];
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
 * @returns {Object} Updated account
 */
function assignRole(accountId, role) {
  const normalizedRole = role.toLowerCase();

  // Validate role
  if (!ALL_ROLES.includes(normalizedRole) && normalizedRole !== 'custom') {
    throw new Error(`Invalid role: ${role}. Valid roles: ${ALL_ROLES.join(', ')}`);
  }

  return updatePlayerAccount(accountId, { role: normalizedRole });
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
    ORDER BY role, slot_name
  `);
  return stmt.all().map(account => ({
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

// Export all functions
module.exports = {
  // Constants
  CREW_ROLES,
  ALL_ROLES,

  // Campaign functions
  createCampaign,
  getCampaign,
  getAllCampaigns,
  updateCampaign,
  deleteCampaign,

  // Player account functions
  createPlayerSlot,
  getPlayerAccount,
  getPlayerAccountsByCampaign,
  updatePlayerAccount,
  recordPlayerLogin,
  deletePlayerSlot,
  importCharacter,
  assignRole,
  getPlayersByShip,
  isRoleAvailable
};
