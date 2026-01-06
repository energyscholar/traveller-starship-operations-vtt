/**
 * AR-251: Gunner GUI Adapter
 *
 * Client-side adapter for gunner state.
 * Mirrors lib/engine/roles/gunner-state.js for ES module compatibility.
 *
 * @module adapters/gunner-adapter
 */

/**
 * Range band DM table (Traveller combat rules)
 */
const RANGE_DMS = {
  adjacent: 1,
  close: 0,
  short: 0,
  medium: -1,
  long: -2,
  extreme: -4,
  distant: -6
};

/**
 * Get range DM for a band
 * @param {string} band - Range band name
 * @returns {number} DM modifier
 */
export function getRangeDM(band) {
  return RANGE_DMS[band?.toLowerCase()] ?? -4;
}

/**
 * Format DM for display
 * @param {number} dm - Dice modifier
 * @returns {string} Formatted string
 */
export function formatRangeDM(dm) {
  return dm >= 0 ? `+${dm}` : `${dm}`;
}

/**
 * Calculate hit probability for 2D6 vs target 8
 * @param {number} totalDM - Total dice modifier
 * @returns {number} Percentage chance (0-100)
 */
export function calculateHitProbability2D6(totalDM) {
  const targetNumber = 8 - totalDM;
  let successCount = 0;
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      if (d1 + d2 >= targetNumber) successCount++;
    }
  }
  return Math.round((successCount / 36) * 100);
}

/**
 * Calculate hit probability for weapon against target
 * @param {object} weapon - Weapon data
 * @param {object} target - Target data
 * @param {number} gunnerySkill - Gunner skill level
 * @returns {number|null} Percentage or null if invalid
 */
export function calculateHitChance(weapon, target, gunnerySkill = 0) {
  if (!weapon || !target) return null;
  const rangeDM = getRangeDM(target.range_band || target.range);
  const totalDM = gunnerySkill + rangeDM;
  return calculateHitProbability2D6(totalDM);
}

/**
 * Get weapon status classification
 * @param {string} status - Weapon status
 * @returns {string} Status class
 */
export function getWeaponStatus(status) {
  const statuses = ['ready', 'fired', 'damaged', 'destroyed'];
  return statuses.includes(status) ? status : 'ready';
}

/**
 * Get weapon status CSS class
 * @param {string} status - Weapon status
 * @returns {string} CSS class name
 */
export function getWeaponStatusClass(status) {
  return `weapon-${getWeaponStatus(status)}`;
}

/**
 * Get threat level from marking
 * @param {string} marking - Contact marking
 * @returns {number} Threat level 1-3
 */
export function getThreatLevel(marking) {
  return marking === 'hostile' ? 3 :
         marking === 'unknown' ? 2 : 1;
}

/**
 * Determine target priority score
 * @param {object} contact - Contact data
 * @param {number} hitChance - Calculated hit chance
 * @returns {number} Priority score (higher = prioritize)
 */
export function calculateTargetPriority(contact, hitChance) {
  const markingScore = contact.marking === 'hostile' ? 100 :
                       contact.marking === 'unknown' ? 50 : 25;
  return markingScore + (hitChance || 0);
}

/**
 * Get complete gunner panel state
 * @param {object} shipState - Current ship state
 * @param {object} template - Ship template data
 * @param {array} contacts - Sensor contacts
 * @param {number} roleInstance - Turret assignment
 * @param {array} shipWeapons - Ship weapons array
 * @returns {object} Pure state object
 */
