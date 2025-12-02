/**
 * NPC Contacts System (Autorun 6)
 * Handles NPC contacts that players know, with per-player visibility
 */

const { db, generateId, touchUpdatedAt } = require('./database');

/**
 * Add a new NPC contact
 * @param {string} campaignId - Campaign ID
 * @param {Object} contactData - Contact data
 * @returns {Object} Created contact
 */
function addNPCContact(campaignId, contactData) {
  const {
    name,
    title = null,
    location = null,
    description = null,
    loyalty = 0,
    visibleTo = [],  // Array of player_account IDs
    notes = null,
    portrait = null
  } = contactData;

  const id = generateId();
  const visibleToJson = JSON.stringify(visibleTo);

  const stmt = db.prepare(`
    INSERT INTO npc_contacts (id, campaign_id, name, title, location, description, loyalty, visible_to, notes, portrait)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, campaignId, name, title, location, description, loyalty, visibleToJson, notes, portrait);

  return getNPCContact(id);
}

/**
 * Get an NPC contact by ID
 * @param {string} id - Contact ID
 * @returns {Object|null} Contact or null
 */
function getNPCContact(id) {
  const stmt = db.prepare('SELECT * FROM npc_contacts WHERE id = ?');
  const contact = stmt.get(id);
  if (contact) {
    contact.visible_to = JSON.parse(contact.visible_to || '[]');
  }
  return contact || null;
}

/**
 * Get all NPC contacts for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Contacts
 */
function getNPCContactsByCampaign(campaignId) {
  const stmt = db.prepare('SELECT * FROM npc_contacts WHERE campaign_id = ? ORDER BY name');
  const contacts = stmt.all(campaignId);
  return contacts.map(c => ({
    ...c,
    visible_to: JSON.parse(c.visible_to || '[]')
  }));
}

/**
 * Get NPC contacts visible to a specific player
 * @param {string} campaignId - Campaign ID
 * @param {string} playerId - Player account ID
 * @returns {Array} Visible contacts
 */
function getNPCContactsForPlayer(campaignId, playerId) {
  const allContacts = getNPCContactsByCampaign(campaignId);
  return allContacts.filter(c => {
    // Visible if:
    // 1. visible_to is empty (GM only - shouldn't return these)
    // 2. visible_to contains this player's ID
    // 3. visible_to contains 'all'
    return c.visible_to.includes(playerId) || c.visible_to.includes('all');
  });
}

/**
 * Update an NPC contact
 * @param {string} id - Contact ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated contact
 */
function updateNPCContact(id, updates) {
  const allowedFields = ['name', 'title', 'location', 'description', 'loyalty', 'notes', 'portrait'];
  const setFields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setFields.push(`${key} = ?`);
      values.push(value);
    }
  }

  // Handle visible_to separately (needs JSON encoding)
  if (updates.visibleTo !== undefined) {
    setFields.push('visible_to = ?');
    values.push(JSON.stringify(updates.visibleTo));
  }

  if (setFields.length === 0) return getNPCContact(id);

  values.push(id);
  const stmt = db.prepare(`
    UPDATE npc_contacts
    SET ${setFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(...values);

  return getNPCContact(id);
}

/**
 * Add a player to a contact's visibility
 * @param {string} id - Contact ID
 * @param {string} playerId - Player account ID to add
 * @returns {Object} Updated contact
 */
function addPlayerToContactVisibility(id, playerId) {
  const contact = getNPCContact(id);
  if (!contact) return null;

  const visibleTo = contact.visible_to;
  if (!visibleTo.includes(playerId)) {
    visibleTo.push(playerId);
    return updateNPCContact(id, { visibleTo });
  }
  return contact;
}

/**
 * Remove a player from a contact's visibility
 * @param {string} id - Contact ID
 * @param {string} playerId - Player account ID to remove
 * @returns {Object} Updated contact
 */
function removePlayerFromContactVisibility(id, playerId) {
  const contact = getNPCContact(id);
  if (!contact) return null;

  const visibleTo = contact.visible_to.filter(p => p !== playerId);
  return updateNPCContact(id, { visibleTo });
}

/**
 * Make a contact visible to all players
 * @param {string} id - Contact ID
 * @returns {Object} Updated contact
 */
function makeContactPublic(id) {
  return updateNPCContact(id, { visibleTo: ['all'] });
}

/**
 * Delete an NPC contact
 * @param {string} id - Contact ID
 * @returns {boolean} Success
 */
function deleteNPCContact(id) {
  const stmt = db.prepare('DELETE FROM npc_contacts WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

module.exports = {
  addNPCContact,
  getNPCContact,
  getNPCContactsByCampaign,
  getNPCContactsForPlayer,
  updateNPCContact,
  addPlayerToContactVisibility,
  removePlayerFromContactVisibility,
  makeContactPublic,
  deleteNPCContact
};
