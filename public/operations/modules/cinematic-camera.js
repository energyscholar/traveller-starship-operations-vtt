/**
 * AR-264: Client-side Cinematic Camera
 *
 * Browser-compatible camera scoring and generation.
 * Generates aesthetically pleasing camera views for system map.
 */

// Scoring weights (tunable)
const CAMERA_WEIGHTS = {
  targetVisible: 100,
  fillFactor: 50,
  contextObjects: 10,
  ruleOfThirds: 20,
  depthLayers: 15,
  clutter: -25,
  starVisible: 20,
};

/**
 * Bell curve for optimal ranges
 */
function bellCurve(value, center, width) {
  const diff = (value - center) / width;
  return Math.exp(-0.5 * diff * diff);
}

/**
 * Score fill factor - optimal is 30-70%, peak at 50%
 */
function scoreFillFactor(fillFactor) {
  return bellCurve(fillFactor, 0.5, 0.2);
}

/**
 * Score rule of thirds positioning
 */
function scoreRuleOfThirds(targetScreenPos, canvasSize) {
  const centerX = canvasSize.width / 2;
  const centerY = canvasSize.height / 2;
  const dx = Math.abs(targetScreenPos.x - centerX) / canvasSize.width;
  const dy = Math.abs(targetScreenPos.y - centerY) / canvasSize.height;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return bellCurve(distance, 0.12, 0.08);
}

/**
 * Calculate clutter (overlapping objects)
 */
function calculateClutter(visibleObjects, minSeparation = 30) {
  let overlaps = 0;
  for (let i = 0; i < visibleObjects.length; i++) {
    for (let j = i + 1; j < visibleObjects.length; j++) {
      const dx = visibleObjects[i].screenX - visibleObjects[j].screenX;
      const dy = visibleObjects[i].screenY - visibleObjects[j].screenY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minSeparation) overlaps++;
    }
  }
  return overlaps;
}

/**
 * CinematicCamera class for client-side use
 */
class CinematicCamera {
  constructor(systemData, mapState) {
    this.system = systemData;
    this.mapState = mapState;
    this.AU_TO_PIXELS = mapState?.AU_TO_PIXELS || 100;
  }

  /**
   * Find a body by ID
   */
  findBody(targetId) {
    const bodies = this.system?.celestialObjects || this.system?.planets || [];
    const body = bodies.find(b => b.id === targetId);
    if (body) return body;

    const places = this.system?.places || this.system?.locations || [];
    const place = places.find(p => p.id === targetId);
    if (place?.linkedTo) {
      const linkedBody = bodies.find(b => b.id === place.linkedTo);
      if (linkedBody) {
        return { ...place, orbitAU: linkedBody.orbitAU, radiusKm: 50 };
      }
    }
    return null;
  }

  /**
   * Gather context around target
   */
  gatherContext(target, rangeAU = 5) {
    const bodies = this.system?.celestialObjects || this.system?.planets || [];
    const targetOrbit = target.orbitAU || 0;
    const nearbyBodies = bodies.filter(b => {
      const dist = Math.abs((b.orbitAU || 0) - targetOrbit);
      return dist <= rangeAU && b.id !== target.id;
    });
    return {
      star: { x: 0, y: 0, name: this.system?.star?.name || 'Star' },
      bodies: [target, ...nearbyBodies],
      targetOrbit
    };
  }

