/**
 * Sensor/Contact Handlers
 * Handles: getContacts, addContact, updateContact, deleteContact,
 *          sensorScan, scanContact, getTargetableContacts, authorizeWeapons, fireAtContact
 */

// AR-29: Training target respawn timers (campaignId -> timeout)
const trainingTargetRespawnTimers = new Map();
const TRAINING_TARGET_RESPAWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Schedule training target respawn for a campaign
 * @param {Object} io - Socket.IO server
 * @param {Object} operations - Operations module
 * @param {string} campaignId - Campaign ID
 * @param {Object} socketLog - Logger
 */
function scheduleTrainingTargetRespawn(io, operations, campaignId, socketLog) {
  // Clear existing timer if any
  if (trainingTargetRespawnTimers.has(campaignId)) {
    clearTimeout(trainingTargetRespawnTimers.get(campaignId));
  }

  const timer = setTimeout(() => {
    try {
      // Check if campaign still exists and doesn't already have a training target
      const contacts = operations.getContacts(campaignId);
      if (!contacts) return; // Campaign deleted

      const hasTrainingTarget = contacts.some(c => c.training_target);
      if (hasTrainingTarget) return; // Already has one

      // Spawn new training target
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
        gm_notes: 'Gunnery training target - respawned after destruction',
        training_target: true
      });

      io.to(`ops:campaign:${campaignId}`).emit('ops:contactAdded', { contact: trainingContact });
      io.to(`ops:campaign:${campaignId}`).emit('ops:trainingTargetRespawned', { contact: trainingContact });
      socketLog.info(`[OPS] Training target respawned for campaign: ${campaignId}`);
    } catch (error) {
      socketLog.error(`[OPS] Error respawning training target: ${error.message}`);
    } finally {
      trainingTargetRespawnTimers.delete(campaignId);
    }
  }, TRAINING_TARGET_RESPAWN_MS);

  trainingTargetRespawnTimers.set(campaignId, timer);
  socketLog.info(`[OPS] Training target respawn scheduled in 5 minutes for campaign: ${campaignId}`);
}

/**
 * Register sensor handlers
 * @param {Object} ctx - Shared context from context.js
 */
