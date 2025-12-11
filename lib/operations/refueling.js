/**
 * Refueling System for Traveller Starship Operations VTT
 * Handles fuel types, sources, refueling operations, and fuel processing
 */

const { db, generateId } = require('./database');
const campaign = require('./campaign');

// ==================== Constants ====================

/**
 * Fuel types and their properties
 */
const FUEL_TYPES = {
  refined: {
    name: 'Refined',
    dmModifier: 0,
    misjumpRisk: 0,
    description: 'High-quality fuel, no jump penalties'
  },
  unrefined: {
    name: 'Unrefined',
    dmModifier: -2,
    misjumpRisk: 0.05,  // 5% chance of misjump
    description: 'Raw fuel, -2 DM to jump checks, misjump risk'
  },
  processed: {
    name: 'Processed',
    dmModifier: 0,
    misjumpRisk: 0,
    description: 'Unrefined fuel that has been processed by ship systems'
  }
};

/**
 * Fuel sources and their properties
 */
const FUEL_SOURCES = {
  starportRefined: {
    id: 'starportRefined',
    name: 'Starport (Refined)',
    fuelType: 'refined',
    cost: 500,  // Cr per ton
    timeHours: 0,
    skillCheck: null,
    requirements: ['starport_A', 'starport_B'],
    description: 'Purchase refined fuel from Class A or B starport'
  },
  starportUnrefined: {
    id: 'starportUnrefined',
    name: 'Starport (Unrefined)',
    fuelType: 'unrefined',
    cost: 100,  // Cr per ton
    timeHours: 0,
    skillCheck: null,
    requirements: ['starport_C', 'starport_D', 'starport_E'],
    description: 'Purchase unrefined fuel from starport'
  },
  gasGiant: {
    id: 'gasGiant',
    name: 'Gas Giant Skimming',
    fuelType: 'unrefined',
    cost: 0,
    timeHours: 4,  // Base time, varies with fuel amount
    skillCheck: { skill: 'pilot', difficulty: 8 },
    requirements: ['gas_giant'],
    description: 'Skim fuel from gas giant atmosphere (free, requires Pilot check)'
  },
  wilderness: {
    id: 'wilderness',
    name: 'Wilderness Refueling',
    fuelType: 'unrefined',
    cost: 0,
    timeHours: 8,  // Base time for 10 tons
    skillCheck: null,
    requirements: ['water_source'],
    description: 'Extract water from ocean, ice, or other source (free)'
  }
};

/**
 * Fuel processing rate
 */
const PROCESSING_RATE = {
  tonsPerHour: 10,  // 10 tons per hour with fuel processor
  requiresPowerPlant: true
};

// ==================== Fuel Status ====================

/**
 * Get current fuel status for a ship
 * @param {string} shipId - Ship ID
 * @returns {Object} Fuel status including amounts by type
 */
function getFuelStatus(shipId) {
  const ship = campaign.getShip(shipId);
  if (!ship) {
    throw new Error('Ship not found');
  }

  const state = ship.current_state || {};
  const shipData = ship.ship_data || {};

  // Default fuel is all refined if not tracked
  const fuelBreakdown = state.fuelBreakdown || {
    refined: state.fuel ?? shipData.fuel ?? 0,
    unrefined: 0,
    processed: 0
  };

  const totalFuel = fuelBreakdown.refined + fuelBreakdown.unrefined + fuelBreakdown.processed;
  const maxFuel = shipData.fuel?.capacity || shipData.fuel || 40;

  return {
    total: totalFuel,
    max: maxFuel,
    breakdown: fuelBreakdown,
    percentFull: Math.round((totalFuel / maxFuel) * 100),
    processing: state.fuelProcessing || null,  // Active processing job
    fuelProcessor: shipData.fuelProcessor !== false  // Default to true - most ships have processors
  };
}

/**
 * Get available refueling sources based on current location
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Available fuel sources
 */
