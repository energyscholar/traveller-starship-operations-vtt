/**
 * Enemy Auto-Fire System
 *
 * After PC gunners fire, hostile contacts with weapons fire back automatically.
 * GM can toggle auto_fire per contact and pause/resume all enemy fire.
 */

const { resolveAttack, getRangeModifier, rollDamage } = require('./combat-engine');

/**
 * Resolve enemy fire for all eligible hostile contacts
 * @param {Object} options
 * @param {Array} options.contacts - All contacts in the battle
 * @param {Object} options.pcShip - PC ship data { name, armor, hull, maxHull }
 * @param {boolean} options.paused - Whether GM has paused all enemy fire
 * @returns {Array} Array of fire results
 */
function resolveEnemyFire({ contacts, pcShip, paused = false }) {
  if (paused) return [];
  if (!pcShip) return [];
  if (!contacts || contacts.length === 0) return [];

  const results = [];

  for (const contact of contacts) {
    // Skip non-hostile contacts
    if (contact.disposition !== 'hostile') continue;

    // Skip contacts with auto_fire disabled
    if (contact.auto_fire === false) continue;

    // Skip contacts with no weapons
    if (!contact.weapons || contact.weapons.length === 0) continue;

    // Skip destroyed contacts
    if (contact.health <= 0) continue;

    // Fire each weapon
    for (const weapon of contact.weapons) {
      // Skip disabled weapons
      if (weapon.disabled) continue;

      const attacker = {
        name: contact.name,
        skills: { gunnery: contact.gunner_skill || 1 }
      };

      const target = {
        name: pcShip.name,
        range_band: contact.range_band || 'medium',
        armor: pcShip.armor || 0,
        evasive: pcShip.evasive || false,
        health: pcShip.hull,
        max_health: pcShip.maxHull
      };

      const result = resolveAttack(attacker, weapon, target);

      results.push({
        contactId: contact.id,
        contactName: contact.name,
        weapon: weapon.name,
        hit: result.hit,
        roll: result.roll,
        total: result.total,
        damage: result.hit ? result.actualDamage : 0,
        critical: result.critical || false,
        message: result.message
      });
    }
  }

  return results;
}

/**
 * Calculate total damage from enemy fire results
 * @param {Array} results - Fire results from resolveEnemyFire
 * @returns {number} Total damage
 */
function totalEnemyDamage(results) {
  return results.reduce((sum, r) => sum + (r.damage || 0), 0);
}

/**
 * Format enemy fire results into narration text
 * @param {Array} results - Fire results from resolveEnemyFire
 * @returns {string} Narration text
 */
function formatEnemyFireNarration(results) {
  if (results.length === 0) return '';

  const lines = [];
  for (const r of results) {
    if (r.hit) {
      const dmg = r.damage > 0 ? ` — ${r.damage} damage!` : ' — absorbed by armor';
      lines.push(`${r.contactName} fires ${r.weapon} — HIT${dmg}`);
    } else {
      lines.push(`${r.contactName} fires ${r.weapon} — MISS`);
    }
  }

  const total = totalEnemyDamage(results);
  if (total > 0) {
    lines.push(`Total incoming damage: ${total}`);
  }

  return lines.join('\n');
}

module.exports = {
  resolveEnemyFire,
  totalEnemyDamage,
  formatEnemyFireNarration
};
