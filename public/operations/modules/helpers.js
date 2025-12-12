/**
 * AR-103 Phase 1: Pure helper/formatting functions
 * Extracted from app.js for modular refactor
 *
 * These are pure functions with no DOM or state dependencies.
 * Load this script BEFORE app.js in index.html
 */

// ==================== Transit/Physics Helpers ====================

/**
 * Format transit time in human-readable format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTransitTime(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours < 24) return `${hours}h ${minutes}m`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

/**
 * Format large numbers with units (km, Mm, AU)
 * @param {number} km - Distance in kilometers
 * @returns {string} Formatted distance string
 */
function formatDistance(km) {
  if (km < 1000) return `${km.toLocaleString()} km`;
  if (km < 1000000) return `${(km / 1000).toFixed(1)}k km`;
  if (km < 150000000) return `${(km / 1000000).toFixed(2)} Mkm`;
  return `${(km / 150000000).toFixed(3)} AU`;
}

/**
 * Calculate Brachistochrone transit (constant acceleration flip-and-burn)
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} accelG - Acceleration in G
 * @returns {object} Transit calculations
 */
function calculateBrachistochrone(distanceKm, accelG) {
  const distanceM = distanceKm * 1000;
  const accelMs2 = accelG * 9.81;

  // t = 2 * sqrt(d / a) - total transit time
  const timeSeconds = 2 * Math.sqrt(distanceM / accelMs2);

  // v_max = sqrt(a * d) - velocity at turnover
  const maxVelocityMs = Math.sqrt(accelMs2 * distanceM);
  const maxVelocityKmh = maxVelocityMs * 3.6;

  return {
    timeSeconds,
    timeFormatted: formatTransitTime(timeSeconds),
    turnoverKm: distanceKm / 2,
    maxVelocityKmh,
    formula: `t = 2 * sqrt(${distanceKm.toLocaleString()} km / ${accelG}G) = ${formatTransitTime(timeSeconds)}`
  };
}

// ==================== Weapon/Equipment Formatters ====================

/**
 * Format weapon ID to display name
 * @param {string} weaponId - Weapon identifier
 * @returns {string} Human-readable weapon name
 */
