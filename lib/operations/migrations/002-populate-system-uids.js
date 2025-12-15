/**
 * Migration 002: Populate System UIDs
 *
 * AR-115: Database UID Normalization (Phase 2)
 *
 * Populates system_uid columns based on existing system name/location data.
 * Uses star-system-loader to resolve names to IDs.
 */

const starSystemLoader = require('../star-system-loader');

/**
 * Apply migration
 * @param {Database} db - better-sqlite3 database instance
 */
function up(db) {
  console.log('[Migration 002] Populating system UIDs...');

  // Build name -> id lookup from star system index
  const index = starSystemLoader.getSystemIndex();
  const nameToId = new Map();
  for (const sys of index.systems) {
    nameToId.set(sys.name.toLowerCase(), sys.id);
  }

  // Update campaigns table
  const campaigns = db.prepare(`
    SELECT id, current_system FROM campaigns
    WHERE current_system IS NOT NULL AND system_uid IS NULL
  `).all();

  const updateCampaign = db.prepare(`
    UPDATE campaigns SET system_uid = ? WHERE id = ?
  `);

  let campaignUpdates = 0;
  for (const campaign of campaigns) {
    const systemId = nameToId.get(campaign.current_system.toLowerCase());
    if (systemId) {
      updateCampaign.run(systemId, campaign.id);
      campaignUpdates++;
    } else {
      console.log(`[Migration 002] Warning: Unknown system "${campaign.current_system}" in campaign ${campaign.id}`);
    }
  }
  console.log(`[Migration 002] Updated ${campaignUpdates} campaigns`);

  // Update locations table (if it has system_name column)
  try {
    const locations = db.prepare(`
      SELECT id, system_name FROM locations
      WHERE system_name IS NOT NULL AND system_uid IS NULL
    `).all();

    const updateLocation = db.prepare(`
      UPDATE locations SET system_uid = ? WHERE id = ?
    `);

    let locationUpdates = 0;
    for (const loc of locations) {
      const systemId = nameToId.get(loc.system_name.toLowerCase());
      if (systemId) {
        updateLocation.run(systemId, loc.id);
        locationUpdates++;
      }
    }
    console.log(`[Migration 002] Updated ${locationUpdates} locations`);
  } catch (err) {
    // locations table might not have system_name column
    console.log(`[Migration 002] Skipping locations: ${err.message}`);
  }

  // Update contacts table (if it has last_location that matches a system)
  try {
    const contacts = db.prepare(`
      SELECT id, last_location FROM contacts
      WHERE last_location IS NOT NULL AND system_uid IS NULL
    `).all();

    const updateContact = db.prepare(`
      UPDATE contacts SET system_uid = ? WHERE id = ?
    `);

    let contactUpdates = 0;
    for (const contact of contacts) {
      // last_location might be system name or other location type
      const systemId = nameToId.get(contact.last_location.toLowerCase());
      if (systemId) {
        updateContact.run(systemId, contact.id);
        contactUpdates++;
      }
    }
    console.log(`[Migration 002] Updated ${contactUpdates} contacts`);
  } catch (err) {
    console.log(`[Migration 002] Skipping contacts: ${err.message}`);
  }

  console.log('[Migration 002] Complete');
}

/**
 * Rollback migration
 * @param {Database} db - better-sqlite3 database instance
 */
function down(db) {
  console.log('[Migration 002] Rolling back UID population...');

  // Clear all system_uid values
  db.exec(`UPDATE campaigns SET system_uid = NULL`);
  db.exec(`UPDATE locations SET system_uid = NULL`);
  db.exec(`UPDATE contacts SET system_uid = NULL`);

  console.log('[Migration 002] Rollback complete');
}

/**
 * Check if migration has been applied
 * @param {Database} db - better-sqlite3 database instance
 * @returns {boolean}
 */
function isApplied(db) {
  try {
    // Check if any campaigns have system_uid populated
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM campaigns
      WHERE system_uid IS NOT NULL
    `).get();
    return result.count > 0;
  } catch {
    return false;
  }
}

module.exports = {
  id: '002-populate-system-uids',
  description: 'Populate system_uid columns from existing name data',
  up,
  down,
  isApplied
};
