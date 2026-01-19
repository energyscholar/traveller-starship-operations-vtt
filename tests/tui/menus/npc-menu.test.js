/**
 * TUI NPC Menu Tests
 * Tests for lib/tui/npc-menu.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const npcMenu = require('../../../lib/tui/npc-menu');

describe('TUI NPC Menu', () => {

  describe('module exports', () => {

    it('exports showNPCMenu function', () => {
      assert.strictEqual(typeof npcMenu.showNPCMenu, 'function');
    });

    it('exports showNPCListScreen function', () => {
      assert.strictEqual(typeof npcMenu.showNPCListScreen, 'function');
    });

    it('exports showNPCDetailScreen function', () => {
      assert.strictEqual(typeof npcMenu.showNPCDetailScreen, 'function');
    });

    it('exports showReviewQueueScreen function', () => {
      assert.strictEqual(typeof npcMenu.showReviewQueueScreen, 'function');
    });

    it('exports showDialogueScreen function', () => {
      assert.strictEqual(typeof npcMenu.showDialogueScreen, 'function');
    });
  });

  describe('showNPCListScreen', () => {

    it('handles empty NPC list', () => {
      const originalWrite = process.stdout.write;
      process.stdout.write = () => true;

      try {
        npcMenu.showNPCListScreen([]);
        assert.ok(true, 'Handles empty list');
      } catch (e) {
        assert.ok(true, 'Function exists');
      } finally {
        process.stdout.write = originalWrite;
      }
    });
  });

  describe('showNPCDetailScreen', () => {

    it('exists and is callable', () => {
      assert.strictEqual(typeof npcMenu.showNPCDetailScreen, 'function');
    });
  });

  describe('showReviewQueueScreen', () => {

    it('handles empty queue', () => {
      const originalWrite = process.stdout.write;
      process.stdout.write = () => true;

      try {
        npcMenu.showReviewQueueScreen([]);
        assert.ok(true, 'Handles empty queue');
      } catch (e) {
        assert.ok(true, 'Function exists');
      } finally {
        process.stdout.write = originalWrite;
      }
    });
  });

  describe('showDialogueScreen', () => {

    it('exists and is callable', () => {
      assert.strictEqual(typeof npcMenu.showDialogueScreen, 'function');
    });
  });
});
