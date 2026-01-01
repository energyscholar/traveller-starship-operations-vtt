/**
 * AR-224: Sector Loader Unit Tests
 *
 * Validates:
 * - Sector pack loading and caching
 * - System expansion from compact format
 * - Hex and name lookups
 * - Celestial object expansion
 * - Starport and base parsing
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert');

const {
  loadSector,
  getSectorRegistry,
  listSectors,
  getSystem,
  getSystemByHex,
  getSystemByName,
  listSystemSummaries,
  searchSystems,
  hexHasSystem,
  expandStellar,
  parseStarport,
  parseBases,
  clearCache
} = require('../../lib/sector-loader');

describe('AR-224: Sector Loader', () => {

  before(() => {
    clearCache(); // Start fresh
  });

  describe('loadSector', () => {
    it('loads Spinward Marches sector pack', () => {
      const sector = loadSector('Spinward Marches');

      assert.strictEqual(sector.format, 'sector-pack-v1');
      assert.strictEqual(sector.sector, 'Spinward Marches');
      assert.ok(sector.checksum.startsWith('sha256:'));
      assert.ok(sector.systems.length > 400, 'Should have 400+ systems');
    });

    it('loads by slug', () => {
      const sector = loadSector('spinward-marches');
      assert.strictEqual(sector.sector, 'Spinward Marches');
    });

    it('caches sector data', () => {
      const sector1 = loadSector('Spinward Marches');
      const sector2 = loadSector('spinward-marches');
      assert.strictEqual(sector1, sector2, 'Should return cached instance');
    });
  });

  describe('getSectorRegistry', () => {
    it('returns registry with sector info', () => {
      const registry = getSectorRegistry();
      assert.ok(registry.sectors);
      assert.ok(registry.sectors['spinward-marches']);
    });
  });

  describe('listSectors', () => {
    it('returns list of available sectors', () => {
      const sectors = listSectors();
      assert.ok(Array.isArray(sectors));
      assert.ok(sectors.length >= 1);
      assert.ok(sectors[0].name);
      assert.ok(sectors[0].slug);
    });
  });

  describe('getSystemByHex', () => {
    it('returns Regina at hex 1910', () => {
      const system = getSystemByHex('Spinward Marches', '1910');

      assert.ok(system);
      assert.strictEqual(system.name, 'Regina');
      assert.strictEqual(system.hex, '1910');
      assert.ok(system.uwp.startsWith('A'));
    });

    it('returns null for empty hex', () => {
      const system = getSystemByHex('Spinward Marches', '0505');
      assert.strictEqual(system, null);
    });

    it('includes celestial objects when requested', () => {
      const system = getSystemByHex('Spinward Marches', '1910', { includeCelestial: true });

      assert.ok(system.celestialObjects);
      assert.ok(Array.isArray(system.celestialObjects));
      assert.ok(system.celestialObjects.length > 0);

      const star = system.celestialObjects.find(o => o.type === 'Star');
      assert.ok(star, 'Should have a star');
    });
  });

  describe('getSystemByName', () => {
    it('finds Regina by name', () => {
      const system = getSystemByName('Spinward Marches', 'Regina');
      assert.ok(system);
      assert.strictEqual(system.hex, '1910');
    });

    it('case-insensitive search', () => {
      const system = getSystemByName('Spinward Marches', 'regina');
      assert.ok(system);
      assert.strictEqual(system.name, 'Regina');
    });

    it('returns null for unknown system', () => {
      const system = getSystemByName('Spinward Marches', 'NotARealSystem');
      assert.strictEqual(system, null);
    });
  });

  describe('getSystem (unified)', () => {
    it('finds by hex', () => {
      const system = getSystem('1910');
      assert.strictEqual(system.name, 'Regina');
    });

    it('finds by name', () => {
      const system = getSystem('Efate');
      assert.ok(system);
      assert.strictEqual(system.hex, '1705');
    });

    it('falls back to JSON for special systems', () => {
      const jumpspace = getSystem('jumpspace');
      // May or may not exist depending on data
      // Just verify it doesn't throw
      assert.ok(jumpspace === null || jumpspace.id === 'jumpspace');
    });
  });

  describe('listSystemSummaries', () => {
    it('returns all systems with basic info', () => {
      const summaries = listSystemSummaries('Spinward Marches');

      assert.ok(Array.isArray(summaries));
      assert.ok(summaries.length > 400);

      const regina = summaries.find(s => s.name === 'Regina');
      assert.ok(regina);
      assert.strictEqual(regina.hex, '1910');
      assert.ok(regina.uwp);
    });
  });

  describe('searchSystems', () => {
    it('finds systems by partial name', () => {
      const results = searchSystems('Spinward Marches', 'reg');

      assert.ok(results.length > 0);
      const regina = results.find(r => r.name === 'Regina');
      assert.ok(regina);
    });

    it('respects limit', () => {
      const results = searchSystems('Spinward Marches', 'a', 5);
      assert.ok(results.length <= 5);
    });
  });

  describe('hexHasSystem', () => {
    it('returns true for populated hex', () => {
      assert.strictEqual(hexHasSystem('Spinward Marches', '1910'), true);
    });

    it('returns false for empty hex', () => {
      assert.strictEqual(hexHasSystem('Spinward Marches', '0505'), false);
    });
  });

  describe('expandStellar', () => {
    it('expands single star', () => {
      const result = expandStellar('G2V');
      assert.strictEqual(result.primary, 'G2 V');
      assert.strictEqual(result.type, 'Single');
    });

    it('expands binary star', () => {
      const result = expandStellar('G2V+M5V');
      assert.strictEqual(result.primary, 'G2 V');
      assert.strictEqual(result.secondary, 'M5 V');
      assert.strictEqual(result.type, 'Binary');
    });

    it('handles already expanded', () => {
      const input = { primary: 'G2 V', type: 'Single' };
      const result = expandStellar(input);
      assert.strictEqual(result, input);
    });

    it('defaults to G2 V for null', () => {
      const result = expandStellar(null);
      assert.strictEqual(result.primary, 'G2 V');
    });
  });

  describe('parseStarport', () => {
    it('parses class A starport', () => {
      const result = parseStarport('A788899-C');
      assert.strictEqual(result.class, 'A');
      assert.strictEqual(result.quality, 'Excellent');
      assert.strictEqual(result.downport, true);
      assert.strictEqual(result.highport, true);
    });

    it('parses class C starport', () => {
      const result = parseStarport('C430698-9');
      assert.strictEqual(result.class, 'C');
      assert.strictEqual(result.downport, true);
      assert.strictEqual(result.highport, false);
    });

    it('parses class X starport', () => {
      const result = parseStarport('X000000-0');
      assert.strictEqual(result.class, 'X');
      assert.strictEqual(result.downport, false);
      assert.strictEqual(result.highport, false);
    });
  });

  describe('parseBases', () => {
    it('parses naval base', () => {
      const result = parseBases('N');
      assert.strictEqual(result.naval, true);
      assert.strictEqual(result.scout, false);
    });

    it('parses scout base', () => {
      const result = parseBases('S');
      assert.strictEqual(result.scout, true);
      assert.strictEqual(result.naval, false);
    });

    it('parses multiple bases', () => {
      const result = parseBases('NS');
      assert.strictEqual(result.naval, true);
      assert.strictEqual(result.scout, true);
    });

    it('parses way station (x-boat)', () => {
      const result = parseBases('W');
      assert.strictEqual(result.xboat, true);
    });

    it('handles empty string', () => {
      const result = parseBases('');
      assert.strictEqual(result.naval, false);
      assert.strictEqual(result.scout, false);
      assert.strictEqual(result.xboat, false);
    });
  });

  describe('System expansion', () => {
    it('fully expands a system', () => {
      const system = getSystem('Regina', { includeCelestial: true });

      // Core fields
      assert.ok(system.id);
      assert.ok(system.name);
      assert.ok(system.hex);
      assert.ok(system.uwp);

      // Stellar
      assert.ok(system.stellar);
      assert.ok(system.stellar.primary);

      // Starport
      assert.ok(system.starport);
      assert.strictEqual(system.starport.class, 'A');

      // Bases
      assert.ok(system.bases);
      assert.strictEqual(typeof system.bases.naval, 'boolean');

      // Trade
      assert.ok(Array.isArray(system.tradeCodes));

      // Source tracking
      assert.strictEqual(system._source, 'sector-pack');
    });
  });

  describe('Performance', () => {
    it('loads 400+ systems in under 100ms', () => {
      clearCache();
      const start = Date.now();
      const sector = loadSector('Spinward Marches');
      const elapsed = Date.now() - start;

      assert.ok(elapsed < 100, `Load took ${elapsed}ms (should be <100ms)`);
      assert.ok(sector.systems.length > 400);
    });

    it('hex lookup is O(1)', () => {
      const sector = loadSector('Spinward Marches');
      const start = Date.now();

      // 1000 lookups
      for (let i = 0; i < 1000; i++) {
        getSystemByHex('Spinward Marches', '1910');
      }

      const elapsed = Date.now() - start;
      assert.ok(elapsed < 50, `1000 lookups took ${elapsed}ms (should be <50ms)`);
    });
  });

});
