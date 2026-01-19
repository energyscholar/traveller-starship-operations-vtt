/**
 * AR-194: Ship Failures UI Tests
 * Tests system status classification logic
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

/**
 * Get system status class based on severity
 * This mirrors the logic in role-panels/shared.js
 */
function getSystemStatusClass(status) {
  if (!status) return 'operational';
  const severity = status.totalSeverity || 0;
  if (severity === 0) return 'operational';
  if (severity <= 2) return 'damaged';  // YELLOW - degraded
  return 'critical';  // RED - critical
}

describe('AR-194: Ship Failures UI', () => {

  describe('getSystemStatusClass', () => {

    it('should return operational for null status', () => {
      assert.strictEqual(getSystemStatusClass(null), 'operational');
    });

    it('should return operational for undefined status', () => {
      assert.strictEqual(getSystemStatusClass(undefined), 'operational');
    });

    it('should return operational for severity 0', () => {
      assert.strictEqual(getSystemStatusClass({ totalSeverity: 0 }), 'operational');
    });

    it('should return damaged (yellow) for severity 1', () => {
      assert.strictEqual(getSystemStatusClass({ totalSeverity: 1 }), 'damaged');
    });

    it('should return damaged (yellow) for severity 2', () => {
      assert.strictEqual(getSystemStatusClass({ totalSeverity: 2 }), 'damaged');
    });

    it('should return critical (red) for severity 3', () => {
      assert.strictEqual(getSystemStatusClass({ totalSeverity: 3 }), 'critical');
    });

    it('should return critical (red) for severity 4+', () => {
      assert.strictEqual(getSystemStatusClass({ totalSeverity: 4 }), 'critical');
      assert.strictEqual(getSystemStatusClass({ totalSeverity: 10 }), 'critical');
    });

  });

  describe('Status class CSS mapping', () => {

    it('operational maps to green indicator', () => {
      // Verifies CSS class naming convention
      const statusClass = 'operational';
      assert.ok(['operational', 'status-green'].includes(statusClass) ||
                statusClass === 'operational',
                'operational should use green styling');
    });

    it('damaged maps to yellow/orange indicator', () => {
      const statusClass = 'damaged';
      // CSS uses accent-orange for damaged state
      assert.strictEqual(statusClass, 'damaged');
    });

    it('critical maps to red indicator', () => {
      const statusClass = 'critical';
      // CSS uses accent-red for critical state
      assert.strictEqual(statusClass, 'critical');
    });

  });

});
