/**
 * AR-250: System Map Interaction Module
 *
 * Mouse and keyboard event handling for system map.
 * Extracted from system-map.js for separation of concerns.
 *
 * @module system-map-interaction
 */

import { clamp } from './system-map-calculations.js';

/**
 * Interaction handler class
 */
export class MapInteractionHandler {
  constructor(stateManager, onRedraw) {
    this.state = stateManager;
    this.onRedraw = onRedraw || (() => {});
    this.handlers = {};
  }

  /**
   * Initialize event listeners
   * @param {HTMLCanvasElement} canvas
   */
  init(canvas) {
    this.canvas = canvas;

    // Bind handlers
    this.handlers = {
      wheel: this.handleWheel.bind(this),
      mousedown: this.handleMouseDown.bind(this),
      mousemove: this.handleMouseMove.bind(this),
      mouseup: this.handleMouseUp.bind(this),
      click: this.handleClick.bind(this),
      dblclick: this.handleDoubleClick.bind(this),
      keydown: this.handleKeydown.bind(this),
      contextmenu: this.handleContextMenu.bind(this)
    };

    // Add listeners
    canvas.addEventListener('wheel', this.handlers.wheel, { passive: false });
    canvas.addEventListener('mousedown', this.handlers.mousedown);
    canvas.addEventListener('mousemove', this.handlers.mousemove);
    canvas.addEventListener('mouseup', this.handlers.mouseup);
    canvas.addEventListener('click', this.handlers.click);
    canvas.addEventListener('dblclick', this.handlers.dblclick);
    canvas.addEventListener('contextmenu', this.handlers.contextmenu);
    document.addEventListener('keydown', this.handlers.keydown);
  }

  /**
   * Remove event listeners
   */
  destroy() {
    if (!this.canvas) return;

    this.canvas.removeEventListener('wheel', this.handlers.wheel);
    this.canvas.removeEventListener('mousedown', this.handlers.mousedown);
    this.canvas.removeEventListener('mousemove', this.handlers.mousemove);
    this.canvas.removeEventListener('mouseup', this.handlers.mouseup);
    this.canvas.removeEventListener('click', this.handlers.click);
    this.canvas.removeEventListener('dblclick', this.handlers.dblclick);
    this.canvas.removeEventListener('contextmenu', this.handlers.contextmenu);
    document.removeEventListener('keydown', this.handlers.keydown);
  }

  /**
   * Handle mouse wheel (zoom)
   * @param {WheelEvent} e
   */
  handleWheel(e) {
    e.preventDefault();

    const state = this.state.getState();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = clamp(state.zoom * delta, state.MIN_ZOOM, state.MAX_ZOOM);

    // Zoom toward mouse position
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Adjust offset to zoom toward mouse
    const zoomRatio = newZoom / state.zoom;
    const offsetX = mouseX - (mouseX - state.offsetX) * zoomRatio;
    const offsetY = mouseY - (mouseY - state.offsetY) * zoomRatio;

    this.state.update({ zoom: newZoom, offsetX, offsetY });
    this.onRedraw();
  }

  /**
   * Handle mouse down (start drag)
   * @param {MouseEvent} e
   */
  handleMouseDown(e) {
    if (e.button !== 0) return; // Left button only

    const state = this.state.getState();

    // Ruler mode
    if (state.rulerMode) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.state.update({ rulerStart: { x, y }, rulerEnd: { x, y } });
      return;
    }

