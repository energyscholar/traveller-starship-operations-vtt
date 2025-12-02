/**
 * Handouts Module (Autorun 7)
 * Documents, images, maps for players
 */

const { db, generateId } = require('./database');

const HANDOUT_TYPES = {
  DOCUMENT: 'document',
  IMAGE: 'image',
  MAP: 'map',
  STATBLOCK: 'statblock'
};

const VISIBILITY = {
  HIDDEN: 'hidden',
  PARTIAL: 'partial',
  REVEALED: 'revealed'
};

function createHandout(campaignId, handoutData) {
  const {
    title,
    handoutType = 'document',
    contentText = null,
    fileUrl = null,
    tags = [],
    notes = null
  } = handoutData;

  const id = generateId();

  const stmt = db.prepare(`
    INSERT INTO handouts (id, campaign_id, title, handout_type, content_text, file_url, tags, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, campaignId, title, handoutType, contentText, fileUrl, JSON.stringify(tags), notes);
  return getHandout(id);
}

function parseHandoutFields(handout) {
  if (!handout) return null;
  handout.visible_to = JSON.parse(handout.visible_to || '[]');
  handout.tags = JSON.parse(handout.tags || '[]');
  return handout;
}

function getHandout(id) {
  const stmt = db.prepare('SELECT * FROM handouts WHERE id = ?');
  return parseHandoutFields(stmt.get(id));
}

function getHandoutsByCampaign(campaignId) {
  const stmt = db.prepare('SELECT * FROM handouts WHERE campaign_id = ? ORDER BY title ASC');
  return stmt.all(campaignId).map(parseHandoutFields);
}

function getVisibleHandoutsForPlayer(campaignId, playerId) {
  const stmt = db.prepare("SELECT * FROM handouts WHERE campaign_id = ? AND visibility != 'hidden' ORDER BY title ASC");
  return stmt.all(campaignId)
    .filter(h => {
      const visibleTo = JSON.parse(h.visible_to || '[]');
      if (h.visibility === 'revealed') return true;
      if (h.visibility === 'partial') return visibleTo.includes(playerId);
      return false;
    })
    .map(parseHandoutFields);
}

function updateHandout(id, updates) {
  const allowedFields = ['title', 'handout_type', 'content_text', 'file_url', 'tags', 'notes'];
  const setFields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(dbKey)) {
      setFields.push(`${dbKey} = ?`);
      values.push(Array.isArray(value) ? JSON.stringify(value) : value);
    }
  }

  if (setFields.length === 0) return getHandout(id);

  values.push(id);
  const stmt = db.prepare(`UPDATE handouts SET ${setFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
  stmt.run(...values);

  return getHandout(id);
}

function deleteHandout(id) {
  const stmt = db.prepare('DELETE FROM handouts WHERE id = ?');
  return stmt.run(id).changes > 0;
}

function shareHandout(id) {
  const stmt = db.prepare(`UPDATE handouts SET visibility = 'revealed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
  stmt.run(id);
  return getHandout(id);
}

function shareHandoutWithPlayer(id, playerId) {
  const handout = getHandout(id);
  if (!handout) return null;

  const visibleTo = handout.visible_to || [];
  if (!visibleTo.includes(playerId)) {
    visibleTo.push(playerId);
  }

  const stmt = db.prepare(`UPDATE handouts SET visibility = 'partial', visible_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
  stmt.run(JSON.stringify(visibleTo), id);

  return getHandout(id);
}

function hideHandout(id) {
  const stmt = db.prepare(`UPDATE handouts SET visibility = 'hidden', visible_to = '[]', updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
  stmt.run(id);
  return getHandout(id);
}

module.exports = {
  HANDOUT_TYPES,
  VISIBILITY,
  createHandout,
  getHandout,
  getHandoutsByCampaign,
  getVisibleHandoutsForPlayer,
  updateHandout,
  deleteHandout,
  shareHandout,
  shareHandoutWithPlayer,
  hideHandout
};
