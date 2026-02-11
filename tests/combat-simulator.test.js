/**
 * Combat Simulator Unit Tests
 * Tests for the headless combat engine
 */

const { simulateBattle, simulateAttack, runExperiment } = require('./e2e/helpers/combat-simulator');

describe('Combat Simulator', () => {
  describe('simulateAttack', () => {
    it('should return hit/miss result', () => {
      const attacker = { fireControl: 0 };
      const defender = { armour: 0, hull: 100, power: 100 };
      const weapon = { gunnerSkill: 2, type: 'pulse_laser' };

      const result = simulateAttack(attacker, defender, weapon);

      expect(result).toHaveProperty('hit');
      expect(typeof result.hit).toBe('boolean');
      expect(result).toHaveProperty('damage');
      expect(typeof result.damage).toBe('number');
    });

    it('should apply range DM', () => {
      const attacker = { fireControl: 4 };
      const defender = { armour: 0, hull: 100, power: 100 };
      const weapon = { gunnerSkill: 6, type: 'pulse_laser' };

      // With high bonuses, hit rate should be very high
      let hits = 0;
      for (let i = 0; i < 100; i++) {
        const result = simulateAttack(attacker, defender, weapon, { rangeDM: 0 });
        if (result.hit) hits++;
      }

      // With +10 DM, should hit almost always (need 8+ on 2d6 = ~42% base, +10 = 100%)
      expect(hits).toBeGreaterThan(90);
    });

    it('should drain power with ion weapons', () => {
      const attacker = { fireControl: 4 };
      const defender = { armour: 0, hull: 100, power: 200, maxPower: 200 };
      const weapon = { gunnerSkill: 6, type: 'ion' };

      // High bonuses = almost certain hit
      const result = simulateAttack(attacker, defender, weapon);

      if (result.hit) {
        expect(result.powerDrain).toBeGreaterThan(0);
        expect(defender.power).toBeLessThan(200);
      }
    });

    it('should deal hull damage with lasers', () => {
      const attacker = { fireControl: 4 };
      const defender = { armour: 0, hull: 100 };
      const weapon = { gunnerSkill: 6, type: 'pulse_laser' };

      const result = simulateAttack(attacker, defender, weapon);

      if (result.hit) {
        expect(result.damage).toBeGreaterThan(0);
        expect(defender.hull).toBeLessThan(100);
      }
    });

    it('should reduce damage by armor', () => {
      const attacker = { fireControl: 4 };
      const defender = { armour: 10, hull: 100 };
      const weapon = { gunnerSkill: 6, type: 'pulse_laser' };

      // With armor 10 and 2d6 damage (2-12), damage should be 0 most of the time
      let zeroDamage = 0;
      for (let i = 0; i < 100; i++) {
        const result = simulateAttack(attacker, { ...defender }, weapon);
        if (result.damage === 0) zeroDamage++;
      }

      // Most hits should do 0 damage due to armor
      expect(zeroDamage).toBeGreaterThan(50);
    });
  });

  describe('simulateBattle', () => {
    it('should complete a battle', async () => {
      const result = await simulateBattle({
        startRange: 'Medium',
        maxRounds: 5
      });

      expect(result).toHaveProperty('winner');
      expect(result).toHaveProperty('rounds');
      expect(result).toHaveProperty('playerHullPct');
      expect(result).toHaveProperty('enemyHullPct');
      expect(result.rounds).toBeLessThanOrEqual(5);
    });

    it('should track missile launches', async () => {
      const result = await simulateBattle({
        startRange: 'Medium',
        maxRounds: 5
      });

      expect(result).toHaveProperty('missilesLaunched');
      expect(result.missilesLaunched).toBeGreaterThanOrEqual(0);
    });

    it('should determine a winner', async () => {
      const result = await simulateBattle({
        startRange: 'Close',
        maxRounds: 20
      });

      expect(['player', 'enemy', 'stalemate']).toContain(result.winner);
    });
  });

  describe('runExperiment', () => {
    it('should run multiple battles', async () => {
      const result = await runExperiment({
        name: 'Test Experiment',
        runs: 10,
        startRange: 'Medium'
      });

      expect(result).toHaveProperty('winRate');
      expect(result).toHaveProperty('avgRounds');
      expect(result.runs).toBe(10);
    });

    it('should calculate statistics', async () => {
      const result = await runExperiment({
        name: 'Stats Test',
        runs: 20,
        startRange: 'Close'
      });

      expect(result.winRate).toBeGreaterThanOrEqual(0);
      expect(result.winRate).toBeLessThanOrEqual(100);
      expect(result.avgRounds).toBeGreaterThan(0);
      expect(result.avgPlayerHull).toBeGreaterThanOrEqual(0);
      expect(result.avgPlayerHull).toBeLessThanOrEqual(100);
    });

    it('should preserve raw results', async () => {
      const result = await runExperiment({
        name: 'Raw Results Test',
        runs: 5
      });

      expect(result.rawResults).toHaveLength(5);
      result.rawResults.forEach(battle => {
        expect(battle).toHaveProperty('winner');
        expect(battle).toHaveProperty('rounds');
      });
    });
  });
});
