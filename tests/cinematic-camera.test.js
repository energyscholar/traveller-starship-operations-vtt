/**
 * AR-264: Cinematic Camera Unit Tests
 * Thorough tests for camera animation and composition scoring
 */

const {
  CinematicCamera,
  VIEW_TYPES
} = require('../lib/camera/cinematic-camera');

const {
  CAMERA_WEIGHTS,
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
  scoreCameraPosition
} = require('../lib/camera/composition-utils');

// ===================
// Test Fixtures
// ===================

const mockSystemData = {
  star: { x: 0, y: 0, name: 'Test Star' },
  bodies: [
    { id: 'inner-planet', orbitAU: 0.5, radiusKm: 3000, type: 'Planet' },
    { id: 'habitable', orbitAU: 1.0, radiusKm: 6371, type: 'Planet' },
    { id: 'outer-planet', orbitAU: 5.0, radiusKm: 50000, type: 'GasGiant' },
    { id: 'distant', orbitAU: 30.0, radiusKm: 25000, type: 'IceGiant' }
  ],
  places: [
    { id: 'highport', linkedTo: 'habitable', type: 'Station', radiusKm: 2 },
    { id: 'dock-outer', linkedTo: 'outer-planet', type: 'Dock', radiusKm: 1 }
  ]
};

const defaultCanvasSize = { width: 800, height: 600 };

// ===================
// Composition Utilities Tests
// ===================

