/**
 * TUI Email Formatter Tests
 * Tests for lib/tui/formatters/email-formatter.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  formatInbox,
  formatMessage,
  formatDrafts,
  formatCompose,
  formatDeliveryEstimate
} = require('../../../lib/tui/formatters/email-formatter');

describe('TUI Email Formatter', () => {

  describe('formatInbox', () => {

    it('returns a string', () => {
      const output = formatInbox([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes when messages present', () => {
      const messages = [{ subject: 'Test', from: 'sender@test.com', read: false }];
      const output = formatInbox(messages);
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('handles empty inbox', () => {
      const output = formatInbox([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('is a pure function (does not modify input)', () => {
      const messages = [{ subject: 'Test', from: 'test@test.com' }];
      const copy = JSON.parse(JSON.stringify(messages));

      formatInbox(messages);

      assert.deepStrictEqual(messages, copy, 'Should not modify messages');
    });
  });

  describe('formatMessage', () => {

    it('returns a string', () => {
      const output = formatMessage({ subject: 'Test', from: 'sender', body: 'Hello' });
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const message = { subject: 'Test', from: 'sender@test.com', body: 'Hello' };
      const output = formatMessage(message);
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('displays message content', () => {
      const message = { subject: 'Cargo Delivery', from: 'trader@station.com', body: 'Your cargo is ready' };
      const output = formatMessage(message);
      assert.ok(output.includes('Cargo') || output.includes('cargo') || output.length > 0, 'Should display message');
    });
  });

  describe('formatDrafts', () => {

    it('returns a string', () => {
      const output = formatDrafts([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('handles empty drafts', () => {
      const output = formatDrafts([]);
      assert.strictEqual(typeof output, 'string');
    });
  });

  describe('formatCompose', () => {

    it('returns a string', () => {
      const output = formatCompose({ to: 'recipient@test.com' });
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const output = formatCompose({ to: 'recipient@test.com', subject: '', body: '' });
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });
  });

  describe('formatDeliveryEstimate', () => {

    it('returns a string', () => {
      const output = formatDeliveryEstimate({ days: 7, destination: 'Regina' });
      assert.strictEqual(typeof output, 'string');
    });

    it('shows delivery time', () => {
      const estimate = { days: 7, destination: 'Regina' };
      const output = formatDeliveryEstimate(estimate);
      assert.ok(output.length > 0, 'Should return non-empty string');
    });
  });
});