  /**
   * Generate candidate positions
   */
  generateCandidates(target, context) {
    const targetX = target.orbitAU || 0;
    const targetRadius = (target.radiusKm || 6000) / 149597870.7;
    const baseZoom = Math.min(50, Math.max(0.5, 0.3 / (targetRadius * this.AU_TO_PIXELS * 2 / 400)));
    const candidates = [];

    // Direct center
    candidates.push({ x: targetX, y: 0, zoom: baseZoom, type: 'direct' });

    // Rule of thirds (4 corners)
    const offset = 0.12;
    const worldOffset = 1 / (baseZoom * this.AU_TO_PIXELS) * 200;
    candidates.push({ x: targetX + offset * worldOffset, y: offset * worldOffset, zoom: baseZoom, type: 'thirds-tl' });
    candidates.push({ x: targetX - offset * worldOffset, y: offset * worldOffset, zoom: baseZoom, type: 'thirds-tr' });
    candidates.push({ x: targetX + offset * worldOffset, y: -offset * worldOffset, zoom: baseZoom, type: 'thirds-bl' });
    candidates.push({ x: targetX - offset * worldOffset, y: -offset * worldOffset, zoom: baseZoom, type: 'thirds-br' });

    // Establishing (wide)
    candidates.push({ x: targetX * 0.5, y: 0, zoom: Math.max(0.1, baseZoom * 0.25), type: 'establishing' });

    // Context-inclusive
    if (context.bodies.length > 1) {
      const allX = context.bodies.map(b => b.orbitAU || 0);
      const span = Math.max(...allX) - Math.min(...allX);
      const contextZoom = span > 0 ? 0.8 / (span * this.AU_TO_PIXELS) : baseZoom * 0.5;
      candidates.push({
        x: (Math.min(...allX) + Math.max(...allX)) / 2,
        y: 0,
        zoom: Math.max(0.1, contextZoom),
        type: 'context'
      });
    }

    return candidates;
  }

  /**
   * Score a camera position
   */
  score(candidate, target, context, canvasSize) {
    let score = 0;
    const targetX = target.orbitAU || 0;
    const targetRadius = (target.radiusKm || 6000) / 149597870.7;

    // Check target visible
    const screenX = (targetX - candidate.x) * this.AU_TO_PIXELS * candidate.zoom + canvasSize.width / 2;
    const screenY = -candidate.y * this.AU_TO_PIXELS * candidate.zoom + canvasSize.height / 2;
    if (screenX < 50 || screenX > canvasSize.width - 50 || screenY < 50 || screenY > canvasSize.height - 50) {
      return -1000;
    }
    score += CAMERA_WEIGHTS.targetVisible;

    // Fill factor
    const radiusPixels = targetRadius * this.AU_TO_PIXELS * candidate.zoom;
    const fillFactor = Math.min(1, (radiusPixels * 2) / Math.min(canvasSize.width, canvasSize.height));
    score += scoreFillFactor(fillFactor) * CAMERA_WEIGHTS.fillFactor;

    // Rule of thirds
    score += scoreRuleOfThirds({ x: screenX, y: screenY }, canvasSize) * CAMERA_WEIGHTS.ruleOfThirds;

    // Star visible bonus
    const starScreenX = -candidate.x * this.AU_TO_PIXELS * candidate.zoom + canvasSize.width / 2;
    if (starScreenX > 0 && starScreenX < canvasSize.width) {
      score += CAMERA_WEIGHTS.starVisible;
    }

    return score;
  }

  /**
   * Generate best view for a target
   */
  generateView(targetId, canvasSize = { width: 800, height: 600 }) {
    const target = this.findBody(targetId);
    if (!target) {
      console.warn('[CinematicCamera] Target not found:', targetId);
      return null;
    }

    const context = this.gatherContext(target);
    const candidates = this.generateCandidates(target, context);
    const scored = candidates.map(c => ({ ...c, score: this.score(c, target, context, canvasSize) }));
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    console.log('[CinematicCamera] Best view for', targetId, ':', best?.type, 'score:', best?.score?.toFixed(0));
    return best;
  }

  /**
   * Generate journey camera for travel animation
   */
  generateJourneyCamera(fromPos, toPos, progress) {
    const x = fromPos.x + (toPos.x - fromPos.x) * progress;
    const y = fromPos.y + (toPos.y - fromPos.y) * progress;
    const distance = Math.sqrt((toPos.x - fromPos.x) ** 2 + (toPos.y - fromPos.y) ** 2);
    // Guard against zero distance (would cause Infinity)
    const baseZoom = distance > 0 ? Math.max(0.1, 0.8 / (distance * this.AU_TO_PIXELS)) : 1.0;

    let zoom;
    if (progress < 0.3) {
      zoom = baseZoom * (1.5 - progress);
    } else if (progress > 0.7) {
      zoom = baseZoom * (0.5 + (progress - 0.7) * 3);
    } else {
      zoom = baseZoom * 0.5;
    }

    return { x, y, zoom, progress };
  }
}

// Export for ES modules
export { CinematicCamera, CAMERA_WEIGHTS };

// Also expose globally for non-module use
window.CinematicCamera = CinematicCamera;
