/**
 * Combat Resolution Engine for Operations VTT (Autorun 14)
 *
 * Traveller-based combat resolution:
 * - Attack: 2D6 + skill + modifiers >= 8 to hit
 * - Damage: Weapon dice + effect - armor × damageMultiple
 * - Critical: Effect 6+ triggers critical hit (random 2D location)
 * - Sensor Lock: Boon (3D6 keep best 2) to gunner attacks
 */

const { roll1d6: roll1D6, roll2d6: roll2D6 } = require('../dice');

/**
 * Roll attack with Boon: 3D6 keep best 2 (CRB p161: sensor lock)
 * @returns {Object} { dice: [kept1, kept2], total: sum, allDice: [d1,d2,d3], boon: true }
 */
function rollAttackWithBoon() {
  const dice = [roll1D6(), roll1D6(), roll1D6()];
  dice.sort((a, b) => b - a);
  return {
    dice: [dice[0], dice[1]],
    total: dice[0] + dice[1],
    allDice: [...dice],
    boon: true
  };
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

  // Ion weapon detection: damage string starts with 'ion' (legacy) or weapon has ion trait
  // Ion ignores armour. Power drain = (dice total + effect) × damageMultiple
  if (diceStr.toLowerCase() === 'ion') {
    // Legacy 'ion' string — use 7d6 default (ion barbette)
    const dice = [];
    for (let i = 0; i < 7; i++) {
      dice.push(roll1D6());
    }
    const total = dice.reduce((sum, d) => sum + d, 0);
    return {
      type: 'ion',
      dice,
      modifier: 0,
      total
    };
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
  adjacent: 0,
  close: 0,
  short: 1,
  medium: 0,
  long: -2,
  very_long: -4,
  distant: -6
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
  if (weaponRange === 'long' && (targetRange === 'long' || targetRange === 'very_long')) {
    weaponBonus = 1; // Long-range weapons better at distance
  } else if (weaponRange === 'short' && (targetRange === 'adjacent' || targetRange === 'close')) {
    weaponBonus = 1; // Short-range weapons better up close
  }

  return rangeDM + weaponBonus;
}

// ============================================================================
// WEAPON ATTACK DM BONUSES (CRB p156)
// ============================================================================

const WEAPON_ATTACK_DM = {
  pulse_laser: 2,   // +2 DM to attack
  beam_laser: 4     // +4 DM to attack
};

/**
 * Get weapon-specific attack DM bonus
 * @param {Object} weapon - Weapon with type or name
 * @returns {number} DM bonus (0 if none)
 */
function getWeaponAttackDM(weapon) {
  if (!weapon) return 0;
  // Check weapon type field first, then infer from name
  const type = weapon.type || weapon.weapon_type || '';
  if (WEAPON_ATTACK_DM[type] !== undefined) return WEAPON_ATTACK_DM[type];
  // Check name for weapon type
  const name = (weapon.name || '').toLowerCase();
  if (name.includes('pulse laser')) return WEAPON_ATTACK_DM.pulse_laser;
  if (name.includes('beam laser')) return WEAPON_ATTACK_DM.beam_laser;
  return 0;
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
  // Roll attack: Boon = roll 3D6 keep best 2 (CRB p161: sensor lock)
  const attackRoll = modifiers.boon ? rollAttackWithBoon() : roll2D6();

  // Calculate total DM
  const gunnerSkill = attacker?.skills?.gunnery || attacker?.skills?.Gunnery || 0;
  const rangeDM = getRangeModifier(weapon.range, target.range_band);
  // TODO: Evasive DM is flat -2. RAW: -Pilot skill per dodge (each costs 1 Thrust)
  const evasiveDM = target.evasive ? -2 : 0;
  const additionalDM = modifiers.dm || 0;
  const weaponAttackDM = getWeaponAttackDM(weapon);

  const totalDM = gunnerSkill + rangeDM + evasiveDM + additionalDM + weaponAttackDM;
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
      fireControl: modifiers.fireControl || 0,  // AR-208: Fire Control DM
      weaponDM: weaponAttackDM,
      other: additionalDM - (modifiers.fireControl || 0),  // Subtract FC since it's in dm
      boon: !!modifiers.boon
    },
    totalDM,
    total,
    effect,
    attacker: attacker.name || 'Unknown',
    weapon: weapon.name || 'Unknown Weapon',
    target: target.name || 'Unknown Target'
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

  // Ion weapons deal power drain, not hull damage. Ion ignores armour.
  const isIonWeapon = damageRoll.type === 'ion' || (weapon.traits && weapon.traits.includes('ion'));
  const damageMultiple = weapon.damageMultiple || 1;

  let actualDamage;
  if (isIonWeapon) {
    actualDamage = 0;
  } else {
    actualDamage = Math.max(0, damageRoll.total + Math.max(0, effect) - armor) * damageMultiple;
  }

  result.damageRoll = damageRoll;
  result.damage = damageRoll.total;
  result.damageType = isIonWeapon ? 'ion' : 'hull';
  result.armorReduction = isIonWeapon ? 0 : Math.min(armor, damageRoll.total);
  result.actualDamage = actualDamage;

  // Ion power drain: (dice total + effect) × damageMultiple
  // Duration: 1 round, or D3 rounds if Effect >= 6
  if (isIonWeapon) {
    result.powerDrain = (damageRoll.total + Math.max(0, effect)) * damageMultiple;
    result.ionDuration = effect >= 6 ? (Math.floor(Math.random() * 3) + 1) : 1;
  }

  // Critical hit: effect 6+ and damage > 0 (ion criticals allowed)
  result.critical = effect >= 6 && (actualDamage > 0 || (isIonWeapon && result.powerDrain > 0));
  if (result.critical) {
    result.criticalEffect = rollCriticalEffect();
  }

  // Build message
  if (isIonWeapon) {
    result.message = `${result.attacker} HIT ${result.target} with ION CANNON! ${result.powerDrain} power drained!`;
  } else if (actualDamage === 0) {
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
  { roll: 6, effect: 'Armour Damaged', system: 'armour' },
  { roll: 7, effect: 'Hull Hit', system: 'hull' },
  { roll: 8, effect: 'M-Drive Hit', system: 'mDrive' },
  { roll: 9, effect: 'Cargo Hit', system: 'cargo' },
  { roll: 10, effect: 'J-Drive Damaged', system: 'jDrive' },
  { roll: 11, effect: 'Crew Casualty', system: 'crew' },
  { roll: 12, effect: 'Computer Damaged', system: 'computer' }
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
