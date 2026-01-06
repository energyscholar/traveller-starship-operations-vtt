/**
 * AR-264: Camera Composition Utilities
 * Scoring functions for evaluating cinematic camera positions
 *
 * Core scoring factors:
 * - Target visibility (required)
 * - Fill factor (30-70% optimal)
 * - Context objects visible
 * - Rule of thirds bonus
 * - Depth layers
 * - Clutter penalty
 * - Star visible bonus
 */

// Scoring weights (tunable)
const CAMERA_WEIGHTS = {
  targetVisible: 100,      // MUST have target in frame
  fillFactor: 50,          // Optimal screen fill
  contextObjects: 10,      // Per visible context object
  ruleOfThirds: 20,        // Off-center bonus
  depthLayers: 15,         // Foreground/background
  clutter: -25,            // Per overlapping object
  starVisible: 20,         // Lighting/orientation
  motionHint: 15,          // For journeys: destination visible
};

/**
 * Bell curve function for optimal ranges
 * Returns 1.0 at center, falls off toward edges
 * @param {number} value - Input value
 * @param {number} center - Optimal center value
 * @param {number} width - Width of bell curve (stddev-like)
 * @returns {number} 0-1 score
 */
function bellCurve(value, center, width) {
  const diff = (value - center) / width;
  return Math.exp(-0.5 * diff * diff);
}

/**
 * Calculate fill factor - how much of frame target occupies
 * @param {number} zoom - Current zoom level
 * @param {number} objectRadiusAU - Object radius in AU
 * @param {Object} canvasSize - { width, height }
 * @returns {number} 0-1 fill factor
 */
function calculateFillFactor(zoom, objectRadiusAU, canvasSize) {
  // Convert to pixels at current zoom
  const AU_TO_PIXELS = 100; // Base pixels per AU
  const radiusPixels = objectRadiusAU * AU_TO_PIXELS * zoom;
  const minDimension = Math.min(canvasSize.width, canvasSize.height);

  // Fill factor is diameter vs canvas size
  const diameter = radiusPixels * 2;
  return Math.min(1, diameter / minDimension);
}

/**
 * Score fill factor - optimal is 30-70%, peak at 50%
 * @param {number} fillFactor - 0-1 fill factor
 * @returns {number} 0-1 score
 */
function scoreFillFactor(fillFactor) {
  // Optimal fill is 50%, with acceptable range 30-70%
  return bellCurve(fillFactor, 0.5, 0.2);
}

/**
 * Calculate rule of thirds position offset
 * Returns offset from center for compositional interest
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {string} quadrant - 'tl' | 'tr' | 'bl' | 'br' for corners
 * @returns {Object} { offsetX, offsetY } in pixels
 */
function ruleOfThirdsPosition(canvasWidth, canvasHeight, quadrant = 'random') {
  // Rule of thirds puts subjects at 1/3 or 2/3 points
  // Subtle version uses 10-15% offset (0.35-0.40 and 0.60-0.65)
  const offsetFraction = 0.12; // 12% from center = ~35% from edge

  const offsets = {
    tl: { x: -offsetFraction, y: -offsetFraction },
    tr: { x: offsetFraction, y: -offsetFraction },
    bl: { x: -offsetFraction, y: offsetFraction },
    br: { x: offsetFraction, y: offsetFraction }
  };

  if (quadrant === 'random') {
    const keys = Object.keys(offsets);
    quadrant = keys[Math.floor(Math.random() * keys.length)];
  }

  const offset = offsets[quadrant] || offsets.br;
  return {
    offsetX: canvasWidth * offset.x,
    offsetY: canvasHeight * offset.y
  };
}

/**
 * Score rule of thirds positioning
 * Higher score for subjects away from dead center
 * @param {Object} targetScreenPos - { x, y } screen position
 * @param {Object} canvasSize - { width, height }
 * @returns {number} 0-1 score
 */
function scoreRuleOfThirds(targetScreenPos, canvasSize) {
  const centerX = canvasSize.width / 2;
  const centerY = canvasSize.height / 2;

  // Distance from center as fraction of canvas
  const dx = Math.abs(targetScreenPos.x - centerX) / canvasSize.width;
  const dy = Math.abs(targetScreenPos.y - centerY) / canvasSize.height;

  // Optimal is 10-15% from center
  const distance = Math.sqrt(dx * dx + dy * dy);
  return bellCurve(distance, 0.12, 0.08);
}

/**
 * Get visible objects at camera position
 * @param {Object} cameraPos - { x, y, zoom } camera position
 * @param {Array} allObjects - All celestial objects
 * @param {Object} canvasSize - { width, height }
 * @returns {Array} Visible objects
 */
function getVisibleObjects(cameraPos, allObjects, canvasSize) {
  const AU_TO_PIXELS = 100;
  const visible = [];

  for (const obj of allObjects) {
    const objX = obj.orbitAU || 0;
    const objY = 0; // Simplified 2D
    const screenX = (objX - cameraPos.x) * AU_TO_PIXELS * cameraPos.zoom + canvasSize.width / 2;
    const screenY = (objY - cameraPos.y) * AU_TO_PIXELS * cameraPos.zoom + canvasSize.height / 2;

    // Check if on screen with margin
    const margin = 50;
    if (screenX > -margin && screenX < canvasSize.width + margin &&
        screenY > -margin && screenY < canvasSize.height + margin) {
      visible.push({ ...obj, screenX, screenY });
    }
  }

  return visible;
}

