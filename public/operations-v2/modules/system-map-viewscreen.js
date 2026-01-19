/**
 * V2 System Map Viewscreen
 * Simplified port of compact-viewscreen.js for V2 GUI
 * Displays star system with orbiting planets
 */

console.log('[V2Viewscreen] Module loading...');

// V2 State container
const v2SystemMap = {
  system: null,
  celestialObjects: [],
  time: 0,
  zoom: 1.0,
  offsetX: 0,
  offsetY: 0
};
window.v2SystemMap = v2SystemMap;

// Simple event emitter
const v2SystemMapEvents = {
  listeners: {},
  on(event, cb) { (this.listeners[event] = this.listeners[event] || []).push(cb); },
  emit(event, data) { (this.listeners[event] || []).forEach(cb => cb(data)); },
  off(event, cb) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(c => c !== cb);
    }
  }
};
window.v2SystemMapEvents = v2SystemMapEvents;

// Viewscreen state
const viewscreenState = {
  container: null,
  canvas: null,
  ctx: null,
  visible: true,
  animationFrame: null,
  paused: false,

  // Colors
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

  AU_TO_PIXELS: 50,
  TIME_SPEED: 0.002
};

/**
 * Initialize the viewscreen
 * @param {HTMLElement} container - Container element
 * @param {string} role - Current user role
 */
function initV2Viewscreen(container, role) {
  if (!container) {
    console.warn('[V2Viewscreen] No container provided');
    return;
  }

  viewscreenState.container = container;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'viewscreen-canvas';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.innerHTML = '';
  container.appendChild(canvas);

  viewscreenState.canvas = canvas;
  viewscreenState.ctx = canvas.getContext('2d');

  // Size canvas
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Sync with v2SystemMap
  syncFromV2State();

  // Start render loop
  startRenderLoop();

  console.log('[V2Viewscreen] Initialized');
}

function resizeCanvas() {
  const canvas = viewscreenState.canvas;
  const container = viewscreenState.container;
  if (!canvas || !container) return;

  const rect = container.getBoundingClientRect();
  canvas.width = rect.width || 300;
  canvas.height = rect.height || 200;
}

function syncFromV2State() {
  if (window.v2SystemMap?.system) {
    v2SystemMap.system = window.v2SystemMap.system;
    v2SystemMap.celestialObjects = window.v2SystemMap.celestialObjects || [];
    v2SystemMap.time = window.v2SystemMap.time || 0;
  }
}

function startRenderLoop() {
  if (viewscreenState.animationFrame) {
    cancelAnimationFrame(viewscreenState.animationFrame);
  }

  function loop() {
    if (!viewscreenState.paused) {
      v2SystemMap.time += viewscreenState.TIME_SPEED;
      renderSystemMap();
    }
    viewscreenState.animationFrame = requestAnimationFrame(loop);
  }

  loop();
}

