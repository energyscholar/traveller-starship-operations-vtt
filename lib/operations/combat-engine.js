/**
 * Combat Resolution Engine for Operations VTT (Autorun 14)
 *
 * Traveller-based combat resolution:
 * - Attack: 2D6 + skill + modifiers >= 8 to hit
 * - Damage: Weapon dice - armor = hull damage
 * - Critical: Effect 6+ triggers critical hit
 * - Called Shots: AR-196 - Target specific systems with penalty
 */

// ============================================================================
// AR-196: CALLED SHOT SYSTEM
// ============================================================================

/**
 * Systems that can be targeted with called shots
 * Note: 'crew' and 'hull' are not valid called shot targets
 */
const TARGETABLE_SYSTEMS = [
  'mDrive',      // Maneuver drive - prevent escape
  'jDrive',      // Jump drive - prevent jump
  'powerPlant',  // Power plant - cripple ship
  'sensors',     // Sensors - blind the enemy
  'weapon',      // Weapons - disarm
  'computer',    // Computer - disable fire control
  'fuel'         // Fuel tanks - strand the ship
];

/**
 * Called shot penalties by system criticality
 * Critical systems (jDrive, powerPlant) are harder to hit
 */
const CALLED_SHOT_PENALTIES = {
  mDrive: -2,
  jDrive: -4,      // Critical - harder to hit
  powerPlant: -4,  // Critical - harder to hit
  sensors: -2,
  weapon: -2,
  computer: -3,
  fuel: -2
};

/**
 * Get the attack penalty for a called shot target
 * @param {string|null} targetSystem - System being targeted, or null for normal shot
 * @returns {number} DM penalty (negative number, or 0 for normal shot)
 */
function getCalledShotPenalty(targetSystem) {
  if (!targetSystem) return 0;
  return CALLED_SHOT_PENALTIES[targetSystem] || -2;
}

// ============================================================================
// DICE ROLLING
// ============================================================================

/**
 * Roll 2D6 (two six-sided dice)
 * @returns {Object} { dice: [d1, d2], total: sum }
 */
function roll2D6() {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return {
    dice: [d1, d2],
    total: d1 + d2
  };
}

/**
 * Roll 1D6
 * @returns {number} 1-6
 */
function roll1D6() {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Parse and roll damage dice string (e.g., "2d6", "4d6+2", "1d6-1")
 * @param {string} diceStr - Dice notation (e.g., "2d6", "3d6+4")
 * @returns {Object} { dice: [...rolls], modifier: number, total: sum }
 */
function rollDamage(diceStr) {
  if (!diceStr || typeof diceStr !== 'string') {
    // Default to 1d6 if not specified
    const roll = roll1D6();
    return { dice: [roll], modifier: 0, total: roll };
  }

  // Parse dice notation: NdX+M or NdX-M
  const match = diceStr.toLowerCase().match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) {
    // Fallback for non-standard formats
    const roll = roll1D6();
    return { dice: [roll], modifier: 0, total: roll };
  }

  const numDice = parseInt(match[1], 10);
  const dieSize = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  const dice = [];
  for (let i = 0; i < numDice; i++) {
    dice.push(Math.floor(Math.random() * dieSize) + 1);
  }

  const diceTotal = dice.reduce((sum, d) => sum + d, 0);
  return {
    dice,
    modifier,
    total: Math.max(0, diceTotal + modifier) // Damage can't be negative
  };
}

// ============================================================================
// RANGE MODIFIERS
// ============================================================================

/**
 * Range band modifiers for attacks
 * Traveller 5e range bands
 */
const RANGE_DM = {
  adjacent: 1,  // Point blank
  close: 0,     // Short range
  short: 0,     // Standard
  medium: -1,   // -1 DM
  long: -2,     // -2 DM
  extreme: -4,  // Very difficult
  distant: -6   // Nearly impossible
};

/**
 * Get range modifier for attack
 * @param {string} weaponRange - Weapon's optimal range
 * @param {string} targetRange - Target's current range band
 * @returns {number} DM to apply
 */
function getRangeModifier(weaponRange, targetRange) {
  const rangeDM = RANGE_DM[targetRange] !== undefined ? RANGE_DM[targetRange] : -4;

  // Weapon range bonus: attacking within optimal range is easier
  let weaponBonus = 0;
  if (weaponRange === 'long' && (targetRange === 'long' || targetRange === 'extreme')) {
    weaponBonus = 1; // Long-range weapons better at distance
  } else if (weaponRange === 'short' && (targetRange === 'adjacent' || targetRange === 'close')) {
    weaponBonus = 1; // Short-range weapons better up close
  }

  return rangeDM + weaponBonus;
}

// ============================================================================
// ATTACK RESOLUTION
// ============================================================================

/**
 * Resolve an attack roll
 * @param {Object} attacker - Attacker data { name, skills: { gunnery: N } }
 * @param {Object} weapon - Weapon data { name, damage, range }
 * @param {Object} target - Target data { name, range_band, armor, evasive, health, max_health }
 * @param {Object} modifiers - Additional modifiers { dm: N, targetSystem: string, ... }
 * @returns {Object} Attack result
 */
