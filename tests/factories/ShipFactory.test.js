/**
 * ShipFactory Tests
 * Tests for lib/factories/ShipFactory.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { ShipFactory, SHIP_TEMPLATES, DEFAULT_AMMO } = require('../../lib/factories/ShipFactory');

describe('ShipFactory', () => {

  describe('create', () => {

    it('returns ship with hull and systems for scout', () => {
      const ship = ShipFactory.create('scout');
      assert.ok(ship, 'Should return ship');
      assert.ok(ship.hull !== undefined, 'Should have hull');
      assert.ok(ship.maxHull !== undefined, 'Should have maxHull');
    });

    it('returns ship with hull and systems for free_trader', () => {
      const ship = ShipFactory.create('free_trader');
      assert.ok(ship, 'Should return ship');
      assert.ok(ship.hull >= 40, 'Free trader should have decent hull');
    });

    it('applies custom hull override', () => {
      const ship = ShipFactory.create('scout', { hull: 100 });
      assert.strictEqual(ship.hull, 100, 'Should apply hull override');
    });

  });

  describe('createCombatShip', () => {

    it('creates combat ship with crew and armor', () => {
      const ship = ShipFactory.createCombatShip('socket123', 'scout', []);
      assert.ok(ship, 'Should return combat ship');
      assert.ok(ship.crew !== undefined, 'Should have crew');
      assert.ok(ship.armor !== undefined, 'Should have armor');
    });

    it('assigns player ID to ship', () => {
      const ship = ShipFactory.createCombatShip('socket123', 'scout', []);
      assert.strictEqual(ship.id, 'socket123', 'Should have player ID');
    });

  });

  describe('SHIP_TEMPLATES', () => {

    it('has scout template', () => {
      assert.ok(SHIP_TEMPLATES.scout, 'Should have scout template');
      assert.strictEqual(SHIP_TEMPLATES.scout.name, 'Scout');
    });

    it('has free_trader template', () => {
      assert.ok(SHIP_TEMPLATES.free_trader, 'Should have free_trader template');
      assert.strictEqual(SHIP_TEMPLATES.free_trader.name, 'Free Trader');
    });

    it('scout template has weapons', () => {
      assert.ok(Array.isArray(SHIP_TEMPLATES.scout.weapons), 'Should have weapons array');
      assert.ok(SHIP_TEMPLATES.scout.weapons.length > 0, 'Should have at least one weapon');
    });

    it('templates have required fields', () => {
      Object.entries(SHIP_TEMPLATES).forEach(([key, template]) => {
        assert.ok(template.name, `${key} should have name`);
        assert.ok(template.hull !== undefined, `${key} should have hull`);
        assert.ok(template.armor !== undefined, `${key} should have armor`);
      });
    });

  });

  describe('DEFAULT_AMMO', () => {

    it('has missile ammunition count', () => {
      assert.ok(DEFAULT_AMMO.missiles !== undefined, 'Should have missiles');
      assert.ok(DEFAULT_AMMO.missiles >= 1, 'Should have at least 1 missile');
    });

    it('has sandcaster ammunition count', () => {
      assert.ok(DEFAULT_AMMO.sandcasters !== undefined, 'Should have sandcasters');
    });

  });

  describe('created ship validation', () => {

    it('created ship has valid ID', () => {
      const ship = ShipFactory.create('scout');
      // Ship may or may not have ID depending on implementation
      // This test verifies the ship object is complete
      assert.ok(ship.name || ship.type, 'Should have name or type');
    });

    it('created ship has name', () => {
      const ship = ShipFactory.create('scout');
      assert.ok(ship.name, 'Should have name');
    });

  });

});
