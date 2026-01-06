/**
 * Combat State Management for Operations VTT (Autorun 14)
 *
 * CRUD operations for:
 * - Ship weapons (attack capabilities)
 * - Contacts (targets for combat)
 * - Combat log (action history)
 */

const { db, generateId } = require('./database');

// ============================================================================
// SHIP WEAPONS
// ============================================================================

/**
 * Get all weapons for a ship
 * @param {string} shipId - Ship ID
 * @returns {Array} Array of weapon objects
 */
function getShipWeapons(shipId) {
  const stmt = db.prepare(`
    SELECT * FROM ship_weapons
    WHERE ship_id = ?
    ORDER BY mount, name
  `);
  return stmt.all(shipId);
}

/**
 * Add a weapon to a ship
 * @param {string} shipId - Ship ID
 * @param {Object} weapon - Weapon data
 * @returns {Object} Created weapon with ID
 */
function addShipWeapon(shipId, weapon) {
  const id = generateId();
  const stmt = db.prepare(`
    INSERT INTO ship_weapons (id, ship_id, name, type, mount, damage, range, ammo_current, ammo_max, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    shipId,
    weapon.name,
    weapon.type,
    weapon.mount,
    weapon.damage,
    weapon.range,
    weapon.ammo_current || null,
    weapon.ammo_max || null,
    weapon.status || 'ready'
  );
  return { id, ship_id: shipId, ...weapon };
}

/**
 * Update weapon status (ready, fired, damaged, destroyed)
 * @param {string} weaponId - Weapon ID
 * @param {Object} updates - Fields to update
 * @returns {boolean} Success
 */
function updateWeaponStatus(weaponId, updates) {
  const allowedFields = ['status', 'ammo_current'];
  const fields = Object.keys(updates).filter(k => allowedFields.includes(k));
  if (fields.length === 0) return false;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f]);
  values.push(weaponId);

  const stmt = db.prepare(`UPDATE ship_weapons SET ${setClause} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

/**
 * Remove a weapon from a ship
 * @param {string} weaponId - Weapon ID
 * @returns {boolean} Success
 */
function removeShipWeapon(weaponId) {
  const stmt = db.prepare('DELETE FROM ship_weapons WHERE id = ?');
  const result = stmt.run(weaponId);
  return result.changes > 0;
}

/**
 * Remove all weapons from a ship
 * @param {string} shipId - Ship ID
 * @returns {number} Number of weapons removed
 */
function clearShipWeapons(shipId) {
  const stmt = db.prepare('DELETE FROM ship_weapons WHERE ship_id = ?');
  const result = stmt.run(shipId);
  return result.changes;
}

// ============================================================================
// CONTACTS (Combat Targets)
// ============================================================================

/**
 * Get all targetable contacts for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Array of contact objects
 */
function getTargetableContacts(campaignId) {
  const stmt = db.prepare(`
    SELECT * FROM contacts
    WHERE campaign_id = ? AND is_targetable = 1
    ORDER BY range_km ASC
  `);
  return stmt.all(campaignId);
}

/**
 * Add a combat contact (target)
 * @param {string} campaignId - Campaign ID
 * @param {Object} contact - Contact data
 * @returns {Object} Created contact with ID
 */
function addCombatContact(campaignId, contact) {
  const id = generateId();
  const stmt = db.prepare(`
    INSERT INTO contacts (
      id, campaign_id, name, type, bearing, range_km, range_band,
      transponder, is_targetable, weapons_free, health, max_health,
      armor, disposition, gm_notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    campaignId,
    contact.name,
    contact.type || 'ship',
    contact.bearing || 0,
    contact.range_km || 0,
    contact.range_band || 'long',
    contact.transponder || contact.name,
    1, // is_targetable
    contact.weapons_free || 0,
    contact.health || contact.hull || 40,
    contact.max_health || contact.hull || 40,
    contact.armor || 0,
    contact.disposition || 'unknown',
    contact.gm_notes || null
  );
  return { id, campaign_id: campaignId, is_targetable: 1, ...contact };
}

/**
 * Update a contact's combat state
 * @param {string} contactId - Contact ID
 * @param {Object} updates - Fields to update
 * @returns {boolean} Success
 */
function updateContact(contactId, updates) {
  const allowedFields = [
    'name', 'type', 'bearing', 'range_km', 'range_band',
    'transponder', 'is_targetable', 'weapons_free',
    'health', 'max_health', 'armor', 'disposition', 'gm_notes'
  ];
  const fields = Object.keys(updates).filter(k => allowedFields.includes(k));
  if (fields.length === 0) return false;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f]);
  values.push(contactId);

  const stmt = db.prepare(`UPDATE contacts SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

/**
 * AR-256: Check if hull damage crosses 10% thresholds
 * Every 10% of total hull lost triggers a critical hit
 * @param {number} currentHull - Current hull after damage
 * @param {number} maxHull - Maximum hull points
 * @param {number} previousHull - Hull before this damage
 * @returns {number} Number of thresholds crossed
 */
function countThresholdsCrossed(currentHull, maxHull, previousHull) {
  if (maxHull <= 0) return 0;
  if (currentHull >= previousHull) return 0; // No damage or healing

  const threshold = maxHull * 0.1;
  const previousThresholdsCrossed = Math.floor((maxHull - previousHull) / threshold);
  const currentThresholdsCrossed = Math.floor((maxHull - currentHull) / threshold);

  return Math.max(0, currentThresholdsCrossed - previousThresholdsCrossed);
}

/**
 * Apply damage to a contact
 * AR-256: Now includes threshold-based critical hit tracking
 * @param {string} contactId - Contact ID
 * @param {number} damage - Damage amount (after armor reduction)
 * @returns {Object} Updated health state { health, max_health, destroyed, criticalHits }
 */
function applyDamageToContact(contactId, damage) {
  const contact = db.prepare('SELECT health, max_health FROM contacts WHERE id = ?').get(contactId);
  if (!contact) return null;

  const previousHull = contact.health;
  const newHealth = Math.max(0, contact.health - damage);
  const destroyed = newHealth <= 0;

  // AR-256: Check for threshold-based critical hits
  const thresholdsCrossed = countThresholdsCrossed(newHealth, contact.max_health, previousHull);

  db.prepare('UPDATE contacts SET health = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(newHealth, contactId);

  return {
    health: newHealth,
    max_health: contact.max_health,
    destroyed,
    // AR-256: Critical hit info
    previousHull,
    thresholdsCrossed,
    criticalHits: thresholdsCrossed // Number of critical hit rolls needed
  };
}

/**
 * Get a single contact by ID
 * @param {string} contactId - Contact ID
 * @returns {Object|null} Contact or null
 */
function getContact(contactId) {
  const stmt = db.prepare('SELECT * FROM contacts WHERE id = ?');
  const contact = stmt.get(contactId);
  // Parse weapons JSON if stored as string
  if (contact && contact.weapons && typeof contact.weapons === 'string') {
    try {
      contact.weapons = JSON.parse(contact.weapons);
    } catch (e) {
      contact.weapons = [];
    }
  }
  return contact;
}

/**
 * Remove a contact
 * @param {string} contactId - Contact ID
 * @returns {boolean} Success
 */
function removeContact(contactId) {
  const stmt = db.prepare('DELETE FROM contacts WHERE id = ?');
  const result = stmt.run(contactId);
  return result.changes > 0;
}

// ============================================================================
// COMBAT LOG
// ============================================================================

/**
 * Add an entry to the combat log
 * @param {string} campaignId - Campaign ID
 * @param {Object} entry - Log entry data
 * @returns {Object} Created log entry
 */
function addCombatLogEntry(campaignId, entry) {
  const timestamp = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO combat_log (campaign_id, timestamp, actor, action, target, weapon, roll_data, result)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    campaignId,
    timestamp,
    entry.actor,
    entry.action,
    entry.target || null,
    entry.weapon || null,
    entry.roll_data ? JSON.stringify(entry.roll_data) : null,
    entry.result || null
  );
  return {
    id: result.lastInsertRowid,
    campaign_id: campaignId,
    timestamp,
    ...entry
  };
}

/**
 * Get combat log entries for a campaign
 * @param {string} campaignId - Campaign ID
 * @param {number} limit - Max entries to return (default 50)
 * @returns {Array} Array of log entries, newest first
 */
function getCombatLog(campaignId, limit = 50) {
  const stmt = db.prepare(`
    SELECT * FROM combat_log
    WHERE campaign_id = ?
    ORDER BY id DESC
    LIMIT ?
  `);
  const entries = stmt.all(campaignId, limit);

  // Parse roll_data JSON
  return entries.map(e => ({
    ...e,
    roll_data: e.roll_data ? JSON.parse(e.roll_data) : null
  }));
}

/**
 * Clear combat log for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {number} Number of entries cleared
 */
function clearCombatLog(campaignId) {
  const stmt = db.prepare('DELETE FROM combat_log WHERE campaign_id = ?');
  const result = stmt.run(campaignId);
  return result.changes;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Weapons
  getShipWeapons,
  addShipWeapon,
  updateWeaponStatus,
  removeShipWeapon,
  clearShipWeapons,

  // Contacts (targets)
  getTargetableContacts,
  addCombatContact,
  updateContact,
  applyDamageToContact,
  getContact,
  removeContact,

  // AR-256: Critical hit threshold
  countThresholdsCrossed,

  // Combat log
  addCombatLogEntry,
  getCombatLog,
  clearCombatLog
};
