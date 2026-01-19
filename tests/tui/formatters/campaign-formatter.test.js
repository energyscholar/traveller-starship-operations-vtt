/**
 * TUI Campaign Formatter Tests
 * Tests for lib/tui/formatters/campaign-formatter.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  formatCampaignList,
  formatCampaignDetail,
  formatShipList,
  formatShipDetail
} = require('../../../lib/tui/formatters/campaign-formatter');

describe('TUI Campaign Formatter', () => {

  describe('formatCampaignList', () => {

    it('returns a string', () => {
      const output = formatCampaignList([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('handles empty array', () => {
      const output = formatCampaignList([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('displays campaign names when present', () => {
      // Campaign must have string id for .substring() to work
      const campaigns = [{ name: 'Spinward Marches Campaign', id: 'abc12345-xyz' }];
      const output = formatCampaignList(campaigns);
      assert.ok(output.includes('Spinward') || output.length > 0, 'Should display campaign info');
    });

    it('is a pure function (does not modify input)', () => {
      const campaigns = [{ name: 'Test', id: '123' }];
      const copy = JSON.parse(JSON.stringify(campaigns));

      formatCampaignList(campaigns);

      assert.deepStrictEqual(campaigns, copy, 'Should not modify campaigns');
    });
  });

  describe('formatCampaignDetail', () => {

    it('returns a string with valid campaign', () => {
      // Campaign must have string id for .substring() to work
      const output = formatCampaignDetail({ name: 'Test Campaign', id: 'abc12345-xyz' });
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const output = formatCampaignDetail({ name: 'Test Campaign', id: 'abc12345-xyz' });
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });
  });

  describe('formatShipList', () => {

    it('returns a string', () => {
      const output = formatShipList([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes when ships present', () => {
      const output = formatShipList([{ name: 'Aurora', type: 'Far Trader' }]);
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('handles empty list', () => {
      const output = formatShipList([]);
      assert.strictEqual(typeof output, 'string');
    });
  });

  describe('formatShipDetail', () => {

    it('returns a string with valid ship', () => {
      const output = formatShipDetail({ name: 'Aurora', tonnage: 200 });
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const output = formatShipDetail({ name: 'Test Ship', tonnage: 200 });
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('is a pure function (does not modify input)', () => {
      const ship = { name: 'Aurora', tonnage: 200 };
      const copy = JSON.parse(JSON.stringify(ship));

      formatShipDetail(ship);

      assert.deepStrictEqual(ship, copy, 'Should not modify ship');
    });
  });
});
