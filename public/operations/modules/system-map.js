/**
 * AR-29.5: Interactive Star System Map
 * Canvas-based system visualization with stars, planets, moons
 */

// AR-201 Phase 5: Import extracted rendering functions
import {
  initSystemMapRendering,
  drawBackgroundStars,
  drawStar,
  drawOrbitPath,
  drawPlanet,
  drawRings,
  drawMoons,
  drawAsteroidBelt,
  drawFullSystem,
  drawZoomIndicator,
  drawDateDisplay
} from './system-map-rendering.js';

// AR-264: Import cinematic camera
import { CinematicCamera } from './cinematic-camera.js';

console.log('[SystemMap] Module loading... v2024-12-13-UNIFIED-ZOOM-V3');

// System Map State
const systemMapState = {
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
  viewMode: 'isometric',  // AR-133: 'isometric' or 'topdown'

  // System data
  system: null,
  sector: 'Spinward Marches',  // Current sector
  hex: null,                    // Current hex (e.g., "1910")

  // AR-299: Server-provided destinations (authoritative IDs)
  serverDestinations: null,     // Array of destinations from server

  // Selection state
  selectedBody: null,          // Currently selected planet/moon
  hoveredBody: null,           // Body under mouse cursor
  showLabels: true,            // Toggle for body labels

  // AR-242: Ruler tool state
  rulerMode: false,            // Is ruler mode active
  rulerStart: null,            // {x, y} canvas coords
  rulerEnd: null,              // {x, y} canvas coords
  rulerThrust: 1,              // Selected thrust in G

  // Animation
  animationFrame: null,
  time: 0,

  // Constants
  AU_TO_PIXELS: 50,  // 1 AU = 50 pixels at zoom 1
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 100,

  // Colors
  colors: {
    space: '#0a0a12',
    starGlow: '#fff7e6',
    orbitPath: 'rgba(100, 120, 150, 0.3)',
    planetRocky: '#8b7355',
    planetGas: '#d4a574',
    planetIce: '#a8c8dc',
    planetHabitable: '#4a7c59',
    moon: '#888888',
    asteroid: '#666666'
  }
};

// =============================================================================
// AR-118: Event System
// =============================================================================

/**
 * Simple event emitter for system map events
 * Events: bodySelected, destinationSet, shipPositionUpdated, cameraAnimationComplete
 */
const systemMapEvents = {
  listeners: {},

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Handler to remove
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  },

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event payload
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[SystemMap] Event handler error for ${event}:`, err);
      }
    });
  },

  /**
   * Clear all listeners (for cleanup/testing)
   */
  clear() {
    this.listeners = {};
  }
};

// =============================================================================
// AR-113: Coordinate Helper Functions
// =============================================================================

/**
 * Get pixels per AU at given zoom level
 * @param {number} [zoom=systemMapState.zoom] - Zoom level
 * @returns {number} Pixels per AU
 */
function getAuToPixels(zoom = systemMapState.zoom) {
  return systemMapState.AU_TO_PIXELS * zoom;
}

/**
 * AR-133: Get Y scale factor based on view mode
 * @returns {number} Y scale: 0.6 for isometric, 1.0 for top-down
 */
function getYScale() {
  return systemMapState.viewMode === 'topdown' ? 1.0 : 0.6;
}

/**
 * Get orbital position at time (returns world AU coords with isometric Y)
 * Uses Kepler-ish orbital speed: slower for outer orbits
 * @param {number} orbitAU - Orbit radius in AU
 * @param {number} [time=systemMapState.time] - Simulation time
 * @returns {{x: number, y: number}} World coordinates in AU
 */
function getOrbitPosition(orbitAU, time = systemMapState.time) {
  const speed = 0.1 / Math.sqrt(orbitAU || 1);
  const angle = time * speed;
  return {
    x: Math.cos(angle) * orbitAU,
    y: Math.sin(angle) * orbitAU * getYScale()  // AR-133: Use dynamic Y scaling
  };
}

/**
 * Convert world AU coordinates to screen pixels
 * IMPORTANT: centerX/centerY already include pan offset from render()
 * @param {number} worldX - X position in AU
 * @param {number} worldY - Y position in AU (already isometric-scaled)
 * @param {number} centerX - Screen center X (includes offsetX)
 * @param {number} centerY - Screen center Y (includes offsetY)
 * @param {number} auToPixels - Scale factor from getAuToPixels()
 * @returns {{x: number, y: number}} Screen coordinates in pixels
 */
function worldToScreen(worldX, worldY, centerX, centerY, auToPixels) {
  return {
    x: centerX + worldX * auToPixels,
    y: centerY + worldY * auToPixels
  };
}

/**
 * Get absolute world position of a celestial body, following parent chain
 * Handles stations orbiting moons orbiting planets orbiting stars
 * @param {string} bodyId - ID of the celestial body
 * @param {number} [time=systemMapState.time] - Simulation time
 * @returns {{x: number, y: number}} World coordinates in AU with isometric Y
 */
function getBodyWorldPosition(bodyId, time = systemMapState.time) {
  const system = systemMapState.system;
  const celestialObjects = system?.celestialObjects || [];
  const body = celestialObjects.find(o => o.id === bodyId);

  if (!body) return { x: 0, y: 0 };

  // Star = center of system
  if (body.type === 'Star') {
    return { x: 0, y: 0 };
  }

  // No parent = orbits the star directly
  if (!body.parent) {
    return getOrbitPosition(body.orbitAU || 0, time);
  }

  // Has parent: recursively get parent position, then add local orbit
  const parentPos = getBodyWorldPosition(body.parent, time);

  // Stations/bases use orbitKm (relative to parent), planets use orbitAU
  const localOrbitAU = body.orbitAU || (body.orbitKm || 0) / 149597870.7;

  // Local orbit is faster than system orbit (stations orbit planets faster)
  const localSpeed = 0.2 / Math.sqrt(localOrbitAU || 0.001);
  const localAngle = time * localSpeed;

  return {
    x: parentPos.x + Math.cos(localAngle) * localOrbitAU,
    y: parentPos.y + Math.sin(localAngle) * localOrbitAU * getYScale()  // AR-133: Use dynamic Y scaling
  };
}

// =============================================================================
// AR-201 Phase 5: Initialize rendering module with state and helpers
// =============================================================================
initSystemMapRendering(systemMapState, { getYScale, getDate });

/**
 * Initialize the system map canvas
 * @param {HTMLElement} container - Container element for the canvas
 */
function initSystemMap(container) {
  systemMapState.container = container;

  // AR-199: Load label preference from localStorage
  const savedLabels = localStorage.getItem('systemMapLabels');
  if (savedLabels !== null) {
    systemMapState.showLabels = savedLabels === 'true';
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'system-map-canvas';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  systemMapState.canvas = canvas;
  systemMapState.ctx = canvas.getContext('2d');

  // AR-87: Create zoom controls
  const zoomControls = document.createElement('div');
  zoomControls.className = 'system-map-zoom-controls';

  const btnZoomIn = document.createElement('button');
  btnZoomIn.id = 'btn-zoom-in';
  btnZoomIn.className = 'zoom-btn';
  btnZoomIn.textContent = '+';
  btnZoomIn.title = 'Zoom In';
  btnZoomIn.addEventListener('click', () => {
    const newZoom = systemMapState.zoom * 1.5;
    if (newZoom <= systemMapState.MAX_ZOOM) {
      systemMapState.zoom = newZoom;
    }
  });

  const btnZoomOut = document.createElement('button');
  btnZoomOut.id = 'btn-zoom-out';
  btnZoomOut.className = 'zoom-btn';
  btnZoomOut.textContent = '-';
  btnZoomOut.title = 'Zoom Out';
  btnZoomOut.addEventListener('click', () => {
    const newZoom = systemMapState.zoom / 1.5;
    if (newZoom >= systemMapState.MIN_ZOOM) {
      systemMapState.zoom = newZoom;
    }
  });

  // AR-133: View mode toggle button
  const btnViewToggle = document.createElement('button');
  btnViewToggle.id = 'btn-view-toggle';
  btnViewToggle.className = 'zoom-btn view-toggle';
  btnViewToggle.textContent = '◐';
  btnViewToggle.title = 'Toggle Isometric/Top-Down View';
  btnViewToggle.addEventListener('click', () => {
    systemMapState.viewMode = systemMapState.viewMode === 'isometric' ? 'topdown' : 'isometric';
    btnViewToggle.textContent = systemMapState.viewMode === 'isometric' ? '◐' : '○';
    btnViewToggle.title = systemMapState.viewMode === 'isometric'
      ? 'View: Isometric (click for Top-Down)'
      : 'View: Top-Down (click for Isometric)';
  });

  zoomControls.appendChild(btnZoomIn);
  zoomControls.appendChild(btnZoomOut);
  zoomControls.appendChild(btnViewToggle);
  container.appendChild(zoomControls);

  // Size canvas to container
  resizeCanvas();

  // Event listeners
  window.addEventListener('resize', resizeCanvas);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('dblclick', handleDoubleClick);

  // Start render loop
  startRenderLoop();

  // AR-168: Add keyboard hotkeys for system map actions
  document.addEventListener('keydown', handleSystemMapKeydown);

  console.log('[SystemMap] Initialized');
}

/**
 * AR-168: Handle keyboard hotkeys for system map
 * P = Places, S = Set Course, T = Travel, G = Go To, L = Labels, Escape = Close panels
 */
function handleSystemMapKeydown(e) {
  // Don't trigger if typing in input/textarea
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  // Only trigger when system map is visible
  if (!systemMapState.container?.offsetParent) return;

  const key = e.key.toLowerCase();

  switch (key) {
    case 'p':
      // Toggle Places overlay
      const placesOverlay = document.getElementById('places-overlay');
      if (placesOverlay) {
        hidePlacesOverlay();
      } else {
        showPlacesOverlay();
      }
      e.preventDefault();
      break;

    case 's':
      // Click Set Course button if visible
      const setCourseBtn = document.getElementById('btn-set-course');
      if (setCourseBtn && !setCourseBtn.disabled) {
        setCourseBtn.click();
        e.preventDefault();
      }
      break;

    case 't':
      // Click Travel button if visible and enabled
      const travelBtn = document.getElementById('btn-travel');
      if (travelBtn && !travelBtn.disabled) {
        travelBtn.click();
        e.preventDefault();
      }
      break;

    case 'g':
      // Click Go To button if visible
      const detailsPanel = document.querySelector('.place-details-panel');
      if (detailsPanel) {
        const goToBtn = detailsPanel.querySelector('button');
        if (goToBtn && goToBtn.textContent.includes('Go To')) {
          goToBtn.click();
          e.preventDefault();
        }
      }
      break;

    case 'l':
      // AR-199: Toggle body labels
      toggleSystemMapLabels();
      e.preventDefault();
      break;

    case 'r':
      // AR-242: Toggle ruler mode
      toggleRulerMode();
      e.preventDefault();
      break;

    case 'escape':
      // Close any open panels
      hidePlaceDetails();
      hidePlacesOverlay();
      // AR-242: Exit ruler mode
      if (systemMapState.rulerMode) {
        toggleRulerMode();
      }
      e.preventDefault();
      break;
  }
}

/**
 * Resize canvas to match container
 */
function resizeCanvas() {
  const container = systemMapState.container;
  if (!container || !systemMapState.canvas) return;

  const rect = container.getBoundingClientRect();
  const width = rect.width || container.offsetWidth || 800;
  const height = rect.height || container.offsetHeight || 600;

  // Only resize if dimensions are valid
  if (width <= 0 || height <= 0) {
    console.warn('[SystemMap] Container has no dimensions, using fallback');
    systemMapState.canvas.width = 800 * window.devicePixelRatio;
    systemMapState.canvas.height = 600 * window.devicePixelRatio;
  } else {
    systemMapState.canvas.width = width * window.devicePixelRatio;
    systemMapState.canvas.height = height * window.devicePixelRatio;
  }

  // Reset transform before scaling (prevents compounding)
  systemMapState.ctx.setTransform(1, 0, 0, 1, 0, 0);
  systemMapState.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

/**
 * Handle mouse wheel for zooming
 */
function handleWheel(e) {
  e.preventDefault();

  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = systemMapState.zoom * zoomFactor;

  if (newZoom >= systemMapState.MIN_ZOOM && newZoom <= systemMapState.MAX_ZOOM) {
    // AR-90: Zoom toward mouse position (fixed coordinate system)
    const rect = systemMapState.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // World position under mouse stays fixed during zoom
    const worldX = mouseX - centerX - systemMapState.offsetX;
    const worldY = mouseY - centerY - systemMapState.offsetY;
    systemMapState.offsetX = mouseX - centerX - worldX * zoomFactor;
    systemMapState.offsetY = mouseY - centerY - worldY * zoomFactor;
    systemMapState.zoom = newZoom;
  }
}

/**
 * Handle mouse down for panning
 */
function handleMouseDown(e) {
  // AR-242: Ruler mode takes priority
  if (systemMapState.rulerMode) {
    const rect = systemMapState.canvas.getBoundingClientRect();
    systemMapState.rulerStart = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    systemMapState.rulerEnd = { ...systemMapState.rulerStart };
    systemMapState.canvas.style.cursor = 'crosshair';
    return;
  }

  systemMapState.isDragging = true;
  systemMapState.lastMouseX = e.clientX;
  systemMapState.lastMouseY = e.clientY;
  systemMapState.canvas.style.cursor = 'grabbing';
}

/**
 * Handle mouse move for panning
 */
function handleMouseMove(e) {
  // AR-242: Update ruler end point
  if (systemMapState.rulerMode && systemMapState.rulerStart) {
    const rect = systemMapState.canvas.getBoundingClientRect();
    systemMapState.rulerEnd = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    return;
  }

  if (!systemMapState.isDragging) return;

  const deltaX = e.clientX - systemMapState.lastMouseX;
  const deltaY = e.clientY - systemMapState.lastMouseY;

  systemMapState.offsetX += deltaX;
  systemMapState.offsetY += deltaY;

  systemMapState.lastMouseX = e.clientX;
  systemMapState.lastMouseY = e.clientY;
}

/**
 * Handle mouse up to stop panning
 */
function handleMouseUp() {
  // AR-242: Finalize ruler measurement
  if (systemMapState.rulerMode && systemMapState.rulerStart) {
    showRulerResult();
    // Keep ruler visible after mouseup
    if (systemMapState.canvas) {
      systemMapState.canvas.style.cursor = 'crosshair';
    }
    return;
  }

  systemMapState.isDragging = false;
  if (systemMapState.canvas) {
    systemMapState.canvas.style.cursor = 'grab';
  }
}

/**
 * Handle click - select a body
 */
function handleClick(e) {
  const rect = systemMapState.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const body = findBodyAtPosition(x, y);
  systemMapState.selectedBody = body;

  // AR-118: Emit bodySelected event
  systemMapEvents.emit('bodySelected', body);

  if (body) {
    console.log('[SystemMap] Selected:', body.name, body);
    showBodyInfoPanel(body);
  } else {
    hideBodyInfoPanel();
  }
}

/**
 * Handle double-click - center on body
 */
function handleDoubleClick(e) {
  const rect = systemMapState.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const body = findBodyAtPosition(x, y);
  if (body) {
    // Center view on this body
    const { zoom, offsetX, offsetY } = systemMapState;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const auToPixels = systemMapState.AU_TO_PIXELS * zoom;

    // Calculate body position
    const orbitSpeed = 0.1 / Math.sqrt(body.orbitAU || 1);
    const angle = systemMapState.time * orbitSpeed;
    const bodyX = centerX + offsetX + Math.cos(angle) * (body.orbitAU || 0) * auToPixels;
    const bodyY = centerY + offsetY + Math.sin(angle) * (body.orbitAU || 0) * auToPixels * getYScale();

    // Adjust offset to center on body
    systemMapState.offsetX += centerX - bodyX;
    systemMapState.offsetY += centerY - bodyY;

    // Zoom in a bit
    systemMapState.zoom = Math.min(systemMapState.zoom * 1.5, systemMapState.MAX_ZOOM);

    console.log('[SystemMap] Centered on:', body.name);
  }
}

/**
 * Find what body is at a given canvas position
 */
function findBodyAtPosition(x, y) {
  const { zoom, offsetX, offsetY } = systemMapState;
  const rect = systemMapState.canvas.getBoundingClientRect();
  const centerX = rect.width / 2 + offsetX;
  const centerY = rect.height / 2 + offsetY;
  const auToPixels = systemMapState.AU_TO_PIXELS * zoom;

  // AR-246: Check stars first (they're at center/near center)
  if (systemMapState.system?.stars?.length > 0) {
    for (const star of systemMapState.system.stars) {
      const starX = centerX + (star.position?.x || 0) * auToPixels;
      const starY = centerY + (star.position?.y || 0) * auToPixels;
      const starSize = Math.max(15, star.radius * 10 * Math.sqrt(zoom));
      const dist = Math.sqrt((x - starX) ** 2 + (y - starY) ** 2);
      if (dist < starSize + 10) {  // Star hit radius with padding
        return { ...star, isStar: true };
      }
    }
  }

  // AR-71: Check contacts first (they're drawn on top)
  if (systemMapState.contacts?.length > 0) {
    for (const contact of systemMapState.contacts) {
      if (!contact.position) continue;
      const contactX = centerX + contact.position.x * auToPixels;
      const contactY = centerY + contact.position.y * auToPixels * getYScale();
      const dist = Math.sqrt((x - contactX) ** 2 + (y - contactY) ** 2);
      if (dist < 15) {  // Contact hit radius
        return { ...contact, isContact: true };
      }
    }
  }

  // Check planets (includes gas giants, ice giants)
  if (systemMapState.system?.planets) {
    for (const planet of systemMapState.system.planets) {
      const orbitRadius = planet.orbitAU * auToPixels;
      const orbitSpeed = 0.1 / Math.sqrt(planet.orbitAU);
      const angle = systemMapState.time * orbitSpeed;
      const planetX = centerX + Math.cos(angle) * orbitRadius;
      const planetY = centerY + Math.sin(angle) * orbitRadius * getYScale();

      const planetSize = Math.max(10, Math.min(50, (planet.size / 5000) * zoom * 2));
      const dist = Math.sqrt((x - planetX) ** 2 + (y - planetY) ** 2);

      if (dist < planetSize + 5) {
        return planet;
      }
    }
  }

  // Check asteroid belts
  if (systemMapState.system?.asteroidBelts) {
    for (const belt of systemMapState.system.asteroidBelts) {
      const innerRadius = belt.innerRadius * auToPixels;
      const outerRadius = belt.outerRadius * auToPixels;
      const avgRadius = (innerRadius + outerRadius) / 2;
      const distFromCenter = Math.sqrt((x - centerX) ** 2 + ((y - centerY) / getYScale()) ** 2);

      // Click anywhere in belt annulus
      if (distFromCenter >= innerRadius - 10 && distFromCenter <= outerRadius + 10) {
        return { ...belt, isBelt: true, name: belt.name || 'Asteroid Belt', type: 'Belt' };
      }
    }
  }

  // Check other celestial objects (stations, bases, highports)
  if (systemMapState.celestialObjects) {
    for (const obj of systemMapState.celestialObjects) {
      if (['Station', 'Highport', 'Naval Base', 'Scout Base'].includes(obj.type)) {
        const objX = centerX + (obj.currentX || 0) * auToPixels;
        const objY = centerY + (obj.currentY || 0) * auToPixels;
        const dist = Math.sqrt((x - objX) ** 2 + (y - objY) ** 2);
        if (dist < 12) {
          return { ...obj, isStation: true };
        }
      }
    }
  }

  return null;
}

/**
 * Show info panel for selected body
 */
function showBodyInfoPanel(body) {
  // Remove existing panel
  hideBodyInfoPanel();

  const panel = document.createElement('div');
  panel.id = 'system-map-info-panel';
  panel.className = 'system-map-info-panel';

  // AR-246: Handle stars with astrophysics data
  if (body.isStar) {
    const stellarClass = `${body.type}${body.subtype || ''} ${body.luminosity || 'V'}`;
    const starName = body.name || `Primary Star (${stellarClass})`;

    // Stellar data lookup
    const starData = getStarAstrophysicsData(body.type, body.luminosity);
    const habitableZone = getHabitableZone(stellarClass);

    panel.innerHTML = `
      <div class="info-panel-header">
        <h3>${starName}</h3>
        <button class="info-panel-close" onclick="window.hideSystemMapInfoPanel()">×</button>
      </div>
      <div class="info-panel-content">
        <div class="info-row"><span class="info-label">Class:</span> <span class="info-value stellar-class">${stellarClass}</span></div>
        <div class="info-row"><span class="info-label">Temperature:</span> <span class="info-value">${starData.temperature.toLocaleString()} K</span></div>
        <div class="info-row"><span class="info-label">Mass:</span> <span class="info-value">${starData.mass.toFixed(2)} M☉</span></div>
        <div class="info-row"><span class="info-label">Radius:</span> <span class="info-value">${starData.radius.toFixed(2)} R☉</span></div>
        <div class="info-row"><span class="info-label">Luminosity:</span> <span class="info-value">${starData.luminosity.toFixed(2)} L☉</span></div>
        <div class="info-section">
          <div class="info-section-title">Habitable Zone</div>
          <div class="info-row"><span class="info-label">Inner:</span> <span class="info-value">${habitableZone.inner.toFixed(2)} AU</span></div>
          <div class="info-row"><span class="info-label">Outer:</span> <span class="info-value">${habitableZone.outer.toFixed(2)} AU</span></div>
        </div>
        <div class="info-row"><span class="info-label">Color:</span> <span class="info-value" style="color: ${starData.color}">${starData.colorName}</span></div>
      </div>
    `;
    document.body.appendChild(panel);
    return;
  }

  // AR-71: Handle contacts differently from celestial bodies
  if (body.isContact) {
    const rangeKm = body.rangeKm || 0;
    const rangeDisplay = rangeKm > 1000000
      ? `${(rangeKm / 1000000).toFixed(1)}M km`
      : `${Math.round(rangeKm).toLocaleString()} km`;

    // AR-70: Scan level LED indicators
    const scanLevel = body.scan_level || 0;
    const passiveLed = scanLevel >= 1 ? '🟢' : '🔴';
    const activeLed = scanLevel >= 2 ? '🟢' : '🔴';
    const deepLed = scanLevel >= 3 ? '🟢' : '🔴';

    panel.innerHTML = `
      <div class="info-panel-header">
        <h3>${body.name || 'Unknown Contact'}</h3>
        <button class="info-panel-close" onclick="window.hideSystemMapInfoPanel()">×</button>
      </div>
      <div class="info-panel-content">
        <div class="info-row"><span class="info-label">Type:</span> <span class="info-value">${body.type || 'Unknown'}</span></div>
        <div class="info-row"><span class="info-label">Range:</span> <span class="info-value">${rangeDisplay}</span></div>
        <div class="info-row"><span class="info-label">Bearing:</span> <span class="info-value">${body.bearing || 0}°</span></div>
        ${body.signature ? `<div class="info-row"><span class="info-label">Signature:</span> <span class="info-value">${body.signature}</span></div>` : ''}
        ${body.transponder ? `<div class="info-row"><span class="info-label">Transponder:</span> <span class="info-value">${body.transponder}</span></div>` : ''}
        <div class="info-section scan-section">
          <div class="info-section-title">Sensor Scans</div>
          <div class="scan-buttons" style="display: flex; gap: 4px; margin-top: 4px;">
            <button class="btn btn-sm ${scanLevel >= 1 ? 'btn-success' : 'btn-secondary'}"
                    onclick="window.scanContact('${body.id}', 'passive')"
                    title="Passive scan: -2 DM, silent">
              ${passiveLed} Passive
            </button>
            <button class="btn btn-sm ${scanLevel >= 2 ? 'btn-success' : 'btn-secondary'}"
                    onclick="window.scanContact('${body.id}', 'active')"
                    title="Active scan: 0 DM, detectable">
              ${activeLed} Active
            </button>
            <button class="btn btn-sm ${scanLevel >= 3 ? 'btn-success' : 'btn-secondary'}"
                    onclick="window.scanContact('${body.id}', 'deep')"
                    title="Deep scan: +2 DM, very detectable (GM only)">
              ${deepLed} Deep
            </button>
          </div>
        </div>
        <div class="info-section">
          <button class="btn btn-sm btn-primary" onclick="window.setContactDestination('${body.id}')">Plot Intercept</button>
          <button class="btn btn-sm btn-secondary" onclick="window.hailContact('${body.id}')">Hail</button>
        </div>
      </div>
    `;
  } else if (body.isBelt) {
    // Asteroid belt info
    const avgOrbit = ((body.innerRadius || 2) + (body.outerRadius || 2.5)) / 2;
    const travelTime = formatTravelTimeFromAU(avgOrbit);
    panel.innerHTML = `
      <div class="info-panel-header">
        <h3>${body.name || 'Asteroid Belt'}</h3>
        <button class="info-panel-close" onclick="window.hideSystemMapInfoPanel()">×</button>
      </div>
      <div class="info-panel-content">
        <div class="info-row"><span class="info-label">Type:</span> <span class="info-value">Planetoid Belt</span></div>
        <div class="info-row"><span class="info-label">Inner Edge:</span> <span class="info-value">${(body.innerRadius || 2).toFixed(2)} AU</span></div>
        <div class="info-row"><span class="info-label">Outer Edge:</span> <span class="info-value">${(body.outerRadius || 2.5).toFixed(2)} AU</span></div>
        <div class="info-row"><span class="info-label">Travel:</span> <span class="info-value">${travelTime}</span></div>
        ${body.canMine ? `<div class="info-row"><span class="info-label">Mining:</span> <span class="info-value">Possible</span></div>` : ''}
        <div class="info-section">
          <div class="info-section-title">Resources</div>
          <div class="info-row"><span class="info-label">Prospecting:</span> <span class="info-value">Requires Profession (Belter)</span></div>
        </div>
      </div>
    `;
  } else if (body.isStation) {
    // Station/base/highport info
    const travelTime = body.orbitAU ? formatTravelTimeFromAU(body.orbitAU) : 'Varies';
    panel.innerHTML = `
      <div class="info-panel-header">
        <h3>${body.name || body.type}</h3>
        <button class="info-panel-close" onclick="window.hideSystemMapInfoPanel()">×</button>
      </div>
      <div class="info-panel-content">
        <div class="info-row"><span class="info-label">Type:</span> <span class="info-value">${body.type}</span></div>
        ${body.orbitAU ? `<div class="info-row"><span class="info-label">Orbit:</span> <span class="info-value">${body.orbitAU.toFixed(2)} AU</span></div>` : ''}
        <div class="info-row"><span class="info-label">Travel:</span> <span class="info-value">${travelTime}</span></div>
        ${body.parent ? `<div class="info-row"><span class="info-label">Parent:</span> <span class="info-value">${body.parent}</span></div>` : ''}
        ${body.type === 'Highport' ? `
        <div class="info-section">
          <div class="info-section-title">Facilities</div>
          <div class="info-row"><span class="info-label">Fuel:</span> <span class="info-value">Refined</span></div>
          <div class="info-row"><span class="info-label">Repairs:</span> <span class="info-value">Available</span></div>
        </div>
        ` : ''}
        ${['Naval Base', 'Scout Base'].includes(body.type) ? `
        <div class="info-section">
          <div class="info-section-title">Military Facility</div>
          <div class="info-row"><span class="info-label">Access:</span> <span class="info-value">Restricted</span></div>
        </div>
        ` : ''}
      </div>
    `;
  } else {
    // Regular celestial body
    const travelTime = formatTravelTimeFromAU(body.orbitAU);

    // Starport info for mainworld
    let starportHtml = '';
    if (body.isMainworld && body.starport) {
      const sp = body.starport;
      starportHtml = `
        <div class="info-section">
          <div class="info-section-title">Starport Class ${sp.class}</div>
          ${sp.hasHighport ? '<div class="info-row"><span class="info-label">Highport:</span> <span class="info-value">Yes</span></div>' : ''}
          ${sp.hasDownport ? '<div class="info-row"><span class="info-label">Downport:</span> <span class="info-value">Yes</span></div>' : ''}
          <div class="info-row"><span class="info-label">Fuel:</span> <span class="info-value">${sp.fuel}</span></div>
        </div>
      `;
    }

    // Fuel scooping for gas giants
    let fuelHtml = '';
    if (body.canScoop) {
      fuelHtml = `
        <div class="info-section fuel-section">
          <div class="info-row"><span class="info-label">Fuel:</span> <span class="info-value">${body.fuelAvailable}</span></div>
          <button class="btn btn-sm btn-primary" onclick="window.setDestination('${body.id}')">Set as Destination</button>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="info-panel-header">
        <h3>${body.name}</h3>
        <button class="info-panel-close" onclick="window.hideSystemMapInfoPanel()">×</button>
      </div>
      <div class="info-panel-content">
        <div class="info-row"><span class="info-label">Type:</span> <span class="info-value">${body.type || 'Unknown'}</span></div>
        <div class="info-row"><span class="info-label">Orbit:</span> <span class="info-value">${(body.orbitAU ?? body.orbitRadius ?? 0).toFixed(2)} AU</span></div>
        <div class="info-row"><span class="info-label">Size:</span> <span class="info-value">${Math.round(body.size || body.radiusKm || 0).toLocaleString()} km</span></div>
        ${body.orbitPeriod ? `<div class="info-row"><span class="info-label">Period:</span> <span class="info-value">${Math.round(body.orbitPeriod)} days</span></div>` : ''}
        <div class="info-row"><span class="info-label">Travel:</span> <span class="info-value">${travelTime}</span></div>
        ${body.isMainworld ? `<div class="info-row"><span class="info-label">UWP:</span> <span class="info-value uwp">${systemMapState.system?.uwp || '?'}</span></div>` : ''}
        ${body.moons?.length ? `<div class="info-row"><span class="info-label">Moons:</span> <span class="info-value">${body.moons.length}</span></div>` : ''}
        ${body.hasRings ? `<div class="info-row"><span class="info-label">Rings:</span> <span class="info-value">Yes</span></div>` : ''}
        ${starportHtml}
        ${fuelHtml}
      </div>
    `;
  }

  document.body.appendChild(panel);
}

/**
 * Generate brachistochrone trajectory tooltip for a destination
 */
function generateTrajectoryTooltip(placeId) {
  const currentLocationId = window.state?.shipState?.locationId;
  const thrust = window.state?.shipTemplate?.thrust || 1;

  // Calculate distance
  let distanceKm = 15000000; // 0.1 AU default
  let distanceAU = 0.1;

  if (currentLocationId && currentLocationId !== placeId) {
    const calc = calculateLocationDistance(currentLocationId, placeId);
    distanceKm = calc.distanceKm;
    distanceAU = calc.distanceAU;
  } else {
    // Use destination's orbital distance
    const place = systemMapState.system?.places?.find(p => p.id === placeId);
    const linkedObject = place?.linkedTo
      ? systemMapState.celestialObjects?.find(o => o.id === place.linkedTo)
      : null;
    if (linkedObject?.orbitAU) {
      distanceAU = linkedObject.orbitAU;
      distanceKm = distanceAU * AU_TO_KM;
    }
  }

  // Brachistochrone calculations
  const distanceM = distanceKm * 1000;
  const accelM = thrust * 10;
  const travelSeconds = 2 * Math.sqrt(distanceM / accelM);
  const travelHours = Math.ceil(travelSeconds / 3600);
  const halfDistanceKm = distanceKm / 2;
  const halfDistanceM = distanceM / 2;
  const maxVelocityMs = Math.sqrt(2 * accelM * halfDistanceM);
  const maxVelocityKms = maxVelocityMs / 1000;

  // Format helpers
  const formatKm = (km) => {
    if (km >= 1e9) return `${(km / 1e9).toFixed(1)}B km`;
    if (km >= 1e6) return `${(km / 1e6).toFixed(1)}M km`;
    if (km >= 1e3) return `${(km / 1e3).toFixed(0)}K km`;
    return `${km.toFixed(0)} km`;
  };

  const formatVelocity = (kms) => {
    if (kms >= 1000) return `${(kms / 1000).toFixed(0)}K km/s`;
    if (kms >= 100) return `${kms.toFixed(0)} km/s`;
    return `${kms.toFixed(1)} km/s`;
  };

  const travelText = travelHours >= 24
    ? `${Math.floor(travelHours / 24)}d ${travelHours % 24}h`
    : `${travelHours}h`;

  return `BRACHISTOCHRONE TRAJECTORY
