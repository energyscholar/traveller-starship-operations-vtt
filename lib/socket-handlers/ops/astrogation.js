/**
 * Astrogation/Jump Handlers
 * AR-66: Fixed ship location updates on jump completion
 * Handles: canJump, getJumpStatus, plotJump, initiateJump, completeJump, skipToJumpExit
 */

const starSystems = require('../../operations/star-system-loader');

/**
 * Register astrogation handlers
 * @param {Object} ctx - Shared context from context.js
 */
function register(ctx) {
  const { socket, io, opsSession, operations, socketLog, sanitizeError } = ctx;

  // Check if ship can jump
  socket.on('ops:canJump', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const { distance = 1 } = data;
      const result = operations.canInitiateJump(opsSession.shipId, distance);
      socket.emit('ops:jumpCheck', result);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Jump', error));
      socketLog.error('[OPS] Error checking jump:', error);
    }
  });

  // Get current jump status
  socket.on('ops:getJumpStatus', () => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const campaign = operations.getCampaign(opsSession.campaignId);
      const status = operations.getJumpStatus(opsSession.shipId, campaign.current_date);
      socket.emit('ops:jumpStatus', status);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Jump', error));
      socketLog.error('[OPS] Error getting jump status:', error);
    }
  });

  // Plot jump course
  socket.on('ops:plotJump', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      if (!opsSession.isGM && opsSession.role !== 'astrogator' && opsSession.role !== 'pilot') {
        socket.emit('ops:error', { message: 'Only astrogator or pilot can plot jump courses' });
        return;
      }
      const { destination, distance = 1 } = data;
      if (!destination) {
        socket.emit('ops:error', { message: 'Destination required' });
        return;
      }

      const check = operations.canInitiateJump(opsSession.shipId, distance);
      const campaign = operations.getCampaign(opsSession.campaignId);
      const arrivalDate = operations.advanceDate(campaign.current_date, 168, 0);
      const fuelPenalties = operations.getJumpFuelPenalties(opsSession.shipId, check.fuelNeeded || 0);

      const warnings = [];
      if (fuelPenalties.hasUnrefined) {
        warnings.push(`Unrefined fuel detected: ${fuelPenalties.dmModifier} DM to jump check, ${(fuelPenalties.misjumpRisk * 100).toFixed(0)}% misjump risk`);
      }
      if (check.fuelNeeded && check.fuelAvailable) {
        const fuelAfterJump = check.fuelAvailable - check.fuelNeeded;
        if (fuelAfterJump < check.fuelNeeded) {
          warnings.push(`Warning: Insufficient fuel for return jump after arrival`);
        }
      }

      const systemData = operations.getSystemData(destination);
      const destinationInfo = systemData ? {
        uwp: systemData.system.uwp,
        tradeCodes: systemData.system.tradeCodes,
        starport: systemData.system.uwp ? systemData.system.uwp[0] : '?',
        gasGiants: systemData.system.gasGiants || 0
      } : null;

      socket.emit('ops:jumpPlotted', {
        destination,
        distance,
        canJump: check.canJump,
        error: check.error || null,
        fuelNeeded: check.fuelNeeded || 0,
        fuelAvailable: check.fuelAvailable || 0,
        fuelAfterJump: (check.fuelAvailable || 0) - (check.fuelNeeded || 0),
        travelTime: '168 hours (7 days)',
        currentDate: campaign.current_date,
        arrivalDate,
        jumpRating: check.jumpRating || 0,
        warnings,
        destinationInfo,
        astrogatorSkill: opsSession.role === 'astrogator' ? 'Your skill helps ensure safe arrival' : null
      });

      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'astrogation',
        message: `Jump course plotted to ${destination} (Jump-${distance}). Fuel: ${check.fuelNeeded || '?'} tons.`,
        actor: opsSession.isGM ? 'GM' : 'Astrogator'
      });

      socketLog.info(`[OPS] Jump course plotted to ${destination}, canJump: ${check.canJump}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Jump', error));
      socketLog.error('[OPS] Error plotting jump:', error);
    }
  });

  // Initiate jump
  socket.on('ops:initiateJump', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      if (!opsSession.isGM && opsSession.role !== 'astrogator' && opsSession.role !== 'pilot') {
        socket.emit('ops:error', { message: 'Only astrogator or pilot can initiate jump' });
        return;
      }
      const { destination, distance = 1 } = data;
      if (!destination) {
        socket.emit('ops:error', { message: 'Destination required' });
        return;
      }
      const result = operations.initiateJump(opsSession.shipId, opsSession.campaignId, destination, distance);
      if (!result.success) {
        socket.emit('ops:error', { message: result.error });
        return;
      }

      // AR-66: Update ship location to Jump Space
      const ship = operations.getShip(opsSession.shipId);
      if (ship) {
        const currentState = ship.current_state || {};
        operations.updateShip(opsSession.shipId, {
          current_state: {
            ...currentState,
            systemHex: '0000',  // Jump Space pseudo-hex
            locationId: 'loc-in-jump',
            locationName: 'In Jump Space'
          }
        });
      }

      const campaign = operations.getCampaign(opsSession.campaignId);
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'jump',
        message: `Jump initiated to ${destination} (Jump-${distance}). ETA: ${result.jumpEndDate}`,
        actor: opsSession.isGM ? 'GM' : opsSession.role
      });
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:jumpInitiated', {
        ...result,
        initiatedBy: opsSession.isGM ? 'GM' : opsSession.role
      });
      socketLog.info(`[OPS] Jump initiated to ${destination} from ship ${opsSession.shipId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Jump', error));
      socketLog.error('[OPS] Error initiating jump:', error);
    }
  });

  // Complete jump
  socket.on('ops:completeJump', () => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const campaign = operations.getCampaign(opsSession.campaignId);
      const status = operations.getJumpStatus(opsSession.shipId, campaign.current_date);
      if (!status.inJump) {
        socket.emit('ops:error', { message: 'Ship is not in jump space' });
        return;
      }
      if (!status.canExit) {
        socket.emit('ops:error', { message: `Jump not complete. ${status.hoursRemaining} hours remaining` });
        return;
      }
      const result = operations.completeJump(opsSession.shipId, opsSession.campaignId);
      if (!result.success) {
        socket.emit('ops:error', { message: result.error });
        return;
      }
      if (status.jumpEndDate) {
        operations.updateCampaign(opsSession.campaignId, { current_date: status.jumpEndDate });
      }
      const updatedCampaign = operations.getCampaign(opsSession.campaignId);

      const systemData = operations.getSystemData(result.arrivedAt);
      let newContacts = [];
      if (systemData) {
        socketLog.info(`[OPS] Loading system data for ${result.arrivedAt}`);
        operations.seedSystemContacts(opsSession.campaignId, result.arrivedAt);
        newContacts = operations.getContactsByCampaign(opsSession.campaignId);
        operations.updateCampaign(opsSession.campaignId, {
          current_sector: systemData.system.sector,
          current_hex: systemData.system.hex
        });
      }

      // AR-66: Update ship location to destination system's Exit Jump Space
      const destSystem = starSystems.getSystemByName(result.arrivedAt);
      const shipForUpdate = operations.getShip(opsSession.shipId);
      if (shipForUpdate && destSystem) {
        const currentState = shipForUpdate.current_state || {};
        operations.updateShip(opsSession.shipId, {
          current_state: {
            ...currentState,
            systemHex: destSystem.hex,
            locationId: 'loc-exit-jump',
            locationName: 'Exit Jump Space'
          }
        });
        socketLog.info(`[OPS] Ship location updated to ${destSystem.name} hex ${destSystem.hex} at Exit Jump Space`);
      } else if (shipForUpdate) {
        // Fallback for systems not in JSON files - use campaign data
        const currentState = shipForUpdate.current_state || {};
        operations.updateShip(opsSession.shipId, {
          current_state: {
            ...currentState,
            systemHex: systemData?.system?.hex || null,
            locationId: 'loc-exit-jump',
            locationName: 'Exit Jump Space'
          }
        });
      }

      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: updatedCampaign.current_date,
        entryType: 'jump',
        message: `Arrived at ${result.arrivedAt}`,
        actor: 'System'
      });

      if (systemData) {
        operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
          gameDate: updatedCampaign.current_date,
          entryType: 'comms',
          message: `Data link established with ${result.arrivedAt} Starport`,
          actor: 'Comms'
        });
      }

      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:jumpCompleted', {
        ...result,
        newDate: updatedCampaign.current_date,
        contacts: newContacts,
        systemLoaded: !!systemData,
        news: systemData?.system?.news || [],
        mail: systemData?.system?.mail || {},
        roleContent: systemData?.system?.roleContent || {}
      });
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:locationChanged', {
        newLocation: result.arrivedAt,
        newDate: updatedCampaign.current_date,
        contacts: newContacts
      });
      if (newContacts.length > 0) {
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactsReplaced', {
          contacts: newContacts,
          reason: `Arrived at ${result.arrivedAt}`
        });
      }
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:timeUpdated', {
        currentDate: updatedCampaign.current_date,
        reason: `Jump to ${result.arrivedAt}`
      });
      socketLog.info(`[OPS] Jump completed, arrived at ${result.arrivedAt}, date: ${updatedCampaign.current_date}, contacts: ${newContacts.length}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Jump', error));
      socketLog.error('[OPS] Error completing jump:', error);
    }
  });

  // Skip to jump exit (testing feature)
  socket.on('ops:skipToJumpExit', () => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const campaign = operations.getCampaign(opsSession.campaignId);
      const status = operations.getJumpStatus(opsSession.shipId, campaign.current_date);

      if (!status.inJump) {
        socket.emit('ops:error', { message: 'Ship is not in jump space' });
        return;
      }

      if (status.canExit) {
        socket.emit('ops:error', { message: 'Jump can already be exited' });
        return;
      }

      operations.updateCampaign(opsSession.campaignId, { current_date: status.jumpEndDate });
      const updatedCampaign = operations.getCampaign(opsSession.campaignId);
      const newStatus = operations.getJumpStatus(opsSession.shipId, updatedCampaign.current_date);

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:timeUpdated', {
        currentDate: updatedCampaign.current_date,
        reason: 'Time advanced to jump exit'
      });

      socket.emit('ops:jumpStatusUpdated', {
        jumpStatus: newStatus,
        message: `Time advanced. You may now exit jump space.`
      });

      socketLog.info(`[OPS] Time skipped to jump exit: ${updatedCampaign.current_date}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Time', error));
      socketLog.error('[OPS] Error skipping to jump exit:', error);
    }
  });
}

module.exports = { register };
