// Mongoose Traveller 2e combat resolution
// Rules: Attack = 2d6 + Skill + Range_DM - Dodge_DM >= 8

const fs = require('fs');
const path = require('path');
const { DiceRoller } = require('./dice');
const { getRegistry } = require('./ship-registry');

// Load combat rules from JSON
const rulesPath = path.join(__dirname, '../data/rules/combat-rules.json');
const RULES = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

// Stage 7: Grid system constants
const GRID_SIZE = 10; // 10x10 hex grid

// Stage 5: Test ships with multiple weapons
const SHIPS = {
  scout: {
    name: 'Scout',
    hull: 10,
    maxHull: 10,
    armor: 2,
    pilotSkill: 2,
    movement: 3,  // Stage 7: Movement points per turn
    weapons: [
      {
        id: 'pulseLaser',
        name: 'Pulse Laser',
        damage: '2d6',
        ammo: null,  // unlimited (energy weapon)
        rangeRestriction: null  // all ranges
      },
      {
        id: 'missiles',
        name: 'Missiles',
        damage: '4d6',
        ammo: 6,  // 6 shots total
        longRangeBonus: 2  // +2 DM at long range (negates penalty)
      }
    ]
  },
  corsair: {
    name: 'Corsair',
    hull: 15,
    maxHull: 15,
    armor: 4,
    pilotSkill: 1,
    movement: 2,  // Stage 7: Movement points per turn
    weapons: [
      {
        id: 'beamLaser',
        name: 'Beam Laser',
        damage: '3d6',
        ammo: null,  // unlimited (energy weapon)
        rangeRestriction: ['adjacent', 'close', 'medium']  // close-medium only
      },
      {
        id: 'missiles',
        name: 'Missiles',
        damage: '4d6',
        ammo: 6,  // 6 shots total
        longRangeBonus: 2  // +2 DM at long range (negates penalty)
      }
    ]
  }
};

// Stage 6: Crew roster with skills
const CREW = {
  scout: [
    {
      id: 'scout-pilot',
      name: 'Lt. Sarah Chen',
      role: 'pilot',
      skills: { pilot: 2, gunner: 0, engineering: 0 },
      health: 10,
      maxHealth: 10
    },
    {
      id: 'scout-gunner',
      name: 'Cpl. James Martinez',
      role: 'gunner',
      skills: { pilot: 0, gunner: 2, engineering: 0 },
      health: 10,
      maxHealth: 10
    },
    {
      id: 'scout-engineer',
      name: 'Tech. Emily Wong',
      role: 'engineer',
      skills: { pilot: 0, gunner: 0, engineering: 1 },
      health: 10,
      maxHealth: 10
    }
  ],
  corsair: [
    {
      id: 'corsair-pilot',
      name: 'Pirate Kane',
      role: 'pilot',
      skills: { pilot: 1, gunner: 0, engineering: 0 },
      health: 10,
      maxHealth: 10
    },
    {
      id: 'corsair-gunner',
      name: 'Pirate Vex',
      role: 'gunner',
      skills: { pilot: 0, gunner: 1, engineering: 0 },
      health: 10,
      maxHealth: 10
    },
    {
      id: 'corsair-engineer',
      name: 'Pirate Rusty',
      role: 'engineer',
      skills: { pilot: 0, gunner: 0, engineering: 0 },
      health: 10,
      maxHealth: 10
    }
  ]
};

// Stage 6: Apply crew to ship
function applyCrew(ship, crewAssignments) {
  const shipWithCrew = { ...ship };
  shipWithCrew.crew = {};

  // Assign crew to roles
  if (crewAssignments.pilot) {
    shipWithCrew.crew.pilot = crewAssignments.pilot;
    // Pilot skill affects pilotSkill (used for initiative/dodge)
    const effectiveSkill = getEffectiveSkill(crewAssignments.pilot, 'pilot');
    shipWithCrew.pilotSkill = Math.floor(effectiveSkill);
  }

  if (crewAssignments.gunner) {
    shipWithCrew.crew.gunner = crewAssignments.gunner;
  }

  if (crewAssignments.engineer) {
    shipWithCrew.crew.engineer = crewAssignments.engineer;
  }

  return shipWithCrew;
}

// Stage 6: Get effective skill (scales with health)
function getEffectiveSkill(crewMember, skillName) {
  if (!crewMember || crewMember.health <= 0) {
    return 0;
  }

  const baseSkill = crewMember.skills[skillName] || 0;
  const healthPercent = crewMember.health / crewMember.maxHealth;

  return baseSkill * healthPercent;
}

