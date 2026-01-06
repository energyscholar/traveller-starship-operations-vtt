/**
 * AR-264: Cinematic Camera Generator
 *
 * Generates aesthetically pleasing camera views using scoring algorithm.
 * Evaluates multiple candidate positions and selects the best one.
 *
 * Features:
 * - Contextual awareness (nearby objects for composition)
 * - Dynamic generation (good views for arbitrary positions)
 * - Journey visualization (camera choreography for travel)
 * - Artistic framing (rule of thirds, depth, etc.)
 */

const {
  scoreCameraPosition,
  ruleOfThirdsPosition,
  CAMERA_WEIGHTS
} = require('./composition-utils');

// View types for different situations
const VIEW_TYPES = {
  ESTABLISHING: 'establishing',  // Wide, shows system context
  APPROACH: 'approach',          // Moving toward target
  ARRIVAL: 'arrival',            // Reached destination, target fills 50%
  DETAIL: 'detail',              // Examining station/ship, target fills 70%
  DEPARTURE: 'departure',        // Leaving location
  JOURNEY: 'journey'             // In-transit, sense of motion
};

/**
 * Cinematic Camera Generator
 */
class CinematicCamera {
  /**
   * @param {Object} systemData - System data with star and bodies
   */
  constructor(systemData) {
    this.star = systemData.star || { x: 0, y: 0, name: 'Star' };
    this.bodies = systemData.bodies || systemData.celestialObjects || [];
    this.places = systemData.places || systemData.locations || [];
  }

  /**
   * Find a body or place by ID
   * @param {string} targetId - Target ID
   * @returns {Object|null} Found object or null
   */
  findBody(targetId) {
    const body = this.bodies.find(b => b.id === targetId);
    if (body) return body;

    const place = this.places.find(p => p.id === targetId);
    if (place) {
      // For places, get linked body position
      if (place.linkedTo) {
        const linkedBody = this.bodies.find(b => b.id === place.linkedTo);
        if (linkedBody) {
          return {
            ...place,
            orbitAU: linkedBody.orbitAU,
            radiusKm: place.radiusKm || 50 // Stations are small
          };
        }
      }
    }

    return null;
  }

  /**
   * Gather context around a target for composition
   * @param {Object} target - Target object
   * @param {number} rangeAU - Range to consider (default 5 AU)
   * @returns {Object} Context data
   */
  gatherContext(target, rangeAU = 5) {
    const targetOrbit = target.orbitAU || 0;
    const nearbyBodies = this.bodies.filter(b => {
      const dist = Math.abs((b.orbitAU || 0) - targetOrbit);
      return dist <= rangeAU && b.id !== target.id;
    });

    return {
      star: this.star,
      bodies: [target, ...nearbyBodies],
      targetOrbit,
      innerBodies: nearbyBodies.filter(b => (b.orbitAU || 0) < targetOrbit),
      outerBodies: nearbyBodies.filter(b => (b.orbitAU || 0) > targetOrbit)
    };
  }

  /**
   * Generate candidate camera positions
   * @param {Object} target - Target object
   * @param {Object} context - Context from gatherContext
   * @param {Object} options - Generation options
   * @returns {Array} Array of candidate positions
   */
  generateCandidates(target, context, options = {}) {
    const targetX = target.orbitAU || 0;
    const targetY = 0;
    const targetRadius = (target.radiusKm || 6000) / 149597870.7; // km to AU

    const candidates = [];
    const { viewType = 'auto' } = options;

    // Base zoom to fit target at 50%
    const baseZoom = 0.5 / (targetRadius * 100 * 2 / 400);

    // 1. Direct center view
    candidates.push({
      x: targetX,
      y: targetY,
      zoom: baseZoom,
      type: 'direct'
    });

    // 2. Rule of thirds positions (4 corners)
    const offsetFraction = 0.12;
    const quadrants = ['tl', 'tr', 'bl', 'br'];
    for (const q of quadrants) {
      const offset = {
        tl: { x: offsetFraction, y: offsetFraction },
        tr: { x: -offsetFraction, y: offsetFraction },
        bl: { x: offsetFraction, y: -offsetFraction },
        br: { x: -offsetFraction, y: -offsetFraction }
      }[q];

      // Convert screen offset to world offset
      const worldOffset = 1 / (baseZoom * 100) * 200; // ~2 AU at base zoom
      candidates.push({
        x: targetX + offset.x * worldOffset,
        y: targetY + offset.y * worldOffset,
        zoom: baseZoom,
        type: `thirds-${q}`
      });
    }

    // 3. Establishing shot (wide, shows star and target)
    const establishingZoom = Math.max(0.1, baseZoom * 0.25);
    candidates.push({
      x: targetX * 0.5, // Halfway between star and target
      y: 0,
      zoom: establishingZoom,
      type: 'establishing'
    });

    // 4. Context-inclusive (show nearby planets)
    if (context.bodies.length > 1) {
      const allX = context.bodies.map(b => b.orbitAU || 0);
      const minX = Math.min(...allX);
      const maxX = Math.max(...allX);
      const span = maxX - minX;
      const contextZoom = span > 0 ? 0.8 / (span * 100) : baseZoom * 0.5;

      candidates.push({
        x: (minX + maxX) / 2,
        y: 0,
        zoom: Math.max(0.1, contextZoom),
        type: 'context'
      });
    }

    // 5. Over-shoulder (from inner body toward target)
    if (context.innerBodies.length > 0) {
      const innerBody = context.innerBodies[context.innerBodies.length - 1];
      const innerX = innerBody.orbitAU || 0;
      candidates.push({
        x: innerX + (targetX - innerX) * 0.3,
        y: 0.1, // Slight offset
        zoom: baseZoom * 0.7,
        type: 'over-shoulder'
      });
    }

    // 6. Zoom variations
    candidates.push({ x: targetX, y: 0, zoom: baseZoom * 1.5, type: 'close' });
    candidates.push({ x: targetX, y: 0, zoom: baseZoom * 0.5, type: 'medium' });

    return candidates;
  }