Distance: ${distanceAU.toFixed(2)} AU (${formatKm(distanceKm)})
Thrust: ${thrust}G constant
Travel time: ${travelText}
Turnaround: ${formatKm(halfDistanceKm)}
Max velocity: ${formatVelocity(maxVelocityKms)}`;
}

/**
 * Show places overlay (destinations sidebar)
 * AR-299: Request destinations from server to ensure IDs match
 */
function showPlacesOverlay() {
  hidePlacesOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'system-map-places';
  overlay.className = 'system-map-places';

  // AR-299: Request destinations from server if socket available
  const socket = window.state?.socket;
  if (socket && socket.connected) {
    // Show loading state
    overlay.innerHTML = `
      <div class="places-header">
        <h4>Destinations <span class="travel-hint">(Right Click to Travel)</span></h4>
        <button class="places-close" onclick="window.hidePlacesOverlay()">×</button>
      </div>
      <div class="places-list">
        <div class="place-item loading">Loading destinations...</div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Request from server
    socket.emit('ops:getDestinations');
    return;
  }

  // Fallback to locally-generated places if no socket
  renderPlacesOverlay(overlay, systemMapState.system?.places || []);
  document.body.appendChild(overlay);
}

/**
 * AR-299: Render places/destinations into overlay
 */
function renderPlacesOverlay(overlay, places) {
  if (!places || places.length === 0) {
    overlay.innerHTML = `
      <div class="places-header">
        <h4>Destinations <span class="travel-hint">(Right Click to Travel)</span></h4>
        <button class="places-close" onclick="window.hidePlacesOverlay()">×</button>
      </div>
      <div class="places-list">
        <div class="place-item">No destinations available</div>
      </div>
    `;
    return;
  }

  const placesHtml = places.map(place => {
    const tooltip = generateTrajectoryTooltip(place.id);
    const icon = place.icon || getPlaceIconForType(place.type);
    const desc = place.description || place.type || '';
    return `
    <div class="place-item" data-place-id="${place.id}"
         title="${tooltip}"
         onclick="window.goToPlace('${place.id}')"
         oncontextmenu="event.preventDefault(); window.showPlaceDetails('${place.id}')">
      <span class="place-icon">${icon}</span>
      <div class="place-info">
        <div class="place-name">${place.name}</div>
        <div class="place-desc">${desc}</div>
      </div>
    </div>
  `;
  }).join('');

  overlay.innerHTML = `
    <div class="places-header">
      <h4>Destinations <span class="travel-hint">(Right Click to Travel)</span></h4>
      <button class="places-close" onclick="window.hidePlacesOverlay()">×</button>
    </div>
    <div class="places-list">
      ${placesHtml}
    </div>
  `;
}

/**
 * AR-299: Handle server destinations response
 */
function handleServerDestinations(data) {
  const overlay = document.getElementById('system-map-places');
  if (!overlay) return;

  if (data.error) {
    console.warn('[SystemMap] Server destinations error:', data.error);
    // Fall back to local places
    renderPlacesOverlay(overlay, systemMapState.system?.places || []);
    return;
  }

  // Store server destinations
  systemMapState.serverDestinations = data.destinations;
  console.log(`[SystemMap] Received ${data.destinations?.length || 0} destinations from server for ${data.systemName}`);

  // Render server destinations
  renderPlacesOverlay(overlay, data.destinations);
}

/**
 * AR-299: Get icon for place type
 */
function getPlaceIconForType(type) {
  const icons = {
    'orbit': '🪐',
    'surface': '🏠',
    'station': '🛰️',
    'highport': '🛰️',
    'starport': '🚀',
    'naval_base': '⚓',
    'scout_base': '🔭',
    'belt': '💎',
    'jump_point': '✨',
    'lagrange': '◯'
  };
  return icons[type] || '📍';
}

// AR-299: Export handler for socket listener registration
window.handleServerDestinations = handleServerDestinations;

/**
 * Hide places overlay
 */
function hidePlacesOverlay() {
  const existing = document.getElementById('system-map-places');
  if (existing) existing.remove();
}

/**
 * Show detailed info panel for a place (right-click handler)
 * Displays location info, available actions, and linked celestial object
 */
// Module-level state for pending course
let pendingCourseData = null;

/**
 * Calculate distance between two locations using orbital positions
 * @returns {object} { distanceAU, distanceKm }
 */
function calculateLocationDistance(fromLocationId, toLocationId) {
  const system = systemMapState.system;
  if (!system?.places || !system?.celestialObjects) return { distanceAU: 0.1, distanceKm: 14959787 };

  const fromPlace = system.places.find(p => p.id === fromLocationId);
  const toPlace = system.places.find(p => p.id === toLocationId);

  // Get linked celestial objects
  const fromObj = fromPlace?.linkedTo
    ? system.celestialObjects.find(o => o.id === fromPlace.linkedTo)
    : null;
  const toObj = toPlace?.linkedTo
    ? system.celestialObjects.find(o => o.id === toPlace.linkedTo)
    : null;

  // Default positions (star at center)
  const fromAU = fromObj?.orbitAU || 0;
  const toAU = toObj?.orbitAU || 0;

  // Simple distance: difference in orbital radii (approximation)
  const distanceAU = Math.abs(toAU - fromAU) || 0.1; // Minimum 0.1 AU
  const distanceKm = distanceAU * 149597870.7;

  return { distanceAU, distanceKm };
}

/**
 * Calculate travel time at given thrust (G)
 * Uses constant acceleration formula: t = 2 * sqrt(d / a)
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} thrust - Ship thrust in Gs (default 1)
 * @returns {number} Travel time in hours
 */
function calculateTravelTime(distanceKm, thrust = 1) {
  const accel = thrust * 9.81 / 1000; // km/s²
  const distanceM = distanceKm * 1000; // Convert to meters for calculation
  const accelM = accel * 1000; // m/s²

  // Time = 2 * sqrt(distance / acceleration) for brachistochrone trajectory
  const timeSeconds = 2 * Math.sqrt(distanceM / accelM);
  const timeHours = Math.ceil(timeSeconds / 3600);

  return Math.max(1, timeHours); // Minimum 1 hour
}

/**
 * Get ship thrust from template
 * @returns {number} Ship thrust in Gs (default 1)
 */
function getShipThrust() {
  const template = window.state?.shipTemplate;
  return template?.thrust || 1;
}

function showPlaceDetails(placeId) {
  // AR-299: Check server destinations first (authoritative IDs), then fall back to local
  let place = systemMapState.serverDestinations?.find(p => p.id === placeId);
  if (!place) {
    place = systemMapState.system?.places?.find(p => p.id === placeId);
  }
  if (!place) return;

  // Remove any existing details panel
  const existing = document.getElementById('place-details-panel');
  if (existing) existing.remove();

  // Find linked celestial object if any
  const linkedObject = place.linkedTo
    ? systemMapState.system?.celestialObjects?.find(obj => obj.id === place.linkedTo)
    : null;

  // Calculate distance and travel time from current location
  const shipState = window.state?.shipState || {};
  const currentLocationId = shipState.locationId;
  const currentLocationName = shipState.locationName ||
    systemMapState.system?.places?.find(p => p.id === currentLocationId)?.name ||
    'Unknown';
  const thrust = 1; // Default to 1G for initial display, user can change via selector

  let distanceInfo = '';
  let travelHours = 4; // Default

  // Calculate distance - either from current location or use destination's orbit as fallback
  let distanceAU = 0.1;
  let distanceKm = distanceAU * AU_TO_KM;
  let distanceLabel = 'from star';

  if (currentLocationId && currentLocationId !== placeId) {
    // Have a different current location - calculate actual distance
    const calc = calculateLocationDistance(currentLocationId, placeId);
    distanceAU = calc.distanceAU;
    distanceKm = calc.distanceKm;
    distanceLabel = 'to destination';
  } else if (linkedObject) {
    // No current location or same location - use destination's orbital distance
    distanceAU = linkedObject.orbitAU || 0.1;
    distanceKm = distanceAU * AU_TO_KM;
  }

  travelHours = calculateTravelTime(distanceKm, thrust);
  const travelText = travelHours >= 24
    ? `${Math.floor(travelHours / 24)}d ${travelHours % 24}h`
    : `${travelHours}h`;

  // Build detailed physics tooltip for teaching moment
  const distanceM = distanceKm * 1000;
  const accelM = thrust * 10; // m/s² (1G = ~10 m/s²)
  const halfDistanceM = distanceM / 2;
  const halfDistanceKm = distanceKm / 2;

  // Max velocity at turnaround = sqrt(2 * accel * halfDistance)
  const maxVelocityMs = Math.sqrt(2 * accelM * halfDistanceM);
  const maxVelocityKms = maxVelocityMs / 1000;

  // Format large numbers
  const formatKm = (km) => {
    if (km >= 1e9) return `${(km / 1e9).toFixed(1)}B km`;
    if (km >= 1e6) return `${(km / 1e6).toFixed(1)}M km`;
    if (km >= 1e3) return `${(km / 1e3).toFixed(0)}K km`;
    return `${km.toFixed(0)} km`;
  };

  const formatVelocity = (kms) => {
    if (kms >= 1000) return `${(kms / 1000).toFixed(0)}K km/s`;
    if (kms >= 100) return `${kms.toFixed(0)} km/s`;
    return `${kms.toFixed(1)} km/s`;
  };

  // Build G selector options (1G to 6G, default 1G)
  // TODO: When pilot uses this functionally, limit to ship's max Gs
  // e.g., Kimbly (2G ship) shows 1-2G only, with 3-6 inactive/absent
  // Test: Kimbly max thrust = 2
  let gOptions = '';
  for (let g = 1; g <= 6; g++) {
    const selected = g === 1 ? ' selected' : '';
    gOptions += `<option value="${g}"${selected}>${g}G</option>`;
  }

  // Build physics info HTML for display in popup body - with tooltips for learning
  const brachistochroneTooltip = `From Greek 'brachistos' (shortest) + 'chronos' (time). The brachistochrone trajectory is the fastest possible path between two points using constant thrust. The ship accelerates continuously toward the destination for the first half, then flips 180° and decelerates for the second half. Unlike Hohmann transfer orbits used by chemical rockets, brachistochrone requires continuous thrust - perfect for Traveller's reactionless drives. The math: time = 2 × √(distance / acceleration).`;

  const physicsHtml = `
    <div class="detail-physics">
      <div class="physics-header">
        <select id="physics-g-select" class="physics-g-select"
                onchange="window.updatePhysicsDisplay(${distanceKm}, this.value)"
                title="Select acceleration. Higher G = faster travel but more strain on crew.">
          ${gOptions}
        </select>
        <strong title="${brachistochroneTooltip}">BRACHISTOCHRONE TRAJECTORY</strong>
      </div>
      <div class="physics-grid" id="physics-grid-values"
           data-distance-km="${distanceKm}" data-distance-au="${distanceAU}" data-distance-label="${distanceLabel}">
        <span class="physics-label" title="1 AU = Earth-Sun distance = 149.6 million km">Distance ${distanceLabel}:</span>
        <span class="physics-value">${distanceAU.toFixed(2)} AU (${formatKm(distanceKm)})</span>
        <span class="physics-label" title="1G = Earth gravity = 9.81 m/s². Constant acceleration provides artificial gravity.">Thrust:</span>
        <span class="physics-value" id="physics-thrust">${thrust}G constant</span>
        <span class="physics-label" title="Time = 2 × √(distance / acceleration). Brachistochrone is fastest possible constant-thrust path.">Travel time:</span>
        <span class="physics-value" id="physics-time">${travelText}</span>
        <span class="physics-label" title="Halfway point where ship flips 180° to begin deceleration. No coasting in brachistochrone.">Turnaround:</span>
        <span class="physics-value" id="physics-turnaround">${formatKm(halfDistanceKm)}</span>
        <span class="physics-label" title="V = √(2 × acceleration × half-distance). Maximum speed reached at turnaround point.">Max velocity:</span>
        <span class="physics-value" id="physics-velocity">${formatVelocity(maxVelocityKms)}</span>
      </div>
    </div>`;

  // Build actions list
  const actionsHtml = place.actions?.length
    ? `<div class="detail-actions">
        <strong>Available Actions:</strong>
        <ul>${place.actions.map(a => `<li>${a.replace(/_/g, ' ')}</li>`).join('')}</ul>
      </div>`
    : '';

  // AR-266: Build FROM/TO route display
  const isSameLocation = currentLocationId === placeId;
  const routeHtml = isSameLocation
    ? `<div class="detail-route current-location">
        <span class="route-icon">📍</span>
        <span class="route-label">Current Location</span>
      </div>`
    : currentLocationId
    ? `<div class="detail-route">
        <div class="route-from">
          <span class="route-icon">🚀</span>
          <span class="route-label">FROM:</span>
          <span class="route-value">${currentLocationName}</span>
        </div>
        <div class="route-arrow">→</div>
        <div class="route-to">
          <span class="route-icon">${place.icon || '📍'}</span>
          <span class="route-label">TO:</span>
          <span class="route-value">${place.name}</span>
        </div>
      </div>`
    : '';

  // Build linked object info
  const linkedHtml = linkedObject
    ? `<div class="detail-linked">
        <strong>Location:</strong> ${linkedObject.name} (${linkedObject.type})
      </div>`
    : '';

  // Check if course is already set to this destination
  const hasCourse = pendingCourseData?.locationId === placeId;

  const panel = document.createElement('div');
  panel.id = 'place-details-panel';
  panel.className = 'place-details-panel';
  panel.innerHTML = `
    <div class="details-header">
      <span class="place-icon">${place.icon || '📍'}</span>
      <h3>${place.name}</h3>
      <button class="details-close" onclick="window.hidePlaceDetails()">×</button>
    </div>
    <div class="details-body">
      <p class="detail-desc">${place.description || 'No description available'}</p>
      ${linkedHtml}
      ${routeHtml}
      ${actionsHtml}
      ${physicsHtml}
    </div>
    <div class="details-footer">
      <button onclick="window.goToPlace('${placeId}'); window.hidePlaceDetails();" title="Jump camera to location [G]">Go To</button>
      <button id="btn-set-course"
              onclick="window.setCourseFromDetails('${placeId}', ${travelHours});"
              title="Set navigation course [S] - Pilot role only"
              ${isSameLocation ? 'disabled' : ''}>
        Set Course
      </button>
      <button id="btn-travel"
              onclick="window.travelFromDetails();"
              title="Execute travel to destination [T]"
              ${hasCourse ? '' : 'disabled'}>
        Travel
      </button>
    </div>
  `;

  document.body.appendChild(panel);
}

