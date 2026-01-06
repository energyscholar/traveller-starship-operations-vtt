/**
 * Jump Travel Module
 * Manages jump initiation, in-jump state, and arrival for Operations mode
 */

const { getShip, updateShipState } = require('./campaign');
const { getCampaign, updateCampaign } = require('./accounts');
const { calculateJumpFuel } = require('../ship-jump-drive');
const starSystems = require('./star-system-loader'); // AR-168: For hex lookup

// Jump duration is always 168 hours (7 days) in Traveller
const JUMP_DURATION_HOURS = 168;

/**
 * AR-298: Parse formatted destination to extract system name
 * Format: "SystemName (Sector Hex)" e.g., "Gulistan (Deneb 0124)"
 * @param {string} destination - Possibly formatted destination string
 * @returns {string} Just the system name
 */
function parseSystemName(destination) {
  if (!destination) return destination;
  // Match: "Name (Sector Hex)" pattern
  const match = destination.match(/^(.+?)\s*\([^)]+\s+\d{4}\)$/);
  return match ? match[1].trim() : destination;
}

// AR-36: No-fuel mode for testing (can be set per-campaign)
let noFuelMode = false;

/**
 * Toggle no-fuel mode for testing
 * @param {boolean} enabled - Whether to disable fuel consumption
 */
function setNoFuelMode(enabled) {
  noFuelMode = enabled;
  console.log(`[Jump] No-fuel mode: ${enabled ? 'ENABLED' : 'disabled'}`);
}

/**
 * Get current no-fuel mode state
 * @returns {boolean}
 */
function getNoFuelMode() {
  return noFuelMode;
}

/**
 * Parse Imperial date string to components
 * Format: YYYY-DDD HH:MM
 * @param {string} dateStr - Date string
 * @returns {Object} { year, day, hours, minutes }
 */
function parseDate(dateStr) {
  const [datePart, timePart] = dateStr.split(' ');
  const [year, day] = datePart.split('-').map(Number);
  const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
  return { year, day, hours, minutes };
}

/**
 * Format date components to Imperial date string
 * @param {number} year
 * @param {number} day
 * @param {number} hours
 * @param {number} minutes
 * @returns {string} Formatted date
 */
function formatDate(year, day, hours, minutes) {
  return `${year}-${String(day).padStart(3, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Advance a date by hours and minutes
 * Handles day and year rollover
 * @param {string} dateStr - Starting date
 * @param {number} hours - Hours to add
 * @param {number} minutes - Minutes to add
 * @returns {string} New date string
 */
function advanceDate(dateStr, hours, minutes = 0) {
  const date = parseDate(dateStr);

  let newMinutes = date.minutes + minutes;
  let newHours = date.hours + hours + Math.floor(newMinutes / 60);
  newMinutes = newMinutes % 60;

  let newDay = date.day + Math.floor(newHours / 24);
  newHours = newHours % 24;

  let newYear = date.year + Math.floor((newDay - 1) / 365);
  newDay = ((newDay - 1) % 365) + 1;

  return formatDate(newYear, newDay, newHours, newMinutes);
}

/**
 * Calculate hours between two dates
 * @param {string} startDate
 * @param {string} endDate
 * @returns {number} Hours difference
 */
function hoursBetween(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  // Convert to total hours since year 0
  const startTotal = (start.year * 365 * 24) + ((start.day - 1) * 24) + start.hours;
  const endTotal = (end.year * 365 * 24) + ((end.day - 1) * 24) + end.hours;

  return endTotal - startTotal;
}

/**
 * Check if a ship can initiate jump
 * @param {string} shipId - Ship ID
 * @param {number} distance - Jump distance in parsecs
 * @returns {Object} { canJump, error, fuelNeeded, fuelAvailable }
 */
function canInitiateJump(shipId, distance) {
  const ship = getShip(shipId);
  if (!ship) {
    return { canJump: false, error: 'Ship not found' };
  }

  // Check if already in jump
  if (ship.current_state?.jump?.inJump) {
    return { canJump: false, error: 'Already in jump space' };
  }

  // Check jump drive (any j-drive damage disables jump)
  const crits = ship.current_state?.crits;
  if (crits?.jDrive?.some(c => !c.repaired)) {
    return { canJump: false, error: 'Jump drive damaged' };
  }

  // Get ship specs
  // AR-289 FIX: Use tonnage field, not hull (which is an object with hullPoints)
  const hullTonnage = ship.ship_data?.tonnage || ship.template_data?.tonnage || 100;
  const maxJumpRating = ship.ship_data?.jump || ship.ship_data?.jumpRating || ship.template_data?.jumpRating || 2;

  // Check distance doesn't exceed jump rating
  if (distance > maxJumpRating) {
    return {
      canJump: false,
      error: `Jump-${distance} exceeds ship's Jump-${maxJumpRating} capability`
    };
  }

  // Calculate fuel needed
  const fuelNeeded = calculateJumpFuel(hullTonnage, distance);
  const fuelAvailable = ship.current_state?.fuel ?? ship.ship_data?.fuel ?? ship.template_data?.fuel ?? 40;

  // AR-36: Skip fuel check in no-fuel mode
  if (!noFuelMode && fuelAvailable < fuelNeeded) {
    return {
      canJump: false,
      error: `Insufficient fuel: need ${fuelNeeded} tons, have ${fuelAvailable} tons`,
      fuelNeeded,
      fuelAvailable
    };
  }

  return {
    canJump: true,
    fuelNeeded: noFuelMode ? 0 : fuelNeeded,
    fuelAvailable,
    jumpRating: maxJumpRating,
    noFuelMode
  };
}