  /**
   * Score a candidate position
   * @param {Object} candidate - Camera position candidate
   * @param {Object} target - Target object
   * @param {Object} context - Context data
   * @param {Object} canvasSize - Canvas dimensions
   * @returns {number} Score
   */
  score(candidate, target, context, canvasSize) {
    return scoreCameraPosition(candidate, target, {
      star: context.star,
      bodies: context.bodies,
      canvasSize
    });
  }

  /**
   * Select best candidate
   * @param {Array} scoredCandidates - Candidates with scores
   * @returns {Object} Best candidate
   */
  selectBest(scoredCandidates) {
    if (scoredCandidates.length === 0) return null;

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Return best
    return scoredCandidates[0];
  }

  /**
   * Generate best camera view for a target
   * @param {string} targetId - Target object ID
   * @param {Object} options - { viewType, canvasSize }
   * @returns {Object} Camera position { x, y, zoom, score }
   */
  generateView(targetId, options = {}) {
    const target = this.findBody(targetId);
    if (!target) {
      console.warn('[CinematicCamera] Target not found:', targetId);
      return null;
    }

    const canvasSize = options.canvasSize || { width: 800, height: 600 };
    const context = this.gatherContext(target);
    const candidates = this.generateCandidates(target, context, options);

    // Score all candidates
    const scored = candidates.map(c => ({
      ...c,
      score: this.score(c, target, context, canvasSize)
    }));

    // Select and return best
    const best = this.selectBest(scored);
    console.log('[CinematicCamera] Generated view for', targetId, '- best:', best?.type, 'score:', best?.score);

    return best;
  }

  /**
   * Generate camera for journey visualization
   * @param {Object} fromPos - Start position { x, y }
   * @param {Object} toPos - End position { x, y }
   * @param {number} progress - Journey progress 0-1
   * @returns {Object} Camera position
   */
  generateJourneyCamera(fromPos, toPos, progress) {
    // Interpolate position
    const x = fromPos.x + (toPos.x - fromPos.x) * progress;
    const y = fromPos.y + (toPos.y - fromPos.y) * progress;

    // Zoom based on progress:
    // - Start: closer to origin
    // - Middle: wide view showing both
    // - End: closer to destination
    const distance = Math.sqrt((toPos.x - fromPos.x) ** 2 + (toPos.y - fromPos.y) ** 2);
    // Guard against zero distance (would cause Infinity)
    const baseZoom = distance > 0 ? Math.max(0.1, 0.8 / (distance * 100)) : 1.0;

    let zoom;
    if (progress < 0.3) {
      // Departure: show origin getting smaller
      zoom = baseZoom * (1.5 - progress);
    } else if (progress > 0.7) {
      // Arrival: zoom in on destination
      zoom = baseZoom * (0.5 + (progress - 0.7) * 3);
    } else {
      // Mid-journey: wide view
      zoom = baseZoom * 0.5;
    }

    return { x, y, zoom, progress };
  }

  /**
   * Generate keyframes for journey animation
   * @param {string} fromId - Origin body ID
   * @param {string} toId - Destination body ID
   * @param {number} keyframeCount - Number of keyframes (default 4)
   * @returns {Array} Array of camera positions
   */
  generateJourneyKeyframes(fromId, toId, keyframeCount = 4) {
    const fromBody = this.findBody(fromId);
    const toBody = this.findBody(toId);

    if (!fromBody || !toBody) {
      console.warn('[CinematicCamera] Journey bodies not found');
      return [];
    }

    const fromPos = { x: fromBody.orbitAU || 0, y: 0 };
    const toPos = { x: toBody.orbitAU || 0, y: 0 };

    const keyframes = [];
    for (let i = 0; i < keyframeCount; i++) {
      const progress = i / (keyframeCount - 1);
      keyframes.push(this.generateJourneyCamera(fromPos, toPos, progress));
    }

    return keyframes;
  }
}

module.exports = {
  CinematicCamera,
  VIEW_TYPES
};