    // Pan mode
    this.state.update({
      isDragging: true,
      lastMouseX: e.clientX,
      lastMouseY: e.clientY
    });
  }

  /**
   * Handle mouse move (drag/hover)
   * @param {MouseEvent} e
   */
  handleMouseMove(e) {
    const state = this.state.getState();

    // Ruler dragging
    if (state.rulerMode && state.rulerStart) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.state.update({ rulerEnd: { x, y } });
      this.onRedraw();
      return;
    }

    // Panning
    if (state.isDragging) {
      const dx = e.clientX - state.lastMouseX;
      const dy = e.clientY - state.lastMouseY;

      this.state.update({
        offsetX: state.offsetX + dx,
        offsetY: state.offsetY + dy,
        lastMouseX: e.clientX,
        lastMouseY: e.clientY
      });

      this.onRedraw();
      return;
    }

    // Hover detection (if findBodyAtPosition is provided)
    if (this.findBodyAtPosition) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const body = this.findBodyAtPosition(x, y);
      this.state.update({ hoveredBody: body });
      this.onRedraw();
    }
  }

  /**
   * Handle mouse up (end drag)
   * @param {MouseEvent} e
   */
  handleMouseUp(e) {
    this.state.update({ isDragging: false });
  }

  /**
   * Handle click (select)
   * @param {MouseEvent} e
   */
  handleClick(e) {
    const state = this.state.getState();

    // Ruler mode click - clear
    if (state.rulerMode) {
      this.state.update({ rulerStart: null, rulerEnd: null });
      return;
    }

    // Body selection
    if (this.findBodyAtPosition) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const body = this.findBodyAtPosition(x, y);
      this.state.update({ selectedBody: body });

      if (this.onBodySelected) {
        this.onBodySelected(body);
      }

      this.onRedraw();
    }
  }

  /**
   * Handle double-click (center on)
   * @param {MouseEvent} e
   */
  handleDoubleClick(e) {
    if (this.findBodyAtPosition) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const body = this.findBodyAtPosition(x, y);

      if (body && this.onBodyDoubleClicked) {
        this.onBodyDoubleClicked(body);
      }
    }
  }

  /**
   * Handle keyboard input
   * @param {KeyboardEvent} e
   */
  handleKeydown(e) {
    const state = this.state.getState();

    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    switch (e.key) {
      case '+':
      case '=':
        this.state.setZoom(state.zoom * 1.2);
        this.onRedraw();
        break;

      case '-':
      case '_':
        this.state.setZoom(state.zoom / 1.2);
        this.onRedraw();
        break;

      case '0':
        // Reset view
        this.state.update({ zoom: 1, offsetX: 0, offsetY: 0 });
        this.onRedraw();
        break;

      case 'r':
      case 'R':
        // Toggle ruler mode
        if (state.rulerMode) {
          this.state.disableRuler();
        } else {
          this.state.enableRuler();
        }
        this.onRedraw();
        break;

      case 'l':
      case 'L':
        // Toggle labels
        this.state.update({ showLabels: !state.showLabels });
        this.onRedraw();
        break;

      case 'v':
      case 'V':
        // Toggle view mode
        const newMode = state.viewMode === 'isometric' ? 'topdown' : 'isometric';
        this.state.update({ viewMode: newMode });
        this.onRedraw();
        break;

      case 'Escape':
        // Clear selection and ruler
        this.state.update({
          selectedBody: null,
          rulerMode: false,
          rulerStart: null,
          rulerEnd: null
        });
        this.onRedraw();
        break;
    }
  }

  /**
   * Handle right-click (context menu)
   * @param {MouseEvent} e
   */
  handleContextMenu(e) {
    e.preventDefault();

    if (this.onContextMenu) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.onContextMenu(x, y, e.clientX, e.clientY);
    }
  }

  /**
   * Set body finder function
   * @param {function} fn
   */
  setBodyFinder(fn) {
    this.findBodyAtPosition = fn;
  }

  /**
   * Set body selection callback
   * @param {function} fn
   */
  setBodySelectedCallback(fn) {
    this.onBodySelected = fn;
  }

  /**
   * Set body double-click callback
   * @param {function} fn
   */
  setBodyDoubleClickCallback(fn) {
    this.onBodyDoubleClicked = fn;
  }

  /**
   * Set context menu callback
   * @param {function} fn
   */
  setContextMenuCallback(fn) {
    this.onContextMenu = fn;
  }
}

/**
 * Create interaction handler
 * @param {object} stateManager
 * @param {function} onRedraw
 * @returns {MapInteractionHandler}
 */
export function createInteractionHandler(stateManager, onRedraw) {
  return new MapInteractionHandler(stateManager, onRedraw);
}
