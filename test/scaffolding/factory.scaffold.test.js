/**
 * Factory Pattern Scaffolding Tests
 *
 * These tests verify the factory pattern implementation during refactoring.
 * They will be removed after the design pattern refactor is complete.
 *
 * @see .claude/DESIGN-PATTERN-REFACTOR.md Stage 1
 */

const { CrewFactory, ShipFactory, NPCCrewFactory } = require('../../lib/factories');

describe('Factory Pattern - Scaffolding Tests', () => {
  describe('CrewFactory', () => {
    describe('createSpaceCrew', () => {
      test('creates scout crew with 3 members', () => {
        const crew = CrewFactory.createSpaceCrew('scout');
        expect(crew).toHaveLength(3);
        expect(crew.map(c => c.role)).toEqual(['pilot', 'gunner', 'engineer']);
      });

      test('creates free_trader crew with 4 members', () => {
        const crew = CrewFactory.createSpaceCrew('free_trader');
        expect(crew).toHaveLength(4);
        expect(crew.filter(c => c.role === 'gunner')).toHaveLength(2);
      });

      test('returns empty array for unknown ship type', () => {
        const crew = CrewFactory.createSpaceCrew('unknown');
        expect(crew).toEqual([]);
      });

      test('crew members have required properties', () => {
        const crew = CrewFactory.createSpaceCrew('scout');
        for (const member of crew) {
          expect(member).toHaveProperty('id');
          expect(member).toHaveProperty('name');
          expect(member).toHaveProperty('role');
          expect(member).toHaveProperty('skill');
          expect(member).toHaveProperty('health');
          expect(member).toHaveProperty('maxHealth');
        }
      });

      test('supports overrides', () => {
        const crew = CrewFactory.createSpaceCrew('scout', {
          pilot_1: { skill: 5 }
        });
        const pilot = crew.find(c => c.id === 'pilot_1');
        expect(pilot.skill).toBe(5);
      });
    });

    describe('createSpaceCrewMember', () => {
      test('creates crew member with defaults', () => {
        const member = CrewFactory.createSpaceCrewMember('pilot');
        expect(member.role).toBe('pilot');
        expect(member.skill).toBe(1);
        expect(member.health).toBe(10);
        expect(member.maxHealth).toBe(10);
      });

      test('accepts custom options', () => {
        const member = CrewFactory.createSpaceCrewMember('gunner', {
          id: 'custom_id',
          name: 'Custom Name',
          skill: 3
        });
        expect(member.id).toBe('custom_id');
        expect(member.name).toBe('Custom Name');
        expect(member.skill).toBe(3);
      });
    });

    describe('createGroundCrew', () => {
      test('creates ground crew with stats and skills', () => {
        const crew = CrewFactory.createGroundCrew('scout');
        expect(crew.length).toBeGreaterThan(0);

        const pilot = crew.find(c => c.role === 'pilot');
        expect(pilot).toHaveProperty('stats');
        expect(pilot).toHaveProperty('skills');
        expect(pilot.stats.dex).toBe(9); // Pilot bonus
      });
    });

    describe('validate', () => {
      test('validates correct crew member', () => {
        const member = CrewFactory.createSpaceCrewMember('pilot');
        const result = CrewFactory.validate(member);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('detects missing properties', () => {
        const result = CrewFactory.validate({});
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing id');
        expect(result.errors).toContain('Missing name');
        expect(result.errors).toContain('Missing role');
      });

      test('detects health > maxHealth', () => {
        const result = CrewFactory.validate({
          id: 'test',
          name: 'Test',
          role: 'pilot',
          health: 15,
          maxHealth: 10
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Health exceeds maxHealth');
      });
    });
  });

  describe('ShipFactory', () => {
    describe('create', () => {
      test('creates scout ship with correct defaults', () => {
        const ship = ShipFactory.create('scout');
        expect(ship.name).toBe('Scout');
        expect(ship.hull).toBe(40);
        expect(ship.maxHull).toBe(40);
        expect(ship.armor).toBe(4);
      });

      test('creates free_trader ship with correct defaults', () => {
        const ship = ShipFactory.create('free_trader');
        expect(ship.name).toBe('Free Trader');
        expect(ship.hull).toBe(80);
        expect(ship.maxHull).toBe(80);
        expect(ship.armor).toBe(2);
      });

      test('throws for unknown ship type', () => {
        expect(() => ShipFactory.create('unknown')).toThrow('Unknown ship type');
      });

      test('supports overrides', () => {
        const ship = ShipFactory.create('scout', { hull: 30 });
        expect(ship.hull).toBe(30);
        expect(ship.maxHull).toBe(30); // Should sync
      });
    });

    describe('createCombatShip', () => {
      test('creates combat-ready ship', () => {
        const ship = ShipFactory.createCombatShip('player1', 'scout');
        expect(ship.id).toBe('player1');
        expect(ship.ship).toBe('scout');
        expect(ship.crew).toHaveLength(3);
        expect(ship.criticals).toEqual([]);
        expect(ship.ammo.missiles).toBe(12);
        expect(ship.ammo.sandcasters).toBe(20);
      });

      test('accepts custom crew', () => {
        const customCrew = [{ id: 'c1', name: 'Custom', role: 'pilot', skill: 5, health: 10, maxHealth: 10 }];
        const ship = ShipFactory.createCombatShip('player1', 'scout', customCrew);
        expect(ship.crew).toEqual(customCrew);
      });
    });

    describe('getAvailableTypes', () => {
      test('returns available ship types', () => {
        const types = ShipFactory.getAvailableTypes();
        expect(types).toContain('scout');
        expect(types).toContain('free_trader');
      });
    });

    describe('validate', () => {
      test('validates correct ship', () => {
        const ship = ShipFactory.create('scout');
        const result = ShipFactory.validate(ship);
        expect(result.valid).toBe(true);
      });

      test('detects hull > maxHull', () => {
        const result = ShipFactory.validate({
          name: 'Test',
          hull: 50,
          maxHull: 40,
          armor: 2
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Hull exceeds maxHull');
      });
    });
  });

  describe('NPCCrewFactory', () => {
    describe('createForShip', () => {
      test('creates NPC crew from requirements', () => {
        const requirements = {
          minimum: {
            pilot: 1,
            engineer: 1,
            gunner: 2
          }
        };
        const crew = NPCCrewFactory.createForShip('ship1', requirements);
        expect(crew).toHaveLength(4);
        expect(crew.filter(c => c.role === 'pilot')).toHaveLength(1);
        expect(crew.filter(c => c.role === 'gunner')).toHaveLength(2);
      });

      test('crew members have database-compatible structure', () => {
        const crew = NPCCrewFactory.createForShip('ship1', { minimum: { pilot: 1 } });
        const npc = crew[0];
        expect(npc).toHaveProperty('id');
        expect(npc).toHaveProperty('ship_id', 'ship1');
        expect(npc).toHaveProperty('name');
        expect(npc).toHaveProperty('role');
        expect(npc).toHaveProperty('skill_level');
        expect(npc).toHaveProperty('personality');
        expect(npc).toHaveProperty('is_ai');
      });

      test('uses custom ID generator', () => {
        let counter = 0;
        const generator = () => `custom_${counter++}`;
        const crew = NPCCrewFactory.createForShip('ship1', { minimum: { pilot: 1 } }, generator);
        expect(crew[0].id).toBe('custom_0');
      });
    });

    describe('createNPC', () => {
      test('creates NPC with defaults', () => {
        const npc = NPCCrewFactory.createNPC('ship1', 'pilot');
        expect(npc.ship_id).toBe('ship1');
        expect(npc.role).toBe('pilot');
        expect(npc.skill_level).toBe(1); // Pilot default
        expect(npc.is_ai).toBe(0);
      });

      test('accepts custom options', () => {
        const npc = NPCCrewFactory.createNPC('ship1', 'engineer', {
          name: 'Custom Engineer',
          skill_level: 3
        });
        expect(npc.name).toBe('Custom Engineer');
        expect(npc.skill_level).toBe(3);
      });
    });

    describe('getAvailableRoles', () => {
      test('returns all available roles', () => {
        const roles = NPCCrewFactory.getAvailableRoles();
        expect(roles).toContain('pilot');
        expect(roles).toContain('engineer');
        expect(roles).toContain('gunner');
        expect(roles).toContain('medic');
      });
    });

    describe('validate', () => {
      test('validates correct NPC', () => {
        const npc = NPCCrewFactory.createNPC('ship1', 'pilot');
        const result = NPCCrewFactory.validate(npc);
        expect(result.valid).toBe(true);
      });

      test('detects missing ship_id', () => {
        const result = NPCCrewFactory.validate({
          id: 'test',
          name: 'Test',
          role: 'pilot',
          skill_level: 1
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing ship_id');
      });
    });
  });

  describe('Factory Integration', () => {
    test('ShipFactory uses CrewFactory internally', () => {
      const ship = ShipFactory.createCombatShip('player1', 'scout');
      // Verify crew structure matches CrewFactory output
      expect(ship.crew[0]).toHaveProperty('id');
      expect(ship.crew[0]).toHaveProperty('skill');
    });

    test('factories produce consistent output', () => {
      // Multiple calls should produce structurally identical results
      const crew1 = CrewFactory.createSpaceCrew('scout');
      const crew2 = CrewFactory.createSpaceCrew('scout');

      expect(crew1.length).toBe(crew2.length);
      expect(crew1.map(c => c.role)).toEqual(crew2.map(c => c.role));
    });
  });
});
