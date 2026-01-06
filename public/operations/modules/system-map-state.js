/**
 * AR-250: System Map State Module
 *
 * Centralized state management for system map.
 * Extracted from system-map.js for separation of concerns.
 *
 * @module system-map-state
 */

// Default colors
const DEFAULT_COLORS = {
  space: '#0a0a12',
  starGlow: '#fff7e6',
  orbitPath: 'rgba(100, 120, 150, 0.3)',
  planetRocky: '#8b7355',
  planetGas: '#d4a574',
  planetIce: '#a8c8dc',
  planetHabitable: '#4a7c59',
  moon: '#888888',
  asteroid: '#666666',
  selection: 'rgba(0, 255, 255, 0.5)',
  hover: 'rgba(255, 255, 255, 0.3)',
  trajectory: 'rgba(0, 200, 255, 0.6)',
  ruler: 'rgba(255, 200, 0, 0.8)'
};

// Zoom presets
export const ZOOM_PRESETS = {
  system: 0.5,
  inner: 2,
  habitable: 5,
  planet: 20,
  moon: 50,
  station: 100
};

// View modes
export const VIEW_MODES = {
  ISOMETRIC: 'isometric',
  TOPDOWN: 'topdown'
};

/**
 * Create initial state object
 * @returns {object}
 */
export function createInitialState() {
  return {
    // Canvas elements
    canvas: null,
    ctx: null,
    container: null,

    // View state
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    viewMode: VIEW_MODES.ISOMETRIC,

    // System data
    system: null,
    sector: 'Spinward Marches',
    hex: null,

    // Selection state
    selectedBody: null,
    hoveredBody: null,
    showLabels: true,

    // Ruler tool state
    rulerMode: false,
    rulerStart: null,
    rulerEnd: null,
    rulerThrust: 1,

    // Animation
    animationFrame: null,
    time: 0,

    // Constants
    AU_TO_PIXELS: 50,
    MIN_ZOOM: 0.1,
    MAX_ZOOM: 100,

    // Colors
    colors: { ...DEFAULT_COLORS }
  };
}

/**
 * State manager class for system map
 */
export class SystemMapStateManager {
  constructor() {
    this.state = createInitialState();
    this.listeners = new Map();
  }

  /**
   * Get current state
   * @returns {object}
   */
  getState() {
    return this.state;
  }

  /**
   * Update state with partial object
   * @param {object} updates
   */
  update(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    this.notifyListeners(updates, oldState);
  }

  /**
   * Subscribe to state changes
   * @param {string} key - State key to watch
   * @param {function} callback
   * @returns {function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);

    return () => {
      const callbacks = this.listeners.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of state changes
   * @param {object} updates
   * @param {object} oldState
   */
  notifyListeners(updates, oldState) {
    for (const [key, value] of Object.entries(updates)) {
      const callbacks = this.listeners.get(key) || [];
      for (const callback of callbacks) {
        callback(value, oldState[key]);
      }
    }
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.state = createInitialState();
  }

  // View state helpers

  setZoom(zoom) {
    const clamped = Math.max(this.state.MIN_ZOOM, Math.min(this.state.MAX_ZOOM, zoom));
    this.update({ zoom: clamped });
  }

  setOffset(x, y) {
    this.update({ offsetX: x, offsetY: y });
  }

  setViewMode(mode) {
    if (Object.values(VIEW_MODES).includes(mode)) {
      this.update({ viewMode: mode });
    }
  }

  // Selection helpers

  selectBody(body) {
    this.update({ selectedBody: body });
  }

  clearSelection() {
    this.update({ selectedBody: null });
  }

  setHoveredBody(body) {
    this.update({ hoveredBody: body });
  }

  // System data helpers

  setSystem(system, sector, hex) {
    this.update({ system, sector, hex });
  }

  // Ruler tool helpers

  enableRuler() {
    this.update({ rulerMode: true, rulerStart: null, rulerEnd: null });
  }

  disableRuler() {
    this.update({ rulerMode: false, rulerStart: null, rulerEnd: null });
  }

  setRulerPoints(start, end) {
    this.update({ rulerStart: start, rulerEnd: end });
  }

  setRulerThrust(thrust) {
    this.update({ rulerThrust: thrust });
  }
}

// Singleton instance
let stateManager = null;

/**
 * Get the state manager instance
 * @returns {SystemMapStateManager}
 */
export function getStateManager() {
  if (!stateManager) {
    stateManager = new SystemMapStateManager();
  }
  return stateManager;
}

export { DEFAULT_COLORS };
