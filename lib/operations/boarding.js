/**
 * Boarding Action Module
 * Opposed roll mechanic for marine boarding operations
 */

const { roll2D6 } = require('./combat-engine');

// Difficulty presets
const DIFFICULTY = {
  light: { name: 'Light Resistance', defenderMod: -2 },
  moderate: { name: 'Moderate Resistance', defenderMod: 0 },
  heavy: { name: 'Heavy Resistance', defenderMod: 2 },
  desperate: { name: 'Desperate Resistance', defenderMod: 4 }
};

/**
 * Check if a contact is boardable
 * @param {Object} contact - Contact to check
 * @returns {{ boardable: boolean, reason: string }}
 */
function canBoard(contact) {
  if (!contact) return { boardable: false, reason: 'No target' };
  if (contact.disposition === 'friendly') return { boardable: false, reason: 'Cannot board friendly vessel' };
  if (contact.health <= 0) return { boardable: true, reason: 'Target destroyed/drifting' };

  const hpPercent = contact.health / (contact.maxHealth || contact.max_health || 1);
  if (hpPercent <= 0.25) return { boardable: true, reason: 'Target heavily damaged (<25% HP)' };
  if (contact.disabled) return { boardable: true, reason: 'Target disabled' };
  if (contact.status === 'disabled') return { boardable: true, reason: 'Target disabled' };
  if (contact.status === 'drifting') return { boardable: true, reason: 'Target drifting' };

  return { boardable: false, reason: `Target must be disabled or below 25% HP (currently ${Math.round(hpPercent * 100)}%)` };
}

/**
 * Resolve a boarding action with opposed roll
 * @param {Object} params
 * @param {number} params.marineCount - Number of attacking marines
 * @param {number} params.meleeSkill - Average melee/combat skill of marines
 * @param {number} params.strDM - Average STR DM of marines
 * @param {number} params.defenderCrew - Remaining enemy crew count
 * @param {number} params.defenderSkill - Average combat skill of defenders
 * @param {string} params.difficulty - 'light', 'moderate', 'heavy', 'desperate'
 * @returns {Object} Boarding result
 */
function resolveBoarding({ marineCount, meleeSkill = 1, strDM = 0, defenderCrew, defenderSkill = 0, difficulty = 'moderate' }) {
  const diff = DIFFICULTY[difficulty] || DIFFICULTY.moderate;

  // Attacker roll: 2D6 + (marineCount * (meleeSkill + strDM)) / marineCount (average)
  // Simplified: 2D6 + meleeSkill + strDM + marineCount bonus
  const marineBonus = Math.floor(Math.log2(Math.max(1, marineCount)));
  const attackerMod = meleeSkill + strDM + marineBonus;
  const attackerRollResult = roll2D6();
  const attackerRoll = attackerRollResult.total;
  const attackerTotal = attackerRoll + attackerMod;

  // Defender roll: 2D6 + defenderSkill + difficulty modifier + crew bonus
  const crewBonus = Math.floor(Math.log2(Math.max(1, defenderCrew)));
  const defenderMod = defenderSkill + diff.defenderMod + crewBonus;
  const defenderRollResult = roll2D6();
  const defenderRoll = defenderRollResult.total;
  const defenderTotal = defenderRoll + defenderMod;

  // Margin of success/failure
  const margin = attackerTotal - defenderTotal;
  const success = margin >= 0;

  // Casualties: margin of success = casualties on losing side (minimum 0)
  const absoluteMargin = Math.abs(margin);
  const marineCasualties = success ? Math.min(Math.floor(absoluteMargin / 3), marineCount) : Math.min(absoluteMargin, marineCount);
  const defenderCasualties = success ? Math.min(absoluteMargin, defenderCrew) : Math.min(Math.floor(absoluteMargin / 3), defenderCrew);

  // Build narration
  let narration = '';
  if (success) {
    if (margin >= 6) {
      narration = 'Overwhelming victory! Defenders surrender immediately.';
    } else if (margin >= 3) {
      narration = 'Fierce resistance overcome. Bridge secured.';
    } else {
      narration = 'Hard-fought boarding. The ship is taken.';
    }
    if (marineCasualties > 0) {
      narration += ` ${marineCasualties} marine casualt${marineCasualties === 1 ? 'y' : 'ies'}.`;
    } else {
      narration += ' No marine casualties.';
    }
  } else {
    if (Math.abs(margin) >= 6) {
      narration = 'Boarding repelled with heavy losses! Marines fall back.';
    } else if (Math.abs(margin) >= 3) {
      narration = 'Defenders hold. Marines forced to withdraw.';
    } else {
      narration = 'Stalemate — marines withdraw under fire.';
    }
    narration += ` ${marineCasualties} marine casualt${marineCasualties === 1 ? 'y' : 'ies'}.`;
  }

  return {
    success,
    margin,
    attackerRoll,
    attackerMod,
    attackerTotal,
    defenderRoll,
    defenderMod,
    defenderTotal,
    difficulty: diff.name,
    marineCasualties,
    defenderCasualties,
    narration,
    captured: success
  };
}

module.exports = {
  canBoard,
  resolveBoarding,
  DIFFICULTY
};
