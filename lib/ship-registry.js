// Ship Registry: High-performance JSON-based ship database
// Architecture: Indexed lazy-loading with L1/L2 caching
//
// Performance Strategy:
// - L1 Cache: In-memory Map of loaded ships (hot data)
// - L2 Cache: Index file (ship metadata without full definitions)
// - Lazy Loading: Ships loaded on-demand from disk
// - Normalization: Weapons stored separately, referenced by ID
//
// Optimization Techniques:
// 1. Index-first lookup: Filter ships by metadata before loading JSON
// 2. Memoization: Cache weapon lookups to avoid repeated file reads
// 3. Structural sharing: Ship templates remain immutable, instances are clones
// 4. Minimal I/O: Only load files when necessary

const fs = require('fs');
const path = require('path');

class ShipRegistry {
  constructor(options = {}) {
    // Paths
    this.dataPath = options.dataPath || path.join(__dirname, '../data');
    this.shipsPath = path.join(this.dataPath, 'ships');
    this.weaponsPath = path.join(this.dataPath, 'weapons');
    this.indexPath = path.join(this.shipsPath, 'index.json');
    this.weaponsFilePath = path.join(this.weaponsPath, 'weapons.json');

    // L1 Cache: Loaded ships (Map for O(1) lookups)
    this._shipCache = new Map();

    // L2 Cache: Index data (loaded once)
    this._index = null;

    // Weapon cache: Loaded weapons (Map for O(1) lookups)
    this._weaponCache = new Map();

    // Stats for monitoring
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      filesLoaded: 0
    };
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Get ship by ID (lazy-loaded, cached)
   * @param {string} id - Ship identifier (e.g., 'scout')
   * @returns {Object} Full ship definition with resolved weapons
   */
  getShip(id) {
    // L1 Cache hit
    if (this._shipCache.has(id)) {
      this.stats.cacheHits++;
      return this._shipCache.get(id);
    }

    // L1 Cache miss - load from disk
    this.stats.cacheMisses++;
    const ship = this._loadShipFromDisk(id);

    // Resolve weapon references (normalize -> denormalize on load)
    const shipWithWeapons = this._resolveWeapons(ship);

    // Pre-calculate derived data
    const shipWithDerived = this._addDerivedData(shipWithWeapons);

    // Store in L1 cache
    this._shipCache.set(id, shipWithDerived);

    return shipWithDerived;
  }

  /**
   * Create a ship instance (runtime state)
   * @param {string} shipTypeId - Ship type to instantiate
   * @param {Object} options - Instance customization
   * @returns {Object} Ship instance with runtime state
   */
  createShipInstance(shipTypeId, options = {}) {
    const template = this.getShip(shipTypeId);

    // Clone template (avoid mutating cached data)
    const instance = JSON.parse(JSON.stringify(template));

    // Add runtime state
    instance.instanceId = options.instanceId || this._generateInstanceId(shipTypeId);
    instance.currentHull = template.hull;
    instance.crew = {
      pilot: null,
      captain: null,
      engineer: null,
      sensors: null,
      gunners: [],
      marines: []
    };
    instance.criticals = [];
    instance.stance = options.stance || 'neutral';
    instance.position = options.position || null;

    // Override customizable fields
    if (options.name) {
      instance.customName = options.name;
    }

    return instance;
  }

  /**
   * Search ships by criteria (uses index for performance)
   * @param {Object} criteria - Search filters
   * @returns {Array} Matching ship metadata (not full ships)
   */
  searchShips(criteria = {}) {
    const index = this._getIndex();
    let results = [...index.ships];

    // Filter by role
    if (criteria.role) {
      results = results.filter(ship => ship.role === criteria.role);
    }

    // Filter by tonnage range
    if (criteria.minTonnage !== undefined) {
      results = results.filter(ship => ship.tonnage >= criteria.minTonnage);
    }
    if (criteria.maxTonnage !== undefined) {
      results = results.filter(ship => ship.tonnage <= criteria.maxTonnage);
    }

    // Filter by name (case-insensitive substring match)
    if (criteria.name) {
      const searchTerm = criteria.name.toLowerCase();
      results = results.filter(ship =>
        ship.name.toLowerCase().includes(searchTerm)
      );
    }

    return results;
  }

