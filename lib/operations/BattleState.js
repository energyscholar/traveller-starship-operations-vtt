/**
 * BattleState - State machine for combat/drill sessions
 * AR-BD-2: Centralized combat state with validation and event emission
 */

const EventEmitter = require('events');

// Valid state transitions
const TRANSITIONS = {
  IDLE: ['COMBAT', 'DRILL_LOADING'],
  DRILL_LOADING: ['DRILL_ACTIVE', 'IDLE'],
  DRILL_ACTIVE: ['COMBAT', 'RESETTING'],
  COMBAT: ['IDLE', 'DRILL_ACTIVE', 'RESETTING'],
  RESETTING: ['DRILL_ACTIVE', 'IDLE']
};

class BattleState extends EventEmitter {
  #state = 'IDLE';
  #version = 0;
  #pcShip = null;
  #contacts = new Map();
  #snapshot = null;
  #campaignId = null;

  constructor(campaignId = null) {
    super();
    this.#campaignId = campaignId;
  }

  // === GETTERS ===
  get state() { return this.#state; }
  get version() { return this.#version; }
  get campaignId() { return this.#campaignId; }

  // === TRANSITION WITH VALIDATION ===
  transition(newState) {
    const allowed = TRANSITIONS[this.#state];
    if (!allowed?.includes(newState)) {
      throw new Error(`Invalid transition: ${this.#state} -> ${newState}`);
    }
    const oldState = this.#state;
    this.#state = newState;
    this.#version++;
    this.emit('stateChange', { from: oldState, to: newState, version: this.#version });
    return this;
  }

  // === PC SHIP MANAGEMENT ===
  setPcShip(ship) {
    if (!ship || !ship.id) {
      throw new Error('Invalid ship: must have id');
    }
    this.#pcShip = {
      id: ship.id,
      name: ship.name,
      hull: ship.current_state?.hull ?? ship.ship_data?.hull?.points ?? 100,
      maxHull: ship.ship_data?.hull?.points ?? 100,
      armor: ship.ship_data?.armor ?? 0
    };
    this.#version++;
    return this;
  }

  getPcShip() {
    return this.#pcShip ? { ...this.#pcShip } : null;
  }

  // === CONTACT MANAGEMENT ===
  addContact(contact) {
    if (!contact || !contact.id) {
      throw new Error('Invalid contact: must have id');
    }
    this.#contacts.set(contact.id, {
      id: contact.id,
      name: contact.name,
      type: contact.type,
      health: contact.health || 0,
      maxHealth: contact.max_health || 0,
      weapons: contact.weapons || [],
      gunner_skill: contact.gunner_skill || 1,
      armor: contact.armor || 0,
      disposition: contact.disposition || 'unknown',
      range_band: contact.range_band || 'distant'
    });
    this.#version++;
    return this;
  }

  getContact(id) {
    const contact = this.#contacts.get(id);
    return contact ? { ...contact } : null;
  }

  getContacts() {
    return Array.from(this.#contacts.values()).map(c => ({ ...c }));
  }

  removeContact(id) {
    if (!this.#contacts.has(id)) return false;
    this.#contacts.delete(id);
    this.#version++;
    return true;
  }

  // === ATOMIC DAMAGE WITH VALIDATION ===
  applyDamage(targetId, damage, source = 'unknown') {
    if (this.#state !== 'COMBAT' && this.#state !== 'DRILL_ACTIVE') {
      throw new Error(`Cannot apply damage in state: ${this.#state}`);
    }
    if (typeof damage !== 'number' || damage < 0) {
      throw new Error(`Invalid damage: ${damage}`);
    }

    const target = targetId === 'pcShip' ? this.#pcShip : this.#contacts.get(targetId);
    if (!target) {
      throw new Error(`Target not found: ${targetId}`);
    }

    const currentHull = targetId === 'pcShip' ? target.hull : target.health;
    const actualDamage = Math.min(damage, currentHull);
    const newHull = Math.max(0, currentHull - actualDamage);
    const destroyed = newHull === 0;

    // Update atomically
    if (targetId === 'pcShip') {
      this.#pcShip = { ...this.#pcShip, hull: newHull };
    } else {
      this.#contacts.set(targetId, { ...target, health: newHull });
    }
    this.#version++;

    const result = {
      targetId,
      targetName: target.name,
      damage: actualDamage,
      newHull,
      destroyed,
      version: this.#version,
      source
    };
    this.emit('damage', result);
    return result;
  }

  // === FULL STATE FOR RECONNECT ===
  getFullState() {
    return {
      state: this.#state,
      version: this.#version,
      campaignId: this.#campaignId,
      pcShip: this.#pcShip ? { ...this.#pcShip } : null,
      contacts: Array.from(this.#contacts.entries()).map(([id, c]) => ({ id, ...c }))
    };
  }

  // === SNAPSHOT FOR RESET (Memento) ===
  createSnapshot() {
    if (this.#state !== 'DRILL_ACTIVE' && this.#state !== 'COMBAT') {
      throw new Error(`Cannot snapshot in state: ${this.#state}`);
    }
    this.#snapshot = JSON.parse(JSON.stringify(this.getFullState()));
    return this.#snapshot;
  }

  hasSnapshot() {
    return this.#snapshot !== null;
  }

  // === ATOMIC RESET ===
  reset() {
    if (!this.#snapshot) {
      throw new Error('No snapshot available for reset');
    }
    this.transition('RESETTING');
    this.#pcShip = this.#snapshot.pcShip;
    this.#contacts = new Map(this.#snapshot.contacts.map(c => [c.id, c]));
    this.#version++;
    this.transition('DRILL_ACTIVE');
    this.emit('reset', { version: this.#version });
    return this;
  }

  // === VALIDATION HELPERS ===
  validateContactWeapons(contact) {
    if (!contact.weapons || !Array.isArray(contact.weapons)) {
      return { valid: false, error: 'Contact has no weapons array' };
    }
    for (const w of contact.weapons) {
      if (!w.name || !w.damage) {
        return { valid: false, error: `Invalid weapon: ${JSON.stringify(w)}` };
      }
    }
    return { valid: true };
  }

  validateWeaponIndex(contact, weaponIndex) {
    if (typeof weaponIndex !== 'number' || weaponIndex < 0) {
      return { valid: false, error: `Invalid weapon index: ${weaponIndex}` };
    }
    if (weaponIndex >= (contact.weapons?.length || 0)) {
      return { valid: false, error: `Weapon index ${weaponIndex} out of bounds (max: ${contact.weapons?.length - 1})` };
    }
    return { valid: true };
  }

  // === CLEAR STATE ===
  clear() {
    this.#state = 'IDLE';
    this.#pcShip = null;
    this.#contacts.clear();
    this.#snapshot = null;
    this.#version++;
    this.emit('cleared', { version: this.#version });
    return this;
  }
}

// Campaign battle states storage
const battleStates = new Map();

/**
 * Get or create BattleState for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {BattleState}
 */
function getBattleState(campaignId) {
  if (!battleStates.has(campaignId)) {
    battleStates.set(campaignId, new BattleState(campaignId));
  }
  return battleStates.get(campaignId);
}

/**
 * Clear BattleState for a campaign
 * @param {string} campaignId - Campaign ID
 */
function clearBattleState(campaignId) {
  const state = battleStates.get(campaignId);
  if (state) {
    state.clear();
    battleStates.delete(campaignId);
  }
}

module.exports = {
  BattleState,
  getBattleState,
  clearBattleState,
  TRANSITIONS
};
