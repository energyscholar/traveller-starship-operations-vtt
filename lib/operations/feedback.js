/**
 * Player Feedback System (Autorun 6)
 * Handles bug reports and feature requests from players
 */

const { db } = require('./database');

// Feedback types
const FEEDBACK_TYPES = {
  BUG: 'bug',
  FEATURE: 'feature',
  QUESTION: 'question',
  OTHER: 'other'
};

// Feedback priority levels
const FEEDBACK_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Feedback status
const FEEDBACK_STATUS = {
  NEW: 'new',
  ACKNOWLEDGED: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  WONT_FIX: 'wont_fix'
};

/**
 * Submit player feedback
 * @param {Object} feedbackData - Feedback data
 * @returns {Object} Created feedback
 */
function submitFeedback(feedbackData) {
  const {
    campaignId = null,
    playerName = 'Anonymous',
    feedbackType,
    title,
    description = null,
    priority = 'normal'
  } = feedbackData;

  const stmt = db.prepare(`
    INSERT INTO player_feedback (campaign_id, player_name, feedback_type, title, description, priority)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(campaignId, playerName, feedbackType, title, description, priority);

  return getFeedback(result.lastInsertRowid);
}

/**
 * Get feedback by ID
 * @param {number} id - Feedback ID
 * @returns {Object|null} Feedback or null
 */
function getFeedback(id) {
  const stmt = db.prepare('SELECT * FROM player_feedback WHERE id = ?');
  return stmt.get(id) || null;
}

/**
 * Get all feedback (for admin view)
 * @param {Object} filters - Optional filters
 * @returns {Array} Feedback items
 */
function getAllFeedback(filters = {}) {
  let query = 'SELECT * FROM player_feedback WHERE 1=1';
  const params = [];

  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.feedbackType) {
    query += ' AND feedback_type = ?';
    params.push(filters.feedbackType);
  }

  if (filters.priority) {
    query += ' AND priority = ?';
    params.push(filters.priority);
  }

  query += ' ORDER BY created_at DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Get feedback for a specific campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Feedback items
 */
function getFeedbackByCampaign(campaignId) {
  const stmt = db.prepare('SELECT * FROM player_feedback WHERE campaign_id = ? ORDER BY created_at DESC');
  return stmt.all(campaignId);
}

/**
 * Get feedback statistics
 * @returns {Object} Stats
 */
function getFeedbackStats() {
  const stats = {
    total: 0,
    byType: {},
    byStatus: {},
    byPriority: {}
  };

  // Total count
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM player_feedback');
  stats.total = totalStmt.get().count;

  // By type
  const byTypeStmt = db.prepare('SELECT feedback_type, COUNT(*) as count FROM player_feedback GROUP BY feedback_type');
  for (const row of byTypeStmt.all()) {
    stats.byType[row.feedback_type] = row.count;
  }

  // By status
  const byStatusStmt = db.prepare('SELECT status, COUNT(*) as count FROM player_feedback GROUP BY status');
  for (const row of byStatusStmt.all()) {
    stats.byStatus[row.status] = row.count;
  }

  // By priority
  const byPriorityStmt = db.prepare('SELECT priority, COUNT(*) as count FROM player_feedback GROUP BY priority');
  for (const row of byPriorityStmt.all()) {
    stats.byPriority[row.priority] = row.count;
  }

  return stats;
}

/**
 * Update feedback status
 * @param {number} id - Feedback ID
 * @param {string} status - New status
 * @returns {Object} Updated feedback
 */
function updateFeedbackStatus(id, status) {
  const stmt = db.prepare('UPDATE player_feedback SET status = ? WHERE id = ?');
  stmt.run(status, id);
  return getFeedback(id);
}

/**
 * Delete feedback
 * @param {number} id - Feedback ID
 * @returns {boolean} Success
 */
function deleteFeedback(id) {
  const stmt = db.prepare('DELETE FROM player_feedback WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

module.exports = {
  // Constants
  FEEDBACK_TYPES,
  FEEDBACK_PRIORITY,
  FEEDBACK_STATUS,

  // Functions
  submitFeedback,
  getFeedback,
  getAllFeedback,
  getFeedbackByCampaign,
  getFeedbackStats,
  updateFeedbackStatus,
  deleteFeedback
};
