/**
 * V2 Bug Fix Tests
 * Test-first approach for V2 display bugs
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

// Import the ViewModel factory
const { createCaptainViewModel } = require('../../lib/viewmodels/role-viewmodels/captain-viewmodel');

describe('V2 Bug Fixes', () => {

  describe('BUG 1: Crew display shows [object Object]', () => {

    it('crewCountText should be a string with numbers, not objects', () => {
      // Setup: Create a captain viewmodel with crew
      const shipState = { alertStatus: 'NORMAL' };
      const template = { name: 'Far Trader', shipClass: 'A2 Far Trader' };
      const ship = { name: 'Aurora' };
      const crewOnline = [
        { id: '1', name: 'Captain Kirk', role: 'captain' },
        { id: '2', name: 'Spock', role: 'pilot' }
      ];
      const contacts = [];

      const vm = createCaptainViewModel(shipState, template, ship, crewOnline, contacts);

      // The bug: crewCountText shows "[object Object],[object Object]/undefined crew"
      // The fix: should show "2/2 crew" or similar
      assert.strictEqual(typeof vm.derived.crewCountText, 'string');
      assert.ok(!vm.derived.crewCountText.includes('[object Object]'),
        `crewCountText should not contain [object Object], got: "${vm.derived.crewCountText}"`);
      assert.ok(/\d+/.test(vm.derived.crewCountText),
        `crewCountText should contain numbers, got: "${vm.derived.crewCountText}"`);
    });

    it('crewCountText should show correct crew count', () => {
      const shipState = { alertStatus: 'NORMAL' };
      const template = { name: 'Far Trader' };
      const ship = { name: 'Aurora' };
      const crewOnline = [
        { id: '1', name: 'Captain Kirk', role: 'captain' },
        { id: '2', name: 'Spock', role: 'pilot' },
        { id: '3', name: 'McCoy', role: 'medic' }
      ];

      const vm = createCaptainViewModel(shipState, template, ship, crewOnline, []);

      // Should include the count "3"
      assert.ok(vm.derived.crewCountText.includes('3'),
        `crewCountText should include crew count 3, got: "${vm.derived.crewCountText}"`);
    });

    it('relieveCrew action should be enabled when crew present', () => {
      const shipState = { alertStatus: 'NORMAL' };
      const template = { name: 'Far Trader' };
      const ship = { name: 'Aurora' };
      const crewOnline = [{ id: '1', name: 'Kirk', role: 'captain' }];

      const vm = createCaptainViewModel(shipState, template, ship, crewOnline, []);

      // With crew present, relieveCrew should be enabled
      assert.strictEqual(vm.actions.relieveCrew.enabled, true,
        'relieveCrew should be enabled when crew is present');
    });

    it('relieveCrew action should be disabled when no crew', () => {
      const shipState = { alertStatus: 'NORMAL' };
      const template = { name: 'Far Trader' };
      const ship = { name: 'Aurora' };
      const crewOnline = [];

      const vm = createCaptainViewModel(shipState, template, ship, crewOnline, []);

      // With no crew, relieveCrew should be disabled
      assert.strictEqual(vm.actions.relieveCrew.enabled, false,
        'relieveCrew should be disabled when no crew');
    });
  });

  describe('BUG 2: Ship/Class shows Unknown', () => {

    it('shipNameText should show actual ship name', () => {
      const shipState = { alertStatus: 'NORMAL' };
      const template = { name: 'Far Trader', shipClass: 'A2 Far Trader' };
      const ship = { name: 'Aurora' };

      const vm = createCaptainViewModel(shipState, template, ship, [], []);

      // Should show ship name, not "Unknown"
      assert.ok(vm.derived.shipNameText !== 'Unknown',
        `shipNameText should not be "Unknown", got: "${vm.derived.shipNameText}"`);
      assert.ok(vm.derived.shipNameText.includes('Aurora') || vm.derived.shipNameText.includes('Far Trader'),
        `shipNameText should include ship name, got: "${vm.derived.shipNameText}"`);
    });

    it('shipClassText should show actual ship class', () => {
      const shipState = { alertStatus: 'NORMAL' };
      const template = { name: 'Far Trader', shipClass: 'A2 Far Trader' };
      const ship = { name: 'Aurora' };

      const vm = createCaptainViewModel(shipState, template, ship, [], []);

      // Should show ship class, not "Unknown class"
      assert.ok(vm.derived.shipClassText !== 'Unknown class',
        `shipClassText should not be "Unknown class", got: "${vm.derived.shipClassText}"`);
    });

    it('should fallback gracefully when ship data missing', () => {
      const shipState = { alertStatus: 'NORMAL' };
      const template = null;
      const ship = null;

      const vm = createCaptainViewModel(shipState, template, ship, [], []);

      // Should have graceful fallbacks
      assert.strictEqual(typeof vm.derived.shipNameText, 'string');
      assert.strictEqual(typeof vm.derived.shipClassText, 'string');
    });
  });
});
