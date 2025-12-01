/**
 * Campaign State Management for Traveller Starship Operations VTT
 * Handles ships, NPC crew, session state, and ship logs
 */

const { db, generateId, touchUpdatedAt } = require('./database');

// ==================== Ships ====================

/**
 * Add a ship to a campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} name - Ship name
 * @param {Object} shipData - Ship template/configuration data
 * @param {Object} options - Additional options
 * @returns {Object} Created ship
 */
function addShip(campaignId, name, shipData, options = {}) {
  const id = generateId();
  const {
    templateId = null,
    visibleToPlayers = true,
    isPartyShip = false,
    currentState = {}
  } = options;

  const stmt = db.prepare(`
    INSERT INTO ships (id, campaign_id, name, template_id, ship_data, visible_to_players, is_party_ship, current_state)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    campaignId,
    name,
    templateId,
    JSON.stringify(shipData),
    visibleToPlayers ? 1 : 0,
    isPartyShip ? 1 : 0,
    JSON.stringify(currentState)
  );

  return getShip(id);
}

/**
 * Get a ship by ID
 * @param {string} id - Ship ID
 * @returns {Object|null} Ship object or null
 */
function getShip(id) {
  const stmt = db.prepare('SELECT * FROM ships WHERE id = ?');
  const ship = stmt.get(id);
  if (ship) {
    ship.ship_data = JSON.parse(ship.ship_data);
    ship.current_state = JSON.parse(ship.current_state || '{}');
    ship.visible_to_players = Boolean(ship.visible_to_players);
    ship.is_party_ship = Boolean(ship.is_party_ship);
  }
  return ship;
}

/**
 * Get all ships in a campaign
 * @param {string} campaignId - Campaign ID
 * @param {boolean} includeHidden - Include ships not visible to players
 * @returns {Array} List of ships
 */
function getShipsByCampaign(campaignId, includeHidden = false) {
  let query = 'SELECT * FROM ships WHERE campaign_id = ?';
  if (!includeHidden) {
    query += ' AND visible_to_players = 1';
  }
  query += ' ORDER BY is_party_ship DESC, name';

  const stmt = db.prepare(query);
  return stmt.all(campaignId).map(ship => ({
    ...ship,
    ship_data: JSON.parse(ship.ship_data),
    current_state: JSON.parse(ship.current_state || '{}'),
    visible_to_players: Boolean(ship.visible_to_players),
    is_party_ship: Boolean(ship.is_party_ship)
  }));
}

/**
 * Get party ships (ships players crew)
 * @param {string} campaignId - Campaign ID
 * @returns {Array} List of party ships
 */
function getPartyShips(campaignId) {
  const stmt = db.prepare(`
    SELECT * FROM ships
    WHERE campaign_id = ? AND is_party_ship = 1
    ORDER BY name
  `);
  return stmt.all(campaignId).map(ship => ({
    ...ship,
    ship_data: JSON.parse(ship.ship_data),
    current_state: JSON.parse(ship.current_state || '{}'),
    visible_to_players: Boolean(ship.visible_to_players),
    is_party_ship: true
  }));
}

/**
 * Update ship data
 * @param {string} id - Ship ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated ship
 */
function updateShip(id, updates) {
  const allowedFields = ['name', 'ship_data', 'visible_to_players', 'is_party_ship', 'current_state'];
  const setClause = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = ?`);
      if (key === 'ship_data' || key === 'current_state') {
        values.push(JSON.stringify(value));
      } else if (key === 'visible_to_players' || key === 'is_party_ship') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }
  }

  if (setClause.length > 0) {
    values.push(id);
    const stmt = db.prepare(`
      UPDATE ships
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(...values);
  }

  return getShip(id);
}

/**
 * Update ship current state (for real-time operations)
 * @param {string} id - Ship ID
 * @param {Object} stateUpdates - State changes to merge
 * @returns {Object} Updated ship
 */
function updateShipState(id, stateUpdates) {
  const ship = getShip(id);
  if (!ship) return null;

  const newState = {
    ...ship.current_state,
    ...stateUpdates,
    lastUpdated: new Date().toISOString()
  };

  return updateShip(id, { current_state: newState });
}

/**
 * Delete a ship
 * @param {string} id - Ship ID
 */
function deleteShip(id) {
  const stmt = db.prepare('DELETE FROM ships WHERE id = ?');
  stmt.run(id);
}

// ==================== NPC Crew ====================

/**
 * Add NPC crew member to a ship
 * @param {string} shipId - Ship ID
 * @param {string} name - NPC name
 * @param {string} role - Crew role
 * @param {Object} options - Additional options
 * @returns {Object} Created NPC
 */
function addNPCCrew(shipId, name, role, options = {}) {
  const id = generateId();
  const {
    skillLevel = 0,
    personality = null,
    isAI = false
  } = options;

  const stmt = db.prepare(`
    INSERT INTO npc_crew (id, ship_id, name, role, skill_level, personality, is_ai)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, shipId, name, role.toLowerCase(), skillLevel, personality, isAI ? 1 : 0);
  return getNPCCrew(id);
}

