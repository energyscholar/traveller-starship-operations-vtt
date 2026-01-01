/**
 * AR-BD-0a: Contact Factory
 * Creates contacts from ship templates
 */

const fs = require('fs');
const path = require('path');

const SHIPS_DIR = path.join(__dirname, '../../data/ships');
const WEAPONS_FILE = path.join(__dirname, '../../data/weapons/weapons.json');

// Cache for loaded data
let shipIndex = null;
let weaponDefs = null;

/**
 * Load ship index
 */
function getShipIndex() {
  if (!shipIndex) {
    const indexPath = path.join(SHIPS_DIR, 'index.json');
    const content = fs.readFileSync(indexPath, 'utf8');
    shipIndex = JSON.parse(content);
  }
  return shipIndex;
}

/**
 * Load weapon definitions
 */
function getWeaponDefs() {
  if (!weaponDefs) {
    const content = fs.readFileSync(WEAPONS_FILE, 'utf8');
    const data = JSON.parse(content);
    // Index by ID for fast lookup
    weaponDefs = {};
    for (const w of data.weapons) {
      weaponDefs[w.id] = w;
    }
  }
  return weaponDefs;
}

/**
 * Get list of available templates
 * @returns {Array} Template list with id, name, tonnage, role
 */
function getTemplates() {
  const index = getShipIndex();
  return index.ships.map(s => ({
    id: s.id,
    name: s.name,
    tonnage: s.tonnage,
    role: s.role
  }));
}

/**
 * Load a ship template by ID
 * @param {string} templateId - Ship template ID
 * @returns {Object|null} Ship data or null
 */
function loadTemplate(templateId) {
  const index = getShipIndex();
  const entry = index.ships.find(s => s.id === templateId);
  if (!entry) return null;

  const filePath = path.join(SHIPS_DIR, entry.file);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Convert ship turrets to contact weapons array
 * Each turret becomes one weapon entry with combined damage
 * @param {Array} turrets - Ship turret array
 * @returns {Array} Contact weapons array
 */
function convertTurretsToWeapons(turrets) {
  if (!turrets || !Array.isArray(turrets)) return [];

  const weapons = getWeaponDefs();
  const result = [];

  for (const turret of turrets) {
    if (!turret.weapons || !Array.isArray(turret.weapons)) continue;

    // Count weapon types in this turret
    const weaponCounts = {};
    for (const wid of turret.weapons) {
      weaponCounts[wid] = (weaponCounts[wid] || 0) + 1;
    }

    // Create one weapon entry per weapon type in turret
    for (const [weaponId, count] of Object.entries(weaponCounts)) {
      const wDef = weapons[weaponId];
      if (!wDef) continue;

      // Skip defensive weapons like sandcasters
      if (wDef.type === 'defense') continue;

      // Parse base damage (e.g., "2d6" -> {dice: 2, sides: 6})
      const dmgMatch = wDef.damage.match(/(\d+)d(\d+)/);
      if (!dmgMatch) continue;

      const baseDice = parseInt(dmgMatch[1], 10);
      const sides = parseInt(dmgMatch[2], 10);
      const totalDice = baseDice * count;

      // Determine range based on weapon type
      let range = 'long';
      if (wDef.traits?.rangeRestriction) {
        const ranges = wDef.traits.rangeRestriction;
        if (ranges.includes('short') && !ranges.includes('long')) {
          range = 'short';
        } else if (ranges.includes('medium') && !ranges.includes('long')) {
          range = 'medium';
        }
      }

      // Build name
      const turretType = turret.type || 'single';
      const turretPrefix = turretType === 'triple' ? 'Triple' :
                          turretType === 'double' ? 'Double' : '';
      const name = turretPrefix ? `${turretPrefix} Turret ${wDef.name}` : wDef.name;

      result.push({
        name,
        damage: `${totalDice}d${sides}`,
        range
      });
    }
  }

  return result;
}

/**
 * Create a contact from a ship template
 * @param {string} templateId - Ship template ID
 * @param {Object} overrides - Optional field overrides
 * @returns {Object} Contact data ready for addContact()
 */
function fromTemplate(templateId, overrides = {}) {
  const ship = loadTemplate(templateId);
  if (!ship) {
    throw new Error(`Unknown ship template: ${templateId}`);
  }

  const weapons = convertTurretsToWeapons(ship.turrets);

  // Default gunner skill based on role
  let gunnerSkill = 1;
  if (ship.role === 'military') {
    gunnerSkill = 2;
  }

  // Build contact data
  const contact = {
    name: overrides.name || ship.name,
    type: ship.type || 'ship',
    disposition: overrides.disposition || 'unknown',
    bearing: overrides.bearing ?? 0,
    range_km: overrides.range_km ?? 10000,
    health: ship.hull || 20,
    max_health: ship.hull || 20,
    armor: ship.armour || 0,
    gunner_skill: overrides.gunner_skill ?? gunnerSkill,
    weapons: weapons,
    transponder: overrides.transponder || ship.name,
    signature: overrides.signature || 'normal',
    is_targetable: overrides.is_targetable ?? true,
    weapons_free: overrides.weapons_free ?? false,
    visible_to: overrides.visible_to || 'all'
  };

  // Apply any additional overrides
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined && contact.hasOwnProperty(key)) {
      contact[key] = value;
    }
  }

  return contact;
}

/**
 * Clear caches (for testing)
 */
function clearCache() {
  shipIndex = null;
  weaponDefs = null;
}

module.exports = {
  getTemplates,
  loadTemplate,
  fromTemplate,
  convertTurretsToWeapons,
  clearCache
};
