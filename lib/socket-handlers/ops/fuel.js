/**
 * Fuel Management Handlers
 * Handles: getFuelStatus, getRefuelOptions, canRefuel, refuel,
 *          startFuelProcessing, checkFuelProcessing, getJumpFuelPenalties
 *
 * AR-193: Gas giant refueling now requires Pilot skill check
 */

const { skillCheck, formatSkillCheckResult } = require('../../skill-checks');
const { broadcastRollResult } = require('../roll-broadcast');

/**
 * Register fuel handlers
 * @param {Object} ctx - Shared context from context.js
 */
function register(ctx) {
  const { socket, io, opsSession, operations, socketLog, sanitizeError } = ctx;

  // Get fuel status for current ship
  socket.on('ops:getFuelStatus', () => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const fuelStatus = operations.getFuelStatus(opsSession.shipId);
      socket.emit('ops:fuelStatus', fuelStatus);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Fuel', error));
      socketLog.error('[OPS] Error getting fuel status:', error);
    }
  });

  // Get available refueling sources
  socket.on('ops:getRefuelOptions', () => {
    try {
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'Not in a campaign' });
        return;
      }
      const sources = operations.getAvailableSources(opsSession.campaignId, opsSession.shipId);
      let fuelStatus = null;
      if (opsSession.shipId) {
        fuelStatus = operations.getFuelStatus(opsSession.shipId);
      }
      socket.emit('ops:refuelOptions', {
        sources,
        fuelStatus,
        fuelTypes: operations.FUEL_TYPES
      });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Fuel', error));
      socketLog.error('[OPS] Error getting refuel options:', error);
    }
  });

  // Check if can refuel from source
  socket.on('ops:canRefuel', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const { sourceId, tons } = data;
      const result = operations.canRefuel(opsSession.shipId, sourceId, tons);
      socket.emit('ops:canRefuelResult', result);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Fuel', error));
      socketLog.error('[OPS] Error checking refuel:', error);
    }
  });

  // Execute refueling
  socket.on('ops:refuel', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      // AR-131: Captain can also manage refueling in solo mode
      if (!opsSession.isGM && opsSession.role !== 'engineer' && opsSession.role !== 'pilot' && opsSession.role !== 'captain') {
        socket.emit('ops:error', { message: 'Only engineer, pilot, or captain can manage refueling' });
        return;
      }
      const { sourceId, tons } = data;

      // AR-193: Gas giant skimming requires Pilot skill check
      let skillCheckResult = null;
      let actualTons = tons;

      if (sourceId === 'gasGiant') {
        // Perform Pilot check (difficulty 8 = Average)
        // TODO: Get actual pilot skill from crew data when available
        const pilotSkill = 0; // Default to +0 if unknown
        skillCheckResult = skillCheck({
          skillLevel: pilotSkill,
          difficulty: 8,
          modifiers: []
        });

        // Broadcast the roll result
        broadcastRollResult(io, opsSession.campaignId, {
          roller: opsSession.role || 'Pilot',
          action: 'Gas Giant Skimming',
          dice: skillCheckResult.dice,
          total: skillCheckResult.roll,
          modifier: skillCheckResult.totalDM,
          result: skillCheckResult.total,
          target: skillCheckResult.difficulty,
          success: skillCheckResult.success,
          details: skillCheckResult.criticalSuccess ? 'Perfect approach!' :
                   skillCheckResult.criticalFailure ? 'CRITICAL - turbulence damage!' :
                   skillCheckResult.success ? 'Successful skim' : 'Partial success'
        });

        if (skillCheckResult.criticalFailure) {
          // Critical failure: No fuel, possible damage
          socket.emit('ops:error', { message: 'Critical failure! Severe turbulence - aborted with no fuel. Check M-Drive for damage.' });
          socketLog.warn(`[OPS] Gas giant refuel CRITICAL FAILURE - ship may be damaged`);
          return;
        } else if (!skillCheckResult.success) {
          // Failure: Reduced fuel (50% of requested)
          actualTons = Math.ceil(tons * 0.5);
          socketLog.info(`[OPS] Gas giant refuel partial success - ${actualTons}/${tons} tons`);
        }
        // Success/Critical success: Full fuel
      }

      const result = operations.refuel(opsSession.shipId, opsSession.campaignId, sourceId, actualTons);
      if (!result.success) {
        socket.emit('ops:error', { message: result.error });
        return;
      }

      // Note: Time is NOT auto-advanced for refueling - GM uses Passtime controls
      // because refueling may occur concurrently with travel or other activities

      // Include skill check info in result
      const refuelResult = {
        ...result,
        initiatedBy: opsSession.isGM ? 'GM' : opsSession.role,
        skillCheck: skillCheckResult ? {
          success: skillCheckResult.success,
          critical: skillCheckResult.criticalSuccess || skillCheckResult.criticalFailure,
          requestedTons: tons,
          actualTons: actualTons
        } : null
      };

      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:refueled', refuelResult);
      socketLog.info(`[OPS] Refueled ${actualTons} tons of ${result.fuelType} from ${sourceId}${result.timeHours ? ` (${result.timeHours}h)` : ''}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Fuel', error));
      socketLog.error('[OPS] Error refueling:', error);
    }
  });

  // Start fuel processing
  socket.on('ops:startFuelProcessing', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      // AR-131: Captain can also process fuel in solo mode
      if (!opsSession.isGM && opsSession.role !== 'engineer' && opsSession.role !== 'captain') {
        socket.emit('ops:error', { message: 'Only engineer or captain can process fuel' });
        return;
      }
      const { tons } = data;
      const result = operations.startFuelProcessing(opsSession.shipId, opsSession.campaignId, tons);
      if (!result.success) {
        socket.emit('ops:error', { message: result.error });
        return;
      }
      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:fuelProcessingStarted', {
        ...result,
        initiatedBy: opsSession.isGM ? 'GM' : 'Engineer'
      });
      socketLog.info(`[OPS] Started processing ${tons} tons of fuel (${result.timeHours}h)`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Fuel', error));
      socketLog.error('[OPS] Error starting fuel processing:', error);
    }
  });

  // Check fuel processing status
  socket.on('ops:checkFuelProcessing', () => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const result = operations.checkFuelProcessing(opsSession.shipId, opsSession.campaignId);
      socket.emit('ops:fuelProcessingStatus', result);
      if (result.completed) {
        io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:fuelProcessingCompleted', {
          tons: result.tons,
          newFuelStatus: result.newFuelStatus
        });
      }
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Fuel', error));
      socketLog.error('[OPS] Error checking fuel processing:', error);
    }
  });

  // Get jump fuel penalties
  socket.on('ops:getJumpFuelPenalties', (data) => {
    try {
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }
      const { fuelNeeded } = data;
      const penalties = operations.getJumpFuelPenalties(opsSession.shipId, fuelNeeded);
      socket.emit('ops:jumpFuelPenalties', penalties);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Fuel', error));
      socketLog.error('[OPS] Error getting fuel penalties:', error);
    }
  });
}

module.exports = { register };
