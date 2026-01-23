/**
 * Roll20 Roll Formatter Tests
 */
const { expect } = require('chai');
const { formatRollForRoll20 } = require('../../lib/roll20/roll-formatter');

describe('Roll20 Formatter', function() {

  describe('formatRollForRoll20', function() {
    it('should format basic success roll', function() {
      const result = formatRollForRoll20({
        roller: 'Gunner',
        action: 'Attack',
        dice: [4, 5],
        total: 9,
        modifier: 2,
        result: 11,
        target: 8,
        success: true,
        effect: 3
      });

      expect(result).to.match(/^\/desc/);
      expect(result).to.include('[Gunner]');
      expect(result).to.include('Attack');
      expect(result).to.include('9+2=11');
      expect(result).to.include('Success');
    });

    it('should format failure roll', function() {
      const result = formatRollForRoll20({
        roller: 'Pilot',
        action: 'Evasion',
        dice: [2, 3],
        total: 5,
        modifier: 1,
        result: 6,
        target: 8,
        success: false,
        effect: -2
      });

      expect(result).to.include('Fail');
      expect(result).to.include('-2');
    });

    it('should handle negative modifiers', function() {
      const result = formatRollForRoll20({
        roller: 'Sensors',
        action: 'Scan',
        dice: [3, 3],
        total: 6,
        modifier: -2,
        result: 4,
        target: 8,
        success: false,
        effect: -4
      });

      expect(result).to.include('6-2=4');
    });

    it('should include details when provided', function() {
      const result = formatRollForRoll20({
        roller: 'Gunner',
        action: 'Attack',
        dice: [5, 6],
        total: 11,
        modifier: 0,
        result: 11,
        target: 8,
        success: true,
        effect: 3,
        details: 'Beam Laser vs Corsair'
      });

      expect(result).to.include('Beam Laser vs Corsair');
    });

    it('should handle zero modifiers', function() {
      const result = formatRollForRoll20({
        roller: 'Engineer',
        action: 'Repair',
        dice: [4, 4],
        total: 8,
        modifier: 0,
        result: 8,
        target: 8,
        success: true,
        effect: 0
      });

      expect(result).to.include('8=8');
    });
  });
});
