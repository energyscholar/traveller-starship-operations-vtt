/**
 * NPC Location System
 * Structured location tracking for NPCs across all NPC tables
 */

const { db } = require('./database');

const VALID_TABLES = ['dossiers', 'personae', 'contacts'];
const TABLE_MAP = {
  dossiers: 'npc_dossiers',
  personae: 'npc_personae',
  contacts: 'npc_contacts'
};

/**
 * Validate NPC location JSON
 * @param {Object} location - Location object to validate
 * @returns {{ valid: boolean, warnings: string[] }}
 */
function validateNPCLocation(location) {
  const warnings = [];

  if (!location || typeof location !== 'object') {
    return { valid: true, warnings: [] };  // Empty/null is valid (unknown location)
  }

  // Check hex format if provided
  if (location.hex !== null && location.hex !== undefined) {
    if (typeof location.hex !== 'string' || !/^\d{4}$/.test(location.hex)) {
      warnings.push('hex must be a 4-digit string (e.g., "1910")');
    }

    // If hex is provided, sector is required
    if (!location.sector) {
      warnings.push('sector is required when hex is specified');
    }
  }

  // Validate uncertainty if provided
  if (location.uncertainty !== null && location.uncertainty !== undefined) {
    const validUncertainty = ['sector', 'system', 'exact'];
    if (!validUncertainty.includes(location.uncertainty)) {
      warnings.push(`uncertainty must be one of: ${validUncertainty.join(', ')}`);
    }
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * Validate table name
 * @param {string} table - Table short name (dossiers, personae, contacts)
 */
function validateTable(table) {
  if (!VALID_TABLES.includes(table)) {
    throw new Error(`Invalid table "${table}". Must be one of: ${VALID_TABLES.join(', ')}`);
  }
}

/**
 * Set NPC location
 * @param {string} npcId - NPC ID
 * @param {string} table - Table short name (dossiers, personae, contacts)
 * @param {Object} location - Location object
 * @returns {{ success: boolean, warnings: string[] }}
 */
function setNPCLocation(npcId, table, location) {
  validateTable(table);

  const validation = validateNPCLocation(location);
  const tableName = TABLE_MAP[table];

  const stmt = db.prepare(`UPDATE ${tableName} SET npc_location = ? WHERE id = ?`);
  stmt.run(JSON.stringify(location), npcId);

  return {
    success: true,
    warnings: validation.warnings
  };
}

/**
 * Get NPC location
 * @param {string} npcId - NPC ID
 * @param {string} table - Table short name (dossiers, personae, contacts)
 * @returns {Object|null} Location object or null
 */
function getNPCLocation(npcId, table) {
  validateTable(table);

  const tableName = TABLE_MAP[table];
  const row = db.prepare(`SELECT npc_location FROM ${tableName} WHERE id = ?`).get(npcId);

  if (!row || !row.npc_location) {
    return null;
  }

  try {
    return JSON.parse(row.npc_location);
  } catch {
    return null;
  }
}

/**
 * Get all NPCs at a specific system (across all tables)
 * @param {string} campaignId - Campaign ID
 * @param {string} sector - Sector name
 * @param {string} hex - 4-digit hex code
 * @returns {Array<{ id: string, name: string, table: string }>}
 */
function getNPCsAtSystem(campaignId, sector, hex) {
  const results = [];

  for (const [shortName, tableName] of Object.entries(TABLE_MAP)) {
    const rows = db.prepare(`
      SELECT id, name, npc_location
      FROM ${tableName}
      WHERE campaign_id = ? AND npc_location IS NOT NULL
    `).all(campaignId);

    for (const row of rows) {
      try {
        const location = JSON.parse(row.npc_location);
        if (location.sector === sector && location.hex === hex) {
          results.push({
            id: row.id,
            name: row.name,
            table: shortName
          });
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  return results;
}

/**
 * Move NPC to new location (with optional history tracking)
 * @param {string} npcId - NPC ID
 * @param {string} table - Table short name (dossiers, personae, contacts)
 * @param {Object} newLocation - New location object
 * @param {string} [gameDate] - In-game date for history
 * @param {string} [notes] - Notes for history entry
 * @returns {{ success: boolean, historyId?: number }}
 */
function moveNPC(npcId, table, newLocation, gameDate = null, notes = null) {
  validateTable(table);

  const tableName = TABLE_MAP[table];

  // Check if NPC is mobile
  const npc = db.prepare(`SELECT is_mobile, npc_location FROM ${tableName} WHERE id = ?`).get(npcId);
  const isMobile = npc && npc.is_mobile === 1;

  let historyId = null;

  // Record history for mobile NPCs only
  if (isMobile && npc.npc_location) {
    const stmt = db.prepare(`
      INSERT INTO npc_location_history (npc_id, npc_table, location_data, game_date, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(npcId, table, npc.npc_location, gameDate, notes);
    historyId = result.lastInsertRowid;
  }

  // Update current location
  setNPCLocation(npcId, table, newLocation);

  return {
    success: true,
    historyId
  };
}

/**
 * Get location history for an NPC
 * @param {string} npcId - NPC ID
 * @param {string} table - Table short name (dossiers, personae, contacts)
 * @returns {Array} History entries ordered by created_at DESC
 */
function getLocationHistory(npcId, table) {
  validateTable(table);

  const rows = db.prepare(`
    SELECT id, npc_id, npc_table, location_data, game_date, notes, created_at
    FROM npc_location_history
    WHERE npc_id = ? AND npc_table = ?
    ORDER BY id DESC
  `).all(npcId, table);

  return rows.map(row => ({
    id: row.id,
    npcId: row.npc_id,
    table: row.npc_table,
    location: JSON.parse(row.location_data),
    gameDate: row.game_date,
    notes: row.notes,
    createdAt: row.created_at
  }));
}

module.exports = {
  validateNPCLocation,
  setNPCLocation,
  getNPCLocation,
  getNPCsAtSystem,
  moveNPC,
  getLocationHistory
};
