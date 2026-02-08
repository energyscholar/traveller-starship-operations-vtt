/**
 * Fighter Operations Module
 * Launch, recover, and alpha-strike with small craft
 */

const path = require('path');
const fs = require('fs');
const { resolveAttack } = require('./combat-engine');

// Load fighter template
const FIGHTER_TEMPLATE_PATH = path.join(__dirname, '../../data/ships/v2/light_fighter.json');
let fighterTemplate = null;

function getFighterTemplate() {
  if (!fighterTemplate) {
    fighterTemplate = JSON.parse(fs.readFileSync(FIGHTER_TEMPLATE_PATH, 'utf8'));
  }
  return fighterTemplate;
}

/**
 * Create a fighter contact from the squadron roster
 * @param {string} callsign - Pilot callsign (e.g., "Hardpoint")
 * @param {number} index - Squadron index (0-5)
 * @param {string} rangeBand - Starting range band
 * @returns {Object} Contact object for BattleState.addContact()
 */
function createFighterContact(callsign, index, rangeBand = 'long') {
  const template = getFighterTemplate();
  return {
    id: `fighter_${callsign.toLowerCase()}`,
    name: `Tlatl Fighter (${callsign})`,
    type: 'light_fighter',
    disposition: 'friendly',
    health: template.hull.hullPoints,
    max_health: template.hull.hullPoints,
    armor: template.armour.rating,
    gunner_skill: template.squadron.gunner_skill,
    range_band: rangeBand,
    auto_fire: true,
    callsign,
    weapons: template.weapons.map(w => ({
      name: w.weapons[0] === 'missile_rack' ? 'Missile Rack' : 'Pulse Laser',
      damage: w.damage,
      range: w.range
    }))
  };
}

/**
 * Get available callsigns (not yet launched)
 * @param {Array} launchedIds - IDs of already-launched fighters
 * @returns {Array} Available callsign strings
 */
function getAvailableCallsigns(launchedIds = []) {
  const template = getFighterTemplate();
  return template.squadron.callsigns.filter(cs =>
    !launchedIds.includes(`fighter_${cs.toLowerCase()}`)
  );
}

/**
 * Resolve fighter alpha strike — all friendly fighters fire at one target
 * @param {Array} fighters - Array of friendly fighter contacts
 * @param {Object} target - Target contact { name, range_band, armor, health, max_health }
 * @param {string} weaponType - 'missile' or 'all' (default: primary missile only)
 * @returns {Object} { results: [], totalDamage, hits, misses, narration }
 */
function resolveAlphaStrike(fighters, target, weaponType = 'missile') {
  if (!fighters || fighters.length === 0) return { results: [], totalDamage: 0, hits: 0, misses: 0, narration: '' };
  if (!target) return { results: [], totalDamage: 0, hits: 0, misses: 0, narration: '' };

  const results = [];
  let totalDamage = 0;
  let hits = 0;
  let misses = 0;

  for (const fighter of fighters) {
    if (fighter.health <= 0) continue;
    if (!fighter.weapons || fighter.weapons.length === 0) continue;

    // Select weapons based on type
    const weapons = weaponType === 'all'
      ? fighter.weapons
      : fighter.weapons.filter(w => w.name === 'Missile Rack');

    for (const weapon of weapons) {
      if (weapon.disabled) continue;

      const attacker = {
        name: fighter.name,
        skills: { gunnery: fighter.gunner_skill || 2 }
      };
      const targetData = {
        name: target.name,
        range_band: target.range_band || fighter.range_band || 'long',
        armor: target.armor || 0,
        evasive: target.evasive || false,
        health: target.health,
        max_health: target.maxHealth || target.max_health
      };

      const result = resolveAttack(attacker, weapon, targetData);
      const damage = result.hit ? result.actualDamage : 0;

      results.push({
        callsign: fighter.callsign || fighter.name,
        weapon: weapon.name,
        hit: result.hit,
        roll: result.roll,
        total: result.total,
        damage,
        message: result.message
      });

      if (result.hit) {
        hits++;
        totalDamage += damage;
      } else {
        misses++;
      }
    }
  }

  // Build narration
  let narration = '';
  if (results.length > 0) {
    const weaponLabel = weaponType === 'missile' ? 'launch missiles at' : 'fire on';
    narration = `Alpha Strike! ${fighters.length} Tlatl fighters ${weaponLabel} ${target.name} — `;
    narration += `${hits} hit for combined ${totalDamage} damage!`;
    if (misses > 0) {
      narration += ` (${misses} missed)`;
    }
  }

  return { results, totalDamage, hits, misses, narration };
}

/**
 * Resolve friendly craft auto-fire (like enemy auto-fire but for friendlies)
 * @param {Array} friendlyCraft - Array of friendly contacts with auto_fire=true
 * @param {Object} target - Target contact
 * @returns {Array} Array of fire results
 */
function resolveFriendlyFire(friendlyCraft, target) {
  if (!friendlyCraft || !target) return [];
  return friendlyCraft
    .filter(f => f.disposition === 'friendly' && f.auto_fire !== false && f.health > 0)
    .flatMap(fighter => {
      if (!fighter.weapons) return [];
      return fighter.weapons
        .filter(w => !w.disabled)
        .map(weapon => {
          const attacker = {
            name: fighter.name,
            skills: { gunnery: fighter.gunner_skill || 2 }
          };
          const targetData = {
            name: target.name,
            range_band: target.range_band || 'long',
            armor: target.armor || 0,
            health: target.health,
            max_health: target.maxHealth || target.max_health
          };
          const result = resolveAttack(attacker, weapon, targetData);
          return {
            callsign: fighter.callsign || fighter.name,
            weapon: weapon.name,
            hit: result.hit,
            damage: result.hit ? result.actualDamage : 0,
            message: result.message
          };
        });
    });
}

module.exports = {
  getFighterTemplate,
  createFighterContact,
  getAvailableCallsigns,
  resolveAlphaStrike,
  resolveFriendlyFire
};
