/**
 * Skill Check Framework (AR-184)
 *
 * Unified 2D6 skill check system for Traveller operations.
 * Supports standard checks, boon/bane, and critical success/failure.
 */

const { roll2d6: roll2D6 } = require('./dice');

/**
 * Roll 3D6, keep best 2 (Boon)
 * @returns {Object} { dice: [d1, d2, d3], kept: [k1, k2], total: number }
 */
function roll3D6KeepBest2() {
  const dice = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ];
  const sorted = [...dice].sort((a, b) => b - a);
  const kept = [sorted[0], sorted[1]];
  return { dice, kept, total: kept[0] + kept[1] };
}

/**
 * Roll 3D6, keep worst 2 (Bane)
 * @returns {Object} { dice: [d1, d2, d3], kept: [k1, k2], total: number }
 */
function roll3D6KeepWorst2() {
  const dice = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ];
  const sorted = [...dice].sort((a, b) => a - b);
  const kept = [sorted[0], sorted[1]];
  return { dice, kept, total: kept[0] + kept[1] };
}

/**
 * Perform a skill check
 * @param {Object} options
 * @param {number} [options.skillLevel=0] - Character's skill level
 * @param {number} [options.characteristic=0] - Characteristic DM (STR, DEX, etc.)
 * @param {number} [options.difficulty=8] - Target number (default Average)
 * @param {Array} [options.modifiers=[]] - Array of { reason, dm } objects
 * @param {boolean} [options.boon=false] - Roll 3D6 keep best 2
 * @param {boolean} [options.bane=false] - Roll 3D6 keep worst 2
 * @returns {Object} Result object
 */
function skillCheck(options = {}) {
  const {
    skillLevel = 0,
    characteristic = 0,
    difficulty = 8,
    modifiers = [],
    boon = false,
    bane = false
  } = options;

  // Roll dice
  let roll;
  if (boon && !bane) {
    roll = roll3D6KeepBest2();
  } else if (bane && !boon) {
    roll = roll3D6KeepWorst2();
  } else {
    roll = roll2D6();
  }

  // Calculate total modifiers
  const modifierTotal = modifiers.reduce((sum, m) => sum + (m.dm || 0), 0);
  const totalDM = skillLevel + characteristic + modifierTotal;
  const total = roll.total + totalDM;

  // Determine success
  const success = total >= difficulty;
  const margin = total - difficulty;

  // Check for criticals (natural 2 or 12 on 2D6)
  const naturalRoll = roll.total;
  const criticalSuccess = naturalRoll === 12;
  const criticalFailure = naturalRoll === 2;

  return {
    // Roll details
    roll: roll.total,
    dice: roll.dice,
    kept: roll.kept,
    boon,
    bane,

    // Modifiers
    skillLevel,
    characteristic,
    modifiers,
    totalDM,

    // Result
    total,
    difficulty,
    success,
    margin,
    criticalSuccess,
    criticalFailure,

    // Effect (Traveller term for margin)
    effect: margin
  };
}

/**
 * Standard difficulty levels (Traveller 2e)
 */
const DIFFICULTIES = {
  SIMPLE: 2,
  EASY: 4,
  ROUTINE: 6,
  AVERAGE: 8,
  DIFFICULT: 10,
  VERY_DIFFICULT: 12,
  FORMIDABLE: 14,
  IMPOSSIBLE: 16
};

/**
 * Get characteristic DM from characteristic value
 * @param {number} value - Characteristic value (1-15+)
 * @returns {number} DM (-3 to +3)
 */
function getCharacteristicDM(value) {
  if (value <= 0) return -3;
  if (value <= 2) return -2;
  if (value <= 5) return -1;
  if (value <= 8) return 0;
  if (value <= 11) return 1;
  if (value <= 14) return 2;
  return 3;
}

/**
 * Format skill check result for logging
 * @param {Object} result - Result from skillCheck()
 * @param {string} [skillName='Skill'] - Name of skill
 * @returns {string} Formatted string
 */
function formatSkillCheckResult(result, skillName = 'Skill') {
  const status = result.criticalSuccess ? 'CRITICAL SUCCESS' :
                 result.criticalFailure ? 'CRITICAL FAILURE' :
                 result.success ? 'SUCCESS' : 'FAILURE';

  const diceStr = result.boon ? `3D6 keep best: [${result.dice.join(',')}] → [${result.kept.join(',')}]` :
                  result.bane ? `3D6 keep worst: [${result.dice.join(',')}] → [${result.kept.join(',')}]` :
                  `2D6: [${result.dice.join(',')}]`;

  let modStr = '';
  if (result.skillLevel !== 0) modStr += ` +${result.skillLevel} skill`;
  if (result.characteristic !== 0) modStr += ` +${result.characteristic} char`;
  result.modifiers.forEach(m => {
    modStr += ` ${m.dm >= 0 ? '+' : ''}${m.dm} (${m.reason})`;
  });

  return `${skillName} Check: ${diceStr}${modStr} = ${result.total} vs ${result.difficulty} → ${status} (Effect: ${result.effect >= 0 ? '+' : ''}${result.effect})`;
}

module.exports = {
  roll2D6,
  roll3D6KeepBest2,
  roll3D6KeepWorst2,
  skillCheck,
  DIFFICULTIES,
  getCharacteristicDM,
  formatSkillCheckResult
};
