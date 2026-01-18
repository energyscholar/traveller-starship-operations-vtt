/**
 * AR-XX: Chat Storage Module
 * In-memory chat storage with campaign isolation
 */

const { generateId } = require('./database');

// In-memory storage: campaignId -> messages[]
const chatHistory = new Map();

const MAX_MESSAGES_PER_CAMPAIGN = 100;

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} campaignId
 * @property {number} timestamp
 * @property {string} senderId
 * @property {string} senderName
 * @property {string} senderRole
 * @property {string} message
 * @property {'broadcast'|'whisper'} type
 * @property {string|null} recipientId
 * @property {string|null} recipientName
 * @property {boolean} isAI
 */

/**
 * Add a message to chat history
 * @param {string} campaignId
 * @param {Partial<ChatMessage>} messageData
 * @returns {ChatMessage}
 */
function addMessage(campaignId, messageData) {
  if (!chatHistory.has(campaignId)) {
    chatHistory.set(campaignId, []);
  }

  const messages = chatHistory.get(campaignId);

  const message = {
    id: generateId(),
    campaignId,
    timestamp: Date.now(),
    senderId: messageData.senderId || 'unknown',
    senderName: messageData.senderName || 'Unknown',
    senderRole: messageData.senderRole || 'player',
    message: messageData.message || '',
    type: messageData.type || 'broadcast',
    recipientId: messageData.recipientId || null,
    recipientName: messageData.recipientName || null,
    isAI: messageData.isAI || false
  };

  messages.push(message);

  // Trim to max size
  while (messages.length > MAX_MESSAGES_PER_CAMPAIGN) {
    messages.shift();
  }

  return message;
}

/**
 * Get chat history for a campaign
 * @param {string} campaignId
 * @param {number} [limit=50]
 * @returns {ChatMessage[]}
 */
function getHistory(campaignId, limit = 50) {
  const messages = chatHistory.get(campaignId) || [];
  return messages.slice(-limit);
}

/**
 * Get recent messages for AGM context
 * @param {string} campaignId
 * @param {number} [count=10]
 * @returns {string} Formatted chat context
 */
function getRecentContext(campaignId, count = 10) {
  const messages = getHistory(campaignId, count);
  if (messages.length === 0) return '';

  return messages.map(m => {
    const prefix = m.type === 'whisper' ? `[whisper to ${m.recipientName}]` : '';
    return `${m.senderName} (${m.senderRole})${prefix}: ${m.message}`;
  }).join('\n');
}

/**
 * Post a message as an NPC (GM only)
 * @param {string} campaignId
 * @param {string} npcName
 * @param {string} message
 * @returns {ChatMessage}
 */
function postAsNPC(campaignId, npcName, message) {
  return addMessage(campaignId, {
    senderId: 'npc',
    senderName: npcName,
    senderRole: 'npc',
    message,
    type: 'broadcast',
    isAI: false
  });
}

/**
 * Post a message as the GM
 * @param {string} campaignId
 * @param {string} message
 * @returns {ChatMessage}
 */
function postAsGM(campaignId, message) {
  return addMessage(campaignId, {
    senderId: 'gm',
    senderName: 'GM',
    senderRole: 'gm',
    message,
    type: 'broadcast',
    isAI: false
  });
}

/**
 * Clear chat history for a campaign
 * @param {string} campaignId
 */
function clearHistory(campaignId) {
  chatHistory.delete(campaignId);
}

module.exports = {
  addMessage,
  getHistory,
  getRecentContext,
  postAsNPC,
  postAsGM,
  clearHistory
};
