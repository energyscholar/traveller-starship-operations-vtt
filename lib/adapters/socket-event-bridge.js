/**
 * AR-250: Socket Event Bridge
 *
 * Bridges EventBus to Socket.io for client updates.
 * Adapters on client can receive events published on server.
 *
 * @module lib/adapters/socket-event-bridge
 */

const { EventBus, EventTypes } = require('../engine/event-bus');
const { OperationEvents } = require('../engine/operations-event-types');

/**
 * Socket Event Bridge
 * Forwards EventBus events to Socket.io clients
 */
class SocketEventBridge {
  /**
   * Create a new socket event bridge
   * @param {EventBus} eventBus - The event bus to bridge
   * @param {object} options
   * @param {boolean} options.debug - Enable debug logging
   */
  constructor(eventBus, options = {}) {
    this.eventBus = eventBus;
    this.io = null;
    this.rooms = new Map(); // room -> Set of event types to forward
    this.debug = options.debug || false;
    this.unsubscribe = null;
  }

  /**
   * Connect to Socket.io server
   * @param {object} io - Socket.io server instance
   */
  connect(io) {
    this.io = io;

    // Subscribe to all events
    this.unsubscribe = this.eventBus.subscribe('*', (event) => {
      this.forwardEvent(event);
    });

    if (this.debug) {
      console.log('[SocketEventBridge] Connected to Socket.io');
    }
  }

  /**
   * Disconnect from Socket.io
   */
  disconnect() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.io = null;
  }

  /**
   * Register a room to receive specific event types
   * @param {string} room - Socket.io room name
   * @param {array} eventTypes - Event types to forward
   */
  registerRoom(room, eventTypes) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    for (const type of eventTypes) {
      this.rooms.get(room).add(type);
    }
  }

  /**
   * Unregister a room
   * @param {string} room
   */
  unregisterRoom(room) {
    this.rooms.delete(room);
  }

  /**
   * Forward an event to relevant rooms
   * @param {object} event - EventBus event
   */
  forwardEvent(event) {
    if (!this.io) return;

    // Check each room for interest in this event type
    for (const [room, eventTypes] of this.rooms) {
      if (eventTypes.has(event.type) || eventTypes.has('*')) {
        this.io.to(room).emit('engine:event', {
          type: event.type,
          data: event.data,
          timestamp: event.timestamp
        });

        if (this.debug) {
          console.log(`[SocketEventBridge] Forwarded ${event.type} to ${room}`);
        }
      }
    }
  }

  /**
   * Forward event to a specific room
   * @param {string} room
   * @param {string} eventType
   * @param {object} data
   */
  emitToRoom(room, eventType, data) {
    if (!this.io) return;

    this.io.to(room).emit('engine:event', {
      type: eventType,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get all registered rooms
   * @returns {array}
   */
  getRooms() {
    return Array.from(this.rooms.keys());
  }
}

/**
 * Campaign event bridge helper
 * Sets up common event forwarding for a campaign
 */
class CampaignEventBridge {
  constructor(eventBus, io, campaignId) {
    this.bridge = new SocketEventBridge(eventBus);
    this.bridge.connect(io);
    this.campaignId = campaignId;
    this.roomName = `ops:campaign:${campaignId}`;

    // Register for all combat and operation events
    const allEvents = [
      ...Object.values(EventTypes),
      ...Object.values(OperationEvents)
    ];

    this.bridge.registerRoom(this.roomName, allEvents);
  }

  /**
   * Emit an event to the campaign
   * @param {string} eventType
   * @param {object} data
   */
  emit(eventType, data) {
    this.bridge.emitToRoom(this.roomName, eventType, data);
  }

  /**
   * Disconnect the bridge
   */
  disconnect() {
    this.bridge.unregisterRoom(this.roomName);
    this.bridge.disconnect();
  }
}

/**
 * Create a socket event bridge
 * @param {EventBus} eventBus
 * @param {object} options
 * @returns {SocketEventBridge}
 */
function createSocketEventBridge(eventBus, options = {}) {
  return new SocketEventBridge(eventBus, options);
}

/**
 * Create a campaign event bridge
 * @param {EventBus} eventBus
 * @param {object} io
 * @param {string} campaignId
 * @returns {CampaignEventBridge}
 */
function createCampaignEventBridge(eventBus, io, campaignId) {
  return new CampaignEventBridge(eventBus, io, campaignId);
}

module.exports = {
  SocketEventBridge,
  CampaignEventBridge,
  createSocketEventBridge,
  createCampaignEventBridge
};