function getAvailableSources(campaignId) {
  const campaignData = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaignData) {
    throw new Error('Campaign not found');
  }

  // For now, return all sources (location checking would need world data)
  // In a full implementation, check current_system against world data
  const sources = [];

  // AR-60: Add refined fuel first as default option (Class A/B starports)
  sources.push({
    ...FUEL_SOURCES.starportRefined,
    available: true
  });

  // Unrefined starport fuel (Class C/D/E)
  sources.push({
    ...FUEL_SOURCES.starportUnrefined,
    available: true
  });

  // Gas giant skimming (common in most systems)
  sources.push({
    ...FUEL_SOURCES.gasGiant,
    available: true
  });

  // Wilderness refueling
  sources.push({
    ...FUEL_SOURCES.wilderness,
    available: true
  });

  return sources;
}

// ==================== Refueling Operations ====================

/**
 * Check if ship can refuel from a specific source
 * @param {string} shipId - Ship ID
 * @param {string} sourceId - Fuel source ID
 * @param {number} tons - Amount to refuel
 * @returns {Object} { canRefuel, error, cost, time }
 */
function canRefuel(shipId, sourceId, tons) {
  const ship = campaign.getShip(shipId);
  if (!ship) {
    return { canRefuel: false, error: 'Ship not found' };
  }

  const source = FUEL_SOURCES[sourceId];
  if (!source) {
    return { canRefuel: false, error: 'Invalid fuel source' };
  }

  const fuelStatus = getFuelStatus(shipId);
  const spaceAvailable = fuelStatus.max - fuelStatus.total;

  if (tons <= 0) {
    return { canRefuel: false, error: 'Invalid fuel amount' };
  }

  if (tons > spaceAvailable) {
    return {
      canRefuel: false,
      error: `Only ${spaceAvailable} tons of fuel capacity available`,
      spaceAvailable
    };
  }

  // Calculate cost and time
  const cost = source.cost * tons;
  let timeHours = source.timeHours;

  // Scale time for wilderness/gas giant based on amount
  if (sourceId === 'wilderness') {
    timeHours = Math.ceil(tons / 10) * source.timeHours;
  } else if (sourceId === 'gasGiant') {
    timeHours = Math.ceil(tons / 20) * source.timeHours;
  }

  return {
    canRefuel: true,
    cost,
    timeHours,
    fuelType: source.fuelType,
    skillCheck: source.skillCheck
  };
}

/**
 * Execute refueling operation
 * @param {string} shipId - Ship ID
 * @param {string} campaignId - Campaign ID
 * @param {string} sourceId - Fuel source ID
 * @param {number} tons - Amount to refuel
 * @returns {Object} { success, fuelAdded, fuelType, cost, timeHours, newFuelStatus }
 */
function refuel(shipId, campaignId, sourceId, tons) {
  const check = canRefuel(shipId, sourceId, tons);
  if (!check.canRefuel) {
    return { success: false, error: check.error };
  }

  const ship = campaign.getShip(shipId);
  const source = FUEL_SOURCES[sourceId];
  const state = ship.current_state || {};

  // Get current fuel breakdown
  const fuelBreakdown = state.fuelBreakdown || {
    refined: state.fuel ?? ship.ship_data?.fuel ?? 0,
    unrefined: 0,
    processed: 0
  };

  // Add fuel of appropriate type
  fuelBreakdown[source.fuelType] += tons;

  // Update ship state
  const newTotal = fuelBreakdown.refined + fuelBreakdown.unrefined + fuelBreakdown.processed;
  campaign.updateShipState(shipId, {
    fuel: newTotal,
    fuelBreakdown
  });

  // Log the refueling
  campaign.addLogEntry(shipId, campaignId, {
    gameDate: getCampaignDate(campaignId),
    entryType: 'fuel',
    message: `Refueled ${tons} tons of ${source.fuelType} fuel from ${source.name}`,
    actor: 'System'
  });

  return {
    success: true,
    fuelAdded: tons,
    fuelType: source.fuelType,
    cost: check.cost,
    timeHours: check.timeHours,
    newFuelStatus: getFuelStatus(shipId)
  };
}

// ==================== Fuel Processing ====================

