/**
 * Unit tests for turn-notification.js
 * Tests headless turn notification logic
 */

const assert = require('assert');
const {
  ROLE_ACTIONS,
  PHASE_ROLES,
  shouldShowWarning,
  shouldShowTurnModal,
  getDefaultAction,
  getRoleMenuItems,
  executeAction,
  getActiveRole
} = require('../../lib/combat/turn-notification');

describe('Turn Notification Logic', function () {

  describe('ROLE_ACTIONS', function () {
    it('should have 6 roles defined', function () {
      const roles = Object.keys(ROLE_ACTIONS);
      assert.strictEqual(roles.length, 6);
      assert.ok(roles.includes('captain'));
      assert.ok(roles.includes('pilot'));
      assert.ok(roles.includes('gunner'));
      assert.ok(roles.includes('engineer'));
      assert.ok(roles.includes('sensors'));
      assert.ok(roles.includes('damage_control'));
    });

    it('should have 4 actions per role', function () {
      for (const role of Object.keys(ROLE_ACTIONS)) {
        assert.strictEqual(ROLE_ACTIONS[role].length, 4, `${role} should have 4 actions`);
      }
    });

    it('should have exactly one default action per role', function () {
      for (const role of Object.keys(ROLE_ACTIONS)) {
        const defaults = ROLE_ACTIONS[role].filter(a => a.isDefault);
        assert.strictEqual(defaults.length, 1, `${role} should have 1 default action`);
      }
    });
  });

  describe('PHASE_ROLES', function () {
    it('should map all combat phases to roles', function () {
      assert.ok(PHASE_ROLES.initiative);
      assert.ok(PHASE_ROLES.manoeuvre);
      assert.ok(PHASE_ROLES.attack);
      assert.ok(PHASE_ROLES.reaction);
      assert.ok(PHASE_ROLES.actions);
      assert.ok(PHASE_ROLES.damage);
    });

    it('should have pilot in manoeuvre phase', function () {
      assert.ok(PHASE_ROLES.manoeuvre.includes('pilot'));
    });

    it('should have gunner in attack phase', function () {
      assert.ok(PHASE_ROLES.attack.includes('gunner'));
    });
  });

  describe('shouldShowWarning', function () {
    it('should return false for null state', function () {
      assert.strictEqual(shouldShowWarning(null, 'player'), false);
    });

    it('should return false for null playerId', function () {
      assert.strictEqual(shouldShowWarning({}, null), false);
    });

    it('should return true when player has role in current phase but not active', function () {
      const state = {
        phase: 'attack',
        currentActor: 'enemy',
        player: {
          crew: [
            { name: 'Marina', role: 'Gunner' }
          ]
        }
      };
      assert.strictEqual(shouldShowWarning(state, 'player'), true);
    });

    it('should return false when player is already active', function () {
      const state = {
        phase: 'attack',
        currentActor: 'player',
        player: {
          crew: [
            { name: 'Marina', role: 'Gunner' }
          ]
        }
      };
      assert.strictEqual(shouldShowWarning(state, 'player'), false);
    });

    it('should return false when player has no role in current phase', function () {
      const state = {
        phase: 'manoeuvre',  // Pilot phase
        currentActor: 'enemy',
        player: {
          crew: [
            { name: 'Marina', role: 'Gunner' }  // Gunner, not Pilot
          ]
        }
      };
      assert.strictEqual(shouldShowWarning(state, 'player'), false);
    });
  });

  describe('shouldShowTurnModal', function () {
    it('should return false for null state', function () {
      assert.strictEqual(shouldShowTurnModal(null, 'player'), false);
    });

    it('should return true when player is current actor', function () {
      const state = { currentActor: 'player' };
      assert.strictEqual(shouldShowTurnModal(state, 'player'), true);
    });

    it('should return false when enemy is current actor', function () {
      const state = { currentActor: 'enemy' };
      assert.strictEqual(shouldShowTurnModal(state, 'player'), false);
    });
  });

  describe('getDefaultAction', function () {
    it('should return null for unknown role', function () {
      assert.strictEqual(getDefaultAction('unknown', {}), null);
    });

    it('should return fire_primary for gunner', function () {
      const action = getDefaultAction('gunner', {});
      assert.ok(action);
      assert.strictEqual(action.id, 'fire_primary');
      assert.strictEqual(action.isDefault, true);
    });

    it('should return maintain for pilot', function () {
      const action = getDefaultAction('pilot', {});
      assert.ok(action);
      assert.strictEqual(action.id, 'maintain');
    });

    it('should return continue for captain', function () {
      const action = getDefaultAction('captain', {});
      assert.ok(action);
      assert.strictEqual(action.id, 'continue');
    });

    it('should handle role with spaces', function () {
      const action = getDefaultAction('Damage Control', {});
      assert.ok(action);
      assert.strictEqual(action.id, 'standby');
    });
  });

  describe('getRoleMenuItems', function () {
    it('should return empty array for unknown role', function () {
      const items = getRoleMenuItems('unknown', {});
      assert.strictEqual(items.length, 0);
    });

    it('should return 4 items for gunner', function () {
      const items = getRoleMenuItems('gunner', {});
      assert.strictEqual(items.length, 4);
    });

    it('should include number property starting at 1', function () {
      const items = getRoleMenuItems('gunner', {});
      assert.strictEqual(items[0].number, 1);
      assert.strictEqual(items[1].number, 2);
      assert.strictEqual(items[2].number, 3);
      assert.strictEqual(items[3].number, 4);
    });

    it('should include available property', function () {
      const items = getRoleMenuItems('gunner', {});
      assert.strictEqual(items[0].available, true);
    });

    it('should have first item as default for gunner', function () {
      const items = getRoleMenuItems('gunner', {});
      assert.strictEqual(items[0].isDefault, true);
      assert.strictEqual(items[0].id, 'fire_primary');
    });
  });

  describe('executeAction', function () {
    it('should return error for null action', function () {
      const result = executeAction(null, {});
      assert.strictEqual(result.success, false);
    });

    it('should return error for null state', function () {
      const result = executeAction({ id: 'test' }, null);
      assert.strictEqual(result.success, false);
    });

    it('should execute hold action successfully', function () {
      const result = executeAction({ id: 'hold', label: 'Hold fire' }, {});
      assert.strictEqual(result.success, true);
      assert.ok(result.message.includes('standing by'));
    });

    it('should execute evasive action and set stateChanges', function () {
      const result = executeAction({ id: 'evasive', label: 'Evasive maneuvers' }, {});
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.stateChanges.evasive, true);
    });

    it('should execute disengage action and set retreating', function () {
      const result = executeAction({ id: 'disengage', label: 'Disengage' }, {});
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.stateChanges.retreating, true);
    });
  });

  describe('getActiveRole', function () {
    it('should return null for unknown phase', function () {
      const ship = { crew: [{ name: 'Test', role: 'Gunner' }] };
      assert.strictEqual(getActiveRole('unknown', ship), null);
    });

    it('should return null for ship without crew', function () {
      assert.strictEqual(getActiveRole('attack', {}), null);
    });

    it('should return gunner for attack phase', function () {
      const ship = {
        crew: [
          { name: 'Marina', role: 'Gunner' },
          { name: 'Von Sydo', role: 'Pilot' }
        ]
      };
      const result = getActiveRole('attack', ship);
      assert.ok(result);
      assert.strictEqual(result.role, 'gunner');
      assert.strictEqual(result.crewMember.name, 'Marina');
    });

    it('should return pilot for manoeuvre phase', function () {
      const ship = {
        crew: [
          { name: 'Marina', role: 'Gunner' },
          { name: 'Von Sydo', role: 'Pilot' }
        ]
      };
      const result = getActiveRole('manoeuvre', ship);
      assert.ok(result);
      assert.strictEqual(result.role, 'pilot');
      assert.strictEqual(result.crewMember.name, 'Von Sydo');
    });
  });

});
