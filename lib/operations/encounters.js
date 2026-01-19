/**
 * Encounters Module (AR-197)
 * Pre-built encounter templates for jump emergence and other events
 */

const { generateId } = require('./database');

// Encounter status
const ENCOUNTER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  IGNORED: 'ignored'
};

// Encounter types
const ENCOUNTER_TYPES = {
  DISTRESS: 'distress',
  PATROL: 'patrol',
  MERCHANT: 'merchant',
  PIRATE: 'pirate',
  DERELICT: 'derelict',
  CUSTOMS: 'customs'
};

// ==================== Encounter Templates ====================

/**
 * Pre-defined encounter templates
 * Each template includes all data needed to instantiate an encounter
 */
const ENCOUNTER_TEMPLATES = {
  // AR-197: Scout Emergence Encounter
  scoutDistress: {
    id: 'scout-distress',
    type: ENCOUNTER_TYPES.DISTRESS,
    name: 'Distress Signal - Scout/Courier',
    description: 'A damaged Scout/Courier is broadcasting a distress signal at the jump point.',
    flavorText: 'As you emerge from jump space, sensors detect a weak distress beacon. A Type-S Scout/Courier tumbles slowly nearby, venting atmosphere from a hull breach.',

    // Ship data for the encounter
    ship: {
      name: 'ISS Wanderer',
      type: 'Scout/Courier',
      registration: 'SM-7734',
      tonnage: 100,
      condition: 'damaged',
      damage: {
        hull: { current: 12, max: 40, description: 'Hull breach, deck 2' },
        mDrive: { operational: false, description: 'Plasma injector failure' },
        powerPlant: { operational: true, description: 'Running at 60% capacity' },
        lifesupport: { hours: 8, description: 'Limited air supply' }
      }
    },

    // NPCs in the encounter
    npcs: [
      {
        id: 'scout-captain',
        name: 'Captain Elara Vance',
        role: 'Captain',
        species: 'Human',
        description: 'A weathered Scout Service veteran with a prosthetic left arm.',
        personality: 'Pragmatic, grateful for help but suspicious of strangers',
        dialogue: {
          initial: 'This is Captain Vance of the ISS Wanderer. Our drive is dead and we\'re venting atmo. Requesting immediate assistance.',
          grateful: 'You have the thanks of the Scout Service. I won\'t forget this.',
          suspicious: 'What\'s your interest in helping us? Nothing\'s free in the Marches.',
          desperate: 'Please... my crew has less than eight hours of air left.'
        }
      },
      {
        id: 'scout-engineer',
        name: 'Engineer Kenji Tanaka',
        role: 'Engineer',
        species: 'Human',
        description: 'Young, nervous, clearly out of his depth.',
        personality: 'Anxious, eager to help, technically skilled',
        dialogue: {
          initial: 'The plasma injector is completely fused. I\'ve never seen damage like this.',
          technical: 'If we had a spare injector or could fabricate one, I could get the M-drive running in about six hours.'
        }
      }
    ],

    // Resolution options
    resolutions: [
      {
        id: 'assist-repair',
        name: 'Assist with Repairs',
        description: 'Send your Engineer to help repair the Scout.',
        requirements: ['engineer'],
        skillCheck: { skill: 'engineer', difficulty: 8 },
        outcomes: {
          success: {
            message: 'Working together, the engineers restore M-drive function. Captain Vance offers a reward.',
            rewards: ['reputation_scout_service', 'contact_vance', 'credits_2000'],
            reputation: { scout_service: +1 }
          },
          failure: {
            message: 'Despite best efforts, the drive cannot be repaired. The crew must be evacuated.',
            consequences: ['evacuate_crew']
          }
        }
      },
      {
        id: 'evacuate',
        name: 'Evacuate Crew',
        description: 'Take the Scout\'s crew aboard your ship.',
        requirements: [],
        outcomes: {
          success: {
            message: 'The crew transfers safely to your ship. The Wanderer will need to be salvaged later.',
            rewards: ['reputation_scout_service', 'contact_vance'],
            passengers: ['scout-captain', 'scout-engineer'],
            reputation: { scout_service: +1 }
          }
        }
      },
      {
        id: 'tow',
        name: 'Tow to Starport',
        description: 'Attach a tow line and bring the Scout to the nearest starport.',
        requirements: ['fuel_10'],
        outcomes: {
          success: {
            message: 'You successfully tow the Wanderer to starport. The Scout Service compensates you generously.',
            rewards: ['reputation_scout_service', 'contact_vance', 'credits_5000', 'fuel_refund'],
            reputation: { scout_service: +2 }
          }
        }
      },
      {
        id: 'ignore',
        name: 'Ignore Distress Signal',
        description: 'Continue on your way without rendering assistance.',
        requirements: [],
        outcomes: {
          success: {
            message: 'You leave the stricken Scout behind. Its crew\'s fate is uncertain.',
            reputation: { scout_service: -1, general: -1 }
          }
        }
      },
      {
        id: 'salvage',
        name: 'Claim Salvage Rights',
        description: 'Offer to save the crew in exchange for salvage rights to the ship.',
        requirements: [],
        outcomes: {
          success: {
            message: 'Captain Vance reluctantly agrees. The Wanderer is legally yours, though the Scout Service will remember.',
            rewards: ['salvage_scout', 'contact_vance_reluctant'],
            reputation: { scout_service: -1 }
          }
        }
      }
    ],

    // Trigger conditions (for random encounters)
    triggerConditions: {
      location: ['jump_point'],
      probability: 0.15  // 15% chance at jump emergence
    }
  },

  // Additional encounter templates can be added here
  patrolInterdiction: {
    id: 'patrol-interdiction',
    type: ENCOUNTER_TYPES.PATROL,
    name: 'Imperial Navy Patrol',
    description: 'An Imperial Navy patrol vessel hails you for routine inspection.',
    flavorText: 'A sleek Patrol Corvette emerges from behind the gas giant, its transponder identifying it as INS Vigilant. "Merchant vessel, heave to for routine inspection."',
    ship: {
      name: 'INS Vigilant',
      type: 'Patrol Corvette',
      registration: 'IN-4412',
      tonnage: 400,
      condition: 'operational'
    },
    npcs: [
      {
        id: 'navy-commander',
        name: 'Commander Alexis Chen',
        role: 'Commanding Officer',
        species: 'Human',
        description: 'Crisp uniform, stern demeanor, but fair.',
        personality: 'Professional, by-the-book, respects honesty'
      }
    ],
    resolutions: [
      {
        id: 'comply',
        name: 'Submit to Inspection',
        description: 'Allow the Navy to inspect your cargo.',
        outcomes: {
          success: {
            message: 'The inspection finds nothing amiss. The Commander wishes you safe travels.',
            rewards: []
          }
        }
      },
      {
        id: 'bribe',
        name: 'Offer a Bribe',
        description: 'Attempt to pay off the inspectors.',
        skillCheck: { skill: 'persuade', difficulty: 10 },
        outcomes: {
          success: {
            message: 'The junior officer pockets the credits and waves you through.',
            rewards: [],
            costs: ['credits_1000']
          },
          failure: {
            message: 'The Commander is offended. Your ship is thoroughly searched and you face a fine.',
            consequences: ['fine_5000', 'reputation_loss']
          }
        }
      }
    ],
    triggerConditions: {
      location: ['highport', 'jump_point'],
      probability: 0.10
    }
  }
};

