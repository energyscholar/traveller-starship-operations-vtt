/**
 * AR-250: Adapter Registry
 *
 * Central registry for all display adapters (TUI, GUI, Socket).
 * Manages adapter lifecycle and event subscriptions.
 *
 * @module lib/adapters/adapter-registry
 */

/**
 * Adapter types
 */
const ADAPTER_TYPES = {
  TUI: 'tui',      // Terminal UI
  GUI: 'gui',      // Browser DOM
  SOCKET: 'socket' // Socket.io
};

/**
 * Adapter Registry
 */
class AdapterRegistry {
  constructor() {
    this.adapters = new Map();
    this.eventBus = null;
  }

  /**
   * Set the event bus for all adapters
   * @param {EventBus} eventBus
   */
  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Register an adapter
   * @param {string} name - Unique adapter name
   * @param {object} adapter - Adapter instance
   * @param {string} type - Adapter type (tui, gui, socket)
   */
  register(name, adapter, type = ADAPTER_TYPES.TUI) {
    if (this.adapters.has(name)) {
      console.warn(`[AdapterRegistry] Replacing existing adapter: ${name}`);
      this.unregister(name);
    }

    this.adapters.set(name, {
      adapter,
      type,
      connected: false,
      registeredAt: Date.now()
    });

    // Connect adapter to event bus if available
    if (this.eventBus && adapter.connect) {
      adapter.connect(this.eventBus);
      this.adapters.get(name).connected = true;
    }
  }

  /**
   * Unregister an adapter
   * @param {string} name
   */
  unregister(name) {
    const entry = this.adapters.get(name);
    if (entry) {
      if (entry.adapter.disconnect) {
        entry.adapter.disconnect();
      }
      this.adapters.delete(name);
    }
  }

  /**
   * Get an adapter by name
   * @param {string} name
   * @returns {object|null}
   */
  get(name) {
    const entry = this.adapters.get(name);
    return entry ? entry.adapter : null;
  }

  /**
   * Get all adapters of a specific type
   * @param {string} type
   * @returns {array}
   */
  getByType(type) {
    const result = [];
    for (const [name, entry] of this.adapters) {
      if (entry.type === type) {
        result.push({ name, ...entry });
      }
    }
    return result;
  }

  /**
   * Connect all registered adapters to event bus
   */
  connectAll() {
    if (!this.eventBus) {
      console.warn('[AdapterRegistry] No event bus set');
      return;
    }

    for (const [name, entry] of this.adapters) {
      if (!entry.connected && entry.adapter.connect) {
        entry.adapter.connect(this.eventBus);
        entry.connected = true;
      }
    }
  }

  /**
   * Disconnect all adapters
   */
  disconnectAll() {
    for (const [name, entry] of this.adapters) {
      if (entry.connected && entry.adapter.disconnect) {
        entry.adapter.disconnect();
        entry.connected = false;
      }
    }
  }

  /**
   * Get registry status
   * @returns {object}
   */
  getStatus() {
    const status = {
      totalAdapters: this.adapters.size,
      byType: {},
      hasEventBus: !!this.eventBus
    };

    for (const type of Object.values(ADAPTER_TYPES)) {
      status.byType[type] = this.getByType(type).length;
    }

    return status;
  }

  /**
   * Clear all adapters
   */
  clear() {
    this.disconnectAll();
    this.adapters.clear();
  }
}

// Singleton instance
let registryInstance = null;

/**
 * Get the adapter registry instance
 * @returns {AdapterRegistry}
 */
function getRegistry() {
  if (!registryInstance) {
    registryInstance = new AdapterRegistry();
  }
  return registryInstance;
}

/**
 * Register an adapter (convenience function)
 * @param {string} name
 * @param {object} adapter
 * @param {string} type
 */
function registerAdapter(name, adapter, type) {
  getRegistry().register(name, adapter, type);
}

/**
 * Get an adapter (convenience function)
 * @param {string} name
 * @returns {object|null}
 */
function getAdapter(name) {
  return getRegistry().get(name);
}

module.exports = {
  ADAPTER_TYPES,
  AdapterRegistry,
  getRegistry,
  registerAdapter,
  getAdapter
};