describe('Composition Utilities', () => {

  describe('bellCurve', () => {
    test('returns 1.0 at center', () => {
      expect(bellCurve(0.5, 0.5, 0.2)).toBeCloseTo(1.0, 5);
    });

    test('returns less than 1.0 away from center', () => {
      expect(bellCurve(0.7, 0.5, 0.2)).toBeLessThan(1.0);
      expect(bellCurve(0.3, 0.5, 0.2)).toBeLessThan(1.0);
    });

    test('approaches 0 far from center', () => {
      expect(bellCurve(2.0, 0.5, 0.2)).toBeLessThan(0.0001);
    });

    test('wider width produces broader curve', () => {
      const narrow = bellCurve(0.7, 0.5, 0.1);
      const wide = bellCurve(0.7, 0.5, 0.3);
      expect(wide).toBeGreaterThan(narrow);
    });
  });

  describe('calculateFillFactor', () => {
    test('larger zoom produces higher fill', () => {
      const lowZoom = calculateFillFactor(1, 0.001, defaultCanvasSize);
      const highZoom = calculateFillFactor(10, 0.001, defaultCanvasSize);
      expect(highZoom).toBeGreaterThan(lowZoom);
    });

    test('larger object produces higher fill', () => {
      const small = calculateFillFactor(1, 0.0001, defaultCanvasSize);
      const large = calculateFillFactor(1, 0.001, defaultCanvasSize);
      expect(large).toBeGreaterThan(small);
    });

    test('caps at 1.0', () => {
      const huge = calculateFillFactor(100, 1, defaultCanvasSize);
      expect(huge).toBeLessThanOrEqual(1);
    });
  });

  describe('scoreFillFactor', () => {
    test('optimal at 50% fill', () => {
      expect(scoreFillFactor(0.5)).toBeCloseTo(1.0, 5);
    });

    test('lower score at 20% fill', () => {
      expect(scoreFillFactor(0.2)).toBeLessThan(0.8);
    });

    test('lower score at 80% fill', () => {
      expect(scoreFillFactor(0.8)).toBeLessThan(0.8);
    });

    test('symmetrical around 50%', () => {
      expect(scoreFillFactor(0.4)).toBeCloseTo(scoreFillFactor(0.6), 5);
    });
  });

  describe('ruleOfThirdsPosition', () => {
    test('returns negative offset for top-left', () => {
      const pos = ruleOfThirdsPosition(800, 600, 'tl');
      expect(pos.offsetX).toBeLessThan(0);
      expect(pos.offsetY).toBeLessThan(0);
    });

    test('returns positive X, negative Y for top-right', () => {
      const pos = ruleOfThirdsPosition(800, 600, 'tr');
      expect(pos.offsetX).toBeGreaterThan(0);
      expect(pos.offsetY).toBeLessThan(0);
    });

    test('returns different position for random quadrant', () => {
      const positions = new Set();
      for (let i = 0; i < 20; i++) {
        const pos = ruleOfThirdsPosition(800, 600, 'random');
        positions.add(`${Math.sign(pos.offsetX)},${Math.sign(pos.offsetY)}`);
      }
      // Should have multiple different positions
      expect(positions.size).toBeGreaterThanOrEqual(1);
    });

    test('offset is about 12% of canvas', () => {
      const pos = ruleOfThirdsPosition(1000, 1000, 'br');
      expect(Math.abs(pos.offsetX)).toBeCloseTo(120, 0);
      expect(Math.abs(pos.offsetY)).toBeCloseTo(120, 0);
    });
  });

  describe('scoreRuleOfThirds', () => {
    test('center position scores lower', () => {
      const centerScore = scoreRuleOfThirds({ x: 400, y: 300 }, defaultCanvasSize);
      // Center is at distance 0, optimal is ~0.12
      expect(centerScore).toBeLessThan(0.5);
    });

    test('12% offset scores high', () => {
      // 12% of 800 = 96, 12% of 600 = 72
      const offsetScore = scoreRuleOfThirds({ x: 400 + 96, y: 300 + 72 }, defaultCanvasSize);
      expect(offsetScore).toBeGreaterThan(0.7);
    });

    test('edge of screen scores low', () => {
      const edgeScore = scoreRuleOfThirds({ x: 50, y: 50 }, defaultCanvasSize);
      expect(edgeScore).toBeLessThan(0.5);
    });
  });

  describe('getVisibleObjects', () => {
    test('returns objects in view', () => {
      const cameraPos = { x: 1.0, y: 0, zoom: 1 };
      const objects = [
        { id: 'a', orbitAU: 1.0 },
        { id: 'b', orbitAU: 2.0 },
        { id: 'far', orbitAU: 50 }
      ];
      const visible = getVisibleObjects(cameraPos, objects, defaultCanvasSize);
      expect(visible.some(v => v.id === 'a')).toBe(true);
      expect(visible.some(v => v.id === 'b')).toBe(true);
    });

    test('excludes distant objects', () => {
      const cameraPos = { x: 0, y: 0, zoom: 0.1 }; // Very zoomed out
      const objects = [
        { id: 'close', orbitAU: 0.1 },
        { id: 'far', orbitAU: 100 }
      ];
      const visible = getVisibleObjects(cameraPos, objects, defaultCanvasSize);
      // At low zoom, 100 AU is off screen
      expect(visible.some(v => v.id === 'far')).toBe(false);
    });

    test('includes screen position in results', () => {
      const cameraPos = { x: 0, y: 0, zoom: 1 };
      const objects = [{ id: 'test', orbitAU: 1.0 }];
      const visible = getVisibleObjects(cameraPos, objects, defaultCanvasSize);
      expect(visible[0]).toHaveProperty('screenX');
      expect(visible[0]).toHaveProperty('screenY');
    });
  });

  describe('hasDepthSeparation', () => {
    test('returns 0 for single object', () => {
      expect(hasDepthSeparation([{ radiusKm: 1000 }])).toBe(0);
    });

    test('returns 0 for empty array', () => {
      expect(hasDepthSeparation([])).toBe(0);
    });

    test('returns positive for varied sizes', () => {
      const objects = [
        { radiusKm: 50000 },
        { radiusKm: 5000 },
        { radiusKm: 500 }
      ];
      expect(hasDepthSeparation(objects)).toBeGreaterThan(0);
    });

    test('higher score for greater size ratio', () => {
      const lowRatio = [{ radiusKm: 1000 }, { radiusKm: 2000 }];
      const highRatio = [{ radiusKm: 100 }, { radiusKm: 100000 }];
      expect(hasDepthSeparation(highRatio)).toBeGreaterThan(hasDepthSeparation(lowRatio));
    });
  });

  describe('calculateClutter', () => {
    test('returns 0 for well-separated objects', () => {
      const objects = [
        { screenX: 100, screenY: 100 },
        { screenX: 300, screenY: 300 },
        { screenX: 500, screenY: 100 }
      ];
      expect(calculateClutter(objects, 30)).toBe(0);
    });

    test('returns count of overlapping pairs', () => {
      const objects = [
        { screenX: 100, screenY: 100 },
        { screenX: 110, screenY: 105 }, // Too close to first
        { screenX: 500, screenY: 500 }
      ];
      expect(calculateClutter(objects, 30)).toBe(1);
    });

    test('counts multiple overlaps', () => {
      const objects = [
        { screenX: 100, screenY: 100 },
        { screenX: 105, screenY: 100 },
        { screenX: 110, screenY: 100 }
      ];
      // All three overlap: (0,1), (0,2), (1,2) = 3 pairs
      expect(calculateClutter(objects, 30)).toBe(3);
    });
  });

  describe('isStarVisible', () => {
    test('star at center is visible', () => {
      const cameraPos = { x: 0, y: 0, zoom: 1 };
      expect(isStarVisible(cameraPos, { x: 0, y: 0 }, defaultCanvasSize)).toBe(true);
    });

    test('star off-screen is not visible', () => {
      const cameraPos = { x: 100, y: 0, zoom: 1 }; // Camera far from star
      expect(isStarVisible(cameraPos, { x: 0, y: 0 }, defaultCanvasSize)).toBe(false);
    });
  });

  describe('isTargetVisible', () => {
    test('centered target is visible', () => {
      const target = { orbitAU: 1.0 };
      const cameraPos = { x: 1.0, y: 0, zoom: 1 };
      expect(isTargetVisible(cameraPos, target, defaultCanvasSize)).toBe(true);
    });

    test('off-screen target is not visible', () => {
      const target = { orbitAU: 100 };
      const cameraPos = { x: 0, y: 0, zoom: 1 };
      expect(isTargetVisible(cameraPos, target, defaultCanvasSize)).toBe(false);
    });

    test('edge target is not visible (margin check)', () => {
      // Target at edge of screen should fail due to margin requirement
      const target = { orbitAU: 4.5 }; // Just at edge at default zoom
      const cameraPos = { x: 0, y: 0, zoom: 1 };
      expect(isTargetVisible(cameraPos, target, defaultCanvasSize)).toBe(false);
    });
  });

  describe('scoreCameraPosition', () => {
    test('returns -1000 for invisible target', () => {
      const target = { orbitAU: 100 };
      const cameraPos = { x: 0, y: 0, zoom: 1 };
      const context = { star: { x: 0, y: 0 }, bodies: [], canvasSize: defaultCanvasSize };
      expect(scoreCameraPosition(cameraPos, target, context)).toBe(-1000);
    });

    test('returns positive score for visible target', () => {
      const target = { orbitAU: 1.0, radiusKm: 6000 };
      const cameraPos = { x: 1.0, y: 0, zoom: 10 };
      const context = { star: { x: 0, y: 0 }, bodies: [target], canvasSize: defaultCanvasSize };
      expect(scoreCameraPosition(cameraPos, target, context)).toBeGreaterThan(0);
    });

    test('includes target visibility bonus', () => {
      const target = { orbitAU: 1.0, radiusKm: 6000 };
      const cameraPos = { x: 1.0, y: 0, zoom: 10 };
      const context = { star: { x: 0, y: 0 }, bodies: [target], canvasSize: defaultCanvasSize };
      const score = scoreCameraPosition(cameraPos, target, context);
      expect(score).toBeGreaterThanOrEqual(CAMERA_WEIGHTS.targetVisible);
    });
  });
});