/**
 * Set course from details panel
 * AR-267: Uses current G selector value for accurate travel time
 */
function setCourseFromDetails(placeId, defaultTravelHours) {
  const place = systemMapState.system?.places?.find(p => p.id === placeId);
  if (!place) return;

  // AR-267: Get current thrust from G selector and recalculate travel time
  const gSelect = document.getElementById('physics-g-select');
  const physicsGrid = document.getElementById('physics-grid-values');
  let travelHours = defaultTravelHours;

  if (gSelect && physicsGrid) {
    const thrust = parseInt(gSelect.value, 10) || 1;
    const distanceKm = parseFloat(physicsGrid.dataset.distanceKm) || 0;
    if (distanceKm > 0) {
      travelHours = calculateTravelTime(distanceKm, thrust);
    }
  }

  pendingCourseData = {
    locationId: placeId,
    locationName: place.name,
    travelHours
  };

  // Update Travel button state
  const travelBtn = document.getElementById('btn-travel');
  if (travelBtn) travelBtn.disabled = false;

  // Update Set Course button appearance
  const courseBtn = document.getElementById('btn-set-course');
  if (courseBtn) {
    courseBtn.textContent = '✓ Course Set';
    courseBtn.classList.add('course-set');
  }

  // Also call the main setCourse for pilot panel integration
  if (typeof window.setCourse === 'function') {
    const etaText = travelHours >= 24
      ? `${Math.floor(travelHours / 24)}d ${travelHours % 24}h`
      : `${travelHours}h`;
    window.setCourse(place.name, etaText, { locationId: placeId, travelHours });
  }

  if (typeof window.showNotification === 'function') {
    window.showNotification(`Course set for ${place.name}`, 'success');
  }
}

/**
 * Execute travel from details panel
 * AR-109: Only Pilot, Captain, or GM can initiate travel
 */
function travelFromDetails() {
  if (!pendingCourseData) return;

  // AR-109: Role-based access control temporarily disabled for testing
  // TODO: Re-enable when role restrictions are finalized
  // const role = window.state?.role;
  // const isGM = window.state?.isGM;
  // const allowedRoles = ['pilot', 'captain'];
  // if (!isGM && !allowedRoles.includes(role)) {
  //   if (typeof window.showNotification === 'function') {
  //     window.showNotification('Only Pilot or Captain can initiate travel', 'warning');
  //   }
  //   return;
  // }

  // Check for campaign connection first
  if (!window.state?.socket || !window.state?.campaign?.id) {
    if (typeof window.showNotification === 'function') {
      window.showNotification('Not connected to campaign', 'error');
    }
    return;
  }

  // Emit travel event to server - include calculated travel hours
  window.state.socket.emit('ops:travel', {
    destinationId: pendingCourseData.locationId,
    travelHours: pendingCourseData.travelHours || 4
  });

  // Clear pending course
  const destName = pendingCourseData.locationName;
  pendingCourseData = null;

  // Close panel
  hidePlaceDetails();

  if (typeof window.showNotification === 'function') {
    window.showNotification(`Traveling to ${destName}...`, 'info');
  }
}

// Export new functions
window.setCourseFromDetails = setCourseFromDetails;
window.travelFromDetails = travelFromDetails;

/**
 * Hide place details panel
 */
function hidePlaceDetails() {
  const existing = document.getElementById('place-details-panel');
  if (existing) existing.remove();
}

// AR-38/AR-102: Track last selected place and camera angle for re-click cycling
let lastSelectedPlaceId = null;
let mainMapCameraAngle = 0;

/**
 * Navigate to a place (center view)
 * AR-38: Re-clicking same place cycles through CAMERA_PRESETS
 * AR-102: Uses size-based zoom calculation (unified with embedded map)
 */
function goToPlace(placeId) {
  const place = systemMapState.system?.places?.find(p => p.id === placeId);
  if (!place) return;

  // AR-38: Check if re-clicking same place - cycle camera angle
  if (placeId === lastSelectedPlaceId) {
    mainMapCameraAngle = (mainMapCameraAngle + 1) % CAMERA_PRESETS.length;
  } else {
    mainMapCameraAngle = 0;
    lastSelectedPlaceId = placeId;
  }

  // Find the associated planet/celestial object if any
  // AR-104: Support both planetId and linkedTo properties
  const linkedId = place.planetId || place.linkedTo;
  if (linkedId) {
    // Search both planets array and celestialObjects array
    let planet = systemMapState.system?.planets?.find(p => p.id === linkedId);
    if (!planet && systemMapState.celestialObjects) {
      planet = systemMapState.celestialObjects.find(c => c.id === linkedId);
    }
    if (planet) {
      systemMapState.selectedBody = planet;
      // AR-104: Use algorithmic camera preset - pass place.type for station detection
      const preset = generateCameraPreset(planet, mainMapCameraAngle, place.type);
      centerOnBodyWithSizeZoom(planet, preset);
      showBodyInfoPanel(planet);
      const zoomStr = preset.absoluteZoom ? `absoluteZoom=${preset.absoluteZoom}` : `zoom=${preset.zoomMultiplier.toFixed(2)}`;
      console.log(`[SystemMap] Going to: ${place.name} (placeType=${place.type}, cycle=${mainMapCameraAngle}, ${zoomStr})`);
    } else {
      console.log(`[SystemMap] Could not find celestial object: ${linkedId}`);
    }
  } else {
    // AR-85: Places without planetId/linkedTo (like Jump Point) - center on system origin
    const defaultPreset = CAMERA_PRESETS[mainMapCameraAngle];
    centerOnSystemOrigin(defaultPreset.zoomMultiplier * 2);
    systemMapState.selectedBody = null;
    console.log(`[SystemMap] Going to: ${place.name} (origin view)`);
  }
}

/**
 * Get current places overlay state (for testing)
 */
function getPlacesOverlayState() {
  const overlay = document.getElementById('places-overlay');
  return {
    visible: !!overlay,
    lastSelectedPlaceId,
    cameraAngle: mainMapCameraAngle,
    currentPreset: CAMERA_PRESETS[mainMapCameraAngle]?.name
  };
}

// Expose for testing
window.getPlacesOverlayState = getPlacesOverlayState;

/**
 * Center view on a body
 * AR-104: Now uses algorithmic camera preset based on object type
 */
function centerOnBody(body) {
  const preset = generateCameraPreset(body, 0);
  centerOnBodyWithSizeZoom(body, preset);
}

/**
 * AR-102: Center view on a body with size-based zoom calculation
 * Uses the same calculation as embedded map for unified behavior
 * @param {Object} body - The celestial body to center on
 * @param {Object} preset - Camera preset with zoomMultiplier and offsets
 */
function centerOnBodyWithSizeZoom(body, preset) {
  const rect = systemMapState.canvas.getBoundingClientRect();
  const { zoom, offsetX, offsetY } = systemMapState;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const auToPixels = systemMapState.AU_TO_PIXELS * zoom;

  // Calculate body's current position
  const orbitSpeed = 0.1 / Math.sqrt(body.orbitAU || 1);
  const angle = systemMapState.time * orbitSpeed;
  const bodyX = centerX + offsetX + Math.cos(angle) * (body.orbitAU || 0) * auToPixels;
  const bodyY = centerY + offsetY + Math.sin(angle) * (body.orbitAU || 0) * auToPixels * getYScale();

  // Center on body
  systemMapState.offsetX += centerX - bodyX;
  systemMapState.offsetY += centerY - bodyY;

  // AR-104: For stations, use parent planet's size for zoom (cinematic framing)
  // This shows the station against the planet backdrop instead of zooming into empty space
  let radiusKm = getObjectRadiusKm(body);
  const isStationType = body.type === 'Station' || body.type === 'Naval Base' || body.type === 'Scout Base';
  console.log(`[SystemMap] AR-104 debug: type=${body.type}, isStation=${isStationType}, parent=${body.parent}`);
  if (isStationType && body.parent) {
    // Find parent celestial object and use its size
    // AR-104: Check both embedded celestialObjects and system.planets arrays
    const embeddedObjects = systemMapState.celestialObjects || [];
    const planets = systemMapState.system?.planets || [];
    const allObjects = [...embeddedObjects, ...planets];
    const parentBody = allObjects.find(obj => obj.id === body.parent);
    if (parentBody && parentBody.radiusKm) {
      radiusKm = parentBody.radiusKm;
      console.log(`[SystemMap] Station framing: using parent ${parentBody.name} radius ${radiusKm}km (station is ${getObjectRadiusKm(body)}km)`);
    }
  }

  // AR-104: Calculate target zoom - use absoluteZoom if provided, else size-based
  // CRITICAL LESSON FOR GLOBAL APPLICATION:
  // - Size-based zoom: calculateZoomForSize(radiusKm, canvasSize, 0.5) works for large objects
  // - But for small objects orbiting large ones (stations around planets), base zoom is astronomical
  //   Example: 4800km planet → baseZoom ≈ 156,000x → clamped to MAX_ZOOM 100 for ALL views
  // - Solution: Use absoluteZoom for these cases (5x, 20x, 60x produce visually distinct views)
  const canvasSize = Math.min(rect.width, rect.height);
  let targetZoom;
  if (preset.absoluteZoom !== undefined) {
    targetZoom = preset.absoluteZoom;
    console.log(`[SystemMap] Using absolute zoom: ${targetZoom}x`);
  } else {
    const baseZoom = calculateZoomForSize(radiusKm, canvasSize, 0.5);
    targetZoom = baseZoom * preset.zoomMultiplier;
    console.log(`[SystemMap] Calculated zoom: base=${baseZoom.toFixed(0)}x * ${preset.zoomMultiplier} = ${targetZoom.toFixed(0)}x`);
  }

  systemMapState.zoom = Math.min(Math.max(targetZoom, systemMapState.MIN_ZOOM), systemMapState.MAX_ZOOM);
}

/**
 * DEPRECATED: Center view on a body with specific zoom multiplier
 * Kept for backwards compatibility - use centerOnBodyWithSizeZoom() instead
 * @deprecated
 */
function centerOnBodyWithVariant(body, zoomMultiplier) {
  const rect = systemMapState.canvas.getBoundingClientRect();
  const { zoom, offsetX, offsetY } = systemMapState;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const auToPixels = systemMapState.AU_TO_PIXELS * zoom;

  const orbitSpeed = 0.1 / Math.sqrt(body.orbitAU || 1);
  const angle = systemMapState.time * orbitSpeed;
  const bodyX = centerX + offsetX + Math.cos(angle) * (body.orbitAU || 0) * auToPixels;
  const bodyY = centerY + offsetY + Math.sin(angle) * (body.orbitAU || 0) * auToPixels * getYScale();

  systemMapState.offsetX += centerX - bodyX;
  systemMapState.offsetY += centerY - bodyY;
  systemMapState.zoom = Math.min(zoom * zoomMultiplier, systemMapState.MAX_ZOOM);
}

/**
 * AR-197: Center view on a sensor contact
 * @param {string} contactId - The contact ID to center on
 * @param {number} zoomLevel - Optional zoom level (default: current zoom)
 * @returns {boolean} True if contact found and centered
 */
function centerOnContact(contactId, zoomLevel = null) {
  if (!shipMapState.contacts || !shipMapState.contacts.length) return false;

  const contact = shipMapState.contacts.find(c => c.id === contactId);
  if (!contact) return false;

  const rect = systemMapState.canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  // Get ship position for relative contact positioning
  const shipPos = shipMapState.partyShip?.position || { x: 0, y: 0, z: 0 };

  // Calculate contact's world position in AU
  let contactAU_X, contactAU_Y;

  if (contact.position) {
    // Contact has absolute position
    contactAU_X = contact.position.x;
    contactAU_Y = contact.position.y;
  } else {
    // Convert bearing/range to position relative to ship
    const rangeKm = contact.range_km || contact.rangeKm || 0;
    const rangeAU = rangeKm / 149597870.7;
    const bearing = (contact.bearing || 0) * Math.PI / 180;

    contactAU_X = shipPos.x + Math.cos(bearing) * rangeAU;
    contactAU_Y = shipPos.y + Math.sin(bearing) * rangeAU;
  }

  // Set offset to center on contact
  const zoom = zoomLevel || systemMapState.zoom;
  const auToPixels = systemMapState.AU_TO_PIXELS * zoom;

  systemMapState.offsetX = -contactAU_X * auToPixels;
  systemMapState.offsetY = -contactAU_Y * auToPixels * getYScale();

  if (zoomLevel !== null) {
    systemMapState.zoom = Math.min(Math.max(zoomLevel, systemMapState.MIN_ZOOM), systemMapState.MAX_ZOOM);
  }

  console.log(`[SystemMap] Centered on contact ${contact.name || contactId} at AU(${contactAU_X.toFixed(4)}, ${contactAU_Y.toFixed(4)})`);
  return true;
}

/**
 * AR-197: Flash the system map with a color overlay (for alerts)
 * @param {string} color - CSS color for the flash (default: red)
 * @param {number} duration - Flash duration in ms (default: 500)
 */