// Stage 6: Assign crew to role
function assignCrewRole(shipName, role, crewMember) {
  // Validate ship
  const validShips = ['scout', 'corsair'];
  if (!validShips.includes(shipName)) {
    throw new Error(`Invalid ship: ${shipName}`);
  }

  // Validate role
  const validRoles = ['pilot', 'gunner', 'engineer'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  return {
    ship: shipName,
    role: role,
    crew: crewMember
  };
}

// Stage 6: Crew takes damage
function crewTakeDamage(crewMember, damage) {
  const newHealth = Math.max(0, crewMember.health - damage);

  return {
    damageTaken: damage,
    newHealth: newHealth,
    alive: newHealth > 0
  };
}

// Stage 6: Engineer repair action
function engineerRepair(ship, engineer, options = {}) {
  const roller = new DiceRoller(options.seed);

  // Roll 1d6 for repair
  const repairRoll = roller.roll(1, 6);
  const hullRepaired = repairRoll.total;

  // Calculate new hull (cap at maxHull)
  const newHull = Math.min(ship.hull + hullRepaired, ship.maxHull);
  const actualRepair = newHull - ship.hull;

  return {
    repaired: true,
    repairRoll: repairRoll,
    hullRepaired: actualRepair,
    newHull: newHull
  };
}

// Stage 7: Hex grid functions

// Calculate distance between two hex positions using cube coordinates
// Hex positions use axial coordinates (q, r)
// Cube coordinates: x = q, z = r, y = -q - r
function hexDistance(pos1, pos2) {
  // Convert axial to cube
  const x1 = pos1.q;
  const z1 = pos1.r;
  const y1 = -x1 - z1;

  const x2 = pos2.q;
  const z2 = pos2.r;
  const y2 = -x2 - z2;

  // Manhattan distance in cube coordinates / 2
  return (Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2)) / 2;
}

// Convert hex distance to range category
function rangeFromDistance(distance) {
  if (distance <= 1) return 'adjacent';
  if (distance <= 3) return 'close';
  if (distance <= 5) return 'medium';
  if (distance <= 7) return 'long';
  return 'veryLong';
}

// Check if position is within grid bounds
function isValidPosition(pos) {
  // Using offset coordinates converted from axial
  // For a 10x10 grid, q and r should both be in range 0-9
  // But axial coordinates can be negative, so we need to check the actual grid bounds
  // For simplicity, let's use q: 0-9, r: 0-9
  return pos.q >= 0 && pos.q < GRID_SIZE && pos.r >= 0 && pos.r < GRID_SIZE;
}

// Validate a move from one position to another
function validateMove(from, to, movementPoints) {
  // Check if destination is on grid
  if (!isValidPosition(to)) {
    return {
      valid: false,
      error: 'Destination is off grid bounds',
      newPosition: null
    };
  }

  // Calculate distance
  const distance = hexDistance(from, to);

  // Check if within movement allowance
  if (distance > movementPoints) {
    return {
      valid: false,
      error: `Insufficient movement points (need ${distance}, have ${movementPoints})`,
      newPosition: null
    };
  }

  return {
    valid: true,
    error: null,
    newPosition: { q: to.q, r: to.r }
  };
}

// Get hexes along a line from start to end (for LOS checking)
function hexLine(start, end) {
  const distance = hexDistance(start, end);
  const hexes = [];

  for (let i = 0; i <= distance; i++) {
    const t = distance === 0 ? 0 : i / distance;

    // Linear interpolation in cube coordinates
    const x1 = start.q;
    const z1 = start.r;
    const y1 = -x1 - z1;

    const x2 = end.q;
    const z2 = end.r;
    const y2 = -x2 - z2;

    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const z = z1 + (z2 - z1) * t;

    // Round to nearest hex
    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);

    // Fix rounding errors (must satisfy x + y + z = 0)
    const dx = Math.abs(rx - x);
    const dy = Math.abs(ry - y);
    const dz = Math.abs(rz - z);

    if (dx > dy && dx > dz) {
      rx = -ry - rz;
    } else if (dy > dz) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    // Convert back to axial
    const q = rx;
    const r = rz;

    hexes.push({ q, r });
  }

  return hexes;
}

// Check line of sight between two positions
function checkLineOfSight(from, to, obstacles = []) {
  const line = hexLine(from, to);

  // Check each hex along the line (except start and end)
  for (let i = 1; i < line.length - 1; i++) {
    const hex = line[i];

    // Check if this hex contains an obstacle
    for (const obstacle of obstacles) {
      if (obstacle.q === hex.q && obstacle.r === hex.r) {
        return {
          clear: false,
          blockedBy: obstacle
        };
      }
    }
  }

  return {
    clear: true,
    blockedBy: null
  };
}

