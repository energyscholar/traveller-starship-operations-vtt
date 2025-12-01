/**
 * Operations Contact Management
 * Handles sensor contacts for campaigns
 */

const { db, generateId, touchUpdatedAt } = require('./database');

// Contact types
const CONTACT_TYPES = ['unknown', 'ship', 'station', 'debris', 'asteroid', 'beacon', 'missile'];

// Range bands (in km) - Traveller scale
const RANGE_BANDS = {
  adjacent: { max: 1, label: 'Adjacent' },
  close: { max: 10, label: 'Close' },
  short: { max: 1250, label: 'Short' },
  medium: { max: 10000, label: 'Medium' },
  long: { max: 25000, label: 'Long' },
  veryLong: { max: 50000, label: 'Very Long' },
  distant: { max: Infinity, label: 'Distant' }
};

// Signature levels
const SIGNATURE_LEVELS = ['minimal', 'reduced', 'normal', 'increased', 'large'];

/**
 * Calculate range band from distance in km
 * @param {number} rangeKm - Distance in km
 * @returns {string} Range band name
 */
function getRangeBand(rangeKm) {
  for (const [band, config] of Object.entries(RANGE_BANDS)) {
    if (rangeKm <= config.max) return band;
  }
  return 'distant';
}

/**
 * Add a new contact to the campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} contactData - Contact data
 * @returns {Object} Created contact
 */
function addContact(campaignId, contactData) {
  const id = generateId();
  const rangeBand = getRangeBand(contactData.range_km || 0);

  const stmt = db.prepare(`
    INSERT INTO contacts (id, campaign_id, name, type, bearing, range_km, range_band, transponder, signature, visible_to, gm_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    campaignId,
    contactData.name || null,
    contactData.type || 'unknown',
    contactData.bearing || 0,
    contactData.range_km || 0,
    rangeBand,
    contactData.transponder || null,
    contactData.signature || 'normal',
    contactData.visible_to || 'all',
    contactData.gm_notes || null
  );

  return getContact(id);
}

/**
 * Get a single contact by ID
 * @param {string} id - Contact ID
 * @returns {Object|null} Contact or null
 */
function getContact(id) {
  const stmt = db.prepare('SELECT * FROM contacts WHERE id = ?');
  return stmt.get(id) || null;
}

/**
 * Get all contacts for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Array} List of contacts
 */
function getContactsByCampaign(campaignId) {
  const stmt = db.prepare(`
    SELECT * FROM contacts
    WHERE campaign_id = ?
    ORDER BY range_km ASC
  `);
  return stmt.all(campaignId);
}

/**
 * Get visible contacts for a player (respects visible_to filter)
 * @param {string} campaignId - Campaign ID
 * @param {string} shipId - Player's ship ID (for visibility checks)
 * @returns {Array} List of visible contacts
 */
function getVisibleContacts(campaignId, shipId = null) {
  const stmt = db.prepare(`
    SELECT * FROM contacts
    WHERE campaign_id = ?
    AND (visible_to = 'all' OR visible_to = ? OR visible_to LIKE ?)
    ORDER BY range_km ASC
  `);
  // visible_to can be 'all', a specific ship ID, or comma-separated list
  return stmt.all(campaignId, shipId, `%${shipId}%`);
}

/**
 * Update a contact
 * @param {string} id - Contact ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated contact
 */
function updateContact(id, updates) {
  const allowedFields = ['name', 'type', 'bearing', 'range_km', 'transponder', 'signature', 'visible_to', 'gm_notes', 'is_targetable', 'weapons_free', 'health'];
  const setFields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setFields.push(`${key} = ?`);
      values.push(value);
    }
  }

  // Recalculate range_band if range_km changed
  if (updates.range_km !== undefined) {
    setFields.push('range_band = ?');
    values.push(getRangeBand(updates.range_km));
  }

  if (setFields.length === 0) return getContact(id);

  values.push(id);
  const stmt = db.prepare(`
    UPDATE contacts
    SET ${setFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(...values);

  return getContact(id);
}

/**
 * Delete a contact
 * @param {string} id - Contact ID
 * @returns {boolean} True if deleted
 */
function deleteContact(id) {
  const stmt = db.prepare('DELETE FROM contacts WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Delete all contacts for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {number} Number of contacts deleted
 */
function clearCampaignContacts(campaignId) {
  const stmt = db.prepare('DELETE FROM contacts WHERE campaign_id = ?');
  const result = stmt.run(campaignId);
  return result.changes;
}

module.exports = {
  // Constants
  CONTACT_TYPES,
  RANGE_BANDS,
  SIGNATURE_LEVELS,

  // Functions
  getRangeBand,
  addContact,
  getContact,
  getContactsByCampaign,
  getVisibleContacts,
  updateContact,
  deleteContact,
  clearCampaignContacts
};