function flashSystemMap(color = 'rgba(255, 0, 0, 0.3)', duration = 500) {
  if (!systemMapState.canvas) return;

  // Create flash overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${color};
    pointer-events: none;
    z-index: 100;
    transition: opacity ${duration / 2}ms ease-out;
  `;

  // Find the system map container
  const container = systemMapState.canvas.parentElement;
  if (!container) return;

  container.style.position = 'relative';
  container.appendChild(overlay);

  // Fade out and remove
  requestAnimationFrame(() => {
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), duration / 2);
    }, duration / 2);
  });
}

/**
 * AR-85: Center view on system origin (the star)
 * Used for places without an associated planet (e.g., Jump Point)
 */
function centerOnSystemOrigin(zoomMultiplier) {
  const rect = systemMapState.canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  // Reset offsets to center on origin (the star)
  systemMapState.offsetX = 0;
  systemMapState.offsetY = 0;
  // Zoom out to show more of the system (inverse multiplier for wider view)
  systemMapState.zoom = Math.max(systemMapState.MIN_ZOOM, 1 / zoomMultiplier);
}

/**
 * Animated camera movement to a location
 * Uses requestAnimationFrame for smooth 300ms ease-out transition
 * @param {string} locationId - Location ID to animate to
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration in ms (default 300)
 * @param {boolean} options.maxZoom - Use maximum zoom (close-up) when true
 */
function animateCameraToLocation(locationId, options = {}) {
  const duration = options.duration || 300;
  const useMaxZoom = options.maxZoom !== false; // Default true for travel

  const system = systemMapState.system;
  if (!system?.places) {
    console.log('[SystemMap] No system for camera animation');
    return;
  }

  const place = system.places.find(p => p.id === locationId);
  if (!place) {
    console.log('[SystemMap] Place not found for animation:', locationId);
    return;
  }

  // Find celestial body for this place
  const body = system.celestialObjects?.find(obj => obj.id === place.celestialObject);
  if (!body) {
    console.log('[SystemMap] No celestial body for place:', locationId);
    return;
  }

  const rect = systemMapState.canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  // Calculate target position
  const orbitSpeed = 0.1 / Math.sqrt(body.orbitAU || 1);
  const angle = systemMapState.time * orbitSpeed;

  // Calculate target zoom (max zoom = close-up preset)
  const radiusKm = getObjectRadiusKm(body);
  const canvasSize = Math.min(rect.width, rect.height);
  const targetZoom = useMaxZoom
    ? Math.min(calculateZoomForSize(radiusKm, canvasSize, 0.5) * 1.5, systemMapState.MAX_ZOOM)
    : systemMapState.zoom;

  // Calculate target offsets (to center on body at target zoom)
  const auToPixels = systemMapState.AU_TO_PIXELS * targetZoom;
  const bodyScreenX = Math.cos(angle) * (body.orbitAU || 0) * auToPixels;
  const bodyScreenY = Math.sin(angle) * (body.orbitAU || 0) * auToPixels * getYScale();
  const targetOffsetX = -bodyScreenX;
  const targetOffsetY = -bodyScreenY;

  // Starting values
  const startOffsetX = systemMapState.offsetX;
  const startOffsetY = systemMapState.offsetY;
  const startZoom = systemMapState.zoom;
  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out cubic: 1 - (1-t)^3
    const eased = 1 - Math.pow(1 - progress, 3);

    // Interpolate values
    systemMapState.offsetX = startOffsetX + (targetOffsetX - startOffsetX) * eased;
    systemMapState.offsetY = startOffsetY + (targetOffsetY - startOffsetY) * eased;
    systemMapState.zoom = startZoom + (targetZoom - startZoom) * eased;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      console.log('[SystemMap] Camera animation complete to:', place.name);
      // AR-118: Emit cameraAnimationComplete event
      systemMapEvents.emit('cameraAnimationComplete', {
        placeId: locationId,
        place,
        body,
        zoom: systemMapState.zoom
      });
    }
  }

  requestAnimationFrame(animate);
}

/**
 * AR-64: Set destination and course for pilot navigation
 * @param {string} locationId - Location ID from system JSON (e.g., 'loc-dock-highport')
 */
function setDestination(locationId) {
  console.log('[SystemMap] Setting destination:', locationId);

  // Find location in current system
  const system = systemMapState.system;
  if (!system?.locations) {
    console.error('[SystemMap] No system loaded or system has no locations');
    return;
  }

  const location = system.locations.find(loc => loc.id === locationId);
  if (!location) {
    console.error('[SystemMap] Location not found:', locationId);
    return;
  }

  // Calculate travel time from current location if available
  const shipState = window.state?.shipState || {};
  const currentLocationId = shipState.locationId;
  let travelHours = 4; // Default
  if (currentLocationId && location.travelTimeHours?.[currentLocationId]) {
    travelHours = location.travelTimeHours[currentLocationId];
  }

  // Format ETA
  const etaText = travelHours >= 24
    ? `${Math.floor(travelHours / 24)}d ${travelHours % 24}h`
    : `${travelHours}h`;

  // AR-118: Emit destinationSet event
  systemMapEvents.emit('destinationSet', {
    locationId: location.id,
    location,
    travelHours,
    etaText
  });

  // Call setCourse via global function (defined in app.js)
  if (typeof window.setCourse === 'function') {
    window.setCourse(location.name, etaText, {
      locationId: location.id,
      travelHours
    });
  }

  // Update info panel to show it's selected as destination
  hideBodyInfoPanel();

  // Show notification
  if (typeof window.showNotification === 'function') {
    window.showNotification(`Course set for ${location.name} (${etaText})`, 'success');
  }
}

/**
 * AR-264: Get cinematic camera view for a target
 * Uses scoring algorithm to find aesthetically pleasing camera position
 * @param {string} targetId - Target object ID (planet, station, etc.)
 * @param {Object} options - { duration, useCinematic }
 */
function getCinematicView(targetId, options = {}) {
  const system = systemMapState.system;
  if (!system) {
    console.log('[CinematicCamera] No system loaded');
    return null;
  }

  const rect = systemMapState.canvas?.getBoundingClientRect() || { width: 800, height: 600 };
  const camera = new CinematicCamera(system, {
    AU_TO_PIXELS: systemMapState.AU_TO_PIXELS
  });

  const view = camera.generateView(targetId, { width: rect.width, height: rect.height });
  if (!view) return null;

  return {
    offsetX: -view.x * systemMapState.AU_TO_PIXELS * view.zoom,
    offsetY: -view.y * systemMapState.AU_TO_PIXELS * view.zoom,
    zoom: Math.min(view.zoom, systemMapState.MAX_ZOOM),
    type: view.type,
    score: view.score
  };
}

/**
 * AR-264: Animate to cinematic view for a target
 * @param {string} targetId - Target object ID
 * @param {Object} options - { duration }
 */
function animateToCinematicView(targetId, options = {}) {
  const view = getCinematicView(targetId, options);
  if (!view) {
    console.log('[CinematicCamera] Could not generate view for:', targetId);
    return;
  }

  const duration = options.duration || 400;
  const startOffsetX = systemMapState.offsetX;
  const startOffsetY = systemMapState.offsetY;
  const startZoom = systemMapState.zoom;
  const startTime = performance.now();

  console.log('[CinematicCamera] Animating to', view.type, 'view for:', targetId);

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // Ease-out cubic

    systemMapState.offsetX = startOffsetX + (view.offsetX - startOffsetX) * eased;
    systemMapState.offsetY = startOffsetY + (view.offsetY - startOffsetY) * eased;
    systemMapState.zoom = startZoom + (view.zoom - startZoom) * eased;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      console.log('[CinematicCamera] Animation complete:', view.type, 'score:', view.score?.toFixed(0));
      systemMapEvents.emit('cameraAnimationComplete', {
        targetId,
        view,
        zoom: systemMapState.zoom
      });
    }
  }

  requestAnimationFrame(animate);
}

// Global access for UI
window.hideSystemMapInfoPanel = hideBodyInfoPanel;
window.showPlacesOverlay = showPlacesOverlay; // AR-293: Fix missing export
window.hidePlacesOverlay = hidePlacesOverlay;
window.goToPlace = goToPlace;
window.setDestination = setDestination;
window.snapToNow = snapToNow; // AR-88
window.showPlaceDetails = showPlaceDetails;
window.hidePlaceDetails = hidePlaceDetails;
window.animateCameraToLocation = animateCameraToLocation; // Animated travel camera
window.getCinematicView = getCinematicView; // AR-264
window.animateToCinematicView = animateToCinematicView; // AR-264

/**
 * Update physics display when G selector changes
 * @param {number} distanceKm - Distance in km
 * @param {number|string} selectedG - Selected G acceleration
 */
function updatePhysicsDisplay(distanceKm, selectedG) {
  const thrust = parseInt(selectedG);

  // Brachistochrone: time = 2 * sqrt(distance / acceleration)
  const distanceM = distanceKm * 1000;
  const accelM = thrust * 10; // 1G ≈ 10 m/s²
  const travelSeconds = 2 * Math.sqrt(distanceM / accelM);
  const travelHours = Math.ceil(travelSeconds / 3600);

  const halfDistanceKm = distanceKm / 2;
  const halfDistanceM = distanceM / 2;
  const maxVelocityMs = Math.sqrt(2 * accelM * halfDistanceM);
  const maxVelocityKms = maxVelocityMs / 1000;

  // Format helpers
  const formatKm = (km) => {
    if (km >= 1e9) return `${(km / 1e9).toFixed(1)}B km`;
    if (km >= 1e6) return `${(km / 1e6).toFixed(1)}M km`;
    if (km >= 1e3) return `${(km / 1e3).toFixed(0)}K km`;
    return `${km.toFixed(0)} km`;
  };

  const formatVelocity = (kms) => {
    if (kms >= 1000) return `${(kms / 1000).toFixed(0)}K km/s`;
    if (kms >= 100) return `${kms.toFixed(0)} km/s`;
    return `${kms.toFixed(1)} km/s`;
  };

  const travelText = travelHours >= 24
    ? `${Math.floor(travelHours / 24)}d ${travelHours % 24}h`
    : `${travelHours}h`;

  // Update DOM elements
  const thrustEl = document.getElementById('physics-thrust');
  const timeEl = document.getElementById('physics-time');
  const turnaroundEl = document.getElementById('physics-turnaround');
  const velocityEl = document.getElementById('physics-velocity');

  if (thrustEl) thrustEl.textContent = `${thrust}G constant`;
  if (timeEl) timeEl.textContent = travelText;
  if (turnaroundEl) turnaroundEl.textContent = formatKm(halfDistanceKm);
  if (velocityEl) velocityEl.textContent = formatVelocity(maxVelocityKms);
}
window.updatePhysicsDisplay = updatePhysicsDisplay;

/**
 * AR-71: Set contact as pilot destination (intercept course)
 */
function setContactDestination(contactId) {
  console.log('[SystemMap] Setting contact destination:', contactId);

  // Find contact in current contacts
  const contact = systemMapState.contacts?.find(c => c.id === contactId);
  if (!contact) {
    console.error('[SystemMap] Contact not found:', contactId);
    return;
  }

  // Calculate travel time from range (km at 1G thrust)
  // At 1G (10 m/s²), brachistochrone: t = 2 * sqrt(d/a)
  const distanceKm = contact.rangeKm || 10000;
  const distanceM = distanceKm * 1000;
  const accel = 10; // 1G in m/s²
  const timeSeconds = 2 * Math.sqrt(distanceM / accel);
  const travelHours = Math.max(1, Math.ceil(timeSeconds / 3600));

  // Format ETA
  const etaText = travelHours >= 24
    ? `${Math.floor(travelHours / 24)}d ${travelHours % 24}h`
    : `${travelHours}h`;

  const targetName = contact.name || `Contact ${contactId}`;

  // Call setCourse via global function (defined in app.js)
  if (typeof window.setCourse === 'function') {
    window.setCourse(targetName, etaText, {
      contactId: contact.id,
      travelHours,
      isIntercept: true
    });
  }

  // Update info panel to show it's selected as destination
  hideBodyInfoPanel();

  // Show notification
  if (typeof window.showNotification === 'function') {
    window.showNotification(`Intercept course plotted for ${targetName} (${etaText})`, 'success');
  }
}

window.setContactDestination = setContactDestination;

/**
 * Hide info panel
 */
function hideBodyInfoPanel() {
  const existing = document.getElementById('system-map-info-panel');
  if (existing) existing.remove();
}

// Global access for close button
window.hideSystemMapInfoPanel = hideBodyInfoPanel;

/**
 * Calculate travel time string for display (AU input)
 * Assumes 1G thrust, simplified Traveller physics
 */
function formatTravelTimeFromAU(auDistance) {
  // 1 AU = 149,597,870.7 km
  // At 1G (10 m/s²), brachistochrone trajectory:
  // t = 2 * sqrt(d / a) where d is half the distance (accelerate/decelerate)
  const distanceKm = auDistance * 149597870.7;
  const accel = 10; // 1G in m/s²
  const distanceM = distanceKm * 1000;

  // Brachistochrone: time = 2 * sqrt(distance / acceleration)
  const timeSeconds = 2 * Math.sqrt(distanceM / accel);
  const timeHours = timeSeconds / 3600;
  const timeDays = timeHours / 24;

  if (timeDays >= 1) {
    return `~${timeDays.toFixed(1)} days @ 1G`;
  } else if (timeHours >= 1) {
    return `~${timeHours.toFixed(1)} hours @ 1G`;
  } else {
    return `~${Math.round(timeSeconds / 60)} min @ 1G`;
  }
}

/**
 * Start the render loop (with time control support)
 */
function startRenderLoop() {
  // Prevent multiple render loops
  if (systemMapState.animationFrame) {
    cancelAnimationFrame(systemMapState.animationFrame);
    systemMapState.animationFrame = null;
  }

  function loop() {
    if (!systemMapState.paused) {
      const deltaTime = 0.016 * systemMapState.timeSpeed; // ~60fps, scaled by speed
      systemMapState.time += deltaTime;
      systemMapState.simulatedDate += deltaTime * 0.5; // Days pass

      // AR-71 Phase 3: Update contact positions based on motion
      updateContactMotion(deltaTime);
    }
    render();
    systemMapState.animationFrame = requestAnimationFrame(loop);
  }
  loop();
}

/**
 * Stop the render loop
 */
function stopRenderLoop() {
  if (systemMapState.animationFrame) {
    cancelAnimationFrame(systemMapState.animationFrame);
    systemMapState.animationFrame = null;
  }
}

/**
 * Main render function
 */
function render() {
  const { canvas, ctx, zoom, offsetX, offsetY, colors, system } = systemMapState;
  if (!canvas || !ctx) {
    console.warn('[SystemMap] render: No canvas or ctx');
    return;
  }

  const width = canvas.width / window.devicePixelRatio;
  const height = canvas.height / window.devicePixelRatio;

  // Debug logging (first few frames only)
  if (!systemMapState._debugCount) systemMapState._debugCount = 0;
  if (systemMapState._debugCount < 3) {
    console.log('[SystemMap] render:', { width, height, zoom, hasSystem: !!system, stars: system?.stars?.length });
    systemMapState._debugCount++;
  }

  // Reset ctx state to known good values
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.setLineDash([]);

  // Clear ENTIRE canvas (use actual pixel dimensions, not CSS dimensions)
  ctx.fillStyle = systemMapState.colors.space;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Scale for HiDPI displays after clearing
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  // Calculate center
  const centerX = width / 2 + offsetX;
  const centerY = height / 2 + offsetY;

  // Draw system
  if (system && system.stars) {
    drawFullSystem(ctx, centerX, centerY, zoom, system);
  } else {
    // Draw demo system
    const demoSystem = generateSystem('Demo System', 'A788899-C', 'G2 V', '1234');
    drawFullSystem(ctx, centerX, centerY, zoom, demoSystem);
  }

  // AR-36: Draw goldilocks zone (behind other overlays)
  drawGoldilocksZone(ctx, centerX, centerY, zoom);

  // AR-29.9: Draw ship integration overlays
  drawRangeBands(ctx, centerX, centerY, zoom);
  drawCourseLine(ctx, centerX, centerY, zoom);
  drawMapContacts(ctx, centerX, centerY, zoom);
  drawLocationMarkers(ctx, centerX, centerY, zoom);
  drawPartyShip(ctx, centerX, centerY, zoom);

  // AR-242: Draw ruler overlay
  drawRuler(ctx);

  // Draw zoom indicator
  drawZoomIndicator(ctx, width, height, zoom);

  // AR-88: Draw date display
  drawDateDisplay(ctx, width, height);
}

// AR-201 Phase 5: Drawing functions extracted to system-map-rendering.js

/**
 * AR-88: Snap to now (reset time to epoch)
 */
function snapToNow() {
  resetTime();
  console.log('[SystemMap] Snapped to NOW (epoch)');
}

/**
 * AR-87: Zoom system map by factor
 * @param {number} factor - Zoom multiplier (>1 zooms in, <1 zooms out)
 */
function zoomSystemMap(factor) {
  const newZoom = systemMapState.zoom * factor;
  if (newZoom >= systemMapState.MIN_ZOOM && newZoom <= systemMapState.MAX_ZOOM) {
    systemMapState.zoom = newZoom;
    console.log('[SystemMap] Zoom:', newZoom.toFixed(2));
  }
}

/**
 * AR-87: Reset system map view to default
 */
function resetSystemMapView() {
  systemMapState.zoom = 1;
  systemMapState.offsetX = 0;
  systemMapState.offsetY = 0;
  console.log('[SystemMap] View reset');
}

/**
 * AR-87/AR-199: Toggle labels on system map
 */
function toggleSystemMapLabels() {
  systemMapState.showLabels = !systemMapState.showLabels;
  localStorage.setItem('systemMapLabels', systemMapState.showLabels);
  console.log('[SystemMap] Labels:', systemMapState.showLabels ? 'ON' : 'OFF');
  if (window.showNotification) {
    window.showNotification(`Labels ${systemMapState.showLabels ? 'shown' : 'hidden'}`, 'info');
  }
}

/**
 * AR-242: Toggle ruler measurement mode
 */
function toggleRulerMode() {
  systemMapState.rulerMode = !systemMapState.rulerMode;
  if (!systemMapState.rulerMode) {
    // Clear ruler when exiting
    systemMapState.rulerStart = null;
    systemMapState.rulerEnd = null;
    hideRulerPanel();
    if (systemMapState.canvas) {
      systemMapState.canvas.style.cursor = 'grab';
    }
  } else {
    if (systemMapState.canvas) {
      systemMapState.canvas.style.cursor = 'crosshair';
    }
  }
  console.log('[SystemMap] Ruler mode:', systemMapState.rulerMode ? 'ON' : 'OFF');
  if (window.showNotification) {
    window.showNotification(`Ruler ${systemMapState.rulerMode ? 'enabled - click and drag to measure' : 'disabled'}`, 'info');
  }
}

/**
 * AR-242: Calculate distance from canvas points to real units
 */
function calculateRulerDistance() {
  if (!systemMapState.rulerStart || !systemMapState.rulerEnd) return null;

  const { zoom, offsetX, offsetY } = systemMapState;
  const rect = systemMapState.canvas.getBoundingClientRect();
  const centerX = rect.width / 2 + offsetX;
  const centerY = rect.height / 2 + offsetY;
  const auToPixels = systemMapState.AU_TO_PIXELS * zoom;

  // Convert canvas coords to AU
  const startAU = {
    x: (systemMapState.rulerStart.x - centerX) / auToPixels,
    y: (systemMapState.rulerStart.y - centerY) / auToPixels
  };
  const endAU = {
    x: (systemMapState.rulerEnd.x - centerX) / auToPixels,
    y: (systemMapState.rulerEnd.y - centerY) / auToPixels
  };

  const distAU = Math.sqrt((endAU.x - startAU.x) ** 2 + (endAU.y - startAU.y) ** 2);
  const distKm = distAU * 149597870.7;  // 1 AU in km
  const lightSeconds = distKm / 299792.458;  // Speed of light km/s

  // Brachistochrone travel time at selected thrust
  const thrust = systemMapState.rulerThrust || 1;
  const accelM = thrust * 10;  // m/s^2
  const distM = distKm * 1000;
  const travelSeconds = 2 * Math.sqrt(distM / accelM);
  const travelHours = travelSeconds / 3600;

  return { distAU, distKm, lightSeconds, travelHours, thrust };
}

/**
 * AR-242: Show ruler measurement result panel
 */
function showRulerResult() {
  const result = calculateRulerDistance();
  if (!result) return;

  hideRulerPanel();

  const panel = document.createElement('div');
  panel.id = 'ruler-result-panel';
  panel.className = 'system-map-info-panel ruler-panel';

  // Format distance display
  const distDisplay = result.distAU < 0.01
    ? `${Math.round(result.distKm).toLocaleString()} km`
    : `${result.distAU.toFixed(3)} AU`;

  const lightDisplay = result.lightSeconds < 60
    ? `${result.lightSeconds.toFixed(1)} light-seconds`
    : result.lightSeconds < 3600
      ? `${(result.lightSeconds / 60).toFixed(1)} light-minutes`
      : `${(result.lightSeconds / 3600).toFixed(2)} light-hours`;

  // Format travel time
  let travelDisplay;
  if (result.travelHours < 1) {
    travelDisplay = `${Math.round(result.travelHours * 60)} minutes`;
  } else if (result.travelHours < 24) {
    travelDisplay = `${result.travelHours.toFixed(1)} hours`;
  } else {
    travelDisplay = `${(result.travelHours / 24).toFixed(1)} days`;
  }

  panel.innerHTML = `
    <div class="info-panel-header">
      <h3>Distance Measurement</h3>
      <button class="info-panel-close" onclick="window.hideRulerPanel()">×</button>
    </div>
    <div class="info-panel-content">
      <div class="info-row"><span class="info-label">Distance:</span> <span class="info-value">${distDisplay}</span></div>
      <div class="info-row"><span class="info-label">Light:</span> <span class="info-value">${lightDisplay}</span></div>
      <div class="info-row"><span class="info-label">km:</span> <span class="info-value">${Math.round(result.distKm).toLocaleString()}</span></div>
      <div class="info-section">
        <div class="info-section-title">Travel Time (${result.thrust}G)</div>
        <div class="info-row"><span class="info-label">Brachistochrone:</span> <span class="info-value">${travelDisplay}</span></div>
        <div class="thrust-selector">
          <button onclick="window.setRulerThrust(1)" class="${result.thrust === 1 ? 'active' : ''}">1G</button>
          <button onclick="window.setRulerThrust(2)" class="${result.thrust === 2 ? 'active' : ''}">2G</button>
          <button onclick="window.setRulerThrust(4)" class="${result.thrust === 4 ? 'active' : ''}">4G</button>
          <button onclick="window.setRulerThrust(6)" class="${result.thrust === 6 ? 'active' : ''}">6G</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);
}

/**
 * AR-242: Hide ruler result panel
 */
function hideRulerPanel() {
  const panel = document.getElementById('ruler-result-panel');
  if (panel) panel.remove();
}

/**
 * AR-242: Set ruler thrust and update display
 */
function setRulerThrust(thrust) {
  systemMapState.rulerThrust = thrust;
  showRulerResult();  // Refresh panel
}

/**
 * AR-242: Draw ruler line on canvas
 */
