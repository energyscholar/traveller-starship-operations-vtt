/**
 * AR-223: Control Mode Unit Tests
 * TDD Phase: RED (tests first, implementation follows)
 *
 * Tests 3-way control mode: AUTO / CAPTAIN / ROLE
 * Tests role selection filter (only active in ROLE mode)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

// Functions to implement in lib/combat/control-mode.js
const {
  CONTROL_MODES,
  ROLES,
  cycleControlMode,
  needsPlayerInput,
  canSelectRole,
  getSpeedMs,
  cycleSpeed,
  checkEscapeCondition
} = require('../../lib/combat/control-mode');

describe('AR-223: Control Mode', () => {

  describe('cycleControlMode', () => {
    it('cycles AUTO → CAPTAIN', () => {
      assert.strictEqual(cycleControlMode('AUTO'), 'CAPTAIN');
    });

    it('cycles CAPTAIN → ROLE', () => {
      assert.strictEqual(cycleControlMode('CAPTAIN'), 'ROLE');
    });

    it('cycles ROLE → AUTO', () => {
      assert.strictEqual(cycleControlMode('ROLE'), 'AUTO');
    });

    it('handles invalid mode by returning AUTO', () => {
      assert.strictEqual(cycleControlMode('INVALID'), 'AUTO');
    });
  });

  describe('needsPlayerInput (mode filtering)', () => {
    it('AUTO mode skips all prompts', () => {
      assert.strictEqual(needsPlayerInput('AUTO', 'captain', 'disengage'), false);
      assert.strictEqual(needsPlayerInput('AUTO', 'gunner', 'fire'), false);
      assert.strictEqual(needsPlayerInput('AUTO', 'pilot', 'evasive'), false);
    });

    it('CAPTAIN mode only prompts captain actions', () => {
      assert.strictEqual(needsPlayerInput('CAPTAIN', 'captain', 'disengage'), true);
      assert.strictEqual(needsPlayerInput('CAPTAIN', 'captain', 'retreat'), true);
      assert.strictEqual(needsPlayerInput('CAPTAIN', 'gunner', 'fire'), false);
      assert.strictEqual(needsPlayerInput('CAPTAIN', 'pilot', 'evasive'), false);
    });

    it('ROLE mode with ALL prompts every role', () => {
      assert.strictEqual(needsPlayerInput('ROLE', 'captain', 'disengage', 'ALL'), true);
      assert.strictEqual(needsPlayerInput('ROLE', 'gunner', 'fire', 'ALL'), true);
      assert.strictEqual(needsPlayerInput('ROLE', 'pilot', 'evasive', 'ALL'), true);
      assert.strictEqual(needsPlayerInput('ROLE', 'engineer', 'repair', 'ALL'), true);
      assert.strictEqual(needsPlayerInput('ROLE', 'sensors', 'scan', 'ALL'), true);
      assert.strictEqual(needsPlayerInput('ROLE', 'marines', 'board', 'ALL'), true);
    });

    it('ROLE mode defaults to ALL when no activeRole specified', () => {
      assert.strictEqual(needsPlayerInput('ROLE', 'gunner', 'fire'), true);
      assert.strictEqual(needsPlayerInput('ROLE', 'pilot', 'evasive'), true);
    });
  });

  describe('needsPlayerInput (role filtering)', () => {
    it('specific role only prompts that role', () => {
      assert.strictEqual(needsPlayerInput('ROLE', 'gunner', 'fire', 'gunner'), true);
      assert.strictEqual(needsPlayerInput('ROLE', 'pilot', 'evasive', 'gunner'), false);
      assert.strictEqual(needsPlayerInput('ROLE', 'captain', 'command', 'gunner'), false);
    });

    it('other roles run automatically when specific role selected', () => {
      // User selected 'pilot' - only pilot prompts, others auto
      assert.strictEqual(needsPlayerInput('ROLE', 'pilot', 'evasive', 'pilot'), true);
      assert.strictEqual(needsPlayerInput('ROLE', 'gunner', 'fire', 'pilot'), false);
      assert.strictEqual(needsPlayerInput('ROLE', 'captain', 'command', 'pilot'), false);
      assert.strictEqual(needsPlayerInput('ROLE', 'engineer', 'repair', 'pilot'), false);
    });

    it('each role can be selected for spotlight', () => {
      const roles = ['captain', 'pilot', 'gunner', 'engineer', 'sensors', 'marines'];
      for (const role of roles) {
        assert.strictEqual(needsPlayerInput('ROLE', role, 'action', role), true);
        // Others auto
        const otherRole = roles.find(r => r !== role);
        assert.strictEqual(needsPlayerInput('ROLE', otherRole, 'action', role), false);
      }
    });
  });

  describe('canSelectRole', () => {
    it('only available in ROLE mode', () => {
      assert.strictEqual(canSelectRole('AUTO'), false);
      assert.strictEqual(canSelectRole('CAPTAIN'), false);
      assert.strictEqual(canSelectRole('ROLE'), true);
    });
  });

  describe('Speed Settings', () => {
    it('returns correct delay for each speed', () => {
      assert.strictEqual(getSpeedMs('INSTANT'), 0);
      assert.strictEqual(getSpeedMs('FAST'), 250);
      assert.strictEqual(getSpeedMs('NORMAL'), 500);
      assert.strictEqual(getSpeedMs('SLOW'), 1000);
    });

    it('defaults to NORMAL for unknown speed', () => {
      assert.strictEqual(getSpeedMs('UNKNOWN'), 500);
    });

    it('cycles up: SLOW → NORMAL → FAST → INSTANT', () => {
      assert.strictEqual(cycleSpeed('SLOW', 'up'), 'NORMAL');
      assert.strictEqual(cycleSpeed('NORMAL', 'up'), 'FAST');
      assert.strictEqual(cycleSpeed('FAST', 'up'), 'INSTANT');
      assert.strictEqual(cycleSpeed('INSTANT', 'up'), 'INSTANT'); // Cap at top
    });

    it('cycles down: INSTANT → FAST → NORMAL → SLOW', () => {
      assert.strictEqual(cycleSpeed('INSTANT', 'down'), 'FAST');
      assert.strictEqual(cycleSpeed('FAST', 'down'), 'NORMAL');
      assert.strictEqual(cycleSpeed('NORMAL', 'down'), 'SLOW');
      assert.strictEqual(cycleSpeed('SLOW', 'down'), 'SLOW'); // Cap at bottom
    });
  });

  describe('Fight Mode', () => {
    it('NORMAL mode triggers escape at 75% hull or less', () => {
      assert.strictEqual(checkEscapeCondition({ mode: 'NORMAL', hull: 74, maxHull: 100 }), true);
      assert.strictEqual(checkEscapeCondition({ mode: 'NORMAL', hull: 75, maxHull: 100 }), true);
      assert.strictEqual(checkEscapeCondition({ mode: 'NORMAL', hull: 76, maxHull: 100 }), false);
    });

    it('FIGHT_TO_END mode never triggers escape', () => {
      assert.strictEqual(checkEscapeCondition({ mode: 'FIGHT_TO_END', hull: 10, maxHull: 100 }), false);
      assert.strictEqual(checkEscapeCondition({ mode: 'FIGHT_TO_END', hull: 1, maxHull: 100 }), false);
    });
  });

  describe('Constants', () => {
    it('CONTROL_MODES has 3 modes', () => {
      assert.strictEqual(CONTROL_MODES.length, 3);
      assert.ok(CONTROL_MODES.includes('AUTO'));
      assert.ok(CONTROL_MODES.includes('CAPTAIN'));
      assert.ok(CONTROL_MODES.includes('ROLE'));
    });

    it('ROLES has ALL plus 6 crew roles', () => {
      assert.strictEqual(ROLES.length, 7);
      assert.strictEqual(ROLES[0], 'ALL');
      assert.ok(ROLES.includes('captain'));
      assert.ok(ROLES.includes('pilot'));
      assert.ok(ROLES.includes('gunner'));
      assert.ok(ROLES.includes('engineer'));
      assert.ok(ROLES.includes('sensors'));
      assert.ok(ROLES.includes('marines'));
    });
  });
});
