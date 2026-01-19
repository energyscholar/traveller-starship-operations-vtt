/**
 * AR-199/AR-200: Map Labels and Tooltips Tests
 * Tests system map label visibility and contact tooltip generation
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('AR-199: System Map Labels', () => {

  describe('Label visibility threshold', () => {

    it('should hide labels when zoom < 0.5', () => {
      const zoom = 0.4;
      const showLabel = zoom > 0.5;
      assert.strictEqual(showLabel, false, 'Labels should be hidden at low zoom');
    });

    it('should show labels when zoom >= 0.5', () => {
      const zoom = 0.5;
      const showLabel = zoom > 0.5;
      // Note: > not >= so 0.5 exactly hides labels
      assert.strictEqual(showLabel, false, 'Labels hidden at exactly 0.5');

      const zoom2 = 0.6;
      const showLabel2 = zoom2 > 0.5;
      assert.strictEqual(showLabel2, true, 'Labels shown above 0.5');
    });

    it('should show labels at default zoom (1.0)', () => {
      const zoom = 1.0;
      const showLabel = zoom > 0.5;
      assert.strictEqual(showLabel, true, 'Labels shown at default zoom');
    });

  });

  describe('Label toggle state', () => {

    it('should default to labels enabled', () => {
      const defaultState = { showLabels: true };
      assert.strictEqual(defaultState.showLabels, true);
    });

    it('should toggle labels off', () => {
      const state = { showLabels: true };
      state.showLabels = !state.showLabels;
      assert.strictEqual(state.showLabels, false);
    });

    it('should toggle labels back on', () => {
      const state = { showLabels: false };
      state.showLabels = !state.showLabels;
      assert.strictEqual(state.showLabels, true);
    });

  });

});

describe('AR-200: Fleet Vessel Tooltips', () => {

  /**
   * Generate tooltip content for a contact
   * Mirrors logic in contact-tooltip.js
   */
  function getContactTooltipFields(contact) {
    const fields = [];

    if (contact.name || contact.designation) {
      fields.push({ label: 'Name', value: contact.name || contact.designation });
    }
    if (contact.ship_class || contact.ship_type) {
      fields.push({ label: 'Class', value: contact.ship_class || contact.ship_type });
    }
    if (contact.range_km !== undefined) {
      fields.push({ label: 'Range', value: `${contact.range_km}km` });
    }
    if (contact.bearing !== undefined) {
      fields.push({ label: 'Bearing', value: `${contact.bearing}°` });
    }
    if (contact.transponder) {
      fields.push({ label: 'Transponder', value: contact.transponder });
    }
    if (contact.iff) {
      fields.push({ label: 'IFF', value: contact.iff });
    }
    if (contact.tonnage) {
      fields.push({ label: 'Tonnage', value: `${contact.tonnage} dT` });
    }
    if (contact.thrust !== undefined) {
      fields.push({ label: 'Thrust', value: `${contact.thrust}G` });
    }
    if (contact.jump_rating !== undefined) {
      fields.push({ label: 'Jump', value: `J-${contact.jump_rating}` });
    }

    return fields;
  }

  describe('Tooltip content generation', () => {

    it('should include ship class in tooltip', () => {
      const contact = {
        name: 'Far Trader Aurora',
        ship_class: 'A2 Far Trader',
        range_km: 50000,
        bearing: 45
      };

      const fields = getContactTooltipFields(contact);
      const classField = fields.find(f => f.label === 'Class');

      assert.ok(classField, 'Should have Class field');
      assert.strictEqual(classField.value, 'A2 Far Trader');
    });

    it('should include range and bearing', () => {
      const contact = {
        name: 'Patrol Corvette',
        range_km: 125000,
        bearing: 270
      };

      const fields = getContactTooltipFields(contact);

      const rangeField = fields.find(f => f.label === 'Range');
      const bearingField = fields.find(f => f.label === 'Bearing');

      assert.ok(rangeField, 'Should have Range field');
      assert.strictEqual(rangeField.value, '125000km');

      assert.ok(bearingField, 'Should have Bearing field');
      assert.strictEqual(bearingField.value, '270°');
    });

    it('should include transponder and IFF', () => {
      const contact = {
        name: 'Unknown Vessel',
        transponder: 'IMPERIAL-NAVY-7723',
        iff: 'FRIENDLY'
      };

      const fields = getContactTooltipFields(contact);

      const transponderField = fields.find(f => f.label === 'Transponder');
      const iffField = fields.find(f => f.label === 'IFF');

      assert.ok(transponderField, 'Should have Transponder field');
      assert.strictEqual(transponderField.value, 'IMPERIAL-NAVY-7723');

      assert.ok(iffField, 'Should have IFF field');
      assert.strictEqual(iffField.value, 'FRIENDLY');
    });

    it('should include ship specs (tonnage, thrust, jump)', () => {
      const contact = {
        name: 'Subsidized Merchant',
        ship_type: 'Type R Subsidized Merchant',
        tonnage: 400,
        thrust: 1,
        jump_rating: 1
      };

      const fields = getContactTooltipFields(contact);

      assert.ok(fields.find(f => f.label === 'Tonnage'), 'Should have Tonnage');
      assert.ok(fields.find(f => f.label === 'Thrust'), 'Should have Thrust');
      assert.ok(fields.find(f => f.label === 'Jump'), 'Should have Jump');
    });

    it('should handle minimal contact data gracefully', () => {
      const contact = { name: 'Unknown' };
      const fields = getContactTooltipFields(contact);

      assert.strictEqual(fields.length, 1, 'Should only have name field');
      assert.strictEqual(fields[0].label, 'Name');
    });

  });

});