/**
 * Initiate jump for a ship
 * @param {string} shipId - Ship ID
 * @param {string} campaignId - Campaign ID
 * @param {string} destination - Destination system name
 * @param {number} distance - Jump distance in parsecs (1-6)
 * @param {string} destinationHex - AR-168: Destination hex (sector coordinates) for UID lookup
 * @param {string} destinationSector - AR-168: Destination sector for UID lookup
 * @returns {Object} Result with jumpEndDate
 */
function initiateJump(shipId, campaignId, destination, distance, destinationHex = null, destinationSector = null) {
  // Validate
  const check = canInitiateJump(shipId, distance);
  if (!check.canJump) {
    return { success: false, error: check.error };
  }

  const ship = getShip(shipId);
  const campaign = getCampaign(campaignId);

  // Calculate jump end date (168 hours later)
  const jumpEndDate = advanceDate(campaign.current_date, JUMP_DURATION_HOURS, 0);

  // Get current fuel and breakdown
  const state = ship.current_state || {};
  const fuelBreakdown = state.fuelBreakdown ? { ...state.fuelBreakdown } : {
    refined: state.fuel ?? ship.ship_data?.fuel ?? ship.template_data?.fuel ?? 40,
    unrefined: 0,
    processed: 0
  };

  // Consume fuel from breakdown (prefer refined, then processed, then unrefined)
  let fuelToConsume = check.fuelNeeded;
  const consumeOrder = ['refined', 'processed', 'unrefined'];
  for (const type of consumeOrder) {
    if (fuelToConsume <= 0) break;
    const available = fuelBreakdown[type] || 0;
    const consume = Math.min(available, fuelToConsume);
    fuelBreakdown[type] = available - consume;
    fuelToConsume -= consume;
  }

  const newFuel = fuelBreakdown.refined + fuelBreakdown.unrefined + fuelBreakdown.processed;

  // Update ship state - store hex/sector for reliable lookup on completion
  updateShipState(shipId, {
    jump: {
      inJump: true,
      jumpStartDate: campaign.current_date,
      jumpEndDate,
      destination,
      destinationHex,
      destinationSector,
      jumpDistance: distance,
      fuelConsumed: check.fuelNeeded
    },
    fuel: newFuel,
    fuelBreakdown
  });

  return {
    success: true,
    jumpStartDate: campaign.current_date,
    jumpEndDate,
    destination,
    distance,
    fuelConsumed: check.fuelNeeded,
    fuelRemaining: newFuel
  };
}

/**
 * Complete jump and update location
 * @param {string} shipId - Ship ID
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Result
 */
