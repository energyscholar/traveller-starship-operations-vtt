/**
 * Campaign Management Handlers
 * Handles: getCampaigns, createCampaign, selectCampaign, updateCampaign,
 *          setCurrentSystem, deleteCampaign, renameCampaign, duplicateCampaign,
 *          exportCampaign, importCampaign
 */

/**
 * Register campaign handlers
 * @param {Object} ctx - Shared context from context.js
 */
function register(ctx) {
  const { socket, io, opsSession, operations, validators, checkRateLimit, socketLog, sanitizeError, createHandler } = ctx;

  // AR-108.3: Import cleanup functions for ephemeral state
  const sensorsHandlers = require('./sensors');
  const pilotHandlers = require('./pilot');

  // Get all campaigns (GM login)
  socket.on('ops:getCampaigns', () => {
    const handler = createHandler(
      () => {
        const campaigns = operations.getAllCampaigns();
        // AR-296: Include feedback count for GM login screen
        const feedbackStats = operations.getFeedbackStats();
        const newFeedbackCount = feedbackStats.byStatus?.new || 0;
        return { campaigns, newFeedbackCount };
      },
      {
        eventName: 'ops:getCampaigns',
        logPrefix: 'OPS',
        successEvent: 'ops:campaigns',
        successCallback: (result) => {
          socketLog.info(`[OPS] Retrieved ${result.campaigns.length} campaigns, ${result.newFeedbackCount} new feedback`);
        }
      }
    );
    handler(socket);
  });

  // Create new campaign
  socket.on('ops:createCampaign', (data) => {
    try {
      const rateCheck = checkRateLimit(socket, 'sensitive');
      if (!rateCheck.allowed) {
        socket.emit('ops:error', { message: rateCheck.error });
        return;
      }

      const { name, gmName } = data || {};

      const nameResult = validators.campaignName(name);
      if (!nameResult.valid) {
        socket.emit('ops:error', { message: nameResult.error });
        return;
      }
      const gmResult = validators.playerName(gmName);
      if (!gmResult.valid) {
        socket.emit('ops:error', { message: gmResult.error });
        return;
      }

      const campaign = operations.createCampaign(nameResult.sanitized, gmResult.sanitized);
      socket.emit('ops:campaignCreated', { campaign });
      socketLog.info(`[OPS] Campaign created: ${campaign.id} "${name}" by ${gmName}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Campaign', error));
      socketLog.error('[OPS] Error creating campaign:', error);
    }
  });

  // Select campaign (GM loads campaign data)
  socket.on('ops:selectCampaign', (data) => {
    try {
      const { campaignId } = data || {};

      const idResult = validators.campaignId(campaignId);
      if (!idResult.valid) {
        socket.emit('ops:error', { message: idResult.error });
        return;
      }

      const fullData = operations.getFullCampaignData(campaignId);
      if (!fullData) {
        socket.emit('ops:error', { message: 'Campaign not found' });
        return;
      }
      opsSession.campaignId = campaignId;
      opsSession.isGM = true;
      socket.join(`ops:campaign:${campaignId}`);

      // Auto-assign ship for solo campaigns (only one party ship)
      const partyShips = (fullData.ships || []).filter(s => s.is_party_ship);
      if (partyShips.length === 1) {
        opsSession.shipId = partyShips[0].id;
        opsSession.isSolo = fullData.campaign?.campaign_type?.includes('solo');
      }

      socket.emit('ops:campaignData', fullData);

      // AR-29: Auto-spawn training target if none exists
      const contacts = operations.getContacts(campaignId);
      const hasTrainingTarget = contacts?.some(c => c.training_target);
      if (!hasTrainingTarget) {
        const trainingContact = operations.addContact(campaignId, {
          name: 'Training Target DRN',
          type: 'Asteroid',
          range_band: 'short',
          range_km: 50000,
          bearing: Math.floor(Math.random() * 360),
          signature: 'Low',
          is_targetable: true,
          weapons_free: true,
          health: 20,
          max_health: 20,
          gm_notes: 'Gunnery training target - auto-spawns at session start',
          training_target: true
        });
        io.to(`ops:campaign:${campaignId}`).emit('ops:contactAdded', { contact: trainingContact });
        socketLog.info(`[OPS] Auto-spawned training target for campaign: ${campaignId}`);
      }

      socketLog.info(`[OPS] GM selected campaign: ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Campaign', error));
      socketLog.error('[OPS] Error loading campaign:', error);
    }
  });

  // Update campaign settings
  socket.on('ops:updateCampaign', (data) => {
    try {
      const { campaignId, updates } = data;
      if (!opsSession.isGM || opsSession.campaignId !== campaignId) {
        socket.emit('ops:error', { message: 'Not authorized to update this campaign' });
        return;
      }
      const campaign = operations.updateCampaign(campaignId, updates);
      io.to(`ops:campaign:${campaignId}`).emit('ops:campaignUpdated', { campaign });
      socketLog.info(`[OPS] Campaign updated: ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Campaign', error));
      socketLog.error('[OPS] Error updating campaign:', error);
    }
  });

  // Set current system from TravellerMap lookup
  socket.on('ops:setCurrentSystem', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can set current system' });
        return;
      }
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }
      const { system, uwp, sector, hex } = data;
      if (!system) {
        socket.emit('ops:error', { message: 'System name is required' });
        return;
      }
      const locationDisplay = sector && hex
        ? `${system} (${sector} ${hex})`
        : system;

      // Get current campaign to update location history
      const currentCampaign = operations.getCampaign(opsSession.campaignId);
      let locationHistory = [];
      try {
        locationHistory = JSON.parse(currentCampaign.location_history || '[]');
      } catch { locationHistory = []; }

      // Add to history (keep last 10, avoid duplicates at top)
      const newLocation = { system, uwp, sector, hex, locationDisplay, visitedAt: new Date().toISOString() };
      locationHistory = locationHistory.filter(l => l.locationDisplay !== locationDisplay);
      locationHistory.unshift(newLocation);
      locationHistory = locationHistory.slice(0, 10);

      operations.updateCampaign(opsSession.campaignId, {
        current_system: locationDisplay,
        current_sector: sector || null,
        current_hex: hex || null,
        in_deep_space: 0,
        location_history: JSON.stringify(locationHistory)
      });

      const campaign = operations.getCampaign(opsSession.campaignId);
      const ships = operations.getPartyShips(opsSession.campaignId);
      ships.forEach(ship => {
        operations.addLogEntry(ship.id, opsSession.campaignId, {
          gameDate: campaign.current_date,
          entryType: 'location',
          message: `Current location set to ${locationDisplay}`,
          actor: 'GM'
        });
      });

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:currentSystemUpdated', {
        system,
        uwp,
        sector,
        hex,
        locationDisplay,
        locationHistory
      });

      // AR-29: Auto-spawn training target when entering new system
      const contacts = operations.getContacts(opsSession.campaignId);
      const hasTrainingTarget = contacts?.some(c => c.training_target);
      if (!hasTrainingTarget) {
        const trainingContact = operations.addContact(opsSession.campaignId, {
          name: 'Training Target DRN',
          type: 'Asteroid',
          range_band: 'short',
          range_km: 50000,
          bearing: Math.floor(Math.random() * 360),
          signature: 'Low',
          is_targetable: true,
          weapons_free: true,
          health: 20,
          max_health: 20,
          gm_notes: 'Gunnery training target - auto-spawns at system entry',
          training_target: true
        });
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactAdded', { contact: trainingContact });
        socketLog.info(`[OPS] Auto-spawned training target for system: ${locationDisplay}`);
      }

      socketLog.info(`[OPS] Current system set to: ${locationDisplay}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('System', error));
      socketLog.error('[OPS] Error setting current system:', error);
    }
  });

  // AR-33: Travel to system with time passage
  socket.on('ops:travelToSystem', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can set current system' });
        return;
      }
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }
      const { system, uwp, sector, hex, travelDays = 0 } = data;
      if (!system) {
        socket.emit('ops:error', { message: 'System name is required' });
        return;
      }

      // Advance time if requested
      if (travelDays > 0) {
        const jump = require('../../operations/jump');
        const campaign = operations.getCampaign(opsSession.campaignId);
        const currentDate = campaign.current_date || '1105-001 08:00';
        const newDate = jump.advanceDate(currentDate, travelDays * 24, 0);
        operations.updateCampaign(opsSession.campaignId, { current_date: newDate });

        // Log time advance
        const ships = operations.getPartyShips(opsSession.campaignId);
        ships.forEach(ship => {
          operations.addLogEntry(ship.id, opsSession.campaignId, {
            gameDate: newDate,
            entryType: 'travel',
            message: `Traveled to ${system} (${travelDays} days)`,
            actor: 'GM'
          });
        });

        io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:timeAdvanced', {
          newDate,
          delta: { days: travelDays, hours: 0, minutes: 0 },
          reason: `Travel to ${system}`,
          advancedBy: 'GM'
        });
      }

      // Now set the system (reuse existing logic)
      const locationDisplay = sector && hex ? `${system}` : system;

      // Update location history
      let locationHistory = [];
      const currentCampaign = operations.getCampaign(opsSession.campaignId);
      try {
        locationHistory = JSON.parse(currentCampaign.location_history || '[]');
      } catch { locationHistory = []; }

      const newLocation = { system, uwp, sector, hex, locationDisplay, visitedAt: new Date().toISOString() };
      locationHistory = locationHistory.filter(l => l.locationDisplay !== locationDisplay);
      locationHistory.unshift(newLocation);
      locationHistory = locationHistory.slice(0, 10);

      operations.updateCampaign(opsSession.campaignId, {
        current_system: system,
        current_sector: sector || null,
        current_hex: hex || null,
        in_deep_space: 0,
        location_history: JSON.stringify(locationHistory)
      });

      const updatedCampaign = operations.getCampaign(opsSession.campaignId);
      const ships = operations.getPartyShips(opsSession.campaignId);
      if (travelDays === 0) {
        ships.forEach(ship => {
          operations.addLogEntry(ship.id, opsSession.campaignId, {
            gameDate: updatedCampaign.current_date,
            entryType: 'location',
            message: `Current location set to ${system}`,
            actor: 'GM'
          });
        });
      }

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:currentSystemUpdated', {
        system,
        uwp,
        sector,
        hex,
        locationDisplay: system,
        locationHistory,
        travelDays
      });

      // Auto-spawn training target
      const contacts = operations.getContacts(opsSession.campaignId);
      const hasTrainingTarget = contacts?.some(c => c.training_target);
      if (!hasTrainingTarget) {
        const trainingContact = operations.addContact(opsSession.campaignId, {
          name: 'Training Target DRN',
          type: 'Asteroid',
          range_band: 'short',
          range_km: 50000,
          bearing: Math.floor(Math.random() * 360),
          signature: 'Low',
          is_targetable: true,
          weapons_free: true,
          health: 20,
          max_health: 20,
          gm_notes: 'Gunnery training target - auto-spawns at system entry',
          training_target: true
        });
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactAdded', { contact: trainingContact });
      }

      socketLog.info(`[OPS] Traveled to ${system} (${travelDays} days)`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Travel', error));
      socketLog.error('[OPS] Error traveling to system:', error);
    }
  });

  // GM: Relocate ship to a different star system (with jump emergence effect)
  socket.on('ops:gmRelocateShip', async (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can relocate ships' });
        return;
      }
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }

      const { systemId, systemName, systemHex, locationId, locationName } = data;

      if (!systemName) {
        socket.emit('ops:error', { message: 'System name is required' });
        return;
      }

      // Update campaign current system
      operations.updateCampaign(opsSession.campaignId, {
        current_system: systemName,
        current_hex: systemHex || null,
        in_deep_space: 0
      });

      // Update ship state for all party ships
      const ships = operations.getPartyShips(opsSession.campaignId);
      const campaign = operations.getCampaign(opsSession.campaignId);

      ships.forEach(ship => {
        // Update ship's current state with new location
        const currentState = operations.getShipState(ship.id);
        if (currentState) {
          operations.updateShipState(ship.id, {
            ...currentState,
            systemHex: systemHex || null,
            locationId: locationId || 'loc-exit-jump',
            locationName: locationName || 'Exit Jump Space'
          });
        }

        // Add log entry
        operations.addLogEntry(ship.id, opsSession.campaignId, {
          gameDate: campaign.current_date,
          entryType: 'location',
          message: `Emerged from jump space at ${systemName} - ${locationName}`,
          actor: 'GM'
        });
      });

      // Broadcast to all clients with jump emergence flag
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:shipRelocated', {
        systemId,
        systemName,
        systemHex,
        locationId,
        locationName,
        jumpEmergence: true  // Trigger interstitial on clients
      });

      socketLog.info(`[OPS] GM relocated ship to ${systemName} (${systemHex})`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Relocate', error));
      socketLog.error('[OPS] Error relocating ship:', error);
    }
  });

  // Get location data (history, favorites, home)
  socket.on('ops:getLocationData', () => {
    try {
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }
      const campaign = operations.getCampaign(opsSession.campaignId);
      let locationHistory = [], favoriteLocations = [];
      try { locationHistory = JSON.parse(campaign.location_history || '[]'); } catch { locationHistory = []; }
      try { favoriteLocations = JSON.parse(campaign.favorite_locations || '[]'); } catch { favoriteLocations = []; }

      socket.emit('ops:locationData', {
        homeSystem: campaign.home_system,
        locationHistory,
        favoriteLocations,
        inDeepSpace: !!campaign.in_deep_space,
        deepSpaceReference: campaign.deep_space_reference,
        deepSpaceBearing: campaign.deep_space_bearing,
        deepSpaceDistance: campaign.deep_space_distance
      });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Location', error));
    }
  });

  // Set home system
  socket.on('ops:setHomeSystem', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can set home system' });
        return;
      }
      const { locationDisplay } = data;
      operations.updateCampaign(opsSession.campaignId, { home_system: locationDisplay });
      socket.emit('ops:homeSystemSet', { homeSystem: locationDisplay });
      socketLog.info(`[OPS] Home system set to: ${locationDisplay}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Location', error));
    }
  });

  // Toggle favorite location
  socket.on('ops:toggleFavoriteLocation', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can manage favorites' });
        return;
      }
      const { location } = data;
      const campaign = operations.getCampaign(opsSession.campaignId);
      let favorites = [];
      try { favorites = JSON.parse(campaign.favorite_locations || '[]'); } catch { favorites = []; }

      const existingIndex = favorites.findIndex(f => f.locationDisplay === location.locationDisplay);
      if (existingIndex >= 0) {
        favorites.splice(existingIndex, 1);
      } else {
        favorites.push(location);
      }

      operations.updateCampaign(opsSession.campaignId, { favorite_locations: JSON.stringify(favorites) });
      socket.emit('ops:favoritesUpdated', { favoriteLocations: favorites });
      socketLog.info(`[OPS] Favorite toggled: ${location.locationDisplay}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Location', error));
    }
  });

  // Set deep space mode
  socket.on('ops:setDeepSpace', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can set deep space mode' });
        return;
      }
      const { enabled, referenceSystem, bearing, distance } = data;

      operations.updateCampaign(opsSession.campaignId, {
        in_deep_space: enabled ? 1 : 0,
        deep_space_reference: referenceSystem || null,
        deep_space_bearing: bearing || null,
        deep_space_distance: distance || null,
        current_system: enabled ? `Deep Space (${distance || 0} AU from ${referenceSystem || 'Unknown'})` : null
      });

      const campaign = operations.getCampaign(opsSession.campaignId);
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:deepSpaceUpdated', {
        inDeepSpace: enabled,
        referenceSystem,
        bearing,
        distance,
        locationDisplay: campaign.current_system
      });
      socketLog.info(`[OPS] Deep space mode: ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Location', error));
    }
  });

  // Delete campaign
  socket.on('ops:deleteCampaign', (data) => {
    try {
      const rateCheck = checkRateLimit(socket, 'sensitive');
      if (!rateCheck.allowed) {
        socket.emit('ops:error', { message: rateCheck.error });
        return;
      }

      const { campaignId } = data || {};

      const idResult = validators.campaignId(campaignId);
      if (!idResult.valid) {
        socket.emit('ops:error', { message: idResult.error });
        return;
      }

      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can delete campaigns' });
        return;
      }
      operations.deleteCampaign(campaignId);
      // AR-108.3: Clean up ephemeral state for deleted campaign
      sensorsHandlers.clearCampaignState(campaignId);
      pilotHandlers.clearCampaignState(campaignId);
      socket.emit('ops:campaignDeleted', { campaignId });
      socketLog.info(`[OPS] Campaign deleted: ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Campaign', error));
      socketLog.error('[OPS] Error deleting campaign:', error);
    }
  });

  // Rename campaign
  socket.on('ops:renameCampaign', (data) => {
    try {
      const rateCheck = checkRateLimit(socket, 'sensitive');
      if (!rateCheck.allowed) {
        socket.emit('ops:error', { message: rateCheck.error });
        return;
      }

      const { campaignId, newName } = data || {};

      const idResult = validators.campaignId(campaignId);
      if (!idResult.valid) {
        socket.emit('ops:error', { message: idResult.error });
        return;
      }

      if (!newName || typeof newName !== 'string' || newName.trim().length < 1 || newName.length > 100) {
        socket.emit('ops:error', { message: 'Invalid campaign name' });
        return;
      }

      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can rename campaigns' });
        return;
      }

      const updated = operations.updateCampaign(campaignId, { name: newName.trim() });
      io.to(`ops:campaign:${campaignId}`).emit('ops:campaignRenamed', { campaignId, name: updated.name });
      socketLog.info(`[OPS] Campaign renamed: ${campaignId} -> "${updated.name}"`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Campaign', error));
      socketLog.error('[OPS] Error renaming campaign:', error);
    }
  });

  // Duplicate campaign
  socket.on('ops:duplicateCampaign', (data) => {
    try {
      const rateCheck = checkRateLimit(socket, 'sensitive');
      if (!rateCheck.allowed) {
        socket.emit('ops:error', { message: rateCheck.error });
        return;
      }

      const { campaignId } = data || {};

      const idResult = validators.campaignId(campaignId);
      if (!idResult.valid) {
        socket.emit('ops:error', { message: idResult.error });
        return;
      }

      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can duplicate campaigns' });
        return;
      }

      const newCampaign = operations.duplicateCampaign(campaignId);
      socket.emit('ops:campaignDuplicated', { campaign: newCampaign });
      socketLog.info(`[OPS] Campaign duplicated: ${campaignId} -> ${newCampaign.id}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Campaign', error));
      socketLog.error('[OPS] Error duplicating campaign:', error);
    }
  });

  // Export campaign to JSON
  socket.on('ops:exportCampaign', (data) => {
    try {
      const { campaignId } = data || {};

      const idResult = validators.campaignId(campaignId);
      if (!idResult.valid) {
        socket.emit('ops:error', { message: idResult.error });
        return;
      }

      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can export campaigns' });
        return;
      }

      const exportData = operations.exportCampaign(campaignId);
      socket.emit('ops:campaignExported', { data: exportData });
      socketLog.info(`[OPS] Campaign exported: ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Campaign', error));
      socketLog.error('[OPS] Error exporting campaign:', error);
    }
  });

  // Import campaign from JSON
  socket.on('ops:importCampaign', (data) => {
    try {
      const rateCheck = checkRateLimit(socket, 'sensitive');
      if (!rateCheck.allowed) {
        socket.emit('ops:error', { message: rateCheck.error });
        return;
      }

      const { campaignData, gmName } = data || {};

      if (!campaignData || typeof campaignData !== 'object') {
        socket.emit('ops:error', { message: 'Invalid campaign data' });
        return;
      }

      if (!gmName || typeof gmName !== 'string' || gmName.trim().length < 1) {
        socket.emit('ops:error', { message: 'GM name required' });
        return;
      }

      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can import campaigns' });
        return;
      }

      const newCampaign = operations.importCampaign(campaignData, gmName.trim());
      socket.emit('ops:campaignImported', { campaign: newCampaign });
      socketLog.info(`[OPS] Campaign imported: ${newCampaign.id}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Campaign', error));
      socketLog.error('[OPS] Error importing campaign:', error);
    }
  });

}

module.exports = { register };
