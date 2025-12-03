/**
 * Characters Module (Autorun 9 + AR-19)
 * Player characters with UPP stats, skills, and equipment
 * Includes parsers for importing character data
 *
 * AR-19: Canonical JSON Schema for Character Import
 * @example
 * {
 *   "name": "Marcus Cole",                    // Required: character name
 *   "species": "Human",                       // Optional: default "Human"
 *   "homeworld": "Regina",                    // Optional: origin world
 *   "age": 34,                                // Optional: character age
 *   "upp": "789A87",                          // UPP hex string (STR/DEX/END/INT/EDU/SOC)
 *   "stats": {                                // Alternative to UPP
 *     "str": 7, "dex": 8, "end": 9,
 *     "int": 10, "edu": 8, "soc": 7,
 *     "psi": null                             // Optional: PSI score
 *   },
 *   "skills": {                               // Skill name -> level (0-6)
 *     "Pilot": 2,
 *     "Gunnery": 1,
 *     "Astrogation": 1,
 *     "Engineer": 0,
 *     "Vacc Suit": 1
 *   },
 *   "careers": [                              // Optional: career history
 *     { "name": "Navy", "terms": 3, "rank": 4, "rankTitle": "Lieutenant" }
 *   ],
 *   "equipment": [                            // Optional: gear
 *     { "name": "Cloth Armor", "quantity": 1 },
 *     { "name": "Communicator", "quantity": 1 }
 *   ],
 *   "weapons": [                              // Optional: weapons
 *     { "name": "Autopistol", "damage": "3D-3", "magazine": 15 }
 *   ],
 *   "armor": "Cloth (5)",                     // Optional: worn armor
 *   "credits": 10000,                         // Optional: money
 *   "shipShares": 2,                          // Optional: shares in ship
 *   "notes": "Former naval officer"           // Optional: freeform notes
 * }
 */

const { db, generateId } = require('./database');

// Stat names in UPP order
const STAT_ORDER = ['str', 'dex', 'end', 'int', 'edu', 'soc'];

/**
 * Parse UPP string to stats object
 * @param {string} upp - UPP string like "789A87" or "789AB7"
 * @returns {Object} Stats object {str, dex, end, int, edu, soc, psi?}
 */
function parseUPP(upp) {
  if (!upp || typeof upp !== 'string') return null;

  // Clean the input - remove spaces, dashes, common prefixes
  const clean = upp.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();

  if (clean.length < 6) return null;

  const stats = {};
  const chars = clean.split('');

  // Parse first 6 characters as standard UPP
  for (let i = 0; i < 6 && i < chars.length; i++) {
    const val = parseInt(chars[i], 16);
    if (isNaN(val)) return null;
    stats[STAT_ORDER[i]] = val;
  }

  // 7th character is PSI if present
  if (chars.length >= 7) {
    const psi = parseInt(chars[6], 16);
    if (!isNaN(psi)) stats.psi = psi;
  }

  return stats;
}

/**
 * Convert stats object to UPP string
 * @param {Object} stats - Stats object
 * @returns {string} UPP string like "789A87"
 */
function toUPP(stats) {
  if (!stats) return '';
  let upp = '';
  for (const stat of STAT_ORDER) {
    const val = stats[stat] ?? 7;
    upp += val.toString(16).toUpperCase();
  }
  if (stats.psi !== undefined && stats.psi !== null) {
    upp += stats.psi.toString(16).toUpperCase();
  }
  return upp;
}

/**
 * Parse skills from freeform text
 * Handles formats like:
 * - "Pilot-2, Gunnery-1, Vacc Suit-1"
 * - "Pilot 2, Gunnery 1"
 * - "Pilot: 2, Gunnery: 1"
 * @param {string} text - Freeform skills text
 * @returns {Object} Skills object {skillName: level}
 */
function parseSkills(text) {
  if (!text || typeof text !== 'string') return {};

  const skills = {};

  // Common skill patterns
  // Match: "Skill Name-2", "Skill Name 2", "Skill Name: 2", "Skill Name (2)"
  const patterns = [
    /([A-Za-z][A-Za-z\s]+?)\s*[-:]\s*(\d+)/g,  // "Pilot-2" or "Pilot: 2"
    /([A-Za-z][A-Za-z\s]+?)\s+(\d+)(?=[,;\n]|$)/g,  // "Pilot 2,"
    /([A-Za-z][A-Za-z\s]+?)\s*\((\d+)\)/g,  // "Pilot (2)"
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const skillName = match[1].trim();
      const level = parseInt(match[2]);

      // Normalize skill name (title case, collapse spaces)
      const normalized = skillName
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      // Only add if valid level (0-6 is normal range)
      if (!isNaN(level) && level >= 0 && level <= 6) {
        skills[normalized] = level;
      }
    }
  }

  return skills;
}

