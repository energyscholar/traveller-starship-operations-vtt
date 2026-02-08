/**
 * Combat Handlers - Combat mode transitions and gunner actions
 * Part of the modular socket handler architecture
 */

// ANSI codes for narration formatting
const ESC = '\x1b';
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;
const GREEN = `${ESC}[32m`;
const RED = `${ESC}[31m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;

/**
 * Emit combat narration to all clients in campaign
 * @param {Object} io - Socket.io instance
 * @param {string} campaignId - Campaign ID
 * @param {string} text - Narration text (may include ANSI codes)
 */
function emitNarration(io, campaignId, text) {
  io.to(`ops:campaign:${campaignId}`).emit('ops:combatNarration', { text });
}

/**
 * Emit turn prompt to clients for role-specific actions
 * @param {Object} io - Socket.io instance
 * @param {string} campaignId - Campaign ID
 * @param {string} phase - Current combat phase
 */
function emitTurnPrompt(io, campaignId, phase) {
  const rolePrompts = {
    manoeuvre: { role: 'pilot', message: 'Set evasive maneuvers? [E] Toggle' },
    attack: { role: 'gunner', message: 'Select target and fire' },
    actions: { role: 'all', message: 'Take action or pass' }
  };
  const prompt = rolePrompts[phase];
  if (prompt) {
    io.to(`ops:campaign:${campaignId}`).emit('ops:turnPrompt', { ...prompt, phase });
  }
}

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
        phase: 'manoeuvre',
        round: 1,
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

      // Emit narration for battle console
      emitNarration(io, opsSession.campaignId,
        `${BOLD}${CYAN}══════════════════════════════════════${RESET}\n` +
        `${BOLD}${CYAN}         COMBAT INITIATED${RESET}\n` +
        `${BOLD}${CYAN}══════════════════════════════════════${RESET}\n` +
        `${DIM}Ships in combat: ${combatants.length}${RESET}`
      );

      socketLog.info(`[OPS] Combat started: ${combatId} with ${combatants.length} combatants`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Combat', error));
      socketLog.error('[OPS] Error entering combat:', error);
    }
  });

  // Advance combat phase (GM only)
  socket.on('ops:advancePhase', () => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can advance phase' });
        return;
      }

      const combatState = campaignCombatState.get(opsSession.campaignId);
      if (!combatState || !combatState.inCombat) {
        socket.emit('ops:error', { message: 'Not in combat' });
        return;
      }

      // Phase order: manoeuvre → attack → actions → round_end → manoeuvre
      const phaseOrder = ['manoeuvre', 'attack', 'actions', 'round_end'];
      const currentIndex = phaseOrder.indexOf(combatState.phase || 'manoeuvre');

      let newPhase;
      let newRound = combatState.round || 1;

      if (currentIndex === phaseOrder.length - 1) {
        // End of round - go back to manoeuvre and increment round
        newPhase = 'manoeuvre';
        newRound++;
      } else {
        newPhase = phaseOrder[currentIndex + 1];
      }

      // Update combat state
      combatState.phase = newPhase;
      combatState.round = newRound;
      campaignCombatState.set(opsSession.campaignId, combatState);

      // Log phase change
      const campaign = operations.getCampaign(opsSession.campaignId);
      operations.addLogEntry(opsSession.shipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'combat',
        message: `Phase: ${newPhase.toUpperCase()} (Round ${newRound})`,
        actor: 'Bridge'
      });

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:phaseChanged', {
        phase: newPhase,
        round: newRound
      });

      // Emit narration for battle console
      const phaseName = newPhase.charAt(0).toUpperCase() + newPhase.slice(1).replace('_', ' ');
      emitNarration(io, opsSession.campaignId,
        `\n${YELLOW}─── ${phaseName} Phase (Round ${newRound}) ───${RESET}`
      );

      // Emit role-specific turn prompt
      emitTurnPrompt(io, opsSession.campaignId, newPhase);

      socketLog.info(`[OPS] Phase advanced: ${newPhase} (round ${newRound})`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Combat', error));
      socketLog.error('[OPS] Error advancing phase:', error);
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

      // Emit narration for battle console
      emitNarration(io, opsSession.campaignId,
        `\n${BOLD}${CYAN}══════════════════════════════════════${RESET}\n` +
        `${BOLD}${CYAN}         COMBAT ENDED${RESET}\n` +
        `${BOLD}${CYAN}══════════════════════════════════════${RESET}\n` +
        `${DIM}Outcome: ${outcome}${RESET}`
      );

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

      // AR-208: Validate weapon range vs target range
      const targetRange = target.range_band || target.range || 'medium';
      const RANGE_ORDER = ['adjacent', 'close', 'short', 'medium', 'long', 'very long', 'distant'];
      const targetRangeIndex = RANGE_ORDER.indexOf(targetRange.toLowerCase().replace('_', ' '));

      // Weapon max ranges (index in RANGE_ORDER)
      const WEAPON_MAX_RANGE = {
        sandcaster: 1,      // Adjacent, Close only
        railgun: 2,         // Up to Short
        beam_laser: 3,      // Up to Medium
        pulse_laser: 4,     // Up to Long
        plasma_gun: 3,      // Up to Medium
        fusion_gun: 3,      // Up to Medium
        particle_beam: 5,   // Up to Very Long
        particle: 5,        // Alias
        ion: 3,             // Up to Medium (barbette)
        missile_rack: 6,    // Special - can reach Distant
        missile: 6          // Alias
      };

      // Try ship_weapons table first, then fall back to ship_data.weapons
      let weapons = operations.getShipWeapons(opsSession.shipId);
      let weapon = weapons.find(w => w.id === weaponId);

      // If not in ship_weapons table, check ship_data.weapons array
      if (!weapon && weaponId) {
        const ship = operations.getShip(opsSession.shipId);
        const shipDataWeapons = ship?.ship_data?.weapons || [];
        weapon = shipDataWeapons.find(w => w.id === weaponId);
      }

      // Still not found, use first weapon or default
      if (!weapon) {
        weapon = weapons[0] || { name: 'Laser', damage: '2d6', range: 'medium' };
      }

      // AR-208: Check weapon range vs target range
      const weaponType = (weapon.type || weapon.name || '').toLowerCase().replace(/[^a-z_]/g, '');
      const maxRangeIndex = WEAPON_MAX_RANGE[weaponType];
      if (maxRangeIndex !== undefined && targetRangeIndex > maxRangeIndex) {
        const maxRangeName = RANGE_ORDER[maxRangeIndex];
        socket.emit('ops:error', {
          message: `${weapon.name} cannot reach ${targetRange} range (max: ${maxRangeName})`
        });
        return;
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

      // AR-208: Get Fire Control DM from ship
      let fireControlDM = 0;
      const ship = operations.getShip(opsSession.shipId);
      if (ship?.ship_data?.combat?.fireControl) {
        fireControlDM = ship.ship_data.combat.fireControl;
      } else if (ship?.ship_data?.software) {
        // Software can be:
        // 1. Object: {fireControl: 1, library: true, ...}
        // 2. Array of strings: ["Fire Control/1", "Library"]
        // 3. Array of objects: [{name: 'Fire Control', rating: 1}]
        const software = ship.ship_data.software;
        if (typeof software.fireControl === 'number') {
          // Object format
          fireControlDM = software.fireControl;
        } else if (Array.isArray(software)) {
          // Array format - could be strings or objects
          for (const item of software) {
            if (typeof item === 'string') {
              // String format: "Fire Control/1"
              const match = item.match(/fire control\/(\d+)/i);
              if (match) {
                fireControlDM = parseInt(match[1], 10);
                break;
              }
            } else if (item?.name) {
              // Object format: {name: 'Fire Control', rating: 1}
              if (item.name.toLowerCase().includes('fire control')) {
                fireControlDM = item.rating || 0;
                break;
              }
            }
          }
        }
      }

      // AR-196: Pass targetSystem to resolveAttack for called shot penalty
      // AR-208: Include Fire Control DM
      const result = operations.resolveAttack(attacker, weapon, target, {
        targetSystem,
        dm: fireControlDM,
        fireControl: fireControlDM  // For display in modifiers breakdown
      });

      if (weapon.id && weapon.ammo_max !== null) {
        operations.updateWeaponStatus(weapon.id, {
          ammo_current: Math.max(0, weapon.ammo_current - 1)
        });
      }

      // Ion weapons drain power instead of dealing hull damage
      if (result.hit && result.damageType === 'ion' && result.powerDrain > 0) {
        const drainResult = operations.drainContactPower(targetId, result.powerDrain);
        if (drainResult) {
          result.targetPower = drainResult.power;
          result.targetMaxPower = drainResult.max_power;
          result.powerThreshold = drainResult.powerThreshold;
          // Emit power drained event
          io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:targetPowerDrained', {
            targetId,
            targetName: target.name,
            powerDrained: result.powerDrain,
            newPower: drainResult.power,
            maxPower: drainResult.max_power,
            threshold: drainResult.powerThreshold
          });
        }
      } else if (result.hit && result.actualDamage > 0) {
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
          damageType: result.damageType || 'hull',
          powerDrain: result.powerDrain || 0,
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
        damageType: result.damageType || 'hull',
        powerDrain: result.powerDrain || 0,
        message: result.message,
        targetDestroyed: result.targetDestroyed,
        targetSystem: targetSystem || null,
        systemDamaged: result.systemDamaged || null
      });

      // Emit narration for battle console
      if (result.hit) {
        const dmgText = result.actualDamage > 0 ? ` ${result.actualDamage} damage!` : '';
        emitNarration(io, opsSession.campaignId,
          `${GREEN}${attacker.name}${RESET} fires ${weapon.name} at ${RED}${target.name}${RESET} - ` +
          `${GREEN}HIT${RESET}${dmgText}`
        );
      } else {
        emitNarration(io, opsSession.campaignId,
          `${GREEN}${attacker.name}${RESET} fires ${weapon.name} at ${RED}${target.name}${RESET} - ` +
          `${DIM}MISS${RESET}`
        );
      }

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

  // AR-230: Fire point defense at specific incoming missile
  // Uses laser to attempt to destroy missile before impact
  socket.on('ops:firePointDefense', (data) => {
    try {
      const { missileId, weaponId } = data;

      // Get combat state
      const combatState = campaignCombatState.get(opsSession.campaignId);
      if (!combatState?.inCombat) {
        socket.emit('ops:error', { message: 'Not in combat' });
        return;
      }

      // Get or create missile tracker for this combat
      if (!combatState.missileTracker) {
        const { MissileTracker } = require('../../weapons/missiles');
        combatState.missileTracker = new MissileTracker();
      }

      // Validate missile exists and is arriving
      const missile = combatState.missileTracker.missiles.get(missileId);
      if (!missile) {
        socket.emit('ops:error', { message: 'Missile not found or already destroyed' });
        return;
      }

      if (missile.status !== 'tracking') {
        socket.emit('ops:error', { message: `Missile already ${missile.status}` });
        return;
      }

      // Get laser weapon for point defense
      const weapons = operations.getShipWeapons(opsSession.shipId);
      const laser = weapons.find(w =>
        (weaponId ? w.id === weaponId : true) &&
        (w.type === 'pulse_laser' || w.type === 'beam_laser')
      );

      if (!laser) {
        socket.emit('ops:error', { message: 'No laser available for point defense' });
        return;
      }

      // Get gunner skill
      let gunnerSkill = 0;
      try {
        const gunnerCharId = laser.operator_character_id;
        if (gunnerCharId) {
          const charData = operations.getCharacterById(gunnerCharId);
          if (charData) {
            gunnerSkill = charData.skills?.Gunnery || charData.skills?.gunnery || 0;
          }
        }
      } catch { /* use default */ }

      // Get turret size bonus
      const turretSize = laser.turret_type === 'triple' ? 3 : (laser.turret_type === 'double' ? 2 : 1);

      // Resolve point defense using MissileTracker (has cumulative penalty tracking)
      const result = combatState.missileTracker.pointDefense(missileId, {
        gunnerSkill,
        turretSize,
        gunnerId: opsSession.odGameId || opsSession.odPlayerId || 'default',
        round: combatState.round || 1
      });

      // Log result
      operations.addCombatLogEntry(opsSession.campaignId, {
        actor: opsSession.playerName || 'Gunner',
        action: 'pointDefense',
        target: `Missile ${missileId}`,
        weapon: laser.name,
        roll_data: result,
        result: result.destroyed
          ? `Point defense DESTROYED missile! (${result.total} vs 8)`
          : `Point defense missed (${result.total} vs 8)`
      });

      // Emit result to gunner
      socket.emit('ops:pointDefenseResult', {
        success: true,
        destroyed: result.destroyed,
        missileId,
        roll: result.roll,
        total: result.total,
        modifiers: result.modifiers
      });

      // Broadcast to campaign
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:combatAction', {
        type: 'pointDefense',
        attacker: opsSession.playerName || 'Gunner',
        target: missileId,
        destroyed: result.destroyed,
        message: result.destroyed
          ? `Point defense destroyed incoming missile!`
          : `Point defense missed - missile still incoming!`
      });

      socketLog.info(`[OPS] Point defense by ${opsSession.playerName}: ${result.destroyed ? 'DESTROYED' : 'MISSED'} missile ${missileId}`);
    } catch (error) {
      socketLog.error('[OPS] Point defense error:', error);
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });

  // AR-230: Launch missile at target
  socket.on('ops:launchMissile', (data) => {
    try {
      const { targetId, weaponId, missileType = 'standard' } = data;

      // Get combat state
      const combatState = campaignCombatState.get(opsSession.campaignId);
      if (!combatState?.inCombat) {
        socket.emit('ops:error', { message: 'Not in combat' });
        return;
      }

      // Get or create missile tracker
      if (!combatState.missileTracker) {
        const { MissileTracker } = require('../../weapons/missiles');
        combatState.missileTracker = new MissileTracker();
      }

      // Get missile rack weapon
      const weapons = operations.getShipWeapons(opsSession.shipId);
      const missileRack = weapons.find(w =>
        (weaponId ? w.id === weaponId : true) &&
        w.type === 'missile_rack' &&
        w.ammo_current > 0
      );

      if (!missileRack) {
        socket.emit('ops:error', { message: 'No missile rack with ammo available' });
        return;
      }

      // Get current range
      const range = combatState.range || 'medium';

      // Get gunner skill for accuracy
      let gunnerSkill = 0;
      try {
        const gunnerCharId = missileRack.operator_character_id;
        if (gunnerCharId) {
          const charData = operations.getCharacterById(gunnerCharId);
          if (charData) {
            gunnerSkill = charData.skills?.Gunnery || charData.skills?.gunnery || 0;
          }
        }
      } catch { /* use default */ }

      // Launch missile
      const result = combatState.missileTracker.launchMissile({
        attackerId: opsSession.shipId,
        defenderId: targetId,
        currentRange: range,
        round: combatState.round || 1,
        missileType,
        gunneryEffect: gunnerSkill
      });

      if (result.error) {
        socket.emit('ops:error', { message: result.reason });
        return;
      }

      // Deduct ammo
      operations.updateWeaponStatus(missileRack.id, {
        ammo_current: Math.max(0, missileRack.ammo_current - 1)
      });

      // Get target name
      const target = operations.getContactById(targetId);
      const targetName = target?.name || `Target ${targetId}`;

      // Log launch
      operations.addCombatLogEntry(opsSession.campaignId, {
        actor: opsSession.playerName || 'Gunner',
        action: 'launchMissile',
        target: targetName,
        weapon: missileRack.name,
        result: `Missile launched! Arrives in ${result.flightTime} turn(s)`
      });

      // Emit to gunner
      socket.emit('ops:missileLaunched', {
        missileId: result.id,
        target: targetName,
        targetId,
        flightTime: result.flightTime,
        arrivalRound: result.arrivalRound,
        missileType
      });

      // Broadcast to campaign
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:combatAction', {
        type: 'missileLaunch',
        attacker: opsSession.playerName || 'Gunner',
        target: targetName,
        message: `Missile launched at ${targetName}! ETA: ${result.flightTime} turn(s)`
      });

      socketLog.info(`[OPS] Missile launched by ${opsSession.playerName} at ${targetName}, arrival in ${result.flightTime} turns`);
    } catch (error) {
      socketLog.error('[OPS] Missile launch error:', error);
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });

  // AR-230: Get incoming missiles (for point defense targeting)
  socket.on('ops:getIncomingMissiles', () => {
    try {
      const combatState = campaignCombatState.get(opsSession.campaignId);
      if (!combatState?.inCombat || !combatState.missileTracker) {
        socket.emit('ops:incomingMissiles', { missiles: [] });
        return;
      }

      // Get missiles arriving at our ship
      const incomingMissiles = combatState.missileTracker.getArrivingMissiles(
        opsSession.shipId,
        combatState.round || 1
      );

      socket.emit('ops:incomingMissiles', {
        missiles: incomingMissiles.map(m => ({
          id: m.id,
          attacker: m.attacker,
          launchRange: m.launchRange,
          turnsInFlight: m.turnsInFlight,
          missileType: m.missileType,
          isNuclear: m.isNuclear,
          isSmart: m.isSmart
        })),
        round: combatState.round || 1
      });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });

  // Use sandcaster as reaction to incoming energy attack
  socket.on('ops:useSandcaster', (data) => {
    try {
      const { weaponId, incomingAttackId } = data;

      // Get sandcaster weapon
      const weapons = operations.getShipWeapons(opsSession.shipId);
      const sandcaster = weapons.find(w => w.id === weaponId && w.type === 'sandcaster');

      if (!sandcaster) {
        socket.emit('ops:error', { message: 'Sandcaster not found' });
        return;
      }

      // Check ammo
      if (sandcaster.ammo_current <= 0) {
        socket.emit('ops:error', { message: 'No sand canisters remaining!' });
        return;
      }

      // Get gunner skill
      let gunnerSkill = 0;
      if (opsSession.accountId) {
        try {
          const account = operations.getPlayerSlot(opsSession.accountId);
          if (account?.character_data) {
            const charData = JSON.parse(account.character_data);
            gunnerSkill = charData.skills?.Gunnery || charData.skills?.gunnery || 0;
          }
        } catch { /* use default */ }
      }

      // Resolve sandcaster: 2d6 + skill vs 8
      const { useSandcaster } = require('../../weapons/sandcasters');
      const result = useSandcaster({
        gunnerSkill,
        attackType: 'laser',
        ammoRemaining: sandcaster.ammo_current
      });

      // Deduct ammo
      operations.updateWeaponStatus(sandcaster.id, {
        ammo_current: Math.max(0, sandcaster.ammo_current - 1)
      });

      // Log result
      operations.addCombatLogEntry(opsSession.campaignId, {
        actor: opsSession.playerName || 'Gunner',
        action: 'sandcaster',
        target: 'incoming fire',
        weapon: sandcaster.name,
        roll_data: {
          roll: result.roll?.total,
          total: result.total,
          success: result.success,
          armorBonus: result.armorBonus
        },
        result: result.success
          ? `Sandcaster SUCCESS! +${result.armorBonus} armor vs attack`
          : `Sandcaster failed (${result.total} vs 8)`
      });

      // Emit result
      socket.emit('ops:sandcasterResult', {
        success: result.success,
        armorBonus: result.armorBonus,
        roll: result.roll,
        total: result.total,
        effect: result.effect,
        incomingAttackId
      });

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:combatAction', {
        type: 'sandcaster',
        attacker: opsSession.playerName || 'Gunner',
        message: result.success
          ? `Sandcaster deployed! +${result.armorBonus} armor`
          : 'Sandcaster cloud failed to deploy effectively'
      });

      socketLog.info(`[OPS] Sandcaster ${result.success ? 'SUCCESS' : 'FAIL'} by ${opsSession.playerName}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Combat', error));
      socketLog.error('[OPS] Sandcaster error:', error);
    }
  });

  // --- BD-2: Fire As Contact (GM fires NPC weapons at PC ship) ---
  socket.on('ops:fireAsContact', (data) => {
    try {
      // GM-only check
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can fire as contact' });
        return;
      }

      const { contactId, weaponIndex = 0, targetShipId } = data;

      // Validate contact
      const contact = operations.getContact(contactId);
      if (!contact) {
        socket.emit('ops:error', { message: 'Contact not found' });
        return;
      }

      // Validate weapons
      if (!contact.weapons || !Array.isArray(contact.weapons) || contact.weapons.length === 0) {
        socket.emit('ops:error', { message: 'Contact has no weapons' });
        return;
      }

      if (weaponIndex < 0 || weaponIndex >= contact.weapons.length) {
        socket.emit('ops:error', { message: `Invalid weapon index: ${weaponIndex}` });
        return;
      }

      const weapon = contact.weapons[weaponIndex];

      // Get target ship (PC ship)
      const targetShip = operations.getShip(targetShipId);
      if (!targetShip) {
        socket.emit('ops:error', { message: 'Target ship not found' });
        return;
      }

      // Adapter: convert contact gunner_skill to attacker shape
      const attacker = {
        name: contact.name || 'Unknown Contact',
        skills: { gunnery: contact.gunner_skill || 1 }
      };

      // Build target shape for resolveAttack
      const shipData = targetShip.ship_data || {};
      const currentState = targetShip.current_state || {};
      const target = {
        name: targetShip.name,
        range_band: contact.range_band || 'medium',
        armor: shipData.armor || 0,
        evasive: currentState.evasive || false,
        health: currentState.hull ?? shipData.hull?.points ?? 100,
        max_health: shipData.hull?.points ?? 100
      };

      // Power threshold penalty for NPC attacker
      const { getPowerThreshold } = require('../../operations/contacts');
      const contactPower = contact.power ?? 100;
      const contactMaxPower = contact.max_power ?? 100;
      const powerThreshold = getPowerThreshold(contactPower, contactMaxPower);
      let powerDM = 0;
      if (powerThreshold === 'degraded') powerDM = -2;
      else if (powerThreshold === 'critical') powerDM = -4;
      else if (powerThreshold === 'emergency' || powerThreshold === 'disabled') powerDM = -6;

      // Resolve the attack
      const { resolveAttack } = require('../../operations/combat-engine');
      const result = resolveAttack(attacker, weapon, target, { dm: powerDM });

      // Auto-sandcaster: If laser/energy attack hits, AI gunners auto-deploy sandcasters
      if (result.hit && (weapon.type === 'beam_laser' || weapon.type === 'pulse_laser' || weapon.type === 'laser')) {
        const shipWeapons = operations.getShipWeapons(targetShipId);
        const sandcaster = shipWeapons.find(w =>
          w.type === 'sandcaster' &&
          w.ammo_current > 0 &&
          (w.operator?.includes('AI') || targetShip.ship_data?.specialFeatures?.aiGunners)
        );

        if (sandcaster) {
          const { useSandcaster } = require('../../weapons/sandcasters');
          const sandResult = useSandcaster({
            gunnerSkill: 1, // AI gunner skill
            attackType: 'laser',
            ammoRemaining: sandcaster.ammo_current
          });

          // Deduct ammo
          operations.updateWeaponStatus(sandcaster.id, {
            ammo_current: Math.max(0, sandcaster.ammo_current - 1)
          });

          if (sandResult.success) {
            // Add armor bonus to reduce damage
            result.sandcasterBonus = sandResult.armorBonus;
            result.actualDamage = Math.max(0, result.actualDamage - sandResult.armorBonus);
            result.message += ` (Sandcaster reduced by ${sandResult.armorBonus})`;

            io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:combatAction', {
              type: 'sandcaster',
              attacker: 'AI Gunner',
              message: `AI Gunner deployed sandcaster! +${sandResult.armorBonus} armor vs ${contact.name}`
            });
          }

          operations.addCombatLogEntry(opsSession.campaignId, {
            actor: 'AI Gunner',
            action: 'sandcaster',
            target: contact.name,
            weapon: sandcaster.name,
            result: sandResult.success
              ? `Auto-sandcaster SUCCESS! +${sandResult.armorBonus} armor`
              : `Auto-sandcaster failed (${sandResult.total} vs 8)`
          });
        }
      }

      // Ion weapons from NPC drain PC ship power
      if (result.hit && result.damageType === 'ion' && result.powerDrain > 0) {
        // Get current ship power state
        const currentState = targetShip.current_state || {};
        const currentPower = currentState.power ?? 100;
        const newPower = Math.max(0, currentPower - result.powerDrain);

        // Update ship power
        operations.updateShipState(targetShipId, {
          ...currentState,
          power: newPower
        });

        result.targetPower = newPower;
        result.powerDrained = result.powerDrain;

        // Emit power drained event
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:pcShipPowerDrained', {
          shipId: targetShipId,
          shipName: targetShip.name,
          attacker: contact.name,
          powerDrained: result.powerDrain,
          newPower: newPower
        });

        result.newHull = target.health;
        result.destroyed = false;
      } else if (result.hit && result.actualDamage > 0) {
        // Standard hull damage
        const damageResult = operations.applyCombatDamage(targetShipId, { hull: result.actualDamage });
        result.newHull = damageResult?.hull ?? target.health - result.actualDamage;
        result.destroyed = result.newHull <= 0;
      } else {
        result.newHull = target.health;
        result.destroyed = false;
      }

      // Log to combat log
      operations.addCombatLogEntry(opsSession.campaignId, {
        actor: contact.name,
        action: result.hit ? 'hit' : 'miss',
        target: targetShip.name,
        weapon: weapon.name,
        roll_data: {
          dice: result.dice,
          roll: result.roll,
          totalDM: result.totalDM,
          total: result.total,
          hit: result.hit,
          damage: result.damage,
          actualDamage: result.actualDamage
        },
        result: result.message
      });

      // Log to ship log
      const campaign = operations.getCampaign(opsSession.campaignId);
      operations.addLogEntry(targetShipId, opsSession.campaignId, {
        gameDate: campaign.current_date,
        entryType: 'combat',
        message: result.hit
          ? `INCOMING FIRE: ${contact.name} hits with ${weapon.name} for ${result.actualDamage} damage!`
          : `INCOMING FIRE: ${contact.name} fires ${weapon.name} - MISS`,
        actor: 'Bridge'
      });

      // Emit to GM
      socket.emit('ops:fireAsContactResult', { result, contactId, weaponIndex, targetShipId });

      // Broadcast combat action to all players
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:combatAction', {
        type: result.hit ? 'hit' : 'miss',
        attacker: contact.name,
        target: targetShip.name,
        weapon: weapon.name,
        damage: result.actualDamage,
        message: result.message,
        incomingFire: true
      });

      // Broadcast ship damage to all players (dedicated event)
      if (result.hit) {
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:pcShipDamaged', {
          shipId: targetShipId,
          shipName: targetShip.name,
          attacker: contact.name,
          weapon: weapon.name,
          damage: result.actualDamage,
          newHull: result.newHull,
          maxHull: target.max_health,
          destroyed: result.destroyed,
          roll: result.roll,
          hit: result.hit
        });
      }

      if (result.destroyed) {
        io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:shipDestroyed', {
          shipId: targetShipId,
          name: targetShip.name,
          destroyedBy: contact.name
        });
      }

      socketLog.info(`[OPS] GM fired ${weapon.name} from ${contact.name} at ${targetShip.name}: ${result.hit ? 'HIT' : 'MISS'}`);
    } catch (error) {
      socketLog.error('[OPS] Fire as contact error:', error);
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });

  // --- Enemy Auto-Fire ---

  // Toggle auto_fire for a specific contact (GM only)
  socket.on('ops:toggleAutoFire', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can toggle auto-fire' });
        return;
      }
      const { contactId, enabled } = data;
      if (!contactId) {
        socket.emit('ops:error', { message: 'No contact specified' });
        return;
      }

      const combatState = campaignCombatState.get(opsSession.campaignId);
      if (!combatState) {
        socket.emit('ops:error', { message: 'No active combat' });
        return;
      }

      // Store auto_fire state on combat state
      if (!combatState.autoFireOverrides) combatState.autoFireOverrides = {};
      combatState.autoFireOverrides[contactId] = enabled !== false;

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:autoFireToggled', {
        contactId,
        enabled: combatState.autoFireOverrides[contactId]
      });

      socketLog.info(`[OPS] Auto-fire ${enabled !== false ? 'enabled' : 'disabled'} for ${contactId}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });

  // Pause/resume all enemy fire (GM only)
  socket.on('ops:pauseEnemyFire', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can pause enemy fire' });
        return;
      }

      const combatState = campaignCombatState.get(opsSession.campaignId);
      if (!combatState) {
        socket.emit('ops:error', { message: 'No active combat' });
        return;
      }

      combatState.enemyFirePaused = data?.paused !== false;

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:enemyFirePaused', {
        paused: combatState.enemyFirePaused
      });

      emitNarration(io, opsSession.campaignId,
        combatState.enemyFirePaused
          ? `${YELLOW}── Enemy fire PAUSED by GM ──${RESET}`
          : `${YELLOW}── Enemy fire RESUMED ──${RESET}`
      );

      socketLog.info(`[OPS] Enemy fire ${combatState.enemyFirePaused ? 'paused' : 'resumed'}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });

  // Trigger enemy auto-fire (GM only, typically called after attack phase)
  socket.on('ops:resolveEnemyFire', () => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can trigger enemy fire' });
        return;
      }

      const combatState = campaignCombatState.get(opsSession.campaignId);
      if (!combatState?.inCombat) {
        socket.emit('ops:error', { message: 'Not in combat' });
        return;
      }

      if (combatState.enemyFirePaused) {
        emitNarration(io, opsSession.campaignId,
          `${DIM}Enemy fire is paused${RESET}`
        );
        socket.emit('ops:enemyFireResult', { results: [], paused: true });
        return;
      }

      const { resolveEnemyFire, formatEnemyFireNarration, totalEnemyDamage } = require('../../operations/enemy-fire');

      // Gather contacts with auto_fire overrides applied
      const allContacts = operations.getContactsByCampaign(opsSession.campaignId);
      const contacts = allContacts.map(c => {
        const override = combatState.autoFireOverrides?.[c.id];
        return {
          id: c.id,
          name: c.name,
          disposition: c.disposition,
          health: c.health,
          max_health: c.max_health,
          gunner_skill: c.gunner_skill || 1,
          range_band: c.range_band || 'medium',
          weapons: c.weapons || [],
          auto_fire: override !== undefined ? override : (c.disposition === 'hostile')
        };
      });

      // Get PC ship data
      const ship = operations.getShip(opsSession.shipId);
      const pcShip = ship ? {
        name: ship.name,
        armor: ship.ship_data?.armour?.rating || ship.ship_data?.armor || 0,
        hull: ship.current_state?.hull ?? ship.ship_data?.hull?.hullPoints ?? 100,
        maxHull: ship.ship_data?.hull?.hullPoints ?? 100,
        evasive: combatState.pcShipEvasive || false
      } : null;

      const results = resolveEnemyFire({ contacts, pcShip, paused: false });

      // Apply damage to PC ship via updateShipState
      const totalDmg = totalEnemyDamage(results);
      if (totalDmg > 0 && opsSession.shipId && pcShip) {
        const newHull = Math.max(0, pcShip.hull - totalDmg);
        operations.updateShipState(opsSession.shipId, { hull: newHull });
      }

      // Broadcast narration
      if (results.length > 0) {
        emitNarration(io, opsSession.campaignId,
          `\n${RED}${BOLD}── ENEMY RETURN FIRE ──${RESET}\n` +
          formatEnemyFireNarration(results).split('\n').map(line =>
            line.includes('HIT') ? `${RED}${line}${RESET}` :
            line.includes('MISS') ? `${DIM}${line}${RESET}` :
            `${YELLOW}${line}${RESET}`
          ).join('\n')
        );
      }

      // Broadcast results
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:enemyFireResult', {
        results,
        totalDamage: totalDmg
      });

      // Log
      if (results.length > 0) {
        const campaign = operations.getCampaign(opsSession.campaignId);
        operations.addCombatLogEntry(opsSession.campaignId, {
          actor: 'Enemy Fire',
          action: 'auto_fire',
          result: `${results.length} attacks, ${results.filter(r => r.hit).length} hits, ${totalDmg} total damage`
        });
      }

      socketLog.info(`[OPS] Enemy auto-fire: ${results.length} attacks, ${totalDmg} damage`);
    } catch (error) {
      socketLog.error('[OPS] Enemy fire error:', error);
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // FIGHTER OPERATIONS (C2)
  // ═══════════════════════════════════════════════════════════════

  // ops:launchCraft — GM launches fighters from ship's embarked craft
  socket.on('ops:launchCraft', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'GM only' });
        return;
      }

      const { createFighterContact, getAvailableCallsigns } = require('../../operations/fighter-ops');
      const combatState = campaignCombatState.get(opsSession.campaignId);
      if (!combatState) {
        socket.emit('ops:error', { message: 'No active combat' });
        return;
      }

      const count = Math.min(Math.max(1, data.count || 1), 6);
      const rangeBand = data.rangeBand || 'long';
      const launched = combatState.getContacts().filter(c => c.type === 'light_fighter');
      const launchedIds = launched.map(c => c.id);
      const available = getAvailableCallsigns(launchedIds);

      if (available.length === 0) {
        socket.emit('ops:error', { message: 'All fighters already launched' });
        return;
      }

      const toLaunch = available.slice(0, count);
      const contacts = [];

      for (let i = 0; i < toLaunch.length; i++) {
        const contact = createFighterContact(toLaunch[i], launchedIds.length + i, rangeBand);
        combatState.addContact(contact);
        contacts.push(contact);
      }

      // Broadcast launch
      const callsignList = toLaunch.join(', ');
      emitNarration(io, opsSession.campaignId,
        `\n${GREEN}${BOLD}── FIGHTERS LAUNCHED ──${RESET}\n` +
        `${GREEN}${toLaunch.length} Tlatl fighter${toLaunch.length > 1 ? 's' : ''} launched: ${callsignList}${RESET}`
      );

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:craftLaunched', {
        craft: contacts,
        callsigns: toLaunch
      });

      socketLog.info(`[OPS] Fighters launched: ${callsignList}`);
    } catch (error) {
      socketLog.error('[OPS] Launch craft error:', error);
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });

  // ops:alphaStrike — All friendly fighters fire at designated target
  socket.on('ops:alphaStrike', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'GM only' });
        return;
      }

      const { resolveAlphaStrike } = require('../../operations/fighter-ops');
      const combatState = campaignCombatState.get(opsSession.campaignId);
      if (!combatState) {
        socket.emit('ops:error', { message: 'No active combat' });
        return;
      }

      const targetId = data.targetId;
      if (!targetId) {
        socket.emit('ops:error', { message: 'Target required' });
        return;
      }

      const target = combatState.getContact(targetId);
      if (!target) {
        socket.emit('ops:error', { message: 'Target not found' });
        return;
      }

      const fighters = combatState.getContacts().filter(c =>
        c.type === 'light_fighter' && c.disposition === 'friendly' && c.health > 0
      );

      if (fighters.length === 0) {
        socket.emit('ops:error', { message: 'No active fighters' });
        return;
      }

      const weaponType = data.weaponType || 'missile';
      const result = resolveAlphaStrike(fighters, target, weaponType);

      // Apply damage to target contact
      if (result.totalDamage > 0) {
        combatState.applyDamage(targetId, result.totalDamage, 'alpha_strike');
      }

      // Broadcast narration
      emitNarration(io, opsSession.campaignId,
        `\n${GREEN}${BOLD}── ALPHA STRIKE ──${RESET}\n${GREEN}${result.narration}${RESET}`
      );

      // Broadcast results
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:alphaStrikeResult', result);

      // Log
      operations.addCombatLogEntry(opsSession.campaignId, {
        actor: 'Fighter Squadron',
        action: 'alpha_strike',
        target: target.name,
        result: `${result.hits}/${result.results.length} hits, ${result.totalDamage} damage`
      });

      socketLog.info(`[OPS] Alpha strike on ${target.name}: ${result.hits} hits, ${result.totalDamage} dmg`);
    } catch (error) {
      socketLog.error('[OPS] Alpha strike error:', error);
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });

  // ops:recoverCraft — Return fighter to mothership
  socket.on('ops:recoverCraft', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'GM only' });
        return;
      }

      const combatState = campaignCombatState.get(opsSession.campaignId);
      if (!combatState) {
        socket.emit('ops:error', { message: 'No active combat' });
        return;
      }

      const contactId = data.contactId;
      if (!contactId) {
        socket.emit('ops:error', { message: 'Contact ID required' });
        return;
      }

      const contact = combatState.getContact(contactId);
      if (!contact) {
        socket.emit('ops:error', { message: 'Contact not found' });
        return;
      }

      if (contact.type !== 'light_fighter' || contact.disposition !== 'friendly') {
        socket.emit('ops:error', { message: 'Can only recover friendly fighters' });
        return;
      }

      // Remove from contacts
      combatState.removeContact(contactId);

      const callsign = contact.callsign || contact.name;
      emitNarration(io, opsSession.campaignId,
        `${GREEN}Tlatl Fighter (${callsign}) recovered.${RESET}`
      );

      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:craftRecovered', {
        contactId,
        callsign
      });

      socketLog.info(`[OPS] Fighter recovered: ${callsign}`);
    } catch (error) {
      socketLog.error('[OPS] Recover craft error:', error);
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });

  // ops:boardShip — Marine boarding action
  socket.on('ops:boardShip', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'GM only' });
        return;
      }

      const { canBoard, resolveBoarding } = require('../../operations/boarding');
      const combatState = campaignCombatState.get(opsSession.campaignId);
      if (!combatState) {
        socket.emit('ops:error', { message: 'No active combat' });
        return;
      }

      const targetId = data.targetId;
      if (!targetId) {
        socket.emit('ops:error', { message: 'Target required' });
        return;
      }

      const target = combatState.getContact(targetId);
      if (!target) {
        socket.emit('ops:error', { message: 'Target not found' });
        return;
      }

      // Check if boardable
      const boardCheck = canBoard(target);
      if (!boardCheck.boardable) {
        socket.emit('ops:error', { message: boardCheck.reason });
        return;
      }

      // Resolve boarding
      const result = resolveBoarding({
        marineCount: data.marineCount || 4,
        meleeSkill: data.meleeSkill || 1,
        strDM: data.strDM || 0,
        defenderCrew: data.defenderCrew || 5,
        defenderSkill: data.defenderSkill || 0,
        difficulty: data.difficulty || 'moderate'
      });

      // Update contact status if captured
      if (result.captured) {
        combatState.removeContact(targetId);
      }

      // Broadcast narration
      const color = result.success ? GREEN : RED;
      emitNarration(io, opsSession.campaignId,
        `\n${YELLOW}${BOLD}── BOARDING ACTION ──${RESET}\n` +
        `${YELLOW}Marines board ${target.name}!${RESET}\n` +
        `${color}${result.narration}${RESET}`
      );

      // Broadcast results
      io.to(`ops:campaign:${opsSession.campaignId}`).emit('ops:boardingResult', {
        targetId,
        targetName: target.name,
        ...result
      });

      // Log
      operations.addCombatLogEntry(opsSession.campaignId, {
        actor: 'Marines',
        action: 'boarding',
        target: target.name,
        result: result.success ? `Captured! ${result.marineCasualties} marine casualties` : `Repelled. ${result.marineCasualties} marine casualties`
      });

      socketLog.info(`[OPS] Boarding ${target.name}: ${result.success ? 'SUCCESS' : 'FAILED'}, ${result.marineCasualties} casualties`);
    } catch (error) {
      socketLog.error('[OPS] Boarding error:', error);
      socket.emit('ops:error', sanitizeError('Combat', error));
    }
  });
}

module.exports = { register };