// Stage 5: Helper function to roll damage dice
function rollDamageDice(roller, damageDice) {
  // Parse damage dice string (e.g., "2d6", "3d6", "4d6")
  const match = damageDice.match(/(\d+)d6/);
  if (!match) {
    throw new Error(`Invalid damage dice format: ${damageDice}`);
  }

  const numDice = parseInt(match[1]);

  // Use roller to roll Nd6
  const result = roller.roll(numDice, 6);

  return {
    dice: result.dice,
    total: result.total,
    formula: damageDice
  };
}

// Stage 5: Resolve attack with weapon selection
function resolveAttack(attacker, target, options = {}) {
  const roller = new DiceRoller(options.seed);

  // Stage 5: Get weapon (default to first weapon for backward compatibility)
  const weapon = options.weapon || (attacker.weapons && attacker.weapons[0]) || { damage: '2d6' };

  // Attack roll: 2d6 + skill + range - dodge
  const attackRoll = roller.roll2d6();
  const skill = attacker.pilotSkill || 0;
  let rangeDM = RULES.rangeDMs[options.range || 'medium'];
  const dodgeDM = RULES.dodgeDMs[options.dodge || 'none'];

  // Stage 6: Apply gunner skill bonus
  let gunnerSkill = 0;
  if (attacker.crew && attacker.crew.gunner) {
    gunnerSkill = Math.floor(getEffectiveSkill(attacker.crew.gunner, 'gunner'));
  }

  // Stage 5: Apply missile long range bonus
  if (weapon.longRangeBonus && options.range === 'long') {
    rangeDM += weapon.longRangeBonus;
  }

  const attackTotal = attackRoll.total + skill + rangeDM - dodgeDM + gunnerSkill;
  const hit = attackTotal >= RULES.attackTarget;

  const result = {
    attacker: attacker.name,
    target: target.name,
    weapon: weapon.name || 'Unknown Weapon',
    attackRoll: attackRoll,
    skill: skill,
    rangeDM: rangeDM,
    dodgeDM: dodgeDM,
    gunnerSkill: gunnerSkill > 0 ? gunnerSkill : undefined,  // Stage 6: Include gunner skill if present
    attackTotal: attackTotal,
    hit: hit,
    seed: attackRoll.seed
  };

  // If hit, roll damage using weapon damage dice
  if (hit) {
    const damageRoll = rollDamageDice(roller, weapon.damage || '2d6');
    const damage = Math.max(0, damageRoll.total - target.armor);

    result.damageRoll = damageRoll;
    result.armor = target.armor;
    result.damage = damage;
    result.newHull = target.hull - damage;
  }

  return result;
}

// Format attack result as human-readable text
function formatAttackResult(result) {
  let text = `${result.attacker} attacks ${result.target}`;
  // Stage 5: Include weapon name
  if (result.weapon) {
    text += ` with ${result.weapon}`;
  }
  text += `\n`;
  text += `Roll: [${result.attackRoll.dice.join(',')}] = ${result.attackRoll.total}\n`;
  text += `Modifiers: +${result.skill} (skill) +${result.rangeDM} (range) -${result.dodgeDM} (dodge)\n`;
  text += `Total: ${result.attackTotal} vs target ${RULES.attackTarget}\n`;

  if (result.hit) {
    text += `✓ HIT!\n`;
    text += `Damage: [${result.damageRoll.dice.join(',')}] = ${result.damageRoll.total} - ${result.armor} (armor) = ${result.damage}\n`;
    text += `Hull: ${result.target} ${result.newHull} remaining`;
  } else {
    text += `✗ MISS`;
  }

  return text;
}

// Get detailed breakdown for UI
function getAttackBreakdown(result) {
  return {
    summary: result.hit ? 'HIT' : 'MISS',
    attackRoll: {
      dice: result.attackRoll.dice,
      total: result.attackRoll.total
    },
    modifiers: [
      { name: 'Pilot Skill', value: result.skill },
      { name: 'Range', value: result.rangeDM },
      { name: 'Dodge', value: -result.dodgeDM }
    ],
    total: result.attackTotal,
    target: RULES.attackTarget,
    hit: result.hit,
    damage: result.hit ? {
      roll: result.damageRoll.dice,
      total: result.damageRoll.total,
      armor: result.armor,
      final: result.damage,
      hullRemaining: result.newHull
    } : null
  };
}

