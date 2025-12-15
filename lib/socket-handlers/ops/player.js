/**
 * Player Account Handlers
 * Handles: createPlayerSlot, deletePlayerSlot, joinCampaignAsPlayer,
 *          selectPlayerSlot, joinAsGuest, setGuestSkill, importCharacter,
 *          updateRolePersonality
 */

/**
 * Register player handlers
 * @param {Object} ctx - Shared context from context.js
 */
function register(ctx) {
  const { socket, io, opsSession, operations, validators, socketLog, sanitizeError, connectedSockets, slotReservations } = ctx;

  // Create player slot
  socket.on('ops:createPlayerSlot', (data) => {
    try {
      const { campaignId, slotName } = data || {};

      const idResult = validators.campaignId(campaignId);
      if (!idResult.valid) {
        socket.emit('ops:error', { message: idResult.error });
        return;
      }
      const nameResult = validators.playerName(slotName);
      if (!nameResult.valid) {
        socket.emit('ops:error', { message: nameResult.error });
        return;
      }

      if (!opsSession.isGM || opsSession.campaignId !== campaignId) {
        socket.emit('ops:error', { message: 'Not authorized' });
        return;
      }
      const account = operations.createPlayerSlot(campaignId, nameResult.sanitized);
      io.to(`ops:campaign:${campaignId}`).emit('ops:playerSlotCreated', { account });
      socketLog.info(`[OPS] Player slot created: ${account.id} "${slotName}"`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Player', error));
      socketLog.error('[OPS] Error creating player slot:', error);
    }
  });

  // Delete player slot
  socket.on('ops:deletePlayerSlot', (data) => {
    try {
      const { accountId } = data || {};

      const idResult = validators.accountId(accountId);
      if (!idResult.valid) {
        socket.emit('ops:error', { message: idResult.error });
        return;
      }

      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can delete player slots' });
        return;
      }
      operations.deletePlayerSlot(accountId);
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:playerSlotDeleted', { accountId });
      socketLog.info(`[OPS] Player slot deleted: ${accountId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Player', error));
      socketLog.error('[OPS] Error deleting player slot:', error);
    }
  });

  // Player joins campaign by code/ID
  socket.on('ops:joinCampaignAsPlayer', (data) => {
    try {
      const { campaignId } = data;
      let campaign = operations.getCampaign(campaignId);
      if (!campaign) {
        campaign = operations.getCampaignByCode(campaignId);
      }
      if (!campaign) {
        socket.emit('ops:error', { message: 'Campaign not found. Check the code and try again.' });
        return;
      }
      const actualCampaignId = campaign.id;
      const players = operations.getPlayerAccountsByCampaign(actualCampaignId);
      opsSession.campaignId = actualCampaignId;
      socket.join(`ops:campaign:${actualCampaignId}`);

      // AR-115.3: Use slotReservations to determine availability, not time-based filter
      // A slot is available if it's not currently reserved by an active socket
      const availableSlots = players.filter(p => !slotReservations.has(p.id));

      socket.emit('ops:campaignJoined', {
        campaign,
        availableSlots
      });
      socketLog.info(`[OPS] Player viewing campaign: ${actualCampaignId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Campaign', error));
      socketLog.error('[OPS] Error joining campaign:', error);
    }
  });

  // Player selects their slot
  socket.on('ops:selectPlayerSlot', (data) => {
    try {
      const { accountId } = data || {};

      const idResult = validators.accountId(accountId);
      if (!idResult.valid) {
        socket.emit('ops:error', { message: idResult.error });
        return;
      }

      const account = operations.getPlayerAccount(accountId);
      if (!account) {
        socket.emit('ops:error', { message: 'Player slot not found' });
        return;
      }
      if (slotReservations.has(accountId) && slotReservations.get(accountId) !== socket.id) {
        socket.emit('ops:error', { message: 'This slot is already in use by another player' });
        return;
      }
      slotReservations.set(accountId, socket.id);
      connectedSockets.set(socket.id, {
        campaignId: account.campaign_id,
        accountId: accountId,
        shipId: account.ship_id || null,
        role: null
      });
      operations.recordPlayerLogin(accountId);
      opsSession.accountId = accountId;
      opsSession.campaignId = account.campaign_id;
      opsSession.shipId = account.ship_id || null;
      opsSession.slotName = account.slot_name;
      opsSession.isGuest = false;
      const ships = operations.getPartyShips(account.campaign_id);
      socket.emit('ops:playerSlotSelected', {
        account,
        ships,
        availableRoles: operations.ALL_ROLES
      });
      socket.to(`ops:campaign:${account.campaign_id}`).emit('ops:slotStatusUpdate', {
        accountId,
        status: 'in-use',
        slotName: account.slot_name
      });
      socket.to(`ops:campaign:${account.campaign_id}`).emit('ops:playerJoined', {
        accountId,
        slotName: account.slot_name
      });
      socketLog.info(`[OPS] Player selected slot: ${accountId} "${account.slot_name}"`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Player', error));
      socketLog.error('[OPS] Error selecting player slot:', error);
    }
  });

  // Guest joins campaign
  socket.on('ops:joinAsGuest', (data) => {
    try {
      const { campaignId, guestName } = data;
      const campaign = operations.getCampaign(campaignId);
      if (!campaign) {
        socket.emit('ops:error', { message: 'Campaign not found' });
        return;
      }
      opsSession.campaignId = campaignId;
      opsSession.isGuest = true;
      opsSession.guestName = guestName || 'Guest';
      socket.join(`ops:campaign:${campaignId}`);
      const ships = operations.getPartyShips(campaignId);
      socket.emit('ops:guestJoined', {
        campaign,
        ships,
        availableRoles: operations.ALL_ROLES,
        guestName: opsSession.guestName,
        defaultSkill: 0
      });
      socketLog.info(`[OPS] Guest "${opsSession.guestName}" joined campaign: ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Guest', error));
      socketLog.error('[OPS] Error joining as guest:', error);
    }
  });

  // GM overrides guest skill level
  socket.on('ops:setGuestSkill', (data) => {
    try {
      const { targetSocketId, role, skillLevel } = data;
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can set guest skill levels' });
        return;
      }
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit('ops:skillOverride', { role, skillLevel });
        socketLog.info(`[OPS] GM set guest skill: ${role} = ${skillLevel}`);
      }
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Guest', error));
    }
  });

  // Import character data
  socket.on('ops:importCharacter', (data) => {
    try {
      const { characterData } = data;
      if (!opsSession.accountId && !opsSession.isGuest) {
        socket.emit('ops:error', { message: 'Must select a player slot first' });
        return;
      }
      if (opsSession.isGuest) {
        opsSession.character = characterData;
        socket.emit('ops:characterImported', { character: characterData });
        socketLog.info(`[OPS] Guest character set: ${characterData.name}`);
      } else {
        const account = operations.importCharacter(opsSession.accountId, characterData);
        socket.emit('ops:characterImported', { character: account.character_data });
        socketLog.info(`[OPS] Character imported: ${characterData.name}`);
      }
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Import', error));
      socketLog.error('[OPS] Error importing character:', error);
    }
  });

  // Update role personality
  socket.on('ops:updateRolePersonality', (data) => {
    try {
      const { playerId, roleTitle, quirkText, quirkIcon } = data;
      if (!playerId) {
        socket.emit('ops:error', { message: 'No player ID provided' });
        return;
      }

      const account = operations.updatePlayerAccount(playerId, {
        role_title: roleTitle,
        quirk_text: quirkText,
        quirk_icon: quirkIcon
      });

      socket.emit('ops:rolePersonalityUpdated', {
        playerId,
        roleTitle: account.role_title,
        quirkText: account.quirk_text,
        quirkIcon: account.quirk_icon
      });

      if (opsSession.campaignId) {
        const crew = operations.getPlayersByCampaign(opsSession.campaignId);
        io.to(`ops:${opsSession.campaignId}`).emit('ops:crewUpdate', { crew });
      }

      socketLog.info(`[OPS] Role personality updated for player ${playerId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Role', error));
      socketLog.error('[OPS] Error updating role personality:', error);
    }
  });
}

module.exports = { register };
