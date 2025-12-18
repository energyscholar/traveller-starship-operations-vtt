/**
 * AR-98: Roll Results Broadcast
 * AR-186: GM Roll Modifier support
 * Broadcasts dice roll results to the bridge chat
 */

// GM modifier store by campaignId
const gmModifiers = {};

/**
 * Set GM modifier for a campaign
 */
function setGmModifier(campaignId, dm, reason, persistent) {
  gmModifiers[campaignId] = { dm, reason, persistent };
}

/**
 * Get GM modifier for a campaign
 */
function getGmModifier(campaignId) {
  return gmModifiers[campaignId] || null;
}

/**
 * Clear GM modifier for a campaign
 */
function clearGmModifier(campaignId) {
  delete gmModifiers[campaignId];
}

/**
 * Broadcast a roll result to the bridge chat
 * @param {Object} io - Socket.IO server instance
 * @param {string} campaignId - Campaign ID to broadcast to
 * @param {Object} rollData - Roll information
 * @param {string} rollData.roller - Name of the person/station making the roll
 * @param {string} rollData.action - What the roll is for (e.g., "Sensor Scan", "Attack")
 * @param {number[]} rollData.dice - Array of dice values
 * @param {number} rollData.total - Sum of dice
 * @param {number} rollData.modifier - Total modifiers applied
 * @param {number} rollData.result - Final result (total + modifier)
 * @param {number} rollData.target - Target number to beat
 * @param {boolean} rollData.success - Whether the roll succeeded
 * @param {string} [rollData.details] - Optional additional details
 */
function broadcastRollResult(io, campaignId, rollData) {
  if (!io || !campaignId) return;

  const { roller, action, dice, total, modifier, result, target, success, details } = rollData;

  // Check for GM modifier
  const gmMod = getGmModifier(campaignId);
  const gmDm = gmMod ? gmMod.dm : 0;
  const adjustedResult = result + gmDm;
  const adjustedSuccess = adjustedResult >= target;

  // Clear non-persistent modifier after use
  if (gmMod && !gmMod.persistent) {
    clearGmModifier(campaignId);
  }

  // Format dice display: [3, 4] -> "3+4"
  const diceDisplay = dice.join('+');
  const modifierDisplay = modifier >= 0 ? `+${modifier}` : `${modifier}`;
  const gmModDisplay = gmMod ? (gmDm >= 0 ? `+${gmDm}` : `${gmDm}`) + (gmMod.reason ? `(${gmMod.reason})` : '') : '';
  const successText = adjustedSuccess ? '✓ Success' : '✗ Fail';
  const effect = adjustedResult - target;
  const effectDisplay = effect >= 0 ? `+${effect}` : `${effect}`;

  // Build message: "Sensor Scan: 2D6(3+4)+3-2(volcanic ash) = 8 vs 8 ✓ Success (Effect +0)"
  let message = `🎲 ${action}: 2D6(${diceDisplay})${modifierDisplay}${gmModDisplay} = ${adjustedResult} vs ${target} ${successText} (Effect ${effectDisplay})`;
  if (details) {
    message += ` - ${details}`;
  }

  const transmission = {
    id: `roll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'roll',
    channel: 'bridge',
    fromName: roller,
    message: message,
    timestamp: new Date().toISOString(),
    rollData: {
      dice,
      total,
      modifier,
      gmModifier: gmMod,
      result: adjustedResult,
      target,
      success: adjustedSuccess,
      effect
    }
  };

  io.to(`campaign:${campaignId}`).emit('comms:newTransmission', transmission);
}

module.exports = { broadcastRollResult, setGmModifier, getGmModifier, clearGmModifier };
