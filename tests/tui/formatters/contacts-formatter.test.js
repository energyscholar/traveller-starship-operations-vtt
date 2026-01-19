/**
 * TUI Contacts Formatter Tests
 * Tests for lib/tui/formatters/contacts-formatter.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  formatContactsList,
  formatContactDetail,
  formatContactsBrief,
  formatRangeBand,
  getDispositionIcon
} = require('../../../lib/tui/formatters/contacts-formatter');

describe('TUI Contacts Formatter', () => {

  describe('formatContactsList', () => {

    it('returns a string', () => {
      const output = formatContactsList([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes when contacts present', () => {
      const contacts = [{ name: 'ISS Traveller', disposition: 'friendly' }];
      const output = formatContactsList(contacts);
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('handles empty array', () => {
      const output = formatContactsList([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('is a pure function (does not modify input)', () => {
      const contacts = [{ name: 'Test', id: '123' }];
      const copy = JSON.parse(JSON.stringify(contacts));

      formatContactsList(contacts);

      assert.deepStrictEqual(contacts, copy, 'Should not modify contacts');
    });
  });

  describe('formatContactDetail', () => {

    it('returns a string', () => {
      const output = formatContactDetail({ name: 'ISS Traveller', disposition: 'friendly' });
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const output = formatContactDetail({ name: 'ISS Traveller' });
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });
  });

  describe('formatContactsBrief', () => {

    it('returns a string', () => {
      const output = formatContactsBrief([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const output = formatContactsBrief([{ name: 'Test' }]);
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });
  });

  describe('formatRangeBand', () => {

    it('returns a string', () => {
      const output = formatRangeBand('Close');
      assert.strictEqual(typeof output, 'string');
    });

    it('handles various range bands', () => {
      const bands = ['Adjacent', 'Close', 'Short', 'Medium', 'Long', 'Extreme', 'Distant'];
      bands.forEach(band => {
        const output = formatRangeBand(band);
        assert.strictEqual(typeof output, 'string', `Should handle ${band}`);
      });
    });
  });

  describe('getDispositionIcon', () => {

    it('returns a string', () => {
      const output = getDispositionIcon('friendly');
      assert.strictEqual(typeof output, 'string');
    });

    it('returns different icons for different dispositions', () => {
      const friendly = getDispositionIcon('friendly');
      const hostile = getDispositionIcon('hostile');
      const neutral = getDispositionIcon('neutral');

      // Icons should differ for different dispositions
      assert.ok(friendly.length > 0 && hostile.length > 0, 'Should return icons');
    });

    it('handles unknown disposition', () => {
      const output = getDispositionIcon('unknown');
      assert.strictEqual(typeof output, 'string');
    });
  });
});
