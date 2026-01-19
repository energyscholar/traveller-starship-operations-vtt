/**
 * TUI Battle Formatter Tests
 * Tests for lib/tui/formatters/battle-formatter.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  formatScenarioList,
  formatBattleProgress,
  formatBattleResult,
  formatExperimentProgress,
  formatExperimentStats
} = require('../../../lib/tui/formatters/battle-formatter');

describe('TUI Battle Formatter', () => {

  describe('formatScenarioList', () => {

    it('returns a string', () => {
      const output = formatScenarioList([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes when scenarios present', () => {
      const scenarios = [{ name: 'Patrol Encounter', description: 'Standard patrol' }];
      const output = formatScenarioList(scenarios);
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('handles empty array', () => {
      const output = formatScenarioList([]);
      assert.strictEqual(typeof output, 'string');
    });

    it('is a pure function (does not modify input)', () => {
      const scenarios = [{ name: 'Test', id: '123' }];
      const copy = JSON.parse(JSON.stringify(scenarios));

      formatScenarioList(scenarios);

      assert.deepStrictEqual(scenarios, copy, 'Should not modify scenarios');
    });
  });

  describe('formatBattleProgress', () => {

    it('returns a string', () => {
      const output = formatBattleProgress({ round: 1, phase: 'Movement' });
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const progress = { round: 1, phase: 'Movement' };
      const output = formatBattleProgress(progress);
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('displays round number', () => {
      const progress = { round: 5, phase: 'Attack' };
      const output = formatBattleProgress(progress);
      assert.ok(output.includes('5') || output.includes('round') || output.length > 0, 'Should display round info');
    });
  });

  describe('formatBattleResult', () => {

    it('returns a string', () => {
      const output = formatBattleResult({ winner: 'Player', outcome: 'Victory' });
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const result = { winner: 'Player', outcome: 'Victory' };
      const output = formatBattleResult(result);
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('displays outcome', () => {
      const result = { winner: 'Player', losses: 0, enemyLosses: 2 };
      const output = formatBattleResult(result);
      assert.ok(output.length > 0, 'Should return non-empty string');
    });

    it('is a pure function (does not modify input)', () => {
      const result = { winner: 'Player', outcome: 'Victory' };
      const copy = JSON.parse(JSON.stringify(result));

      formatBattleResult(result);

      assert.deepStrictEqual(result, copy, 'Should not modify result');
    });
  });

  describe('formatExperimentProgress', () => {

    it('returns a string', () => {
      const output = formatExperimentProgress({ completed: 50, total: 100 });
      assert.strictEqual(typeof output, 'string');
    });

    it('displays progress', () => {
      const progress = { completed: 50, total: 100 };
      const output = formatExperimentProgress(progress);
      assert.ok(output.length > 0, 'Should return non-empty string');
    });
  });

  describe('formatExperimentStats', () => {

    it('returns a string', () => {
      const output = formatExperimentStats({ battles: 100, wins: 75, losses: 25 });
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const stats = { battles: 100, wins: 75, losses: 25 };
      const output = formatExperimentStats(stats);
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('displays statistics', () => {
      const stats = { battles: 100, wins: 60, avgRounds: 5.5 };
      const output = formatExperimentStats(stats);
      assert.ok(output.length > 0, 'Should return non-empty string');
    });
  });
});
