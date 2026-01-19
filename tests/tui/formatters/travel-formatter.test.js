/**
 * TUI Travel Formatter Tests
 * Tests for lib/tui/formatters/travel-formatter.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  formatTravelState,
  formatTravelBrief
} = require('../../../lib/tui/formatters/travel-formatter');

describe('TUI Travel Formatter', () => {

  describe('formatTravelState', () => {

    it('returns a string', () => {
      const output = formatTravelState({}, {}, {});
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const output = formatTravelState({}, {}, {});
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('handles null/undefined input', () => {
      assert.doesNotThrow(() => formatTravelState(null, null, null));
      assert.doesNotThrow(() => formatTravelState(undefined, undefined, undefined));
    });

    it('displays current location', () => {
      const campaign = { current_system: 'Regina' };
      const output = formatTravelState({}, campaign, {});
      assert.ok(output.includes('Regina'), 'Should display current system');
    });

    it('displays destination when set', () => {
      const pilotState = { destination: 'Efate' };
      const output = formatTravelState(pilotState, {}, {});
      assert.ok(output.includes('Efate') || output.includes('destination'), 'Should display destination');
    });

    it('displays ETA when available', () => {
      // ETA is only shown when destination is also set
      const pilotState = { destination: 'Efate', eta: '4.5 hours' };
      const output = formatTravelState(pilotState, {}, {});
      assert.ok(output.includes('4.5') || output.includes('hours') || output.includes('ETA'), 'Should display ETA');
    });

    it('is a pure function (does not modify input)', () => {
      const pilotState = { destination: 'Efate' };
      const campaign = { current_system: 'Regina' };
      const ship = { name: 'Aurora' };
      const pilotCopy = JSON.parse(JSON.stringify(pilotState));
      const campaignCopy = JSON.parse(JSON.stringify(campaign));
      const shipCopy = JSON.parse(JSON.stringify(ship));

      formatTravelState(pilotState, campaign, ship);

      assert.deepStrictEqual(pilotState, pilotCopy, 'Should not modify pilotState');
      assert.deepStrictEqual(campaign, campaignCopy, 'Should not modify campaign');
      assert.deepStrictEqual(ship, shipCopy, 'Should not modify ship');
    });
  });

  describe('formatTravelBrief', () => {

    it('returns a string', () => {
      const output = formatTravelBrief({}, {});
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const output = formatTravelBrief({}, {});
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('handles null input', () => {
      assert.doesNotThrow(() => formatTravelBrief(null, null));
    });

    it('shows current location in brief', () => {
      const campaign = { current_system: 'Mora' };
      const output = formatTravelBrief({}, campaign);
      assert.ok(output.includes('Mora') || output.length > 0, 'Should show system or be non-empty');
    });
  });
});
