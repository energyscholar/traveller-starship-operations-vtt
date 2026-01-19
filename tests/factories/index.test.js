/**
 * Factory Index Tests
 * Tests for lib/factories/index.js exports
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const factories = require('../../lib/factories');

describe('Factory Index Exports', () => {

  describe('CrewFactory export', () => {

    it('exports CrewFactory class', () => {
      assert.ok(factories.CrewFactory, 'Should export CrewFactory');
      assert.ok(typeof factories.CrewFactory.createSpaceCrew === 'function',
        'Should have createSpaceCrew method');
    });

    it('exports SPACE_CREW_CONFIGS', () => {
      assert.ok(factories.SPACE_CREW_CONFIGS, 'Should export SPACE_CREW_CONFIGS');
    });

    it('exports DEFAULT_STATS', () => {
      assert.ok(factories.DEFAULT_STATS, 'Should export DEFAULT_STATS');
    });

  });

  describe('ShipFactory export', () => {

    it('exports ShipFactory class', () => {
      assert.ok(factories.ShipFactory, 'Should export ShipFactory');
      assert.ok(typeof factories.ShipFactory.create === 'function',
        'Should have create method');
    });

    it('exports SHIP_TEMPLATES', () => {
      assert.ok(factories.SHIP_TEMPLATES, 'Should export SHIP_TEMPLATES');
    });

    it('exports DEFAULT_AMMO', () => {
      assert.ok(factories.DEFAULT_AMMO, 'Should export DEFAULT_AMMO');
    });

  });

  describe('NPCCrewFactory export', () => {

    it('exports NPCCrewFactory class', () => {
      assert.ok(factories.NPCCrewFactory, 'Should export NPCCrewFactory');
      assert.ok(typeof factories.NPCCrewFactory.createForShip === 'function',
        'Should have createForShip method');
    });

    it('exports NAME_POOLS', () => {
      assert.ok(factories.NAME_POOLS, 'Should export NAME_POOLS');
    });

    it('exports DEFAULT_SKILLS', () => {
      assert.ok(factories.DEFAULT_SKILLS, 'Should export DEFAULT_SKILLS');
    });

  });

  describe('ContactFactory NOT exported', () => {

    it('does NOT export ContactFactory directly', () => {
      // ContactFactory is intentionally not in the main index
      // It has its own module with different patterns
      assert.ok(factories.ContactFactory === undefined,
        'ContactFactory should not be in main index');
    });

  });

  describe('configuration exports', () => {

    it('exports ROLE_STAT_BONUSES', () => {
      assert.ok(factories.ROLE_STAT_BONUSES, 'Should export ROLE_STAT_BONUSES');
    });

    it('exports ROLE_SKILLS', () => {
      assert.ok(factories.ROLE_SKILLS, 'Should export ROLE_SKILLS');
    });

  });

});
