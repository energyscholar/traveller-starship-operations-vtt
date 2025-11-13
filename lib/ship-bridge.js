// ======== BRIDGE CALCULATIONS MODULE ========
// Based on Mongoose Traveller 2E High Guard 2022 Update
// Page 19 (High Guard) - Bridge specifications

/**
 * Calculate bridge tonnage based on hull size
 * Formula from High Guard page 19
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {string} bridgeType - Bridge type (standard, cockpit, dual_cockpit, command_bridge)
 * @returns {number} Bridge tonnage
 */
function calculateBridgeTonnage(hullTonnage, bridgeType = 'standard') {
  // Cockpits only for ships 50 tons or less
  if (bridgeType === 'cockpit') {
    if (hullTonnage > 50) {
      throw new Error('Cockpit only available for ships 50 tons or less');
    }
    return 1.5;
  }

  if (bridgeType === 'dual_cockpit') {
    if (hullTonnage > 50) {
      throw new Error('Dual cockpit only available for ships 50 tons or less');
    }
    return 2.5;
  }

  // Standard bridge sizing by hull
  let baseTonnage;
  if (hullTonnage <= 50) baseTonnage = 3;
  else if (hullTonnage <= 99) baseTonnage = 6;
  else if (hullTonnage <= 200) baseTonnage = 10;
  else if (hullTonnage <= 1000) baseTonnage = 20;
  else if (hullTonnage <= 2000) baseTonnage = 40;
  else if (hullTonnage <= 100000) baseTonnage = 60;
  else {
    // 100,001+: 60t + 20t per additional 100,000t
    const additionalHundredK = Math.ceil((hullTonnage - 100000) / 100000);
    baseTonnage = 60 + (additionalHundredK * 20);
  }

  // Command bridge adds 40 tons (for 5,000+ ton ships)
  if (bridgeType === 'command_bridge') {
    if (hullTonnage < 5000) {
      throw new Error('Command bridge only available for ships 5,000 tons or larger');
    }
    return baseTonnage + 40;
  }

  return baseTonnage;
}

/**
 * Calculate bridge cost
 * Formula: MCr 0.5 per 100 tons of hull (command bridge adds MCr 30)
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {string} bridgeType - Bridge type
 * @returns {number} Cost in credits
 */
function calculateBridgeCost(hullTonnage, bridgeType = 'standard') {
  // Cockpits have fixed costs
  if (bridgeType === 'cockpit') return 10000;
  if (bridgeType === 'dual_cockpit') return 15000;

  // Standard bridge: MCr 0.5 per 100t hull
  const baseCost = (hullTonnage / 100) * 0.5 * 1000000;

  // Command bridge adds MCr 30
  if (bridgeType === 'command_bridge') {
    return baseCost + (30 * 1000000);
  }

  return baseCost;
}

/**
 * Validate bridge configuration
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {string} bridgeType - Bridge type
 * @param {number} availableTonnage - Available tonnage for installation (optional)
 * @returns {Object} {valid: boolean, errors: Array, warnings: Array, stats: Object}
 */
function validateBridge(hullTonnage, bridgeType = 'standard', availableTonnage = null) {
  const errors = [];
  const warnings = [];

  const validTypes = ['standard', 'cockpit', 'dual_cockpit', 'command_bridge'];
  if (!validTypes.includes(bridgeType)) {
    errors.push(`Invalid bridge type: ${bridgeType}`);
    return { valid: false, errors, warnings, stats: {} };
  }

  let tonnage, cost;
  try {
    tonnage = calculateBridgeTonnage(hullTonnage, bridgeType);
    cost = calculateBridgeCost(hullTonnage, bridgeType);
  } catch (error) {
    errors.push(error.message);
    return { valid: false, errors, warnings, stats: {} };
  }

  // Check tonnage availability
  if (availableTonnage !== null && tonnage > availableTonnage) {
    errors.push(`${bridgeType} bridge requires ${tonnage}t, only ${availableTonnage}t available`);
  }

  // Warnings
  if (bridgeType === 'cockpit' || bridgeType === 'dual_cockpit') {
    warnings.push('Cockpits not designed for long-term use (24 hours maximum)');
  }

  if (hullTonnage <= 99 && bridgeType === 'standard') {
    warnings.push('Smaller bridge gives DM-1 to all spacecraft operations checks');
  }

  if (bridgeType === 'command_bridge') {
    warnings.push('Command bridge provides enhanced coordination for large vessels');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      tonnage,
      cost,
      minimumTL: 8
    }
  };
}

/**
 * Get recommended bridge type for hull size
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @returns {string} Recommended bridge type
 */
function getRecommendedBridgeType(hullTonnage) {
  if (hullTonnage <= 50) return 'cockpit';
  if (hullTonnage >= 5000) return 'command_bridge';
  return 'standard';
}

// ======== EXPORTS ========

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateBridgeTonnage,
    calculateBridgeCost,
    validateBridge,
    getRecommendedBridgeType
  };
}

if (typeof window !== 'undefined') {
  window.Bridge = {
    calculateBridgeTonnage,
    calculateBridgeCost,
    validateBridge,
    getRecommendedBridgeType
  };
}