/**
 * Check if ship can process unrefined fuel
 * @param {string} shipId - Ship ID
 * @param {number} tons - Amount to process
 * @returns {Object} { canProcess, error, timeHours }
 */
function canProcessFuel(shipId, tons) {
  const ship = campaign.getShip(shipId);
  if (!ship) {
    return { canProcess: false, error: 'Ship not found' };
  }

  // Check if ship has fuel processor - default to true per user requirement
  // Most ships in Traveller have fuel processors; explicit false means it was removed
  const hasFuelProcessor = ship.ship_data?.fuelProcessor !== false;

  if (!hasFuelProcessor) {
    return { canProcess: false, error: 'Ship does not have a fuel processor' };
  }

  const fuelStatus = getFuelStatus(shipId);
  if (fuelStatus.breakdown.unrefined < tons) {
    return {
      canProcess: false,
      error: `Only ${fuelStatus.breakdown.unrefined} tons of unrefined fuel available`,
      available: fuelStatus.breakdown.unrefined
    };
  }

  // Check power plant status (would integrate with ship-systems.js in full impl)
  // For now, assume operational

  const timeHours = Math.ceil(tons / PROCESSING_RATE.tonsPerHour);

  return {
    canProcess: true,
    timeHours
  };
}

/**
 * Start fuel processing
 * @param {string} shipId - Ship ID
 * @param {string} campaignId - Campaign ID
 * @param {number} tons - Amount to process
 * @returns {Object} { success, timeHours, completionDate }
 */
function startFuelProcessing(shipId, campaignId, tons) {
  const check = canProcessFuel(shipId, tons);
  if (!check.canProcess) {
    return { success: false, error: check.error };
  }

  const currentDate = getCampaignDate(campaignId);
  const timeHours = check.timeHours;

  // Store processing job in ship state
  const ship = campaign.getShip(shipId);
  const state = ship.current_state || {};

  campaign.updateShipState(shipId, {
    fuelProcessing: {
      tons,
      startDate: currentDate,
      timeHours,
      hoursRemaining: timeHours
    }
  });

  // Log the start
  campaign.addLogEntry(shipId, campaignId, {
    gameDate: currentDate,
    entryType: 'fuel',
    message: `Started processing ${tons} tons of unrefined fuel (${timeHours} hours)`,
    actor: 'System'
  });

  return {
    success: true,
    timeHours,
    tons
  };
}

/**
 * Check and complete fuel processing
 * @param {string} shipId - Ship ID
 * @param {string} campaignId - Campaign ID
 * @returns {Object} { completed, tons, newFuelStatus }
 */
function checkFuelProcessing(shipId, campaignId) {
  const fuelStatus = getFuelStatus(shipId);

  if (!fuelStatus.processing) {
    return { completed: false, inProgress: false };
  }

  const currentDate = getCampaignDate(campaignId);
  const jump = require('./jump');
  const hoursElapsed = jump.hoursBetween(fuelStatus.processing.startDate, currentDate);
  const hoursRemaining = Math.max(0, fuelStatus.processing.timeHours - hoursElapsed);

  if (hoursRemaining > 0) {
    // Update remaining time
    const ship = campaign.getShip(shipId);
    const state = ship.current_state || {};
    campaign.updateShipState(shipId, {
      fuelProcessing: {
        ...state.fuelProcessing,
        hoursRemaining
      }
    });

    return {
      completed: false,
      inProgress: true,
      hoursRemaining,
      tons: fuelStatus.processing.tons
    };
  }

  // Processing complete - convert unrefined to processed
  const ship = campaign.getShip(shipId);
  const state = ship.current_state || {};
  const fuelBreakdown = state.fuelBreakdown || {
    refined: state.fuel ?? 0,
    unrefined: 0,
    processed: 0
  };

  const tons = fuelStatus.processing.tons;
  fuelBreakdown.unrefined -= tons;
  fuelBreakdown.processed += tons;

  campaign.updateShipState(shipId, {
    fuelBreakdown,
    fuelProcessing: null
  });

  // Log completion
  campaign.addLogEntry(shipId, campaignId, {
    gameDate: currentDate,
    entryType: 'fuel',
    message: `Fuel processing complete: ${tons} tons now ready for use`,
    actor: 'System'
  });

  return {
    completed: true,
    inProgress: false,
    tons,
    newFuelStatus: getFuelStatus(shipId)
  };
}

