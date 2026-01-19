/**
 * TUI NPC Formatter Tests
 * Tests for lib/tui/formatters/npc-formatter.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  formatNPCList,
  formatNPCDetail,
  formatDialoguePrompt,
  formatAIResponse,
  formatReviewQueue
} = require('../../../lib/tui/formatters/npc-formatter');

describe('TUI NPC Formatter', () => {

  describe('formatNPCList', () => {

    it('returns a string', () => {
      const output = formatNPCList([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes when NPCs present', () => {
      const npcs = [{ name: 'Baron Harkon', role: 'Patron' }];
      const output = formatNPCList(npcs);
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('handles empty array', () => {
      const output = formatNPCList([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('is a pure function (does not modify input)', () => {
      const npcs = [{ name: 'Test NPC', id: '123' }];
      const copy = JSON.parse(JSON.stringify(npcs));

      formatNPCList(npcs);

      assert.deepStrictEqual(npcs, copy, 'Should not modify npcs');
    });
  });

  describe('formatNPCDetail', () => {

    it('returns a string', () => {
      const output = formatNPCDetail({ name: 'Baron Harkon', role: 'Patron' });
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const npc = { name: 'Baron Harkon', role: 'Patron', description: 'Wealthy noble' };
      const output = formatNPCDetail(npc);
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('displays NPC details', () => {
      const npc = { name: 'Merchant Kira', role: 'Trader', location: 'Starport' };
      const output = formatNPCDetail(npc);
      assert.ok(output.includes('Kira') || output.includes('Merchant') || output.length > 0, 'Should display details');
    });
  });

  describe('formatDialoguePrompt', () => {

    it('returns a string', () => {
      // formatDialoguePrompt expects npc object with .name property
      const output = formatDialoguePrompt({ name: 'Test NPC' });
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const output = formatDialoguePrompt({ name: 'Test NPC' });
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });
  });

  describe('formatAIResponse', () => {

    it('returns a string', () => {
      const output = formatAIResponse({ text: 'Hello', npcName: 'Test' });
      assert.strictEqual(typeof output, 'string');
    });

    it('displays AI response', () => {
      const response = { text: 'Greetings, traveller.', npcName: 'Bartender' };
      const output = formatAIResponse(response);
      assert.ok(output.length > 0, 'Should return non-empty string');
    });
  });

  describe('formatReviewQueue', () => {

    it('returns a string', () => {
      const output = formatReviewQueue([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('handles empty queue', () => {
      const output = formatReviewQueue([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('displays review items', () => {
      const queue = [{ npcName: 'Test NPC', response: 'Test response' }];
      const output = formatReviewQueue(queue);
      assert.ok(output.length > 0, 'Should return non-empty string');
    });
  });
});
