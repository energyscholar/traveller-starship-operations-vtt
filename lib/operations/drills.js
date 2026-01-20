/**
 * AR-BD-10 + BD-11: Battle Drill Loader with State Tracking
 * Loads drill scenarios from JSON files and spawns contacts
 */

const fs = require('fs');
const path = require('path');
const contacts = require('./contacts');
const { db, generateId } = require('./database');

// Drill files directory
const DRILLS_DIR = path.join(__dirname, '../../data/drills');

// Allowed drill files (whitelist for security)
const ALLOWED_DRILLS = [
  'blood-profit-run1.json',
  'blood-profit-run2.json',
  'blood-profit-run3.json',
  'blood-profit-run4.json',
  'amishi-surprise.json',
  'amishi-last-stand.json'
];

// BD-11: Drill state enum
const DrillState = {
  INACTIVE: 'INACTIVE',   // No drill loaded
  LOADING: 'LOADING',     // Parsing/creating contacts
  ACTIVE: 'ACTIVE',       // Drill in progress
  RESETTING: 'RESETTING'  // Restoring snapshot
};

// Active drill state per campaign (with BD-11 enhanced state)
const activeDrills = new Map();

/**
 * Get list of available drills
 * @returns {Array} List of drill metadata
 */
function getAvailableDrills() {
  const drills = [];

  for (const filename of ALLOWED_DRILLS) {
    try {
      const filepath = path.join(DRILLS_DIR, filename);
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf8');
        const drill = JSON.parse(content);
        drills.push({
          id: drill.id,
          name: drill.name,
          description: drill.description,
          difficulty: drill.difficulty,
          contactCount: drill.contacts?.length || 0,
          filename
        });
      }
    } catch (e) {
      console.warn(`[Drills] Failed to load ${filename}:`, e.message);
    }
  }

  return drills;
}

/**
 * Load a drill scenario
 * @param {string} filename - Drill filename (must be in ALLOWED_DRILLS)
 * @returns {Object} Drill data
 */
function loadDrillFile(filename) {
  // Security: Validate filename against whitelist
  if (!ALLOWED_DRILLS.includes(filename)) {
    throw new Error(`Invalid drill filename: ${filename}`);
  }

  // Security: Prevent path traversal
  const safeName = path.basename(filename);
  if (safeName !== filename) {
    throw new Error('Path traversal not allowed');
  }

  const filepath = path.join(DRILLS_DIR, safeName);

  if (!fs.existsSync(filepath)) {
    throw new Error(`Drill file not found: ${filename}`);
  }

  const content = fs.readFileSync(filepath, 'utf8');
  const drill = JSON.parse(content);

  // Basic validation
  if (!drill.id || !drill.name || !Array.isArray(drill.contacts)) {
    throw new Error('Invalid drill format: missing required fields');
  }

  return drill;
}

/**
 * Load a drill into a campaign
 * Clears existing drill contacts and spawns new ones
 * @param {string} campaignId - Campaign ID
 * @param {string} filename - Drill filename
 * @param {Object} options - Optional: { shipId, shipState } for snapshot
 * @returns {Object} Result with drill info and created contacts
 */
