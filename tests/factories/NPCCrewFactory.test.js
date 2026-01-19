/**
 * NPCCrewFactory Tests
 * Tests for lib/factories/NPCCrewFactory.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { NPCCrewFactory, NAME_POOLS, DEFAULT_SKILLS } = require('../../lib/factories/NPCCrewFactory');

describe('NPCCrewFactory', () => {

  describe('createForShip', () => {

    it('returns array of NPCs for ship', () => {
      const requirements = { minimum: { pilot: 1, engineer: 1 } };
      const crew = NPCCrewFactory.createForShip('ship1', requirements);
      assert.ok(Array.isArray(crew), 'Should return array');
    });

    it('creates correct number of crew per role', () => {
      const requirements = { minimum: { pilot: 1, gunner: 2 } };
      const crew = NPCCrewFactory.createForShip('ship1', requirements);
      const pilots = crew.filter(c => c.role === 'pilot');
      const gunners = crew.filter(c => c.role === 'gunner');
      assert.strictEqual(pilots.length, 1, 'Should have 1 pilot');
      assert.strictEqual(gunners.length, 2, 'Should have 2 gunners');
    });

    it('handles empty requirements', () => {
      const crew = NPCCrewFactory.createForShip('ship1', {});
      assert.ok(Array.isArray(crew), 'Should return array');
    });

  });

  describe('createNPC', () => {

    it('returns single NPC object', () => {
      const npc = NPCCrewFactory.createNPC('ship1', 'pilot');
      assert.ok(npc, 'Should return NPC');
      assert.strictEqual(npc.role, 'pilot', 'Should have correct role');
    });

    it('NPC has name, role, and skill_level', () => {
      const npc = NPCCrewFactory.createNPC('ship1', 'engineer');
      assert.ok(npc.name, 'Should have name');
      assert.ok(npc.role, 'Should have role');
      assert.ok(npc.skill_level !== undefined, 'Should have skill_level');
    });

    it('accepts custom name', () => {
      const npc = NPCCrewFactory.createNPC('ship1', 'pilot', { name: 'Custom Name' });
      assert.strictEqual(npc.name, 'Custom Name', 'Should use custom name');
    });

  });

  describe('NAME_POOLS', () => {

    it('has pilot name pool', () => {
      assert.ok(NAME_POOLS.pilot, 'Should have pilot names');
      assert.ok(Array.isArray(NAME_POOLS.pilot), 'Should be array');
      assert.ok(NAME_POOLS.pilot.length > 0, 'Should have names');
    });

    it('has engineer name pool', () => {
      assert.ok(NAME_POOLS.engineer, 'Should have engineer names');
    });

    it('has gunner name pool', () => {
      assert.ok(NAME_POOLS.gunner, 'Should have gunner names');
    });

    it('has captain name pool', () => {
      assert.ok(NAME_POOLS.captain, 'Should have captain names');
    });

  });

  describe('DEFAULT_SKILLS', () => {

    it('has skill levels for common roles', () => {
      assert.ok(DEFAULT_SKILLS.pilot !== undefined, 'Should have pilot skill');
      assert.ok(DEFAULT_SKILLS.engineer !== undefined, 'Should have engineer skill');
      assert.ok(DEFAULT_SKILLS.gunner !== undefined, 'Should have gunner skill');
    });

    it('captain has higher default skill', () => {
      assert.ok(DEFAULT_SKILLS.captain >= DEFAULT_SKILLS.gunner, 'Captain should have higher skill');
    });

  });

  describe('NPC validation', () => {

    it('NPC skill_level is in valid range (0-6)', () => {
      const npc = NPCCrewFactory.createNPC('ship1', 'pilot');
      assert.ok(npc.skill_level >= 0 && npc.skill_level <= 6, 'Skill level should be reasonable');
    });

    it('NPC has ship_id set', () => {
      const npc = NPCCrewFactory.createNPC('ship1', 'pilot');
      assert.strictEqual(npc.ship_id, 'ship1', 'Should have ship_id');
    });

  });

});