// ==================== Fuel Consumption ====================

/**
 * Consume fuel (prioritizes refined, then processed, then unrefined)
 * @param {string} shipId - Ship ID
 * @param {number} tons - Amount to consume
 * @returns {Object} { success, consumed, penalties }
 */
function consumeFuel(shipId, tons) {
  const ship = campaign.getShip(shipId);
  if (!ship) {
    return { success: false, error: 'Ship not found' };
  }

  const fuelStatus = getFuelStatus(shipId);
  if (fuelStatus.total < tons) {
    return {
      success: false,
      error: `Insufficient fuel: have ${fuelStatus.total}, need ${tons}`
    };
  }

  const breakdown = { ...fuelStatus.breakdown };
  let remaining = tons;
  let usedUnrefined = 0;

  // Consume in priority order: refined, processed, unrefined
  const refined = Math.min(breakdown.refined, remaining);
  breakdown.refined -= refined;
  remaining -= refined;

  if (remaining > 0) {
    const processed = Math.min(breakdown.processed, remaining);
    breakdown.processed -= processed;
    remaining -= processed;
  }

  if (remaining > 0) {
    usedUnrefined = Math.min(breakdown.unrefined, remaining);
    breakdown.unrefined -= usedUnrefined;
    remaining -= usedUnrefined;
  }

  // Update ship state
  const newTotal = breakdown.refined + breakdown.unrefined + breakdown.processed;
  campaign.updateShipState(shipId, {
    fuel: newTotal,
    fuelBreakdown: breakdown
  });

  // Determine if penalties apply (any unrefined used)
  const penalties = usedUnrefined > 0 ? {
    dmModifier: FUEL_TYPES.unrefined.dmModifier,
    misjumpRisk: FUEL_TYPES.unrefined.misjumpRisk,
    usedUnrefined
  } : null;

  return {
    success: true,
    consumed: tons,
    penalties,
    newFuelStatus: getFuelStatus(shipId)
  };
}

/**
 * Get jump fuel penalties based on current fuel composition
 * @param {string} shipId - Ship ID
 * @param {number} fuelNeeded - Fuel required for jump
 * @returns {Object} { hasUnrefined, dmModifier, misjumpRisk }
 */
function getJumpFuelPenalties(shipId, fuelNeeded) {
  const fuelStatus = getFuelStatus(shipId);
  const breakdown = fuelStatus.breakdown;

  // Calculate how much unrefined would be used
  const goodFuel = breakdown.refined + breakdown.processed;
  const unrefinedNeeded = Math.max(0, fuelNeeded - goodFuel);

  if (unrefinedNeeded > 0) {
    return {
      hasUnrefined: true,
      unrefinedAmount: unrefinedNeeded,
      dmModifier: FUEL_TYPES.unrefined.dmModifier,
      misjumpRisk: FUEL_TYPES.unrefined.misjumpRisk
    };
  }

  return {
    hasUnrefined: false,
    dmModifier: 0,
    misjumpRisk: 0
  };
}

// ==================== Helpers ====================

function getCampaignDate(campaignId) {
  const campaignData = db.prepare('SELECT current_date FROM campaigns WHERE id = ?').get(campaignId);
  return campaignData?.current_date || '1105-001 00:00';
}

// ==================== Exports ====================

module.exports = {
  // Constants
  FUEL_TYPES,
  FUEL_SOURCES,
  PROCESSING_RATE,

  // Status
  getFuelStatus,
  getAvailableSources,

  // Refueling
  canRefuel,
  refuel,

  // Processing
  canProcessFuel,
  startFuelProcessing,
  checkFuelProcessing,

  // Consumption
  consumeFuel,
  getJumpFuelPenalties
};
