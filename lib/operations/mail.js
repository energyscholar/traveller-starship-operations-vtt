/**
 * Operations Mail System (Autorun 6, enhanced Autorun 7)
 * Handles in-game mail messages between NPCs and players
 * Autorun 7: Added draft/queue workflow for GM prep
 */

const { db, generateId } = require('./database');

// Mail status (Autorun 7)
const MAIL_STATUS = {
  DRAFT: 'draft',
  QUEUED: 'queued',
  SENT: 'sent',
  FAILED: 'failed'
};

// Mail priority levels
const MAIL_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Sender types
const SENDER_TYPES = {
  NPC: 'npc',
  SYSTEM: 'system',
  PLAYER: 'player'
};

// Recipient types
const RECIPIENT_TYPES = {
  PLAYER: 'player',    // Specific player account
  ROLE: 'role',        // To whoever holds a role
  SHIP: 'ship',        // To all crew on a ship
  ALL: 'all'           // Broadcast to entire campaign
};

/**
 * Send a new mail message
 * @param {string} campaignId - Campaign ID
 * @param {Object} mailData - Mail data
 * @returns {Object} Created mail
 */
function sendMail(campaignId, mailData) {
  const {
    senderName,
    senderType = 'npc',
    recipientId = null,
    recipientType = 'player',
    subject,
    body,
    sentDate,
    deliveryDate = null,
    priority = 'normal'
  } = mailData;

  const id = generateId();

  const stmt = db.prepare(`
    INSERT INTO mail (id, campaign_id, sender_name, sender_type, recipient_id, recipient_type, subject, body, sent_date, delivery_date, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, campaignId, senderName, senderType, recipientId, recipientType, subject, body, sentDate, deliveryDate, priority);

  return getMail(id);
}

/**
 * Get a mail message by ID
 * @param {string} id - Mail ID
 * @returns {Object|null} Mail or null
 */
function getMail(id) {
  const stmt = db.prepare('SELECT * FROM mail WHERE id = ?');
  return stmt.get(id) || null;
}

/**
 * Get all mail for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Mail messages
 */
function getMailByCampaign(campaignId) {
  const stmt = db.prepare('SELECT * FROM mail WHERE campaign_id = ? ORDER BY sent_date DESC');
  return stmt.all(campaignId);
}

/**
 * Get mail for a specific player
 * @param {string} campaignId - Campaign ID
 * @param {string} playerId - Player account ID
 * @param {string} currentDate - Current game date for delivery check
 * @returns {Array} Mail messages visible to player
 */
function getMailForPlayer(campaignId, playerId, currentDate) {
  // Get mail addressed to this player, their role, or broadcast
  const stmt = db.prepare(`
    SELECT * FROM mail
    WHERE campaign_id = ?
    AND (recipient_id = ? OR recipient_type IN ('ship', 'all'))
    AND (delivery_date IS NULL OR delivery_date <= ?)
    ORDER BY sent_date DESC
  `);
  return stmt.all(campaignId, playerId, currentDate);
}

/**
 * Get unread mail count for a player
 * @param {string} campaignId - Campaign ID
 * @param {string} playerId - Player account ID
 * @param {string} currentDate - Current game date
 * @returns {number} Unread count
 */
function getUnreadMailCount(campaignId, playerId, currentDate) {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM mail
    WHERE campaign_id = ?
    AND (recipient_id = ? OR recipient_type IN ('ship', 'all'))
    AND (delivery_date IS NULL OR delivery_date <= ?)
    AND is_read = 0
  `);
  const result = stmt.get(campaignId, playerId, currentDate);
  return result?.count || 0;
}

/**
 * Mark mail as read
 * @param {string} id - Mail ID
 * @returns {Object} Updated mail
 */
function markMailRead(id) {
  const stmt = db.prepare('UPDATE mail SET is_read = 1 WHERE id = ?');
  stmt.run(id);
  return getMail(id);
}

/**
 * Archive mail
 * @param {string} id - Mail ID
 * @returns {Object} Updated mail
 */
function archiveMail(id) {
  const stmt = db.prepare('UPDATE mail SET is_archived = 1 WHERE id = ?');
  stmt.run(id);
  return getMail(id);
}

/**
 * Delete mail
 * @param {string} id - Mail ID
 * @returns {boolean} Success
 */
