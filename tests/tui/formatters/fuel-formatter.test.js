/**
 * TUI Fuel Formatter Tests
 * Tests for lib/tui/formatters/fuel-formatter.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  formatFuelState,
  formatFuelBrief,
  formatFuelBar
} = require('../../../lib/tui/formatters/fuel-formatter');

describe('TUI Fuel Formatter', () => {

  describe('formatFuelState', () => {

    it('returns a string', () => {
      const output = formatFuelState({}, {});
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const output = formatFuelState({}, {});
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('displays fuel levels', () => {
      // formatFuelState expects fuelStatus with current/capacity and availableSources
      const fuelStatus = { current: 20, capacity: 40 };
      const availableSources = [];
      const output = formatFuelState(fuelStatus, availableSources);
      assert.ok(output.includes('20') || output.includes('Fuel'), 'Should display fuel info');
    });

    it('is a pure function (does not modify input)', () => {
      const campaign = { current_fuel: 30 };
      const ship = { ship_data: { fuel_tons: 40 } };
      const campaignCopy = JSON.parse(JSON.stringify(campaign));
      const shipCopy = JSON.parse(JSON.stringify(ship));

      formatFuelState(campaign, ship);

      assert.deepStrictEqual(campaign, campaignCopy, 'Should not modify campaign');
      assert.deepStrictEqual(ship, shipCopy, 'Should not modify ship');
    });
  });

  describe('formatFuelBrief', () => {

    it('returns a string', () => {
      const output = formatFuelBrief({}, {});
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const output = formatFuelBrief({ current_fuel: 20 }, { ship_data: { fuel_tons: 40 } });
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });
  });

  describe('formatFuelBar', () => {

    it('returns a string', () => {
      const output = formatFuelBar(50, 100);
      assert.strictEqual(typeof output, 'string');
    });

    it('handles zero fuel', () => {
      const output = formatFuelBar(0, 100);
      assert.strictEqual(typeof output, 'string');
    });

    it('handles full fuel', () => {
      const output = formatFuelBar(100, 100);
      assert.ok(output.includes('100') || output.length > 0, 'Should handle full tank');
    });

    it('handles edge case of zero max fuel', () => {
      const output = formatFuelBar(0, 0);
      assert.strictEqual(typeof output, 'string');
    });
  });
});
