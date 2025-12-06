/**
 * AR-29.7 Phase 3: District268 Subsector Map
 * Canvas-based hex grid subsector visualization
 */

// Subsector Map State
const subsectorMapState = {
  canvas: null,
  ctx: null,
  container: null,

  // View state
  offsetX: 0,
  offsetY: 0,
  isDragging: false,
  lastMouseX: 0,
  lastMouseY: 0,

  // Data
  subsector: null,
  systems: [],
  jumpRoutes: [],

  // Selection
  hoveredSystem: null,
  selectedSystem: null,

  // Layout constants
  HEX_SIZE: 45,         // Radius of hex
  HEX_WIDTH: 8,         // Columns in subsector
  HEX_HEIGHT: 10,       // Rows in subsector

  // Colors
  colors: {
    background: '#0a0a12',
    hexOutline: 'rgba(60, 80, 100, 0.4)',
    hexHover: 'rgba(80, 120, 160, 0.3)',
    systemDot: '#88aacc',
    systemHover: '#ffffff',
    systemNaval: '#4488ff',
    systemScout: '#44ff88',
    jumpRoute: 'rgba(100, 150, 200, 0.25)',
    label: '#aabbcc',
    labelHover: '#ffffff',
    amber: '#ffaa00',
    red: '#ff4444',
    imperial: '#4488ff',
    nonAligned: '#888888'
  }
};

/**
 * Initialize subsector map
 * @param {HTMLElement} container - Container for canvas
 */
function initSubsectorMap(container) {
  subsectorMapState.container = container;

  const canvas = document.createElement('canvas');
  canvas.id = 'subsector-map-canvas';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  subsectorMapState.canvas = canvas;
  subsectorMapState.ctx = canvas.getContext('2d');

  resizeSubsectorCanvas();

  window.addEventListener('resize', resizeSubsectorCanvas);
  canvas.addEventListener('mousemove', handleSubsectorMouseMove);
  canvas.addEventListener('click', handleSubsectorClick);
  canvas.addEventListener('mousedown', handleSubsectorMouseDown);
  canvas.addEventListener('mouseup', handleSubsectorMouseUp);
  canvas.addEventListener('mouseleave', handleSubsectorMouseUp);
}

function resizeSubsectorCanvas() {
  const canvas = subsectorMapState.canvas;
  const container = subsectorMapState.container;
  if (!canvas || !container) return;

  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  subsectorMapState.ctx.scale(dpr, dpr);
  renderSubsectorMap();
}

/**
 * Load subsector data
 * @param {string} subsectorId - e.g., 'district268'
 */
async function loadSubsector(subsectorId) {
  try {
    const response = await fetch(`/api/subsectors/${subsectorId}`);
    if (!response.ok) throw new Error(`Failed to load subsector: ${response.status}`);

    const data = await response.json();
    subsectorMapState.subsector = data;
    subsectorMapState.systems = data.systems || [];
    subsectorMapState.jumpRoutes = data.jumpRoutes || [];

    renderSubsectorMap();
    return data;
  } catch (err) {
    console.error('Failed to load subsector:', err);
    return null;
  }
}

/**
 * Convert hex coord (e.g., "0102") to canvas position
 */
function hexToPixel(hexCoord) {
  const col = parseInt(hexCoord.substring(0, 2), 10);
  const row = parseInt(hexCoord.substring(2, 4), 10);

  const size = subsectorMapState.HEX_SIZE;
  const width = size * Math.sqrt(3);
  const height = size * 2;

  // Offset hex grid (odd columns shift down)
  const x = col * width * 0.75 + subsectorMapState.offsetX + 60;
  const y = row * height * 0.75 + (col % 2 === 0 ? 0 : height * 0.375) + subsectorMapState.offsetY + 40;

  return { x, y };
}

/**
 * Find system at canvas position
 */
function getSystemAtPosition(canvasX, canvasY) {
  const systems = subsectorMapState.systems;
  const clickRadius = subsectorMapState.HEX_SIZE * 0.5;

  for (const sys of systems) {
    const pos = hexToPixel(sys.hex);
    const dist = Math.sqrt((canvasX - pos.x) ** 2 + (canvasY - pos.y) ** 2);
    if (dist < clickRadius) return sys;
  }
  return null;
}