export function getGunnerState(shipState, template, contacts, roleInstance = 1, shipWeapons = []) {
  const weapons = shipWeapons.length > 0 ? shipWeapons : (template?.weapons || []);
  const gunnerySkill = shipState?.gunnerySkill || 0;

  // Turret assignment
  const turretCount = weapons.filter(w => w.mount === 'turret' || w.type === 'turret' || !w.mount).length;
  const assignedTurret = roleInstance <= turretCount ? roleInstance : null;

  // Filter targetable contacts
  const targetableContacts = (contacts || []).filter(c => c.is_targetable !== false);

  // Selected weapon
  const selectedWeaponId = shipState?.selectedWeapon || (weapons[0]?.id || 0);
  const selectedWeapon = weapons.find(w => (w.id || weapons.indexOf(w)) === selectedWeaponId) || weapons[0];

  // Selected target
  const selectedTargetId = shipState?.lockedTarget || (targetableContacts[0]?.id);
  const selectedTarget = targetableContacts.find(c => c.id === selectedTargetId);

  // Calculate hit chance
  const hitChance = calculateHitChance(selectedWeapon, selectedTarget, gunnerySkill);

  // Prioritized target list
  const prioritizedTargets = targetableContacts.map(c => ({
    id: c.id,
    name: c.name || c.designation,
    marking: c.marking,
    rangeBand: c.range_band || c.range,
    hitChance: calculateHitChance(selectedWeapon, c, gunnerySkill),
    threatLevel: getThreatLevel(c.marking),
    priority: calculateTargetPriority(c, calculateHitChance(selectedWeapon, c, gunnerySkill)),
    isSelected: c.id === selectedTargetId
  })).sort((a, b) => b.priority - a.priority);

  // Weapon types
  const weaponTypes = [...new Set(weapons.map(w => w.weapon_type || w.type || 'beam'))];
  const hasMissiles = weapons.some(w => (w.weapon_type || w.type || '').toLowerCase().includes('missile'));

  // Authorization status
  const weaponsAuth = shipState?.weaponsAuth || {};
  const roe = shipState?.roe || 'hold';

  return {
    assignment: {
      turret: assignedTurret,
      turretCount
    },

    weapons: {
      list: weapons.map(w => ({
        id: w.id || weapons.indexOf(w),
        name: w.name || w.weapon_type || w.type,
        type: w.weapon_type || w.type,
        status: getWeaponStatus(w.status),
        isSelected: (w.id || weapons.indexOf(w)) === selectedWeaponId
      })),
      selected: selectedWeapon ? {
        id: selectedWeapon.id,
        name: selectedWeapon.name || selectedWeapon.weapon_type || selectedWeapon.type
      } : null,
      types: weaponTypes,
      hasMissiles,
      hasWeapons: weapons.length > 0
    },

    targeting: {
      contacts: prioritizedTargets,
      selected: selectedTarget ? {
        id: selectedTarget.id,
        name: selectedTarget.name || selectedTarget.designation,
        rangeBand: selectedTarget.range_band || selectedTarget.range
      } : null,
      hitChance,
      hasTargets: targetableContacts.length > 0,
      rangeDM: selectedTarget ? getRangeDM(selectedTarget.range_band || selectedTarget.range) : null
    },

    authorization: {
      mode: weaponsAuth.mode || 'hold',
      roe,
      weaponsFree: weaponsAuth.mode === 'free' || roe === 'free',
      canFire: weaponsAuth.mode === 'free' || roe === 'free' || roe === 'defensive'
    },

    gunnerySkill,

    ammo: shipState?.ammo || {}
  };
}

/**
 * Check if gunner can engage target
 * @param {object} gunnerState - From getGunnerState
 * @returns {object} { canEngage, reason }
 */
export function canEngageTarget(gunnerState) {
  if (!gunnerState.weapons.hasWeapons) {
    return { canEngage: false, reason: 'No weapons available' };
  }
  if (!gunnerState.targeting.hasTargets) {
    return { canEngage: false, reason: 'No targets available' };
  }
  if (!gunnerState.targeting.selected) {
    return { canEngage: false, reason: 'No target selected' };
  }
  if (!gunnerState.authorization.canFire) {
    return { canEngage: false, reason: 'Weapons not authorized' };
  }
  return { canEngage: true, reason: null };
}