// ==================== Encounter Functions ====================

/**
 * Get an encounter template by ID
 * @param {string} templateId - Template ID
 * @returns {Object|null} Encounter template
 */
function getEncounterTemplate(templateId) {
  return ENCOUNTER_TEMPLATES[templateId] || null;
}

/**
 * Get all encounter templates
 * @returns {Object} All templates
 */
function getAllEncounterTemplates() {
  return ENCOUNTER_TEMPLATES;
}

/**
 * Instantiate an encounter from a template
 * @param {string} templateId - Template ID
 * @param {Object} [overrides] - Optional overrides for the encounter
 * @returns {Object} Instantiated encounter
 */
function createEncounter(templateId, overrides = {}) {
  const template = getEncounterTemplate(templateId);
  if (!template) {
    return { success: false, error: `Unknown encounter template: ${templateId}` };
  }

  const encounterId = generateId();
  const encounter = {
    ...template,
    ...overrides,
    // These must come after spread to ensure they're not overwritten
    id: encounterId,
    templateId,
    status: ENCOUNTER_STATUS.ACTIVE,
    createdAt: new Date().toISOString()
  };

  return {
    success: true,
    encounter
  };
}

/**
 * Roll for random encounter at a location
 * @param {string} location - Current location (e.g., 'jump_point', 'highport')
 * @param {Object} [options] - Options
 * @param {boolean} [options.forceEncounter] - Force an encounter (for testing)
 * @returns {Object|null} Encounter or null
 */