/**
 * Get NPC crew member by ID
 * @param {string} id - NPC ID
 * @returns {Object|null} NPC object or null
 */
function getNPCCrew(id) {
  const stmt = db.prepare('SELECT * FROM npc_crew WHERE id = ?');
  const npc = stmt.get(id);
  if (npc) {
    npc.is_ai = Boolean(npc.is_ai);
  }
  return npc;
}

/**
 * Get all NPC crew on a ship
 * @param {string} shipId - Ship ID
 * @returns {Array} List of NPCs
 */
function getNPCCrewByShip(shipId) {
  const stmt = db.prepare(`
    SELECT * FROM npc_crew
    WHERE ship_id = ?
    ORDER BY role, name
  `);
  return stmt.all(shipId).map(npc => ({
    ...npc,
    is_ai: Boolean(npc.is_ai)
  }));
}

/**
 * Update NPC crew member
 * @param {string} id - NPC ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated NPC
 */
function updateNPCCrew(id, updates) {
  const allowedFields = ['name', 'role', 'skill_level', 'personality', 'is_ai'];
  const setClause = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = ?`);
      if (key === 'is_ai') {
        values.push(value ? 1 : 0);
      } else if (key === 'role') {
        values.push(value.toLowerCase());
      } else {
        values.push(value);
      }
    }
  }

  if (setClause.length > 0) {
    values.push(id);
    const stmt = db.prepare(`
      UPDATE npc_crew
      SET ${setClause.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);
  }

  return getNPCCrew(id);
}

/**
 * Delete NPC crew member
 * @param {string} id - NPC ID
 */
function deleteNPCCrew(id) {
  const stmt = db.prepare('DELETE FROM npc_crew WHERE id = ?');
  stmt.run(id);
}

// ==================== Session State ====================

/**
 * Save session state
 * @param {string} campaignId - Campaign ID
 * @param {Object} stateData - Session state to save
 */
function saveSessionState(campaignId, stateData) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO session_state (campaign_id, state_data, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.run(campaignId, JSON.stringify(stateData));
}

/**
 * Load session state
 * @param {string} campaignId - Campaign ID
 * @returns {Object|null} Session state or null
 */
function loadSessionState(campaignId) {
  const stmt = db.prepare('SELECT * FROM session_state WHERE campaign_id = ?');
  const row = stmt.get(campaignId);
  if (row) {
    return {
      ...row,
      state_data: JSON.parse(row.state_data)
    };
  }
  return null;
}

// ==================== Ship Log ====================

/**
 * Add entry to ship log
 * @param {string} shipId - Ship ID
 * @param {string} campaignId - Campaign ID
 * @param {Object} entry - Log entry details
 * @returns {Object} Created log entry
 */
