/**
 * Bridge Operations Handlers
 * Handles: selectShip, assignRole, leaveRole, relieveCrewMember, gmAssignRole,
 *          joinBridge, startSession, addLogEntry, advanceTime, setAlertStatus
 */

const { createRoleViewModel, buildViewModelContext } = require('../../viewmodels');

/**
 * Register bridge handlers
 * @param {Object} ctx - Shared context from context.js
 */
function register(ctx) {
  const { socket, io, opsSession, operations, validators, socketLog, sanitizeError, connectedSockets, slotReservations } = ctx;

  // AR-135: Helper to find socket ID by account ID
  function findSocketByAccountId(accountId, sockets) {
    for (const [socketId, info] of sockets) {
      if (info.accountId === accountId) {
        return socketId;
      }
    }
    return null;
  }

  // Select ship
  socket.on('ops:selectShip', (data) => {
    try {
      const { shipId } = data || {};

      const idResult = validators.shipId(shipId);
      if (!idResult.valid) {
        socket.emit('ops:error', { message: idResult.error });
        return;
      }

      const ship = operations.getShip(shipId);
      if (!ship) {
        socket.emit('ops:error', { message: 'Ship not found' });
        return;
      }
      opsSession.shipId = shipId;
      if (opsSession.accountId) {
        operations.updatePlayerAccount(opsSession.accountId, { ship_id: shipId });
      }
      const crew = operations.getPlayersByShip(shipId);
      const npcCrew = operations.getNPCCrewByShip(shipId);
      socket.emit('ops:shipSelected', {
        ship,
        crew,
        npcCrew,
        takenRoles: crew.map(c => c.role).filter(r => r)
      });
      socketLog.info(`[OPS] Ship selected: ${shipId} "${ship.name}"`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Ship', error));
      socketLog.error('[OPS] Error selecting ship:', error);
    }
  });

  // Assign role
  socket.on('ops:assignRole', (data) => {
    try {
      const { role, roleInstance = 1 } = data || {};

      const roleResult = validators.role(role);
      if (!roleResult.valid) {
        socket.emit('ops:error', { message: roleResult.error });
        return;
      }

      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Must select a ship first' });
        return;
      }
      const roleConfig = operations.ROLE_VIEWS[role];
      const hasUnlimitedSlots = roleConfig?.unlimitedSlots === true;

      if (!opsSession.isGuest && !hasUnlimitedSlots) {
        const isAvailable = operations.isRoleInstanceAvailable(
          opsSession.shipId,
          role,
          roleInstance,
          opsSession.accountId
        );
        if (!isAvailable) {
          // AR-135: Role replacement - bump current holder to observer
          const currentHolder = operations.getRoleHolder(opsSession.shipId, role, roleInstance);
          if (currentHolder && currentHolder.id !== opsSession.accountId) {
            // Bump current holder to observer
            operations.bumpToObserver(currentHolder.id);

            // Find their socket and notify them
            const holderSocketId = findSocketByAccountId(currentHolder.id, connectedSockets);
            if (holderSocketId) {
              const holderSocket = io.sockets.sockets.get(holderSocketId);
              if (holderSocket) {
                // Update their session
                const holderSession = holderSocket.opsSession || {};
                holderSession.role = 'observer';
                holderSession.roleInstance = 1;

                // Send toast notification
                holderSocket.emit('ops:roleBumped', {
                  oldRole: role,
                  newRole: 'observer',
                  bumpedBy: opsSession.slotName || 'Another player',
                  message: `${opsSession.slotName || 'Another player'} claimed your ${role} role. You are now Observer.`
                });

                socketLog.info(`[OPS] AR-135: ${currentHolder.slot_name} bumped from ${role} to observer`);
              }
            }

            // Broadcast crew update
            io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:crewUpdate', {
              shipId: opsSession.shipId,
              accountId: currentHolder.id,
              slotName: currentHolder.slot_name,
              role: 'observer',
              roleInstance: 1,
              bumped: true
            });
          }
        }
        operations.assignRole(opsSession.accountId, role, roleInstance);
      } else if (!opsSession.isGuest && hasUnlimitedSlots) {
        operations.assignRole(opsSession.accountId, role, roleInstance);
      }
      opsSession.role = role;
      opsSession.roleInstance = roleInstance;
      const connInfo = connectedSockets.get(socket.id);
      if (connInfo) {
        connInfo.role = role;
        connInfo.shipId = opsSession.shipId;
      }
      socket.emit('ops:roleAssigned', { role, roleInstance });
      socket.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:crewUpdate', {
        shipId: opsSession.shipId,
        accountId: opsSession.accountId,
        slotName: opsSession.isGuest ? opsSession.guestName : null,
        role,
        roleInstance
      });
      socketLog.info(`[OPS] Role assigned: ${role}${roleInstance > 1 ? ' ' + roleInstance : ''}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Role', error));
      socketLog.error('[OPS] Error assigning role:', error);
    }
  });

  // Leave role
  socket.on('ops:leaveRole', () => {
    try {
      const previousRole = opsSession.role;
      if (!previousRole) {
        socket.emit('ops:error', { message: 'No role to leave' });
        return;
      }

      if (!opsSession.isGuest && opsSession.accountId) {
        operations.clearRole(opsSession.accountId);
      }

      opsSession.role = null;
      opsSession.roleInstance = null;

      const connInfo = connectedSockets.get(socket.id);
      if (connInfo) {
        connInfo.role = null;
      }

      socket.emit('ops:roleCleared', { previousRole });

      if (opsSession.campaignId) {
        socket.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:crewUpdate', {
          shipId: opsSession.shipId,
          accountId: opsSession.accountId,
          slotName: opsSession.isGuest ? opsSession.guestName : null,
          role: null,
          action: 'left'
        });
      }

      socketLog.info(`[OPS] Role cleared: ${previousRole}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Role', error));
      socketLog.error('[OPS] Error leaving role:', error);
    }
  });

  // Relieve crew member
  socket.on('ops:relieveCrewMember', (data) => {
    try {
      const { accountId, reason } = data;

      const isCaptain = opsSession.role === 'captain';
      const isMedic = opsSession.role === 'medic';
      if (!isCaptain && !isMedic && !opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only Captain, Medical Officer, or GM can relieve crew members' });
        return;
      }

      if (!accountId) {
        socket.emit('ops:error', { message: 'Must specify crew member to relieve' });
        return;
      }

      socketLog.info(`[OPS] Relieving crew - accountId: ${accountId}`);
      const targetAccount = operations.getPlayerAccount(accountId);
      socketLog.info(`[OPS] Target account lookup result:`, JSON.stringify(targetAccount));
      if (!targetAccount) {
        socket.emit('ops:error', { message: 'Crew member not found' });
        return;
      }

      const targetRole = targetAccount.role;
      const targetName = targetAccount.slot_name || targetAccount.character_name || 'Unknown';
      socketLog.info(`[OPS] Target role: ${targetRole}, name: ${targetName}`);

      if (!targetRole) {
        socket.emit('ops:error', { message: `${targetName} has no role to be relieved from` });
        return;
      }

      if (accountId === opsSession.accountId) {
        socket.emit('ops:error', { message: 'Cannot relieve yourself from duty' });
        return;
      }

      const authorityType = isMedic ? 'Medical Officer' : (opsSession.isGM ? 'GM' : 'Captain');

      socketLog.info(`[OPS] Clearing role for accountId: ${accountId}`);
      operations.clearRole(accountId);
      socketLog.info(`[OPS] Role cleared successfully`);

      const targetSocketId = slotReservations.get(accountId);
      if (targetSocketId) {
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.emit('ops:relievedFromDuty', {
            byCaption: opsSession.slotName || 'Captain',
            previousRole: targetRole,
            reason: reason || 'Captain\'s discretion'
          });
        }
        const targetConnInfo = connectedSockets.get(targetSocketId);
        if (targetConnInfo) {
          targetConnInfo.role = null;
        }
      }

      if (opsSession.shipId && opsSession.campaignId) {
        const campaign = operations.getCampaign(opsSession.campaignId);
        const gameDate = campaign?.current_date || new Date().toISOString().split('T')[0];

        operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
          entryType: 'crew',
          gameDate: gameDate,
          message: `${targetName} has been relieved of ${targetRole} duty by ${authorityType}${reason ? ': ' + reason : ''}`,
          actor: authorityType
        });
      }

      socket.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:crewUpdate', {
        shipId: opsSession.shipId,
        accountId: accountId,
        slotName: targetName,
        role: null,
        action: 'relieved',
        byCaptain: opsSession.slotName || 'Captain',
        reason: reason || null
      });

      socket.emit('ops:crewMemberRelieved', {
        accountId,
        slotName: targetName,
        previousRole: targetRole
      });

      socketLog.info(`[OPS] Captain relieved ${targetName} from ${targetRole} duty`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Role', error));
      socketLog.error('[OPS] Error relieving crew member:', error.message, error.stack);
    }
  });

  // GM assigns role
  socket.on('ops:gmAssignRole', (data) => {
    try {
      const { accountId, role, roleInstance = 1 } = data;

      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can assign roles to other crew members' });
        return;
      }

      if (!accountId || !role) {
        socket.emit('ops:error', { message: 'Must specify crew member and role' });
        return;
      }

      const targetAccount = operations.getPlayerAccount(accountId);
      if (!targetAccount) {
        socket.emit('ops:error', { message: 'Crew member not found' });
        return;
      }

      const targetName = targetAccount.slot_name || targetAccount.character_name || 'Unknown';
      const targetShipId = targetAccount.ship_id || opsSession.shipId;

      const roleConfig = operations.ROLE_VIEWS[role];
      const hasUnlimitedSlots = roleConfig?.unlimitedSlots === true;

      if (!hasUnlimitedSlots) {
        const isAvailable = operations.isRoleInstanceAvailable(
          targetShipId,
          role,
          roleInstance,
          accountId
        );
        if (!isAvailable) {
          const roleName = roleInstance > 1 ? `${role} ${roleInstance}` : role;
          socket.emit('ops:error', { message: `Role "${roleName}" is already taken` });
          return;
        }
      }

      operations.assignRole(accountId, role, roleInstance);
      socketLog.info(`[OPS] GM assigned ${targetName} to role: ${role}${roleInstance > 1 ? ' ' + roleInstance : ''}`);

      const targetSocketId = slotReservations.get(accountId);
      if (targetSocketId) {
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.emit('ops:roleAssignedByGM', {
            role,
            roleInstance,
            byGM: true
          });
        }
      }

      socket.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:crewUpdate', {
        shipId: targetShipId,
        accountId: accountId,
        slotName: targetName,
        role,
        roleInstance,
        action: 'assigned',
        byGM: true
      });

      socket.emit('ops:gmRoleAssigned', {
        accountId,
        slotName: targetName,
        role,
        roleInstance
      });

      if (targetShipId && opsSession.campaignId) {
        const campaign = operations.getCampaign(opsSession.campaignId);
        const gameDate = campaign?.current_date || new Date().toISOString().split('T')[0];
        const roleName = roleConfig?.name || role;

        operations.addLogEntry(targetShipId, opsSession.campaignId, {
          entryType: 'crew',
          gameDate: gameDate,
          message: `GM assigned ${targetName} to ${roleName} duty`,
          actor: 'GM'
        });
      }

    } catch (error) {
      socket.emit('ops:error', sanitizeError('Role', error));
      socketLog.error('[OPS] Error in GM assign role:', error.message, error.stack);
    }
  });

  // Join bridge
  socket.on('ops:joinBridge', (data = {}) => {
    try {
      const shipId = data.shipId || opsSession.shipId;
      const role = data.role || opsSession.role;
      const isGM = data.isGM || opsSession.isGM;

      if (data.shipId) opsSession.shipId = data.shipId;
      if (data.role) opsSession.role = data.role;
      opsSession.selectedRole = role;
      // AR-XX: Set playerName for chat system
      opsSession.playerName = isGM ? 'GM' : (opsSession.isGuest ? opsSession.guestName : opsSession.slotName);

      if (!shipId || !role) {
        socket.emit('ops:error', { message: 'Must select ship and role before joining bridge' });
        return;
      }
      socket.join(`ops:bridge:${shipId}`);
      const ship = operations.getShip(shipId);
      const crew = operations.getPlayersByShip(shipId);
      const npcCrew = operations.getNPCCrewByShip(shipId);
      const campaign = operations.getCampaign(opsSession.campaignId);
      const logs = operations.getShipLog(shipId, { limit: 50 });
      let contacts;
      if (isGM) {
        contacts = operations.getContactsByCampaign(opsSession.campaignId);
      } else {
        contacts = operations.getVisibleContacts(opsSession.campaignId, shipId);
      }
      const roleView = isGM ? operations.ROLE_VIEWS.gm : (operations.ROLE_VIEWS[role] || operations.ROLE_VIEWS.pilot);

      // Get system data for viewscreen
      let systemData = null;
      if (campaign?.current_system) {
        const sysResult = operations.getSystemData(campaign.current_system);
        if (sysResult?.system) {
          systemData = sysResult.system;
        }
      }

      socket.emit('ops:bridgeJoined', {
        ship,
        crew,
        npcCrew,
        campaign,
        logs,
        contacts,
        role,
        roleView,
        alertStatus: ship?.current_state?.alertStatus || 'NORMAL',
        isGM,
        systemData
      });

      // Emit role ViewModel for V2 GUI
      try {
        const vmContext = buildViewModelContext(operations, shipId, opsSession.campaignId, role, opsSession.roleInstance || 1);
        const viewModel = createRoleViewModel(role, vmContext);
        if (viewModel) {
          socket.emit('ops:roleUpdate', { viewModel });
        }
      } catch (vmError) {
        socketLog.warn('[OPS] ViewModel creation failed:', vmError.message);
      }

      io.to(`ops:bridge:${shipId}`).emit('ops:crewOnBridge', {
        accountId: opsSession.accountId,
        role,
        name: isGM ? 'GM' : (opsSession.isGuest ? opsSession.guestName : null)
      });
      const playerAccount = !isGM && opsSession.accountId ? operations.getPlayerAccount(opsSession.accountId) : null;
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:crewUpdate', {
        action: 'joined',
        accountId: opsSession.accountId,
        role,
        roleInstance: opsSession.roleInstance,
        slotName: opsSession.slotName,
        playerName: isGM ? 'GM' : (opsSession.isGuest ? opsSession.guestName : opsSession.slotName),
        shipId,
        isGM,
        character_data: playerAccount?.character_data || null
      });
      socketLog.info(`[OPS] Joined bridge: ${shipId} as ${role}${isGM ? ' (GM)' : ''}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Bridge', error));
      socketLog.error('[OPS] Error joining bridge:', error);
    }
  });

  // TASK 3: V2 ViewModel polling handler
  socket.on('ops:getRoleUpdate', (data) => {
    const { role } = data;
    if (!opsSession.shipId || !role) return;
    try {
      const vmContext = buildViewModelContext(operations, opsSession.shipId, opsSession.campaignId, role, opsSession.roleInstance || 1);
      const viewModel = createRoleViewModel(role, vmContext);
      if (viewModel) {
        socket.emit('ops:roleUpdate', { viewModel });
      }
    } catch (err) {
      socketLog.warn('[OPS] getRoleUpdate failed:', err.message);
    }
  });

  // GM starts session
  socket.on('ops:startSession', () => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can start session' });
        return;
      }
      const ships = operations.getPartyShips(opsSession.campaignId);
      const campaign = operations.getCampaign(opsSession.campaignId);
      ships.forEach(ship => {
        operations.addLogEntry(ship.id, opsSession.campaignId, {
          gameDate: campaign.current_date,
          entryType: 'session',
          message: 'Session started',
          actor: 'GM'
        });
      });
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:sessionStarted', {
        gameDate: campaign.current_date,
        currentSystem: campaign.current_system
      });
      socketLog.info(`[OPS] Session started for campaign: ${opsSession.campaignId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Session', error));
      socketLog.error('[OPS] Error starting session:', error);
    }
  });

  // Add ship log entry
  socket.on('ops:addLogEntry', (data) => {
    try {
      const { message, entryType } = data;
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const campaign = operations.getCampaign(opsSession.campaignId);
      const entry = operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: entryType || 'event',
        message,
        actor: opsSession.isGM ? 'GM' : (opsSession.role || 'Crew')
      });
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:logEntryAdded', { entry });
      socketLog.info(`[OPS] Log entry added: ${message}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Log', error));
      socketLog.error('[OPS] Error adding log entry:', error);
    }
  });

  // Advance game time (AR-30: allow certain roles)
  socket.on('ops:advanceTime', async (data) => {
    try {
      // Roles that can advance time: GM, pilot, astrogator, captain
      const allowedRoles = ['pilot', 'astrogator', 'captain'];
      const canAdvance = opsSession.isGM || allowedRoles.includes(opsSession.role);

      if (!canAdvance) {
        socket.emit('ops:error', { message: 'Only GM, Captain, Pilot, or Astrogator can advance time' });
        return;
      }

      const { minutes = 0, hours = 0, days = 0, reason = '' } = data;
      const campaign = await operations.getCampaign(opsSession.campaignId);
      if (!campaign) {
        socket.emit('ops:error', { message: 'Campaign not found' });
        return;
      }

      // Use Imperial date format (YYYY-DDD HH:MM)
      const jump = require('../../operations/jump');
      const currentDate = campaign.current_date || '1105-001 08:00';
      const totalMinutes = minutes + (hours * 60) + (days * 24 * 60);
      const newDate = jump.advanceDate(currentDate, 0, totalMinutes);

      await operations.updateCampaign(opsSession.campaignId, { current_date: newDate });

      // Log the time advance
      const ships = await operations.getPartyShips(opsSession.campaignId);
      const timeStr = days > 0 ? `${days}d ${hours}h ${minutes}m` :
                      hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      const actor = opsSession.isGM ? 'GM' : (opsSession.playerName || opsSession.role);

      for (const ship of ships) {
        await operations.addLogEntry(ship.id, opsSession.campaignId, {
          gameDate: newDate,
          entryType: 'time',
          message: `Time advanced: +${timeStr}${reason ? ` (${reason})` : ''}`,
          actor
        });
      }

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:timeAdvanced', {
        newDate,
        delta: { minutes, hours, days },
        reason,
        advancedBy: actor
      });
      socketLog.info(`[OPS] Time advanced to ${newDate} by ${actor}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Time', error));
      socketLog.error('[OPS] Error advancing time:', error);
    }
  });

  // Set alert status
  socket.on('ops:setAlertStatus', (data) => {
    try {
      const { alertStatus } = data;
      if (!['NORMAL', 'YELLOW', 'RED'].includes(alertStatus)) {
        socket.emit('ops:error', { message: 'Invalid alert status' });
        return;
      }
      if (!opsSession.isGM && opsSession.role !== 'captain') {
        socket.emit('ops:error', { message: 'Only Captain or GM can change alert status' });
        return;
      }
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'No ship selected' });
        return;
      }
      // Update and broadcast FIRST
      operations.updateShipState(opsSession.shipId, { alertStatus });
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:alertStatusChanged', { alertStatus });
      socketLog.info(`[OPS] Alert status changed to: ${alertStatus}`);

      // Log only if both IDs valid (FK guard)
      if (opsSession.shipId && opsSession.campaignId) {
        try {
          const campaign = operations.getCampaign(opsSession.campaignId);
          if (campaign) {
            operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
              gameDate: campaign.current_date,
              entryType: 'alert',
              message: `Alert status changed to ${alertStatus}`,
              actor: opsSession.isGM ? 'GM' : 'Captain'
            });
          }
        } catch (e) {
          socketLog.warn('[OPS] Alert log failed:', e.message);
        }
      }
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Alert', error));
      socketLog.error('[OPS] Error setting alert status:', error);
    }
  });
}

module.exports = { register };
