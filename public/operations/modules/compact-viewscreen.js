/**
 * AR-164: Compact Viewscreen Panel with Panel Switcher
 * Switchable between: System Map, Ship Log, Sensor Display, Crew Status
 * Animation locked at 1x speed for system map view
 */

console.log('[CompactViewscreen] Module loading...');

// Panel types
const PANEL_TYPES = {
  SYSTEM_MAP: 'system-map',
  SHIP_LOG: 'ship-log',
  SENSORS: 'sensors',
  CREW: 'crew'
};

const PANEL_LABELS = {
  [PANEL_TYPES.SYSTEM_MAP]: 'System Map',
  [PANEL_TYPES.SHIP_LOG]: 'Ship Log',
  [PANEL_TYPES.SENSORS]: 'Sensors',
  [PANEL_TYPES.CREW]: 'Crew Status'
};

// Viewscreen State
const viewscreenState = {
  container: null,
  canvas: null,
  ctx: null,
  visible: true,
  animationFrame: null,
  time: 0,
  paused: false,
  currentPanel: PANEL_TYPES.SYSTEM_MAP,

  // View state for system map
  zoom: 1.0,  // AR-166: Match main system map zoom
  offsetX: 0,
  offsetY: 0,
  system: null,
  celestialObjects: null,  // Synced from systemMapState

  // Colors for system map
  colors: {
    space: '#0a0e14',
    starGlow: '#fff7e6',
    orbitPath: 'rgba(100, 120, 150, 0.2)',
    planetRocky: '#8b7355',
    planetGas: '#d4a574',
    planetIce: '#a8c8dc',
    planetHabitable: '#4a7c59',
    moon: '#888888',
    ship: '#4299e1'
  },

  AU_TO_PIXELS: 50,  // AR-166: Match main system map scale
  TIME_SPEED: 0.002  // AR-166: Slow animation (1/500th speed)
};

// Storage key for persistence
const STORAGE_KEY = 'ops_right_panel_selection';

/**
 * Initialize the compact viewscreen
 * @param {HTMLElement} container - Container element
 */
function initCompactViewscreen(container) {
  if (!container) {
    console.warn('[CompactViewscreen] No container provided');
    return;
  }

  viewscreenState.container = container;

  // Load saved preference
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && Object.values(PANEL_TYPES).includes(saved)) {
    viewscreenState.currentPanel = saved;
  }

  // Create DOM and render current panel
  createViewscreenDOM();
  renderCurrentPanel();

  // Start animation if system map
  if (viewscreenState.currentPanel === PANEL_TYPES.SYSTEM_MAP) {
    startAnimation();
    syncWithSystemMap();
  }

  console.log('[CompactViewscreen] Initialized with panel:', viewscreenState.currentPanel);
}

/**
 * Create the viewscreen DOM structure with panel selector
 */
function createViewscreenDOM() {
  const container = viewscreenState.container;
  const currentLabel = PANEL_LABELS[viewscreenState.currentPanel];

  container.innerHTML = `
    <div class="viewscreen-frame">
      <div class="viewscreen-bezel">
        <div class="viewscreen-display" id="viewscreen-content">
          <!-- Content rendered by renderCurrentPanel() -->
        </div>
      </div>
      <div class="viewscreen-controls">
        <select id="panel-selector" class="panel-selector" title="Switch panel view">
          ${Object.entries(PANEL_LABELS).map(([key, label]) =>
            `<option value="${key}" ${key === viewscreenState.currentPanel ? 'selected' : ''}>${label}</option>`
          ).join('')}
        </select>
      </div>
    </div>
  `;

  // Add event listener for panel selector
  const selector = container.querySelector('#panel-selector');
  selector?.addEventListener('change', (e) => {
    switchPanel(e.target.value);
  });
}

/**
 * Switch to a different panel
 * @param {string} panelType - Panel type to switch to
 */