  /**
   * Get all ships (returns index metadata, not full ships)
   * @returns {Array} All ship metadata
   */
  listShips() {
    const index = this._getIndex();
    return [...index.ships];
  }

  /**
   * Get weapon by ID
   * @param {string} id - Weapon identifier
   * @returns {Object} Weapon definition
   */
  getWeapon(id) {
    // Check cache first
    if (this._weaponCache.has(id)) {
      return this._weaponCache.get(id);
    }

    // Load weapons file if not loaded
    if (this._weaponCache.size === 0) {
      this._loadWeapons();
    }

    return this._weaponCache.get(id) || null;
  }

  /**
   * Clear all caches (useful for testing or hot-reload)
   */
  clearCache() {
    this._shipCache.clear();
    this._weaponCache.clear();
    this._index = null;
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      filesLoaded: 0
    };
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  /**
   * Load and cache the ship index
   * @private
   */
  _getIndex() {
    if (this._index === null) {
      const indexData = fs.readFileSync(this.indexPath, 'utf8');
      this._index = JSON.parse(indexData);
      this.stats.filesLoaded++;
    }
    return this._index;
  }

  /**
   * Load ship definition from disk
   * @private
   */
  _loadShipFromDisk(id) {
    const index = this._getIndex();
    const shipMeta = index.ships.find(s => s.id === id);

    if (!shipMeta) {
      throw new Error(`Ship not found in index: ${id}`);
    }

    const shipFilePath = path.join(this.shipsPath, shipMeta.file);

    if (!fs.existsSync(shipFilePath)) {
      throw new Error(`Ship file not found: ${shipFilePath}`);
    }

    const shipData = fs.readFileSync(shipFilePath, 'utf8');
    this.stats.filesLoaded++;

    return JSON.parse(shipData);
  }

  /**
   * Load all weapons into cache
   * @private
   */
  _loadWeapons() {
    const weaponsData = fs.readFileSync(this.weaponsFilePath, 'utf8');
    const weaponsFile = JSON.parse(weaponsData);
    this.stats.filesLoaded++;

    // Build weapon cache
    for (const weapon of weaponsFile.weapons) {
      this._weaponCache.set(weapon.id, weapon);
    }
  }

  /**
   * Resolve weapon IDs to full weapon objects
   * @private
   */
  _resolveWeapons(ship) {
    const resolved = { ...ship };

    resolved.turrets = ship.turrets.map(turret => {
      const resolvedTurret = { ...turret };

      // Replace weapon IDs with full weapon objects
      resolvedTurret.weaponObjects = turret.weapons.map(weaponId => {
        const weapon = this.getWeapon(weaponId);
        if (!weapon) {
          throw new Error(`Weapon not found: ${weaponId}`);
        }
        return weapon;
      });

      return resolvedTurret;
    });

    return resolved;
  }

  /**
   * Add pre-calculated derived data
   * @private
   */
  _addDerivedData(ship) {
    const enhanced = { ...ship };

    // Pre-calculate critical hit thresholds (every 10% of hull)
    enhanced.critThresholds = this._calculateCritThresholds(ship.hull);

    // Add max hull reference
    enhanced.maxHull = ship.hull;

    return enhanced;
  }

  /**
   * Calculate critical hit thresholds
   * @private
   */
  _calculateCritThresholds(maxHull) {
    const thresholds = [];
    for (let i = 9; i >= 1; i--) {
      thresholds.push(Math.floor(maxHull * (i / 10)));
    }
    return thresholds;
  }

  /**
   * Generate unique instance ID
   * @private
   */
  _generateInstanceId(shipTypeId) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${shipTypeId}_${timestamp}_${random}`;
  }
}

// ============================================================
// SINGLETON INSTANCE (default export)
// ============================================================

let _defaultRegistry = null;

/**
 * Get the default singleton ShipRegistry instance
 * @returns {ShipRegistry}
 */
function getRegistry() {
  if (_defaultRegistry === null) {
    _defaultRegistry = new ShipRegistry();
  }
  return _defaultRegistry;
}

/**
 * Reset the default registry (for testing)
 */
function resetRegistry() {
  _defaultRegistry = null;
}

module.exports = {
  ShipRegistry,
  getRegistry,
  resetRegistry
};
