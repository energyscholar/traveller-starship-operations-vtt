/**
 * Ship Management Handlers
 * Handles: getShipTemplates, addShipFromTemplate, addShip, deleteShip,
 *          getFullTemplate, updateShip, addCustomShip
 */

/**
 * Register ship handlers
 * @param {Object} ctx - Shared context from context.js
 */
function register(ctx) {
  const { socket, io, opsSession, operations, socketLog, sanitizeError } = ctx;

  // Get available ship templates
  socket.on('ops:getShipTemplates', () => {
    try {
      const templates = operations.getShipTemplates();
      socket.emit('ops:shipTemplates', { templates });
      socketLog.info(`[OPS] Ship templates requested: ${templates.length} available`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Ship', error));
      socketLog.error('[OPS] Error getting ship templates:', error);
    }
  });

  // Add ship from template
  socket.on('ops:addShipFromTemplate', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can add ships' });
        return;
      }
      const { templateId, name, isPartyShip } = data;
      const ship = operations.createShipFromTemplate(
        opsSession.campaignId,
        templateId,
        name,
        isPartyShip !== false
      );
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:shipAdded', { ship });
      socketLog.info(`[OPS] Ship added from template: ${ship.id} "${name}" (${templateId})`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Ship', error));
      socketLog.error('[OPS] Error adding ship from template:', error);
    }
  });

  // Add ship to campaign (raw data - legacy)
  socket.on('ops:addShip', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can add ships' });
        return;
      }
      const { name, shipData, isPartyShip } = data;
      const ship = operations.addShip(opsSession.campaignId, name, shipData, {
        isPartyShip: isPartyShip !== false,
        visibleToPlayers: true
      });
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:shipAdded', { ship });
      socketLog.info(`[OPS] Ship added: ${ship.id} "${name}"`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Ship', error));
      socketLog.error('[OPS] Error adding ship:', error);
    }
  });

  // Delete ship
  socket.on('ops:deleteShip', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can delete ships' });
        return;
      }
      const { shipId } = data;
      operations.deleteShip(shipId);
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:shipDeleted', { shipId });
      socketLog.info(`[OPS] Ship deleted: ${shipId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Ship', error));
      socketLog.error('[OPS] Error deleting ship:', error);
    }
  });

  // Get full template data for editor
  socket.on('ops:getFullTemplate', (data) => {
    try {
      const { templateId } = data;
      const template = operations.getShipTemplate(templateId);
      if (template) {
        socket.emit('ops:fullTemplate', { template });
        socketLog.info(`[OPS] Full template requested: ${templateId}`);
      } else {
        socket.emit('ops:error', { message: `Template not found: ${templateId}` });
      }
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Ship', error));
      socketLog.error('[OPS] Error getting full template:', error);
    }
  });

  // Update existing ship
  socket.on('ops:updateShip', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can edit ships' });
        return;
      }
      const { shipId, name, shipData } = data;

      operations.updateShip(shipId, {
        name,
        ship_data: JSON.stringify(shipData)
      });

      const ship = operations.getShip(shipId);
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:shipUpdated', { ship });
      socketLog.info(`[OPS] Ship updated: ${shipId} "${name}"`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Ship', error));
      socketLog.error('[OPS] Error updating ship:', error);
    }
  });

  // Add custom ship (not from template)
  socket.on('ops:addCustomShip', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can add ships' });
        return;
      }
      const { name, templateId, shipData, isPartyShip } = data;

      const ship = operations.addShip(opsSession.campaignId, name, shipData, {
        templateId: templateId || 'custom',
        isPartyShip: isPartyShip !== false,
        visibleToPlayers: true
      });

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:shipAdded', { ship });
      socketLog.info(`[OPS] Custom ship added: ${ship.id} "${name}"`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Ship', error));
      socketLog.error('[OPS] Error adding custom ship:', error);
    }
  });

  // Get ship weapons
  // TODO: Duplicate handler — combat.js:247 also registers ops:getShipWeapons.
  // This one returns ship_data.weapons (JSON blob); combat.js returns SQL ship_weapons rows.
  // Both fire on same event (Socket.io calls all listeners). Deduplicate when data shape is clarified. (audit 2026-02-11)
  socket.on('ops:getShipWeapons', (data) => {
    try {
      const { shipId } = data || {};
      const targetShipId = shipId || opsSession.shipId;
      if (!targetShipId) {
        socket.emit('ops:error', { message: 'No ship specified' });
        return;
      }
      const ship = operations.getShip(targetShipId);
      if (!ship) {
        socket.emit('ops:error', { message: 'Ship not found' });
        return;
      }
      const weapons = ship.ship_data?.weapons || [];
      socket.emit('ops:shipWeapons', { shipId: targetShipId, weapons });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Ship', error));
      socketLog.error('[OPS] Error getting ship weapons:', error);
    }
  });

  // Get ship systems status (damage/crits)
  socket.on('ops:getShipSystems', (data) => {
    try {
      const { shipId } = data || {};
      const targetShipId = shipId || opsSession.shipId;
      if (!targetShipId) {
        socket.emit('ops:error', { message: 'No ship specified' });
        return;
      }
      const ship = operations.getShip(targetShipId);
      if (!ship) {
        socket.emit('ops:error', { message: 'Ship not found' });
        return;
      }
      const systems = operations.getSystemStatuses(ship);
      socket.emit('ops:shipSystems', { shipId: targetShipId, systems });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Ship', error));
      socketLog.error('[OPS] Error getting ship systems:', error);
    }
  });
}

module.exports = { register };