function deleteMail(id) {
  const stmt = db.prepare('DELETE FROM mail WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Calculate mail delivery date based on distance
 * Travel time: 2 weeks per parsec (heroic fast mail)
 * @param {string} sentDate - Game date mail was sent (YYYY-DDD format)
 * @param {number} parsecs - Distance in parsecs
 * @returns {string} Delivery date in YYYY-DDD format
 */
function calculateDeliveryDate(sentDate, parsecs) {
  // Parse year and day
  const [year, day] = sentDate.split('-').map(Number);

  // 2 weeks per parsec = 14 days per parsec
  const travelDays = parsecs * 14;

  let newDay = day + travelDays;
  let newYear = year;

  // Handle year rollover (365 days per year in Traveller)
  while (newDay > 365) {
    newDay -= 365;
    newYear++;
  }

  return `${newYear}-${String(newDay).padStart(3, '0')}`;
}

// ============ Autorun 7: Draft/Queue Functions ============

/**
 * Save a draft email (not sent yet)
 * @param {string} campaignId - Campaign ID
 * @param {Object} mailData - Mail data
 * @returns {Object} Created draft
 */
function saveDraft(campaignId, mailData) {
  const {
    senderName,
    senderType = 'npc',
    recipientId = null,
    recipientType = 'player',
    subject,
    body,
    priority = 'normal',
    queuedForDate = null,
    triggerEventId = null
  } = mailData;

  const id = generateId();

  const stmt = db.prepare(`
    INSERT INTO mail (id, campaign_id, sender_name, sender_type, recipient_id, recipient_type, subject, body, priority, status, queued_for_date, trigger_event_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
  `);

  stmt.run(id, campaignId, senderName, senderType, recipientId, recipientType, subject, body, priority, queuedForDate, triggerEventId);
  return getMail(id);
}

/**
 * Get all draft emails for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Draft emails
 */
function getDrafts(campaignId) {
  const stmt = db.prepare("SELECT * FROM mail WHERE campaign_id = ? AND status = 'draft' ORDER BY created_at DESC");
  return stmt.all(campaignId);
}

/**
 * Queue an email for future delivery
 * @param {string} id - Mail ID
 * @param {string} queuedForDate - Game date to deliver
 * @returns {Object} Updated mail
 */
function queueEmail(id, queuedForDate) {
  const stmt = db.prepare(`UPDATE mail SET status = 'queued', queued_for_date = ? WHERE id = ?`);
  stmt.run(queuedForDate, id);
  return getMail(id);
}

/**
 * Get queued emails for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Queued emails
 */
function getQueuedEmails(campaignId) {
  const stmt = db.prepare("SELECT * FROM mail WHERE campaign_id = ? AND status = 'queued' ORDER BY queued_for_date ASC");
  return stmt.all(campaignId);
}

/**
 * Send a queued/draft email immediately
 * @param {string} id - Mail ID
 * @param {string} sentDate - Game date for sent_date
 * @param {string} deliveryDate - Game date for delivery (optional)
 * @returns {Object} Updated mail
 */
function sendQueuedEmail(id, sentDate, deliveryDate = null) {
  const stmt = db.prepare(`UPDATE mail SET status = 'sent', sent_date = ?, delivery_date = ? WHERE id = ?`);
  stmt.run(sentDate, deliveryDate, id);
  return getMail(id);
}

/**
 * Check email queue for emails ready to send
 * @param {string} campaignId - Campaign ID
 * @param {string} currentDate - Current game date
 * @returns {Array} Emails that should be sent now
 */
function checkEmailQueue(campaignId, currentDate) {
  const stmt = db.prepare("SELECT * FROM mail WHERE campaign_id = ? AND status = 'queued' AND queued_for_date <= ?");
  return stmt.all(campaignId, currentDate);
}

/**
 * Get emails triggered by a specific event
 * @param {string} eventId - Event ID
 * @returns {Array} Emails to send when event triggers
 */
function getEmailsForEvent(eventId) {
  const stmt = db.prepare("SELECT * FROM mail WHERE trigger_event_id = ? AND status IN ('draft', 'queued')");
  return stmt.all(eventId);
}

/**
 * Update a draft email
 * @param {string} id - Mail ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated mail
 */
function updateDraft(id, updates) {
  const allowedFields = ['sender_name', 'sender_type', 'recipient_id', 'recipient_type', 'subject', 'body', 'priority', 'queued_for_date', 'trigger_event_id'];
  const setFields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(dbKey)) {
      setFields.push(`${dbKey} = ?`);
      values.push(value);
    }
  }

  if (setFields.length === 0) return getMail(id);

  values.push(id);
  const stmt = db.prepare(`UPDATE mail SET ${setFields.join(', ')} WHERE id = ? AND status = 'draft'`);
  stmt.run(...values);

  return getMail(id);
}

module.exports = {
  // Constants
  MAIL_STATUS,
  MAIL_PRIORITY,
  SENDER_TYPES,
  RECIPIENT_TYPES,

  // Original functions
  sendMail,
  getMail,
  getMailByCampaign,
  getMailForPlayer,
  getUnreadMailCount,
  markMailRead,
  archiveMail,
  deleteMail,
  calculateDeliveryDate,

  // Autorun 7: Draft/Queue functions
  saveDraft,
  getDrafts,
  queueEmail,
  getQueuedEmails,
  sendQueuedEmail,
  checkEmailQueue,
  getEmailsForEvent,
  updateDraft
};
