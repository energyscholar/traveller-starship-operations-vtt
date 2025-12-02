/**
 * Events Module (Autorun 7)
 * GM prep events with triggers and cascading effects
 */

const { db, generateId } = require('./database');

// Event types
const EVENT_TYPES = {
  MANUAL: 'manual',
  TIMED: 'timed',
  TRIGGERED: 'triggered'
};

// Event status
const EVENT_STATUS = {
  PENDING: 'pending',
  TRIGGERED: 'triggered',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled'
};

/**
 * Create a new event
 */
function createEvent(campaignId, eventData) {
  const {
    name,
    eventType = 'manual',
    triggerDate = null,
    triggerCondition = null,
    triggerEventId = null,
    description = null,
    playerText = null,
    revealsToTrigger = [],
    emailsToSend = [],
    npcsToReveal = [],
    tags = [],
    notes = null
  } = eventData;

  const id = generateId();

  const stmt = db.prepare(`
    INSERT INTO events (
      id, campaign_id, name, event_type, trigger_date, trigger_condition,
      trigger_event_id, description, player_text,
      reveals_to_trigger, emails_to_send, npcs_to_reveal, tags, notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, campaignId, name, eventType, triggerDate, triggerCondition,
    triggerEventId, description, playerText,
    JSON.stringify(revealsToTrigger), JSON.stringify(emailsToSend),
    JSON.stringify(npcsToReveal), JSON.stringify(tags), notes
  );

  return getEvent(id);
}

function parseEventFields(event) {
  if (!event) return null;
  event.reveals_to_trigger = JSON.parse(event.reveals_to_trigger || '[]');
  event.emails_to_send = JSON.parse(event.emails_to_send || '[]');
  event.npcs_to_reveal = JSON.parse(event.npcs_to_reveal || '[]');
  event.tags = JSON.parse(event.tags || '[]');
  return event;
}

function getEvent(id) {
  const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
  return parseEventFields(stmt.get(id));
}

function getEventsByCampaign(campaignId) {
  const stmt = db.prepare('SELECT * FROM events WHERE campaign_id = ? ORDER BY name ASC');
  return stmt.all(campaignId).map(parseEventFields);
}

function getPendingEvents(campaignId) {
  const stmt = db.prepare("SELECT * FROM events WHERE campaign_id = ? AND status = 'pending' ORDER BY trigger_date ASC");
  return stmt.all(campaignId).map(parseEventFields);
}

function getTimedEvents(campaignId, currentDate) {
  const stmt = db.prepare("SELECT * FROM events WHERE campaign_id = ? AND event_type = 'timed' AND status = 'pending' AND trigger_date <= ?");
  return stmt.all(campaignId, currentDate).map(parseEventFields);
}

function updateEvent(id, updates) {
  const allowedFields = [
    'name', 'event_type', 'trigger_date', 'trigger_condition',
    'trigger_event_id', 'description', 'player_text',
    'reveals_to_trigger', 'emails_to_send', 'npcs_to_reveal',
    'status', 'tags', 'notes'
  ];
  const setFields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(dbKey)) {
      setFields.push(`${dbKey} = ?`);
      values.push(Array.isArray(value) ? JSON.stringify(value) : value);
    }
  }

  if (setFields.length === 0) return getEvent(id);

  values.push(id);
  const stmt = db.prepare(`UPDATE events SET ${setFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
  stmt.run(...values);

  return getEvent(id);
}

function deleteEvent(id) {
  const stmt = db.prepare('DELETE FROM events WHERE id = ?');
  return stmt.run(id).changes > 0;
}

function triggerEvent(id, gameDate = null) {
  const stmt = db.prepare(`
    UPDATE events SET status = 'triggered', triggered_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `);
  stmt.run(gameDate || new Date().toISOString(), id);
  return getEvent(id);
}

function resolveEvent(id) {
  const stmt = db.prepare(`UPDATE events SET status = 'resolved', updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
  stmt.run(id);
  return getEvent(id);
}

function cancelEvent(id) {
  const stmt = db.prepare(`UPDATE events SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
  stmt.run(id);
  return getEvent(id);
}

module.exports = {
  EVENT_TYPES,
  EVENT_STATUS,
  createEvent,
  getEvent,
  getEventsByCampaign,
  getPendingEvents,
  getTimedEvents,
  updateEvent,
  deleteEvent,
  triggerEvent,
  resolveEvent,
  cancelEvent
};