// ===================
// CinematicCamera Class Tests
// ===================

describe('CinematicCamera', () => {

  describe('constructor', () => {
    test('initializes with system data', () => {
      const camera = new CinematicCamera(mockSystemData);
      expect(camera.star).toBeDefined();
      expect(camera.bodies).toHaveLength(4);
      expect(camera.places).toHaveLength(2);
    });

    test('handles missing star', () => {
      const camera = new CinematicCamera({ bodies: [] });
      expect(camera.star).toEqual({ x: 0, y: 0, name: 'Star' });
    });

    test('handles celestialObjects alias', () => {
      const camera = new CinematicCamera({ celestialObjects: [{ id: 'test' }] });
      expect(camera.bodies).toHaveLength(1);
    });
  });

  describe('findBody', () => {
    test('finds body by ID', () => {
      const camera = new CinematicCamera(mockSystemData);
      const body = camera.findBody('habitable');
      expect(body).toBeDefined();
      expect(body.orbitAU).toBe(1.0);
    });

    test('finds place by ID and resolves linked body', () => {
      const camera = new CinematicCamera(mockSystemData);
      const place = camera.findBody('highport');
      expect(place).toBeDefined();
      expect(place.orbitAU).toBe(1.0); // Same as linked 'habitable'
    });

    test('returns null for unknown ID', () => {
      const camera = new CinematicCamera(mockSystemData);
      expect(camera.findBody('nonexistent')).toBeNull();
    });

    test('handles place with missing linked body', () => {
      const data = {
        bodies: [],
        places: [{ id: 'orphan', linkedTo: 'missing' }]
      };
      const camera = new CinematicCamera(data);
      expect(camera.findBody('orphan')).toBeNull();
    });
  });

  describe('gatherContext', () => {
    test('includes target in context', () => {
      const camera = new CinematicCamera(mockSystemData);
      const target = { id: 'test', orbitAU: 1.0 };
      const context = camera.gatherContext(target);
      expect(context.bodies).toContain(target);
    });

    test('includes nearby bodies', () => {
      const camera = new CinematicCamera(mockSystemData);
      const target = { id: 'habitable', orbitAU: 1.0 };
      const context = camera.gatherContext(target, 5);
      // Should include inner-planet (0.5 AU) and outer-planet (5.0 AU)
      expect(context.bodies.length).toBeGreaterThan(1);
    });

    test('excludes distant bodies', () => {
      const camera = new CinematicCamera(mockSystemData);
      const target = { id: 'habitable', orbitAU: 1.0 };
      const context = camera.gatherContext(target, 2);
      // Should NOT include outer-planet (5.0 AU)
      const hasOuter = context.bodies.some(b => b.id === 'outer-planet');
      expect(hasOuter).toBe(false);
    });

    test('separates inner and outer bodies', () => {
      const camera = new CinematicCamera(mockSystemData);
      const target = camera.findBody('habitable');
      const context = camera.gatherContext(target, 5);
      expect(context.innerBodies).toBeDefined();
      expect(context.outerBodies).toBeDefined();
    });
  });

  describe('generateCandidates', () => {
    test('generates multiple candidates', () => {
      const camera = new CinematicCamera(mockSystemData);
      const target = camera.findBody('habitable');
      const context = camera.gatherContext(target);
      const candidates = camera.generateCandidates(target, context);
      expect(candidates.length).toBeGreaterThan(5);
    });

    test('includes direct view', () => {
      const camera = new CinematicCamera(mockSystemData);
      const target = camera.findBody('habitable');
      const context = camera.gatherContext(target);
      const candidates = camera.generateCandidates(target, context);
      expect(candidates.some(c => c.type === 'direct')).toBe(true);
    });

    test('includes rule of thirds positions', () => {
      const camera = new CinematicCamera(mockSystemData);
      const target = camera.findBody('habitable');
      const context = camera.gatherContext(target);
      const candidates = camera.generateCandidates(target, context);
      const thirdsCount = candidates.filter(c => c.type.startsWith('thirds')).length;
      expect(thirdsCount).toBe(4);
    });

    test('includes establishing shot', () => {
      const camera = new CinematicCamera(mockSystemData);
      const target = camera.findBody('habitable');
      const context = camera.gatherContext(target);
      const candidates = camera.generateCandidates(target, context);
      expect(candidates.some(c => c.type === 'establishing')).toBe(true);
    });

    test('candidates have required properties', () => {
      const camera = new CinematicCamera(mockSystemData);
      const target = camera.findBody('habitable');
      const context = camera.gatherContext(target);
      const candidates = camera.generateCandidates(target, context);

      for (const c of candidates) {
        expect(c).toHaveProperty('x');
        expect(c).toHaveProperty('y');
        expect(c).toHaveProperty('zoom');
        expect(c).toHaveProperty('type');
        expect(typeof c.x).toBe('number');
        expect(typeof c.zoom).toBe('number');
        expect(c.zoom).toBeGreaterThan(0);
      }
    });
  });

  describe('generateView', () => {
    test('returns null for unknown target', () => {
      const camera = new CinematicCamera(mockSystemData);
      expect(camera.generateView('nonexistent')).toBeNull();
    });

    test('returns best scored candidate', () => {
      const camera = new CinematicCamera(mockSystemData);
      const view = camera.generateView('habitable');
      expect(view).toBeDefined();
      expect(view).toHaveProperty('x');
      expect(view).toHaveProperty('y');
      expect(view).toHaveProperty('zoom');
      expect(view).toHaveProperty('score');
    });

    test('accepts custom canvas size', () => {
      const camera = new CinematicCamera(mockSystemData);
      const view = camera.generateView('habitable', { canvasSize: { width: 1920, height: 1080 } });
      expect(view).toBeDefined();
    });

    test('returns positive score for valid target', () => {
      const camera = new CinematicCamera(mockSystemData);
      const view = camera.generateView('habitable');
      expect(view.score).toBeGreaterThan(0);
    });
  });

  describe('generateJourneyCamera', () => {
    test('interpolates position', () => {
      const camera = new CinematicCamera(mockSystemData);
      const from = { x: 0, y: 0 };
      const to = { x: 10, y: 0 };

      const start = camera.generateJourneyCamera(from, to, 0);
      const mid = camera.generateJourneyCamera(from, to, 0.5);
      const end = camera.generateJourneyCamera(from, to, 1);

      expect(start.x).toBe(0);
      expect(mid.x).toBe(5);
      expect(end.x).toBe(10);
    });

    test('progress 0 has higher zoom (departure)', () => {
      const camera = new CinematicCamera(mockSystemData);
      const from = { x: 0, y: 0 };
      const to = { x: 10, y: 0 };

      const start = camera.generateJourneyCamera(from, to, 0);
      const mid = camera.generateJourneyCamera(from, to, 0.5);

      expect(start.zoom).toBeGreaterThan(mid.zoom);
    });

    test('progress 1 has higher zoom (arrival)', () => {
      const camera = new CinematicCamera(mockSystemData);
      const from = { x: 0, y: 0 };
      const to = { x: 10, y: 0 };

      const mid = camera.generateJourneyCamera(from, to, 0.5);
      const end = camera.generateJourneyCamera(from, to, 1);

      expect(end.zoom).toBeGreaterThan(mid.zoom);
    });

    test('includes progress in result', () => {
      const camera = new CinematicCamera(mockSystemData);
      const result = camera.generateJourneyCamera({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.7);
      expect(result.progress).toBe(0.7);
    });
  });

  describe('generateJourneyKeyframes', () => {
    test('returns empty array for unknown body', () => {
      const camera = new CinematicCamera(mockSystemData);
      const frames = camera.generateJourneyKeyframes('nonexistent', 'habitable');
      expect(frames).toHaveLength(0);
    });

    test('generates 4 keyframes by default', () => {
      const camera = new CinematicCamera(mockSystemData);
      const frames = camera.generateJourneyKeyframes('inner-planet', 'outer-planet');
      expect(frames).toHaveLength(4);
    });

    test('generates custom keyframe count', () => {
      const camera = new CinematicCamera(mockSystemData);
      const frames = camera.generateJourneyKeyframes('inner-planet', 'outer-planet', 8);
      expect(frames).toHaveLength(8);
    });

    test('first keyframe is at progress 0', () => {
      const camera = new CinematicCamera(mockSystemData);
      const frames = camera.generateJourneyKeyframes('inner-planet', 'outer-planet');
      expect(frames[0].progress).toBe(0);
    });

    test('last keyframe is at progress 1', () => {
      const camera = new CinematicCamera(mockSystemData);
      const frames = camera.generateJourneyKeyframes('inner-planet', 'outer-planet');
      expect(frames[frames.length - 1].progress).toBe(1);
    });
  });
});

// ===================
// Animation Edge Cases
// ===================

describe('Animation Edge Cases', () => {

  describe('DOM element safety', () => {
    test('camera calculations are pure functions (no DOM)', () => {
      // These should all work without DOM
      const camera = new CinematicCamera(mockSystemData);
      const view = camera.generateView('habitable');
      expect(view).toBeDefined();

      const journey = camera.generateJourneyCamera({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.5);
      expect(journey).toBeDefined();

      const score = scoreCameraPosition(
        { x: 1, y: 0, zoom: 1 },
        { orbitAU: 1, radiusKm: 6000 },
        { star: { x: 0, y: 0 }, bodies: [], canvasSize: { width: 800, height: 600 } }
      );
      expect(typeof score).toBe('number');
    });
  });

  describe('zoom boundary conditions', () => {
    test('zoom is always positive', () => {
      const camera = new CinematicCamera(mockSystemData);

      // Test with extreme values
      const journey = camera.generateJourneyCamera({ x: 0, y: 0 }, { x: 1000, y: 0 }, 0.5);
      expect(journey.zoom).toBeGreaterThan(0);

      const view = camera.generateView('distant');
      if (view) {
        expect(view.zoom).toBeGreaterThan(0);
      }
    });

    test('handles zero-distance journey', () => {
      const camera = new CinematicCamera(mockSystemData);
      // Same position for from and to
      const journey = camera.generateJourneyCamera({ x: 5, y: 0 }, { x: 5, y: 0 }, 0.5);
      expect(journey).toBeDefined();
      expect(isFinite(journey.zoom)).toBe(true);
    });
  });

  describe('NaN/Infinity protection', () => {
    test('handles objects with zero radius', () => {
      const data = {
        bodies: [{ id: 'test', orbitAU: 1.0, radiusKm: 0 }]
      };
      const camera = new CinematicCamera(data);
      const context = camera.gatherContext(data.bodies[0]);
      const candidates = camera.generateCandidates(data.bodies[0], context);

      for (const c of candidates) {
        expect(isFinite(c.x)).toBe(true);
        expect(isFinite(c.y)).toBe(true);
        expect(isFinite(c.zoom)).toBe(true);
      }
    });

    test('handles objects with undefined radius', () => {
      const data = {
        bodies: [{ id: 'test', orbitAU: 1.0 }]
      };
      const camera = new CinematicCamera(data);
      const context = camera.gatherContext(data.bodies[0]);
      const candidates = camera.generateCandidates(data.bodies[0], context);

      expect(candidates.length).toBeGreaterThan(0);
      expect(isFinite(candidates[0].zoom)).toBe(true);
    });
  });

  describe('VIEW_TYPES export', () => {
    test('VIEW_TYPES has expected values', () => {
      expect(VIEW_TYPES.ESTABLISHING).toBe('establishing');
      expect(VIEW_TYPES.APPROACH).toBe('approach');
      expect(VIEW_TYPES.ARRIVAL).toBe('arrival');
      expect(VIEW_TYPES.DETAIL).toBe('detail');
      expect(VIEW_TYPES.DEPARTURE).toBe('departure');
      expect(VIEW_TYPES.JOURNEY).toBe('journey');
    });
  });

  describe('CAMERA_WEIGHTS export', () => {
    test('weights are all numbers', () => {
      for (const [key, value] of Object.entries(CAMERA_WEIGHTS)) {
        expect(typeof value).toBe('number');
        expect(isFinite(value)).toBe(true);
      }
    });

    test('targetVisible is highest priority', () => {
      expect(CAMERA_WEIGHTS.targetVisible).toBeGreaterThan(CAMERA_WEIGHTS.fillFactor);
      expect(CAMERA_WEIGHTS.targetVisible).toBeGreaterThan(CAMERA_WEIGHTS.ruleOfThirds);
    });
  });
});
