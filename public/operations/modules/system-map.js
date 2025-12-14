/**
 * AR-29.5: Interactive Star System Map
 * Canvas-based system visualization with stars, planets, moons
 */

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

  // System data
  system: null,
  sector: 'Spinward Marches',  // Current sector
  hex: null,                    // Current hex (e.g., "1910")

  // Selection state
  selectedBody: null,          // Currently selected planet/moon
  hoveredBody: null,           // Body under mouse cursor
  showLabels: true,            // Toggle for body labels

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

/**
 * Initialize the system map canvas
 * @param {HTMLElement} container - Container element for the canvas
 */
function initSystemMap(container) {
  systemMapState.container = container;

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

  zoomControls.appendChild(btnZoomIn);
  zoomControls.appendChild(btnZoomOut);
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

  console.log('[SystemMap] Initialized');
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
  systemMapState.isDragging = true;
  systemMapState.lastMouseX = e.clientX;
  systemMapState.lastMouseY = e.clientY;
  systemMapState.canvas.style.cursor = 'grabbing';
}

/**
 * Handle mouse move for panning
 */
function handleMouseMove(e) {
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
    const bodyY = centerY + offsetY + Math.sin(angle) * (body.orbitAU || 0) * auToPixels * 0.6;

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

  // AR-71: Check contacts first (they're drawn on top)
  if (systemMapState.contacts?.length > 0) {
    for (const contact of systemMapState.contacts) {
      if (!contact.position) continue;
      const contactX = centerX + contact.position.x * auToPixels;
      const contactY = centerY + contact.position.y * auToPixels * 0.6;
      const dist = Math.sqrt((x - contactX) ** 2 + (y - contactY) ** 2);
      if (dist < 15) {  // Contact hit radius
        return { ...contact, isContact: true };
      }
    }
  }

  // Check planets
  if (systemMapState.system?.planets) {
    for (const planet of systemMapState.system.planets) {
      const orbitRadius = planet.orbitAU * auToPixels;
      const orbitSpeed = 0.1 / Math.sqrt(planet.orbitAU);
      const angle = systemMapState.time * orbitSpeed;
      const planetX = centerX + Math.cos(angle) * orbitRadius;
      const planetY = centerY + Math.sin(angle) * orbitRadius * 0.6;

      const planetSize = Math.max(10, Math.min(50, (planet.size / 5000) * zoom * 2));
      const dist = Math.sqrt((x - planetX) ** 2 + (y - planetY) ** 2);

      if (dist < planetSize + 5) {
        return planet;
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
 */
function showPlacesOverlay() {
  hidePlacesOverlay();

  if (!systemMapState.system?.places) return;

  const overlay = document.createElement('div');
  overlay.id = 'system-map-places';
  overlay.className = 'system-map-places';

  const placesHtml = systemMapState.system.places.map(place => {
    const tooltip = generateTrajectoryTooltip(place.id);
    return `
    <div class="place-item" data-place-id="${place.id}"
         title="${tooltip}"
         onclick="window.goToPlace('${place.id}')"
         oncontextmenu="event.preventDefault(); window.showPlaceDetails('${place.id}')">
      <span class="place-icon">${place.icon}</span>
      <div class="place-info">
        <div class="place-name">${place.name}</div>
        <div class="place-desc">${place.description}</div>
      </div>
    </div>
  `;
  }).join('');

  overlay.innerHTML = `
    <div class="places-header">
      <h4>Destinations</h4>
      <button class="places-close" onclick="window.hidePlacesOverlay()">×</button>
    </div>
    <div class="places-list">
      ${placesHtml}
    </div>
    <div class="places-footer">Right-click to travel</div>
  `;

  document.body.appendChild(overlay);
}

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
  const place = systemMapState.system?.places?.find(p => p.id === placeId);
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

  // Build linked object info
  const linkedHtml = linkedObject
    ? `<div class="detail-linked">
        <strong>Location:</strong> ${linkedObject.name} (${linkedObject.type})
      </div>`
    : '';

  // Check if course is already set to this destination
  const hasCourse = pendingCourseData?.locationId === placeId;
  const isSameLocation = currentLocationId === placeId;

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
      ${actionsHtml}
      ${physicsHtml}
    </div>
    <div class="details-footer">
      <button onclick="window.goToPlace('${placeId}'); window.hidePlaceDetails();">Go To</button>
      <button id="btn-set-course"
              onclick="window.setCourseFromDetails('${placeId}', ${travelHours});"
              title="Set navigation course to this destination. Pilot role only - the pilot then uses TRAVEL to execute."
              ${isSameLocation ? 'disabled' : ''}>
        Set Course
      </button>
      <button id="btn-travel"
              onclick="window.travelFromDetails();"
              ${hasCourse ? '' : 'disabled'}>
        Travel
      </button>
    </div>
  `;

  document.body.appendChild(panel);
}

/**
 * Set course from details panel
 */
function setCourseFromDetails(placeId, travelHours) {
  const place = systemMapState.system?.places?.find(p => p.id === placeId);
  if (!place) return;

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

  // Emit travel event to server
  window.state.socket.emit('ops:travel', {
    destinationId: pendingCourseData.locationId
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
  const bodyY = centerY + offsetY + Math.sin(angle) * (body.orbitAU || 0) * auToPixels * 0.6;

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
  const bodyY = centerY + offsetY + Math.sin(angle) * (body.orbitAU || 0) * auToPixels * 0.6;

  systemMapState.offsetX += centerX - bodyX;
  systemMapState.offsetY += centerY - bodyY;
  systemMapState.zoom = Math.min(zoom * zoomMultiplier, systemMapState.MAX_ZOOM);
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
  const bodyScreenY = Math.sin(angle) * (body.orbitAU || 0) * auToPixels * 0.6;
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

// Global access for UI
window.hideSystemMapInfoPanel = hideBodyInfoPanel;
window.hidePlacesOverlay = hidePlacesOverlay;
window.goToPlace = goToPlace;
window.setDestination = setDestination;
window.snapToNow = snapToNow; // AR-88
window.showPlaceDetails = showPlaceDetails;
window.hidePlaceDetails = hidePlaceDetails;
window.animateCameraToLocation = animateCameraToLocation; // Animated travel camera

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
  drawPartyShip(ctx, centerX, centerY, zoom);

  // Draw zoom indicator
  drawZoomIndicator(ctx, width, height, zoom);

  // AR-88: Draw date display
  drawDateDisplay(ctx, width, height);
}

/**
 * Draw twinkling background stars
 */
function drawBackgroundStars(ctx, width, height) {
  // Use deterministic seed for consistent star positions
  const starCount = 200;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';

  for (let i = 0; i < starCount; i++) {
    // Pseudo-random based on index
    const x = ((i * 7919) % width);
    const y = ((i * 104729) % height);
    const size = ((i * 31) % 3) * 0.5 + 0.5;
    const twinkle = Math.sin(systemMapState.time * 2 + i) * 0.3 + 0.7;

    ctx.globalAlpha = twinkle * 0.8;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * Draw a star with glow effect
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Center X
 * @param {number} y - Center Y
 * @param {number} size - Star radius
 * @param {string} stellarClass - G, K, M, A, B, F, O
 * @param {string} glowColor
 */
function drawStar(ctx, x, y, size, stellarClass, glowColor) {
  // Star colors by class
  const starColors = {
    O: '#9bb0ff',  // Blue
    B: '#aabfff',  // Blue-white
    A: '#cad7ff',  // White
    F: '#f8f7ff',  // Yellow-white
    G: '#fff4ea',  // Yellow (like Sol)
    K: '#ffd2a1',  // Orange
    M: '#ffcc6f',  // Red
    L: '#ff6633',  // Brown dwarf
    T: '#cc3300',  // Brown dwarf
    D: '#ffffff'   // White dwarf
  };

  const coreColor = starColors[stellarClass] || starColors.G;

  // Outer glow
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
  gradient.addColorStop(0, coreColor);
  gradient.addColorStop(0.1, coreColor);
  gradient.addColorStop(0.4, 'rgba(255, 200, 100, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, size * 4, 0, Math.PI * 2);
  ctx.fill();

  // Core
  const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
  coreGradient.addColorStop(0, '#ffffff');
  coreGradient.addColorStop(0.5, coreColor);
  coreGradient.addColorStop(1, coreColor);

  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  // Flare effect
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 + systemMapState.time * 0.1;
    const len = size * 2.5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
}

/**
 * Draw an orbit path
 */
function drawOrbitPath(ctx, centerX, centerY, radius) {
  ctx.strokeStyle = systemMapState.colors.orbitPath;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 10]);

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radius, radius * 0.6, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);
}

/**
 * Draw a planet
 * @param {string} type - 'rocky', 'gas', 'ice', 'habitable'
 */
function drawPlanet(ctx, x, y, size, type) {
  // Guard against non-finite values that break createRadialGradient
  if (!isFinite(x) || !isFinite(y) || !isFinite(size) || size <= 0) {
    console.warn('[SystemMap] drawPlanet: Invalid parameters', { x, y, size, type });
    return;
  }

  const colors = {
    rocky: ['#8b7355', '#6b5344', '#5a4535'],
    gas: ['#d4a574', '#c49464', '#b48454', '#e8c4a0'],
    ice: ['#a8c8dc', '#88a8bc', '#c8e8fc'],
    habitable: ['#4a7c59', '#3a6c49', '#2a5c39', '#5a8c69']
  };

  const palette = colors[type] || colors.rocky;

  // Planet sphere with shading
  const gradient = ctx.createRadialGradient(
    x - size * 0.3, y - size * 0.3, 0,
    x, y, size
  );
  gradient.addColorStop(0, palette[palette.length - 1] || palette[0]);
  gradient.addColorStop(0.5, palette[0]);
  gradient.addColorStop(1, palette[1] || palette[0]);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  // Atmosphere glow for habitable worlds
  if (type === 'habitable') {
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size + 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Rings for gas giants (50% chance, larger ones)
  if (type === 'gas' && size > 8) {
    drawRings(ctx, x, y, size);
  }
}

/**
 * Draw planetary rings
 */
function drawRings(ctx, x, y, planetSize) {
  if (!isFinite(x) || !isFinite(y) || !isFinite(planetSize) || planetSize <= 0) return;

  const innerRadius = planetSize * 1.3;
  const outerRadius = planetSize * 2;

  ctx.strokeStyle = 'rgba(200, 180, 150, 0.5)';
  ctx.lineWidth = (outerRadius - innerRadius) * 0.4;

  ctx.beginPath();
  ctx.ellipse(x, y, (innerRadius + outerRadius) / 2, (innerRadius + outerRadius) / 2 * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Draw the full star system
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} zoom - Current zoom level
 * @param {Object} system - System data from generateSystem
 */
function drawFullSystem(ctx, centerX, centerY, zoom, system) {
  const auToPixels = systemMapState.AU_TO_PIXELS * zoom;

  // Draw stars
  for (const star of system.stars) {
    const starX = centerX + star.position.x * auToPixels;
    const starY = centerY + star.position.y * auToPixels;
    const starSize = Math.max(5, star.radius * 10 * Math.sqrt(zoom));
    drawStar(ctx, starX, starY, starSize, star.type, star.color);
  }

  // Draw asteroid belts
  for (const belt of system.asteroidBelts) {
    drawAsteroidBelt(ctx, centerX, centerY, belt, auToPixels);
  }

  // Draw orbit paths
  for (const planet of system.planets) {
    const orbitRadius = planet.orbitAU * auToPixels;
    drawOrbitPath(ctx, centerX, centerY, orbitRadius);
  }

  // Draw planets
  for (const planet of system.planets) {
    const orbitRadius = planet.orbitAU * auToPixels;
    // Calculate position based on time (orbit animation)
    const orbitSpeed = 0.1 / Math.sqrt(planet.orbitAU); // Slower for outer planets
    const angle = systemMapState.time * orbitSpeed;
    const planetX = centerX + Math.cos(angle) * orbitRadius;
    const planetY = centerY + Math.sin(angle) * orbitRadius * 0.6; // Isometric ellipse

    // Size scales with zoom but has min/max for visibility
    // Guard against undefined size - use default 5000
    const planetSize = Math.max(3, Math.min(50, ((planet.size || 5000) / 5000) * zoom * 2));

    drawPlanet(ctx, planetX, planetY, planetSize, planet.type);

    // Draw planet label at higher zoom
    if (zoom > 0.5 && planetSize > 5) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(planet.name, planetX, planetY + planetSize + 12);
    }

    // Draw moons at high zoom
    if (zoom > 2 && planet.moons.length > 0) {
      drawMoons(ctx, planetX, planetY, planet, zoom);
    }
  }
}

/**
 * Draw asteroid belt
 */
function drawAsteroidBelt(ctx, centerX, centerY, belt, auToPixels) {
  const innerRadius = belt.innerRadius * auToPixels;
  const outerRadius = belt.outerRadius * auToPixels;

  // Belt zone as gradient
  ctx.strokeStyle = `rgba(120, 100, 80, ${belt.density * 0.3})`;
  ctx.lineWidth = outerRadius - innerRadius;
  ctx.setLineDash([2, 4]);

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, (innerRadius + outerRadius) / 2, (innerRadius + outerRadius) / 2 * 0.6, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);

  // Scattered asteroids
  const asteroidCount = 30;
  ctx.fillStyle = 'rgba(150, 130, 110, 0.6)';
  for (let i = 0; i < asteroidCount; i++) {
    const r = innerRadius + (i * 7919) % (outerRadius - innerRadius);
    const angle = (i * 104729) % 360 * Math.PI / 180 + systemMapState.time * 0.01;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r * 0.6;
    const size = 1 + (i % 3);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw moons around a planet
 */
function drawMoons(ctx, planetX, planetY, planet, zoom) {
  for (let i = 0; i < planet.moons.length; i++) {
    const moon = planet.moons[i];
    const moonOrbitRadius = Math.max(15, (moon.orbitRadius / 50000) * zoom);
    const moonAngle = systemMapState.time * 2 + i * Math.PI / 3;
    const moonX = planetX + Math.cos(moonAngle) * moonOrbitRadius;
    const moonY = planetY + Math.sin(moonAngle) * moonOrbitRadius * 0.6;
    const moonSize = Math.max(2, (moon.size / 2000) * zoom);

    // Moon orbit path
    ctx.strokeStyle = 'rgba(100, 100, 120, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.ellipse(planetX, planetY, moonOrbitRadius, moonOrbitRadius * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Moon
    ctx.fillStyle = systemMapState.colors.moon;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw zoom indicator
 */
function drawZoomIndicator(ctx, width, height, zoom) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '12px monospace';
  ctx.textAlign = 'right';

  let scaleLabel;
  if (zoom < 0.5) {
    scaleLabel = `${Math.round(100 / zoom)} AU`;
  } else if (zoom < 5) {
    scaleLabel = `${Math.round(10 / zoom)} AU`;
  } else {
    scaleLabel = `${Math.round(1000000 / zoom)} km`;
  }

  ctx.fillText(`Zoom: ${zoom.toFixed(2)}x | Scale: ~${scaleLabel}`, width - 10, height - 10);
}

/**
 * AR-88: Draw current Imperial date display on canvas
 */
function drawDateDisplay(ctx, width, height) {
  const date = getDate();
  const dateStr = `${date.year}.${date.day.toString().padStart(3, '0')}`;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Date: ${dateStr}`, 10, height - 10);
}

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
 * AR-87: Toggle labels on system map
 */
function toggleSystemMapLabels() {
  systemMapState.showLabels = !systemMapState.showLabels;
  console.log('[SystemMap] Labels:', systemMapState.showLabels ? 'ON' : 'OFF');
}

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
    au = au * (1.4 + rng() * 0.6);
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
 * Load a star system directly from JSON data (from data/star-systems/*.json)
 * @param {Object} jsonData - The parsed JSON system data
 * @returns {Object} The loaded system
 */
function loadSystemFromJSON(jsonData) {
  if (!jsonData || !jsonData.celestialObjects) {
    console.warn('[SystemMap] Invalid system JSON data');
    return null;
  }

  // Convert celestialObjects to the expected planet format
  const celestialObjects = jsonData.celestialObjects || [];

  // Extract stars
  const stars = celestialObjects
    .filter(obj => obj.type === 'Star')
    .map(star => ({
      type: star.stellarClass?.[0] || 'G',
      subtype: parseInt(star.stellarClass?.slice(1)) || 2,
      luminosity: star.stellarClass?.split(' ')[1] || 'V',
      radius: getStarRadiusFromClass(star.stellarClass || 'G2 V'),
      position: { x: star.orbitAU || 0, y: 0 }
    }));

  // Default star if none found
  if (stars.length === 0) {
    const stellarClass = jsonData.stellar?.primary || 'G2 V';
    stars.push({
      type: stellarClass[0] || 'G',
      subtype: parseInt(stellarClass.slice(1)) || 2,
      luminosity: stellarClass.split(' ')[1] || 'V',
      radius: getStarRadiusFromClass(stellarClass),
      position: { x: 0, y: 0 }
    });
  }

  // Extract planets (include Planet, Moon, Gas Giant, Ice Giant as renderable bodies)
  // AR-102: Include radiusKm for size-based zoom calculation (unified with places)
  const planets = celestialObjects
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
  const asteroidBelts = celestialObjects
    .filter(obj => obj.type === 'Belt' || obj.type === 'Asteroid Belt' || obj.type === 'Planetoid Belt')
    .map((belt, i) => ({
      id: belt.id || `belt_${i}`,
      innerRadius: belt.innerAU || ((belt.orbitAU || 2) * 0.8),
      outerRadius: belt.outerAU || ((belt.orbitAU || 2) * 1.2),
      density: belt.density || 0.4,
      canMine: true
    }));

  // Generate places array from locations (server IDs) for Places overlay
  // Each location links to a celestialObject via linkedTo field
  const places = (jsonData.locations || []).map(loc => {
    // Find linked celestial object for position/radius data
    const linkedObj = celestialObjects.find(obj => obj.id === loc.linkedTo);
    return {
      id: loc.id,  // Use server location ID (loc-dock-highport, etc.)
      name: loc.name,
      icon: getPlaceIcon(loc.type),
      description: loc.type || 'Location',
      orbitAU: linkedObj?.orbitAU || 1,
      type: loc.type,
      radiusKm: linkedObj?.radiusKm,  // AR-102: Get from linked celestial object
      linkedTo: loc.linkedTo  // Keep reference to celestial object
    };
  });

  // Build system object
  const system = {
    name: jsonData.name,
    uwp: jsonData.uwp || 'X000000-0',
    hex: jsonData.hex || '0000',
    stars,
    planets,
    asteroidBelts,
    places,
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
      currentY = Math.sin(angle) * parentOrbitAU * 0.6 + (obj.orbitKm || 500) / 149597870.7 * Math.sin(angle * 2);
    } else {
      // Primary celestial bodies orbit the star
      currentX = Math.cos(angle) * orbitAU;
      currentY = Math.sin(angle) * orbitAU * 0.6; // Elliptical view
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
systemMapState.timeSpeed = 0;        // Multiplier: 0 = frozen, 1 = realtime (1 sec = 1 sec)
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
 * Draw party ship on system map
 */
function drawPartyShip(ctx, centerX, centerY, zoom) {
  if (!shipMapState.partyShip) return;

  const pos = shipMapState.partyShip.position || { x: 5, y: 0, z: 0 };
  const auToPixels = systemMapState.AU_TO_PIXELS * zoom;

  const screenX = centerX + pos.x * auToPixels + systemMapState.offsetX;
  const screenY = centerY + pos.y * auToPixels + systemMapState.offsetY;

  // Ship triangle (pointing in heading direction)
  const heading = shipMapState.partyShip.heading || 0;
  const size = Math.max(10, 15 * Math.sqrt(zoom));

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
  ctx.lineTo(-size * 0.6, size * 0.6);  // Left
  ctx.lineTo(0, size * 0.3);      // Rear center
  ctx.lineTo(size * 0.6, size * 0.6);   // Right
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

  // Ship label
  const name = shipMapState.partyShip.name || 'Party Ship';
  ctx.fillStyle = '#88aaff';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(name, screenX, screenY + size + 14);
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
  const shipScreenY = centerY + shipPos.y * auToPixels * 0.6; // Isometric

  for (const contact of shipMapState.contacts) {
    // Skip celestial contacts - they're rendered as planets/stars
    if (contact.celestial) continue;

    let screenX, screenY;

    // AR-71 Phase 3: If contact has absolute position, use it directly
    if (contact.position) {
      screenX = centerX + contact.position.x * auToPixels + systemMapState.offsetX;
      screenY = centerY + contact.position.y * auToPixels * 0.6 + systemMapState.offsetY;
    } else {
      // Convert bearing/range to position relative to ship
      // range_km is the actual property from database (snake_case)
      const rangeKm = contact.range_km || contact.rangeKm || 0;
      const rangeAU = rangeKm / 149597870.7; // km to AU (accurate conversion)
      const bearing = (contact.bearing || 0) * Math.PI / 180;

      // Calculate screen position relative to ship
      const offsetX = Math.cos(bearing) * rangeAU * auToPixels;
      const offsetY = Math.sin(bearing) * rangeAU * auToPixels * 0.6; // Isometric

      screenX = shipScreenX + offsetX;
      screenY = shipScreenY + offsetY;
    }

    // Contact color by marking (from captain)
    const marking = contact.marking || 'unknown';
    const colors = {
      hostile: '#ff4444',
      friendly: '#44ff44',
      neutral: '#ffff44',
      unknown: '#888888'
    };
    const color = colors[marking] || colors.unknown;

    // Size varies by type
    const baseSize = contact.type === 'ship' ? 6 : 5;
    const size = Math.max(3, Math.min(10, baseSize * Math.sqrt(zoom)));

    // Draw contact dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
    ctx.fill();

    // Draw border for better visibility
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Contact label (transponder or designation)
    const label = contact.transponder || contact.designation || contact.name;
    if (label && zoom > 0.5) {
      ctx.fillStyle = color;
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, screenX, screenY + size + 10);
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
  const shipX = centerX + pos.x * auToPixels + systemMapState.offsetX;
  const shipY = centerY + pos.y * auToPixels + systemMapState.offsetY;

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
 * Draw course line to destination
 */
function drawCourseLine(ctx, centerX, centerY, zoom) {
  if (!shipMapState.partyShip || !shipMapState.destination) return;

  const auToPixels = systemMapState.AU_TO_PIXELS * zoom;
  const shipPos = shipMapState.partyShip.position || { x: 5, y: 0, z: 0 };

  const shipX = centerX + shipPos.x * auToPixels + systemMapState.offsetX;
  const shipY = centerY + shipPos.y * auToPixels + systemMapState.offsetY;

  // Get destination position (from body orbit)
  const dest = shipMapState.destination;
  const orbitRadius = dest.orbitRadius || 1;
  const destX = centerX + orbitRadius * auToPixels + systemMapState.offsetX;
  const destY = centerY + systemMapState.offsetY;

  // Draw dashed line
  ctx.strokeStyle = '#4488ff';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(shipX, shipY);
  ctx.lineTo(destX, destY);
  ctx.stroke();
  ctx.setLineDash([]);
}

// Expose ship functions globally
window.updateShipPosition = updateShipPosition;
window.updateMapContacts = updateMapContacts;
window.toggleRangeBands = toggleRangeBands;
window.setMapDestination = setMapDestination;
window.shipMapState = shipMapState;
window.resizeSystemMapCanvas = resizeCanvas;
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

    // Label
    if (zoom > 0.5 && obj.name) {
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

  // Ship label
  ctx.fillStyle = '#00ff00';
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('SHIP', shipX + 10, shipY + 3);

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
  embeddedMapState
};