function resolveAttack(attacker, weapon, target, modifiers = {}) {
  // Roll 2D6
  const attackRoll = roll2D6();

  // Calculate total DM
  const gunnerSkill = attacker?.skills?.gunnery || attacker?.skills?.Gunnery || 0;
  const rangeDM = getRangeModifier(weapon.range, target.range_band);
  const evasiveDM = target.evasive ? -2 : 0;
  const additionalDM = modifiers.dm || 0;

  // AR-196: Called shot penalty
  const targetSystem = modifiers.targetSystem || null;
  const calledShotDM = getCalledShotPenalty(targetSystem);

  const totalDM = gunnerSkill + rangeDM + evasiveDM + additionalDM + calledShotDM;
  const total = attackRoll.total + totalDM;
  const effect = total - 8; // Effect is how much over/under target number

  const hit = total >= 8;

  const result = {
    hit,
    roll: attackRoll.total,
    dice: attackRoll.dice,
    modifiers: {
      skill: gunnerSkill,
      range: rangeDM,
      evasive: evasiveDM,
      other: additionalDM,
      calledShot: calledShotDM  // AR-196: Include called shot penalty
    },
    totalDM,
    total,
    effect,
    attacker: attacker.name || 'Unknown',
    weapon: weapon.name || 'Unknown Weapon',
    target: target.name || 'Unknown Target',
    targetSystem  // AR-196: Include targeted system in result
  };

  if (!hit) {
    result.damage = 0;
    result.actualDamage = 0;
    result.message = `${result.attacker} MISSED ${result.target} with ${result.weapon} (${total} vs 8)`;
    return result;
  }

  // Calculate damage
  const damageRoll = rollDamage(weapon.damage || '2d6');
  const armor = target.armor || 0;
  const actualDamage = Math.max(0, damageRoll.total - armor);

  result.damageRoll = damageRoll;
  result.damage = damageRoll.total;
  result.armorReduction = Math.min(armor, damageRoll.total);
  result.actualDamage = actualDamage;

  // Check for critical hit (effect 6+)
  result.critical = effect >= 6;
  if (result.critical) {
    result.criticalEffect = rollCriticalEffect();
  }

  // Build message
  if (actualDamage === 0) {
    result.message = `${result.attacker} HIT ${result.target} but armor absorbed all damage!`;
  } else if (result.critical) {
    result.message = `${result.attacker} CRITICAL HIT on ${result.target}! ${actualDamage} damage + ${result.criticalEffect.effect}`;
  } else {
    result.message = `${result.attacker} HIT ${result.target} for ${actualDamage} damage!`;
  }

  return result;
}

// ============================================================================
// CRITICAL HITS
// ============================================================================

/**
 * Critical hit effects table
 */
const CRITICAL_EFFECTS = [
  { roll: 2, effect: 'Sensors Damaged', system: 'sensors' },
  { roll: 3, effect: 'Power Surge', system: 'powerPlant' },
  { roll: 4, effect: 'Fuel Leak', system: 'fuel' },
  { roll: 5, effect: 'Weapon Disabled', system: 'weapon' },
  { roll: 6, effect: 'Hull Breach', system: 'hull' },
  { roll: 7, effect: 'Crew Casualty', system: 'crew' },
  { roll: 8, effect: 'M-Drive Hit', system: 'mDrive' },
  { roll: 9, effect: 'Bridge Hit', system: 'computer' },
  { roll: 10, effect: 'J-Drive Damaged', system: 'jDrive' },
  { roll: 11, effect: 'Cargo Hold Breach', system: 'cargo' },
  { roll: 12, effect: 'Reactor Damage', system: 'powerPlant' }
];

/**
 * Roll for critical hit effect
 * @returns {Object} { roll, effect, system }
 */
function rollCriticalEffect() {
  const roll = roll2D6();
  const effect = CRITICAL_EFFECTS.find(e => e.roll === roll.total) ||
                 CRITICAL_EFFECTS.find(e => e.roll === 7); // Default to crew casualty
  return {
    roll: roll.total,
    dice: roll.dice,
    effect: effect.effect,
    system: effect.system
  };
}

// ============================================================================
// DAMAGE APPLICATION
// ============================================================================

/**
 * Calculate new health after damage
 * @param {number} currentHealth - Current hull points
 * @param {number} maxHealth - Maximum hull points
 * @param {number} damage - Damage to apply (after armor)
 * @returns {Object} { health, destroyed, percentRemaining }
 */
function applyDamage(currentHealth, maxHealth, damage) {
  const newHealth = Math.max(0, currentHealth - damage);
  const destroyed = newHealth <= 0;
  const percentRemaining = Math.round((newHealth / maxHealth) * 100);

  return {
    health: newHealth,
    maxHealth,
    damage,
    destroyed,
    percentRemaining
  };
}

/**
 * Check if target is destroyed
 * @param {number} health - Current health
 * @returns {boolean} True if destroyed
 */
function checkDestroyed(health) {
  return health <= 0;
}

// ============================================================================
// POINT DEFENSE
// ============================================================================

/**
 * Resolve point defense against incoming missile
 * @param {Object} defender - Defender with point defense capability
 * @param {Object} missile - Incoming missile data
 * @returns {Object} { intercepted, roll, total }
 */
function resolvePointDefense(defender, missile) {
  const roll = roll2D6();
  const skill = defender?.skills?.gunnery || 0;
  const total = roll.total + skill;
  const intercepted = total >= 8;

  return {
    intercepted,
    roll: roll.total,
    dice: roll.dice,
    skill,
    total,
    message: intercepted ?
      `Point defense intercepted incoming ${missile.name || 'missile'}!` :
      `Point defense failed to intercept ${missile.name || 'missile'}!`
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Dice rolling
  roll2D6,
  roll1D6,
  rollDamage,

  // Range
  RANGE_DM,
  getRangeModifier,

  // AR-196: Called shots
  TARGETABLE_SYSTEMS,
  CALLED_SHOT_PENALTIES,
  getCalledShotPenalty,

  // Combat resolution
  resolveAttack,
  rollCriticalEffect,
  CRITICAL_EFFECTS,

  // Damage
  applyDamage,
  checkDestroyed,

  // Point defense
  resolvePointDefense
};