function rollEncounter(location, options = {}) {
  const eligibleTemplates = Object.values(ENCOUNTER_TEMPLATES).filter(template => {
    const conditions = template.triggerConditions;
    if (!conditions) return false;
    if (!conditions.location.includes(location)) return false;
    return true;
  });

  if (eligibleTemplates.length === 0) {
    return null;
  }

  // If forcing encounter, pick first eligible
  if (options.forceEncounter) {
    const template = eligibleTemplates[0];
    return createEncounter(template.id.replace('-', '')).encounter;
  }

  // Roll for each eligible template
  for (const template of eligibleTemplates) {
    const roll = Math.random();
    if (roll < template.triggerConditions.probability) {
      const templateKey = Object.keys(ENCOUNTER_TEMPLATES).find(
        key => ENCOUNTER_TEMPLATES[key].id === template.id
      );
      return createEncounter(templateKey).encounter;
    }
  }

  return null;
}

/**
 * Roll for jump emergence encounter
 * This is specifically for the AR-197 scout encounter
 * @param {Object} [options] - Options
 * @param {boolean} [options.forceScout] - Force the scout encounter
 * @returns {Object|null} Encounter or null
 */
function rollJumpEmergenceEncounter(options = {}) {
  // Force scout encounter if requested
  if (options.forceScout) {
    return createEncounter('scoutDistress').encounter;
  }

  // Otherwise roll normally at jump point
  return rollEncounter('jump_point', options);
}

/**
 * Resolve an encounter with a chosen resolution
 * @param {Object} encounter - Active encounter
 * @param {string} resolutionId - Chosen resolution ID
 * @param {Object} [context] - Context (skill levels, etc.)
 * @returns {Object} Resolution result
 */
function resolveEncounter(encounter, resolutionId, context = {}) {
  const resolution = encounter.resolutions.find(r => r.id === resolutionId);
  if (!resolution) {
    return { success: false, error: `Unknown resolution: ${resolutionId}` };
  }

  // Check requirements
  if (resolution.requirements && resolution.requirements.length > 0) {
    const missingReqs = resolution.requirements.filter(req => {
      // Check if requirement is met in context
      if (req === 'engineer' && !context.hasEngineer) return true;
      if (req.startsWith('fuel_') && (context.fuel || 0) < parseInt(req.split('_')[1])) return true;
      return false;
    });

    if (missingReqs.length > 0) {
      return {
        success: false,
        error: `Missing requirements: ${missingReqs.join(', ')}`
      };
    }
  }

  // Perform skill check if required
  let outcome = resolution.outcomes.success;
  if (resolution.skillCheck) {
    const { skillCheck: skillCheckFn } = require('../skill-checks');
    const result = skillCheckFn({
      skillLevel: context.skillLevel || 0,
      characteristic: context.characteristic || 0,
      difficulty: resolution.skillCheck.difficulty
    });

    if (!result.success) {
      outcome = resolution.outcomes.failure || {
        message: 'The attempt failed.',
        consequences: []
      };
    }
  }

  return {
    success: true,
    resolution: resolutionId,
    outcome,
    encounterStatus: ENCOUNTER_STATUS.RESOLVED
  };
}

/**
 * Get encounter NPCs
 * @param {Object} encounter - Encounter object
 * @returns {Array} NPCs in the encounter
 */
function getEncounterNPCs(encounter) {
  return encounter.npcs || [];
}

/**
 * Get encounter ship data
 * @param {Object} encounter - Encounter object
 * @returns {Object|null} Ship data
 */
function getEncounterShip(encounter) {
  return encounter.ship || null;
}

// ==================== Exports ====================

module.exports = {
  // Constants
  ENCOUNTER_STATUS,
  ENCOUNTER_TYPES,
  ENCOUNTER_TEMPLATES,

  // Template access
  getEncounterTemplate,
  getAllEncounterTemplates,

  // Encounter creation
  createEncounter,
  rollEncounter,
  rollJumpEmergenceEncounter,

  // Encounter resolution
  resolveEncounter,

  // Helpers
  getEncounterNPCs,
  getEncounterShip
};