function formatWeaponName(weaponId) {
  const names = {
    'beam_laser': 'Beam Laser',
    'pulse_laser': 'Pulse Laser',
    'missile_rack': 'Missile Rack',
    'sandcaster': 'Sandcaster',
    'particle_beam': 'Particle Beam',
    'fusion_gun': 'Fusion Gun',
    'plasma_gun': 'Plasma Gun',
    'meson_gun': 'Meson Gun'
  };
  return names[weaponId] || weaponId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format turret type to display name
 * @param {string} type - Turret type identifier
 * @returns {string} Human-readable turret type
 */
function formatTurretType(type) {
  const types = {
    'single': 'Single Turret',
    'double': 'Double Turret',
    'triple': 'Triple Turret',
    'pop_up_single': 'Pop-up Single',
    'pop_up_double': 'Pop-up Double',
    'barbette': 'Barbette',
    'bay': 'Bay Weapon',
    'spinal': 'Spinal Mount'
  };
  return types[type] || type;
}

/**
 * Format population with suffix (K, M, B)
 * @param {number} pop - Population number
 * @returns {string} Formatted population string
 */
function formatPopulation(pop) {
  if (!pop) return 'Unknown';
  if (pop >= 1000000000) return `${(pop / 1000000000).toFixed(1)}B`;
  if (pop >= 1000000) return `${(pop / 1000000).toFixed(1)}M`;
  if (pop >= 1000) return `${(pop / 1000).toFixed(1)}K`;
  return pop.toString();
}

// ==================== UWP Interpreter ====================

/**
 * Interpret UWP code to human readable description
 * @param {string} uwp - Universal World Profile code
 * @returns {string} Human-readable description
 */
function interpretUWP(uwp) {
  if (!uwp || uwp.length < 7) return '';
  const starport = uwp[0];
  const size = parseInt(uwp[1], 16);
  const atmo = parseInt(uwp[2], 16);
  const hydro = parseInt(uwp[3], 16);
  const pop = parseInt(uwp[4], 16);
  const gov = parseInt(uwp[5], 16);
  const law = parseInt(uwp[6], 16);

  const starportNames = { A: 'Excellent', B: 'Good', C: 'Routine', D: 'Poor', E: 'Frontier', X: 'None' };
  const sizeNames = ['Asteroid', 'Small', 'Small', 'Small', 'Medium', 'Medium', 'Medium', 'Large', 'Large', 'Large', 'Large'];
  const atmoNames = ['None', 'Trace', 'V.Thin Tainted', 'V.Thin', 'Thin Tainted', 'Thin', 'Standard', 'Standard Tainted', 'Dense', 'Dense Tainted', 'Exotic', 'Corrosive', 'Insidious', 'Dense High', 'Thin Low', 'Unusual'];
  const popNames = ['None', 'Few', 'Hundreds', 'Thousands', '10K', '100K', 'Millions', '10M', '100M', 'Billions', '10B+'];

  const parts = [];
  if (starportNames[starport]) parts.push(`${starportNames[starport]} Starport`);
  if (sizeNames[size]) parts.push(`${sizeNames[size]} World`);
  if (atmoNames[atmo]) parts.push(`${atmoNames[atmo]} Atmo`);
  if (popNames[pop]) parts.push(`Pop: ${popNames[pop]}`);

  return parts.join(', ');
}

// ==================== Skill Label ====================

/**
 * Get skill label for level
 * @param {number} level - Skill level (0-3)
 * @returns {string} Skill label
 */
function getSkillLabel(level) {
  switch (level) {
    case 0: return 'Green';
    case 1: return 'Average';
    case 2: return 'Veteran';
    case 3: return 'Elite';
    default: return 'Unknown';
  }
}

// ==================== Sensor/Combat Helpers ====================

/**
 * Calculate sensor DM (Mongoose 2e rules)
 * @param {object} scannerState - Scanner's state (sensorGrade, eccmActive, sensorLock)
 * @param {object} targetState - Target's state (ecmActive, id)
 * @param {string} range - Range band: close, short, medium, long, veryLong, distant
 * @returns {number} Total dice modifier
 */
function calculateSensorDM(scannerState, targetState, range) {
  let dm = 0;

  // Sensor grade: Military +2, Civilian +0
  if (scannerState?.sensorGrade === 'military') dm += 2;

  // Target ECM: -2 (unless we have ECCM)
  if (targetState?.ecmActive && !scannerState?.eccmActive) dm -= 2;

  // Range DM
  const rangeDMs = { close: 2, short: 1, medium: 0, long: -1, veryLong: -2, distant: -4 };
  dm += rangeDMs[range] || 0;

  // Sensor lock bonus
  if (scannerState?.sensorLock?.targetId === targetState?.id) dm += 2;

  return dm;
}

// ==================== Character/Parsing Helpers ====================

/**
 * Parse UPP string (e.g., "789A87" -> stats object)
 * @param {string} upp - Universal Personality Profile hex string
 * @returns {object|null} Parsed stats object or null if invalid
 */
function parseUPP(upp) {
  if (!upp || typeof upp !== 'string') return null;
  const clean = upp.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (clean.length < 6) return null;

  const STAT_ORDER = ['str', 'dex', 'end', 'int', 'edu', 'soc'];
  const stats = {};
  const chars = clean.split('');

  for (let i = 0; i < 6 && i < chars.length; i++) {
    const val = parseInt(chars[i], 16);
    if (isNaN(val)) return null;
    stats[STAT_ORDER[i]] = val;
  }

  if (chars.length >= 7) {
    const psi = parseInt(chars[6], 16);
    if (!isNaN(psi)) stats.psi = psi;
  }

  return stats;
}

/**
 * Parse skills from text
 * @param {string} text - Text containing skill entries
 * @returns {object} Parsed skills object
 */
function parseSkills(text) {
  if (!text || typeof text !== 'string') return {};
  const skills = {};

  // Patterns to match skill entries
  const patterns = [
    /([A-Za-z][A-Za-z\s]+?)\s*[-:]\s*(\d+)/g,  // "Pilot-2" or "Pilot: 2"
    /([A-Za-z][A-Za-z\s]+?)\s+(\d+)(?=[,;\n]|$)/g,  // "Pilot 2"
    /([A-Za-z][A-Za-z\s]+?)\s*\((\d+)\)/g  // "Pilot (2)"
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let skillName = match[1].trim();
      const level = parseInt(match[2], 10);

      // Normalize skill name (capitalize first letter of each word)
      skillName = skillName.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

      // Skip if already found (prefer first match)
      if (skills[skillName] === undefined) {
        skills[skillName] = level;
      }
    }
  }

  return skills;
}

