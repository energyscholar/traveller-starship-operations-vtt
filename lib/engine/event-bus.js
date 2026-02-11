/**
 * Event Bus - Custom Pub/Sub with Event History
 *
 * Core infrastructure for game engine events. Provides:
 * - Subscribe/unsubscribe pattern
 * - Event logging for replay/debugging
 * - Typed event categories
 *
 * @module lib/engine/event-bus
 */

/**
 * Event categories for type safety
 */
const EventTypes = {
  // Combat events
  ATTACK_RESOLVED: 'attack:resolved',
  DAMAGE_APPLIED: 'damage:applied',
  SHIP_DESTROYED: 'ship:destroyed',
  SYSTEM_DAMAGED: 'system:damaged',

  // Phase events
  PHASE_CHANGED: 'phase:changed',
  ROUND_STARTED: 'round:started',
  COMBAT_ENDED: 'combat:ended',

  // Initiative events
  INITIATIVE_ROLLED: 'initiative:rolled',
  TURN_STARTED: 'turn:started',

  // Defense events
  POINT_DEFENSE: 'pointDefense:fired',
  SANDCASTER: 'sandcaster:activated',
  EVASIVE_ACTION: 'evasive:applied',

  // Operations events (future)
  POWER_ALLOCATED: 'power:allocated',
  TASK_STARTED: 'task:started',
  TASK_COMPLETED: 'task:completed'
};

class EventBus {
  /**
   * Create a new event bus
   * @param {Object} options
   * @param {number} options.maxLogSize - Maximum events to retain (default 1000)
   * @param {boolean} options.debug - Log events to console (default false)
   */
  constructor(options = {}) {
    this.subscribers = new Map();
    this.eventLog = [];
    this.maxLogSize = options.maxLogSize || 1000;
    this.debug = options.debug || false;
    this.eventCounter = 0;
  }

  /**
   * Subscribe to an event type
   * @param {string} eventType - Event type from EventTypes
   * @param {Function} callback - Handler function(event)
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType).push(callback);

    // Return unsubscribe function
    return () => this.unsubscribe(eventType, callback);
  }

  /**
   * Subscribe to multiple event types at once
   * @param {Object} subscriptions - { eventType: callback, ... }
   * @returns {Function} Unsubscribe all function
   */
  subscribeMany(subscriptions) {
    const unsubscribers = [];
    for (const [eventType, callback] of Object.entries(subscriptions)) {
      unsubscribers.push(this.subscribe(eventType, callback));
    }
    return () => unsubscribers.forEach(unsub => unsub());
  }

  /**
   * Unsubscribe from an event type
   * @param {string} eventType
   * @param {Function} callback
   */
  unsubscribe(eventType, callback) {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Publish an event
   * @param {string} eventType - Event type from EventTypes
   * @param {Object} data - Event payload
   * @returns {Object} The created event
   */
  publish(eventType, data = {}) {
    const event = {
      id: this.eventCounter++,
      type: eventType,
      data,
      timestamp: Date.now()
    };

    // Log event
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }

    // Debug output
    if (this.debug) {
      console.log(`[EventBus] ${eventType}:`, JSON.stringify(data).slice(0, 100));
    }

    // Notify subscribers
    const handlers = this.subscribers.get(eventType) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (err) {
        console.error(`[EventBus] Handler error for ${eventType}:`, err.message);
      }
    }

    // Notify wildcard subscribers
    const wildcardHandlers = this.subscribers.get('*') || [];
    for (const handler of wildcardHandlers) {
      try {
        handler(event);
      } catch (err) {
        console.error(`[EventBus] Wildcard handler error:`, err.message);
      }
    }

    return event;
  }

  /**
   * Replay events from a specific point
   * @param {number} fromId - Starting event ID (inclusive)
   * @param {string} filterType - Optional: filter to specific event type
   * @returns {Array} Array of events
   */
  replay(fromId = 0, filterType = null) {
    let events = this.eventLog.filter(e => e.id >= fromId);
    if (filterType) {
      events = events.filter(e => e.type === filterType);
    }
    return events;
  }

  /**
   * Get all events of a specific type
   * @param {string} eventType
   * @returns {Array} Events of that type
   */
  getEventsByType(eventType) {
    return this.eventLog.filter(e => e.type === eventType);
  }

  /**
   * Get last N events
   * @param {number} count
   * @returns {Array}
   */
  getRecentEvents(count = 10) {
    return this.eventLog.slice(-count);
  }

  /**
   * Clear event log
   */
  clearLog() {
    this.eventLog = [];
  }

  /**
   * Clear all subscribers
   */
  clearSubscribers() {
    this.subscribers.clear();
  }

  /**
   * Reset event bus completely
   */
  reset() {
    this.clearLog();
    this.clearSubscribers();
    this.eventCounter = 0;
  }

  /**
   * Get subscriber count for an event type
   * @param {string} eventType
   * @returns {number}
   */
  subscriberCount(eventType) {
    return (this.subscribers.get(eventType) || []).length;
  }

  /**
   * Get total event count
   * @returns {number}
   */
  get eventCount() {
    return this.eventLog.length;
  }
}

module.exports = {
  EventBus,
  EventTypes
};
