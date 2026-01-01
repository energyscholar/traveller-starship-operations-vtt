/**
 * AR-223: Boarding System Unit Tests
 * TDD Phase: RED then GREEN
 *
 * Based on Mongoose Traveller 2E boarding rules:
 * - Troop strength: crew ×1, marines ×2
 * - Modifiers for armor, weapons, numbers
 * - Result table based on roll difference
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  calculateTroopStrength,
  getBoardingModifiers,
  resolveBoardingAction,
  canAttemptBoarding,
  BOARDING_OUTCOMES
} = require('../../lib/boarding');

describe('AR-223: Boarding System', () => {

  describe('calculateTroopStrength', () => {

    it('counts crew as 1 strength each', () => {
      const strength = calculateTroopStrength({ crew: 10, marines: 0 });
      assert.strictEqual(strength, 10);
    });

    it('counts marines as 2 strength each', () => {
      const strength = calculateTroopStrength({ crew: 0, marines: 10 });
      assert.strictEqual(strength, 20);
    });

    it('combines crew and marines correctly', () => {
      const strength = calculateTroopStrength({ crew: 5, marines: 10 });
      assert.strictEqual(strength, 25); // 5 + (10×2)
    });

    it('adds +1 for superior armor (rating > 5)', () => {
      const strength = calculateTroopStrength({ crew: 10, marines: 0, armorRating: 6 });
      assert.strictEqual(strength, 11);
    });

    it('no bonus for armor rating <= 5', () => {
      const strength = calculateTroopStrength({ crew: 10, marines: 0, armorRating: 5 });
      assert.strictEqual(strength, 10);
    });

    it('adds +1 for superior weapons (rating >= 2)', () => {
      const strength = calculateTroopStrength({ crew: 10, marines: 0, weaponsRating: 2 });
      assert.strictEqual(strength, 11);
    });

    it('handles missing values with defaults', () => {
      const strength = calculateTroopStrength({});
      assert.strictEqual(strength, 0);
    });
  });

  describe('getBoardingModifiers', () => {

    it('adds +1 for superior armor', () => {
      const mods = getBoardingModifiers(
        { armor: 6, strength: 10, marines: 5 },
        { armor: 3, strength: 10, marines: 5 }  // Both have marines
      );
      assert.strictEqual(mods.attacker, 1);
      assert.ok(mods.breakdown.some(m => m.includes('Armor')));
    });

    it('adds +1 for superior weapons', () => {
      const mods = getBoardingModifiers(
        { weapons: 3, armor: 0, strength: 10, marines: 5 },
        { weapons: 1, armor: 0, strength: 10, marines: 5 }  // Both have marines
      );
      assert.strictEqual(mods.attacker, 1);
      assert.ok(mods.breakdown.some(m => m.includes('Weapons')));
    });

    it('adds +1 for superior numbers (2:1 ratio)', () => {
      const mods = getBoardingModifiers(
        { strength: 20, armor: 0, marines: 5 },
        { strength: 10, armor: 0, marines: 5 }  // Both have marines
      );
      assert.strictEqual(mods.attacker, 1);
      assert.ok(mods.breakdown.some(m => m.includes('Numbers')));
    });

    it('adds +3 for vastly superior numbers (4:1 ratio)', () => {
      const mods = getBoardingModifiers(
        { strength: 40, armor: 0, marines: 10 },
        { strength: 10, armor: 0, marines: 5 }  // Both have marines
      );
      assert.strictEqual(mods.attacker, 3);
      assert.ok(mods.breakdown.some(m => m.includes('Vastly')));
    });

    it('adds +2 to attacker when defender has no marines', () => {
      const mods = getBoardingModifiers(
        { marines: 10, strength: 20, armor: 0 },
        { marines: 0, strength: 10, armor: 0 }
      );
      assert.ok(mods.breakdown.some(m => m.includes('No Marines')));
      // This stacks with numbers bonus
    });

    it('defender armor bonus when superior', () => {
      const mods = getBoardingModifiers(
        { armor: 3, strength: 10, marines: 5 },
        { armor: 6, strength: 10, marines: 5 }
      );
      assert.strictEqual(mods.defender, 1);
    });

    it('combines multiple bonuses', () => {
      // Attacker has: superior armor, vastly superior numbers, no marine penalty
      const mods = getBoardingModifiers(
        { armor: 6, strength: 40, weapons: 3, marines: 10 },
        { armor: 3, strength: 10, weapons: 1, marines: 0 }
      );
      // +1 armor + +1 weapons + +3 numbers + +2 no marines = 7
      assert.ok(mods.attacker >= 5); // At minimum
    });
  });

  describe('resolveBoardingAction (MT2E result table)', () => {

    it('returns ATTACKERS_DEFEATED at -7 or worse', () => {
      const result = resolveBoardingAction(3, 10);  // diff = -7
      assert.strictEqual(result.outcome, 'ATTACKERS_DEFEATED');
      assert.strictEqual(result.counterBoardAllowed, true);
      assert.strictEqual(result.counterBoardDM, 4);
    });

    it('returns ATTACKERS_DEFEATED at -8', () => {
      const result = resolveBoardingAction(2, 10);  // diff = -8
      assert.strictEqual(result.outcome, 'ATTACKERS_DEFEATED');
    });

    it('returns ATTACKERS_RETREAT at -4 to -6', () => {
      const result = resolveBoardingAction(4, 10);  // diff = -6
      assert.strictEqual(result.outcome, 'ATTACKERS_RETREAT');

      const result2 = resolveBoardingAction(6, 10);  // diff = -4
      assert.strictEqual(result2.outcome, 'ATTACKERS_RETREAT');
    });

    it('returns FIGHTING_CONTINUES with defender advantage at -1 to -3', () => {
      const result = resolveBoardingAction(7, 10);  // diff = -3
      assert.strictEqual(result.outcome, 'FIGHTING_CONTINUES');
      assert.strictEqual(result.defenderDM, 2);
      assert.ok(result.hullDamage !== undefined);
    });

    it('returns FIGHTING_CONTINUES neutral at 0', () => {
      const result = resolveBoardingAction(10, 10);  // diff = 0
      assert.strictEqual(result.outcome, 'FIGHTING_CONTINUES');
      assert.strictEqual(result.attackerDM, 0);
      assert.strictEqual(result.defenderDM, 0);
    });

    it('returns FIGHTING_CONTINUES with attacker advantage at +1 to +3', () => {
      const result = resolveBoardingAction(13, 10);  // diff = +3
      assert.strictEqual(result.outcome, 'FIGHTING_CONTINUES');
      assert.strictEqual(result.attackerDM, 2);
    });

    it('returns SUCCESS at +4 to +6', () => {
      const result = resolveBoardingAction(14, 10);  // diff = +4
      assert.strictEqual(result.outcome, 'SUCCESS');
      assert.ok(result.roundsToControl !== undefined);
    });

    it('returns SUCCESS at +6', () => {
      const result = resolveBoardingAction(16, 10);  // diff = +6
      assert.strictEqual(result.outcome, 'SUCCESS');
    });

    it('returns IMMEDIATE_CONTROL at +7 or better', () => {
      const result = resolveBoardingAction(17, 10);  // diff = +7
      assert.strictEqual(result.outcome, 'IMMEDIATE_CONTROL');
      assert.strictEqual(result.roundsToControl, 0);
    });

    it('returns IMMEDIATE_CONTROL at +10', () => {
      const result = resolveBoardingAction(20, 10);  // diff = +10
      assert.strictEqual(result.outcome, 'IMMEDIATE_CONTROL');
    });
  });

  describe('canAttemptBoarding', () => {

    it('requires Adjacent range', () => {
      assert.strictEqual(canAttemptBoarding({
        range: 'Adjacent',
        attackerMarines: 10,
        attackerHangar: { disabled: false }
      }), true);

      assert.strictEqual(canAttemptBoarding({
        range: 'Close',
        attackerMarines: 10,
        attackerHangar: { disabled: false }
      }), false);
    });

    it('requires marines', () => {
      assert.strictEqual(canAttemptBoarding({
        range: 'Adjacent',
        attackerMarines: 0,
        attackerHangar: { disabled: false }
      }), false);
    });

    it('requires functional hangar/launch bay', () => {
      assert.strictEqual(canAttemptBoarding({
        range: 'Adjacent',
        attackerMarines: 10,
        attackerHangar: { disabled: true }
      }), false);
    });

    it('allows boarding when all requirements met', () => {
      assert.strictEqual(canAttemptBoarding({
        range: 'Adjacent',
        attackerMarines: 10,
        attackerHangar: { disabled: false }
      }), true);
    });
  });

  describe('BOARDING_OUTCOMES constant', () => {
    it('has all outcome types', () => {
      assert.ok(BOARDING_OUTCOMES.includes('ATTACKERS_DEFEATED'));
      assert.ok(BOARDING_OUTCOMES.includes('ATTACKERS_RETREAT'));
      assert.ok(BOARDING_OUTCOMES.includes('FIGHTING_CONTINUES'));
      assert.ok(BOARDING_OUTCOMES.includes('SUCCESS'));
      assert.ok(BOARDING_OUTCOMES.includes('IMMEDIATE_CONTROL'));
    });
  });
});
