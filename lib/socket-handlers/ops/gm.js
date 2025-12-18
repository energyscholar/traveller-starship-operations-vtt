/**
 * GM Mode Handlers
 * Handles: god mode (updateShip, addContact, repairAll, refuel, clearContacts),
 *          prep panel (getPrepData, reveals, NPCs, locations, events, email/handouts),
 *          hailing, puppetry debug, and AR-186 GM roll modifier
 */

const { setGmModifier, getGmModifier, clearGmModifier } = require('../roll-broadcast');
const { getRandomFailure, getFailureById, severityToNumber } = require('../../operations/failure-reasons');

/**
 * Register GM handlers
 * @param {Object} ctx - Shared context from context.js
 */
function register(ctx) {
  const { socket, io, opsSession, operations, socketLog, sanitizeError } = ctx;

  // --- God Mode Handlers ---

  socket.on('ops:godModeUpdateShip', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'God mode requires GM privileges' });
        return;
      }
      const { shipId, updates } = data;
      const ship = operations.getShip(shipId);
      if (!ship) {
        socket.emit('ops:error', { message: 'Ship not found' });
        return;
      }
      const newState = { ...ship.current_state, ...updates };
      operations.updateShipState(shipId, newState);
      io.to(`ops:bridge:${shipId}`).emit('ops:shipStateUpdate', {
        shipId,
        current_state: newState
      });
      socketLog.info(`[OPS] God mode: Ship ${shipId} state updated by GM`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Ship', error));
      socketLog.error('[OPS] Error in godModeUpdateShip:', error);
    }
  });

  socket.on('ops:godModeAddContact', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'God mode requires GM privileges' });
        return;
      }
      const { campaignId, contact } = data;
      const newContact = operations.addContact(campaignId, contact);
      io.to(`ops:campaign:${campaignId}`).emit('ops:contactAdded', { contact: newContact });
      socketLog.info(`[OPS] God mode: Contact added to campaign ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Contact', error));
      socketLog.error('[OPS] Error in godModeAddContact:', error);
    }
  });

  socket.on('ops:godModeRepairAll', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'God mode requires GM privileges' });
        return;
      }
      const { shipId } = data;
      const ship = operations.getShip(shipId);
      if (!ship) {
        socket.emit('ops:error', { message: 'Ship not found' });
        return;
      }
      const systems = ship.current_state?.systems || {};
      const repairedSystems = {};
      for (const [name, system] of Object.entries(systems)) {
        repairedSystems[name] = { ...system, status: 'operational', health: 100, issue: null };
      }
      const maxHull = ship.ship_data?.hull?.hullPoints || 40;
      const newState = { ...ship.current_state, hullPoints: maxHull, systems: repairedSystems };
      operations.updateShipState(shipId, newState);
      io.to(`ops:bridge:${shipId}`).emit('ops:shipStateUpdate', { shipId, current_state: newState });
      socketLog.info(`[OPS] God mode: All systems repaired on ${shipId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('System', error));
      socketLog.error('[OPS] Error in godModeRepairAll:', error);
    }
  });

  socket.on('ops:godModeRefuel', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'God mode requires GM privileges' });
        return;
      }
      const { shipId } = data;
      const ship = operations.getShip(shipId);
      if (!ship) {
        socket.emit('ops:error', { message: 'Ship not found' });
        return;
      }
      const maxFuel = ship.ship_data?.fuel?.capacity || 40;
      const newState = { ...ship.current_state, fuel: maxFuel };
      operations.updateShipState(shipId, newState);
      io.to(`ops:bridge:${shipId}`).emit('ops:shipStateUpdate', { shipId, current_state: newState });
      socketLog.info(`[OPS] God mode: Ship ${shipId} fully refueled`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Fuel', error));
      socketLog.error('[OPS] Error in godModeRefuel:', error);
    }
  });

  socket.on('ops:godModeClearContacts', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'God mode requires GM privileges' });
        return;
      }
      const { campaignId } = data;
      operations.clearCampaignContacts(campaignId);
      io.to(`ops:campaign:${campaignId}`).emit('ops:contactsCleared', { campaignId });
      socketLog.info(`[OPS] God mode: All contacts cleared in campaign ${campaignId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Contact', error));
      socketLog.error('[OPS] Error in godModeClearContacts:', error);
    }
  });

  // --- AR-194: Break System (GM Tool) ---

  socket.on('ops:breakSystem', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Break system requires GM privileges' });
        return;
      }
      const { shipId, system, severity, failureId } = data;
      const targetShipId = shipId || opsSession.shipId;

      if (!targetShipId) {
        socket.emit('ops:error', { message: 'No ship specified' });
        return;
      }

      // Get failure reason (by ID or random for system)
      let failure = null;
      if (failureId) {
        failure = getFailureById(failureId);
      } else if (system) {
        failure = getRandomFailure(system);
      }

      // Determine severity: explicit > failure-based > random 1-3
      let actualSeverity = severity;
      if (!actualSeverity && failure) {
        actualSeverity = severityToNumber(failure.severity);
      }
      if (!actualSeverity) {
        actualSeverity = Math.ceil(Math.random() * 3);
      }

      // Apply damage using existing system
      const targetSystem = system || (failure ? failure.system : null);
      if (!targetSystem) {
        socket.emit('ops:error', { message: 'No system specified' });
        return;
      }

      const result = operations.applySystemDamage(targetShipId, targetSystem, actualSeverity, failure);

      if (!result.success) {
        socket.emit('ops:error', { message: result.error });
        return;
      }

      // Broadcast to bridge crew
      io.to(`ops:bridge:${targetShipId}`).emit('ops:systemBroken', {
        system: targetSystem,
        severity: actualSeverity,
        failure: failure ? {
          id: failure.id,
          name: failure.name,
          description: failure.description,
          flavorText: failure.flavorText,
          effect: failure.effect
        } : null,
        result
      });

      // Emit ship state update for UI refresh
      const ship = operations.getShip(targetShipId);
      io.to(`ops:bridge:${targetShipId}`).emit('ops:shipStateUpdate', {
        shipId: targetShipId,
        current_state: ship.current_state
      });

      socketLog.info(`[OPS] GM broke ${targetSystem} on ${targetShipId} (severity ${actualSeverity}${failure ? `, ${failure.name}` : ''})`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('System', error));
      socketLog.error('[OPS] Error in breakSystem:', error);
    }
  });

  // --- Hail Contact ---

  socket.on('ops:hailContact', (data) => {
    try {
      const { contactId } = data;

      if (!opsSession.shipId) {
        socket.emit('ops:hailResult', { success: false, message: 'Not on a ship' });
        return;
      }

      const canHail = opsSession.role === 'captain' || opsSession.role === 'sensor_operator' || opsSession.isGM;
      if (!canHail) {
        socket.emit('ops:hailResult', { success: false, message: 'Only Captain or Sensor Operator can hail' });
        return;
      }

      const contact = operations.getContact(contactId);
      if (!contact) {
        socket.emit('ops:hailResult', { success: false, message: 'Contact not found' });
        return;
      }

      if (!contact.transponder || contact.transponder === 'NONE') {
        socket.emit('ops:hailResult', { success: false, message: 'Cannot hail - no transponder' });
        return;
      }

      const campaign = operations.getCampaign(opsSession.campaignId);
      const transponder = contact.transponder;

      const outgoingEntry = operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'comms',
        message: `Hailing ${transponder}...`,
        actor: opsSession.role
      });

      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:logEntry', { entry: outgoingEntry });

      const isStarport = contact.type === 'Station' || contact.type === 'starport' ||
                         contact.type === 'Starport' || transponder.toLowerCase().includes('starport');

      if (isStarport) {
        const starportName = transponder.replace(/^(Starport\s+)/i, '');
        const trafficControlName = `Traffic Control at ${transponder}`;
        const emailSlug = starportName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const emailAddress = `traffic-control@${emailSlug}.net`;

        const existingContacts = operations.getNPCContactsForPlayer(opsSession.campaignId, opsSession.accountId);
        const existingTC = existingContacts.find(c => c.name === trafficControlName || c.title?.includes(transponder));

        let message;
        let newContact = false;

        if (existingTC) {
          message = `${transponder} Traffic Control returns your hail. You already have email contact info.`;
        } else {
          operations.addNPCContact(opsSession.campaignId, {
            name: trafficControlName,
            title: `Traffic Control (${emailAddress})`,
            location: transponder,
            description: `Traffic Control for ${transponder}. Contact: ${emailAddress}`,
            loyalty: 0,
            visibleTo: [opsSession.accountId]
          });
          newContact = true;
          message = `${transponder} Traffic Control hails you. You now have email contact info for Traffic Control at ${transponder}.`;
        }

        const logEntry = operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
          gameDate: campaign.current_date,
          entryType: 'comms',
          message: message,
          actor: 'COMMS'
        });

        io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:logEntry', { entry: logEntry });
        socket.emit('ops:hailResult', { success: true, message, newContact });
        socketLog.info(`[OPS] Hail response from ${transponder}: Traffic Control`);

      } else if (contact.captain_name) {
        const captainName = contact.captain_name;
        const existingContacts = operations.getNPCContactsForPlayer(opsSession.campaignId, opsSession.accountId);
        const existingCaptain = existingContacts.find(c => c.name === captainName);

        let message;
        let newContact = false;

        if (existingCaptain) {
          message = `Captain ${captainName} of ${transponder} returns your hail. You already have their email contact.`;
        } else {
          operations.addNPCContact(opsSession.campaignId, {
            name: captainName,
            title: `Captain of ${transponder}`,
            location: contact.type || 'Ship',
            description: `Captain of the ${contact.type || 'vessel'} ${transponder}`,
            loyalty: 0,
            visibleTo: [opsSession.accountId]
          });
          newContact = true;
          message = `Captain ${captainName} hails you. You now have Captain ${captainName}'s contact info for email.`;
        }

        const logEntry = operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
          gameDate: campaign.current_date,
          entryType: 'comms',
          message: message,
          actor: 'COMMS'
        });

        io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:logEntry', { entry: logEntry });
        socket.emit('ops:hailResult', { success: true, message, newContact });
        socketLog.info(`[OPS] Hail response from ${transponder}: ${captainName}`);
      } else {
        const noResponseMsg = `No response from ${transponder}.`;

        const logEntry = operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
          gameDate: campaign.current_date,
          entryType: 'comms',
          message: noResponseMsg,
          actor: 'COMMS'
        });

        io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:logEntry', { entry: logEntry });
        socket.emit('ops:hailResult', { success: true, message: noResponseMsg, newContact: false });
        socketLog.info(`[OPS] No response from ${transponder} (no captain_name set)`);
      }
    } catch (error) {
      socket.emit('ops:hailResult', { success: false, message: 'Hail failed: ' + error.message });
      socketLog.error('[OPS] Error hailing contact:', error);
    }
  });

  // --- Broadcast Message ---
  socket.on('ops:broadcastMessage', (data) => {
    try {
      const { message } = data;

      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }

      const canBroadcast = opsSession.role === 'captain' || opsSession.role === 'sensor_operator' || opsSession.isGM;
      if (!canBroadcast) {
        socket.emit('ops:error', { message: 'Only Captain or Sensor Operator can broadcast' });
        return;
      }

      const campaign = operations.getCampaign(opsSession.campaignId);
      const ship = operations.getShip(opsSession.shipId);
      const shipName = ship?.name || 'Unknown Ship';

      const logEntry = operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'comms',
        message: `[BROADCAST] ${shipName}: "${message}"`,
        actor: opsSession.role
      });

      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:logEntry', { entry: logEntry });
      socketLog.info(`[OPS] Broadcast from ${shipName}: ${message}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Broadcast failed: ' + error.message });
      socketLog.error('[OPS] Error broadcasting:', error);
    }
  });

  // --- Send Message to Contact ---
  socket.on('ops:sendMessage', (data) => {
    try {
      const { contactId, message } = data;

      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }

      const canSend = opsSession.role === 'captain' || opsSession.role === 'sensor_operator' || opsSession.isGM;
      if (!canSend) {
        socket.emit('ops:error', { message: 'Only Captain or Sensor Operator can send messages' });
        return;
      }

      const contact = operations.getContact(contactId);
      if (!contact) {
        socket.emit('ops:error', { message: 'Contact not found' });
        return;
      }

      const campaign = operations.getCampaign(opsSession.campaignId);
      const contactName = contact.transponder || contact.name || 'Unknown Contact';

      const logEntry = operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'comms',
        message: `[TO ${contactName}] "${message}"`,
        actor: opsSession.role
      });

      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:logEntry', { entry: logEntry });
      socketLog.info(`[OPS] Message to ${contactName}: ${message}`);
    } catch (error) {
      socket.emit('ops:error', { message: 'Send failed: ' + error.message });
      socketLog.error('[OPS] Error sending message:', error);
    }
  });

  // --- GM Prep Panel ---

  socket.on('ops:getPrepData', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can access prep data' });
        return;
      }
      const campaignId = data.campaignId || opsSession.campaignId;

      const reveals = operations.getRevealsByCampaign(campaignId);
      const formattedReveals = reveals.map(r => ({
        id: r.id,
        title: r.title,
        type: r.category,
        description: r.full_text || r.summary,
        target: r.visible_to?.length > 0 ? 'partial' : null,
        notes: r.summary,
        status: r.visibility === 'hidden' ? 'ready' : 'revealed'
      }));

      const npcs = operations.getNPCDossiersByCampaign(campaignId);
      const locations = operations.getLocationsByCampaign(campaignId);
      const events = operations.getEventsByCampaign(campaignId);
      const drafts = operations.getDrafts(campaignId);
      const queued = operations.getQueuedEmails(campaignId);
      const sentMail = operations.getMailByCampaign(campaignId).filter(m => m.status === 'sent');
      const handouts = operations.getHandoutsByCampaign(campaignId);

      socket.emit('ops:prepData', {
        reveals: formattedReveals,
        npcs,
        locations,
        events,
        emails: { drafts, queued, sent: sentMail },
        handouts
      });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Prep', error));
      socketLog.error('[OPS] Error getting prep data:', error);
    }
  });

  socket.on('ops:addReveal', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can add reveals' });
        return;
      }
      const reveal = operations.createReveal(data.campaignId, {
        title: data.title,
        category: data.type || 'plot',
        summary: data.notes,
        fullText: data.description
      });
      const formatted = {
        id: reveal.id,
        title: reveal.title,
        type: reveal.category,
        description: reveal.full_text,
        target: data.target,
        notes: reveal.summary,
        status: 'ready'
      };
      socket.emit('ops:revealAdded', { reveal: formatted });
      socketLog.info(`[OPS] Reveal added: ${data.title}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Reveal', error));
      socketLog.error('[OPS] Error adding reveal:', error);
    }
  });

  socket.on('ops:updateReveal', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can update reveals' });
        return;
      }
      const reveal = operations.updateReveal(data.revealId, {
        title: data.title,
        category: data.type,
        summary: data.notes,
        fullText: data.description
      });
      const formatted = {
        id: reveal.id,
        title: reveal.title,
        type: reveal.category,
        description: reveal.full_text,
        target: data.target,
        notes: reveal.summary,
        status: reveal.visibility === 'hidden' ? 'ready' : 'revealed'
      };
      socket.emit('ops:revealUpdated', { reveal: formatted });
      socketLog.info(`[OPS] Reveal updated: ${data.title}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Reveal', error));
      socketLog.error('[OPS] Error updating reveal:', error);
    }
  });

  socket.on('ops:deleteReveal', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can delete reveals' });
        return;
      }
      operations.deleteReveal(data.revealId);
      socket.emit('ops:revealDeleted', { revealId: data.revealId });
      socketLog.info(`[OPS] Reveal deleted: ${data.revealId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Reveal', error));
      socketLog.error('[OPS] Error deleting reveal:', error);
    }
  });

  socket.on('ops:executeReveal', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can execute reveals' });
        return;
      }
      const reveal = operations.getReveal(data.revealId);
      if (!reveal) {
        socket.emit('ops:error', { message: 'Reveal not found' });
        return;
      }

      operations.revealToAll(data.revealId);
      socket.emit('ops:revealExecuted', { revealId: data.revealId, title: reveal.title });
      io.to(`ops:campaign:${data.campaignId}`).emit('ops:playerReveal', {
        type: reveal.category,
        content: reveal.full_text || reveal.summary
      });
      socketLog.info(`[OPS] Reveal executed: ${reveal.title}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Reveal', error));
      socketLog.error('[OPS] Error executing reveal:', error);
    }
  });

  socket.on('ops:revealNPC', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can reveal NPCs' });
        return;
      }
      const npc = operations.revealNPC(data.npcId);
      socket.emit('ops:npcRevealed', { npcId: data.npcId, name: npc.name });
      socketLog.info(`[OPS] NPC revealed: ${npc.name}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('NPC', error));
    }
  });

  socket.on('ops:revealLocation', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can reveal locations' });
        return;
      }
      const loc = operations.revealLocation(data.locationId);
      socket.emit('ops:locationRevealed', { locationId: data.locationId, name: loc.name });
      socketLog.info(`[OPS] Location revealed: ${loc.name}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Reveal', error));
    }
  });

  socket.on('ops:triggerEvent', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can trigger events' });
        return;
      }
      const event = operations.getEvent(data.eventId);
      if (!event) {
        socket.emit('ops:error', { message: 'Event not found' });
        return;
      }

      operations.triggerEvent(data.eventId, data.gameDate);

      const cascadeResults = { reveals: 0, npcs: 0, emails: 0 };
      for (const revealId of event.reveals_to_trigger || []) {
        operations.revealToAll(revealId);
        cascadeResults.reveals++;
      }
      for (const npcId of event.npcs_to_reveal || []) {
        operations.revealNPC(npcId);
        cascadeResults.npcs++;
      }
      for (const emailId of event.emails_to_send || []) {
        cascadeResults.emails++;
      }

      socket.emit('ops:eventTriggered', {
        eventId: data.eventId,
        name: event.name,
        cascadeResults
      });

      if (event.player_text) {
        io.to(`ops:campaign:${data.campaignId}`).emit('ops:playerReveal', {
          type: 'event',
          content: event.player_text
        });
      }

      socketLog.info(`[OPS] Event triggered: ${event.name} (${cascadeResults.reveals} reveals, ${cascadeResults.npcs} NPCs)`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Event', error));
      socketLog.error('[OPS] Error triggering event:', error);
    }
  });

  socket.on('ops:sendEmail', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can send emails' });
        return;
      }
      const mail = operations.sendQueuedEmail(data.emailId, data.sentDate, data.deliveryDate);
      socket.emit('ops:emailSent', { emailId: data.emailId, subject: mail.subject });
      socketLog.info(`[OPS] Email sent: ${mail.subject}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Mail', error));
    }
  });

  socket.on('ops:queueEmail', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can queue emails' });
        return;
      }
      operations.queueEmail(data.emailId, data.queuedForDate);
      socket.emit('ops:emailQueued', { emailId: data.emailId, queuedForDate: data.queuedForDate });
      socketLog.info(`[OPS] Email queued for ${data.queuedForDate}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Mail', error));
    }
  });

  socket.on('ops:shareHandout', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can share handouts' });
        return;
      }
      const handout = operations.shareHandout(data.handoutId);
      socket.emit('ops:handoutShared', { handoutId: data.handoutId, title: handout.title });
      socketLog.info(`[OPS] Handout shared: ${handout.title}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Handout', error));
    }
  });

  // --- Puppetry Debug System ---
  const puppetryRequests = new Map();

  socket.on('puppetry:send', (data) => {
    const { targetSocketId, code, action, params } = data;
    const requestId = `${socket.id}-${Date.now()}`;

    if (data.expectResult) {
      puppetryRequests.set(requestId, {
        resolve: null,
        timer: setTimeout(() => {
          puppetryRequests.delete(requestId);
        }, 10000)
      });
    }

    if (targetSocketId) {
      if (code) {
        io.to(targetSocketId).emit('puppetry:eval', { code, requestId });
      } else if (action) {
        io.to(targetSocketId).emit('puppetry:action', { action, params, requestId });
      }
    } else if (opsSession.campaignId) {
      if (code) {
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('puppetry:eval', { code, requestId });
      } else if (action) {
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('puppetry:action', { action, params, requestId });
      }
    }

    socketLog.info(`[PUPPETRY] Command sent: ${code || action}`);
  });

  socket.on('puppetry:result', (data) => {
    const { requestId, success, result, error } = data;
    socketLog.info(`[PUPPETRY] Result from ${socket.id}: ${success ? 'OK' : 'ERROR'} - ${result || error}`);
    console.log(`[PUPPETRY RESULT] ${socket.id}: ${JSON.stringify(data)}`);
  });

  // --- AR-36: No-Fuel Mode Toggle ---

  socket.on('ops:setNoFuelMode', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'No-fuel mode requires GM privileges' });
        return;
      }
      const { enabled } = data;
      operations.setNoFuelMode(enabled);
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:noFuelModeChanged', { enabled });
      socketLog.info(`[OPS] No-fuel mode ${enabled ? 'ENABLED' : 'disabled'} by GM`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('NoFuelMode', error));
      socketLog.error('[OPS] Error in setNoFuelMode:', error);
    }
  });

  socket.on('ops:getNoFuelMode', () => {
    try {
      const enabled = operations.getNoFuelMode();
      socket.emit('ops:noFuelModeStatus', { enabled });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('NoFuelMode', error));
    }
  });

  // --- AR-124: Position Verification Toggle ---

  socket.on('ops:setRequirePositionVerification', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Requires GM privileges' });
        return;
      }
      const { enabled } = data;
      operations.updateCampaign(opsSession.campaignId, { require_position_verification: enabled ? 1 : 0 });
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:positionVerificationSettingChanged', { enabled });
      socketLog.info(`[OPS] Position verification requirement ${enabled ? 'ENABLED' : 'disabled'} by GM`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Settings', error));
      socketLog.error('[OPS] Error in setRequirePositionVerification:', error);
    }
  });

  socket.on('ops:getRequirePositionVerification', () => {
    try {
      const campaign = operations.getCampaign(opsSession.campaignId);
      // Default to true if not set
      const enabled = campaign.require_position_verification !== 0;
      socket.emit('ops:positionVerificationStatus', { enabled });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Settings', error));
    }
  });

  // --- AR-140: Adventure Module Handlers ---

  const modules = require('../../operations/modules');

  socket.on('ops:getModules', () => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Module management requires GM privileges' });
        return;
      }
      const moduleList = modules.getModulesByCampaign(opsSession.campaignId);
      socket.emit('ops:moduleList', { modules: moduleList });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Modules', error));
      socketLog.error('[OPS] Error in getModules:', error);
    }
  });

  socket.on('ops:importModule', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Module import requires GM privileges' });
        return;
      }
      const { adventureData, moduleName } = data;
      const result = modules.importAdventureAsModule(opsSession.campaignId, adventureData, moduleName);
      socket.emit('ops:moduleImported', result);
      socketLog.info(`[OPS] Module imported: ${result.moduleName}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Module Import', error));
      socketLog.error('[OPS] Error in importModule:', error);
    }
  });

  socket.on('ops:toggleModule', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Module management requires GM privileges' });
        return;
      }
      const { moduleId, isActive } = data;
      const module = modules.setModuleActive(moduleId, isActive);
      socket.emit('ops:moduleUpdated', { module });
      socketLog.info(`[OPS] Module ${moduleId} ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Module', error));
      socketLog.error('[OPS] Error in toggleModule:', error);
    }
  });

  socket.on('ops:deleteModule', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Module deletion requires GM privileges' });
        return;
      }
      const { moduleId } = data;
      const result = modules.deleteModule(moduleId);
      socket.emit('ops:moduleDeleted', { moduleId, ...result });
      socketLog.info(`[OPS] Module ${moduleId} deleted`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Module', error));
      socketLog.error('[OPS] Error in deleteModule:', error);
    }
  });

  socket.on('ops:getModuleSummary', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Module access requires GM privileges' });
        return;
      }
      const { moduleId } = data;
      const summary = modules.getModuleSummary(moduleId);
      socket.emit('ops:moduleSummary', { summary });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Module', error));
      socketLog.error('[OPS] Error in getModuleSummary:', error);
    }
  });

  socket.on('ops:unlockContent', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Content unlock requires GM privileges' });
        return;
      }
      const { contentId } = data;
      modules.unlockContent(contentId);
      socket.emit('ops:contentUnlocked', { contentId });
      socketLog.info(`[OPS] Content ${contentId} unlocked`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Content', error));
      socketLog.error('[OPS] Error in unlockContent:', error);
    }
  });

  // --- AR-186: GM Roll Modifier ---

  socket.on('ops:setGmModifier', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'GM modifier requires GM privileges' });
        return;
      }
      const { dm, reason, persistent } = data;
      const campaignId = opsSession.campaignId;
      setGmModifier(campaignId, dm || 0, reason || '', persistent || false);
      io.to(`ops:campaign:${campaignId}`).emit('ops:gmModifierSet', { dm, reason, persistent });
      socketLog.info(`[OPS] GM modifier set: ${dm >= 0 ? '+' : ''}${dm}${reason ? ` (${reason})` : ''}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Modifier', error));
      socketLog.error('[OPS] Error in setGmModifier:', error);
    }
  });

  socket.on('ops:clearGmModifier', () => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'GM modifier requires GM privileges' });
        return;
      }
      const campaignId = opsSession.campaignId;
      clearGmModifier(campaignId);
      io.to(`ops:campaign:${campaignId}`).emit('ops:gmModifierCleared');
      socketLog.info('[OPS] GM modifier cleared');
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Modifier', error));
      socketLog.error('[OPS] Error in clearGmModifier:', error);
    }
  });

  socket.on('ops:getGmModifier', () => {
    try {
      const campaignId = opsSession.campaignId;
      const modifier = getGmModifier(campaignId);
      socket.emit('ops:gmModifierState', modifier);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Modifier', error));
    }
  });
}

module.exports = { register };
