/**
 * Prep System Socket Handlers (Autorun 7)
 * Handles socket events for adventure prep operations
 */

const ops = require('../operations');

/**
 * Register prep-related socket handlers
 * @param {Socket} socket - Socket.io socket instance
 * @param {Object} io - Socket.io server instance
 */
function registerPrepHandlers(socket, io) {

  // ============ Reveals ============

  socket.on('prep:createReveal', (data, callback) => {
    try {
      const reveal = ops.createReveal(data.campaignId, data);
      callback?.({ success: true, reveal });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:updateReveal', (data, callback) => {
    try {
      const reveal = ops.updateReveal(data.id, data.updates);
      callback?.({ success: true, reveal });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:deleteReveal', (id, callback) => {
    try {
      const success = ops.deleteReveal(id);
      callback?.({ success });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:revealToAll', ({ id, gameDate }, callback) => {
    try {
      const reveal = ops.revealToAll(id, gameDate);
      // Broadcast to all clients in campaign
      socket.broadcast.emit('revealDeployed', reveal);
      callback?.({ success: true, reveal });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:revealToPlayer', ({ id, playerId }, callback) => {
    try {
      const reveal = ops.revealToPlayer(id, playerId);
      callback?.({ success: true, reveal });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  // ============ NPCs ============

  socket.on('prep:createNPC', (data, callback) => {
    try {
      const npc = ops.createNPCDossier(data.campaignId, data);
      callback?.({ success: true, npc });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:updateNPC', (data, callback) => {
    try {
      const npc = ops.updateNPCDossier(data.id, data.updates);
      callback?.({ success: true, npc });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:deleteNPC', (id, callback) => {
    try {
      const success = ops.deleteNPCDossier(id);
      callback?.({ success });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:revealNPC', (id, callback) => {
    try {
      const npc = ops.revealNPC(id);
      socket.broadcast.emit('npcRevealed', npc);
      callback?.({ success: true, npc });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  // ============ Locations ============

  socket.on('prep:createLocation', (data, callback) => {
    try {
      const location = ops.createLocation(data.campaignId, data);
      callback?.({ success: true, location });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:updateLocation', (data, callback) => {
    try {
      const location = ops.updateLocation(data.id, data.updates);
      callback?.({ success: true, location });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:deleteLocation', (id, callback) => {
    try {
      const success = ops.deleteLocation(id);
      callback?.({ success });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:revealLocation', (id, callback) => {
    try {
      const location = ops.revealLocation(id);
      socket.broadcast.emit('locationRevealed', location);
      callback?.({ success: true, location });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  // ============ Events ============

  socket.on('prep:createEvent', (data, callback) => {
    try {
      const event = ops.createEvent(data.campaignId, data);
      callback?.({ success: true, event });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:triggerEvent', (id, callback) => {
    try {
      const event = ops.triggerEvent(id);
      socket.broadcast.emit('eventTriggered', event);
      callback?.({ success: true, event });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  // ============ Handouts ============

  socket.on('prep:createHandout', (data, callback) => {
    try {
      const handout = ops.createHandout(data.campaignId, data);
      callback?.({ success: true, handout });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:shareHandout', ({ id, playerId }, callback) => {
    try {
      const handout = playerId
        ? ops.shareHandoutWithPlayer(id, playerId)
        : ops.shareHandout(id);
      socket.broadcast.emit('handoutShared', handout);
      callback?.({ success: true, handout });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  // ============ Email Queue ============

  socket.on('prep:saveDraft', (data, callback) => {
    try {
      const draft = ops.saveDraft(data.campaignId, data);
      callback?.({ success: true, draft });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:queueEmail', ({ id, queuedForDate }, callback) => {
    try {
      const mail = ops.queueEmail(id, queuedForDate);
      callback?.({ success: true, mail });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:sendNow', ({ id, sentDate, deliveryDate }, callback) => {
    try {
      const mail = ops.sendQueuedEmail(id, sentDate, deliveryDate);
      socket.broadcast.emit('newMail', mail);
      callback?.({ success: true, mail });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  // ============ Adventure Import/Export ============

  socket.on('prep:exportAdventure', (campaignId, callback) => {
    try {
      const adventureIO = require('../operations/adventure-io');
      const adventure = adventureIO.exportAdventure(campaignId);
      callback?.({ success: true, adventure });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  socket.on('prep:importAdventure', ({ campaignId, adventureData }, callback) => {
    try {
      const adventureIO = require('../operations/adventure-io');
      const result = adventureIO.importAdventure(campaignId, adventureData);
      callback?.({ success: true, result });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });
}

module.exports = { registerPrepHandlers };
