/**
 * AR-140: Adventure Modules - Content Gating System
 *
 * Manages packaged adventure content with conditional access.
 * Content can be gated behind conditions (time, events, discoveries).
 */

const { db, generateId } = require('./database');

/**
 * Create a new adventure module record
 * @param {string} campaignId - Campaign ID
 * @param {Object} moduleData - Module metadata
 * @returns {Object} Created module
 */
function createModule(campaignId, moduleData) {
  const id = generateId();
  const stmt = db.prepare(`
    INSERT INTO adventure_modules (id, campaign_id, module_name, module_version, source_file, manifest)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    campaignId,
    moduleData.name,
    moduleData.version || '1.0',
    moduleData.sourceFile || null,
    JSON.stringify(moduleData.manifest || {})
  );

  return getModule(id);
}

/**
 * Get a module by ID
 */
function getModule(moduleId) {
  const stmt = db.prepare('SELECT * FROM adventure_modules WHERE id = ?');
  const row = stmt.get(moduleId);
  if (row && row.manifest) {
    row.manifest = JSON.parse(row.manifest);
  }
  return row;
}

/**
 * Get all modules for a campaign
 */
function getModulesByCampaign(campaignId) {
  const stmt = db.prepare('SELECT * FROM adventure_modules WHERE campaign_id = ? ORDER BY imported_at DESC');
  return stmt.all(campaignId).map(row => {
    if (row.manifest) row.manifest = JSON.parse(row.manifest);
    return row;
  });
}

/**
 * Toggle module active state
 */
function setModuleActive(moduleId, isActive) {
  const stmt = db.prepare('UPDATE adventure_modules SET is_active = ? WHERE id = ?');
  stmt.run(isActive ? 1 : 0, moduleId);
  return getModule(moduleId);
}

/**
 * Delete a module and all its content
 */
function deleteModule(moduleId) {
  // Get content IDs first
  const contentStmt = db.prepare('SELECT content_type, content_id FROM module_content WHERE module_id = ?');
  const contents = contentStmt.all(moduleId);

  // Delete the module (cascade will delete module_content)
  const deleteStmt = db.prepare('DELETE FROM adventure_modules WHERE id = ?');
  deleteStmt.run(moduleId);

  return { deleted: true, contentCount: contents.length };
}

/**
 * Track content as belonging to a module
 */
function trackModuleContent(moduleId, contentType, contentId, gateCondition = null) {
  const id = generateId();
  const stmt = db.prepare(`
    INSERT INTO module_content (id, module_id, content_type, content_id, is_gated, gate_condition)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    moduleId,
    contentType,
    contentId,
    gateCondition ? 1 : 0,
    gateCondition
  );

  return { id, moduleId, contentType, contentId };
}

/**
 * Get all content for a module
 */
function getModuleContent(moduleId) {
  const stmt = db.prepare('SELECT * FROM module_content WHERE module_id = ?');
  return stmt.all(moduleId);
}

/**
 * Check if content is accessible (not gated or gate condition met)
 * @param {string} contentId - Content ID to check
 * @param {Object} context - Current game context for evaluating conditions
 * @returns {boolean} True if content is accessible
 */
function isContentAccessible(contentId, context = {}) {
  const stmt = db.prepare(`
    SELECT mc.*, am.is_active
    FROM module_content mc
    JOIN adventure_modules am ON mc.module_id = am.id
    WHERE mc.content_id = ?
  `);
  const content = stmt.get(contentId);

  // Not from a module - always accessible
  if (!content) return true;

  // Module is disabled
  if (!content.is_active) return false;

  // Not gated - accessible
  if (!content.is_gated) return true;

  // Evaluate gate condition
  return evaluateGateCondition(content.gate_condition, context);
}

/**
 * Evaluate a gate condition against current context
 * Conditions are JSON objects with type and parameters
 */
function evaluateGateCondition(conditionJson, context) {
  if (!conditionJson) return true;

  try {
    const condition = JSON.parse(conditionJson);

    switch (condition.type) {
      case 'date_after':
        // Accessible after a certain in-game date
        return context.currentDate >= condition.date;

      case 'event_triggered':
        // Accessible after an event has been triggered
        return context.triggeredEvents?.includes(condition.eventId);

      case 'location_visited':
        // Accessible after visiting a location
        return context.visitedLocations?.includes(condition.locationId);

      case 'npc_met':
        // Accessible after meeting an NPC
        return context.metNPCs?.includes(condition.npcId);

      case 'manual':
        // GM manually unlocks
        return condition.unlocked === true;

      default:
        return true;
    }
  } catch {
    return true; // Invalid condition = accessible
  }
}

/**
 * Unlock gated content manually
 */
function unlockContent(contentId) {
  const stmt = db.prepare('UPDATE module_content SET is_gated = 0 WHERE content_id = ?');
  stmt.run(contentId);
}

/**
 * Import adventure as a module with content tracking
 * Wraps adventure-io.importAdventure with module tracking
 */
function importAdventureAsModule(campaignId, adventureData, moduleName) {
  const adventureIO = require('./adventure-io');

  // Create the module record
  const module = createModule(campaignId, {
    name: moduleName || adventureData.manifest?.campaignName || 'Imported Adventure',
    version: adventureData.manifest?.version || '1.0',
    manifest: adventureData.manifest
  });

  // Import the adventure content
  const result = adventureIO.importAdventure(campaignId, adventureData);

  // Track all imported content
  const idMap = result.idMap;
  const contentTypes = ['locations', 'handouts', 'npcs', 'reveals', 'events', 'emails'];

  for (const type of contentTypes) {
    const items = adventureData[type] || [];
    for (const item of items) {
      const newId = idMap[item.id];
      if (newId) {
        // Check if item has gating in source data
        const gateCondition = item.gateCondition || null;
        trackModuleContent(module.id, type, newId, gateCondition);
      }
    }
  }

  return {
    ...result,
    moduleId: module.id,
    moduleName: module.module_name
  };
}

/**
 * Get summary of module content by type
 */
function getModuleSummary(moduleId) {
  const module = getModule(moduleId);
  if (!module) return null;

  const stmt = db.prepare(`
    SELECT content_type, COUNT(*) as count, SUM(is_gated) as gated
    FROM module_content
    WHERE module_id = ?
    GROUP BY content_type
  `);
  const counts = stmt.all(moduleId);

  return {
    ...module,
    contentCounts: counts.reduce((acc, row) => {
      acc[row.content_type] = { total: row.count, gated: row.gated };
      return acc;
    }, {})
  };
}

module.exports = {
  createModule,
  getModule,
  getModulesByCampaign,
  setModuleActive,
  deleteModule,
  trackModuleContent,
  getModuleContent,
  isContentAccessible,
  evaluateGateCondition,
  unlockContent,
  importAdventureAsModule,
  getModuleSummary
};