/**
 * Parse careers from text
 * @param {string} text - Career text like "Navy (2 terms), Scout (1 term)"
 * @returns {Array} Array of career objects
 */
function parseCareers(text) {
  if (!text || typeof text !== 'string') return [];

  const careers = [];

  // Match: "Career Name (N terms)" or "Career Name - Rank N" etc.
  const pattern = /([A-Za-z][A-Za-z\s]+?)(?:\s*\((\d+)\s*terms?\)|\s*[-:]\s*(\d+)\s*terms?)?/gi;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const name = match[1].trim();
    const terms = parseInt(match[2] || match[3]) || 1;

    if (name.length > 2) {
      careers.push({ name, terms, rank: 0, rankTitle: '' });
    }
  }

  return careers;
}

/**
 * Create a new character
 * @param {string} campaignId - Campaign ID
 * @param {Object} charData - Character data
 * @returns {Object} Created character
 */
function createCharacter(campaignId, charData) {
  const {
    playerAccountId = null,
    name,
    species = 'Human',
    homeworld = null,
    age = null,
    stats = {},
    careers = [],
    skills = {},
    equipment = [],
    weapons = [],
    armor = null,
    credits = 0,
    shipShares = 0,
    importConfidence = null,
    importRawText = null
  } = charData;

  const id = generateId();

  const stmt = db.prepare(`
    INSERT INTO characters (
      id, campaign_id, player_account_id, name, species, homeworld, age,
      str, dex, end, int, edu, soc, psi,
      careers, skills, equipment, weapons, armor, credits, ship_shares,
      import_confidence, import_raw_text
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, campaignId, playerAccountId, name, species, homeworld, age,
    stats.str ?? 7, stats.dex ?? 7, stats.end ?? 7,
    stats.int ?? 7, stats.edu ?? 7, stats.soc ?? 7, stats.psi ?? null,
    JSON.stringify(careers), JSON.stringify(skills),
    JSON.stringify(equipment), JSON.stringify(weapons),
    armor, credits, shipShares,
    importConfidence, importConfidence < 80 ? importRawText : null
  );

  return getCharacter(id);
}

/**
 * Parse JSON fields in character
 */
function parseCharacterFields(char) {
  if (!char) return null;
  char.careers = JSON.parse(char.careers || '[]');
  char.skills = JSON.parse(char.skills || '{}');
  char.equipment = JSON.parse(char.equipment || '[]');
  char.weapons = JSON.parse(char.weapons || '[]');
  // Build stats object for convenience
  char.stats = {
    str: char.str,
    dex: char.dex,
    end: char.end,
    int: char.int,
    edu: char.edu,
    soc: char.soc,
    psi: char.psi
  };
  char.upp = toUPP(char.stats);
  return char;
}

/**
 * Get a character by ID
 * @param {string} id - Character ID
 * @returns {Object|null} Character or null
 */
function getCharacter(id) {
  const stmt = db.prepare('SELECT * FROM characters WHERE id = ?');
  return parseCharacterFields(stmt.get(id));
}

/**
 * Get all characters for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Characters
 */
function getCharactersByCampaign(campaignId) {
  const stmt = db.prepare('SELECT * FROM characters WHERE campaign_id = ? ORDER BY name ASC');
  return stmt.all(campaignId).map(parseCharacterFields);
}

/**
 * Get character for a player account
 * @param {string} playerAccountId - Player account ID
 * @returns {Object|null} Character or null
 */
function getCharacterByPlayer(playerAccountId) {
  const stmt = db.prepare('SELECT * FROM characters WHERE player_account_id = ?');
  return parseCharacterFields(stmt.get(playerAccountId));
}

/**
 * Update a character
 * @param {string} id - Character ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated character
 */
function updateCharacter(id, updates) {
  const allowedFields = [
    'name', 'species', 'homeworld', 'age',
    'str', 'dex', 'end', 'int', 'edu', 'soc', 'psi',
    'careers', 'skills', 'equipment', 'weapons', 'armor',
    'credits', 'ship_shares', 'player_account_id'
  ];
  const setFields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(dbKey)) {
      setFields.push(`${dbKey} = ?`);
      if (typeof value === 'object' && value !== null) {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  }

  if (setFields.length === 0) return getCharacter(id);

  values.push(id);
  const stmt = db.prepare(`
    UPDATE characters
    SET ${setFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(...values);

  return getCharacter(id);
}

/**
 * Delete a character
 * @param {string} id - Character ID
 * @returns {boolean} Success
 */
function deleteCharacter(id) {
  const stmt = db.prepare('DELETE FROM characters WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Link character to player account
 * @param {string} characterId - Character ID
 * @param {string} playerAccountId - Player account ID
 * @returns {Object} Updated character
 */
function linkCharacterToPlayer(characterId, playerAccountId) {
  const stmt = db.prepare(`
    UPDATE characters
    SET player_account_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(playerAccountId, characterId);
  return getCharacter(characterId);
}

/**
 * Export character to JSON format
 * @param {string} id - Character ID
 * @returns {Object} Character data for export
 */
function exportCharacter(id) {
  const char = getCharacter(id);
  if (!char) return null;

  return {
    name: char.name,
    species: char.species,
    homeworld: char.homeworld,
    age: char.age,
    upp: char.upp,
    stats: char.stats,
    careers: char.careers,
    skills: char.skills,
    equipment: char.equipment,
    weapons: char.weapons,
    armor: char.armor,
    credits: char.credits,
    shipShares: char.ship_shares
  };
}

// ==================== AR-19: Character Import Validation ====================

/**
 * Validate character import data
 * @param {Object} charData - Character data to validate
 * @returns {{valid: boolean, errors: string[], sanitized: Object}}
 */
function validateCharacterImport(charData) {
  const errors = [];
  const sanitized = {};

  // Name validation (required)
  if (!charData.name || typeof charData.name !== 'string') {
    errors.push('Character name is required');
  } else {
    sanitized.name = charData.name.trim().slice(0, 100);
    if (sanitized.name.length < 1) {
      errors.push('Character name cannot be empty');
    }
  }

  // Species validation (optional)
  if (charData.species) {
    sanitized.species = String(charData.species).trim().slice(0, 50);
  }

  // Homeworld validation (optional)
  if (charData.homeworld) {
    sanitized.homeworld = String(charData.homeworld).trim().slice(0, 50);
  }

  // Age validation (optional, 1-999)
  if (charData.age !== undefined && charData.age !== null) {
    const age = parseInt(charData.age);
    if (isNaN(age) || age < 1 || age > 999) {
      errors.push('Age must be between 1 and 999');
    } else {
      sanitized.age = age;
    }
  }

  // Stats validation - from UPP or stats object
  sanitized.stats = {};
  if (charData.upp) {
    const parsed = parseUPP(charData.upp);
    if (parsed) {
      sanitized.stats = parsed;
    } else {
      errors.push('Invalid UPP format');
    }
  } else if (charData.stats) {
    for (const stat of STAT_ORDER) {
      const val = charData.stats[stat];
      if (val !== undefined && val !== null) {
        const num = parseInt(val);
        if (isNaN(num) || num < 0 || num > 15) {
          errors.push(`${stat.toUpperCase()} must be between 0 and 15`);
        } else {
          sanitized.stats[stat] = num;
        }
      } else {
        sanitized.stats[stat] = 7; // Default
      }
    }
    // PSI is optional
    if (charData.stats.psi !== undefined && charData.stats.psi !== null) {
      const psi = parseInt(charData.stats.psi);
      if (!isNaN(psi) && psi >= 0 && psi <= 15) {
        sanitized.stats.psi = psi;
      }
    }
  }

  // Skills validation (object with skill:level)
  sanitized.skills = {};
  if (charData.skills && typeof charData.skills === 'object') {
    for (const [skill, level] of Object.entries(charData.skills)) {
      const lvl = parseInt(level);
      if (!isNaN(lvl) && lvl >= 0 && lvl <= 6) {
        // Normalize skill name
        const normalized = skill.trim().slice(0, 50);
        sanitized.skills[normalized] = lvl;
      }
    }
  }

  // Careers validation (array)
  sanitized.careers = [];
  if (Array.isArray(charData.careers)) {
    for (const career of charData.careers) {
      if (career.name) {
        sanitized.careers.push({
          name: String(career.name).trim().slice(0, 50),
          terms: parseInt(career.terms) || 1,
          rank: parseInt(career.rank) || 0,
          rankTitle: career.rankTitle ? String(career.rankTitle).trim().slice(0, 50) : ''
        });
      }
    }
  }

  // Equipment validation (array)
  sanitized.equipment = [];
  if (Array.isArray(charData.equipment)) {
    for (const item of charData.equipment) {
      if (item.name) {
        sanitized.equipment.push({
          name: String(item.name).trim().slice(0, 100),
          quantity: parseInt(item.quantity) || 1
        });
      }
    }
  }

  // Weapons validation (array)
  sanitized.weapons = [];
  if (Array.isArray(charData.weapons)) {
    for (const weapon of charData.weapons) {
      if (weapon.name) {
        sanitized.weapons.push({
          name: String(weapon.name).trim().slice(0, 100),
          damage: weapon.damage ? String(weapon.damage).slice(0, 20) : '',
          magazine: parseInt(weapon.magazine) || 0
        });
      }
    }
  }

  // Armor validation (string)
  if (charData.armor) {
    sanitized.armor = String(charData.armor).trim().slice(0, 100);
  }

  // Credits validation
  if (charData.credits !== undefined) {
    const credits = parseInt(charData.credits);
    if (!isNaN(credits) && credits >= 0) {
      sanitized.credits = credits;
    }
  }

  // Ship shares validation
  if (charData.shipShares !== undefined) {
    const shares = parseInt(charData.shipShares);
    if (!isNaN(shares) && shares >= 0) {
      sanitized.shipShares = shares;
    }
  }

  // Notes validation
  if (charData.notes) {
    sanitized.notes = String(charData.notes).trim().slice(0, 2000);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Parse fuzzy character text from various sources (AR-19.7)
 * Handles PDF copy-paste, Traveller character generators, etc.
 * @param {string} text - Raw text to parse
 * @returns {{data: Object, confidence: number, warnings: string[]}}
 */
function parseFuzzyText(text) {
  const data = {
    name: null,
    stats: {},
    skills: {},
    careers: [],
    equipment: [],
    credits: null
  };
  const warnings = [];
  let confidence = 0;

  if (!text || typeof text !== 'string') {
    return { data, confidence: 0, warnings: ['No text provided'] };
  }

  // Try JSON parse first
  if (text.trim().startsWith('{')) {
    try {
      const json = JSON.parse(text);
      const validation = validateCharacterImport(json);
      if (validation.valid) {
        return { data: validation.sanitized, confidence: 100, warnings: [] };
      }
      return { data: validation.sanitized, confidence: 80, warnings: validation.errors };
    } catch (e) {
      // Not valid JSON, continue with fuzzy parsing
    }
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  // Extract name (first line that looks like a name)
  for (const line of lines) {
    // Skip lines with obvious data markers
    if (line.includes(':') || line.match(/^[0-9A-F]{6,7}$/i) || line.match(/^\d+$/)) continue;
    // Skip skill-like lines
    if (line.match(/-\d$/) || line.match(/\(\d\)$/)) continue;
    // Accept if it's 2-50 chars and starts with a letter
    if (line.length >= 2 && line.length <= 50 && /^[A-Za-z]/.test(line)) {
      data.name = line;
      confidence += 20;
      break;
    }
  }

  // Extract UPP
  const uppMatch = text.match(/UPP[:\s]*([0-9A-Fa-f]{6,7})/i) ||
                   text.match(/(?:^|\s)([0-9A-Fa-f]{6,7})(?:\s|$)/m);
  if (uppMatch) {
    const parsed = parseUPP(uppMatch[1]);
    if (parsed) {
      data.stats = parsed;
      confidence += 25;
    }
  }

  // Also check for individual stat formats: "STR 7" or "Strength: 8"
  const statPatterns = {
    str: /(?:STR|Strength)[:\s]+(\d+)/i,
    dex: /(?:DEX|Dexterity)[:\s]+(\d+)/i,
    end: /(?:END|Endurance)[:\s]+(\d+)/i,
    int: /(?:INT|Intelligence)[:\s]+(\d+)/i,
    edu: /(?:EDU|Education)[:\s]+(\d+)/i,
    soc: /(?:SOC|Social)[:\s]+(\d+)/i
  };
  for (const [stat, pattern] of Object.entries(statPatterns)) {
    const match = text.match(pattern);
    if (match && !data.stats[stat]) {
      const val = parseInt(match[1]);
      if (val >= 0 && val <= 15) {
        data.stats[stat] = val;
        confidence += 3;
      }
    }
  }

  // Extract skills
  data.skills = parseSkills(text);
  if (Object.keys(data.skills).length > 0) {
    confidence += 20;
  }

  // Extract careers
  data.careers = parseCareers(text);
  if (data.careers.length > 0) {
    confidence += 10;
  }

  // Extract credits
  const creditsMatch = text.match(/(?:Credits?|Cr|MCr)[:\s]*([0-9,]+)/i);
  if (creditsMatch) {
    const credits = parseInt(creditsMatch[1].replace(/,/g, ''));
    if (!isNaN(credits)) {
      data.credits = credits;
      confidence += 5;
    }
  }

  // Cap confidence at 95 for fuzzy parsing
  confidence = Math.min(confidence, 95);

  // Add warnings for missing data
  if (!data.name) warnings.push('Could not extract character name');
  if (Object.keys(data.stats).length < 6) warnings.push('Could not extract all stats');
  if (Object.keys(data.skills).length === 0) warnings.push('Could not extract any skills');

  return { data, confidence, warnings };
}

module.exports = {
  // Parsers
  parseUPP,
  toUPP,
  parseSkills,
  parseCareers,
  parseFuzzyText,

  // Validation (AR-19)
  validateCharacterImport,

  // CRUD
  createCharacter,
  getCharacter,
  getCharactersByCampaign,
  getCharacterByPlayer,
  updateCharacter,
  deleteCharacter,
  linkCharacterToPlayer,
  exportCharacter,

  // Constants
  STAT_ORDER
};
