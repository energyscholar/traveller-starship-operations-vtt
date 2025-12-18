/**
 * Combat Handlers - Combat mode transitions and gunner actions
 * Part of the modular socket handler architecture
 */

/**
 * Register combat handlers
 * @param {Object} ctx - Handler context from context.js
 */
function register(ctx) {
  const {
    socket, io, opsSession, operations,
    socketLog, sanitizeError, campaignCombatState
  } = ctx;

  // --- Combat Mode Transitions ---

  // Get combat mode state
  socket.on('ops:getCombatState', () => {
    try {
      const combatState = campaignCombatState.get(opsSession.campaignId) || { inCombat: false };
      socket.emit('ops:combatState', combatState);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Combat', error));
      socketLog.error('[OPS] Error getting combat state:', error);
    }
  });

  // Enter combat mode (GM only)
  socket.on('ops:enterCombat', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can enter combat mode' });
        return;
      }

      const { selectedContacts = [] } = data;

      let combatants;
      if (selectedContacts.length > 0) {
        combatants = selectedContacts.map(id => operations.getContact(id)).filter(Boolean);
      } else {
        // AR-53: default is_targetable to true
        combatants = operations.getContactsByCampaign(opsSession.campaignId)
          .filter(c => c.is_targetable !== false);
      }

      if (combatants.length === 0) {
        socket.emit('ops:error', { message: 'No valid targets for combat' });
        return;
      }

      const combatId = `combat_${Date.now()}`;
      const combatState = {
        inCombat: true,
        combatId,
        startedAt: new Date().toISOString(),
        combatants: combatants.map(c => ({
          id: c.id,
          name: c.scan_level >= 2 ? c.name : '???',
          type: c.scan_level >= 1 ? c.type : 'Unknown',
          tonnage: c.scan_level >= 3 ? c.tonnage : null,
          range_band: c.range_band,
          bearing: c.bearing,
          _fullData: c
        }))
      };

      campaignCombatState.set(opsSession.campaignId, combatState);

      const campaign = operations.getCampaign(opsSession.campaignId);
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'combat',
        message: `COMBAT INITIATED: ${combatants.length} contacts engaged`,
        actor: 'Bridge'
      });

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:combatStarted', combatState);
      socketLog.info(`[OPS] Combat started: ${combatId} with ${combatants.length} combatants`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Combat', error));
      socketLog.error('[OPS] Error entering combat:', error);
    }
  });

  // Exit combat mode (GM only)
  socket.on('ops:exitCombat', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can exit combat mode' });
        return;
      }

      const combatState = campaignCombatState.get(opsSession.campaignId);
      if (!combatState || !combatState.inCombat) {
        socket.emit('ops:error', { message: 'No active combat to exit' });
        return;
      }

      const { outcome = 'disengaged' } = data;

      const campaign = operations.getCampaign(opsSession.campaignId);
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'combat',
        message: `COMBAT ENDED: ${outcome}`,
        actor: 'Bridge'
      });

      campaignCombatState.delete(opsSession.campaignId);
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:combatEnded', { outcome });
      socketLog.info(`[OPS] Combat ended: ${combatState.combatId} - ${outcome}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Combat', error));
      socketLog.error('[OPS] Error exiting combat:', error);
    }
  });

  // --- Gunner Combat Actions ---

  // Get ship weapons for gunner panel
  socket.on('ops:getShipWeapons', (data) => {
    try {
      const shipId = data?.shipId || opsSession.shipId;
      if (!shipId) {
        socket.emit('ops:error', { message: 'No ship selected' });
        return;
      }
      const weapons = operations.getShipWeapons(shipId);
      socket.emit('ops:shipWeapons', { shipId, weapons });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });

  // Get combat log
  socket.on('ops:getCombatLog', (data) => {
    try {
      const campaignId = opsSession.campaignId;
      if (!campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }
      const limit = data?.limit || 50;
      const log = operations.getCombatLog(campaignId, limit);
      socket.emit('ops:combatLog', { log });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Log', error));
    }
  });

  // Acquire/lock target
  socket.on('ops:acquireTarget', (data) => {
    try {
      const { contactId } = data;
      if (!contactId) {
        socket.emit('ops:error', { message: 'No target specified' });
        return;
      }

      const contact = operations.getContact(contactId);
      if (!contact) {
        socket.emit('ops:error', { message: 'Target not found' });
        return;
      }

      if (!contact.is_targetable) {
        socket.emit('ops:error', { message: 'Target is not targetable' });
        return;
      }

      if (!contact.weapons_free && contact.disposition !== 'hostile') {
        socket.emit('ops:error', { message: 'Target not authorized - request weapons free from Captain' });
        return;
      }

      operations.addCombatLogEntry(opsSession.campaignId, {
        actor: opsSession.playerName || 'Gunner',
        action: 'acquire',
        target: contact.name,
        result: `Target locked: ${contact.name}`
      });

      socket.emit('ops:targetAcquired', { contact });
      socketLog.info(`[OPS] Target acquired: ${contact.name} by ${opsSession.playerName}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });

  // Fire weapon at target
  // AR-196: Supports called shots with targetSystem parameter
  socket.on('ops:fireWeapon', (data) => {
    try {
      const { weaponId, targetId, targetSystem } = data;

      if (!targetId) {
        socket.emit('ops:error', { message: 'No target specified' });
        return;
      }

      const target = operations.getContact(targetId);
      if (!target) {
        socket.emit('ops:error', { message: 'Target not found' });
        return;
      }

      if (!target.is_targetable) {
        socket.emit('ops:error', { message: 'Target is not valid' });
        return;
      }

      // AR-196: Validate called shot target system
      const { TARGETABLE_SYSTEMS } = require('../../operations/combat-engine');
      if (targetSystem && !TARGETABLE_SYSTEMS.includes(targetSystem)) {
        socket.emit('ops:error', { message: `Invalid target system: ${targetSystem}` });
        return;
      }

      const weapons = operations.getShipWeapons(opsSession.shipId);
      let weapon = weapons.find(w => w.id === weaponId) || weapons[0];

      if (!weapon) {
        weapon = { name: 'Laser', damage: '2d6', range: 'medium' };
      }

      if (weapon.ammo_max !== null && weapon.ammo_current <= 0) {
        socket.emit('ops:error', { message: `${weapon.name} has no ammo!` });
        return;
      }

      const attacker = {
        name: opsSession.playerName || 'Gunner',
        skills: { gunnery: 0 }
      };

      if (opsSession.accountId) {
        try {
          const account = operations.getPlayerSlot(opsSession.accountId);
          if (account?.character_data) {
            const charData = JSON.parse(account.character_data);
            if (charData.skills?.Gunnery) {
              attacker.skills.gunnery = charData.skills.Gunnery;
            } else if (charData.skills?.gunnery) {
              attacker.skills.gunnery = charData.skills.gunnery;
            }
          }
        } catch {
          // Use default skill
        }
      }

      // AR-196: Pass targetSystem to resolveAttack for called shot penalty
      const result = operations.resolveAttack(attacker, weapon, target, { targetSystem });

      if (weapon.id && weapon.ammo_max !== null) {
        operations.updateWeaponStatus(weapon.id, {
          ammo_current: Math.max(0, weapon.ammo_current - 1)
        });
      }

      if (result.hit && result.actualDamage > 0) {
        // AR-196: Apply damage - for NPC contacts, still apply hull damage
        // but track targeted system for narrative purposes
        const damageResult = operations.applyDamageToContact(targetId, result.actualDamage);
        result.targetDestroyed = damageResult?.destroyed || false;
        result.targetHealth = damageResult?.health || 0;
        result.targetMaxHealth = damageResult?.max_health || target.max_health;

        // AR-196: Track called shot hit for narrative
        if (targetSystem) {
          result.systemDamaged = targetSystem;
          // Severity based on damage dealt (1 per 10 damage, min 1, max 3)
          result.systemSeverity = Math.min(3, Math.max(1, Math.ceil(result.actualDamage / 10)));
        }
      }

      // AR-196: Enhanced combat log entry
      operations.addCombatLogEntry(opsSession.campaignId, {
        actor: attacker.name,
        action: result.hit ? 'hit' : 'miss',
        target: target.name,
        weapon: weapon.name,
        targetSystem: targetSystem || null,
        roll_data: {
          dice: result.dice,
          roll: result.roll,
          totalDM: result.totalDM,
          total: result.total,
          hit: result.hit,
          damage: result.damage,
          actualDamage: result.actualDamage,
          critical: result.critical,
          calledShot: result.modifiers?.calledShot || 0
        },
        result: result.message
      });

      socket.emit('ops:fireResult', { result });

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:combatAction', {
        type: result.hit ? 'hit' : 'miss',
        attacker: attacker.name,
        target: target.name,
        weapon: weapon.name,
        damage: result.actualDamage,
        message: result.message,
        targetDestroyed: result.targetDestroyed,
        targetSystem: targetSystem || null,
        systemDamaged: result.systemDamaged || null
      });

      if (result.targetDestroyed) {
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:targetDestroyed', {
          contactId: targetId,
          name: target.name,
          destroyedBy: attacker.name
        });
      }

      const contacts = operations.getContacts(opsSession.campaignId);
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:contactsUpdate', {
        contacts: contacts.filter(c => c.visible_to === 'all' || c.visible_to === opsSession.accountId)
      });

      socketLog.info(`[OPS] ${attacker.name} fired ${weapon.name} at ${target.name}: ${result.hit ? 'HIT' : 'MISS'}`);
    } catch (error) {
      socketLog.error('[OPS] Fire weapon error:', error);
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });

  // Toggle point defense mode
  socket.on('ops:pointDefense', (data) => {
    try {
      const { enabled } = data;

      operations.addCombatLogEntry(opsSession.campaignId, {
        actor: opsSession.playerName || 'Gunner',
        action: 'pointDefense',
        result: enabled ? 'Point defense activated' : 'Point defense deactivated'
      });

      socket.emit('ops:pointDefenseStatus', { enabled });

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:combatAction', {
        type: 'pointDefense',
        attacker: opsSession.playerName || 'Gunner',
        message: enabled ? 'Point defense systems activated' : 'Point defense systems deactivated'
      });

      socketLog.info(`[OPS] Point defense ${enabled ? 'enabled' : 'disabled'} by ${opsSession.playerName}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });
}

module.exports = { register };