// Stage 8.1: Space Combat - Character Stats & Ship Models

// Calculate Traveller stat DM: (stat - 6) / 3, rounded down
function calculateStatDM(stat) {
  return Math.floor((stat - 6) / 3);
}

// Calculate critical hit thresholds (every 10% of hull)
function calculateCritThresholds(maxHull) {
  const thresholds = [];
  for (let i = 9; i >= 1; i--) {
    thresholds.push(Math.floor(maxHull * (i / 10)));
  }
  return thresholds;
}

// Validate ship name (XSS protection)
function validateShipName(name) {
  if (typeof name !== 'string') {
    throw new Error('Ship name must be a string');
  }

  // Strip HTML tags
  let sanitized = name.replace(/<[^>]*>/g, '');

  // Limit length
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50);
  }

  // Alphanumeric + spaces only
  sanitized = sanitized.replace(/[^a-zA-Z0-9 ]/g, '');

  return sanitized.trim();
}

// ============================================================
// DEPRECATED: SPACE_SHIPS (Stage 8.1 - kept for backward compatibility)
// ============================================================
// This hardcoded ship data is DEPRECATED as of Stage 8.1.
// New code should use the ShipRegistry (see lib/ship-registry.js)
// which loads ships from data/ships/*.json
//
// Why deprecated:
// - Hardcoded ships don't scale to 100+ ship types
// - Can't be modded without editing source code
// - Duplicates data (id/type redundancy)
// - No lazy loading or caching
//
// Migration path:
// - Use getRegistry().getShip('scout') instead
// - Use getRegistry().createShipInstance('scout') for runtime instances
// ============================================================
const SPACE_SHIPS = {
  scout: {
    id: 'scout',
    type: 'scout',
    name: 'Scout',
    hull: 20,
    maxHull: 20,
    armour: 4,
    thrust: 2,
    turrets: [
      {
        id: 'turret1',
        type: 'triple',
        weapons: ['pulse_laser', 'sandcaster', 'missile_rack'],
        assignedGunner: null
      }
    ],
    crew: {
      pilot: null,
      captain: null,
      engineer: null,
      sensors: null,
      gunners: [],
      marines: []
    },
    criticals: [],
    critThresholds: calculateCritThresholds(20),
    stance: 'neutral'
  },
  free_trader: {
    id: 'free_trader',
    type: 'free_trader',
    name: 'Free Trader',
    hull: 30,
    maxHull: 30,
    armour: 2,
    thrust: 1,
    turrets: [
      {
        id: 'turret1',
        type: 'single',
        weapons: ['beam_laser'],
        assignedGunner: null
      },
      {
        id: 'turret2',
        type: 'single',
        weapons: ['beam_laser'],
        assignedGunner: null
      }
    ],
    crew: {
      pilot: null,
      captain: null,
      engineer: null,
      sensors: null,
      gunners: [],
      marines: []
    },
    criticals: [],
    critThresholds: calculateCritThresholds(30),
    stance: 'neutral'
  }
};

// Create standard crew for a ship type
function createStandardCrew(shipType) {
  const crew = [];
  let idCounter = 1;

  // Standard stats (average human: 7)
  const standardStats = {
    str: 7,
    dex: 7,
    int: 7,
    edu: 7,
    end: 7,
    soc: 7
  };

  // Create pilot
  crew.push({
    id: `${shipType}_pilot_${idCounter++}`,
    name: `Pilot ${idCounter - 1}`,
    role: 'pilot',
    stats: { ...standardStats, dex: 9 }, // Pilots have better DEX
    skills: {
      pilot: 2,
      gunner: 0,
      engineering: 0,
      tactics_naval: 0,
      sensors: 0,
      marine: 0
    },
    health: 10,
    maxHealth: 10,
    preferences: {
      defaultTurret: null,
      defaultTarget: null
    }
  });

  // Create engineer
  crew.push({
    id: `${shipType}_engineer_${idCounter++}`,
    name: `Engineer ${idCounter - 1}`,
    role: 'engineer',
    stats: { ...standardStats, int: 9 }, // Engineers have better INT
    skills: {
      pilot: 0,
      gunner: 0,
      engineering: 2,
      tactics_naval: 0,
      sensors: 0,
      marine: 0
    },
    health: 10,
    maxHealth: 10,
    preferences: {
      defaultTurret: null,
      defaultTarget: null
    }
  });

  // Create gunners (1 for scout, 2 for free trader)
  const gunnerCount = shipType === 'free_trader' ? 2 : 1;
  for (let i = 0; i < gunnerCount; i++) {
    crew.push({
      id: `${shipType}_gunner_${idCounter++}`,
      name: `Gunner ${i + 1}`,
      role: 'gunner',
      stats: { ...standardStats, dex: 8 }, // Gunners have good DEX
      skills: {
        pilot: 0,
        gunner: 2,
        engineering: 0,
        tactics_naval: 0,
        sensors: 0,
        marine: 0
      },
      health: 10,
      maxHealth: 10,
      preferences: {
        defaultTurret: i === 0 ? 'turret1' : 'turret2',
        defaultTarget: null
      }
    });
  }

  return crew;
}

