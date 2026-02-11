/**
 * Combat Display Renderer
 * Renders combat state as ASCII art for E2E test debugging and prototyping.
 * Pure function - no side effects, just returns string.
 */

/**
 * Create a progress bar
 * @param {number} current - Current value
 * @param {number} max - Maximum value
 * @param {number} width - Bar width in chars
 * @returns {string} Progress bar like [████░░░░░░]
 */
function progressBar(current, max, width = 10) {
  if (max <= 0) return '░'.repeat(width);
  const pct = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(pct * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/**
 * Pad or truncate string to exact width
 * @param {string} str - Input string
 * @param {number} width - Target width
 * @param {string} align - 'left', 'right', 'center'
 * @returns {string} Padded string
 */
function pad(str, width, align = 'left') {
  str = String(str || '');
  if (str.length > width) return str.slice(0, width - 1) + '…';
  const padding = width - str.length;
  if (align === 'right') return ' '.repeat(padding) + str;
  if (align === 'center') {
    const left = Math.floor(padding / 2);
    return ' '.repeat(left) + str + ' '.repeat(padding - left);
  }
  return str + ' '.repeat(padding);
}

/**
 * Get power threshold label
 * @param {number} power - Current power
 * @param {number} maxPower - Max power
 * @returns {string} Threshold label
 */
function getPowerLabel(power, maxPower) {
  if (maxPower <= 0) return 'DISABLED';
  const pct = (power / maxPower) * 100;
  if (pct >= 75) return '';
  if (pct >= 50) return 'DEGRADED';
  if (pct >= 25) return 'CRITICAL';
  if (pct > 0) return 'EMERGENCY';
  return 'DISABLED';
}

/**
 * Format attack modifiers breakdown
 * @param {Object} modifiers - { skill, range, evasive, other }
 * @returns {string} Formatted modifier string
 */
function formatModifiers(modifiers) {
  if (!modifiers) return '';
  const parts = [];
  if (modifiers.skill) parts.push(`${modifiers.skill >= 0 ? '+' : ''}${modifiers.skill}skill`);
  if (modifiers.range) parts.push(`${modifiers.range >= 0 ? '+' : ''}${modifiers.range}range`);
  if (modifiers.evasive) parts.push(`${modifiers.evasive}evade`);
  if (modifiers.other) parts.push(`${modifiers.other >= 0 ? '+' : ''}${modifiers.other}other`);
  return parts.join(' ');
}

/**
 * Format a combatant line
 * @param {Object} combatant - Combatant data
 * @param {boolean} isActive - Whether this combatant is acting
 * @param {boolean} isPlayer - Whether this is the player's ship
 * @returns {string} Formatted line
 */
function formatCombatant(combatant, isActive, isPlayer) {
  const marker = isActive ? '▶' : isPlayer ? '•' : ' ';
  const name = pad(combatant.name || '???', 16);
  const health = combatant.health || 0;
  const maxHealth = combatant.max_health || combatant.maxHealth || 100;
  const bar = progressBar(health, maxHealth, 4);
  const rangeBand = (combatant.range_band || combatant.rangeBand || '?')[0].toUpperCase();

  return `${marker} ${name} [${bar}] ${rangeBand}`;
}

/**
 * Render full combat display
 * @param {Object} combatState - { phase, round, combatants: [...] }
 * @param {Object} shipState - Player ship { name, hull, maxHull, power, maxPower, evasive }
 * @param {Object} lastAction - Last attack result { hit, roll, dice, modifiers, totalDM, total, damage, actualDamage, damageType, attacker, target, weapon }
 * @returns {string} ASCII combat display
 */
function renderCombatDisplay(combatState, shipState, lastAction = null) {
  const width = 55;
  const leftWidth = 27;
  const rightWidth = 25;

  // Header
  const phase = (combatState?.phase || 'unknown').toUpperCase();
  const round = combatState?.round || 1;
  const header = `ROUND ${round} • ${phase} PHASE`;

  const lines = [];
  lines.push('╔' + '═'.repeat(width) + '╗');
  lines.push('║ ' + pad(header, width - 4) + ' ⚔️  ║');
  lines.push('╠' + '═'.repeat(width) + '╣');

  // Two columns: Combatants | Ship Status
  lines.push('║ ' + pad('COMBATANTS', leftWidth) + '│ ' + pad('YOUR SHIP', rightWidth) + '║');

  // Get combatants (max 4 shown)
  const combatants = (combatState?.combatants || []).slice(0, 4);
  const shipName = shipState?.name || 'Unknown';
  const hull = shipState?.hull ?? shipState?.health ?? 100;
  const maxHull = shipState?.maxHull ?? shipState?.max_health ?? 100;
  const power = shipState?.power ?? 100;
  const maxPower = shipState?.maxPower ?? shipState?.max_power ?? 100;
  const evasive = shipState?.evasive ? 'YES' : 'NO';

  // Row 1: First combatant | Hull
  const c0 = combatants[0] ? formatCombatant(combatants[0], true, false) : pad('(no contacts)', leftWidth);
  const hullPct = maxHull > 0 ? Math.round((hull / maxHull) * 100) : 0;
  lines.push('║ ' + pad(c0, leftWidth) + '│ Hull: ' + progressBar(hull, maxHull, 10) + ` ${hullPct}%` + ' ║');

  // Row 2: Second combatant detail | Power
  if (combatants[0]) {
    const range = combatants[0].range_km || combatants[0].rangeKm || '?';
    const rangeBand = combatants[0].range_band || combatants[0].rangeBand || '?';
    const detail1 = `  - ${range} km (${rangeBand})`;
    const powerPct = maxPower > 0 ? Math.round((power / maxPower) * 100) : 0;
    lines.push('║ ' + pad(detail1, leftWidth) + '│ Power: ' + progressBar(power, maxPower, 9) + ` ${powerPct}%` + ' ║');
  }

  // Row 3: Combatant power | Evasive
  if (combatants[0]) {
    const cPower = combatants[0].power ?? 100;
    const cMaxPower = combatants[0].max_power ?? 100;
    const cPct = cMaxPower > 0 ? Math.round((cPower / cMaxPower) * 100) : 0;
    const threshold = getPowerLabel(cPower, cMaxPower);
    const detail2 = `  - Power: ${cPct}%${threshold ? ' ' + threshold : ''}`;
    lines.push('║ ' + pad(detail2, leftWidth) + '│ Evasive: ' + pad(evasive, rightWidth - 10) + '║');
  }

  // Row 4: Player ship marker
  const playerLine = `• ${shipName} (you)`;
  lines.push('║ ' + pad(playerLine, leftWidth) + '│' + ' '.repeat(rightWidth + 1) + '║');

  // Divider
  lines.push('╠' + '─'.repeat(leftWidth + 1) + '┼' + '─'.repeat(rightWidth + 1) + '╣');

  // Last Action section
  lines.push('║ ' + pad('LAST ACTION', leftWidth) + '│' + ' '.repeat(rightWidth + 1) + '║');

  if (lastAction) {
    // Line 1: Attacker → Target
    const actionLine1 = `${lastAction.attacker || '?'} → ${lastAction.target || '?'}`;
    lines.push('║ ' + pad(actionLine1, leftWidth) + '│' + ' '.repeat(rightWidth + 1) + '║');

    // Line 2: Roll breakdown
    const dice = lastAction.dice || [0, 0];
    const roll = lastAction.roll || 0;
    const mods = formatModifiers(lastAction.modifiers);
    const actionLine2 = `2d6(${dice[0]},${dice[1]})=${roll} ${mods}`;
    lines.push('║ ' + pad(actionLine2, leftWidth) + '│' + ' '.repeat(rightWidth + 1) + '║');

    // Line 3: Total and result
    const total = lastAction.total || 0;
    const result = lastAction.hit ? 'HIT' : 'MISS';
    const actionLine3 = `Total: ${total} vs 8 = ${result}`;
    lines.push('║ ' + pad(actionLine3, leftWidth) + '│' + ' '.repeat(rightWidth + 1) + '║');

    // Line 4: Damage if hit
    if (lastAction.hit) {
      let damageLine;
      if (lastAction.damageType === 'ion') {
        damageLine = `⚡ ${lastAction.powerDrain || 0} power drained`;
      } else {
        const dmg = lastAction.damage || 0;
        const armor = lastAction.armorReduction || 0;
        const actual = lastAction.actualDamage || 0;
        damageLine = `Dmg: ${dmg} - ${armor} armor = ${actual} hull`;
      }
      lines.push('║ ' + pad(damageLine, leftWidth) + '│' + ' '.repeat(rightWidth + 1) + '║');
    }
  } else {
    lines.push('║ ' + pad('(no actions yet)', leftWidth) + '│' + ' '.repeat(rightWidth + 1) + '║');
  }

  // Footer
  lines.push('╚' + '═'.repeat(width) + '╝');

  return lines.join('\n');
}

/**
 * Render compact single-line combat status
 * @param {Object} combatState - Combat state
 * @returns {string} Single line like "R2 ATTACK | 3 contacts | Pirate Corsair acting"
 */
function renderCombatStatus(combatState) {
  const round = combatState?.round || 1;
  const phase = (combatState?.phase || '?').toUpperCase().slice(0, 6);
  const contacts = (combatState?.combatants || []).length;
  const active = combatState?.combatants?.[0]?.name || '?';
  return `R${round} ${phase} | ${contacts} contacts | ${active} acting`;
}

/**
 * Render attack result as compact log entry
 * @param {Object} result - Attack result
 * @returns {string} Log entry like "[HIT] Ion → Pirate (9 vs 8) 140 power"
 */
function renderAttackLog(result) {
  if (!result) return '';
  const status = result.hit ? '[HIT]' : '[MISS]';
  const weapon = result.weapon || '?';
  const target = result.target || '?';
  const total = result.total || 0;

  let effect = '';
  if (result.hit) {
    if (result.damageType === 'ion') {
      effect = ` ${result.powerDrain || 0}pwr`;
    } else {
      effect = ` ${result.actualDamage || 0}dmg`;
    }
    if (result.critical) {
      effect += ' CRIT!';
    }
  }

  return `${status} ${weapon} → ${target} (${total} vs 8)${effect}`;
}

// ========================================
// COMBAT NARRATOR - AR-207 ASCII Prototype
// Converts combat events to narrative text
// ========================================

/**
 * Narrate a phase change
 * @param {string} phase - Phase name (manoeuvre, attack, actions, round_end)
 * @param {number} round - Round number
 * @returns {string} Narrative text
 */
function narratePhaseChange(phase, round) {
  const phaseDescriptions = {
    manoeuvre: 'MANOEUVRE PHASE - Pilots may take evasive action.',
    attack: 'ATTACK PHASE - Gunners may fire.',
    actions: 'ACTIONS PHASE - Crew may perform repairs and other actions.',
    round_end: 'Round complete. Preparing next round...'
  };

  const desc = phaseDescriptions[phase] || `${phase.toUpperCase()} PHASE`;

  if (phase === 'manoeuvre') {
    return `═══ ROUND ${round} ═══\n${desc}`;
  }
  return desc;
}

/**
 * Narrate an attack result
 * @param {Object} result - Attack result from combat engine
 * @returns {string} Narrative text
 */
function narrateAttack(result) {
  if (!result) return '';

  const { attacker, target, weapon, hit, total, dice, damageType, actualDamage, powerDrain, critical } = result;

  // Roll description
  const rollDesc = dice ? `(${dice[0]}+${dice[1]}=${total} vs 8)` : `(${total} vs 8)`;

  // Build narrative
  let text = `${attacker} fires ${weapon} at ${target}...`;

  if (!hit) {
    text += ` MISS ${rollDesc}`;
    return text;
  }

  // Hit!
  text += ` HIT! ${rollDesc}`;

  if (damageType === 'ion') {
    text += `\n  ⚡ ${powerDrain} power drained`;
  } else if (actualDamage > 0) {
    text += `\n  ${actualDamage} hull damage`;
  } else {
    text += `\n  Armor absorbed all damage`;
  }

  if (critical) {
    text += ` - CRITICAL HIT!`;
  }

  return text;
}

/**
 * Narrate damage status
 * @param {string} targetName - Target name
 * @param {Object} damage - Damage details { hull, power, destroyed, hullPercent, powerPercent }
 * @returns {string} Narrative text
 */
function narrateDamage(targetName, damage) {
  if (!damage) return '';

  const parts = [];

  if (damage.destroyed) {
    return `${targetName} DESTROYED!`;
  }

  if (damage.hullPercent !== undefined) {
    if (damage.hullPercent <= 25) {
      parts.push(`${targetName} hull critical (${damage.hullPercent}%)`);
    } else if (damage.hullPercent <= 50) {
      parts.push(`${targetName} hull damaged (${damage.hullPercent}%)`);
    }
  }

  if (damage.powerPercent !== undefined) {
    if (damage.powerPercent <= 25) {
      parts.push(`${targetName} power critical (${damage.powerPercent}%) - weapons at -4 DM`);
    } else if (damage.powerPercent <= 50) {
      parts.push(`${targetName} power degraded (${damage.powerPercent}%) - weapons at -2 DM`);
    } else if (damage.powerPercent <= 75) {
      parts.push(`${targetName} power at ${damage.powerPercent}%`);
    }
  }

  return parts.join('\n');
}

/**
 * Narrate a critical hit effect
 * @param {Object} critEffect - Critical effect { location, severity, effect }
 * @returns {string} Narrative text
 */
function narrateCritical(critEffect) {
  if (!critEffect) return '';

  const locationNames = {
    sensors: 'Sensors',
    powerPlant: 'Power Plant',
    fuel: 'Fuel Tanks',
    weapon: 'Weapons',
    armour: 'Armor',
    hull: 'Hull',
    mDrive: 'M-Drive',
    cargo: 'Cargo Hold',
    jDrive: 'J-Drive',
    crew: 'Crew',
    computer: 'Computer'
  };

  const location = locationNames[critEffect.location] || critEffect.location;
  const severity = critEffect.severity || 1;

  return `CRITICAL: ${location} hit (Severity ${severity})`;
}

/**
 * Narrate a defensive reaction (sandcaster, point defense)
 * @param {string} type - Reaction type ('sandcaster', 'pointDefense')
 * @param {Object} result - Reaction result
 * @returns {string} Narrative text
 */
function narrateReaction(type, result) {
  if (!result) return '';

  if (type === 'sandcaster') {
    if (result.success) {
      return `Sandcaster deployed - armor bonus +${result.armorBonus || 0}`;
    }
    return `Sandcaster fired - no effect`;
  }

  if (type === 'pointDefense') {
    if (result.intercepted) {
      return `Point defense intercepts incoming missile!`;
    }
    return `Point defense fires - missile not intercepted`;
  }

  return '';
}

/**
 * Narrate combat start
 * @param {number} combatantCount - Number of combatants
 * @returns {string} Narrative text
 */
function narrateCombatStart(combatantCount) {
  return `═══ COMBAT INITIATED ═══\n${combatantCount} contact${combatantCount !== 1 ? 's' : ''} engaged. Battle stations!`;
}

/**
 * Narrate combat end
 * @param {string} outcome - Outcome description
 * @returns {string} Narrative text
 */
function narrateCombatEnd(outcome) {
  return `═══ COMBAT ENDED ═══\n${outcome || 'Hostilities ceased.'}`;
}

/**
 * Narrate evasive action
 * @param {string} shipName - Ship taking evasive action
 * @param {boolean} enabled - Whether evasive is enabled or disabled
 * @returns {string} Narrative text
 */
function narrateEvasive(shipName, enabled) {
  if (enabled) {
    return `${shipName} begins evasive maneuvers (-2 to incoming attacks)`;
  }
  return `${shipName} resumes normal flight`;
}

// ========================================
// VERBOSE MODE - AR-254
// Streams narrative to console when VERBOSE=1
// ========================================

/**
 * Check if verbose mode is enabled
 * @returns {boolean}
 */
function isVerbose() {
  return process.env.VERBOSE === '1' || process.env.VERBOSE === 'true';
}

/**
 * Log narrative if verbose mode is enabled
 * @param {string} text - Narrative text
 * @param {string} prefix - Optional prefix
 */
function verboseLog(text, prefix = '  📖 ') {
  if (isVerbose() && text) {
    console.log(prefix + text.split('\n').join('\n' + prefix));
  }
}

/**
 * Create a combat narrator that streams events
 * @returns {object} Narrator with event methods
 */
function createNarrator() {
  const events = [];

  return {
    /**
     * Record and optionally log a combat start
     * @param {number} combatantCount
     */
    combatStart(combatantCount) {
      const text = narrateCombatStart(combatantCount);
      events.push({ type: 'combat_start', text, timestamp: Date.now() });
      verboseLog(text, '\n⚔️  ');
    },

    /**
     * Record and optionally log a phase change
     * @param {string} phase
     * @param {number} round
     */
    phaseChange(phase, round) {
      const text = narratePhaseChange(phase, round);
      events.push({ type: 'phase', phase, round, text, timestamp: Date.now() });
      verboseLog(text, '\n🔄 ');
    },

    /**
     * Record and optionally log an attack
     * @param {object} result
     */
    attack(result) {
      const text = narrateAttack(result);
      events.push({ type: 'attack', result, text, timestamp: Date.now() });
      verboseLog(text, result.hit ? '💥 ' : '💨 ');
    },

    /**
     * Record and optionally log damage
     * @param {string} targetName
     * @param {object} damage
     */
    damage(targetName, damage) {
      const text = narrateDamage(targetName, damage);
      if (text) {
        events.push({ type: 'damage', targetName, damage, text, timestamp: Date.now() });
        verboseLog(text, '🔥 ');
      }
    },

    /**
     * Record and optionally log a critical hit
     * @param {object} critEffect
     */
    critical(critEffect) {
      const text = narrateCritical(critEffect);
      if (text) {
        events.push({ type: 'critical', critEffect, text, timestamp: Date.now() });
        verboseLog(text, '⚠️  ');
      }
    },

    /**
     * Record and optionally log a reaction
     * @param {string} type
     * @param {object} result
     */
    reaction(type, result) {
      const text = narrateReaction(type, result);
      if (text) {
        events.push({ type: 'reaction', reactionType: type, result, text, timestamp: Date.now() });
        verboseLog(text, '🛡️  ');
      }
    },

    /**
     * Record and optionally log evasive action
     * @param {string} shipName
     * @param {boolean} enabled
     */
    evasive(shipName, enabled) {
      const text = narrateEvasive(shipName, enabled);
      events.push({ type: 'evasive', shipName, enabled, text, timestamp: Date.now() });
      verboseLog(text, '🚀 ');
    },

    /**
     * Record and optionally log combat end
     * @param {string} outcome
     */
    combatEnd(outcome) {
      const text = narrateCombatEnd(outcome);
      events.push({ type: 'combat_end', text, timestamp: Date.now() });
      verboseLog(text, '\n🏁 ');
    },

    /**
     * Get all recorded events
     * @returns {array}
     */
    getEvents() {
      return events;
    },

    /**
     * Get full narrative as text
     * @returns {string}
     */
    getFullNarrative() {
      return events.map(e => e.text).filter(Boolean).join('\n');
    },

    /**
     * Clear all events
     */
    clear() {
      events.length = 0;
    }
  };
}

module.exports = {
  // Display functions
  renderCombatDisplay,
  renderCombatStatus,
  renderAttackLog,
  progressBar,
  formatModifiers,
  // Narrator functions (AR-207)
  narratePhaseChange,
  narrateAttack,
  narrateDamage,
  narrateCritical,
  narrateReaction,
  narrateCombatStart,
  narrateCombatEnd,
  narrateEvasive,
  // Verbose mode (AR-254)
  isVerbose,
  verboseLog,
  createNarrator
};