function renderSystemMap() {
  const { ctx, canvas, colors, AU_TO_PIXELS } = viewscreenState;
  if (!ctx || !canvas) return;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2 + v2SystemMap.offsetX;
  const centerY = height / 2 + v2SystemMap.offsetY;
  const zoom = v2SystemMap.zoom;

  // Clear
  ctx.fillStyle = colors.space;
  ctx.fillRect(0, 0, width, height);

  const system = v2SystemMap.system;
  const celestials = v2SystemMap.celestialObjects || [];

  // Draw star
  drawStar(ctx, centerX, centerY, system?.starType || 'G');

  // Draw orbits and planets
  celestials.forEach(obj => {
    if (!obj.orbitRadius) return;

    const orbitPx = obj.orbitRadius * AU_TO_PIXELS * zoom;

    // Draw orbit path
    ctx.strokeStyle = colors.orbitPath;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, orbitPx, 0, Math.PI * 2);
    ctx.stroke();

    // Calculate planet position
    const period = obj.orbitalPeriod || (obj.orbitRadius * 365);
    const angle = (v2SystemMap.time / period) * Math.PI * 2 + (obj.startAngle || 0);
    const px = centerX + Math.cos(angle) * orbitPx;
    const py = centerY + Math.sin(angle) * orbitPx;

    // Draw planet
    const size = Math.max(3, (obj.size || 5) * zoom);
    ctx.fillStyle = getPlanetColor(obj.type, colors);
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();

    // Draw label
    if (obj.name && zoom > 0.5) {
      ctx.fillStyle = '#ffffff88';
      ctx.font = '10px monospace';
      ctx.fillText(obj.name, px + size + 4, py + 3);
    }
  });

  // Draw ship position if available
  const shipPos = window.v2State?.shipPosition;
  if (shipPos && shipPos.x !== undefined) {
    const sx = centerX + shipPos.x * AU_TO_PIXELS * zoom;
    const sy = centerY + shipPos.y * AU_TO_PIXELS * zoom;

    ctx.fillStyle = colors.ship;
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Ship label
    ctx.fillStyle = colors.ship;
    ctx.font = '9px monospace';
    ctx.fillText('SHIP', sx + 6, sy + 3);
  }

  // Draw system name
  if (system?.name) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(system.name, 8, 16);
  }

  // Draw "No Data" if no system
  if (!system && celestials.length === 0) {
    ctx.fillStyle = '#666666';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AWAITING SYSTEM DATA', width / 2, height / 2);
    ctx.textAlign = 'left';
  }
}

function drawStar(ctx, x, y, starType) {
  const colors = viewscreenState.colors;
  const radius = 12 * v2SystemMap.zoom;

  // Glow
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
  gradient.addColorStop(0, colors.starGlow);
  gradient.addColorStop(0.5, 'rgba(255, 247, 230, 0.3)');
  gradient.addColorStop(1, 'transparent');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
  ctx.fill();

  // Star body
  const starColor = getStarColor(starType);
  ctx.fillStyle = starColor;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function getStarColor(type) {
  const typeColors = {
    'O': '#9bb0ff', 'B': '#aabfff', 'A': '#cad7ff',
    'F': '#f8f7ff', 'G': '#fff4ea', 'K': '#ffd2a1',
    'M': '#ffcc6f', 'L': '#ff6633', 'T': '#cc3300',
    'D': '#ffffff'
  };
  return typeColors[type?.[0]] || typeColors['G'];
}

function getPlanetColor(type, colors) {
  const typeMap = {
    'rocky': colors.planetRocky,
    'terrestrial': colors.planetRocky,
    'gas': colors.planetGas,
    'gas giant': colors.planetGas,
    'ice': colors.planetIce,
    'ice giant': colors.planetIce,
    'habitable': colors.planetHabitable,
    'earthlike': colors.planetHabitable
  };
  return typeMap[type?.toLowerCase()] || colors.planetRocky;
}

/**
 * Update system data
 * @param {object} systemData - System data object
 */
function updateSystemData(systemData) {
  if (!systemData) return;

  v2SystemMap.system = systemData;
  v2SystemMap.celestialObjects = systemData.celestialObjects || systemData.planets || [];

  v2SystemMapEvents.emit('systemLoaded', systemData);
  console.log('[V2Viewscreen] System data updated:', systemData.name);
}

/**
 * Destroy viewscreen
 */
function destroyV2Viewscreen() {
  if (viewscreenState.animationFrame) {
    cancelAnimationFrame(viewscreenState.animationFrame);
    viewscreenState.animationFrame = null;
  }
  window.removeEventListener('resize', resizeCanvas);

  if (viewscreenState.container) {
    viewscreenState.container.innerHTML = '';
  }

  viewscreenState.canvas = null;
  viewscreenState.ctx = null;
  viewscreenState.container = null;

  console.log('[V2Viewscreen] Destroyed');
}

// Expose functions
window.initV2Viewscreen = initV2Viewscreen;
window.updateV2SystemData = updateSystemData;
window.destroyV2Viewscreen = destroyV2Viewscreen;

console.log('[V2Viewscreen] Module loaded');