/**
 * Draw a hex at position
 */
function drawHex(ctx, x, y, size, fill, stroke) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * Render the subsector map
 */
function renderSubsectorMap() {
  const ctx = subsectorMapState.ctx;
  const canvas = subsectorMapState.canvas;
  if (!ctx || !canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;

  // Clear
  ctx.fillStyle = subsectorMapState.colors.background;
  ctx.fillRect(0, 0, width, height);

  // Draw title
  if (subsectorMapState.subsector) {
    ctx.fillStyle = subsectorMapState.colors.label;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(subsectorMapState.subsector.name, width / 2, 25);
  }

  // Draw hex grid
  for (let col = 1; col <= subsectorMapState.HEX_WIDTH; col++) {
    for (let row = 1; row <= subsectorMapState.HEX_HEIGHT; row++) {
      const hexCoord = `${String(col).padStart(2, '0')}${String(row).padStart(2, '0')}`;
      const pos = hexToPixel(hexCoord);

      // Highlight hovered hex
      const isHovered = subsectorMapState.hoveredSystem?.hex === hexCoord;
      const fill = isHovered ? subsectorMapState.colors.hexHover : null;

      drawHex(ctx, pos.x, pos.y, subsectorMapState.HEX_SIZE, fill, subsectorMapState.colors.hexOutline);

      // Draw hex number
      ctx.fillStyle = 'rgba(80, 100, 120, 0.5)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hexCoord, pos.x, pos.y - subsectorMapState.HEX_SIZE + 12);
    }
  }

  // Draw jump routes
  ctx.strokeStyle = subsectorMapState.colors.jumpRoute;
  ctx.lineWidth = 2;
  for (const route of subsectorMapState.jumpRoutes) {
    const from = hexToPixel(route.from);
    const to = hexToPixel(route.to);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  // Draw systems
  for (const sys of subsectorMapState.systems) {
    const pos = hexToPixel(sys.hex);
    const isHovered = subsectorMapState.hoveredSystem === sys;
    const isSelected = subsectorMapState.selectedSystem === sys;

    // System dot
    const radius = isHovered || isSelected ? 8 : 6;
    let color = subsectorMapState.colors.systemDot;

    // Color by allegiance
    if (sys.allegiance === 'Im') color = subsectorMapState.colors.imperial;
    else if (sys.allegiance === 'Na') color = subsectorMapState.colors.nonAligned;

    // Zone colors
    if (sys.zone === 'A') color = subsectorMapState.colors.amber;
    else if (sys.zone === 'R') color = subsectorMapState.colors.red;

    if (isHovered || isSelected) color = subsectorMapState.colors.systemHover;

    // Draw glow for hovered
    if (isHovered || isSelected) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();
    }

    // Draw system dot
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw base indicators
    if (sys.bases && sys.bases.length > 0) {
      const baseY = pos.y - 12;
      if (sys.bases.includes('N')) {
        ctx.fillStyle = subsectorMapState.colors.systemNaval;
        ctx.fillRect(pos.x - 10, baseY, 6, 4);
      }
      if (sys.bases.includes('S')) {
        ctx.fillStyle = subsectorMapState.colors.systemScout;
        ctx.fillRect(pos.x + 4, baseY, 6, 4);
      }
    }

    // Draw system name
    ctx.fillStyle = isHovered || isSelected ? subsectorMapState.colors.labelHover : subsectorMapState.colors.label;
    ctx.font = isHovered || isSelected ? 'bold 11px monospace' : '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(sys.name, pos.x, pos.y + 20);

    // Draw starport class
    ctx.fillStyle = 'rgba(150, 180, 200, 0.7)';
    ctx.font = '9px monospace';
    ctx.fillText(sys.starport, pos.x, pos.y + 30);
  }

  // Draw info panel for selected system
  if (subsectorMapState.hoveredSystem) {
    drawSystemInfoPanel(ctx, subsectorMapState.hoveredSystem, width, height);
  }
}

/**
 * Draw info panel for hovered system
 */
function drawSystemInfoPanel(ctx, sys, canvasWidth, canvasHeight) {
  const panelWidth = 180;
  const panelHeight = 100;
  const x = canvasWidth - panelWidth - 10;
  const y = 40;

  // Panel background
  ctx.fillStyle = 'rgba(20, 30, 40, 0.9)';
  ctx.fillRect(x, y, panelWidth, panelHeight);
  ctx.strokeStyle = subsectorMapState.colors.hexOutline;
  ctx.strokeRect(x, y, panelWidth, panelHeight);

  // Content
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(sys.name, x + 10, y + 20);

  ctx.fillStyle = subsectorMapState.colors.label;
  ctx.font = '10px monospace';
  ctx.fillText(`Hex: ${sys.hex}`, x + 10, y + 38);
  ctx.fillText(`UWP: ${sys.uwp}`, x + 10, y + 52);
  ctx.fillText(`TL: ${sys.techLevel}`, x + 10, y + 66);
  ctx.fillText(sys.remarks || '', x + 10, y + 80);

  if (sys.zone) {
    ctx.fillStyle = sys.zone === 'A' ? subsectorMapState.colors.amber : subsectorMapState.colors.red;
    ctx.fillText(`Zone: ${sys.zone === 'A' ? 'AMBER' : 'RED'}`, x + 100, y + 38);
  }
}

// Event handlers
function handleSubsectorMouseMove(e) {
  const rect = subsectorMapState.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (subsectorMapState.isDragging) {
    const dx = x - subsectorMapState.lastMouseX;
    const dy = y - subsectorMapState.lastMouseY;
    subsectorMapState.offsetX += dx;
    subsectorMapState.offsetY += dy;
    subsectorMapState.lastMouseX = x;
    subsectorMapState.lastMouseY = y;
    renderSubsectorMap();
    return;
  }

  const sys = getSystemAtPosition(x, y);
  if (sys !== subsectorMapState.hoveredSystem) {
    subsectorMapState.hoveredSystem = sys;
    subsectorMapState.canvas.style.cursor = sys ? 'pointer' : 'default';
    renderSubsectorMap();
  }
}

function handleSubsectorClick(e) {
  const rect = subsectorMapState.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const sys = getSystemAtPosition(x, y);
  if (sys) {
    subsectorMapState.selectedSystem = sys;
    renderSubsectorMap();

    // Dispatch event for external handling (load into star system map)
    const event = new CustomEvent('subsector:systemSelected', {
      detail: { system: sys, hex: sys.hex, name: sys.name }
    });
    document.dispatchEvent(event);

    console.log(`[SubsectorMap] Selected system: ${sys.name} (${sys.hex})`);
  }
}

function handleSubsectorMouseDown(e) {
  const rect = subsectorMapState.canvas.getBoundingClientRect();
  subsectorMapState.isDragging = true;
  subsectorMapState.lastMouseX = e.clientX - rect.left;
  subsectorMapState.lastMouseY = e.clientY - rect.top;
}

function handleSubsectorMouseUp() {
  subsectorMapState.isDragging = false;
}

/**
 * Show/hide subsector map
 */
function showSubsectorMap() {
  const overlay = document.getElementById('subsector-map-container');
  const canvasContainer = document.getElementById('subsector-map-canvas-container');
  if (overlay && canvasContainer) {
    overlay.style.display = 'flex';
    if (!subsectorMapState.canvas) {
      initSubsectorMap(canvasContainer);
    }
    loadSubsector('district268');
  }
}

function hideSubsectorMap() {
  const container = document.getElementById('subsector-map-container');
  if (container) {
    container.style.display = 'none';
  }
}

function toggleSubsectorMap() {
  const container = document.getElementById('subsector-map-container');
  if (container && container.style.display !== 'none') {
    hideSubsectorMap();
  } else {
    showSubsectorMap();
  }
}

// Expose to window
window.initSubsectorMap = initSubsectorMap;
window.loadSubsector = loadSubsector;
window.showSubsectorMap = showSubsectorMap;
window.hideSubsectorMap = hideSubsectorMap;
window.toggleSubsectorMap = toggleSubsectorMap;