/**
 * Parse character text (JSON or free-form) into structured data
 * @param {string} text - Character data as JSON or text
 * @returns {object} Parsed character object with name, stats, skills
 */
function parseCharacterText(text) {
  const result = {
    name: null,
    stats: {},
    skills: {}
  };

  // Try to parse as JSON first
  if (text.trim().startsWith('{')) {
    try {
      const json = JSON.parse(text);
      if (json.name) result.name = json.name;
      if (json.stats) result.stats = json.stats;
      if (json.skills) result.skills = json.skills;
      if (json.upp) {
        const parsed = parseUPP(json.upp);
        if (parsed) result.stats = { ...result.stats, ...parsed };
      }
      return result;
    } catch (e) {
      // Not valid JSON, continue with text parsing
    }
  }

  // Extract name (first non-empty line that doesn't look like a data field)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  for (const line of lines) {
    if (!line.includes(':') && !line.match(/^[A-F0-9]{6,7}$/i)) {
      result.name = line;
      break;
    }
  }

  // Extract UPP
  const uppMatch = text.match(/UPP[:\s]*([A-F0-9]{6,7})/i) ||
                   text.match(/\b([A-F0-9]{6,7})\b/);
  if (uppMatch) {
    const parsed = parseUPP(uppMatch[1]);
    if (parsed) result.stats = parsed;
  }

  // Extract skills
  result.skills = parseSkills(text);

  return result;
}

// ==================== Role Configuration ====================

/**
 * Get role configuration (actions and display name)
 * @param {string} role - Role identifier
 * @returns {object} Role config with name and actions array
 */
function getRoleConfig(role) {
  const configs = {
    pilot: {
      name: 'Helm Control',
      actions: ['setCourse', 'dock', 'undock', 'evasiveAction', 'land']
    },
    captain: {
      name: 'Command',
      actions: ['setAlertStatus', 'issueOrders', 'authorizeWeapons', 'hail']
    },
    astrogator: {
      name: 'Navigation',
      actions: ['plotJump', 'calculateIntercept', 'verifyPosition']
    },
    engineer: {
      name: 'Engineering',
      actions: ['allocatePower', 'fieldRepair', 'overloadSystem']
    },
    sensor_operator: {
      name: 'Sensors & Comms',
      actions: ['activeScan', 'deepScan', 'hail', 'jam']
    },
    gunner: {
      name: 'Weapons',
      actions: ['fireWeapon', 'pointDefense', 'sandcaster']
    },
    damage_control: {
      name: 'Damage Control',
      actions: ['directRepair', 'prioritizeSystem', 'emergencyProcedure']
    },
    marines: {
      name: 'Security',
      actions: ['securityPatrol', 'prepareBoarding', 'repelBoarders']
    },
    medic: {
      name: 'Medical Bay',
      actions: ['treatInjury', 'triage', 'checkSupplies']
    },
    steward: {
      name: 'Passenger Services',
      actions: ['attendPassenger', 'checkSupplies', 'boostMorale']
    },
    cargo_master: {
      name: 'Cargo Operations',
      actions: ['checkManifest', 'loadCargo', 'unloadCargo']
    }
  };
  return configs[role] || { name: 'Unknown Role', actions: [] };
}

// ==================== Ship/Template Formatters ====================

/**
 * Get formatted weapons list from ship template
 * @param {object} template - Ship template with turrets array
 * @returns {string|null} HTML string of formatted weapons, or null if no turrets
 */
function formatShipWeapons(template) {
  const turrets = template?.turrets || [];
  if (turrets.length === 0) return null;

  return turrets.map(turret => {
    const type = formatTurretType(turret.type);
    const weapons = (turret.weapons || []).map(formatWeaponName);
    const concealed = turret.concealed ? ' (Concealed)' : '';
    return `<div class="weapon-row">
      <span class="turret-type">${type}${concealed}:</span>
      <span class="weapon-list">${weapons.join(', ')}</span>
    </div>`;
  }).join('');
}

// AR-103: These functions are now global (loaded before app.js)
