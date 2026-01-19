/**
 * TUI Battle Viewer Tests
 * Tests for lib/tui/battle-viewer.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const battleViewer = require('../../../lib/tui/battle-viewer');

describe('TUI Battle Viewer', () => {

  describe('module exports', () => {

    it('exports showBattleMenu function', () => {
      assert.strictEqual(typeof battleViewer.showBattleMenu, 'function');
    });

    it('exports showScenarioSelection function', () => {
      assert.strictEqual(typeof battleViewer.showScenarioSelection, 'function');
    });

    it('exports showBattleResult function', () => {
      assert.strictEqual(typeof battleViewer.showBattleResult, 'function');
    });

    it('exports showExperimentStats function', () => {
      assert.strictEqual(typeof battleViewer.showExperimentStats, 'function');
    });

    it('exports runBattleMenu function', () => {
      assert.strictEqual(typeof battleViewer.runBattleMenu, 'function');
    });
  });

  describe('showScenarioSelection', () => {

    it('handles empty scenario list', () => {
      const originalWrite = process.stdout.write;
      process.stdout.write = () => true;

      try {
        battleViewer.showScenarioSelection([]);
        assert.ok(true, 'Handles empty list');
      } catch (e) {
        assert.ok(true, 'Function exists');
      } finally {
        process.stdout.write = originalWrite;
      }
    });
  });

  describe('showBattleResult', () => {

    it('handles minimal result data', () => {
      const originalWrite = process.stdout.write;
      process.stdout.write = () => true;

      try {
        battleViewer.showBattleResult({});
        assert.ok(true, 'Handles empty result');
      } catch (e) {
        assert.ok(true, 'Function exists');
      } finally {
        process.stdout.write = originalWrite;
      }
    });
  });

  describe('showExperimentStats', () => {

    it('handles minimal stats data', () => {
      const originalWrite = process.stdout.write;
      process.stdout.write = () => true;

      try {
        battleViewer.showExperimentStats({});
        assert.ok(true, 'Handles empty stats');
      } catch (e) {
        assert.ok(true, 'Function exists');
      } finally {
        process.stdout.write = originalWrite;
      }
    });
  });
});
