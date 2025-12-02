/**
 * Staged Reveals Module (Autorun 7)
 * GM prep system for plot reveals, secrets, discoveries
 * Content is hidden until GM deploys it during session
 */

const { db, generateId } = require('./database');

// Reveal categories
const REVEAL_CATEGORIES = {
  PLOT: 'plot',
  LORE: 'lore',
  SECRET: 'secret',
  DISCOVERY: 'discovery',
  ITEM: 'item'
};

// Visibility states
const VISIBILITY = {
  HIDDEN: 'hidden',      // Only GM sees
  PARTIAL: 'partial',    // Some players see (check visible_to)
  REVEALED: 'revealed'   // All players see
};

// Trigger types
const TRIGGER_TYPES = {
  MANUAL: 'manual',      // GM clicks reveal
  TIME: 'time',          // Auto-reveal at game date
  EVENT: 'event',        // Triggered by event
  CONDITION: 'condition' // Triggered by condition text
};

/**
 * Create a new staged reveal
 * @param {string} campaignId - Campaign ID
 * @param {Object} revealData - Reveal data
 * @returns {Object} Created reveal
 */
function createReveal(campaignId, revealData) {
  const {
    title,
    category = 'plot',
    summary = null,
    fullText = null,
    handoutId = null,
    triggerType = null,
    triggerValue = null,
    orderIndex = 0,
    tags = []
  } = revealData;

  const id = generateId();

  const stmt = db.prepare(`
    INSERT INTO staged_reveals (id, campaign_id, title, category, summary, full_text, handout_id, trigger_type, trigger_value, order_index, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, campaignId, title, category, summary, fullText, handoutId, triggerType, triggerValue, orderIndex, JSON.stringify(tags));

  return getReveal(id);
}

/**
 * Get a reveal by ID
 * @param {string} id - Reveal ID
 * @returns {Object|null} Reveal or null
 */
function getReveal(id) {
  const stmt = db.prepare('SELECT * FROM staged_reveals WHERE id = ?');
  const reveal = stmt.get(id);
  if (reveal) {
    reveal.visible_to = JSON.parse(reveal.visible_to || '[]');
    reveal.tags = JSON.parse(reveal.tags || '[]');
  }
  return reveal || null;
}

/**
 * Get all reveals for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Reveals
 */
function getRevealsByCampaign(campaignId) {
  const stmt = db.prepare('SELECT * FROM staged_reveals WHERE campaign_id = ? ORDER BY order_index ASC, created_at ASC');
  const reveals = stmt.all(campaignId);
  return reveals.map(r => {
    r.visible_to = JSON.parse(r.visible_to || '[]');
    r.tags = JSON.parse(r.tags || '[]');
    return r;
  });
}

/**
 * Get only hidden reveals (for GM prep view)
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Hidden reveals
 */
function getHiddenReveals(campaignId) {
  const stmt = db.prepare("SELECT * FROM staged_reveals WHERE campaign_id = ? AND visibility = 'hidden' ORDER BY order_index ASC");
  const reveals = stmt.all(campaignId);
  return reveals.map(r => {
    r.visible_to = JSON.parse(r.visible_to || '[]');
    r.tags = JSON.parse(r.tags || '[]');
    return r;
  });
}

/**
 * Get reveals visible to a specific player
 * @param {string} campaignId - Campaign ID
 * @param {string} playerId - Player account ID
 * @returns {Array} Reveals visible to player
 */
function getRevealedForPlayer(campaignId, playerId) {
  // Get all non-hidden reveals
  const stmt = db.prepare("SELECT * FROM staged_reveals WHERE campaign_id = ? AND visibility != 'hidden' ORDER BY revealed_at DESC, order_index ASC");
  const reveals = stmt.all(campaignId);

  return reveals.filter(r => {
    r.visible_to = JSON.parse(r.visible_to || '[]');
    r.tags = JSON.parse(r.tags || '[]');

    // If revealed to all, player can see
    if (r.visibility === 'revealed') return true;

    // If partial, check if player is in visible_to list
    if (r.visibility === 'partial') {
      return r.visible_to.includes(playerId);
    }

    return false;
  });
}

/**
 * Update a reveal
 * @param {string} id - Reveal ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated reveal
 */
function updateReveal(id, updates) {
  const allowedFields = ['title', 'category', 'summary', 'full_text', 'handout_id', 'trigger_type', 'trigger_value', 'order_index', 'tags'];
  const setFields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    // Convert camelCase to snake_case for db columns
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(dbKey)) {
      setFields.push(`${dbKey} = ?`);
      // Stringify arrays
      values.push(Array.isArray(value) ? JSON.stringify(value) : value);
    }
  }

  if (setFields.length === 0) return getReveal(id);

  values.push(id);
  const stmt = db.prepare(`
    UPDATE staged_reveals
    SET ${setFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(...values);

  return getReveal(id);
}

/**
 * Delete a reveal
 * @param {string} id - Reveal ID
 * @returns {boolean} Success
 */
function deleteReveal(id) {
  const stmt = db.prepare('DELETE FROM staged_reveals WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Reveal to all players
 * @param {string} id - Reveal ID
 * @param {string} gameDate - Current game date (optional)
 * @returns {Object} Updated reveal
 */
function revealToAll(id, gameDate = null) {
  const revealedAt = gameDate || new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE staged_reveals
    SET visibility = 'revealed', revealed_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(revealedAt, id);
  return getReveal(id);
}

/**
 * Reveal to a specific player
 * @param {string} id - Reveal ID
 * @param {string} playerId - Player account ID
 * @returns {Object} Updated reveal
 */
function revealToPlayer(id, playerId) {
  const reveal = getReveal(id);
  if (!reveal) return null;

  const visibleTo = reveal.visible_to || [];
  if (!visibleTo.includes(playerId)) {
    visibleTo.push(playerId);
  }

  const stmt = db.prepare(`
    UPDATE staged_reveals
    SET visibility = 'partial', visible_to = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(JSON.stringify(visibleTo), id);

  return getReveal(id);
}

/**
 * Hide a reveal (undo reveal - GM mistake correction)
 * @param {string} id - Reveal ID
 * @returns {Object} Updated reveal
 */
function hideReveal(id) {
  const stmt = db.prepare(`
    UPDATE staged_reveals
    SET visibility = 'hidden', visible_to = '[]', revealed_at = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(id);
  return getReveal(id);
}

/**
 * Check if a player can see a reveal
 * @param {Object} reveal - Reveal object
 * @param {string} playerId - Player account ID
 * @returns {boolean} Can see
 */
function canPlayerSee(reveal, playerId) {
  if (reveal.visibility === 'revealed') return true;
  if (reveal.visibility === 'partial') {
    const visibleTo = Array.isArray(reveal.visible_to)
      ? reveal.visible_to
      : JSON.parse(reveal.visible_to || '[]');
    return visibleTo.includes(playerId);
  }
  return false;
}

module.exports = {
  // Constants
  REVEAL_CATEGORIES,
  VISIBILITY,
  TRIGGER_TYPES,

  // Functions
  createReveal,
  getReveal,
  getRevealsByCampaign,
  getHiddenReveals,
  getRevealedForPlayer,
  updateReveal,
  deleteReveal,
  revealToAll,
  revealToPlayer,
  hideReveal,
  canPlayerSee
};
