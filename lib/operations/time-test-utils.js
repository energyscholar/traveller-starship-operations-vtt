/**
 * Time System Test Utilities
 * Testing helpers for time advancement, backward time, and orphaned message cleanup.
 */

const fs = require('fs');
const path = require('path');

/**
 * Clean up orphaned messages from oracle drafts when time is rewound
 * @param {string} campaignId - Campaign identifier
 * @param {string} newDate - New campaign date after time change
 * @param {string} [draftsPath] - Path to oracle drafts file
 * @returns {Object} { removed: number, draftsPath: string }
 */
function cleanupOrphanedMessages(campaignId, newDate, draftsPath = null) {
  // Default path to oracle-drafts.json
  const defaultDraftsPath = '/home/bruce/software/mcp-servers/discord-poller/oracle-drafts.json';
  const actualPath = draftsPath || defaultDraftsPath;

  // Skip if drafts file doesn't exist
  if (!fs.existsSync(actualPath)) {
    return { removed: 0, draftsPath: actualPath };
  }

  try {
    const drafts = JSON.parse(fs.readFileSync(actualPath, 'utf8'));

    // Filter out messages with delivery dates after new date
    const before = drafts.pending ? drafts.pending.length : 0;

    if (drafts.pending) {
      drafts.pending = drafts.pending.filter(draft => {
        if (!draft.deliveryDate) return true; // Keep if no delivery date

        // Remove if delivery date is after new date
        return compareDates(draft.deliveryDate, newDate) <= 0;
      });
    }

    const after = drafts.pending ? drafts.pending.length : 0;
    const removed = before - after;

    // Write back if changes made
    if (removed > 0) {
      fs.writeFileSync(actualPath, JSON.stringify(drafts, null, 2));
      console.log(`[TIME TEST UTILS] Cleaned ${removed} orphaned messages from ${actualPath}`);
    }

    return { removed, draftsPath: actualPath };
  } catch (error) {
    console.error(`[TIME TEST UTILS] Failed to cleanup orphaned messages: ${error.message}`);
    return { removed: 0, draftsPath: actualPath, error: error.message };
  }
}

/**
 * Compare two Traveller dates
 * @param {string} date1 - First date (YYYY-DDD HH:MM)
 * @param {string} date2 - Second date (YYYY-DDD HH:MM)
 * @returns {number} Negative if date1 < date2, positive if date1 > date2, 0 if equal
 */
function compareDates(date1, date2) {
  const match1 = date1.match(/^(\d{4})-(\d{3})\s+(\d{2}):(\d{2})$/);
  const match2 = date2.match(/^(\d{4})-(\d{3})\s+(\d{2}):(\d{2})$/);

  if (!match1 || !match2) {
    throw new Error('Invalid Traveller date format for comparison');
  }

  const [, y1, d1, h1, m1] = match1.map(Number);
  const [, y2, d2, h2, m2] = match2.map(Number);

  if (y1 !== y2) return y1 - y2;
  if (d1 !== d2) return d1 - d2;
  if (h1 !== h2) return h1 - h2;
  return m1 - m2;
}

/**
 * Calculate minutes between two Traveller dates
 * @param {string} startDate - Start date (YYYY-DDD HH:MM)
 * @param {string} endDate - End date (YYYY-DDD HH:MM)
 * @returns {number} Minutes between dates (negative if startDate > endDate)
 */
function calculateMinutesBetween(startDate, endDate) {
  const match1 = startDate.match(/^(\d{4})-(\d{3})\s+(\d{2}):(\d{2})$/);
  const match2 = endDate.match(/^(\d{4})-(\d{3})\s+(\d{2}):(\d{2})$/);

  if (!match1 || !match2) {
    throw new Error('Invalid Traveller date format');
  }

  const [, y1, d1, h1, m1] = match1.map(Number);
  const [, y2, d2, h2, m2] = match2.map(Number);

  // Calculate total minutes from year start
  const minutes1 = (d1 - 1) * 24 * 60 + h1 * 60 + m1;
  const minutes2 = (d2 - 1) * 24 * 60 + h2 * 60 + m2;

  // Handle year difference (assume 365 days/year)
  const yearDiff = y2 - y1;
  const yearMinutes = yearDiff * 365 * 24 * 60;

  return (minutes2 - minutes1) + yearMinutes;
}

module.exports = {
  cleanupOrphanedMessages,
  compareDates,
  calculateMinutesBetween
};
