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

// Scan levels (Autorun 6) - higher level reveals more info
const SCAN_LEVELS = {
  UNKNOWN: 0,   // Never scanned - contact not yet detected
  PASSIVE: 1,   // Transponder, celestial type, basic info
  ACTIVE: 2,    // Ship type, tonnage, crew estimate, weapons detected
  DEEP: 3       // Full details, cargo, GM notes
};

// What information is revealed at each scan level
const SCAN_REVEALS = {
  1: ['transponder', 'celestial type', 'bearing', 'range'],
  2: ['ship type', 'tonnage', 'signature', 'transponder override', 'weapons detected'],
  3: ['cargo manifest', 'crew count', 'detailed specs', 'GM notes']
};

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

  // Serialize weapons array to JSON if provided
  const weaponsJson = contactData.weapons ? JSON.stringify(contactData.weapons) : null;

  const stmt = db.prepare(`
    INSERT INTO contacts (id, campaign_id, name, type, bearing, range_km, range_band, transponder, signature, visible_to, gm_notes, is_targetable, weapons_free, health, max_health, weapons, gunner_skill, armor, disposition, power, max_power, training_target)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    contactData.gm_notes || null,
    contactData.is_targetable ? 1 : 0,
    contactData.weapons_free ? 1 : 0,
    contactData.health || 0,
    contactData.max_health || 0,
    weaponsJson,
    contactData.gunner_skill || 1,
    contactData.armor || 0,
    contactData.disposition || 'unknown',
    contactData.power ?? 100,
    contactData.max_power ?? 100,
    contactData.training_target ? 1 : 0
  );

  return getContact(id);
}

/**
 * Parse weapons JSON from database row
 * @param {Object} contact - Raw database row
 * @returns {Object} Contact with parsed weapons
 */
function parseContactWeapons(contact) {
  if (!contact) return null;
  if (contact.weapons && typeof contact.weapons === 'string') {
    try {
      contact.weapons = JSON.parse(contact.weapons);
    } catch (e) {
      console.warn(`Failed to parse weapons JSON for contact ${contact.id}:`, e);
      contact.weapons = [];
    }
  }
  return contact;
}

/**
 * Get a single contact by ID
 * @param {string} id - Contact ID
 * @returns {Object|null} Contact or null
 */
function getContact(id) {
  const stmt = db.prepare('SELECT * FROM contacts WHERE id = ?');
  const contact = stmt.get(id) || null;
  return parseContactWeapons(contact);
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
  return stmt.all(campaignId).map(parseContactWeapons);
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
  return stmt.all(campaignId, shipId, `%${shipId}%`).map(parseContactWeapons);
}

/**
 * Update a contact
 * @param {string} id - Contact ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated contact
 */
function updateContact(id, updates) {
  const allowedFields = ['name', 'type', 'bearing', 'range_km', 'transponder', 'signature', 'visible_to', 'gm_notes', 'is_targetable', 'weapons_free', 'health', 'scan_level', 'weapons', 'gunner_skill', 'armor', 'disposition', 'power', 'max_power'];
  const setFields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setFields.push(`${key} = ?`);
      // Serialize weapons array to JSON
      if (key === 'weapons' && Array.isArray(value)) {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
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

/**
 * Upgrade scan level for contacts and return what was newly discovered
 * @param {string[]} contactIds - Contact IDs to upgrade
 * @param {number} newLevel - New scan level (1=PASSIVE, 2=ACTIVE, 3=DEEP)
 * @returns {Array} Array of {contact, discoveries} for contacts that gained info
 */
function upgradeScanLevel(contactIds, newLevel) {
  const results = [];

  for (const id of contactIds) {
    const contact = getContact(id);
    if (!contact) continue;

    const oldLevel = contact.scan_level || 0;
    if (newLevel <= oldLevel) continue; // Already scanned at this level or higher

    // Collect all discoveries from old+1 to new level
    const discoveries = [];
    for (let level = oldLevel + 1; level <= newLevel; level++) {
      if (SCAN_REVEALS[level]) {
        discoveries.push(...SCAN_REVEALS[level]);
      }
    }

    // Update the scan level
    updateContact(id, { scan_level: newLevel });

    // Return contact info and what was discovered
    results.push({
      contact: { ...contact, scan_level: newLevel },
      oldLevel,
      newLevel,
      discoveries
    });
  }

  return results;
}

/**
 * Get scan level label
 * @param {number} level - Scan level number
 * @returns {string} Human-readable label
 */
function getScanLevelLabel(level) {
  switch (level) {
    case 0: return 'Unknown';
    case 1: return 'Passive';
    case 2: return 'Active';
    case 3: return 'Deep';
    default: return 'Unknown';
  }
}

/**
 * Get power threshold status based on power percentage
 * @param {number} power - Current power
 * @param {number} maxPower - Maximum power
 * @returns {string} Power threshold: 'normal', 'degraded', 'critical', 'emergency', 'disabled'
 */
function getPowerThreshold(power, maxPower) {
  if (maxPower <= 0) return 'disabled';
  const percent = (power / maxPower) * 100;
  if (percent >= 75) return 'normal';
  if (percent >= 50) return 'degraded';    // Weapons -2 DM
  if (percent >= 25) return 'critical';    // Weapons -4 DM, drives disabled
  if (percent > 0) return 'emergency';     // Emergency power only
  return 'disabled';                       // Ship disabled
}

/**
 * Drain power from a contact (ion weapon effect)
 * @param {string} id - Contact ID
 * @param {number} amount - Power to drain
 * @returns {Object} Updated contact with power threshold
 */
function drainContactPower(id, amount) {
  const contact = getContact(id);
  if (!contact) return null;

  const currentPower = contact.power ?? 100;
  const maxPower = contact.max_power ?? 100;
  const newPower = Math.max(0, currentPower - amount);
  const threshold = getPowerThreshold(newPower, maxPower);

  updateContact(id, { power: newPower });

  return {
    ...contact,
    power: newPower,
    powerThreshold: threshold,
    previousPower: currentPower,
    powerDrained: amount
  };
}

module.exports = {
  // Constants
  CONTACT_TYPES,
  RANGE_BANDS,
  SIGNATURE_LEVELS,
  SCAN_LEVELS,
  SCAN_REVEALS,

  // Functions
  getRangeBand,
  addContact,
  getContact,
  getContactsByCampaign,
  getContacts: getContactsByCampaign, // Alias for backwards compatibility
  getVisibleContacts,
  updateContact,
  deleteContact,
  clearCampaignContacts,
  upgradeScanLevel,
  getScanLevelLabel,
  getPowerThreshold,
  drainContactPower
};