function drawRuler(ctx) {
  if (!systemMapState.rulerMode || !systemMapState.rulerStart || !systemMapState.rulerEnd) return;

  ctx.save();

  // Draw ruler line
  ctx.beginPath();
  ctx.moveTo(systemMapState.rulerStart.x, systemMapState.rulerStart.y);
  ctx.lineTo(systemMapState.rulerEnd.x, systemMapState.rulerEnd.y);
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.stroke();

  // Draw endpoints
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.arc(systemMapState.rulerStart.x, systemMapState.rulerStart.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(systemMapState.rulerEnd.x, systemMapState.rulerEnd.y, 5, 0, Math.PI * 2);
  ctx.fill();

  // Draw distance label at midpoint
  const result = calculateRulerDistance();
  if (result) {
    const midX = (systemMapState.rulerStart.x + systemMapState.rulerEnd.x) / 2;
    const midY = (systemMapState.rulerStart.y + systemMapState.rulerEnd.y) / 2;
    const label = result.distAU < 0.01
      ? `${Math.round(result.distKm).toLocaleString()} km`
      : `${result.distAU.toFixed(2)} AU`;

    ctx.font = '12px monospace';
    ctx.fillStyle = '#ffcc00';
    ctx.textAlign = 'center';
    ctx.fillText(label, midX, midY - 10);
  }

  ctx.restore();
}

// AR-242: Expose ruler functions globally
window.hideRulerPanel = hideRulerPanel;
window.setRulerThrust = setRulerThrust;
window.toggleRulerMode = toggleRulerMode;

/**
 * Load a star system for display
 * @param {Object} systemData - System data object
 */
function loadSystem(systemData, sector = 'Spinward Marches', hex = null) {
  systemMapState.system = systemData;
  systemMapState.sector = sector;
  systemMapState.hex = hex || systemData?.hex;
  // Reset view
  systemMapState.zoom = 1;
  systemMapState.offsetX = 0;
  systemMapState.offsetY = 0;
  console.log('[SystemMap] Loaded system:', systemData?.name || 'Unknown', `(${sector}:${systemMapState.hex})`);
}

/**
 * Clean up the system map
 */
function destroySystemMap() {
  stopRenderLoop();

  if (systemMapState.canvas) {
    systemMapState.canvas.remove();
    systemMapState.canvas = null;
    systemMapState.ctx = null;
  }

  // Clean up overlays
  hideBodyInfoPanel();
  hidePlacesOverlay();
  systemMapState.selectedBody = null;

  window.removeEventListener('resize', resizeCanvas);
  console.log('[SystemMap] Destroyed');
}

// ==================== Procedural Generation ====================

/**
 * Generate a star system from UWP and stellar data
 * @param {string} name - System name
 * @param {string} uwp - UWP code (e.g., "A788899-C")
 * @param {string} stellarClass - Stellar classification (e.g., "G2 V")
 * @param {string} hex - Hex location for seeding
 * @returns {Object} Generated system data
 */
function generateSystem(name, uwp = 'X000000-0', stellarClass = 'G2 V', hex = '0000', preset = null) {
  // Seed random from hex for consistency
  const seed = parseInt(hex, 16) || 12345;
  const rng = seededRandom(seed);

  // Parse stellar class
  const stars = parseStars(stellarClass, rng);

  // Parse UWP
  const starportClass = uwp[0] || 'X';
  const mainworldSize = parseInt(uwp[1], 16) || 5;
  const mainworldAtmo = parseInt(uwp[2], 16) || 5;
  const mainworldHydro = parseInt(uwp[3], 16) || 5;
  const mainworldPop = parseInt(uwp[4], 16) || 0;
  const techLevel = parseInt(uwp[7], 16) || 0;

  let planets, asteroidBelts;

  // Use preset if available, otherwise generate randomly
  if (preset && preset.planets) {
    console.log(`[SystemMap] Using preset planets for ${name}`);
    // Convert preset planets to full planet objects
    planets = preset.planets.map((p, i) => {
      const planet = {
        id: `planet_${i}`,
        name: p.name,
        type: p.type,
        orbitAU: p.orbitAU,
        orbitPeriod: Math.sqrt(p.orbitAU * p.orbitAU * p.orbitAU) * 365,
        size: p.size,
        isMainworld: p.isMainworld || false,
        hasRings: p.hasRings || false,
        moons: []
      };
      // Generate moons if specified
      if (p.moons) {
        for (let m = 0; m < p.moons; m++) {
          planet.moons.push({
            id: `moon_${i}_${m}`,
            name: `${p.name} ${String.fromCharCode(97 + m)}`,
            size: 500 + rng() * 2500,
            orbitRadius: (m + 1) * 40000 + rng() * 80000
          });
        }
      }
      return planet;
    });

    // Use preset asteroid belts
    asteroidBelts = (preset.asteroidBelts || []).map((belt, i) => ({
      id: `belt_${i}`,
      innerRadius: belt.innerRadius,
      outerRadius: belt.outerRadius,
      density: belt.density || 0.4,
      canMine: true
    }));
  } else {
    // Generate planets randomly
    planets = generatePlanets(rng, stars[0], mainworldSize, mainworldAtmo, mainworldHydro);

    // Generate asteroid belt (30% chance)
    asteroidBelts = [];
    if (rng() < 0.3) {
      const beltAU = 2.0 + rng() * 2.0;
      asteroidBelts.push({
        id: 'belt_0',
        innerRadius: beltAU * 0.8,
        outerRadius: beltAU * 1.2,
        density: 0.3 + rng() * 0.4,
        canMine: true
      });
    }
  }

  // Add starport to mainworld
  const mainworld = planets.find(p => p.isMainworld);
  if (mainworld) {
    mainworld.starport = generateStarport(starportClass, mainworldPop, techLevel, rng);
  }

  // Mark gas giants for fuel scooping
  planets.filter(p => p.type === 'gas').forEach(p => {
    p.canScoop = true;
    p.fuelAvailable = 'Unrefined (wilderness)';
  });

  // Build places array (clickable destinations)
  const places = generatePlaces(planets, asteroidBelts, starportClass, name);

  console.log(`[SystemMap] Generated ${name}: ${stars.length} stars, ${planets.length} planets, ${asteroidBelts.length} belts`);

  return {
    name,
    uwp,
    stellarClass,
    starportClass,
    hex,
    stars,
    planets,
    asteroidBelts,
    places,
    generated: true
  };
}

/**
 * Generate starport based on class
 */
function generateStarport(starportClass, population, techLevel, rng) {
  const starport = {
    class: starportClass,
    hasHighport: false,
    hasDownport: false,
    facilities: [],
    fuel: 'None'
  };

  switch (starportClass) {
    case 'A':
      starport.hasHighport = true;
      starport.hasDownport = true;
      starport.fuel = 'Refined';
      starport.facilities = ['Shipyard (all)', 'Repair', 'Naval Base possible'];
      break;
    case 'B':
      starport.hasHighport = true;
      starport.hasDownport = true;
      starport.fuel = 'Refined';
      starport.facilities = ['Shipyard (spacecraft)', 'Repair', 'Scout Base possible'];
      break;
    case 'C':
      starport.hasHighport = population >= 6;
      starport.hasDownport = true;
      starport.fuel = 'Unrefined';
      starport.facilities = ['Shipyard (small craft)', 'Repair'];
      break;
    case 'D':
      starport.hasHighport = false;
      starport.hasDownport = true;
      starport.fuel = 'Unrefined';
      starport.facilities = ['Limited repair'];
      break;
    case 'E':
      starport.hasHighport = false;
      starport.hasDownport = true;
      starport.fuel = 'None';
      starport.facilities = ['Frontier (no facilities)'];
      break;
    default: // X
      starport.hasHighport = false;
      starport.hasDownport = false;
      starport.fuel = 'None';
      starport.facilities = ['No starport'];
  }

  return starport;
}

/**
 * Generate clickable places for the system
 */
function generatePlaces(planets, asteroidBelts, starportClass, systemName) {
  const places = [];

  // Jump point (100 diameters from primary star)
  places.push({
    id: 'jump_point',
    name: 'Jump Point',
    type: 'navigation',
    description: '100-diameter safe jump distance',
    icon: '⚡'
  });

  // Mainworld and starport
  const mainworld = planets.find(p => p.isMainworld);
  if (mainworld) {
    places.push({
      id: 'mainworld',
      name: mainworld.name || systemName,
      type: 'world',
      planetId: mainworld.id,
      description: `Mainworld - ${mainworld.starport?.fuel || 'no'} fuel available`,
      icon: '🌍'
    });

    if (mainworld.starport?.hasHighport) {
      places.push({
        id: 'highport',
        name: `${systemName} Highport`,
        type: 'station',
        planetId: mainworld.id,
        description: `Class ${starportClass} orbital station`,
        icon: '🛸'
      });
    }

    if (mainworld.starport?.hasDownport) {
      places.push({
        id: 'downport',
        name: `${systemName} Downport`,
        type: 'station',
        planetId: mainworld.id,
        description: `Class ${starportClass} surface facility`,
        icon: '🏗️'
      });
    }
  }

  // Gas giants (fuel scooping)
  planets.filter(p => p.type === 'gas').forEach((gas, i) => {
    places.push({
      id: `gas_giant_${i}`,
      name: gas.name,
      type: 'fuel',
      planetId: gas.id,
      description: 'Gas giant - wilderness refueling',
      icon: '⛽'
    });
  });

  // Asteroid belts (mining)
  asteroidBelts.forEach((belt, i) => {
    places.push({
      id: `belt_${i}`,
      name: `Asteroid Belt ${i + 1}`,
      type: 'mining',
      description: 'Asteroid mining opportunities',
      icon: '⛏️'
    });
  });

  return places;
}

/**
 * AR-XXX: Generate places from celestial objects for loaded sector systems
 * This creates destination entries for all navigable locations:
 * - Jump point (100-diameter safe distance)
 * - Planet orbits (all planets)
 * - Gas giant skim points (wilderness refueling)
 * - Gas giant jump points (AR-136: 100-diameter safe distance from gas giant)
 * - Highports and downports
 * - Asteroid belts
 * - Moons
 * - Naval/Scout bases
 *
 * @param {Array} celestialObjects - Celestial objects from sector data
 * @param {Object} systemData - System metadata (hasNaval, hasScout, starportClass, systemName)
 * @returns {Array} Array of place objects for the Places overlay
 */

/**
 * AR-FIX: Generate places from server-generated planet array
 * Simpler version for procedurally generated systems
 */
function generatePlacesFromPlanets(planets, systemData) {
  const places = [];
  const { starportClass, systemName } = systemData;

  // 1. System Jump Point (always present)
  places.push({
    id: 'jump_point',
    name: 'Jump Point',
    type: 'navigation',
    description: '100-diameter safe jump distance from primary',
    icon: '⚡'
  });

  // 2. Process each planet
  planets.forEach((planet, i) => {
    const planetId = planet.id || `planet_${i}`;
    const planetName = planet.name || `Planet ${i + 1}`;

    // All planets get an orbit destination
    places.push({
      id: `orbit-${planetId}`,
      name: `Orbit - ${planetName}`,
      type: 'orbit',
      linkedTo: planetId,
      orbitAU: planet.orbitAU,
      radiusKm: planet.radiusKm || planet.size,
      icon: planet.isMainworld ? '🌍' : '🪐',
      description: planet.isMainworld ? 'Mainworld' : 'Planetary orbit'
    });

    // Gas giants get skim points
    if (planet.type === 'Gas' || planet.type === 'Ice' || planet.type === 'GasGiant') {
      places.push({
        id: `skim-${planetId}`,
        name: `${planetName} - Skim Point`,
        type: 'fuel',
        linkedTo: planetId,
        orbitAU: planet.orbitAU,
        radiusKm: planet.radiusKm || planet.size,
        icon: '⛽',
        description: 'Wilderness refueling (Pilot check required)'
      });
    }
  });

  // 3. Mainworld highport if starport exists
  if (starportClass && starportClass !== 'X') {
    const mainworld = planets.find(p => p.isMainworld) || planets[0];
    if (mainworld) {
      places.push({
        id: 'dock-highport',
        name: `${systemName || 'System'} Highport`,
        type: 'station',
        linkedTo: mainworld.id || 'planet_0',
        orbitAU: mainworld.orbitAU,
        icon: '🛸',
        description: `Class ${starportClass} Starport`
      });
    }
  }

  return places;
}

function generatePlacesFromCelestial(celestialObjects, systemData) {
  const places = [];
  const { hasNaval, hasScout, starportClass, systemName } = systemData;

  // 1. System Jump Point (always present)
  places.push({
    id: 'jump_point',
    name: 'Jump Point',
    type: 'navigation',
    description: '100-diameter safe jump distance from primary',
    icon: '⚡'
  });

  // 2. Process each celestial object
  celestialObjects.forEach(obj => {
    const objType = obj.type;

    switch (objType) {
      case 'Planet':
        // All planets get an orbit destination
        places.push({
          id: `orbit-${obj.id}`,
          name: `Orbit - ${obj.name}`,
          type: 'orbit',
          linkedTo: obj.id,
          orbitAU: obj.orbitAU,
          radiusKm: obj.radiusKm,
          icon: obj.uwp ? '🌍' : '🪐',  // Mainworld vs other planet
          description: obj.uwp ? 'Mainworld' : 'Planetary orbit'
        });
        break;

      case 'Gas Giant':
      case 'Ice Giant':
        // Orbit around gas giant
        places.push({
          id: `orbit-${obj.id}`,
          name: `Orbit - ${obj.name}`,
          type: 'orbit',
          linkedTo: obj.id,
          orbitAU: obj.orbitAU,
          radiusKm: obj.radiusKm,
          icon: '🪐',
          description: objType
        });
        // Skim point (upper atmosphere - wilderness refueling)
        places.push({
          id: `skim-${obj.id}`,
          name: `${obj.name} - Skim Point`,
          type: 'fuel',
          linkedTo: obj.id,
          orbitAU: obj.orbitAU,
          radiusKm: obj.radiusKm,
          icon: '⛽',
          description: 'Wilderness refueling (Pilot check required)'
        });
        // Jump point (100 diameters out) - AR-136
        places.push({
          id: `jump-${obj.id}`,
          name: `${obj.name} - Jump Point`,
          type: 'navigation',
          linkedTo: obj.id,
          orbitAU: obj.orbitAU,
          radiusKm: obj.radiusKm,
          icon: '⚡',
          description: '100-diameter safe jump distance'
        });
        break;

      case 'Highport':
      case 'Station':
        places.push({
          id: `dock-${obj.id}`,
          name: obj.name,
          type: 'dock',
          linkedTo: obj.id,
          orbitAU: obj.orbitAU,
          radiusKm: obj.radiusKm,
          icon: '🛸',
          description: obj.notes || `Class ${starportClass || '?'} orbital facility`
        });
        break;

      case 'Moon':
        // Moons get orbit destinations
        places.push({
          id: `orbit-${obj.id}`,
          name: `Orbit - ${obj.name}`,
          type: 'orbit',
          linkedTo: obj.id,
          orbitAU: obj.orbitAU,
          radiusKm: obj.radiusKm,
          icon: '🌙',
          description: 'Lunar orbit'
        });
        break;

      case 'Belt':
      case 'Asteroid Belt':
      case 'Planetoid Belt':
        places.push({
          id: `belt-${obj.id}`,
          name: obj.name || 'Asteroid Belt',
          type: 'mining',
          linkedTo: obj.id,
          orbitAU: obj.orbitAU,
          icon: '⛏️',
          description: 'Asteroid mining opportunities'
        });
        break;
    }
  });

  // 3. Add Naval Base if present
  if (hasNaval) {
    places.push({
      id: 'naval-base',
      name: `${systemName} Naval Base`,
      type: 'military',
      icon: '⚓',
      description: 'Imperial Naval Base (restricted access)'
    });
  }

  // 4. Add Scout Base if present
  if (hasScout) {
    places.push({
      id: 'scout-base',
      name: `${systemName} Scout Base`,
      type: 'military',
      icon: '🔭',
      description: 'Imperial Scout Service Base'
    });
  }

  // 5. Add starport facilities based on class
  // A/B: Highport + Downport, C: Maybe Highport + Downport, D/E: Downport only
  const mainworld = celestialObjects.find(obj => obj.uwp);
  if (mainworld && starportClass && starportClass !== 'X') {
    // Check if Highport already exists in celestialObjects
    const hasHighportInObjects = celestialObjects.some(obj => obj.type === 'Highport');

    // Add Highport for A/B class (and high-pop C class)
    if (!hasHighportInObjects && ['A', 'B'].includes(starportClass)) {
      places.push({
        id: 'highport',
        name: `${systemName} Highport`,
        type: 'dock',
        linkedTo: mainworld.id,
        icon: '🛸',
        description: `Class ${starportClass} orbital starport - refined fuel available`
      });
    }

    // Add Downport for all starports except X (A, B, C, D, E all have surface facilities)
    places.push({
      id: 'downport',
      name: `${systemName} Downport`,
      type: 'dock',
      linkedTo: mainworld.id,
      icon: '🏗️',
      description: `Class ${starportClass} surface starport`
    });
  }

  return places;
}

/**
 * Seeded random number generator
 */
function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Parse stellar classification into star objects
 */
function parseStars(stellarClass, rng) {
  const stars = [];
  const parts = stellarClass.split(/\s+/);

  // Parse stellar class format: "F7 V M0 V M4 V" -> [F7, V, M0, V, M4, V]
  // Each star is (type, luminosity) pair
  let i = 0;
  let starIndex = 0;

  while (i < parts.length) {
    const typeSpec = parts[i] || 'G2';
    const luminosity = parts[i + 1] || 'V';

    // Extract spectral type (letter) and subtype (number)
    const type = typeSpec[0] || 'G';
    const subtype = parseInt(typeSpec.slice(1)) || 2;

    // Position companion stars away from primary
    let position;
    if (starIndex === 0) {
      position = { x: 0, y: 0 };
    } else if (starIndex === 1) {
      position = { x: 0.8, y: 0.4 }; // Close binary companion
    } else {
      position = { x: -0.6, y: -0.5 }; // Distant tertiary
    }

    stars.push({
      type,
      subtype,
      luminosity,
      radius: getStarRadius(type, luminosity) * (starIndex === 0 ? 1 : 0.7),
      color: getStarColor(type),
      position,
      isPrimary: starIndex === 0
    });

    i += 2; // Move to next type/luminosity pair
    starIndex++;

    // Safety limit
    if (starIndex >= 4) break;
  }

  // Fallback if parsing failed
  if (stars.length === 0) {
    stars.push({
      type: 'G', subtype: 2, luminosity: 'V',
      radius: 1, color: getStarColor('G'),
      position: { x: 0, y: 0 }, isPrimary: true
    });
  }

  console.log(`[SystemMap] parseStars: "${stellarClass}" -> ${stars.length} stars`);
  return stars;
}

/**
 * Get star radius based on type and luminosity
 */
function getStarRadius(type, luminosity) {
  const baseRadius = {
    O: 15, B: 8, A: 2.5, F: 1.4, G: 1.0, K: 0.8, M: 0.5, L: 0.2, T: 0.1, D: 0.01
  };
  const lumMultiplier = {
    Ia: 100, Ib: 50, II: 25, III: 10, IV: 3, V: 1, VI: 0.5, D: 0.01
  };
  return (baseRadius[type] || 1) * (lumMultiplier[luminosity] || 1);
}

/**
 * Get star color for rendering
 */
function getStarColor(type) {
  const colors = {
    O: '#9bb0ff', B: '#aabfff', A: '#cad7ff', F: '#f8f7ff',
    G: '#fff4ea', K: '#ffd2a1', M: '#ffcc6f', L: '#ff6633',
    T: '#cc3300', D: '#ffffff'
  };
  return colors[type] || colors.G;
}

/**
 * Generate planets for a system
 */
function generatePlanets(rng, primaryStar, mainSize, mainAtmo, mainHydro) {
  const planets = [];
  const planetCount = 3 + Math.floor(rng() * 6); // 3-8 planets

  // Habitable zone based on star type
  const habZone = getHabitableZone(primaryStar.type);

  // Mainworld position (in habitable zone if atmosphere permits)
  const mainworldAU = (mainAtmo >= 4 && mainAtmo <= 9)
    ? habZone.inner + rng() * (habZone.outer - habZone.inner)
    : 0.3 + rng() * 0.7; // Inner system if not habitable

  // Generate orbit slots
  const orbits = generateOrbits(rng, planetCount, mainworldAU);

  for (let i = 0; i < planetCount; i++) {
    const au = orbits[i];
    const isMainworld = Math.abs(au - mainworldAU) < 0.1;

    let type, size;
    if (isMainworld) {
      type = mainAtmo >= 4 && mainAtmo <= 9 ? 'habitable' : 'rocky';
      size = 2000 + mainSize * 1000; // km
    } else if (au > 3.0) {
      // Outer system - gas giants or ice
      type = rng() < 0.6 ? 'gas' : 'ice';
      size = type === 'gas' ? 30000 + rng() * 100000 : 5000 + rng() * 15000;
    } else {
      // Inner system - rocky
      type = 'rocky';
      size = 2000 + rng() * 8000;
    }

    const planet = {
      id: `planet_${i}`,
      name: isMainworld ? 'Mainworld' : `Planet ${i + 1}`,
      type,
      orbitAU: au,
      orbitPeriod: Math.sqrt(au * au * au) * 365, // Kepler's 3rd law (days)
      size, // km diameter
      isMainworld,
      hasRings: type === 'gas' && rng() < 0.4,
      moons: []
    };

    // Generate moons for larger planets
    if (size > 10000) {
      const moonCount = Math.floor(rng() * 5);
      for (let m = 0; m < moonCount; m++) {
        planet.moons.push({
          id: `moon_${i}_${m}`,
          name: `${planet.name} ${String.fromCharCode(97 + m)}`,
          size: 500 + rng() * 3000,
          orbitRadius: (m + 1) * 50000 + rng() * 100000 // km
        });
      }
    }

    planets.push(planet);
  }

  // Sort by orbit
  planets.sort((a, b) => a.orbitAU - b.orbitAU);

  return planets;
}

/**
 * Generate orbital distances
 */
function generateOrbits(rng, count, mainworldAU) {
  const orbits = [mainworldAU];

  // Titius-Bode-like progression
  let au = 0.2;
  for (let i = 0; i < count - 1; i++) {
    au = au * (1.4 + rng() * getYScale());
    if (Math.abs(au - mainworldAU) > 0.2) {
      orbits.push(au);
    }
  }

  return orbits.slice(0, count).sort((a, b) => a - b);
}

// ==================== Test Systems ====================

/**
 * Pre-defined test systems from Spinward Marches
 * Real data from TravellerMap API
 */
const TEST_SYSTEMS = {
  dorannia: {
    name: 'Dorannia',
    hex: '0530',
    uwp: 'E42158A-8',
    stellarClass: 'K4 V',  // Orange dwarf - smaller, dimmer
    tradeCodes: 'He Ni Po',
    // Preset: Sparse system with asteroid belt
    preset: {
      planets: [
        { name: 'Dorannia I', type: 'rocky', orbitAU: 0.3, size: 3000, isMainworld: false },
        { name: 'Dorannia', type: 'rocky', orbitAU: 0.6, size: 4200, isMainworld: true },
        { name: 'Dorannia III', type: 'ice', orbitAU: 2.5, size: 6000, isMainworld: false },
        { name: 'Outer Giant', type: 'gas', orbitAU: 5.0, size: 45000, isMainworld: false, hasRings: false, moons: 2 }
      ],
      asteroidBelts: [{ innerRadius: 1.2, outerRadius: 1.8, density: 0.5 }],
      description: 'Sparse orange dwarf system with prominent asteroid belt'
    }
  },
  flammarion: {
    name: 'Flammarion',
    hex: '0930',
    uwp: 'A623514-B',
    stellarClass: 'F8 V',  // Bright yellow-white star
    tradeCodes: 'Ni Po',
    // Preset: Rich system with multiple gas giants
    preset: {
      planets: [
        { name: 'Flammarion I', type: 'rocky', orbitAU: 0.4, size: 4800, isMainworld: false },
        { name: 'Flammarion', type: 'rocky', orbitAU: 0.9, size: 6200, isMainworld: true },
        { name: 'Flammarion III', type: 'rocky', orbitAU: 1.4, size: 5500, isMainworld: false },
        { name: 'Beaumont', type: 'gas', orbitAU: 3.2, size: 85000, isMainworld: false, hasRings: true, moons: 4 },
        { name: 'Verne', type: 'gas', orbitAU: 6.5, size: 120000, isMainworld: false, hasRings: true, moons: 6 },
        { name: 'Outer Ice', type: 'ice', orbitAU: 12.0, size: 8000, isMainworld: false, moons: 1 }
      ],
      asteroidBelts: [],
      description: 'Bright F-class system with twin ringed gas giants'
    }
  },
  caladbolg: {
    name: 'Caladbolg',
    hex: '1329',
    uwp: 'B565776-A',
    stellarClass: 'F7 V M0 V M4 V', // TRINARY system!
    tradeCodes: 'Ag Ri',
    // Preset: Trinary system - 3 visible stars!
    preset: {
      planets: [
        { name: 'Caladbolg I', type: 'rocky', orbitAU: 0.5, size: 3500, isMainworld: false },
        { name: 'Caladbolg', type: 'habitable', orbitAU: 1.2, size: 6500, isMainworld: true },
        { name: 'Caladbolg III', type: 'habitable', orbitAU: 1.8, size: 5800, isMainworld: false },
        { name: 'Magnus', type: 'gas', orbitAU: 4.5, size: 95000, isMainworld: false, hasRings: false, moons: 8 },
        { name: 'Caladbolg V', type: 'ice', orbitAU: 8.0, size: 7200, isMainworld: false, moons: 2 }
      ],
      asteroidBelts: [{ innerRadius: 2.8, outerRadius: 3.5, density: 0.3 }],
      description: 'TRINARY system - 3 stars! Agricultural world'
    }
  }
};

/**
 * Load a test system by name
 */
function loadTestSystem(systemKey) {
  const testData = TEST_SYSTEMS[systemKey.toLowerCase()];
  if (!testData) {
    console.warn(`[SystemMap] Unknown test system: ${systemKey}`);
    return null;
  }

  // Pass preset if available for distinct system layouts
  const system = generateSystem(
    testData.name,
    testData.uwp,
    testData.stellarClass,
    testData.hex,
    testData.preset  // Pass the preset planets/belts
  );

  systemMapState.system = system;
  systemMapState.hex = testData.hex;
  systemMapState.zoom = 1;
  systemMapState.offsetX = 0;
  systemMapState.offsetY = 0;

  console.log(`[SystemMap] Loaded test system: ${testData.name}`, system);
  return system;
}

/**
 * Load a star system directly from JSON data (from data/star-systems/*.json or generated)
 * @param {Object} jsonData - The parsed JSON system data
 * @returns {Object} The loaded system
 */
function loadSystemFromJSON(jsonData) {
  if (!jsonData) {
    console.warn('[SystemMap] Invalid system JSON data - null');
    return null;
  }

  // AR-FIX: Handle both hand-crafted format (celestialObjects) and generated format (stars/planets)
  const isGenerated = jsonData.generated === true || (jsonData.stars && jsonData.planets);

  if (!jsonData.celestialObjects && !isGenerated) {
    console.warn('[SystemMap] Invalid system JSON data - no celestialObjects or generated data');
    return null;
  }

  // Convert celestialObjects to the expected planet format
  const celestialObjects = jsonData.celestialObjects || [];

  let stars, planets, asteroidBelts;

  if (isGenerated) {
    // AR-FIX: Use pre-parsed data from server-generated systems
    stars = jsonData.stars || [];
    planets = (jsonData.planets || []).map((planet, i) => ({
      id: planet.id || `planet_${i}`,
      name: planet.name || `Planet ${i + 1}`,
      type: planet.type || 'Rocky',
      orbitAU: planet.orbitAU || 1,
      orbitPeriod: Math.sqrt(Math.pow(planet.orbitAU || 1, 3)) * 365,
      size: planet.radius || planet.size || 5000,
      isMainworld: planet.isMainworld || false,
      hasRings: planet.hasRings || false,
      moons: planet.moons || [],
      inGoldilocks: planet.inGoldilocks || false,
      radiusKm: planet.radius
    }));
    asteroidBelts = (jsonData.asteroidBelts || []).map((belt, i) => ({
      id: belt.id || `belt_${i}`,
      innerRadius: belt.innerRadius || 1.5,
      outerRadius: belt.outerRadius || 2.5,
      density: belt.density || 0.4,
      canMine: true
    }));
  } else {
    // Extract stars from celestialObjects
    stars = celestialObjects
      .filter(obj => obj.type === 'Star')
      .map(star => ({
        type: star.stellarClass?.[0] || 'G',
        subtype: parseInt(star.stellarClass?.slice(1)) || 2,
        luminosity: star.stellarClass?.split(' ')[1] || 'V',
        radius: getStarRadiusFromClass(star.stellarClass || 'G2 V'),
        position: { x: star.orbitAU || 0, y: 0 }
      }));

    // Extract planets (include Planet, Moon, Gas Giant, Ice Giant as renderable bodies)
    // AR-102: Include radiusKm for size-based zoom calculation (unified with places)
    planets = celestialObjects
      .filter(obj => ['Planet', 'Moon', 'Gas Giant', 'Ice Giant'].includes(obj.type))
      .map((planet, i) => {
        const size = estimatePlanetSize(planet);
        return {
          id: planet.id || `planet_${i}`,
          name: planet.name,
          type: getPlanetType(planet),
          orbitAU: planet.orbitAU || 1,
          orbitPeriod: Math.sqrt(Math.pow(planet.orbitAU || 1, 3)) * 365,
          size: isFinite(size) && size > 0 ? size : 5000,  // Ensure valid size
          isMainworld: !!planet.uwp,
          hasRings: planet.hasRings || false,
          moons: [],
          inGoldilocks: planet.inGoldilocks || false,
          radiusKm: planet.radiusKm  // AR-102: Pass through for size-based zoom
        };
      });

    // Extract asteroid belts (Planetoid Belt in JSON)
    asteroidBelts = celestialObjects
      .filter(obj => obj.type === 'Belt' || obj.type === 'Asteroid Belt' || obj.type === 'Planetoid Belt')
      .map((belt, i) => ({
        id: belt.id || `belt_${i}`,
        innerRadius: belt.innerAU || ((belt.orbitAU || 2) * 0.8),
        outerRadius: belt.outerAU || ((belt.orbitAU || 2) * 1.2),
        density: belt.density || 0.4,
        canMine: true
      }));
  }

  // Default star if none found
  if (stars.length === 0) {
    const stellarClass = jsonData.stellarClass || jsonData.stellar?.primary || 'G2 V';
    stars.push({
      type: stellarClass[0] || 'G',
      subtype: parseInt(stellarClass.slice(1)) || 2,
      luminosity: stellarClass.split(' ')[1] || 'V',
      radius: getStarRadiusFromClass(stellarClass),
      position: { x: 0, y: 0 }
    });
  }

  // AR-XXX: Generate places dynamically from celestial objects
  // This provides complete destination coverage for all 440+ systems
  let places;
  if (isGenerated && celestialObjects.length === 0) {
    // AR-FIX: Generate basic places from generated planets
    places = generatePlacesFromPlanets(planets, {
      starportClass: jsonData.uwp?.[0],
      systemName: jsonData.name
    });
  } else {
    places = generatePlacesFromCelestial(celestialObjects, {
      hasNaval: jsonData.hasNaval,
      hasScout: jsonData.hasScout,
      starportClass: jsonData.uwp?.[0],
      systemName: jsonData.name
    });
  }

  // Merge in any pre-defined artistic/custom locations from sector file
  // These can have camera presets and special properties
  if (jsonData.locations) {
    const generatedIds = new Set(places.map(p => p.id));
    jsonData.locations.forEach(loc => {
      if (!generatedIds.has(loc.id)) {
        const linkedObj = celestialObjects.find(obj => obj.id === loc.linkedTo);
        places.push({
          id: loc.id,
          name: loc.name,
          icon: getPlaceIcon(loc.type),
          description: loc.type || 'Location',
          orbitAU: linkedObj?.orbitAU || 1,
          type: loc.type,
          radiusKm: linkedObj?.radiusKm,
          linkedTo: loc.linkedTo,
          cam: loc.cam  // Preserve artistic camera presets
        });
      }
    });
  }

  // Build system object
  const system = {
    name: jsonData.name,
    uwp: jsonData.uwp || 'X000000-0',
    hex: jsonData.hex || '0000',
    stars,
    planets,
    asteroidBelts,
    places,
    celestialObjects: jsonData.celestialObjects || [], // Preserve for ship positioning
    locations: jsonData.locations || [],               // Preserve for ship positioning
    fromJSON: true
  };

  // Calculate habitable zone from primary star
  if (stars[0]) {
    system.habitableZone = getHabitableZone(stars[0].type);
  }

  systemMapState.system = system;
  systemMapState.hex = jsonData.hex || '0000';
  systemMapState.zoom = 1;
  systemMapState.offsetX = 0;
  systemMapState.offsetY = 0;

  // Build celestialObjects array for embedded map renderer
  // The embedded map expects: { id, name, type, radiusKm, currentX, currentY, orbitRadius, radius, color }
  // Include ALL celestial objects from JSON for size-based zoom calculation
  const embeddedObjects = [];
  const rawObjects = jsonData.celestialObjects || [];

  rawObjects.forEach(obj => {
    const orbitAU = obj.orbitAU || (obj.orbitKm ? obj.orbitKm / 149597870.7 : 0);
    const angle = Math.random() * Math.PI * 2; // Random orbital position

    // Determine position based on type
    let currentX = 0, currentY = 0;
    if (obj.type === 'Star') {
      currentX = 0;
      currentY = 0;
    } else if (obj.parent) {
      // Child objects (stations, moons, bases) orbit their parent
      // For simplicity, place near parent with small offset
      const parentObj = rawObjects.find(p => p.id === obj.parent);
      const parentOrbitAU = parentObj?.orbitAU || 0;
      currentX = Math.cos(angle) * parentOrbitAU + (obj.orbitKm || 500) / 149597870.7 * Math.cos(angle * 2);
      currentY = Math.sin(angle) * parentOrbitAU * getYScale() + (obj.orbitKm || 500) / 149597870.7 * Math.sin(angle * 2);
    } else {
      // Primary celestial bodies orbit the star
      currentX = Math.cos(angle) * orbitAU;
      currentY = Math.sin(angle) * orbitAU * getYScale(); // Elliptical view
    }

    // Color by type
    const colors = {
      'Star': '#ffff44',
      'Planet': obj.inGoldilocks ? '#44aa44' : '#8888aa',
      'Moon': '#aaaaaa',
      'Station': '#44aaff',
      'Naval Base': '#ff4444',
      'Scout Base': '#44ff44',
      'Planetoid Belt': '#666666',
      'Gas Giant': '#ff8844'
    };

    embeddedObjects.push({
      id: obj.id,
      name: obj.name,
      type: obj.type,
      parent: obj.parent,  // AR-104: Preserve parent for station camera framing
      radiusKm: obj.radiusKm,  // Preserve for size-based zoom
      currentX,
      currentY,
      orbitRadius: orbitAU,
      radius: obj.type === 'Star' ? 0.1 : 0.02, // Display radius
      color: colors[obj.type] || '#888888'
    });
  });

  systemMapState.celestialObjects = embeddedObjects;

  console.log(`[SystemMap] Loaded JSON system: ${jsonData.name} (${embeddedObjects.length} objects)`, system);

  // AR-164: Emit event so compact viewscreen can sync
  systemMapEvents.emit('systemLoaded', { system, celestialObjects: embeddedObjects });

  return system;
}

// Helper to get icon for place type
function getPlaceIcon(type) {
  const icons = {
    'Planet': '🪐',
    'Station': '🛰️',
    'Naval Base': '⚓',
    'Scout Base': '🔭',
    'Moon': '🌙'
  };
  return icons[type] || '📍';
}

// Helper to get star radius from stellar class string
function getStarRadiusFromClass(stellarClass) {
  const type = stellarClass?.[0] || 'G';
  const lum = stellarClass?.split(' ')[1] || 'V';
  const baseRadius = { O: 15, B: 8, A: 2.5, F: 1.4, G: 1.0, K: 0.8, M: 0.5, L: 0.2, T: 0.1, D: 0.01 };
  const lumMultiplier = { Ia: 100, Ib: 50, II: 25, III: 10, IV: 3, V: 1, VI: 0.5, D: 0.01 };
  return (baseRadius[type] || 1) * (lumMultiplier[lum] || 1);
}

// Helper to determine planet type from JSON
function getPlanetType(planet) {
  const type = planet.type?.toLowerCase() || '';
  if (type.includes('gas')) return 'gas';
  if (type.includes('ice')) return 'ice';
  if (planet.inGoldilocks || planet.breathable) return 'habitable';
  return 'rocky';
}

// Helper to estimate planet size from JSON
function estimatePlanetSize(planet) {
  const type = planet.type?.toLowerCase() || '';
  if (type.includes('gas')) return 80000 + Math.random() * 40000;
  if (type.includes('ice')) return 20000 + Math.random() * 15000;
  // Use UWP size digit if available
  if (planet.uwp) {
    const sizeDigit = parseInt(planet.uwp[1], 16) || 5;
    return 2000 + sizeDigit * 1000;
  }
  return 5000 + Math.random() * 5000;
}

// ==================== Time Controls ====================

/**
 * Time control state - extends systemMapState
 */
systemMapState.timeSpeed = 0.25;     // Multiplier: 0 = frozen, 0.25 = slow (default), 1 = realtime
systemMapState.paused = false;       // Pause orbital animation
systemMapState.simulatedDate = 0;    // Days since epoch (Imperial calendar)
systemMapState.baseDate = { year: 1105, day: 1 }; // Imperial date epoch

/**
 * Pause/resume orbital animation
 */
function togglePause() {
  systemMapState.paused = !systemMapState.paused;
  console.log(`[SystemMap] ${systemMapState.paused ? 'Paused' : 'Resumed'}`);
  return systemMapState.paused;
}

/**
 * Set time speed multiplier
 * @param {number} speed - 0 to 100 (0 = frozen, 1 = realtime)
 */
function setTimeSpeed(speed) {
  systemMapState.timeSpeed = Math.max(0, Math.min(100, speed));
  console.log(`[SystemMap] Time speed: ${systemMapState.timeSpeed}x`);
}

/**
 * Set simulation to a specific Imperial date
 * @param {number} year - Imperial year (e.g., 1105)
 * @param {number} day - Day of year (1-365)
 */
function setDate(year, day) {
  // Calculate days from base epoch
  const yearDiff = year - systemMapState.baseDate.year;
  const dayDiff = day - systemMapState.baseDate.day;
  const totalDays = yearDiff * 365 + dayDiff;

  systemMapState.simulatedDate = totalDays;
  // Convert to animation time (1 day = 0.1 time units for orbital motion)
  systemMapState.time = totalDays * 0.1;

  console.log(`[SystemMap] Date set to ${year}.${day.toString().padStart(3, '0')} (day ${totalDays})`);
}

/**
 * Get current Imperial date
 * @returns {Object} { year, day }
 */
function getDate() {
  const totalDays = Math.floor(systemMapState.simulatedDate);
  const years = Math.floor(totalDays / 365);
  const days = (totalDays % 365) + 1;
  return {
    year: systemMapState.baseDate.year + years,
    day: days
  };
}

/**
 * Jump forward in time
 * @param {number} days - Days to advance
 */
function advanceTime(days) {
  systemMapState.simulatedDate += days;
  // Convert days to animation time units
  systemMapState.time += days * 0.1; // 0.1 time units per day for smooth animation
  console.log(`[SystemMap] Advanced ${days} days (total: ${Math.round(systemMapState.simulatedDate)} days)`);
}

/**
 * Jump backward in time
 * @param {number} days - Days to go back
 */
function rewindTime(days) {
  systemMapState.simulatedDate -= days;
  systemMapState.time -= days * 0.1;
  if (systemMapState.time < 0) systemMapState.time = 0;
  console.log(`[SystemMap] Rewound ${days} days (total: ${Math.round(systemMapState.simulatedDate)} days)`);
}

/**
 * Reset time to epoch
 */
function resetTime() {
  systemMapState.simulatedDate = 0;
  systemMapState.time = 0;
  console.log('[SystemMap] Time reset to epoch');
}

// ==================== AR-36: Goldilocks Zone ====================

let showGoldilocksZone = false;

/**
 * Toggle habitable zone display
 */
function toggleGoldilocksZone() {
  showGoldilocksZone = !showGoldilocksZone;
  console.log(`[SystemMap] Goldilocks zone: ${showGoldilocksZone ? 'ON' : 'OFF'}`);
}

/**
 * AR-246: Get astrophysics data for a star based on type and luminosity class
 * @param {string} type - Spectral type (O, B, A, F, G, K, M, L, T, D)
 * @param {string} luminosityClass - Luminosity class (V, IV, III, II, Ib, Ia)
 * @returns {Object} Astrophysics data
 */
function getStarAstrophysicsData(type, luminosityClass = 'V') {
  // Temperature in Kelvin by spectral type (main sequence average)
  const temperatures = {
    'O': 40000, 'B': 20000, 'A': 8500, 'F': 6500,
    'G': 5700, 'K': 4500, 'M': 3200, 'L': 1800, 'T': 1000, 'D': 10000
  };

  // Mass in solar masses by spectral type (main sequence)
  const masses = {
    'O': 40, 'B': 8, 'A': 2.0, 'F': 1.3,
    'G': 1.0, 'K': 0.7, 'M': 0.3, 'L': 0.08, 'T': 0.05, 'D': 0.6
  };

  // Radius in solar radii by spectral type (main sequence)
  const radii = {
    'O': 12, 'B': 5, 'A': 1.7, 'F': 1.3,
    'G': 1.0, 'K': 0.85, 'M': 0.4, 'L': 0.1, 'T': 0.1, 'D': 0.01
  };

  // Luminosity in solar luminosities
  const luminosities = {
    'O': 100000, 'B': 1000, 'A': 20, 'F': 2.5,
    'G': 1.0, 'K': 0.4, 'M': 0.04, 'L': 0.0001, 'T': 0.00001, 'D': 0.001
  };

  // Colors for display
  const colors = {
    'O': '#9bb0ff', 'B': '#aabfff', 'A': '#cad7ff', 'F': '#f8f7ff',
    'G': '#fff4ea', 'K': '#ffd2a1', 'M': '#ffcc6f', 'L': '#ff8800', 'T': '#aa3300', 'D': '#ffffff'
  };

  const colorNames = {
    'O': 'Blue', 'B': 'Blue-White', 'A': 'White', 'F': 'Yellow-White',
    'G': 'Yellow', 'K': 'Orange', 'M': 'Red', 'L': 'Brown', 'T': 'Dark Brown', 'D': 'White Dwarf'
  };

  // Luminosity class multipliers for radius
  const lumMultipliers = {
    'Ia': 100, 'Ib': 50, 'II': 25, 'III': 10, 'IV': 3, 'V': 1, 'VI': 0.5, 'D': 0.01
  };

  const t = type?.toUpperCase() || 'G';
  const lm = lumMultipliers[luminosityClass] || 1;

  return {
    temperature: temperatures[t] || 5700,
    mass: (masses[t] || 1.0) * Math.sqrt(lm),
    radius: (radii[t] || 1.0) * lm,
    luminosity: (luminosities[t] || 1.0) * (lm * lm),
    color: colors[t] || '#fff4ea',
    colorName: colorNames[t] || 'Unknown'
  };
}

/**
 * Calculate habitable zone bounds based on stellar luminosity
 * @param {string} stellarClass - e.g., "G2 V", "K4 V", "M0 V"
 * @returns {{ inner: number, outer: number }} AU bounds
 */
function getHabitableZone(stellarClass) {
  // Approximate luminosity based on spectral type
  const luminosityMap = {
    'O': 100000, 'B': 1000, 'A': 20, 'F': 2.5,
    'G': 1.0, 'K': 0.4, 'M': 0.04
  };

  const type = stellarClass?.charAt(0)?.toUpperCase() || 'G';
  const luminosity = luminosityMap[type] || 1.0;

  // HZ scales with sqrt of luminosity
  const sqrtL = Math.sqrt(luminosity);
  return {
    inner: 0.95 * sqrtL,
    outer: 1.37 * sqrtL
  };
}

/**
 * Draw goldilocks zone overlay
 */
function drawGoldilocksZone(ctx, centerX, centerY, zoom) {
  if (!showGoldilocksZone || !systemMapState.system) return;

  const stellarClass = systemMapState.system.stellarClass || 'G2 V';
  const hz = getHabitableZone(stellarClass);
  const auToPixels = systemMapState.AU_TO_PIXELS * zoom;

  // AR-38: Use 0.6 perspective ratio to match orbital ellipses
  const perspectiveRatio = 0.6;
  const innerRadiusX = hz.inner * auToPixels;
  const innerRadiusY = innerRadiusX * perspectiveRatio;
  const outerRadiusX = hz.outer * auToPixels;
  const outerRadiusY = outerRadiusX * perspectiveRatio;

  ctx.save();

  // Draw habitable zone as translucent green elliptical annulus
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, outerRadiusX, outerRadiusY, 0, 0, Math.PI * 2);
  ctx.ellipse(centerX, centerY, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(68, 180, 68, 0.15)';
  ctx.fill();

  // Draw boundary ellipses
  ctx.strokeStyle = 'rgba(68, 180, 68, 0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, outerRadiusX, outerRadiusY, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// ==================== AR-36: Object Navigation ====================

/**
 * Navigate to a specific object in the system
 * @param {string} objectId - e.g., "star-0", "planet-2"
 */
function goToObject(objectId) {
  if (!systemMapState.system || !systemMapState.canvas) return;

  const [type, indexStr] = objectId.split('-');
  const index = parseInt(indexStr, 10);

  const width = systemMapState.canvas.width / window.devicePixelRatio;
  const height = systemMapState.canvas.height / window.devicePixelRatio;
  const centerX = width / 2;
  const centerY = height / 2;

  let targetX = 0, targetY = 0, targetZoom = 1;

  if (type === 'star') {
    // Stars are at center
    targetX = 0;
    targetY = 0;
    targetZoom = 2;
  } else if (type === 'planet') {
    const planet = systemMapState.system.planets?.[index];
    if (planet) {
      // Calculate planet position
      const orbitSpeed = 0.1 / Math.sqrt(planet.orbitAU || 1);
      const angle = systemMapState.time * orbitSpeed;
      targetX = Math.cos(angle) * planet.orbitAU * systemMapState.AU_TO_PIXELS;
      targetY = Math.sin(angle) * planet.orbitAU * systemMapState.AU_TO_PIXELS;

      // Zoom based on orbit size
      targetZoom = Math.min(10, Math.max(1, 50 / planet.orbitAU));
    }
  }

  // Animate to target (simple instant transition for now)
  systemMapState.offsetX = centerX - targetX * targetZoom;
  systemMapState.offsetY = centerY - targetY * targetZoom;
  systemMapState.zoom = targetZoom;

  console.log(`[SystemMap] Navigated to ${objectId}`);
}

// ==================== AR-29.9: Ship Integration ====================

/**
 * Ship state on system map
 */
const shipMapState = {
  partyShip: null,       // { position: {x, y, z}, heading, name }
  contacts: [],          // Sensor contacts
  showRangeBands: false, // Toggle for range band overlay
  destination: null      // Current course destination
};

/**
 * Update party ship position on system map
 * @param {Object} shipData - { position: {x, y, z}, heading, name }
 */
function updateShipPosition(shipData) {
  shipMapState.partyShip = shipData;
}

/**
 * Update sensor contacts on system map
 * @param {Array} contacts - Array of sensor contacts
 */
function updateMapContacts(contacts) {
  shipMapState.contacts = contacts || [];
}

/**
 * Toggle range band overlay
 */
function toggleRangeBands() {
  shipMapState.showRangeBands = !shipMapState.showRangeBands;
}

/**
 * Set destination for course plotting
 */
function setMapDestination(bodyId) {
  const system = systemMapState.system;
  if (!system) return;

  // Find body by id
  const allBodies = [...(system.planets || []), ...(system.places || [])];
  const body = allBodies.find(b => b.id === bodyId);
  shipMapState.destination = body || null;
}

/**
 * Draw location markers (green dots for jump points, etc.)
 * Uses same time-based positioning as planets for consistency
 */
function drawLocationMarkers(ctx, centerX, centerY, zoom) {
  const system = systemMapState.system;
  if (!system?.locations) return;

  const auToPixels = getAuToPixels(zoom);

  for (const loc of system.locations) {
    // Support both linkedTo (legacy) and parentId (canonical) field names
    const parentRef = loc.linkedTo || loc.parentId;
    if (!parentRef) continue;

    // AR-113 Phase 3: Use getBodyWorldPosition to follow parent chains
    // This handles stations orbiting planets correctly
    const bodyPos = getBodyWorldPosition(parentRef);

    // Location offset from body (in km -> AU)
    // Support orbitKm (jump points), orbitalAltitudeKm (stations), or surface locations
    const locationOrbitKm = loc.orbitKm || loc.orbitalAltitudeKm || 0;
    const locationBearing = (loc.bearing || 0) * Math.PI / 180;
    const locationOrbitAU = locationOrbitKm / 149597870.7;

    // Add offset in the bearing direction (with isometric Y)
    const posX = bodyPos.x + locationOrbitAU * Math.cos(locationBearing);
    const posY = bodyPos.y + locationOrbitAU * Math.sin(locationBearing) * getYScale();

    // AR-113: Use helper for world-to-screen conversion
    const screen = worldToScreen(posX, posY, centerX, centerY, auToPixels);

    // AR-113 Phase 4: Draw markers for all location types (not just jump_point)
    // Color by type: green for jump, cyan for orbit/dock, gray for other
    const colors = {
      'jump-point': '#00ff00',
      jump_point: '#00ff00',
      orbit: '#00cccc',
      dock: '#00aaff',
      station: '#00ccff',
      highport: '#ffaa00',
      downport: '#ff8800',
      hide: '#888888',
      space: '#666666'
    };
    const color = colors[loc.type] || '#888888';
    const dotSize = Math.max(3, 4 * Math.sqrt(zoom));

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, dotSize, 0, Math.PI * 2);
    ctx.fill();

    // AR-113 Phase 4: Add label below marker (only at high zoom to avoid overlap)
    // AR-124: Labels hidden until position verified (immersive)
    // Labels only visible when zoomed in enough to distinguish locations
    if (zoom > 5) {
      // AR-199: Only draw labels if enabled
      if (systemMapState.showLabels) {
        const isVerified = typeof window.getShipState === 'function'
          ? window.getShipState()?.positionVerified !== false
          : true;
        const labelText = isVerified ? loc.name : '???';
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `${Math.max(8, 9 * Math.sqrt(zoom))}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(labelText, screen.x, screen.y + dotSize + 10);
      }
    }
    ctx.restore();
  }
}

/**
 * Draw party ship on system map
 * If location info is provided, uses time-based positioning to track orbiting bodies
 */
function drawPartyShip(ctx, centerX, centerY, zoom) {
  if (!shipMapState.partyShip) return;

  const auToPixels = getAuToPixels(zoom);
  let screenX, screenY;

  // If we have location info with a linked body, calculate position dynamically
  const locInfo = shipMapState.partyShip.locationInfo;
  if (locInfo?.linkedBodyOrbitAU !== undefined) {
    // AR-113: Use helper for body's orbital position
    const bodyPos = getOrbitPosition(locInfo.linkedBodyOrbitAU);

    // Location offset from body (with isometric Y)
    const offsetAU = locInfo.offsetAU || 0;
    const offsetBearing = (locInfo.offsetBearing || 0) * Math.PI / 180;
    const posX = bodyPos.x + offsetAU * Math.cos(offsetBearing);
    const posY = bodyPos.y + offsetAU * Math.sin(offsetBearing) * getYScale();

    // AR-113: Use helper for world-to-screen conversion
    const screen = worldToScreen(posX, posY, centerX, centerY, auToPixels);
    screenX = screen.x;
    screenY = screen.y;
  } else {
    // Fallback to static position
    const pos = shipMapState.partyShip.position || { x: 5, y: 0, z: 0 };
    const screen = worldToScreen(pos.x, pos.y, centerX, centerY, auToPixels);
    screenX = screen.x;
    screenY = screen.y;
  }

  // Ship triangle (pointing in heading direction)
  const heading = shipMapState.partyShip.heading || 0;
  const size = Math.max(4, 5 * Math.sqrt(zoom)); // Smaller ship icon (1/3 original)

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(heading);

  // Ship glow
  ctx.shadowColor = '#4488ff';
  ctx.shadowBlur = 10;

  // Ship body
  ctx.fillStyle = '#4488ff';
  ctx.beginPath();
  ctx.moveTo(0, -size);           // Nose
  ctx.lineTo(-size * getYScale(), size * getYScale());  // Left
  ctx.lineTo(0, size * 0.3);      // Rear center
  ctx.lineTo(size * getYScale(), size * getYScale());   // Right
  ctx.closePath();
  ctx.fill();

  // Engine glow
  ctx.shadowColor = '#ff6600';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#ff8833';
  ctx.beginPath();
  ctx.arc(0, size * 0.5, size * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Ship label - AR-199: Only draw labels if enabled
  if (systemMapState.showLabels) {
    const name = shipMapState.partyShip.name || 'Party Ship';
    ctx.fillStyle = '#88aaff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(name, screenX, screenY + size + 14);
  }
}

/**
 * AR-71 Phase 3: Update contact positions based on velocity or orbit
 * Called each frame from the animation loop
 */
function updateContactMotion(deltaTime) {
  if (!shipMapState.contacts || !shipMapState.contacts.length) return;

  for (const contact of shipMapState.contacts) {
    // Skip contacts without motion
    if (!contact.velocity && !contact.orbitAU) continue;

    // Handle drifting contacts (velocity vector)
    if (contact.velocity) {
      // velocity: { speed: km/s, heading: degrees }
      const speedKmS = contact.velocity.speed || 0;
      const headingRad = (contact.velocity.heading || 0) * Math.PI / 180;

      // Convert speed to AU/second
      const speedAU = speedKmS / 149597870.7;

      // Update position
      if (!contact.position) {
        // Initialize from bearing/range if no position set
        const rangeKm = contact.range_km || contact.rangeKm || 0;
        const rangeAU = rangeKm / 149597870.7;
        const bearing = (contact.bearing || 0) * Math.PI / 180;
        const shipPos = shipMapState.partyShip?.position || { x: 0, y: 0, z: 0 };
        contact.position = {
          x: shipPos.x + Math.cos(bearing) * rangeAU,
          y: shipPos.y + Math.sin(bearing) * rangeAU
        };
      }

      contact.position.x += Math.cos(headingRad) * speedAU * deltaTime;
      contact.position.y += Math.sin(headingRad) * speedAU * deltaTime;
    }

    // Handle orbiting contacts (use same formula as planets)
    if (contact.orbitAU && contact.parentBody) {
      const orbitSpeed = 0.1 / Math.sqrt(contact.orbitAU);
      const angle = systemMapState.time * orbitSpeed;

      // Get parent body position
      let parentX = 0, parentY = 0;
      if (contact.parentBody === 'star') {
        parentX = 0;
        parentY = 0;
      } else {
        // Find parent planet
        const parent = systemMapState.system?.planets?.find(p => p.id === contact.parentBody);
        if (parent) {
          const parentOrbitSpeed = 0.1 / Math.sqrt(parent.orbitAU);
          const parentAngle = systemMapState.time * parentOrbitSpeed;
          parentX = Math.cos(parentAngle) * parent.orbitAU;
          parentY = Math.sin(parentAngle) * parent.orbitAU;
        }
      }

      contact.position = {
        x: parentX + Math.cos(angle) * contact.orbitAU,
        y: parentY + Math.sin(angle) * contact.orbitAU
      };
    }
  }
}

/**
 * Draw sensor contacts on system map
 * AR-71: Converts bearing/range relative to ship position to absolute AU coords
 */
function drawMapContacts(ctx, centerX, centerY, zoom) {
  if (!shipMapState.contacts || !shipMapState.contacts.length) return;

  const auToPixels = systemMapState.AU_TO_PIXELS * zoom;

  // Get ship position for relative contact positioning
  const shipPos = shipMapState.partyShip?.position || { x: 0, y: 0, z: 0 };
  const shipScreenX = centerX + shipPos.x * auToPixels;
  const shipScreenY = centerY + shipPos.y * auToPixels * getYScale(); // Isometric

  for (const contact of shipMapState.contacts) {
    // Skip celestial contacts - they're rendered as planets/stars
    if (contact.celestial) continue;

    let screenX, screenY;

    // AR-71 Phase 3: If contact has absolute position, use it directly
    // Note: centerX/centerY already include pan offset from render()
    if (contact.position) {
      screenX = centerX + contact.position.x * auToPixels;
      screenY = centerY + contact.position.y * auToPixels * getYScale();
    } else {
      // Convert bearing/range to position relative to ship
      // range_km is the actual property from database (snake_case)
      const rangeKm = contact.range_km || contact.rangeKm || 0;
      const rangeAU = rangeKm / 149597870.7; // km to AU (accurate conversion)
      const bearing = (contact.bearing || 0) * Math.PI / 180;

      // Calculate screen position relative to ship
      const offsetX = Math.cos(bearing) * rangeAU * auToPixels;
      const offsetY = Math.sin(bearing) * rangeAU * auToPixels * getYScale(); // Isometric

      screenX = shipScreenX + offsetX;
      screenY = shipScreenY + offsetY;
    }

    // BD-6: Determine contact color based on disposition OR health
    let color;
    const disposition = contact.disposition || contact.marking || 'unknown';
    const dispositionColors = {
      hostile: '#ff4444',
      friendly: '#44ff44',
      neutral: '#ffff44',
      unknown: '#888888'
    };

    // If targetable and has health, use health-based coloring
    if (contact.is_targetable && contact.max_health > 0) {
      const healthPercent = (contact.health / contact.max_health) * 100;
      if (healthPercent > 66) color = '#44ff44';       // green
      else if (healthPercent > 33) color = '#ffff44';  // yellow
      else if (healthPercent > 0) color = '#ff4444';   // red
      else color = '#666666';                           // destroyed (gray)
    } else {
      color = dispositionColors[disposition] || dispositionColors.unknown;
    }

    // Size varies by type
    const baseSize = contact.type === 'ship' ? 6 : 5;
    const size = Math.max(3, Math.min(10, baseSize * Math.sqrt(zoom)));

    // BD-6: Draw different shapes based on type
    ctx.fillStyle = color;
    ctx.beginPath();

    const typeLC = (contact.type || '').toLowerCase();
    if (['ship', 'patrol', 'trader', 'warship', 'scout', 'corsair'].includes(typeLC)) {
      // Triangle pointing right (ship)
      ctx.moveTo(screenX + size, screenY);
      ctx.lineTo(screenX - size, screenY - size * 0.8);
      ctx.lineTo(screenX - size, screenY + size * 0.8);
      ctx.closePath();
    } else if (['station', 'starport', 'base'].includes(typeLC)) {
      // Square (station)
      ctx.rect(screenX - size * 0.7, screenY - size * 0.7, size * 1.4, size * 1.4);
    } else if (['missile', 'torpedo'].includes(typeLC)) {
      // Diamond (missile)
      ctx.moveTo(screenX, screenY - size);
      ctx.lineTo(screenX + size * 0.7, screenY);
      ctx.lineTo(screenX, screenY + size);
      ctx.lineTo(screenX - size * 0.7, screenY);
      ctx.closePath();
    } else {
      // Circle (default: asteroid, debris, unknown)
      ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
    }
    ctx.fill();

    // Draw border for better visibility
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // BD-6: Add weapons indicator for armed contacts
    if (contact.weapons && Array.isArray(contact.weapons) && contact.weapons.length > 0) {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(screenX + size, screenY - size, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Contact label (transponder or designation)
    // AR-199: Only draw labels if enabled
    // AR-239: Use white labels (not contact color) to avoid green overlap
    if (systemMapState.showLabels) {
      const label = contact.transponder || contact.designation || contact.name;
      if (label && zoom > 0.5) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, screenX, screenY + size + 10);
      }
    }
  }
}

/**
 * Draw range band overlay
 */
function drawRangeBands(ctx, centerX, centerY, zoom) {
  if (!shipMapState.showRangeBands || !shipMapState.partyShip) return;

  const pos = shipMapState.partyShip.position || { x: 5, y: 0, z: 0 };
  const auToPixels = systemMapState.AU_TO_PIXELS * zoom;
  // Note: centerX/centerY already include pan offset from render()
  const shipX = centerX + pos.x * auToPixels;
  const shipY = centerY + pos.y * auToPixels;

  // Range bands in km → AU (1 AU ≈ 150,000,000 km)
  const bands = [
    { name: 'Adjacent', km: 1, color: 'rgba(255, 0, 0, 0.1)' },
    { name: 'Close', km: 10, color: 'rgba(255, 128, 0, 0.08)' },
    { name: 'Short', km: 1250, color: 'rgba(255, 255, 0, 0.06)' },
    { name: 'Medium', km: 10000, color: 'rgba(0, 255, 0, 0.05)' },
    { name: 'Long', km: 25000, color: 'rgba(0, 128, 255, 0.04)' }
  ];

  for (const band of bands.reverse()) {
    const radiusAU = band.km / 150000;
    const radiusPx = radiusAU * auToPixels;

    if (radiusPx > 5) { // Only draw if visible
      ctx.fillStyle = band.color;
      ctx.beginPath();
      ctx.arc(shipX, shipY, radiusPx, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * AR-262: Enhanced course line visualization
 * Features: Bezier curves, color coding by phase, dynamic thickness
 */
function drawCourseLine(ctx, centerX, centerY, zoom) {
  if (!shipMapState.partyShip || !shipMapState.destination) return;

  const auToPixels = systemMapState.AU_TO_PIXELS * zoom;
  const shipPos = shipMapState.partyShip.position || { x: 5, y: 0, z: 0 };

  // Note: centerX/centerY already include pan offset from render()
  const shipX = centerX + shipPos.x * auToPixels;
  const shipY = centerY + shipPos.y * auToPixels;

  // Get destination position (from body orbit)
  const dest = shipMapState.destination;
  const orbitRadius = dest.orbitRadius || 1;
  const destX = centerX + orbitRadius * auToPixels;
  const destY = centerY;

  // AR-262: Dynamic line thickness based on zoom
  const baseWidth = Math.max(1, Math.min(3, 2 / Math.sqrt(zoom)));

  // AR-262: Calculate Bezier control point for aesthetic curve
  // Curve bows outward from star for visual appeal
  const midX = (shipX + destX) / 2;
  const midY = (shipY + destY) / 2;
  const distance = Math.sqrt((destX - shipX) ** 2 + (destY - shipY) ** 2);
  const curveOffset = Math.min(distance * 0.15, 50); // Max 50px bow

  // Perpendicular offset (bow away from center/star)
  const dx = destX - shipX;
  const dy = destY - shipY;
  const perpX = -dy / distance * curveOffset;
  const perpY = dx / distance * curveOffset;
  const ctrlX = midX + perpX;
  const ctrlY = midY + perpY;

  // AR-262: Draw three-phase course line
  // Phase 1: Thrust (blue) - acceleration phase
  // Phase 2: Coast (cyan) - cruise phase
  // Phase 3: Arrival (green) - deceleration phase

  ctx.lineWidth = baseWidth;
  ctx.lineCap = 'round';

  // Draw full curved path with gradient effect
  // Phase 1: Thrust phase (0-30%)
  ctx.strokeStyle = '#4488ff'; // Blue
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(shipX, shipY);
  const t1 = 0.3;
  const p1x = (1-t1)*(1-t1)*shipX + 2*(1-t1)*t1*ctrlX + t1*t1*destX;
  const p1y = (1-t1)*(1-t1)*shipY + 2*(1-t1)*t1*ctrlY + t1*t1*destY;
  ctx.quadraticCurveTo(
    shipX + (ctrlX - shipX) * 0.6,
    shipY + (ctrlY - shipY) * 0.6,
    p1x, p1y
  );
  ctx.stroke();

  // Phase 2: Coast phase (30-70%)
  ctx.strokeStyle = '#44cccc'; // Cyan
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.moveTo(p1x, p1y);
  const t2 = 0.7;
  const p2x = (1-t2)*(1-t2)*shipX + 2*(1-t2)*t2*ctrlX + t2*t2*destX;
  const p2y = (1-t2)*(1-t2)*shipY + 2*(1-t2)*t2*ctrlY + t2*t2*destY;
  ctx.quadraticCurveTo(ctrlX, ctrlY, p2x, p2y);
  ctx.stroke();

  // Phase 3: Arrival phase (70-100%)
  ctx.strokeStyle = '#44cc44'; // Green
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(p2x, p2y);
  ctx.quadraticCurveTo(
    p2x + (destX - p2x) * 0.4,
    p2y + (destY - p2y) * 0.4,
    destX, destY
  );
  ctx.stroke();

  // Draw destination marker
  ctx.fillStyle = '#44cc44';
  ctx.beginPath();
  ctx.arc(destX, destY, baseWidth * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.setLineDash([]);
}

/**
 * AR-263: Refresh ship position on map based on location ID
 * Called after travel completes to update ship icon position
 * @param {string} locationId - New location ID
 * @param {string} shipName - Ship name to display
 */
function refreshShipMapPosition(locationId, shipName = 'Party Ship') {
  const system = systemMapState.system;
  if (!system) return;

  let shipData = {
    name: shipName,
    position: { x: 5, y: 0, z: 0 },
    heading: 0
  };

  // Find location in system - check static locations first
  let location = system.locations?.find(l => l.id === locationId);
  let parentRef = location?.linkedTo || location?.parentId;
  let locationOrbitKm = 0;
  let locationBearing = 0;

  // If not in static locations, try to parse generated destination IDs
  // Generated IDs follow patterns: orbit-{bodyId}, skim-{bodyId}, jump-{bodyId}, belt-{bodyId}
  if (!parentRef && locationId) {
    const match = locationId.match(/^(orbit|skim|jump|belt)-(.+)$/);
    if (match) {
      const [, destType, bodyId] = match;
      // Find the linked body - try exact match first, then try matching by name or isMainworld
      let body = system.celestialObjects?.find(o => o.id === bodyId);
      if (!body && bodyId.includes('-mainworld')) {
        // Try finding mainworld by isMainworld flag or uwp
        body = system.celestialObjects?.find(o => o.isMainworld || o.uwp);
      }
      if (!body) {
        // Try fuzzy match: bodyId like "nadrin-mainworld" → find "3123-mainworld"
        const baseName = bodyId.split('-')[0]; // "nadrin"
        body = system.celestialObjects?.find(o =>
          o.id?.toLowerCase().includes(baseName) ||
          o.name?.toLowerCase() === baseName
        );
      }
      if (body) {
        parentRef = body.id; // Use actual ID for lookup
        // Different destination types have different offsets
        if (destType === 'skim') {
          locationOrbitKm = 50000; // Skim point ~50,000km from gas giant
        } else if (destType === 'jump') {
          // Jump point at 100-diameter distance
          locationOrbitKm = (body.radiusKm || 50000) * 200;
        }
        console.log(`[AR-263] Parsed generated destination ${locationId} → body ${body.id}`);
      }
    } else if (locationId === 'jump_point') {
      // System-wide jump point - position at outer edge
      const outerBody = system.celestialObjects?.reduce((outer, obj) => {
        if (!outer || (obj.orbitAU || 0) > (outer.orbitAU || 0)) return obj;
        return outer;
      }, null);
      if (outerBody) {
        shipData.locationInfo = {
          linkedBodyOrbitAU: (outerBody.orbitAU || 5) * 1.5, // Beyond outermost body
          offsetAU: 0,
          offsetBearing: 0
        };
        console.log(`[AR-263] Ship at system jump point: ${shipData.locationInfo.linkedBodyOrbitAU.toFixed(2)}AU`);
      }
    }
  }

  if (parentRef) {
    // Find linked celestial body
    const body = system.celestialObjects?.find(o => o.id === parentRef);
    if (body) {
      const bodyOrbitAU = body.orbitAU || 0;
      // Use location orbit from static data if available, else from parsed destination
      const finalOrbitKm = location?.orbitKm || location?.orbitalAltitudeKm || locationOrbitKm;
      const finalBearing = location?.bearing || locationBearing;
      const locationOrbitAU = finalOrbitKm / 149597870.7;

      shipData.locationInfo = {
        linkedBodyOrbitAU: bodyOrbitAU,
        offsetAU: locationOrbitAU,
        offsetBearing: finalBearing
      };
      console.log(`[AR-263] Ship moved to ${locationId}: tracking body at ${bodyOrbitAU.toFixed(2)}AU + offset ${locationOrbitAU.toFixed(4)}AU`);
    }
  } else if (location?.surface) {
    // Surface locations (downports) - ship is on the mainworld surface
    const mainworld = system.celestialObjects?.find(o => o.isMainworld);
    if (mainworld) {
      shipData.locationInfo = {
        linkedBodyOrbitAU: mainworld.orbitAU || 0,
        offsetAU: 0,
        offsetBearing: 0
      };
      console.log(`[AR-263] Ship landed at ${locationId}: on surface at ${mainworld.orbitAU?.toFixed(2) || 0}AU`);
    }
  }

  updateShipPosition(shipData);
}

// Expose ship functions globally
window.updateShipPosition = updateShipPosition;
window.updateMapContacts = updateMapContacts;
window.toggleRangeBands = toggleRangeBands;
window.setMapDestination = setMapDestination;
window.shipMapState = shipMapState;
window.resizeSystemMapCanvas = resizeCanvas;
window.refreshShipMapPosition = refreshShipMapPosition;
// AR-36: Goldilocks zone and navigation
window.toggleGoldilocksZone = toggleGoldilocksZone;
window.goToObject = goToObject;
// AR-87/88: Zoom and view controls for HTML onclick handlers
window.zoomSystemMap = zoomSystemMap;
window.resetSystemMapView = resetSystemMapView;
window.toggleSystemMapLabels = toggleSystemMapLabels;
window.snapToNow = snapToNow;

// ==================== AR-102: Embedded Map for Pilot Navigation ====================

/**
 * Embedded map state - separate from main system map
 */
const embeddedMapState = {
  canvas: null,
  ctx: null,
  container: null,
  zoom: 0.8,
  offsetX: 0,
  offsetY: 0,
  animationFrame: null,
  selectedDestination: null,
  currentCameraAngle: 0,
  lastClickedDestination: null
};

// AR-102/104: Camera presets for dramatic destination views
// zoomMultiplier adjusts size-based zoom: 1.0 = fill 50%, 0.5 = fill 25%, 2.0 = fill 100%
const CAMERA_PRESETS = [
  // Iteration 1: More dramatic rule-of-thirds positioning
  { name: 'close-up', zoomMultiplier: 1.2, offsetX: 0.25, offsetY: 0.15, description: 'Hero shot - object in lower-left third' },
  { name: 'wide-context', zoomMultiplier: 0.25, offsetX: -0.3, offsetY: -0.2, description: 'Establishing shot - object in upper-right' },
  { name: 'orbital-view', zoomMultiplier: 0.5, offsetX: -0.1, offsetY: 0.28, description: 'High orbital - object near bottom center' }
];

// AR-104: Station camera presets use ABSOLUTE zoom values (not multipliers)
// Size-based zoom calculation produces astronomically high values (155,000x for 4800km planet)
// that all clamp to MAX_ZOOM 100, making views identical. Use absoluteZoom to bypass.
const STATION_CAMERA_PRESETS = [
  // Wide establishing: Star visible, planet small, station in orbital context
  { name: 'establishing', absoluteZoom: 5, offsetX: -0.15, offsetY: 0.1, description: 'Wide establishing shot' },
  // Medium orbital: Planet prominent, station clearly visible against it
  { name: 'orbital', absoluteZoom: 20, offsetX: -0.25, offsetY: 0.12, description: 'Dramatic orbital view' },
  // Detail close-up: Planet fills much of frame, station detail visible
  { name: 'detail', absoluteZoom: 60, offsetX: -0.2, offsetY: 0.08, description: 'Station detail with planet curve' }
];

// AR-104: Type-based camera preset defaults (algorithmic - no per-object JSON needed)
// These are base values that get modulated by object properties for artistic compositions
// Iteration 1: More dramatic rule-of-thirds positioning by object type
const TYPE_CAMERA_DEFAULTS = {
  'Star': { zoomMultiplier: 0.15, offsetX: 0.28, offsetY: 0.12 },      // Wide corona, upper-left third
  'Planet': { zoomMultiplier: 2.5, offsetX: 0.25, offsetY: 0.15 },     // Dramatic close-up, fills canvas
  'Planetoid': { zoomMultiplier: 6.0, offsetX: -0.2, offsetY: 0.15 },  // Very tight on asteroid
  'Moon': { zoomMultiplier: 4.0, offsetX: -0.15, offsetY: 0.18 },      // Close companion shot
  'Gas Giant': { zoomMultiplier: 0.5, offsetX: 0.25, offsetY: 0.1 },   // Majestic scale, left third
  'Ice Giant': { zoomMultiplier: 0.6, offsetX: 0.2, offsetY: 0.12 },   // Cold majesty, asymmetric
  'Station': { zoomMultiplier: 8.0, offsetX: 0.25, offsetY: -0.1 },    // EXTREME close-up on facility
  'Highport': { zoomMultiplier: 6.0, offsetX: 0.3, offsetY: -0.08 },   // Tight on orbital commerce hub
  'Naval Base': { zoomMultiplier: 7.0, offsetX: 0.15, offsetY: -0.15 },// Military precision, dramatic
  'Scout Base': { zoomMultiplier: 8.0, offsetX: -0.2, offsetY: 0.18 }, // Very tight on X-boat station
  'Planetoid Belt': { zoomMultiplier: 0.3, offsetX: 0.08, offsetY: 0.2 } // Wide asteroid distribution
};

/**
 * AR-104: Simple hash function for deterministic "artistic randomness"
 * Uses object ID to generate consistent pseudo-random offsets
 * @param {string} str - String to hash (object ID)
 * @returns {number} Value between 0 and 1
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash % 1000) / 1000;
}

/**
 * AR-104: Generate camera preset for object algorithmically
 * Scales to thousands of objects without manual per-object settings
 * @param {Object} obj - Celestial object
 * @param {number} cycleIndex - Which preset in the cycle (0 = default)
 * @param {string} placeType - Optional: type from place/location (e.g., 'Highport', 'Dock')
 * @returns {Object} Camera preset { zoomMultiplier, offsetX, offsetY }
 */
function generateCameraPreset(obj, cycleIndex = 0, placeType = null) {
  // AR-104: Detect station/dock places - check placeType first, then obj.type
  // Station types: 'Highport', 'Dock', 'Station', 'Naval Base', 'Scout Base', 'dock'
  // CRITICAL: Check station detection BEFORE cameraSettings early return
  // Stations with cameraSettings still need absoluteZoom for proper 3-view cycling
  const STATION_PLACE_TYPES = ['Highport', 'Dock', 'Station', 'Naval Base', 'Scout Base', 'dock'];
  const isStationPlace = placeType && STATION_PLACE_TYPES.includes(placeType);

  // AR-104: Resolve linked celestial object type for dock locations
  // Locations have type='dock' but link to celestial objects with type='Highport', 'Station', etc.
  let effectiveType = obj.type;
  if (obj.type === 'dock' && obj.linkedTo && systemMapState.celestialObjects) {
    const linkedObj = systemMapState.celestialObjects.find(c => c.id === obj.linkedTo);
    if (linkedObj) {
      effectiveType = linkedObj.type;
      console.log(`[EmbeddedMap] Resolved dock "${obj.name}" → linked type: ${effectiveType}`);
    }
  }

  // AR-104: All stations use cinematic orbital presets
  // Check placeType first (passed from goToPlace), then fallback to effectiveType
  // AR-105: Fix - check ALL station types, not just 'Station'
  const isStation = isStationPlace || STATION_PLACE_TYPES.includes(effectiveType);
  if (isStation) {
    const preset = STATION_CAMERA_PRESETS[cycleIndex % STATION_CAMERA_PRESETS.length];
    console.log(`[EmbeddedMap] Station camera ${cycleIndex}: ${preset.name} (absoluteZoom=${preset.absoluteZoom})`);
    return {
      absoluteZoom: preset.absoluteZoom,  // AR-104: Use absolute zoom for stations
      zoomMultiplier: 1.0,  // Fallback if absoluteZoom not handled
      offsetX: preset.offsetX,
      offsetY: preset.offsetY
    };
  }

  // If object has explicit cameraSettings, use as base (optional override)
  // Note: Stations bypass this because they need absoluteZoom for proper zoom levels
  if (obj.cameraSettings && cycleIndex === 0) {
    return obj.cameraSettings;
  }

  // Get type-based defaults or fallback
  const typeDefaults = TYPE_CAMERA_DEFAULTS[effectiveType] || { zoomMultiplier: 1.0, offsetX: 0.1, offsetY: 0.05 };

  // For non-default cycle indices, blend with global presets
  if (cycleIndex > 0) {
    const globalPreset = CAMERA_PRESETS[cycleIndex % CAMERA_PRESETS.length];
    return {
      zoomMultiplier: globalPreset.zoomMultiplier,
      offsetX: globalPreset.offsetX + typeDefaults.offsetX * 0.3,
      offsetY: globalPreset.offsetY + typeDefaults.offsetY * 0.3
    };
  }

  // Generate deterministic "artistic" variation from object ID
  const hash1 = simpleHash(obj.id || obj.name || 'default');
  const hash2 = simpleHash((obj.id || '') + '_y');

  // Apply subtle variations for visual interest (-0.08 to +0.08 range)
  const offsetVariationX = (hash1 - 0.5) * 0.16;
  const offsetVariationY = (hash2 - 0.5) * 0.16;

  // Adjust zoom based on object size relative to type average
  let zoomAdjust = 1.0;
  const radiusKm = obj.radiusKm || DEFAULT_RADIUS_KM[obj.type] || 5000;
  const typeDefaultRadius = DEFAULT_RADIUS_KM[obj.type] || 5000;
  if (radiusKm > typeDefaultRadius * 2) {
    zoomAdjust = 0.7; // Larger than typical - zoom out
  } else if (radiusKm < typeDefaultRadius * 0.5) {
    zoomAdjust = 1.3; // Smaller than typical - zoom in
  }

  // Inner system objects get slightly different treatment
  let orbitAdjust = 1.0;
  if (obj.orbitAU && obj.orbitAU < 0.7) {
    orbitAdjust = 1.1; // Inner system - tighter view
  } else if (obj.orbitAU && obj.orbitAU > 3) {
    orbitAdjust = 0.9; // Outer system - slightly wider
  }

  return {
    zoomMultiplier: typeDefaults.zoomMultiplier * zoomAdjust * orbitAdjust,
    offsetX: typeDefaults.offsetX + offsetVariationX,
    offsetY: typeDefaults.offsetY + offsetVariationY
  };
}

// Constants for zoom calculation
const AU_TO_KM = 149597870.7;

// Default radiusKm by object type (when not specified in JSON)
// AR-102: Sensible default radii for size-based zoom when radiusKm not specified
const DEFAULT_RADIUS_KM = {
  'Star': 700000,        // Sol-like
  'Planet': 10000,       // Earth-like default (user preference)
  'Moon': 1000,          // Typical large moon
  'Station': 2,          // Large space station (~2km)
  'Highport': 2,         // Orbital starport
  'Naval Base': 1,       // Military installation
  'Scout Base': 0.5,     // Smaller base
  'Planetoid Belt': 500, // Visual representation
  'Gas Giant': 70000,    // Jupiter-like
  'Ice Giant': 25000     // Neptune-like
};

/**
 * Get object radiusKm from data or use type-based default
 * AR-102: Graceful fallback chain ensures sane zoom even with missing data
 */
function getObjectRadiusKm(destination) {
  if (!destination) return 5000;  // Safe fallback for null/undefined
  if (destination.radiusKm && destination.radiusKm > 0) return destination.radiusKm;
  // Try type-based default, then category fallback, then generic small object
  return DEFAULT_RADIUS_KM[destination.type] ||
         (destination.type?.includes('Base') ? 1 :
          destination.type?.includes('Station') ? 2 : 5000);
}

/**
 * Calculate zoom level to make object fill targetFillFraction of canvas
 * @param {number} radiusKm - Object radius in km
 * @param {number} canvasSize - Canvas dimension (use smaller of width/height)
 * @param {number} targetFillFraction - How much of canvas to fill (0.5 = 50%)
 */
function calculateZoomForSize(radiusKm, canvasSize, targetFillFraction = 0.5) {
  // baseScale = canvasSize / 20 pixels per AU at zoom 1.0
  // At zoom Z, 1 AU = baseScale * Z pixels
  // Object diameter = 2 * radiusKm, want it to be canvasSize * targetFillFraction pixels
  // So: 2 * radiusKm * pixelsPerKm * Z = canvasSize * targetFillFraction
  // pixelsPerKm = baseScale / AU_TO_KM
  // Z = (canvasSize * targetFillFraction * AU_TO_KM) / (2 * radiusKm * baseScale)
  // Since baseScale = canvasSize / 20:
  // Z = (canvasSize * targetFillFraction * AU_TO_KM) / (2 * radiusKm * canvasSize / 20)
  // Z = (targetFillFraction * AU_TO_KM * 20) / (2 * radiusKm)
  // Z = (targetFillFraction * AU_TO_KM * 10) / radiusKm

  const zoom = (targetFillFraction * AU_TO_KM * 10) / radiusKm;
  // Clamp to reasonable range
  return Math.max(0.1, Math.min(zoom, 100000000));
}

/**
 * AR-102: Initialize embedded system map for pilot navigation
 * @param {HTMLCanvasElement} canvas - The embedded canvas element
 * @param {HTMLElement} container - The container element
 */
function initEmbeddedMap(canvas, container) {
  if (!canvas || !container) {
    console.warn('[EmbeddedMap] Missing canvas or container');
    return;
  }

  embeddedMapState.canvas = canvas;
  embeddedMapState.ctx = canvas.getContext('2d');
  embeddedMapState.container = container;

  // Set initial size
  resizeEmbeddedCanvas();

  // Add event listeners
  canvas.addEventListener('wheel', handleEmbeddedWheel, { passive: false });
  canvas.addEventListener('mousedown', handleEmbeddedMouseDown);
  canvas.addEventListener('mousemove', handleEmbeddedMouseMove);
  canvas.addEventListener('mouseup', handleEmbeddedMouseUp);
  canvas.addEventListener('mouseleave', handleEmbeddedMouseUp);
  canvas.addEventListener('click', handleEmbeddedClick);

  // ResizeObserver for container size changes
  const resizeObserver = new ResizeObserver(() => resizeEmbeddedCanvas());
  resizeObserver.observe(container);

  // Start render loop
  renderEmbeddedMap();
  console.log('[EmbeddedMap] Initialized');
}

/**
 * AR-102: Resize embedded canvas to container
 */
function resizeEmbeddedCanvas() {
  if (!embeddedMapState.canvas || !embeddedMapState.container) return;
  const { canvas, container, ctx } = embeddedMapState;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = container.clientWidth * dpr;
  canvas.height = container.clientHeight * dpr;
  canvas.style.width = container.clientWidth + 'px';
  canvas.style.height = container.clientHeight + 'px';
  ctx.scale(dpr, dpr);
}

/**
 * AR-102: Render embedded map frame
 */
function renderEmbeddedMap() {
  if (!embeddedMapState.canvas || !embeddedMapState.ctx) return;

  const { canvas, ctx, zoom, offsetX, offsetY, selectedDestination } = embeddedMapState;
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);

  // Clear canvas
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, width, height);

  // Check if main system data is loaded (fixed: was checking .systemData, now checks .system)
  if (!systemMapState.system) {
    ctx.fillStyle = '#4a9eff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Loading system...', width / 2, height / 2);
    embeddedMapState.animationFrame = requestAnimationFrame(renderEmbeddedMap);
    return;
  }

  const centerX = width / 2 + offsetX;
  const centerY = height / 2 + offsetY;
  const baseScale = Math.min(width, height) / 20; // AU to pixels
  const scale = baseScale * zoom;

  // Draw goldilocks zone (using main map's data)
  if (systemMapState.goldilocksZone) {
    const { inner, outer } = systemMapState.goldilocksZone;
    ctx.beginPath();
    ctx.arc(centerX, centerY, outer * scale, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, inner * scale, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(34, 139, 34, 0.15)';
    ctx.fill();
  }

  // Draw orbits and celestial bodies from main system state
  const objects = systemMapState.celestialObjects || [];
  objects.forEach(obj => {
    const x = centerX + (obj.currentX || 0) * scale;
    const y = centerY + (obj.currentY || 0) * scale;
    const radius = Math.max(3, (obj.radius || 0.02) * scale * 0.3);

    // Draw orbit
    if (obj.orbitRadius) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, obj.orbitRadius * scale, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100, 100, 140, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw body
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = obj.color || '#8888aa';
    ctx.fill();

    // Highlight selected destination
    if (selectedDestination && selectedDestination.id === obj.id) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Label - AR-199: Only draw labels if enabled
    if (systemMapState.showLabels && zoom > 0.5 && obj.name) {
      ctx.fillStyle = '#aaaacc';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(obj.name, x + radius + 4, y + 3);
    }
  });

  // Draw ship position
  const shipPos = shipMapState.position || { x: 0, y: 0 };
  const shipX = centerX + shipPos.x * scale;
  const shipY = centerY + shipPos.y * scale;

  // Ship triangle
  ctx.save();
  ctx.translate(shipX, shipY);
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(-5, 6);
  ctx.lineTo(5, 6);
  ctx.closePath();
  ctx.fillStyle = '#00ff00';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Ship label - AR-199: Only draw labels if enabled
  if (systemMapState.showLabels) {
    ctx.fillStyle = '#00ff00';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SHIP', shipX + 10, shipY + 3);
  }

  // Draw course line if destination selected
  if (selectedDestination) {
    const destX = centerX + (selectedDestination.currentX || 0) * scale;
    const destY = centerY + (selectedDestination.currentY || 0) * scale;

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(shipX, shipY);
    ctx.lineTo(destX, destY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Camera angle indicator (dots)
  if (selectedDestination) {
    const dotY = height - 15;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(width - 30 + i * 10, dotY, 3, 0, Math.PI * 2);
      ctx.fillStyle = i === embeddedMapState.currentCameraAngle ? '#ffffff' : '#444466';
      ctx.fill();
    }
  }

  embeddedMapState.animationFrame = requestAnimationFrame(renderEmbeddedMap);
}

/**
 * AR-102: Handle wheel zoom on embedded map
 */
function handleEmbeddedWheel(e) {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  embeddedMapState.zoom = Math.max(0.2, Math.min(10, embeddedMapState.zoom * factor));
}

// Embedded map drag state
let embeddedDragging = false;
let embeddedLastX = 0;
let embeddedLastY = 0;

function handleEmbeddedMouseDown(e) {
  embeddedDragging = true;
  embeddedLastX = e.clientX;
  embeddedLastY = e.clientY;
  embeddedMapState.canvas.style.cursor = 'grabbing';
}

function handleEmbeddedMouseMove(e) {
  if (!embeddedDragging) return;
  embeddedMapState.offsetX += e.clientX - embeddedLastX;
  embeddedMapState.offsetY += e.clientY - embeddedLastY;
  embeddedLastX = e.clientX;
  embeddedLastY = e.clientY;
}

function handleEmbeddedMouseUp() {
  embeddedDragging = false;
  if (embeddedMapState.canvas) {
    embeddedMapState.canvas.style.cursor = 'grab';
  }
}

/**
 * AR-102: Handle click on embedded map - select destination
 */
function handleEmbeddedClick(e) {
  if (!embeddedMapState.canvas || !systemMapState.celestialObjects) return;

  const rect = embeddedMapState.canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const width = rect.width;
  const height = rect.height;
  const centerX = width / 2 + embeddedMapState.offsetX;
  const centerY = height / 2 + embeddedMapState.offsetY;
  const baseScale = Math.min(width, height) / 20;
  const scale = baseScale * embeddedMapState.zoom;

  // Find clicked object
  let nearest = null;
  let minDist = 30; // Click tolerance in pixels

  systemMapState.celestialObjects.forEach(obj => {
    const objX = centerX + (obj.currentX || 0) * scale;
    const objY = centerY + (obj.currentY || 0) * scale;
    const dist = Math.sqrt((clickX - objX) ** 2 + (clickY - objY) ** 2);
    if (dist < minDist) {
      minDist = dist;
      nearest = obj;
    }
  });

  if (nearest) {
    selectEmbeddedDestination(nearest);
  }
}

/**
 * AR-102: Select destination and animate camera
 * Size-based zoom: calculates zoom to fill 50% of canvas based on object radiusKm
 */
function selectEmbeddedDestination(destination) {
  const { lastClickedDestination, currentCameraAngle } = embeddedMapState;

  // Cycle camera angles if clicking same destination
  if (lastClickedDestination && lastClickedDestination.id === destination.id) {
    embeddedMapState.currentCameraAngle = (currentCameraAngle + 1) % CAMERA_PRESETS.length;
  } else {
    embeddedMapState.currentCameraAngle = 0;
    embeddedMapState.lastClickedDestination = destination;
  }

  embeddedMapState.selectedDestination = destination;

  // AR-104: Get algorithmic camera preset based on object type
  const preset = generateCameraPreset(destination, embeddedMapState.currentCameraAngle);
  const radiusKm = getObjectRadiusKm(destination);

  // Calculate target camera position
  const width = embeddedMapState.container.clientWidth;
  const height = embeddedMapState.container.clientHeight;
  const canvasSize = Math.min(width, height);
  const baseScale = canvasSize / 20;

  // Size-based zoom: fill 50% of canvas, then apply preset multiplier
  const baseZoom = calculateZoomForSize(radiusKm, canvasSize, 0.5);
  const targetZoom = baseZoom * preset.zoomMultiplier;

  // Calculate offset to center on object with dramatic framing
  const targetOffsetX = -(destination.currentX || 0) * baseScale * targetZoom + width * preset.offsetX;
  const targetOffsetY = -(destination.currentY || 0) * baseScale * targetZoom + height * preset.offsetY;

  // Animate camera (300ms ease-out)
  animateEmbeddedCamera(targetZoom, targetOffsetX, targetOffsetY, 300);

  // Update transit calculator in app.js
  if (typeof window.updatePilotTransitCalc === 'function') {
    window.updatePilotTransitCalc(destination);
  }

  console.log(`[EmbeddedMap] Selected: ${destination.name} (${preset.name}, radius=${radiusKm}km, zoom=${targetZoom.toFixed(1)})`);
}

/**
 * AR-102: Animate embedded camera to target
 */
function animateEmbeddedCamera(targetZoom, targetX, targetY, duration) {
  const startZoom = embeddedMapState.zoom;
  const startX = embeddedMapState.offsetX;
  const startY = embeddedMapState.offsetY;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

    embeddedMapState.zoom = startZoom + (targetZoom - startZoom) * eased;
    embeddedMapState.offsetX = startX + (targetX - startX) * eased;
    embeddedMapState.offsetY = startY + (targetY - startY) * eased;

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

/**
 * AR-102: Zoom embedded map (for button controls)
 */
function zoomEmbeddedMap(factor) {
  embeddedMapState.zoom = Math.max(0.2, Math.min(10, embeddedMapState.zoom * factor));
}

/**
 * AR-102: Get destinations list for dropdown
 */
function getEmbeddedDestinations() {
  if (!systemMapState.celestialObjects) return [];
  return systemMapState.celestialObjects
    .filter(obj => obj.type !== 'Star')
    .map(obj => ({ id: obj.id, name: obj.name, type: obj.type }));
}

/**
 * AR-102: Select destination by ID (for dropdown)
 */
function selectEmbeddedDestinationById(id) {
  const obj = systemMapState.celestialObjects?.find(o => o.id === id);
  if (obj) {
    selectEmbeddedDestination(obj);
  }
}

// Export embedded map functions globally
window.initEmbeddedMap = initEmbeddedMap;
window.zoomEmbeddedMap = zoomEmbeddedMap;
window.getEmbeddedDestinations = getEmbeddedDestinations;
window.selectEmbeddedDestinationById = selectEmbeddedDestinationById;
window.embeddedMapState = embeddedMapState;
// AR-102: Expose loadSystemFromJSON for early loading at bridge join
window.loadSystemFromJSON = loadSystemFromJSON;
window.systemMapState = systemMapState;
// AR-118: Event system
window.systemMapEvents = systemMapEvents;

// Export for ES modules (app.js imports these)
export {
  initSystemMap,
  loadSystem,
  destroySystemMap,
  systemMapState,
  generateSystem,
  TEST_SYSTEMS,
  loadTestSystem,
  loadSystemFromJSON,
  togglePause,
  setTimeSpeed,
  advanceTime,
  rewindTime,
  resetTime,
  setDate,
  getDate,
  showPlacesOverlay,
  hidePlacesOverlay,
  updateShipPosition,
  updateMapContacts,
  toggleRangeBands,
  setMapDestination,
  shipMapState,
  resizeCanvas,
  // AR-87/88: Zoom and view controls
  zoomSystemMap,
  resetSystemMapView,
  toggleSystemMapLabels,
  snapToNow,
  // AR-102: Embedded map for pilot navigation
  initEmbeddedMap,
  zoomEmbeddedMap,
  getEmbeddedDestinations,
  selectEmbeddedDestinationById,
  embeddedMapState,
  // AR-118: Event system
  systemMapEvents,
  // AR-197: Jump emergence
  centerOnContact,
  flashSystemMap
};