function loadDrill(campaignId, filename, options = {}) {
  // BD-11: State transition to LOADING
  const existingDrill = activeDrills.get(campaignId);
  if (existingDrill) {
    existingDrill.state = DrillState.LOADING;
  }

  const drill = loadDrillFile(filename);

  // Clear any existing drill contacts from this campaign
  // (marked with is_targetable = 1 to distinguish from celestial objects)
  const cleared = clearDrillContacts(campaignId);

  // Create contacts from drill
  const createdContacts = [];

  for (const contactData of drill.contacts) {
    const contact = contacts.addContact(campaignId, {
      name: contactData.name,
      type: contactData.type || 'ship',
      disposition: contactData.disposition || 'hostile',
      bearing: contactData.bearing || 0,
      range_km: contactData.range_km || 10000,
      health: contactData.health || 20,
      max_health: contactData.max_health || contactData.health || 20,
      armor: contactData.armor || 0,
      gunner_skill: contactData.gunner_skill || 1,
      weapons: contactData.weapons || [],
      transponder: contactData.transponder || null,
      signature: contactData.signature || 'normal',
      is_targetable: true,
      weapons_free: true,  // Auto-authorize for drill
      visible_to: 'all'
    });

    createdContacts.push(contact);
  }

  // BD-11: Store active drill state with enhanced snapshot (Memento pattern)
  activeDrills.set(campaignId, {
    state: DrillState.ACTIVE,
    drillId: drill.id,
    drillName: drill.name,
    filename,
    loadedAt: new Date().toISOString(),
    initialContacts: createdContacts.map(c => ({ ...c })),
    // BD-11: Ship state snapshot (if provided)
    shipSnapshot: options.shipState ? {
      shipId: options.shipId,
      hullPoints: options.shipState.hullPoints,
      systems: options.shipState.systems ? { ...options.shipState.systems } : null,
      timestamp: new Date().toISOString()
    } : null
  });

  return {
    drill: {
      id: drill.id,
      name: drill.name,
      description: drill.description,
      difficulty: drill.difficulty
    },
    contacts: createdContacts,
    cleared,
    startConditions: drill.startConditions
  };
}

/**
 * Clear drill contacts from a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {number} Number of contacts cleared
 */
function clearDrillContacts(campaignId) {
  // Delete targetable contacts (drill contacts)
  const stmt = db.prepare(`
    DELETE FROM contacts
    WHERE campaign_id = ? AND is_targetable = 1
  `);
  const result = stmt.run(campaignId);
  return result.changes;
}

/**
 * Get active drill for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object|null} Active drill info or null
 */
function getActiveDrill(campaignId) {
  return activeDrills.get(campaignId) || null;
}

/**
 * End active drill for a campaign
 * @param {string} campaignId - Campaign ID
 */
function endDrill(campaignId) {
  clearDrillContacts(campaignId);
  activeDrills.delete(campaignId);
}

/**
 * Reset drill to initial state (BD-11 enhanced)
 * Restores contacts to initial health/state using Memento pattern
 * @param {string} campaignId - Campaign ID
 * @returns {Object|null} Reset result or null if no active drill
 */
function resetDrill(campaignId) {
  const drill = activeDrills.get(campaignId);
  if (!drill) {
    return null;
  }

  // BD-11: State transition to RESETTING
  drill.state = DrillState.RESETTING;

  // Clear current contacts
  clearDrillContacts(campaignId);

  // Recreate from initial snapshot (Memento restore)
  const restoredContacts = [];
  for (const contactData of drill.initialContacts) {
    const contact = contacts.addContact(campaignId, {
      name: contactData.name,
      type: contactData.type,
      disposition: contactData.disposition,
      bearing: contactData.bearing,
      range_km: contactData.range_km,
      health: contactData.max_health,  // Restore to full health
      max_health: contactData.max_health,
      armor: contactData.armor,
      gunner_skill: contactData.gunner_skill,
      weapons: contactData.weapons,
      transponder: contactData.transponder,
      signature: contactData.signature,
      is_targetable: true,
      weapons_free: true,
      visible_to: 'all'
    });
    restoredContacts.push(contact);
  }

  // BD-11: State transition back to ACTIVE
  drill.state = DrillState.ACTIVE;

  return {
    drillId: drill.drillId,
    drillName: drill.drillName,
    contacts: restoredContacts,
    // BD-11: Include ship snapshot if available for client to restore
    shipSnapshot: drill.shipSnapshot
  };
}

/**
 * BD-11: Get drill state for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {string} DrillState enum value
 */
function getDrillState(campaignId) {
  const drill = activeDrills.get(campaignId);
  return drill?.state || DrillState.INACTIVE;
}

module.exports = {
  getAvailableDrills,
  loadDrillFile,
  loadDrill,
  clearDrillContacts,
  getActiveDrill,
  endDrill,
  resetDrill,
  getDrillState,
  DrillState,
  ALLOWED_DRILLS
};