function switchPanel(panelType) {
  if (!Object.values(PANEL_TYPES).includes(panelType)) {
    console.warn('[CompactViewscreen] Invalid panel type:', panelType);
    return;
  }

  // Stop animation if leaving system map
  if (viewscreenState.currentPanel === PANEL_TYPES.SYSTEM_MAP && viewscreenState.animationFrame) {
    cancelAnimationFrame(viewscreenState.animationFrame);
    viewscreenState.animationFrame = null;
  }

  viewscreenState.currentPanel = panelType;

  // Save preference
  localStorage.setItem(STORAGE_KEY, panelType);

  // Render new panel
  renderCurrentPanel();

  // Start animation if switching to system map
  if (panelType === PANEL_TYPES.SYSTEM_MAP) {
    viewscreenState._debugDrawn = false;
    // Delay slightly to let DOM render canvas
    setTimeout(() => {
      resizeViewscreen();
      syncWithSystemMap();
      startAnimation();
      console.log('[CompactViewscreen] System map activated, canvas:', viewscreenState.canvas?.width, viewscreenState.canvas?.height);
    }, 50);
  }

  console.log('[CompactViewscreen] Switched to:', panelType);
}

/**
 * Render the currently selected panel
 */
function renderCurrentPanel() {
  const content = viewscreenState.container?.querySelector('#viewscreen-content');
  if (!content) return;

  switch (viewscreenState.currentPanel) {
    case PANEL_TYPES.SYSTEM_MAP:
      renderSystemMapPanel(content);
      break;
    case PANEL_TYPES.SHIP_LOG:
      renderShipLogPanel(content);
      break;
    case PANEL_TYPES.SENSORS:
      renderSensorsPanel(content);
      break;
    case PANEL_TYPES.CREW:
      renderCrewPanel(content);
      break;
  }
}

/**
 * Render System Map panel (canvas-based)
 */
function renderSystemMapPanel(content) {
  content.innerHTML = `
    <canvas id="viewscreen-canvas"></canvas>
    <div class="viewscreen-overlay">
      <span class="viewscreen-label">SYSTEM VIEW</span>
      <span class="viewscreen-time" id="viewscreen-time">--:--:--</span>
    </div>
    <div class="viewscreen-toast" id="viewscreen-toast"></div>
  `;

  // Show info toast after system loads
  setTimeout(() => showSystemInfoToast(), 500);

  viewscreenState.canvas = content.querySelector('#viewscreen-canvas');
  viewscreenState.ctx = viewscreenState.canvas?.getContext('2d');

  // AR-166: Click to pause/play
  if (viewscreenState.canvas) {
    viewscreenState.canvas.style.cursor = 'pointer';
    viewscreenState.canvas.addEventListener('click', togglePause);
  }

  resizeViewscreen();
}

/**
 * Toggle animation pause state
 */
function togglePause() {
  viewscreenState.paused = !viewscreenState.paused;
  console.log('[CompactViewscreen] Animation', viewscreenState.paused ? 'paused' : 'playing');
  showToast(viewscreenState.paused ? '⏸ Paused' : '▶ Playing', 2000);
}

/**
 * Show system info toast
 */
function showSystemInfoToast() {
  const system = viewscreenState.system || window.systemMapState?.system;
  const ship = window.state?.ship;

  if (!system) {
    showToast('Awaiting system data...', 3000);
    return;
  }

  const systemName = system.name || 'Unknown System';
  const shipName = ship?.name || 'Unknown Vessel';
  const location = ship?.location || 'In Transit';

  const msg = `${systemName} System\n${shipName}\n${location}`;
  console.log('[CompactViewscreen] System info:', { systemName, shipName, location, time: viewscreenState.time });
  showToast(msg, 10000);
}

/**
 * Show a toast message in the panel
 */