// ============================================================
// Stage 8.2: Range Bands & Targeting
// ============================================================

// 7 range bands for space combat
const SPACE_RANGE_BANDS = ['adjacent', 'close', 'short', 'medium', 'long', 'very_long', 'distant'];

// Calculate range DM for space combat
// Short range gives bonus, long ranges give penalties
function calculateRangeDM(range) {
  const rangeDMs = {
    'adjacent': 0,
    'close': 0,
    'short': 1,      // +1 bonus at short range
    'medium': 0,
    'long': -2,      // -2 penalty
    'very_long': -4, // -4 penalty
    'distant': -6    // -6 penalty
  };

  if (!(range in rangeDMs)) {
    throw new Error(`Invalid range: ${range}. Must be one of: ${SPACE_RANGE_BANDS.join(', ')}`);
  }

  return rangeDMs[range];
}

// Get valid targets for attacking ship
// Filters out: self, friendly ships, disabled/destroyed ships
// Returns array of valid hostile/neutral targets
function getValidTargets(attacker, allShips) {
  return allShips.filter(ship => {
    // Cannot target self
    if (ship.id === attacker.id) {
      return false;
    }

    // Cannot target destroyed or disabled ships
    if (ship.stance === 'destroyed' || ship.stance === 'disabled') {
      return false;
    }

    // Only auto-target hostile and neutral ships
    // Friendly ships can be manually targeted with warning
    if (ship.stance === 'friendly') {
      return false;
    }

    return true;
  });
}

// Check if targeting a friendly ship (friendly fire)
// Returns warning but allows the action
function checkFriendlyFire(attacker, target) {
  const isFriendlyFire = target.stance === 'friendly';

  return {
    isFriendlyFire: isFriendlyFire,
    allowed: true, // Always allowed, just warned
    warning: isFriendlyFire ? 'WARNING: Targeting friendly ship!' : null
  };
}

// Validate if weapon can fire at given range
// Some weapons have range restrictions (e.g., Beam Laser only medium or closer)
function validateWeaponRange(weapon, range) {
  // If no restriction, all ranges valid
  if (!weapon.rangeRestriction || weapon.rangeRestriction === null) {
    return true;
  }

  // Check if range is in allowed list
  return weapon.rangeRestriction.includes(range);
}

// Select default target for ship
// Prefers last target if still valid, otherwise first valid target
function selectDefaultTarget(attacker, allShips) {
  const validTargets = getValidTargets(attacker, allShips);

  if (validTargets.length === 0) {
    return null;
  }

  // If attacker has last target and it's still valid, use it
  if (attacker.lastTarget) {
    const lastTarget = validTargets.find(ship => ship.id === attacker.lastTarget);
    if (lastTarget) {
      return lastTarget;
    }
  }

  // Otherwise return first valid target
  return validTargets[0];
}

module.exports = {
  RULES,
  SHIPS,
  CREW,  // Stage 6: Export crew data
  GRID_SIZE,  // Stage 7: Export grid constant
  SPACE_SHIPS,  // Stage 8.1: Space ship definitions (DEPRECATED - use getShipRegistry)
  getShipRegistry: getRegistry,  // Stage 8.1: Ship database registry
  resolveAttack,
  formatAttackResult,
  getAttackBreakdown,
  rollDamageDice,  // Stage 5: Export for testing
  applyCrew,  // Stage 6: Export crew functions
  assignCrewRole,
  crewTakeDamage,
  engineerRepair,
  hexDistance,  // Stage 7: Export grid functions
  rangeFromDistance,
  validateMove,
  checkLineOfSight,
  calculateStatDM,  // Stage 8.1: Space combat functions
  createStandardCrew,
  validateShipName,
  calculateCritThresholds,
  SPACE_RANGE_BANDS,  // Stage 8.2: Range bands & targeting
  calculateRangeDM,
  getValidTargets,
  checkFriendlyFire,
  validateWeaponRange,
  selectDefaultTarget
};
