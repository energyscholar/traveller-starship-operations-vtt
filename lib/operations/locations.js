/**
 * Locations Module (Autorun 7)
 * Prepped scenes and places for GM prep
 * Hierarchical structure with visibility controls
 */

const { db, generateId } = require('./database');

// Location types
const LOCATION_TYPES = {
  WORLD: 'world',
  SYSTEM: 'system',
  STATION: 'station',
  SHIP: 'ship',
  SCENE: 'scene',
  ROOM: 'room'
};

// Visibility states
const VISIBILITY = {
  HIDDEN: 'hidden',
  DISCOVERED: 'discovered',
  REVEALED: 'revealed'
};

/**
 * Create a new location
 * @param {string} campaignId - Campaign ID
 * @param {Object} locationData - Location data
 * @returns {Object} Created location
 */
function createLocation(campaignId, locationData) {
  const {
    name,
    locationType = 'scene',
    parentId = null,
    descriptionGm = null,
    descriptionPlayers = null,
    atmosphere = null,
    connectedTo = [],
    mapUrl = null,
    hazards = [],
    npcsPresent = [],
    uwp = null,
    tradeCodes = null,
    tags = [],
    notes = null
  } = locationData;

  const id = generateId();

  const stmt = db.prepare(`
    INSERT INTO locations (
      id, campaign_id, name, location_type, parent_id,
      description_gm, description_players, atmosphere,
      connected_to, map_url, hazards, npcs_present,
      uwp, trade_codes, tags, notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, campaignId, name, locationType, parentId,
    descriptionGm, descriptionPlayers, atmosphere,
    JSON.stringify(connectedTo), mapUrl,
    JSON.stringify(hazards), JSON.stringify(npcsPresent),
    uwp, tradeCodes, JSON.stringify(tags), notes
  );

  return getLocation(id);
}

/**
 * Parse JSON fields in location
 */
function parseLocationFields(loc) {
  if (!loc) return null;
  loc.connected_to = JSON.parse(loc.connected_to || '[]');
  loc.hazards = JSON.parse(loc.hazards || '[]');
  loc.npcs_present = JSON.parse(loc.npcs_present || '[]');
  loc.discovered_by = JSON.parse(loc.discovered_by || '[]');
  loc.tags = JSON.parse(loc.tags || '[]');
  return loc;
}

/**
 * Get a location by ID
 * @param {string} id - Location ID
 * @returns {Object|null} Location or null
 */
function getLocation(id) {
  const stmt = db.prepare('SELECT * FROM locations WHERE id = ?');
  return parseLocationFields(stmt.get(id));
}

/**
 * Get all locations for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Locations
 */
function getLocationsByCampaign(campaignId) {
  const stmt = db.prepare('SELECT * FROM locations WHERE campaign_id = ? ORDER BY name ASC');
  return stmt.all(campaignId).map(parseLocationFields);
}

/**
 * Get child locations of a parent
 * @param {string} parentId - Parent location ID
 * @returns {Array} Child locations
 */
function getChildLocations(parentId) {
  const stmt = db.prepare('SELECT * FROM locations WHERE parent_id = ? ORDER BY name ASC');
  return stmt.all(parentId).map(parseLocationFields);
}

/**
 * Get top-level locations (no parent)
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Top-level locations
 */
function getRootLocations(campaignId) {
  const stmt = db.prepare('SELECT * FROM locations WHERE campaign_id = ? AND parent_id IS NULL ORDER BY name ASC');
  return stmt.all(campaignId).map(parseLocationFields);
}

/**
 * Get locations visible to a specific player
 * Returns sanitized version (player descriptions only)
 * @param {string} campaignId - Campaign ID
 * @param {string} playerId - Player account ID
 * @returns {Array} Locations visible to player (sanitized)
 */
function getDiscoveredLocationsForPlayer(campaignId, playerId) {
  const stmt = db.prepare("SELECT * FROM locations WHERE campaign_id = ? AND visibility != 'hidden' ORDER BY name ASC");
  const locations = stmt.all(campaignId);

  return locations
    .filter(loc => {
      const discoveredBy = JSON.parse(loc.discovered_by || '[]');
      if (loc.visibility === 'revealed') return true;
      if (loc.visibility === 'discovered') return discoveredBy.includes(playerId);
      return false;
    })
    .map(loc => {
      const parsed = parseLocationFields(loc);
      // Sanitize - use player description, hide GM-only fields
      return {
        id: parsed.id,
        name: parsed.name,
        location_type: parsed.location_type,
        parent_id: parsed.parent_id,
        description: parsed.description_players || parsed.atmosphere,
        map_url: parsed.map_url,
        uwp: parsed.uwp,
        trade_codes: parsed.trade_codes,
        connected_to: parsed.connected_to
        // Explicitly omitting: description_gm, hazards, notes, npcs_present
      };
    });
}

/**
 * Update a location
 * @param {string} id - Location ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated location
 */
function updateLocation(id, updates) {
  const allowedFields = [
    'name', 'location_type', 'parent_id',
    'description_gm', 'description_players', 'atmosphere',
    'connected_to', 'map_url', 'hazards', 'npcs_present',
    'uwp', 'trade_codes', 'tags', 'notes'
  ];
  const setFields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(dbKey)) {
      setFields.push(`${dbKey} = ?`);
      if (Array.isArray(value)) {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  }

  if (setFields.length === 0) return getLocation(id);

  values.push(id);
  const stmt = db.prepare(`
    UPDATE locations
    SET ${setFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(...values);

  return getLocation(id);
}

/**
 * Delete a location
 * @param {string} id - Location ID
 * @returns {boolean} Success
 */
function deleteLocation(id) {
  const stmt = db.prepare('DELETE FROM locations WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Reveal location to all players
 * @param {string} id - Location ID
 * @returns {Object} Updated location
 */
function revealLocation(id) {
  const stmt = db.prepare(`
    UPDATE locations
    SET visibility = 'revealed', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(id);
  return getLocation(id);
}

/**
 * Mark location as discovered by a player
 * @param {string} id - Location ID
 * @param {string} playerId - Player account ID
 * @returns {Object} Updated location
 */
function discoverLocation(id, playerId) {
  const loc = getLocation(id);
  if (!loc) return null;

  const discoveredBy = loc.discovered_by || [];
  if (!discoveredBy.includes(playerId)) {
    discoveredBy.push(playerId);
  }

  const stmt = db.prepare(`
    UPDATE locations
    SET visibility = 'discovered', discovered_by = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(JSON.stringify(discoveredBy), id);

  return getLocation(id);
}

/**
 * Hide location (undo discovery/reveal)
 * @param {string} id - Location ID
 * @returns {Object} Updated location
 */
function hideLocation(id) {
  const stmt = db.prepare(`
    UPDATE locations
    SET visibility = 'hidden', discovered_by = '[]', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(id);
  return getLocation(id);
}

/**
 * Add NPC to location
 * @param {string} locationId - Location ID
 * @param {string} npcId - NPC dossier ID
 * @returns {Object} Updated location
 */
function addNPCToLocation(locationId, npcId) {
  const loc = getLocation(locationId);
  if (!loc) return null;

  const npcsPresent = loc.npcs_present || [];
  if (!npcsPresent.includes(npcId)) {
    npcsPresent.push(npcId);
  }

  const stmt = db.prepare(`
    UPDATE locations
    SET npcs_present = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(JSON.stringify(npcsPresent), locationId);

  return getLocation(locationId);
}

/**
 * Remove NPC from location
 * @param {string} locationId - Location ID
 * @param {string} npcId - NPC dossier ID
 * @returns {Object} Updated location
 */
function removeNPCFromLocation(locationId, npcId) {
  const loc = getLocation(locationId);
  if (!loc) return null;

  const npcsPresent = (loc.npcs_present || []).filter(id => id !== npcId);

  const stmt = db.prepare(`
    UPDATE locations
    SET npcs_present = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(JSON.stringify(npcsPresent), locationId);

  return getLocation(locationId);
}

module.exports = {
  // Constants
  LOCATION_TYPES,
  VISIBILITY,

  // Functions
  createLocation,
  getLocation,
  getLocationsByCampaign,
  getChildLocations,
  getRootLocations,
  getDiscoveredLocationsForPlayer,
  updateLocation,
  deleteLocation,
  revealLocation,
  discoverLocation,
  hideLocation,
  addNPCToLocation,
  removeNPCFromLocation
};
