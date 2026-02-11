/**
 * Combat Stance System
 * Per-round tactical posture for interactive battle scenarios.
 *
 * @module lib/tui/scenarios/stance-system
 */

const STANCES = {
  AGGRESSIVE: {
    label: 'AGGRESSIVE',
    desc: 'Close and destroy — no evasion, ECCM boost, all weapons, close 1 band/rd',
    evasionMultiplier: 0,
    ewMode: 'ECCM',
    weaponFilter: 'all',
    rangeDirection: 'close',
    fighterMode: 'escort'
  },
  DEFENSIVE: {
    label: 'DEFENSIVE',
    desc: 'Max evasion + ECM jamming — all weapons still fire, hold range',
    evasionMultiplier: 1.0,
    ewMode: 'ECM',
    weaponFilter: 'all',
    rangeDirection: 'maintain',
    fighterMode: 'screen'
  },
  BALANCED: {
    label: 'BALANCED',
    desc: 'Half evasion, split EW, all weapons, hold range',
    evasionMultiplier: 0.5,
    ewMode: 'split',
    weaponFilter: 'all',
    rangeDirection: 'maintain',
    fighterMode: 'independent'
  },
  STANDOFF: {
    label: 'STANDOFF',
    desc: 'Open range — missiles + barbettes only, half evasion, ECM jam',
    evasionMultiplier: 0.5,
    ewMode: 'ECM',
    weaponFilter: 'standoff',
    rangeDirection: 'open',
    fighterMode: 'screen'
  },
  AMBUSH: {
    label: 'AMBUSH',
    desc: 'Civilian signature — no evasion, passive sensors, weapons hidden',
    evasionMultiplier: 0,
    ewMode: 'passive',
    weaponFilter: 'none',
    rangeDirection: 'maintain',
    fighterMode: 'hidden'
  }
};

/**
 * Get evasion DM from ship thrust and stance
 * @param {Object} ship - Ship with thrust property
 * @param {Object} stance - Stance definition
 * @returns {number} Negative DM applied to incoming attacks
 */
function getEvasionDM(ship, stance) {
  return -Math.floor((ship.thrust || 0) * stance.evasionMultiplier);
}

/**
 * Get EW bonus based on stance ewMode and ship sensors
 * @param {Object} ship - Ship with sensorDM property
 * @param {Object} stance - Stance definition
 * @returns {{ ownAttackBonus: number, enemyAttackPenalty: number }}
 */
function getEWBonus(ship, stance) {
  const sensor = ship.sensorDM || 0;
  switch (stance.ewMode) {
    case 'ECCM':
      return { ownAttackBonus: sensor, enemyAttackPenalty: 0 };
    case 'ECM':
      return { ownAttackBonus: 0, enemyAttackPenalty: -sensor };
    case 'split':
      return { ownAttackBonus: Math.floor(sensor / 2), enemyAttackPenalty: -Math.floor(sensor / 2) };
    case 'passive':
    default:
      return { ownAttackBonus: 0, enemyAttackPenalty: 0 };
  }
}

/**
 * Get active weapons for ship given stance filter
 * @param {Object} ship - Ship with turrets array
 * @param {Object} stance - Stance definition
 * @returns {Array} Filtered turret array
 */
function getActiveWeapons(ship, stance) {
  const turrets = ship.turrets || [];
  switch (stance.weaponFilter) {
    case 'all':
      return turrets;
    case 'standoff':
      return turrets.filter(t => {
        const weapons = t.weapons || [t.type];
        return weapons.some(w =>
          w.includes('missile') || w.includes('barbette') ||
          t.mount === 'barbette' || w === 'particle' || w === 'ion'
        );
      });
    case 'none':
      return [];
    default:
      return turrets;
  }
}

/**
 * Apply stance effects to round state
 * @param {Object} state - Scenario state
 * @param {Object} stance - Stance definition
 */
function applyStanceToRound(state, stance) {
  // Set evasive flags on player fleet
  for (const ship of state.playerFleet) {
    ship.evasive = stance.evasionMultiplier > 0;
  }
  state.currentWeaponFilter = stance.weaponFilter;
  state.rangeDirection = stance.rangeDirection;
  state.fighterMode = stance.fighterMode;
}

/**
 * Get fighter orders from stance
 * @param {Object} stance - Stance definition
 * @returns {string} Fighter mode string
 */
function getFighterOrders(stance) {
  return stance.fighterMode;
}

module.exports = {
  STANCES,
  getEvasionDM,
  getEWBonus,
  getActiveWeapons,
  applyStanceToRound,
  getFighterOrders
};
