/**
 * TUI Time Formatter Tests
 * Tests for lib/tui/formatters/time-formatter.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  formatTimeState,
  formatImperialDate,
  parseImperialDate,
  formatTimeAdvancePreview,
  formatTimeBrief
} = require('../../../lib/tui/formatters/time-formatter');

describe('TUI Time Formatter', () => {

  describe('formatTimeState', () => {

    it('returns a string', () => {
      const output = formatTimeState({}, {});
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const output = formatTimeState({}, {});
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('handles null/undefined input', () => {
      assert.doesNotThrow(() => formatTimeState(null, null));
      assert.doesNotThrow(() => formatTimeState(undefined, undefined));
    });

    it('displays time information', () => {
      const campaign = { current_date: '1105-001 08:00' };
      const output = formatTimeState(campaign, {});
      assert.ok(output.length > 0, 'Should return non-empty string');
    });

    it('is a pure function (does not modify input)', () => {
      const campaign = { current_date: '1105-001 08:00' };
      const timeState = { timeLocked: false };
      const campaignCopy = JSON.parse(JSON.stringify(campaign));
      const timeStateCopy = JSON.parse(JSON.stringify(timeState));

      formatTimeState(campaign, timeState);

      assert.deepStrictEqual(campaign, campaignCopy, 'Should not modify campaign');
      assert.deepStrictEqual(timeState, timeStateCopy, 'Should not modify timeState');
    });
  });

  describe('formatImperialDate', () => {

    it('returns a string', () => {
      const output = formatImperialDate('1105-001');
      assert.strictEqual(typeof output, 'string');
    });

    it('returns Unknown for null input', () => {
      const output = formatImperialDate(null);
      assert.strictEqual(output, 'Unknown');
    });

    it('returns Unknown for undefined input', () => {
      const output = formatImperialDate(undefined);
      assert.strictEqual(output, 'Unknown');
    });

    it('formats valid imperial date YYYY-DDD format', () => {
      const output = formatImperialDate('1105-365');
      assert.ok(output.includes('365') && output.includes('1105'), 'Should include date components');
    });

    it('formats valid imperial date with time', () => {
      const output = formatImperialDate('1105-042 12:30');
      assert.ok(output.includes('42') && output.includes('1105'), 'Should include date components');
    });
  });

  describe('parseImperialDate', () => {

    it('returns object for valid date', () => {
      const output = parseImperialDate('1105-001');
      assert.strictEqual(typeof output, 'object');
      assert.ok(output !== null, 'Should return non-null object');
    });

    it('parses day and year correctly', () => {
      const output = parseImperialDate('1105-042');
      assert.strictEqual(output.day, 42, 'Should parse day');
      assert.strictEqual(output.year, 1105, 'Should parse year');
    });

    it('parses full date with time', () => {
      const output = parseImperialDate('1105-042 12:30');
      assert.strictEqual(output.day, 42, 'Should parse day');
      assert.strictEqual(output.year, 1105, 'Should parse year');
      assert.strictEqual(output.time, '12:30', 'Should parse time');
    });

    it('returns null for null input', () => {
      const output = parseImperialDate(null);
      assert.strictEqual(output, null);
    });

    it('returns null for malformed date', () => {
      const output = parseImperialDate('invalid');
      assert.strictEqual(output, null);
    });

    it('returns null for empty string', () => {
      const output = parseImperialDate('');
      assert.strictEqual(output, null);
    });
  });

  describe('formatTimeAdvancePreview', () => {

    it('returns a string', () => {
      const output = formatTimeAdvancePreview('1105-001 08:00', 6);
      assert.strictEqual(typeof output, 'string');
    });

    it('handles null date input', () => {
      const output = formatTimeAdvancePreview(null, 6);
      assert.strictEqual(typeof output, 'string');
    });

    it('shows hour advance for valid date', () => {
      const output = formatTimeAdvancePreview('1105-001 08:00', 6);
      assert.ok(output.includes('14') || output.includes('Day'), 'Should show advanced time');
    });
  });

  describe('formatTimeBrief', () => {

    it('returns a string', () => {
      const output = formatTimeBrief({}, {});
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes when locked', () => {
      const output = formatTimeBrief({ current_date: '1105-001 08:00' }, { timeLocked: true });
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes for locked indicator');
    });

    it('handles null campaign', () => {
      assert.doesNotThrow(() => formatTimeBrief(null, null));
    });

    it('shows Unknown for missing date', () => {
      const output = formatTimeBrief({}, {});
      assert.ok(output.includes('Unknown'), 'Should show Unknown');
    });
  });
});
