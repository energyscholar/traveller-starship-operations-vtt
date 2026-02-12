/**
 * AR-223: Boarding System
 * Based on Mongoose Traveller 2E High Guard rules
 *
 * Troop strength: crew ×1, marines ×2
 * Modifiers for armor, weapons, numbers, no-marine penalty
 * Result table based on opposed roll difference
 */

const BOARDING_OUTCOMES = [
  'ATTACKERS_DEFEATED',
  'ATTACKERS_RETREAT',
  'FIGHTING_CONTINUES',
  'SUCCESS',
  'IMMEDIATE_CONTROL'
];

/**
 * Calculate troop strength for boarding actions
 *
 * @param {Object} params
 * @param {number} [params.crew=0] - Number of crew fighting
 * @param {number} [params.marines=0] - Number of marines (count as 2 each)
 * @param {number} [params.armorRating=0] - Armor rating (>5 = +1)
 * @param {number} [params.weaponsRating=0] - Weapons rating (>=2 = +1)
 * @returns {number} Total troop strength
 */
function calculateTroopStrength(params) {
  const {
    crew = 0,
    marines = 0,
    armorRating = 0,
    weaponsRating = 0
  } = params;

  let strength = crew + (marines * 2);

  // Superior armor bonus (Battle Dress = rating 6+)
  if (armorRating > 5) strength += 1;

  // Superior weapons bonus (heavy weapons)
  if (weaponsRating >= 2) strength += 1;

  return strength;
}

/**
 * Calculate boarding modifiers based on force comparison
 *
 * @param {Object} attacker - Attacker stats
 * @param {number} attacker.armor - Armor rating
 * @param {number} attacker.weapons - Weapons rating
 * @param {number} attacker.strength - Troop strength
 * @param {number} attacker.marines - Marine count
 * @param {Object} defender - Defender stats
 * @returns {Object} { attacker: number, defender: number, breakdown: string[] }
 */
function getBoardingModifiers(attacker, defender) {
  const mods = { attacker: 0, defender: 0, breakdown: [] };

  // Armor comparison
  if (attacker.armor > defender.armor) {
    mods.attacker += 1;
    mods.breakdown.push('Superior Armor: +1');
  } else if (defender.armor > attacker.armor) {
    mods.defender += 1;
    mods.breakdown.push('Defender Superior Armor: +1 (def)');
  }

  // Weapons comparison
  if (attacker.weapons > defender.weapons) {
    mods.attacker += 1;
    mods.breakdown.push('Superior Weapons: +1');
  } else if (defender.weapons > attacker.weapons) {
    mods.defender += 1;
    mods.breakdown.push('Defender Superior Weapons: +1 (def)');
  }

  // Numbers comparison
  const ratio = attacker.strength / Math.max(1, defender.strength);
  if (ratio >= 4) {
    mods.attacker += 3;
    mods.breakdown.push('Vastly Superior Numbers (4:1+): +3');
  } else if (ratio >= 2) {
    mods.attacker += 1;
    mods.breakdown.push('Superior Numbers (2:1): +1');
  } else if (ratio <= 0.25) {
    mods.defender += 3;
    mods.breakdown.push('Defender Vastly Superior Numbers: +3 (def)');
  } else if (ratio <= 0.5) {
    mods.defender += 1;
    mods.breakdown.push('Defender Superior Numbers: +1 (def)');
  }

  // No marines penalty (defender has no marines = easier to board)
  if (defender.marines === 0 && attacker.marines > 0) {
    mods.attacker += 2;
    mods.breakdown.push('Defender No Marines: +2');
  }

  return mods;
}

/**
 * Resolve boarding action based on opposed rolls
 *
 * @param {number} attackerRoll - Attacker's total (2D6 + mods)
 * @param {number} defenderRoll - Defender's total (2D6 + mods)
 * @returns {Object} Resolution result with outcome and effects
 */
function resolveBoardingAction(attackerRoll, defenderRoll) {
  const diff = attackerRoll - defenderRoll;

  // MT2E Boarding Result Table
  if (diff <= -7) {
    return {
      outcome: 'ATTACKERS_DEFEATED',
      counterBoardAllowed: true,
      counterBoardDM: 4,
      hullDamage: 0,
      roundsToResolve: 0,
      description: 'Attackers defeated! Defender may counter-board at +4 DM.'
    };
  }

  if (diff >= -6 && diff <= -4) {
    return {
      outcome: 'ATTACKERS_RETREAT',
      counterBoardAllowed: false,
      hullDamage: 0,
      roundsToResolve: 0,
      description: 'Attackers retreat or are killed/captured.'
    };
  }

  if (diff >= -3 && diff <= -1) {
    return {
      outcome: 'FIGHTING_CONTINUES',
      attackerDM: 0,
      defenderDM: 2,
      hullDamage: roll2d6(),
      roundsToResolve: roll1d6(),
      description: 'Fighting continues. Defender gains +2 DM next round. Ship takes 2D Hull damage.'
    };
  }

  if (diff === 0) {
    return {
      outcome: 'FIGHTING_CONTINUES',
      attackerDM: 0,
      defenderDM: 0,
      hullDamage: 0,
      roundsToResolve: roll1d6(),
      description: 'Fighting continues. No advantage to either side.'
    };
  }

  if (diff >= 1 && diff <= 3) {
    return {
      outcome: 'FIGHTING_CONTINUES',
      attackerDM: 2,
      defenderDM: 0,
      hullDamage: roll2d6(),
      roundsToResolve: roll1d6(),
      description: 'Fighting continues. Attacker gains +2 DM next round. Ship takes 2D Hull damage.'
    };
  }

  if (diff >= 4 && diff <= 6) {
    return {
      outcome: 'SUCCESS',
      hullDamage: roll1d6(),
      roundsToControl: roll2d6(),
      description: 'Success! Attackers gain control after 2D rounds. Ship takes 1D Hull damage.'
    };
  }

  // diff >= 7
  return {
    outcome: 'IMMEDIATE_CONTROL',
    hullDamage: 0,
    roundsToControl: 0,
    description: 'Immediate control! Attackers take the ship without further resistance.'
  };
}

/**
 * Check if boarding attempt is allowed
 *
 * @param {Object} params
 * @param {string} params.range - Current range to target
 * @param {number} params.attackerMarines - Marines available
 * @param {Object} params.attackerHangar - Hangar/launch bay status
 * @returns {boolean} True if boarding can be attempted
 */
function canAttemptBoarding(params) {
  const { range, attackerMarines, attackerHangar } = params;

  // Must be at Adjacent range (<1 km)
  if (range !== 'Adjacent') return false;

  // Must have marines
  if (!attackerMarines || attackerMarines <= 0) return false;

  // Must have functional launch capability
  if (attackerHangar?.disabled) return false;

  return true;
}

const { roll1d6, roll2d6Sum: roll2d6 } = require('./dice');

module.exports = {
  BOARDING_OUTCOMES,
  calculateTroopStrength,
  getBoardingModifiers,
  resolveBoardingAction,
  canAttemptBoarding,
  roll1d6,
  roll2d6
};
