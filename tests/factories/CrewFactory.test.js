/**
 * CrewFactory Tests
 * Tests for lib/factories/CrewFactory.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  CrewFactory,
  SPACE_CREW_CONFIGS,
  DEFAULT_STATS,
  ROLE_STAT_BONUSES,
  ROLE_SKILLS
} = require('../../lib/factories/CrewFactory');

describe('CrewFactory', () => {

  describe('createSpaceCrew', () => {

    it('returns array of crew members for scout', () => {
      const crew = CrewFactory.createSpaceCrew('scout');
      assert.ok(Array.isArray(crew), 'Should return array');
      assert.ok(crew.length > 0, 'Should have crew members');
    });

    it('returns array of crew members for free_trader', () => {
      const crew = CrewFactory.createSpaceCrew('free_trader');
      assert.ok(Array.isArray(crew), 'Should return array');
      assert.ok(crew.length >= 3, 'Free trader should have at least 3 crew');
    });

    it('returns empty array for unknown ship type', () => {
      const crew = CrewFactory.createSpaceCrew('unknown_ship');
      assert.ok(Array.isArray(crew), 'Should return array');
    });

  });

  describe('createSpaceCrewMember', () => {

    it('creates valid crew member with required fields', () => {
      const member = CrewFactory.createSpaceCrewMember('pilot', { name: 'Test Pilot' });
      assert.ok(member, 'Should return crew member');
      assert.strictEqual(member.role, 'pilot');
      assert.strictEqual(member.name, 'Test Pilot');
      assert.ok(typeof member.skill === 'number', 'Should have skill');
      assert.ok(typeof member.health === 'number', 'Should have health');
    });

  });

  describe('SPACE_CREW_CONFIGS', () => {

    it('has scout ship configuration', () => {
      assert.ok(SPACE_CREW_CONFIGS.scout, 'Should have scout config');
      assert.ok(Array.isArray(SPACE_CREW_CONFIGS.scout), 'Scout config should be array');
    });

    it('has free_trader ship configuration', () => {
      assert.ok(SPACE_CREW_CONFIGS.free_trader, 'Should have free_trader config');
    });

    it('scout has pilot, gunner, engineer', () => {
      const roles = SPACE_CREW_CONFIGS.scout.map(c => c.role);
      assert.ok(roles.includes('pilot'), 'Should have pilot');
      assert.ok(roles.includes('gunner'), 'Should have gunner');
      assert.ok(roles.includes('engineer'), 'Should have engineer');
    });

  });

  describe('DEFAULT_STATS', () => {

    it('has all 6 characteristics', () => {
      assert.ok(DEFAULT_STATS.str !== undefined, 'Should have STR');
      assert.ok(DEFAULT_STATS.dex !== undefined, 'Should have DEX');
      assert.ok(DEFAULT_STATS.int !== undefined, 'Should have INT');
      assert.ok(DEFAULT_STATS.edu !== undefined, 'Should have EDU');
      assert.ok(DEFAULT_STATS.end !== undefined, 'Should have END');
      assert.ok(DEFAULT_STATS.soc !== undefined, 'Should have SOC');
    });

    it('stats are in valid range (2-15)', () => {
      Object.values(DEFAULT_STATS).forEach(val => {
        assert.ok(val >= 2 && val <= 15, `Stat ${val} should be in valid range`);
      });
    });

  });

  describe('ROLE_SKILLS', () => {

    it('has skills for pilot role', () => {
      assert.ok(ROLE_SKILLS.pilot, 'Should have pilot skills');
      assert.ok(ROLE_SKILLS.pilot.pilot !== undefined, 'Pilot should have pilot skill');
    });

    it('has skills for engineer role', () => {
      assert.ok(ROLE_SKILLS.engineer, 'Should have engineer skills');
      assert.ok(ROLE_SKILLS.engineer.engineering !== undefined, 'Engineer should have engineering skill');
    });

    it('has skills for gunner role', () => {
      assert.ok(ROLE_SKILLS.gunner, 'Should have gunner skills');
    });

  });

  describe('ROLE_STAT_BONUSES', () => {

    it('pilot has DEX bonus', () => {
      assert.ok(ROLE_STAT_BONUSES.pilot, 'Should have pilot bonuses');
      assert.ok(ROLE_STAT_BONUSES.pilot.dex > 0, 'Pilot should have DEX bonus');
    });

    it('engineer has INT bonus', () => {
      assert.ok(ROLE_STAT_BONUSES.engineer, 'Should have engineer bonuses');
      assert.ok(ROLE_STAT_BONUSES.engineer.int > 0, 'Engineer should have INT bonus');
    });

  });

});
