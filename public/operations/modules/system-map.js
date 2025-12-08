/**
 * AR-29.5: Interactive Star System Map
 * Canvas-based system visualization with stars, planets, moons
 */

console.log('[SystemMap] Module loading...');

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
    // Zoom toward mouse position
    const rect = systemMapState.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    systemMapState.offsetX = mouseX - (mouseX - systemMapState.offsetX) * zoomFactor;
    systemMapState.offsetY = mouseY - (mouseY - systemMapState.offsetY) * zoomFactor;
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
  if (!systemMapState.system?.planets) return null;

  const { zoom, offsetX, offsetY } = systemMapState;
  const rect = systemMapState.canvas.getBoundingClientRect();
  const centerX = rect.width / 2 + offsetX;
  const centerY = rect.height / 2 + offsetY;
  const auToPixels = systemMapState.AU_TO_PIXELS * zoom;

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

  const travelTime = calculateTravelTime(body.orbitAU);

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
      <div class="info-row"><span class="info-label">Type:</span> <span class="info-value">${body.type}</span></div>
      <div class="info-row"><span class="info-label">Orbit:</span> <span class="info-value">${body.orbitAU.toFixed(2)} AU</span></div>
      <div class="info-row"><span class="info-label">Size:</span> <span class="info-value">${Math.round(body.size).toLocaleString()} km</span></div>
      <div class="info-row"><span class="info-label">Period:</span> <span class="info-value">${Math.round(body.orbitPeriod)} days</span></div>
      <div class="info-row"><span class="info-label">Travel:</span> <span class="info-value">${travelTime}</span></div>
      ${body.isMainworld ? `<div class="info-row"><span class="info-label">UWP:</span> <span class="info-value uwp">${systemMapState.system?.uwp || '?'}</span></div>` : ''}
      ${body.moons?.length ? `<div class="info-row"><span class="info-label">Moons:</span> <span class="info-value">${body.moons.length}</span></div>` : ''}
      ${body.hasRings ? `<div class="info-row"><span class="info-label">Rings:</span> <span class="info-value">Yes</span></div>` : ''}
      ${starportHtml}
      ${fuelHtml}
    </div>
  `;

  document.body.appendChild(panel);
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

  const placesHtml = systemMapState.system.places.map(place => `
    <div class="place-item" data-place-id="${place.id}" onclick="window.goToPlace('${place.id}')">
      <span class="place-icon">${place.icon}</span>
      <div class="place-info">
        <div class="place-name">${place.name}</div>
        <div class="place-desc">${place.description}</div>
      </div>
    </div>
  `).join('');

  overlay.innerHTML = `
    <div class="places-header">
      <h4>Destinations</h4>
      <button class="places-close" onclick="window.hidePlacesOverlay()">×</button>
    </div>
    <div class="places-list">
      ${placesHtml}
    </div>
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
 * Navigate to a place (center view)
 */
function goToPlace(placeId) {
  const place = systemMapState.system?.places?.find(p => p.id === placeId);
  if (!place) return;

  // Find the associated planet if any
  if (place.planetId) {
    const planet = systemMapState.system.planets.find(p => p.id === place.planetId);
    if (planet) {
      systemMapState.selectedBody = planet;
      centerOnBody(planet);
      showBodyInfoPanel(planet);
    }
  }

  console.log('[SystemMap] Going to:', place.name);
}

/**
 * Center view on a body
 */
function centerOnBody(body) {
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
  systemMapState.zoom = Math.min(zoom * 1.5, systemMapState.MAX_ZOOM);
}

/**
 * Set destination (stub for future travel system)
 */
function setDestination(bodyId) {
  console.log('[SystemMap] Destination set:', bodyId);
  // TODO: Integrate with astrogation/pilot systems
}

// Global access for UI
window.hideSystemMapInfoPanel = hideBodyInfoPanel;
window.hidePlacesOverlay = hidePlacesOverlay;
window.goToPlace = goToPlace;
window.setDestination = setDestination;

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
 * Calculate travel time to a body at given AU distance
 * Assumes 1G thrust, simplified Traveller physics
 */
function calculateTravelTime(auDistance) {
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
      systemMapState.time += 0.016 * systemMapState.timeSpeed; // ~60fps, scaled by speed
      systemMapState.simulatedDate += 0.016 * systemMapState.timeSpeed * 0.5; // Days pass
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

  // AR-29.9: Draw ship integration overlays
  drawRangeBands(ctx, centerX, centerY, zoom);
  drawCourseLine(ctx, centerX, centerY, zoom);
  drawMapContacts(ctx, centerX, centerY, zoom);
  drawPartyShip(ctx, centerX, centerY, zoom);

  // Draw zoom indicator
  drawZoomIndicator(ctx, width, height, zoom);
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
    const planetSize = Math.max(3, Math.min(50, (planet.size / 5000) * zoom * 2));

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
 * Get habitable zone range for star type
 */
function getHabitableZone(starType) {
  const zones = {
    O: { inner: 50, outer: 200 },
    B: { inner: 10, outer: 50 },
    A: { inner: 2, outer: 5 },
    F: { inner: 1.2, outer: 2.5 },
    G: { inner: 0.9, outer: 1.5 },
    K: { inner: 0.5, outer: 0.9 },
    M: { inner: 0.1, outer: 0.4 }
  };
  return zones[starType] || zones.G;
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
 * Draw sensor contacts on system map
 */
function drawMapContacts(ctx, centerX, centerY, zoom) {
  if (!shipMapState.contacts.length) return;

  const auToPixels = systemMapState.AU_TO_PIXELS * zoom;

  for (const contact of shipMapState.contacts) {
    // Convert bearing/range to position (simplified)
    const range = contact.rangeKm ? contact.rangeKm / 150000000 : 1; // Convert km to AU approx
    const bearing = (contact.bearing || 0) * Math.PI / 180;

    const x = Math.cos(bearing) * range;
    const y = Math.sin(bearing) * range;

    const screenX = centerX + x * auToPixels + systemMapState.offsetX;
    const screenY = centerY + y * auToPixels + systemMapState.offsetY;

    // Contact color by type
    let color = '#888888';
    if (contact.hostile) color = '#ff4444';
    else if (contact.friendly) color = '#44ff44';
    else if (contact.known) color = '#ffff44';

    // Draw contact
    const size = 6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
    ctx.fill();

    // Contact designation
    if (contact.designation) {
      ctx.fillStyle = color;
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(contact.designation, screenX, screenY + size + 10);
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

// Export for ES modules (app.js imports these)
export {
  initSystemMap,
  loadSystem,
  destroySystemMap,
  systemMapState,
  generateSystem,
  TEST_SYSTEMS,
  loadTestSystem,
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
  resizeCanvas
};