function showToast(message, duration = 5000) {
  const toast = document.getElementById('viewscreen-toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('visible');

  setTimeout(() => {
    toast.classList.remove('visible');
  }, duration);
}

/**
 * Render Ship Log panel
 */
function renderShipLogPanel(content) {
  content.innerHTML = `
    <div class="panel-content ship-log-view">
      <div class="panel-header-mini">
        <span class="viewscreen-label">SHIP LOG</span>
      </div>
      <div class="log-entries-compact" id="compact-log-entries">
        <p class="placeholder">Loading log entries...</p>
      </div>
    </div>
  `;

  // Populate with log entries from main app state
  setTimeout(() => populateLogEntries(), 100);
}

/**
 * Render Sensors panel
 */
function renderSensorsPanel(content) {
  content.innerHTML = `
    <div class="panel-content sensors-view">
      <div class="panel-header-mini">
        <span class="viewscreen-label">SENSORS</span>
        <span class="sensor-mode" id="compact-sensor-mode">PASSIVE</span>
      </div>
      <div class="contacts-compact" id="compact-contacts">
        <p class="placeholder">No contacts detected</p>
      </div>
    </div>
  `;

  // Populate with contacts from main app state
  setTimeout(() => populateContacts(), 100);
}

/**
 * Render Crew panel
 */
function renderCrewPanel(content) {
  content.innerHTML = `
    <div class="panel-content crew-view">
      <div class="panel-header-mini">
        <span class="viewscreen-label">CREW STATUS</span>
      </div>
      <div class="crew-compact" id="compact-crew">
        <p class="placeholder">Loading crew roster...</p>
      </div>
    </div>
  `;

  // Populate with crew from main app state
  setTimeout(() => populateCrew(), 100);
}

/**
 * Populate log entries from window.state
 */
function populateLogEntries() {
  const container = document.getElementById('compact-log-entries');
  if (!container) return;

  const logs = window.state?.logEntries || [];
  if (logs.length === 0) {
    container.innerHTML = '<p class="placeholder">No log entries yet</p>';
    return;
  }

  // Show last 10 entries
  const recentLogs = logs.slice(-10).reverse();
  container.innerHTML = recentLogs.map(log => `
    <div class="log-entry-compact">
      <span class="log-time-compact">${log.gameDate || ''}</span>
      <span class="log-msg-compact">${log.message || ''}</span>
    </div>
  `).join('');
}

/**
 * Populate contacts from window.state
 */
function populateContacts() {
  const container = document.getElementById('compact-contacts');
  if (!container) return;

  const contacts = window.state?.contacts || [];
  if (contacts.length === 0) {
    container.innerHTML = '<p class="placeholder">No contacts in range</p>';
    return;
  }

  container.innerHTML = contacts.slice(0, 8).map(c => `
    <div class="contact-compact ${c.hostile ? 'hostile' : ''}">
      <span class="contact-icon">${getContactIcon(c.type)}</span>
      <span class="contact-name-compact">${c.name || 'Unknown'}</span>
      <span class="contact-range-compact">${c.range || ''}</span>
    </div>
  `).join('');
}

/**
 * Get icon for contact type
 */
function getContactIcon(type) {
  const icons = {
    ship: '🚀',
    station: '🛰️',
    planet: '🌍',
    moon: '🌙',
    asteroid: '☄️',
    star: '⭐',
    hostile: '⚠️'
  };
  return icons[type] || '📍';
}

/**
 * Populate crew from window.state
 */
function populateCrew() {
  const container = document.getElementById('compact-crew');
  if (!container) return;

  const crew = window.state?.crewOnline || [];
  const ship = window.state?.ship;
  const npcCrew = ship?.npcCrew || [];

  if (crew.length === 0 && npcCrew.length === 0) {
    container.innerHTML = '<p class="placeholder">No crew data</p>';
    return;
  }

  // Combine player crew and NPCs
  const allCrew = [
    ...crew.map(c => ({ ...c, isPlayer: true })),
    ...npcCrew.map(c => ({ ...c, isNPC: true }))
  ];

  container.innerHTML = allCrew.slice(0, 8).map(c => `
    <div class="crew-member-compact ${c.isNPC ? 'npc' : 'player'}">
      <span class="crew-role-compact">${formatRole(c.role)}</span>
      <span class="crew-name-compact">${c.name || c.characterName || 'Unnamed'}</span>
      ${c.isNPC ? '<span class="npc-badge">NPC</span>' : ''}
    </div>
  `).join('');
}

/**
 * Format role name
 */
function formatRole(role) {
  if (!role) return '';
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Resize canvas to fit container
 */
function resizeViewscreen() {
  const canvas = viewscreenState.canvas;
  const content = viewscreenState.container?.querySelector('#viewscreen-content');

  if (!canvas || !content) return;

  const rect = content.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  if (viewscreenState.currentPanel === PANEL_TYPES.SYSTEM_MAP) {
    renderViewscreen();
  }
}

/**
 * Sync viewscreen with main system map data
 * Uses event subscription + polling fallback to ensure data is available
 */
function syncWithSystemMap() {
  // Try immediate sync
  if (window.systemMapState?.system) {
    viewscreenState.system = window.systemMapState.system;
    viewscreenState.celestialObjects = window.systemMapState.celestialObjects;
    viewscreenState.time = window.systemMapState.time || 0;
    console.log('[CompactViewscreen] Synced with system map:', viewscreenState.system?.name);
  }

  // Subscribe to future loads
  if (window.systemMapEvents) {
    window.systemMapEvents.on('systemLoaded', (data) => {
      viewscreenState.system = data.system;
      viewscreenState.celestialObjects = data.celestialObjects;
      viewscreenState._debugDrawn = false; // Reset debug flag
      console.log('[CompactViewscreen] System loaded event:', data.system?.name, 'objects:', data.celestialObjects?.length);
      console.log('[CompactViewscreen] Canvas size:', viewscreenState.canvas?.width, viewscreenState.canvas?.height);
      if (viewscreenState.currentPanel === PANEL_TYPES.SYSTEM_MAP) {
        resizeViewscreen(); // Ensure canvas is sized
        renderViewscreen();
      }
    });
  }

  // Polling fallback - check every 500ms for up to 10 seconds
  if (!viewscreenState.system) {
    let attempts = 0;
    const maxAttempts = 20;
    const pollInterval = setInterval(() => {
      attempts++;
      if (window.systemMapState?.system) {
        viewscreenState.system = window.systemMapState.system;
        viewscreenState.celestialObjects = window.systemMapState.celestialObjects;
        viewscreenState._debugDrawn = false;
        console.log('[CompactViewscreen] Polled and found system:', viewscreenState.system?.name, 'objects:', viewscreenState.celestialObjects?.length);
        clearInterval(pollInterval);
        if (viewscreenState.currentPanel === PANEL_TYPES.SYSTEM_MAP) {
          resizeViewscreen();
          renderViewscreen();
        }
      } else if (attempts >= maxAttempts) {
        console.log('[CompactViewscreen] System not found after polling');
        clearInterval(pollInterval);
      }
    }, 500);
  }
}

/**
 * Start the animation loop (for system map only)
 */
function startAnimation() {
  let frameCount = 0;
  console.log('[CompactViewscreen] Animation started, TIME_SPEED:', viewscreenState.TIME_SPEED);

  function animate() {
    if (!viewscreenState.paused && viewscreenState.currentPanel === PANEL_TYPES.SYSTEM_MAP) {
      viewscreenState.time += viewscreenState.TIME_SPEED;
      renderViewscreen();
      updateTimeDisplay();

      // Debug: log time every 300 frames (~5 seconds)
      frameCount++;
      if (frameCount % 300 === 0) {
        console.log('[CompactViewscreen] time:', viewscreenState.time.toFixed(4));
      }
    }
    viewscreenState.animationFrame = requestAnimationFrame(animate);
  }
  animate();
}

/**
 * Render the system map viewscreen
 */
function renderViewscreen() {
  const ctx = viewscreenState.ctx;
  const canvas = viewscreenState.canvas;

  if (!ctx || !canvas) return;

  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.fillStyle = viewscreenState.colors.space;
  ctx.fillRect(0, 0, width, height);

  // Draw scan lines effect
  drawScanLines(ctx, width, height);

  // If no system data, show placeholder
  if (!viewscreenState.system) {
    drawNoSignal(ctx, width, height);
    return;
  }

  // Draw system
  drawSystem(ctx, width, height);
  drawShipPosition(ctx, width, height);
}

function drawScanLines(ctx, width, height) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  for (let y = 0; y < height; y += 2) {
    ctx.fillRect(0, y, width, 1);
  }
}

function drawNoSignal(ctx, width, height) {
  ctx.fillStyle = '#2d3748';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('AWAITING SIGNAL', width / 2, height / 2);
}

function drawSystem(ctx, width, height) {
  const system = viewscreenState.system;
  if (!system) {
    console.log('[CompactViewscreen] drawSystem: no system');
    return;
  }

  const centerX = width / 2;
  const centerY = height / 2;

  // Draw celestial objects from synced state
  const objects = viewscreenState.celestialObjects || system.celestialObjects || [];

  // AR-166: Auto-scale to fit all objects in small panel
  // Guard against zero/small canvas
  if (width < 50 || height < 50) {
    console.log('[CompactViewscreen] drawSystem: canvas too small', width, height);
    return;
  }

  // Debug: log once when we first successfully draw
  if (!viewscreenState._debugDrawn) {
    console.log('[CompactViewscreen] drawSystem:', { width, height, objects: objects.length, system: system.name });
    viewscreenState._debugDrawn = true;
  }

  // Find max orbit radius
  let maxOrbitAU = 0.5; // Minimum to show star area
  for (const obj of objects) {
    const orbitAU = obj.orbitAU || obj.orbitRadius || obj.distanceAU || 0;
    if (orbitAU > maxOrbitAU) maxOrbitAU = orbitAU;
  }

  // Calculate scale to fit in panel (with padding)
  const padding = 15;
  const availableRadius = Math.min(width, height) / 2 - padding;
  const scale = Math.max(1, availableRadius / maxOrbitAU); // Ensure positive

  // Draw goldilocks zone first (behind everything)
  drawGoldilocksZone(ctx, centerX, centerY, scale, system);

  // Draw star
  if (system.star || system.stars?.[0]) {
    drawStar(ctx, centerX, centerY, system.star || system.stars[0]);
  }

  // Draw objects
  for (const obj of objects) {
    if (obj.type === 'Star') continue;
    drawCelestialObject(ctx, centerX, centerY, scale, obj);
  }
}

/**
 * Draw goldilocks/habitable zone overlay
 */
function drawGoldilocksZone(ctx, centerX, centerY, scale, system) {
  // Get habitable zone from system or calculate from stellar class
  const hz = system.habitableZone || getDefaultHabitableZone(system);
  if (!hz) return;

  const yScale = 0.5; // Match isometric view
  const innerRadiusX = hz.inner * scale;
  const innerRadiusY = innerRadiusX * yScale;
  const outerRadiusX = hz.outer * scale;
  const outerRadiusY = outerRadiusX * yScale;

  ctx.save();

  // Draw habitable zone as translucent green elliptical annulus
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, outerRadiusX, outerRadiusY, 0, 0, Math.PI * 2);
  ctx.ellipse(centerX, centerY, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(68, 180, 68, 0.12)';
  ctx.fill();

  // Draw boundary ellipses
  ctx.strokeStyle = 'rgba(68, 180, 68, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, outerRadiusX, outerRadiusY, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Get default habitable zone based on stellar class
 */
function getDefaultHabitableZone(system) {
  const stellarClass = system.stellarClass || system.stars?.[0]?.type || 'G2';
  const letter = stellarClass.charAt(0).toUpperCase();

  // Approximate habitable zone by stellar type (in AU)
  const zones = {
    'O': { inner: 50, outer: 200 },
    'B': { inner: 20, outer: 80 },
    'A': { inner: 3, outer: 8 },
    'F': { inner: 1.2, outer: 2.2 },
    'G': { inner: 0.9, outer: 1.5 },
    'K': { inner: 0.4, outer: 0.8 },
    'M': { inner: 0.1, outer: 0.3 }
  };

  return zones[letter] || zones['G'];
}

function drawStar(ctx, x, y, star) {
  const radius = 6;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
  gradient.addColorStop(0, viewscreenState.colors.starGlow);
  gradient.addColorStop(0.3, 'rgba(255, 247, 230, 0.5)');
  gradient.addColorStop(1, 'rgba(255, 247, 230, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

// Cache for stable start angles per object
const startAngleCache = new Map();

function drawCelestialObject(ctx, centerX, centerY, scale, obj) {
  const orbitAU = obj.orbitAU || obj.orbitRadius || obj.distanceAU || 1;
  const orbitRadius = orbitAU * scale;

  // AR-166: Cache startAngle per object ID to prevent random jitter
  const objId = obj.id || obj.name || `orbit-${orbitAU}`;
  if (!startAngleCache.has(objId)) {
    startAngleCache.set(objId, Math.random() * Math.PI * 2);
  }
  const startAngle = startAngleCache.get(objId);

  // AR-166: Kepler-ish orbital speed (inner planets faster)
  const orbitSpeed = 0.1 / Math.sqrt(orbitAU);
  const angle = viewscreenState.time * orbitSpeed + startAngle;

  const x = centerX + Math.cos(angle) * orbitRadius;
  const y = centerY + Math.sin(angle) * orbitRadius * 0.5;  // 0.5 Y-scale for isometric

  // Draw orbit path
  ctx.strokeStyle = viewscreenState.colors.orbitPath;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, orbitRadius, orbitRadius * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Get color
  let color = viewscreenState.colors.planetRocky;
  if (obj.type === 'GasGiant') color = viewscreenState.colors.planetGas;
  if (obj.type === 'IceGiant') color = viewscreenState.colors.planetIce;
  if (obj.habitable) color = viewscreenState.colors.planetHabitable;

  // Draw planet
  const radius = Math.max(2, (obj.radiusKm || 6000) / 4000);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawShipPosition(ctx, width, height) {
  const shipState = window.shipMapState;
  if (!shipState?.shipX && !shipState?.shipY) return;

  const centerX = width / 2;
  const centerY = height / 2;
  const scale = viewscreenState.AU_TO_PIXELS * viewscreenState.zoom;

  const x = centerX + (shipState.shipX || 0) * scale;
  const y = centerY + (shipState.shipY || 0) * scale * 0.3;

  ctx.fillStyle = viewscreenState.colors.ship;
  ctx.beginPath();
  ctx.moveTo(x, y - 3);
  ctx.lineTo(x + 2, y + 2);
  ctx.lineTo(x - 2, y + 2);
  ctx.closePath();
  ctx.fill();
}

function updateTimeDisplay() {
  const timeEl = viewscreenState.container?.querySelector('#viewscreen-time');
  if (!timeEl) return;

  if (window.getDate) {
    const date = window.getDate();
    if (date) {
      timeEl.textContent = `${date.day}/${date.year}`;
      return;
    }
  }

  const hours = Math.floor(viewscreenState.time / 3600) % 24;
  const minutes = Math.floor(viewscreenState.time / 60) % 60;
  timeEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Refresh the current panel (call after state changes)
 */
function refreshPanel() {
  if (viewscreenState.currentPanel === PANEL_TYPES.SHIP_LOG) {
    populateLogEntries();
  } else if (viewscreenState.currentPanel === PANEL_TYPES.SENSORS) {
    populateContacts();
  } else if (viewscreenState.currentPanel === PANEL_TYPES.CREW) {
    populateCrew();
  }
}

function setViewscreenVisible(visible) {
  viewscreenState.visible = visible;
  viewscreenState.paused = !visible;

  if (viewscreenState.container) {
    viewscreenState.container.style.display = visible ? 'block' : 'none';
  }
}

function destroyCompactViewscreen() {
  if (viewscreenState.animationFrame) {
    cancelAnimationFrame(viewscreenState.animationFrame);
  }

  window.removeEventListener('resize', resizeViewscreen);

  if (viewscreenState.container) {
    viewscreenState.container.innerHTML = '';
  }

  viewscreenState.container = null;
  viewscreenState.canvas = null;
  viewscreenState.ctx = null;

  console.log('[CompactViewscreen] Destroyed');
}

// Listen for window resize
window.addEventListener('resize', () => {
  if (viewscreenState.currentPanel === PANEL_TYPES.SYSTEM_MAP) {
    resizeViewscreen();
  }
});

// Exports
export {
  initCompactViewscreen,
  setViewscreenVisible,
  destroyCompactViewscreen,
  resizeViewscreen,
  switchPanel,
  refreshPanel,
  viewscreenState,
  PANEL_TYPES
};