function completeJump(shipId, campaignId) {
  const ship = getShip(shipId);
  if (!ship) {
    return { success: false, error: 'Ship not found' };
  }

  const jump = ship.current_state?.jump;
  if (!jump?.inJump) {
    return { success: false, error: 'Ship is not in jump space' };
  }

  const destination = jump.destination;
  const destinationHex = jump.destinationHex;
  const destinationSector = jump.destinationSector;

  // Use stored hex/sector first (UID), fallback to system lookup
  let resolvedHex = destinationHex;
  let resolvedSector = destinationSector || 'Spinward Marches';

  // If hex stored, use getSystemByHex for reliable lookup
  if (destinationHex) {
    const destSystem = starSystems.getSystemByHex(destinationHex);
    if (destSystem) {
      resolvedHex = destSystem.hex;
      resolvedSector = destSystem.sector || resolvedSector;
    }
  } else {
    // Fallback: try name lookup (less reliable)
    const destSystem = starSystems.getSystemByName(destination);
    if (destSystem) {
      resolvedHex = destSystem.hex;
      resolvedSector = destSystem.sector || 'Spinward Marches';
    }
  }

  // AR-298: Parse destination to get clean system name (remove sector/hex suffix)
  const systemName = parseSystemName(destination);
  const updates = { current_system: systemName };
  if (resolvedHex) {
    updates.current_hex = resolvedHex;
    updates.current_sector = resolvedSector;
  }
  updateCampaign(campaignId, updates);

  // Clear jump state and update location
  updateShipState(shipId, {
    jump: {
      inJump: false,
      lastArrival: destination,
      lastArrivalDate: new Date().toISOString()
    },
    // Update ship's systemHex so travel/refuel lookups work
    systemHex: resolvedHex,
    systemName: destination,
    // AR-124: Default to jump point after arrival
    locationId: 'jump_point',
    locationName: 'Jump Point',
    positionVerified: false  // AR-68: Astrogator must verify position before pilot can navigate
  });

  return {
    success: true,
    arrivedAt: destination,
    // AR-168: Include resolved hex/sector for client
    hex: resolvedHex,
    sector: resolvedSector,
    message: `Arrived at ${destination}`
  };
}

/**
 * Get jump status for a ship
 * @param {string} shipId - Ship ID
 * @param {string} currentDate - Current campaign date
 * @returns {Object} Jump status
 */
function getJumpStatus(shipId, currentDate) {
  const ship = getShip(shipId);
  if (!ship) {
    return { inJump: false };
  }

  const jump = ship.current_state?.jump;
  if (!jump?.inJump) {
    return {
      inJump: false,
      lastArrival: jump?.lastArrival,
      lastArrivalDate: jump?.lastArrivalDate
    };
  }

  // Calculate time remaining
  const hoursRemaining = hoursBetween(currentDate, jump.jumpEndDate);
  const canExit = hoursRemaining <= 0;

  return {
    inJump: true,
    jumpStartDate: jump.jumpStartDate,
    jumpEndDate: jump.jumpEndDate,
    destination: jump.destination,
    jumpDistance: jump.jumpDistance,
    hoursRemaining: Math.max(0, hoursRemaining),
    canExit
  };
}

/**
 * Check if any ships need to exit jump after time advance
 * @param {string} campaignId - Campaign ID
 * @param {string} newDate - New campaign date after time advance
 * @returns {Array} Ships that can now exit jump
 */
function checkJumpExits(campaignId, newDate) {
  const { getShipsByCampaign } = require('./campaign');
  const ships = getShipsByCampaign(campaignId);
  const readyToExit = [];

  for (const ship of ships) {
    const status = getJumpStatus(ship.id, newDate);
    if (status.inJump && status.canExit) {
      readyToExit.push({
        shipId: ship.id,
        shipName: ship.name,
        destination: status.destination
      });
    }
  }

  return readyToExit;
}

module.exports = {
  JUMP_DURATION_HOURS,
  parseDate,
  formatDate,
  advanceDate,
  hoursBetween,
  canInitiateJump,
  initiateJump,
  completeJump,
  getJumpStatus,
  checkJumpExits,
  // AR-36: No-fuel mode for testing
  setNoFuelMode,
  getNoFuelMode
};