function register(ctx) {
  const { socket, io, opsSession, operations, socketLog, sanitizeError } = ctx;

  // Get contacts
  socket.on('ops:getContacts', () => {
    try {
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'Not in a campaign' });
        return;
      }
      let contacts;
      if (opsSession.isGM) {
        contacts = operations.getContactsByCampaign(opsSession.campaignId);
      } else {
        contacts = operations.getVisibleContacts(opsSession.campaignId, opsSession.shipId);
      }
      socket.emit('ops:contacts', { contacts });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Contact', error));
      socketLog.error('[OPS] Error getting contacts:', error);
    }
  });

  // Add contact (GM only)
  socket.on('ops:addContact', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can add contacts' });
        return;
      }
      const contact = operations.addContact(opsSession.campaignId, data);
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactAdded', { contact });
      socketLog.info(`[OPS] Contact added: ${contact.id} "${contact.name || contact.type}"`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Contact', error));
      socketLog.error('[OPS] Error adding contact:', error);
    }
  });

  // Update contact (GM only)
  socket.on('ops:updateContact', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can update contacts' });
        return;
      }
      const { contactId, ...updates } = data;
      const contact = operations.updateContact(contactId, updates);
      if (!contact) {
        socket.emit('ops:error', { message: 'Contact not found' });
        return;
      }
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactUpdated', { contact });
      socketLog.info(`[OPS] Contact updated: ${contactId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Contact', error));
      socketLog.error('[OPS] Error updating contact:', error);
    }
  });

  // Delete contact (GM only)
  // Note: GM manual deletion does NOT trigger training target respawn - only combat destruction does
  socket.on('ops:deleteContact', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can delete contacts' });
        return;
      }
      const { contactId } = data;
      const deleted = operations.deleteContact(contactId);
      if (deleted) {
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactDeleted', { contactId });
        socketLog.info(`[OPS] Contact deleted: ${contactId}`);
      }
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Contact', error));
      socketLog.error('[OPS] Error deleting contact:', error);
    }
  });

  // Sensor scan
  socket.on('ops:sensorScan', (data) => {
    try {
      if (opsSession.role !== 'sensor_operator' && !opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only Sensor Operator can perform scans' });
        return;
      }
      const { scanType = 'passive' } = data;
      const scanLevelMap = { passive: 1, active: 2, deep: 3 };
      const scanLevel = scanLevelMap[scanType] || 1;

      let allContacts = opsSession.isGM
        ? operations.getContactsByCampaign(opsSession.campaignId)
        : operations.getVisibleContacts(opsSession.campaignId, opsSession.shipId);

      let contacts;
      let scanDescription;

      switch (scanType) {
        case 'passive':
          contacts = allContacts.filter(c =>
            c.celestial ||
            (c.transponder && c.transponder !== 'NONE')
          );
          scanDescription = 'Passive scan: Celestial objects and transponder signals detected';
          break;

        case 'active':
          contacts = allContacts;
          scanDescription = 'Active scan: Full sweep complete. Warning: Our position may be revealed.';
          break;

        case 'deep':
          if (!opsSession.isGM) {
            socket.emit('ops:error', { message: 'Deep scan requires GM override' });
            return;
          }
          contacts = operations.getContactsByCampaign(opsSession.campaignId);
          scanDescription = 'Deep scan: All contacts with full sensor data';
          break;

        default:
          contacts = allContacts.filter(c => c.celestial || (c.transponder && c.transponder !== 'NONE'));
          scanDescription = 'Passive scan complete';
      }

      const contactIds = contacts.map(c => c.id);
      const discoveries = operations.upgradeScanLevel(contactIds, scanLevel);

      const categorized = {
        celestial: contacts.filter(c => c.celestial),
        stations: contacts.filter(c => !c.celestial && c.type && ['Station', 'Starport', 'Base'].includes(c.type)),
        ships: contacts.filter(c => !c.celestial && c.type && ['Ship', 'Patrol'].includes(c.type)),
        unknown: contacts.filter(c => !c.celestial && (!c.type || !['Station', 'Starport', 'Base', 'Ship', 'Patrol'].includes(c.type)))
      };

      socket.emit('ops:scanResult', {
        scanType,
        contacts,
        categorized,
        totalCount: contacts.length,
        description: scanDescription,
        discoveries,
        timestamp: new Date().toISOString(),
        skillNote: opsSession.role === 'sensor_operator'
          ? 'Your Electronics (sensors) skill affects detection range and accuracy'
          : null
      });

      const campaign = operations.getCampaign(opsSession.campaignId);
      const scanTypeLabel = scanType === 'active' ? 'Active' : scanType === 'deep' ? 'Deep' : 'Passive';
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'sensor',
        message: `${scanTypeLabel} sensor scan: ${contacts.length} contacts detected`,
        actor: opsSession.isGuest ? opsSession.guestName : 'Sensors'
      });

      for (const disc of discoveries) {
        const contactName = disc.contact.name || disc.contact.transponder || disc.contact.type || 'Contact';
        const oldLabel = operations.getScanLevelLabel(disc.oldLevel);
        const newLabel = operations.getScanLevelLabel(disc.newLevel);
        operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
          gameDate: campaign.current_date,
          entryType: 'sensor',
          message: `${contactName}: Upgraded from ${oldLabel} to ${newLabel} scan. Revealed: ${disc.discoveries.join(', ')}`,
          actor: opsSession.isGuest ? opsSession.guestName : 'Sensors'
        });
      }

      socketLog.info(`[OPS] Sensor scan (${scanType}): ${contacts.length} contacts, ${discoveries.length} upgraded`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Scan', error));
      socketLog.error('[OPS] Error performing scan:', error);
    }
  });

  // Targeted scan on specific contact
  socket.on('ops:scanContact', (data) => {
    try {
      if (opsSession.role !== 'sensor_operator' && !opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only Sensor Operator can perform targeted scans' });
        return;
      }
      const { contactId, scanType = 'active' } = data;
      if (!contactId) {
        socket.emit('ops:error', { message: 'Contact ID required' });
        return;
      }

      const scanLevelMap = { passive: 1, active: 2, deep: 3 };
      const targetLevel = scanLevelMap[scanType] || 2;

      if (targetLevel === 3 && !opsSession.isGM) {
        socket.emit('ops:error', { message: 'Deep scan requires GM authorization' });
        return;
      }

      const contact = operations.getContact(contactId);
      if (!contact) {
        socket.emit('ops:error', { message: 'Contact not found' });
        return;
      }

      const discoveries = operations.upgradeScanLevel([contactId], targetLevel);

      if (discoveries.length === 0) {
        socket.emit('ops:scanContactResult', {
          success: true,
          contactId,
          message: 'No new information discovered (already at this scan level)',
          contact: operations.getContact(contactId)
        });
        return;
      }

      const disc = discoveries[0];
      const contactName = disc.contact.name || disc.contact.transponder || disc.contact.type || 'Contact';

      const campaign = operations.getCampaign(opsSession.campaignId);
      const scanLabel = scanType === 'deep' ? 'Deep' : 'Active';
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'sensor',
        message: `${scanLabel} scan on ${contactName}: Revealed ${disc.discoveries.join(', ')}`,
        actor: opsSession.isGuest ? opsSession.guestName : 'Sensors'
      });

      socket.emit('ops:scanContactResult', {
        success: true,
        contactId,
        contact: disc.contact,
        oldLevel: disc.oldLevel,
        newLevel: disc.newLevel,
        discoveries: disc.discoveries,
        message: `${contactName}: ${disc.discoveries.join(', ')}`
      });

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactUpdated', { contact: disc.contact });

      socketLog.info(`[OPS] Targeted scan on ${contactId}: ${disc.oldLevel} → ${disc.newLevel}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Contact', error));
      socketLog.error('[OPS] Error scanning contact:', error);
    }
  });

  // Get targetable contacts
  socket.on('ops:getTargetableContacts', () => {
    try {
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'Not in a campaign' });
        return;
      }
      const contacts = operations.getContactsByCampaign(opsSession.campaignId);
      const targetable = contacts.filter(c => c.is_targetable);
      socket.emit('ops:targetableContacts', {
        contacts: targetable,
        canAuthorize: opsSession.role === 'captain' || opsSession.role === 'gunner' || opsSession.isGM
      });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Contact', error));
      socketLog.error('[OPS] Error getting targetable contacts:', error);
    }
  });

  // Captain authorizes weapons on a contact
  socket.on('ops:authorizeWeapons', (data) => {
    try {
      if (opsSession.role !== 'captain' && opsSession.role !== 'gunner' && !opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only Captain or Gunner can authorize weapons' });
        return;
      }
      const { contactId, authorize = true } = data;
      if (!contactId) {
        socket.emit('ops:error', { message: 'Contact ID required' });
        return;
      }

      const contact = operations.updateContact(contactId, {
        weapons_free: authorize ? 1 : 0
      });

      if (!contact) {
        socket.emit('ops:error', { message: 'Contact not found' });
        return;
      }

      const campaign = operations.getCampaign(opsSession.campaignId);
      const action = authorize ? 'authorized' : 'revoked';
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'tactical',
        message: `Captain ${action} weapons on ${contact.name || contact.transponder || 'Contact'}`,
        actor: opsSession.isGM ? 'GM' : 'Captain'
      });

      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:weaponsAuthorizationChanged', {
        contactId,
        contactName: contact.name || contact.transponder || 'Contact',
        authorized: authorize,
        authorizedBy: opsSession.isGM ? 'GM' : 'Captain'
      });

      socketLog.info(`[OPS] Weapons ${action} on contact ${contactId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Combat', error));
      socketLog.error('[OPS] Error authorizing weapons:', error);
    }
  });

  // Gunner fires at a contact
  socket.on('ops:fireAtContact', (data) => {
    try {
      if (opsSession.role !== 'gunner' && !opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only the Gunner can fire weapons' });
        return;
      }
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }

      const { contactId, weaponIndex = 0 } = data;
      if (!contactId) {
        socket.emit('ops:error', { message: 'Target contact required' });
        return;
      }

      const contacts = operations.getContactsByCampaign(opsSession.campaignId);
      const target = contacts.find(c => c.id === contactId);
      if (!target) {
        socket.emit('ops:error', { message: 'Target contact not found' });
        return;
      }

      if (!target.is_targetable) {
        socket.emit('ops:error', { message: 'Contact is not targetable' });
        return;
      }

      if (!opsSession.isGM && !target.weapons_free) {
        const campaign = operations.getCampaign(opsSession.campaignId);
        operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
          gameDate: campaign.current_date,
          entryType: 'tactical',
          message: `BLOCKED: Gunner attempted fire on ${target.name || 'Contact'} - NOT AUTHORIZED`,
          actor: 'System'
        });
        socket.emit('ops:error', { message: 'Weapons not authorized on this target. Request authorization from Captain.' });
        return;
      }

      const ship = operations.getShip(opsSession.shipId);
      const weapons = ship?.ship_data?.weapons || [];
      const weapon = weapons[weaponIndex] || { name: 'Pulse Laser', damage: '2d6' };

      const dice = require('../../dice');
      const roller = new dice.DiceRoller();
      const attackRoll = roller.roll2d6();
      const gunnerySkill = 0;
      const targetNumber = 8;
      const totalAttack = attackRoll.total + gunnerySkill;
      const hit = totalAttack >= targetNumber;

      let damage = 0;
      let damageRoll = null;
      if (hit) {
        damageRoll = roller.rollNotation(weapon.damage || '2d6');
        damage = damageRoll.total;

        const newHealth = Math.max(0, (target.health || 20) - damage);
        operations.updateContact(contactId, { health: newHealth });

        if (newHealth <= 0) {
          operations.deleteContact(contactId);
        }
      }

      const updatedContact = !hit || (target.health || 20) - damage > 0
        ? operations.getContact(contactId)
        : null;

      const result = {
        hit,
        attackRoll: attackRoll.dice,
        attackTotal: totalAttack,
        targetNumber,
        gunnerySkill,
        weapon: weapon.name || 'Pulse Laser',
        target: target.name || target.transponder || 'Contact',
        damage: hit ? damage : 0,
        damageRoll: hit ? damageRoll?.dice : null,
        targetDestroyed: hit && (target.health || 20) - damage <= 0,
        contact: updatedContact,
        message: hit
          ? `HIT! ${weapon.name || 'Pulse Laser'} deals ${damage} damage to ${target.name || 'Contact'}`
          : `MISS! Attack roll ${totalAttack} vs target ${targetNumber}`
      };

      const campaign = operations.getCampaign(opsSession.campaignId);
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'combat',
        message: result.message + (result.targetDestroyed ? ' - TARGET DESTROYED!' : ''),
        actor: opsSession.isGM ? 'GM' : 'Gunner'
      });

      socket.emit('ops:fireResult', result);

      io.to(`ops:bridge:${opsSession.shipId}`).emit('ops:weaponFired', {
        gunner: opsSession.isGM ? 'GM' : 'Gunner',
        weapon: weapon.name || 'Pulse Laser',
        target: target.name || target.transponder || 'Contact',
        hit,
        damage: hit ? damage : 0,
        destroyed: result.targetDestroyed
      });

      if (result.targetDestroyed) {
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactDeleted', { contactId });

        // AR-29: Schedule training target respawn if destroyed
        if (target.training_target) {
          scheduleTrainingTargetRespawn(io, operations, opsSession.campaignId, socketLog);
        }
      }

      socketLog.info(`[OPS] Fire at contact: ${hit ? 'HIT' : 'MISS'} (${attackRoll.total}+${gunnerySkill} vs ${targetNumber})`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Combat', error));
      socketLog.error('[OPS] Error firing weapon:', error);
    }
  });

  // AR-25: Spawn training target DRN (GM only)
  socket.on('ops:spawnTrainingTarget', () => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can spawn training targets' });
        return;
      }
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'Not in a campaign' });
        return;
      }

      // Create training asteroid DRN
      const contact = operations.addContact(opsSession.campaignId, {
        name: 'Training Target DRN',
        type: 'Asteroid',
        range_band: 'short',
        range_km: 50000,
        bearing: Math.floor(Math.random() * 360),
        signature: 'Low',
        is_targetable: true,
        weapons_free: true,  // Pre-authorized
        health: 20,
        max_health: 20,
        gm_notes: 'Gunnery training target - auto-respawns 30s after destruction',
        training_target: true
      });

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactAdded', { contact });

      const campaign = operations.getCampaign(opsSession.campaignId);
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign?.current_date,
        entryType: 'sensor',
        message: 'Training target DRN deployed at Short range - Weapons free',
        actor: 'GM'
      });

      socketLog.info(`[OPS] Training target spawned: ${contact.id}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Training', error));
      socketLog.error('[OPS] Error spawning training target:', error);
    }
  });

  // AR-36: Electronic Warfare Controls
  socket.on('ops:setEW', (data) => {
    try {
      if (opsSession.role !== 'sensor_operator' && !opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only Sensor Operator can control EW systems' });
        return;
      }
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }

      const { type, active } = data;
      if (!['ecm', 'eccm', 'stealth'].includes(type)) {
        socket.emit('ops:error', { message: 'Invalid EW type' });
        return;
      }

      // Update ship state with EW setting
      const ship = operations.getShip(opsSession.shipId);
      const shipState = ship?.ship_state || {};
      shipState[type] = !!active;
      operations.updateShip(opsSession.shipId, { ship_state: shipState });

      // Broadcast EW change to campaign
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:ewChanged', {
        shipId: opsSession.shipId,
        type,
        active: !!active
      });

      socketLog.info(`[OPS] EW ${type} set to ${active} for ship ${opsSession.shipId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('EW', error));
      socketLog.error('[OPS] Error setting EW:', error);
    }
  });

  // AR-36: Sensor Lock
  socket.on('ops:setSensorLock', (data) => {
    try {
      if (opsSession.role !== 'sensor_operator' && !opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only Sensor Operator can set sensor locks' });
        return;
      }
      if (!opsSession.shipId) {
        socket.emit('ops:error', { message: 'Not on a ship' });
        return;
      }

      const { contactId } = data;
      const ship = operations.getShip(opsSession.shipId);
      const shipState = ship?.ship_state || {};

      if (contactId) {
        const contacts = operations.getContactsByCampaign(opsSession.campaignId);
        const contact = contacts.find(c => c.id === contactId);
        if (!contact) {
          socket.emit('ops:error', { message: 'Contact not found' });
          return;
        }
        shipState.sensorLock = true;
        shipState.sensorLockTarget = contact.name || contact.transponder || contactId;
        shipState.sensorLockId = contactId;
      } else {
        shipState.sensorLock = false;
        shipState.sensorLockTarget = null;
        shipState.sensorLockId = null;
      }

      operations.updateShip(opsSession.shipId, { ship_state: shipState });

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:sensorLockChanged', {
        shipId: opsSession.shipId,
        contactId: contactId || null,
        targetName: shipState.sensorLockTarget
      });

      socketLog.info(`[OPS] Sensor lock ${contactId ? 'acquired on ' + contactId : 'released'}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Lock', error));
      socketLog.error('[OPS] Error setting sensor lock:', error);
    }
  });

  // AR-49: Environmental monitoring data (GM only)
  socket.on('ops:setEnvironmentalData', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can set environmental data' });
        return;
      }

      const { temperature, atmosphere, atmosphereToxic, visibility, radiation, hazards, prediction } = data;

      // Store in campaign (could also be ship-specific)
      const environmentalData = {
        temperature,
        atmosphere,
        atmosphereToxic,
        visibility,
        radiation,
        hazards: hazards || [],
        prediction,
        updatedAt: Date.now()
      };

      // Broadcast to all in campaign
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:environmentalData', environmentalData);

      socketLog.info(`[OPS] Environmental data updated by GM`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Environmental', error));
      socketLog.error('[OPS] Error setting environmental data:', error);
    }
  });

  // AR-49: Clear environmental data
  socket.on('ops:clearEnvironmentalData', () => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can clear environmental data' });
        return;
      }

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:environmentalData', null);
      socketLog.info(`[OPS] Environmental data cleared by GM`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Environmental', error));
    }
  });
}

module.exports = { register };
