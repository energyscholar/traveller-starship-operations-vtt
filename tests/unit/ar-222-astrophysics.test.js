/**
 * AR-222: Astrophysics Engine Unit Tests
 *
 * Key validations:
 * - Goldilocks zones are correct for stellar types
 * - Moons orbit PARENT PLANET, not star
 * - Deterministic generation (same seed = same result)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  calculateGoldilocks,
  generateGasGiant,
  generateMoons,
  generateSystem,
  generateUID,
  hashCode,
  seededRandom
} = require('../../lib/astrophysics');

describe('AR-222: Astrophysics Engine', () => {

  describe('calculateGoldilocks', () => {
    it('G-type star has goldilocks around 1 AU', () => {
      const gz = calculateGoldilocks('G2 V');
      assert.ok(gz.optimal > 0.9 && gz.optimal < 1.1, 'G-star optimal should be ~1 AU');
      assert.ok(gz.inner < gz.optimal, 'Inner edge should be inside optimal');
      assert.ok(gz.outer > gz.optimal, 'Outer edge should be outside optimal');
    });

    it('M-type red dwarf has much smaller goldilocks', () => {
      const gz = calculateGoldilocks('M2 V');
      assert.ok(gz.optimal < 0.3, 'M-dwarf optimal should be very close (<0.3 AU)');
    });

    it('A-type star has wider goldilocks', () => {
      const gz = calculateGoldilocks('A0 V');
      assert.ok(gz.optimal > 2, 'A-star optimal should be >2 AU');
    });

    it('handles unknown stellar class gracefully', () => {
      const gz = calculateGoldilocks('X9 V');
      assert.ok(gz.optimal, 'Should return a valid goldilocks even for unknown type');
    });
  });

  describe('generateMoons (CRITICAL: Parent-relative orbits)', () => {
    it('moons have parentId, not their own orbitAU', () => {
      const parent = {
        id: 'gas-giant-0',
        type: 'Gas Giant',
        subtype: 'Jupiter-like',
        name: 'Jupiter',
        radiusKm: 70000
      };

      const moons = generateMoons(parent, 12345);

      for (const moon of moons) {
        assert.strictEqual(moon.parentId, parent.id, 'Moon must reference parent');
        assert.ok(moon.orbitRadii, 'Moon must have orbit in parent radii');
        assert.ok(moon.orbitKm, 'Moon must have orbit in km from parent');
        assert.strictEqual(moon.orbitAU, undefined, 'Moon must NOT have orbitAU (they orbit parent, not star)');
      }
    });

    it('moon orbitKm is relative to parent size', () => {
      const parent = { id: 'p', type: 'Gas Giant', subtype: 'Jupiter-like', name: 'P', radiusKm: 70000 };
      const moons = generateMoons(parent, 99999);

      for (const moon of moons) {
        const expectedKm = moon.orbitRadii * parent.radiusKm;
        assert.ok(
          Math.abs(moon.orbitKm - expectedKm) < 1,
          'orbitKm should equal orbitRadii * parent.radiusKm'
        );
      }
    });

    it('moons have note explaining parent-relative orbit', () => {
      const parent = { id: 'p', type: 'Gas Giant', subtype: 'Saturn-like', name: 'P', radiusKm: 45000 };
      const moons = generateMoons(parent, 11111);

      if (moons.length > 0) {
        assert.ok(moons[0]._note, 'Moon should have explanatory note');
        assert.ok(moons[0]._note.includes('parent'), 'Note should mention parent');
      }
    });
  });

  describe('generateGasGiant', () => {
    it('places gas giant beyond frost line', () => {
      const gg = generateGasGiant('G2 V', 0, 12345);
      const goldilocks = calculateGoldilocks('G2 V');

      assert.ok(gg.orbitAU > goldilocks.outer * 2, 'Gas giant should be beyond frost line');
    });

    it('has correct type and subtype', () => {
      const gg = generateGasGiant('G2 V', 0, 12345);
      assert.strictEqual(gg.type, 'Gas Giant');
      assert.ok(gg.subtype, 'Should have a subtype');
    });

    it('first gas giant tends to be larger', () => {
      // Run many times to verify statistical bias
      let largeCount = 0;
      for (let i = 0; i < 100; i++) {
        const gg = generateGasGiant('G2 V', 0, i * 1000);
        if (gg.subtype === 'Super-Jupiter' || gg.subtype === 'Jupiter-like') {
          largeCount++;
        }
      }
      assert.ok(largeCount > 30, 'First gas giants should favor larger types');
    });
  });

  describe('generateSystem', () => {
    it('creates complete system with all components', () => {
      const objects = generateSystem('0101', 'A867974-C', 'G2 V', 2);

      const star = objects.find(o => o.type === 'Star');
      const mainworld = objects.find(o => o.isMainworld);
      const gasGiants = objects.filter(o => o.type === 'Gas Giant');

      assert.ok(star, 'System should have a star');
      assert.ok(mainworld, 'System should have a mainworld');
      assert.strictEqual(gasGiants.length, 2, 'System should have requested gas giants');
    });

    it('mainworld is in goldilocks zone', () => {
      const objects = generateSystem('0202', 'B564578-9', 'G5 V', 0);
      const mainworld = objects.find(o => o.isMainworld);
      const goldilocks = calculateGoldilocks('G5 V');

      assert.ok(
        mainworld.orbitAU >= goldilocks.inner * 0.5 &&
        mainworld.orbitAU <= goldilocks.outer * 1.5,
        'Mainworld should be near goldilocks zone'
      );
    });
  });

  describe('Deterministic generation', () => {
    it('same seed produces identical results', () => {
      const objects1 = generateSystem('0101', 'A867974-C', 'G2 V', 2);
      const objects2 = generateSystem('0101', 'A867974-C', 'G2 V', 2);

      assert.strictEqual(objects1.length, objects2.length);

      for (let i = 0; i < objects1.length; i++) {
        assert.strictEqual(objects1[i].id, objects2[i].id);
        assert.strictEqual(objects1[i].orbitAU, objects2[i].orbitAU);
      }
    });

    it('different hex produces different results', () => {
      const objects1 = generateSystem('0101', 'A867974-C', 'G2 V', 1);
      const objects2 = generateSystem('2525', 'A867974-C', 'G2 V', 1);  // More different hex

      const gg1 = objects1.find(o => o.type === 'Gas Giant');
      const gg2 = objects2.find(o => o.type === 'Gas Giant');

      // At least one property should differ
      const orbitsDiffer = gg1.orbitAU !== gg2.orbitAU;
      const subtypesDiffer = gg1.subtype !== gg2.subtype;
      const radiusDiffer = gg1.radiusKm !== gg2.radiusKm;

      assert.ok(orbitsDiffer || subtypesDiffer || radiusDiffer, 'Different hexes should produce different gas giants');
    });
  });

  describe('hashCode', () => {
    it('produces consistent hashes', () => {
      assert.strictEqual(hashCode('0101'), hashCode('0101'));
      assert.notStrictEqual(hashCode('0101'), hashCode('0102'));
    });
  });

  describe('seededRandom', () => {
    it('produces consistent sequence', () => {
      const rng1 = seededRandom(12345);
      const rng2 = seededRandom(12345);

      assert.strictEqual(rng1(), rng2());
      assert.strictEqual(rng1(), rng2());
      assert.strictEqual(rng1(), rng2());
    });

    it('produces values in [0, 1)', () => {
      const rng = seededRandom(99999);
      for (let i = 0; i < 100; i++) {
        const val = rng();
        assert.ok(val >= 0 && val < 1, 'Random value should be in [0, 1)');
      }
    });
  });

  describe('generateUID (Smart UIDs for DB override)', () => {
    it('produces deterministic UIDs from hex + type + index', () => {
      const uid1 = generateUID('1910', 'star', 0);
      const uid2 = generateUID('1910', 'star', 0);
      assert.strictEqual(uid1, uid2, 'Same inputs should produce same UID');
    });

    it('different hexes produce different UIDs', () => {
      const uid1 = generateUID('1910', 'star', 0);
      const uid2 = generateUID('0101', 'star', 0);
      assert.notStrictEqual(uid1, uid2, 'Different hexes should produce different UIDs');
    });

    it('UID format includes hex-type-index-hash', () => {
      const uid = generateUID('1910', 'gas-giant', 2);
      assert.ok(uid.includes('1910'), 'UID should include hex');
      assert.ok(uid.includes('gas-giant'), 'UID should include type');
      assert.ok(uid.includes('2'), 'UID should include index');
      // Hash suffix is 4 hex chars
      assert.ok(/[a-f0-9]{4}$/.test(uid), 'UID should end with hash suffix');
    });

    it('moon UIDs include parent reference', () => {
      const parentId = '1910-gas-giant-0-abc1';
      const uid = generateUID('1910', 'moon', 0, parentId);
      assert.ok(uid.includes(parentId), 'Moon UID should reference parent');
    });

    it('all system objects have smart UIDs', () => {
      const objects = generateSystem('1910', 'A788899-C', 'G2 V', 2);

      // Every object should have a UID with hex prefix
      for (const obj of objects) {
        assert.ok(obj.id, `Object ${obj.type} should have an id`);
        assert.ok(obj.id.includes('1910'), `Object ${obj.type} UID should include hex`);
      }
    });
  });
});
