/**
 * NPC Dossiers Module (Autorun 7)
 * Full NPC profiles for GM prep - extends npc_contacts with:
 * - Stats and skills
 * - Public and hidden motivations
 * - Visibility controls for staged reveal
 */

const { db, generateId } = require('./database');

// NPC roles
const NPC_ROLES = {
  PATRON: 'patron',
  ALLY: 'ally',
  CONTACT: 'contact',
  NEUTRAL: 'neutral',
  ENEMY: 'enemy'
};

// NPC status
const NPC_STATUS = {
  ALIVE: 'alive',
  DEAD: 'dead',
  MISSING: 'missing',
  UNKNOWN: 'unknown'
};

// Visibility states (shared with reveals)
const VISIBILITY = {
  HIDDEN: 'hidden',
  PARTIAL: 'partial',
  REVEALED: 'revealed'
};

/**
 * Create a new NPC dossier
 * @param {string} campaignId - Campaign ID
 * @param {Object} npcData - NPC data
 * @returns {Object} Created NPC
 */
function createNPCDossier(campaignId, npcData) {
  const {
    name,
    title = null,
    role = 'neutral',
    portraitUrl = null,
    stats = null,
    skills = null,
    personality = null,
    motivationPublic = null,
    motivationHidden = null,
    background = null,
    locationId = null,
    locationText = null,
    currentStatus = 'alive',
    knownAs = [],
    tags = [],
    notes = null
  } = npcData;

  const id = generateId();

  const stmt = db.prepare(`
    INSERT INTO npc_dossiers (
      id, campaign_id, name, title, role, portrait_url,
      stats, skills, personality, motivation_public, motivation_hidden,
      background, location_id, location_text, current_status,
      known_as, tags, notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, campaignId, name, title, role, portraitUrl,
    stats ? JSON.stringify(stats) : null,
    skills ? JSON.stringify(skills) : null,
    personality, motivationPublic, motivationHidden,
    background, locationId, locationText, currentStatus,
    JSON.stringify(knownAs), JSON.stringify(tags), notes
  );

  return getNPCDossier(id);
}

/**
 * Parse JSON fields in NPC dossier
 */
function parseNPCFields(npc) {
  if (!npc) return null;
  npc.stats = npc.stats ? JSON.parse(npc.stats) : null;
  npc.skills = npc.skills ? JSON.parse(npc.skills) : null;
  npc.visible_to = JSON.parse(npc.visible_to || '[]');
  npc.known_as = JSON.parse(npc.known_as || '[]');
  npc.tags = JSON.parse(npc.tags || '[]');
  return npc;
}

/**
 * Get an NPC dossier by ID
 * @param {string} id - NPC ID
 * @returns {Object|null} NPC or null
 */
function getNPCDossier(id) {
  const stmt = db.prepare('SELECT * FROM npc_dossiers WHERE id = ?');
  return parseNPCFields(stmt.get(id));
}

/**
 * Get all NPC dossiers for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Array} NPCs
 */
function getNPCDossiersByCampaign(campaignId) {
  const stmt = db.prepare('SELECT * FROM npc_dossiers WHERE campaign_id = ? ORDER BY name ASC');
  return stmt.all(campaignId).map(parseNPCFields);
}

/**
 * Get only hidden NPCs (for GM prep view)
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Hidden NPCs
 */
function getHiddenNPCs(campaignId) {
  const stmt = db.prepare("SELECT * FROM npc_dossiers WHERE campaign_id = ? AND visibility = 'hidden' ORDER BY name ASC");
  return stmt.all(campaignId).map(parseNPCFields);
}

/**
 * Get NPCs visible to a specific player
 * Returns sanitized version (no hidden motivations, GM notes)
 * @param {string} campaignId - Campaign ID
 * @param {string} playerId - Player account ID
 * @returns {Array} NPCs visible to player (sanitized)
 */
function getVisibleNPCsForPlayer(campaignId, playerId) {
  const stmt = db.prepare("SELECT * FROM npc_dossiers WHERE campaign_id = ? AND visibility != 'hidden' ORDER BY name ASC");
  const npcs = stmt.all(campaignId);

  return npcs
    .filter(npc => {
      const visibleTo = JSON.parse(npc.visible_to || '[]');
      if (npc.visibility === 'revealed') return true;
      if (npc.visibility === 'partial') return visibleTo.includes(playerId);
      return false;
    })
    .map(npc => {
      const parsed = parseNPCFields(npc);
      // Sanitize - remove GM-only fields
      return {
        id: parsed.id,
        name: parsed.name,
        title: parsed.title,
        role: parsed.role,
        portrait_url: parsed.portrait_url,
        personality: parsed.personality,
        motivation_public: parsed.motivation_public,
        location_text: parsed.location_text,
        current_status: parsed.current_status,
        known_as: parsed.known_as
        // Explicitly omitting: motivation_hidden, background, notes, stats, skills
      };
    });
}

/**
 * Update an NPC dossier
 * @param {string} id - NPC ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated NPC
 */
function updateNPCDossier(id, updates) {
  const allowedFields = [
    'name', 'title', 'role', 'portrait_url',
    'stats', 'skills', 'personality',
    'motivation_public', 'motivation_hidden', 'background',
    'location_id', 'location_text', 'current_status',
    'known_as', 'tags', 'notes'
  ];
  const setFields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(dbKey)) {
      setFields.push(`${dbKey} = ?`);
      // Stringify objects/arrays
      if (typeof value === 'object' && value !== null) {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  }

  if (setFields.length === 0) return getNPCDossier(id);

  values.push(id);
  const stmt = db.prepare(`
    UPDATE npc_dossiers
    SET ${setFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(...values);

  return getNPCDossier(id);
}

/**
 * Delete an NPC dossier
 * @param {string} id - NPC ID
 * @returns {boolean} Success
 */
function deleteNPCDossier(id) {
  const stmt = db.prepare('DELETE FROM npc_dossiers WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Reveal NPC to all players
 * @param {string} id - NPC ID
 * @returns {Object} Updated NPC
 */
function revealNPC(id) {
  const stmt = db.prepare(`
    UPDATE npc_dossiers
    SET visibility = 'revealed', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(id);
  return getNPCDossier(id);
}

/**
 * Reveal NPC to a specific player
 * @param {string} id - NPC ID
 * @param {string} playerId - Player account ID
 * @returns {Object} Updated NPC
 */
function revealNPCToPlayer(id, playerId) {
  const npc = getNPCDossier(id);
  if (!npc) return null;

  const visibleTo = npc.visible_to || [];
  if (!visibleTo.includes(playerId)) {
    visibleTo.push(playerId);
  }

  const stmt = db.prepare(`
    UPDATE npc_dossiers
    SET visibility = 'partial', visible_to = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(JSON.stringify(visibleTo), id);

  return getNPCDossier(id);
}

/**
 * Hide NPC (undo reveal)
 * @param {string} id - NPC ID
 * @returns {Object} Updated NPC
 */
function hideNPC(id) {
  const stmt = db.prepare(`
    UPDATE npc_dossiers
    SET visibility = 'hidden', visible_to = '[]', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(id);
  return getNPCDossier(id);
}

/**
 * Set NPC location
 * @param {string} id - NPC ID
 * @param {string} locationId - Location ID (optional)
 * @param {string} locationText - Location text description
 * @returns {Object} Updated NPC
 */
function setNPCLocation(id, locationId, locationText) {
  const stmt = db.prepare(`
    UPDATE npc_dossiers
    SET location_id = ?, location_text = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(locationId, locationText, id);
  return getNPCDossier(id);
}

/**
 * Set NPC status
 * @param {string} id - NPC ID
 * @param {string} status - Status (alive, dead, missing, unknown)
 * @returns {Object} Updated NPC
 */
function setNPCStatus(id, status) {
  const stmt = db.prepare(`
    UPDATE npc_dossiers
    SET current_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(status, id);
  return getNPCDossier(id);
}

/**
 * Check if a player can see an NPC
 * @param {Object} npc - NPC object
 * @param {string} playerId - Player account ID
 * @returns {boolean} Can see
 */
function canPlayerSeeNPC(npc, playerId) {
  if (npc.visibility === 'revealed') return true;
  if (npc.visibility === 'partial') {
    const visibleTo = Array.isArray(npc.visible_to)
      ? npc.visible_to
      : JSON.parse(npc.visible_to || '[]');
    return visibleTo.includes(playerId);
  }
  return false;
}

module.exports = {
  // Constants
  NPC_ROLES,
  NPC_STATUS,
  VISIBILITY,

  // Functions
  createNPCDossier,
  getNPCDossier,
  getNPCDossiersByCampaign,
  getHiddenNPCs,
  getVisibleNPCsForPlayer,
  updateNPCDossier,
  deleteNPCDossier,
  revealNPC,
  revealNPCToPlayer,
  hideNPC,
  setNPCLocation,
  setNPCStatus,
  canPlayerSeeNPC
};