function addLogEntry(shipId, campaignId, entry) {
  const {
    gameDate,
    entryType = 'event',
    message,
    actor = null
  } = entry;

  const stmt = db.prepare(`
    INSERT INTO ship_log (ship_id, campaign_id, timestamp, game_date, entry_type, message, actor)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    shipId,
    campaignId,
    new Date().toISOString(),
    gameDate,
    entryType,
    message,
    actor
  );

  return getLogEntry(result.lastInsertRowid);
}

/**
 * Get log entry by ID
 * @param {number} id - Log entry ID
 * @returns {Object|null} Log entry or null
 */
function getLogEntry(id) {
  const stmt = db.prepare('SELECT * FROM ship_log WHERE id = ?');
  return stmt.get(id);
}

/**
 * Get ship log entries
 * @param {string} shipId - Ship ID
 * @param {Object} options - Query options
 * @returns {Array} List of log entries
 */
function getShipLog(shipId, options = {}) {
  const { limit = 100, offset = 0, entryType = null } = options;

  let query = 'SELECT * FROM ship_log WHERE ship_id = ?';
  const params = [shipId];

  if (entryType) {
    query += ' AND entry_type = ?';
    params.push(entryType);
  }

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Get recent log entries across all ships in campaign
 * @param {string} campaignId - Campaign ID
 * @param {number} limit - Max entries to return
 * @returns {Array} List of log entries
 */
function getCampaignLog(campaignId, limit = 50) {
  const stmt = db.prepare(`
    SELECT l.*, s.name as ship_name
    FROM ship_log l
    JOIN ships s ON l.ship_id = s.id
    WHERE l.campaign_id = ?
    ORDER BY l.id DESC
    LIMIT ?
  `);
  return stmt.all(campaignId, limit);
}

// ==================== Full Campaign Data ====================

/**
 * Get complete campaign data (for session restore)
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Full campaign data
 */
function getFullCampaignData(campaignId) {
  const accounts = require('./accounts');

  const campaign = accounts.getCampaign(campaignId);
  if (!campaign) return null;

  const players = accounts.getPlayerAccountsByCampaign(campaignId);
  const ships = getShipsByCampaign(campaignId, true); // Include hidden for GM
  const sessionState = loadSessionState(campaignId);

  // Get NPC crew for each ship
  const shipsWithCrew = ships.map(ship => ({
    ...ship,
    npcCrew: getNPCCrewByShip(ship.id)
  }));

  return {
    campaign,
    players,
    ships: shipsWithCrew,
    sessionState: sessionState?.state_data || null
  };
}

// ==================== Ship Templates ====================

const fs = require('fs');
const path = require('path');
const SHIP_TEMPLATES_DIR = path.join(__dirname, '../../data/ships/v2');

/**
 * Get available ship templates
 * @returns {Array} List of template summaries
 */
function getShipTemplates() {
  try {
    const files = fs.readdirSync(SHIP_TEMPLATES_DIR)
      .filter(f => f.endsWith('.json'));

    return files.map(file => {
      const content = fs.readFileSync(path.join(SHIP_TEMPLATES_DIR, file), 'utf8');
      const template = JSON.parse(content);
      return {
        id: template.id,
        name: template.name,
        tonnage: template.tonnage,
        type: template.type || template.name,
        jump: template.jump || 0,
        thrust: template.thrust || 0,
        hull: template.hull?.hullPoints || 40,
        crew: template.crew?.minimum || {}
      };
    });
  } catch (err) {
    console.error('Error loading ship templates:', err);
    return [];
  }
}

/**
 * Load full ship template by ID
 * @param {string} templateId - Template ID (e.g., 'scout', 'free_trader')
 * @returns {Object|null} Full template data or null
 */
function getShipTemplate(templateId) {
  try {
    const filePath = path.join(SHIP_TEMPLATES_DIR, `${templateId}.json`);
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

/**
 * Create a ship from a template
 * @param {string} campaignId - Campaign ID
 * @param {string} templateId - Template ID
 * @param {string} name - Custom ship name
 * @param {boolean} isPartyShip - Is this a party ship?
 * @returns {Object} Created ship
 */
function createShipFromTemplate(campaignId, templateId, name, isPartyShip = true) {
  const template = getShipTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const shipData = {
    ...template,
    hullPoints: template.hull?.hullPoints || 40,
    maxHullPoints: template.hull?.hullPoints || 40,
    armourRating: template.armour?.rating || 0,
    fuel: template.fuel?.capacity || 40,
    jumpRating: template.jump || 2,
    tonnage: template.tonnage || 100
  };

  const initialState = {
    alertStatus: 'NORMAL',
    hull: shipData.hullPoints,
    fuel: shipData.fuel,
    crits: {}
  };

  return addShip(campaignId, name, shipData, {
    templateId: templateId,
    visibleToPlayers: true,
    isPartyShip: isPartyShip,
    currentState: initialState
  });
}

// Export all functions
module.exports = {
  // Ship functions
  addShip,
  getShip,
  getShipsByCampaign,
  getShipTemplates,
  getShipTemplate,
  createShipFromTemplate,
  getPartyShips,
  updateShip,
  updateShipState,
  deleteShip,

  // NPC Crew functions
  addNPCCrew,
  getNPCCrew,
  getNPCCrewByShip,
  updateNPCCrew,
  deleteNPCCrew,

  // Session State functions
  saveSessionState,
  loadSessionState,

  // Ship Log functions
  addLogEntry,
  getLogEntry,
  getShipLog,
  getCampaignLog,

  // Full data
  getFullCampaignData
};