/**
 * Check for depth separation between objects
 * Good composition has foreground/background layers
 * @param {Array} visibleObjects - Objects with screen positions
 * @returns {number} 0-1 depth score
 */
function hasDepthSeparation(visibleObjects) {
  if (visibleObjects.length < 2) return 0;

  // Check for variation in apparent size (proxy for depth)
  const sizes = visibleObjects.map(o => o.radiusKm || 1000);
  const maxSize = Math.max(...sizes);
  const minSize = Math.min(...sizes);

  // Good depth if size ratio > 10:1
  const ratio = maxSize / minSize;
  return Math.min(1, Math.log10(ratio) / 2);
}

/**
 * Calculate visual clutter - overlapping objects are bad
 * @param {Array} visibleObjects - Objects with screen positions
 * @param {number} minSeparation - Minimum pixels between objects
 * @returns {number} Number of overlapping pairs
 */
function calculateClutter(visibleObjects, minSeparation = 30) {
  let overlaps = 0;

  for (let i = 0; i < visibleObjects.length; i++) {
    for (let j = i + 1; j < visibleObjects.length; j++) {
      const dx = visibleObjects[i].screenX - visibleObjects[j].screenX;
      const dy = visibleObjects[i].screenY - visibleObjects[j].screenY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minSeparation) {
        overlaps++;
      }
    }
  }

  return overlaps;
}

/**
 * Check if star is visible (good for orientation/lighting)
 * @param {Object} cameraPos - Camera position
 * @param {Object} starPos - Star position (usually 0,0)
 * @param {Object} canvasSize - Canvas dimensions
 * @returns {boolean} True if star visible
 */
function isStarVisible(cameraPos, starPos, canvasSize) {
  const AU_TO_PIXELS = 100;
  const screenX = (starPos.x - cameraPos.x) * AU_TO_PIXELS * cameraPos.zoom + canvasSize.width / 2;
  const screenY = (starPos.y - cameraPos.y) * AU_TO_PIXELS * cameraPos.zoom + canvasSize.height / 2;

  return screenX > 0 && screenX < canvasSize.width &&
         screenY > 0 && screenY < canvasSize.height;
}

/**
 * Calculate complete camera score
 * @param {Object} cameraPos - { x, y, zoom }
 * @param {Object} target - Target object
 * @param {Object} context - { star, bodies, canvasSize }
 * @returns {number} Total score
 */
function scoreCameraPosition(cameraPos, target, context) {
  const { star, bodies, canvasSize } = context;
  let score = 0;

  // 1. Target visibility (REQUIRED)
  const targetInFrame = isTargetVisible(cameraPos, target, canvasSize);
  if (!targetInFrame) return -1000; // Instant disqualify
  score += CAMERA_WEIGHTS.targetVisible;

  // 2. Fill factor
  const targetRadius = (target.radiusKm || 6000) / 149597870.7; // km to AU
  const fillFactor = calculateFillFactor(cameraPos.zoom, targetRadius, canvasSize);
  score += scoreFillFactor(fillFactor) * CAMERA_WEIGHTS.fillFactor;

  // 3. Context objects visible
  const visibleObjects = getVisibleObjects(cameraPos, bodies, canvasSize);
  score += Math.min(5, visibleObjects.length) * CAMERA_WEIGHTS.contextObjects;

  // 4. Rule of thirds
  const AU_TO_PIXELS = 100;
  const targetScreenX = ((target.orbitAU || 0) - cameraPos.x) * AU_TO_PIXELS * cameraPos.zoom + canvasSize.width / 2;
  const targetScreenY = -cameraPos.y * AU_TO_PIXELS * cameraPos.zoom + canvasSize.height / 2;
  score += scoreRuleOfThirds({ x: targetScreenX, y: targetScreenY }, canvasSize) * CAMERA_WEIGHTS.ruleOfThirds;

  // 5. Depth layers
  score += hasDepthSeparation(visibleObjects) * CAMERA_WEIGHTS.depthLayers;

  // 6. Clutter penalty
  score += calculateClutter(visibleObjects) * CAMERA_WEIGHTS.clutter;

  // 7. Star visible bonus
  if (isStarVisible(cameraPos, star || { x: 0, y: 0 }, canvasSize)) {
    score += CAMERA_WEIGHTS.starVisible;
  }

  return score;
}

/**
 * Check if target is visible at camera position
 */
function isTargetVisible(cameraPos, target, canvasSize) {
  const AU_TO_PIXELS = 100;
  const targetX = target.orbitAU || 0;
  const targetY = 0;
  const screenX = (targetX - cameraPos.x) * AU_TO_PIXELS * cameraPos.zoom + canvasSize.width / 2;
  const screenY = (targetY - cameraPos.y) * AU_TO_PIXELS * cameraPos.zoom + canvasSize.height / 2;

  const margin = 100;
  return screenX > margin && screenX < canvasSize.width - margin &&
         screenY > margin && screenY < canvasSize.height - margin;
}

module.exports = {
  // Weights
  CAMERA_WEIGHTS,

  // Utility functions
  bellCurve,
  calculateFillFactor,
  scoreFillFactor,
  ruleOfThirdsPosition,
  scoreRuleOfThirds,
  getVisibleObjects,
  hasDepthSeparation,
  calculateClutter,
  isStarVisible,
  isTargetVisible,

  // Main scoring function
  scoreCameraPosition
};
