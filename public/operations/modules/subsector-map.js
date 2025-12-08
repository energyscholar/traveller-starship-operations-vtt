/**
 * AR-29.7 Phase 3: District268 Subsector Map
 * Canvas-based hex grid subsector visualization
 */

// Subsector Map State
const sectorMapState = {
  canvas: null,
  ctx: null,
  container: null,

  // View state
  offsetX: 0,
  offsetY: 0,
  scale: 1.0,
  minScale: 0.5,
  maxScale: 2.0,
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

  // AR-34: Jump range and distance measurement
  showJumpCircles: true,         // Toggle jump range circles
  jumpRange: 2,                  // Ship's jump rating (parsecs)
  measureFromSystem: null,       // System to measure distance from
  currentShipHex: null,          // Current ship location hex

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
function initSectorMap(container) {
  sectorMapState.container = container;

  const canvas = document.createElement('canvas');
  canvas.id = 'sector-map-canvas';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  sectorMapState.canvas = canvas;
  sectorMapState.ctx = canvas.getContext('2d');

  resizeSectorCanvas();

  window.addEventListener('resize', resizeSectorCanvas);
  canvas.addEventListener('mousemove', handleSectorMapMouseMove);
  canvas.addEventListener('click', handleSectorMapClick);
  canvas.addEventListener('mousedown', handleSectorMapMouseDown);
  canvas.addEventListener('mouseup', handleSectorMapMouseUp);
  canvas.addEventListener('mouseleave', handleSectorMapMouseUp);
  canvas.addEventListener('wheel', handleSectorMapWheel, { passive: false });

  // Touch support for mobile
  canvas.addEventListener('touchstart', handleSectorMapTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleSectorMapTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleSectorMapTouchEnd);
}

function resizeSectorCanvas() {
  const canvas = sectorMapState.canvas;
  const container = sectorMapState.container;
  if (!canvas || !container) return;

  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  sectorMapState.ctx.scale(dpr, dpr);
  renderSectorMap();
}

/**
 * Load subsector data
 * @param {string} subsectorId - e.g., 'district268'
 */
async function loadSectorData(subsectorId) {
  try {
    const response = await fetch(`/api/subsectors/${subsectorId}`);
    if (!response.ok) throw new Error(`Failed to load subsector: ${response.status}`);

    const data = await response.json();
    sectorMapState.subsector = data;
    sectorMapState.systems = data.systems || [];
    sectorMapState.jumpRoutes = data.jumpRoutes || [];

    // Reset view offset for new subsector
    sectorMapState.offsetX = 0;
    sectorMapState.offsetY = 0;
    sectorMapState.selectedSystem = null;
    sectorMapState.hoveredSystem = null;

    // Update title
    const titleEl = document.getElementById('sector-map-title');
    if (titleEl) titleEl.textContent = `${data.name} Subsector`;

    renderSectorMap();
    console.log(`[SectorMap] Loaded ${data.name}: ${data.systems.length} systems`);
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

  const scale = sectorMapState.scale;
  const size = sectorMapState.HEX_SIZE * scale;
  const width = size * Math.sqrt(3);
  const height = size * 2;

  // Offset hex grid (odd columns shift down)
  const x = col * width * 0.75 + sectorMapState.offsetX + 60 * scale;
  const y = row * height * 0.75 + (col % 2 === 0 ? 0 : height * 0.375) + sectorMapState.offsetY + 40 * scale;

  return { x, y };
}

/**
 * Find system at canvas position
 */
function getSystemAtPosition(canvasX, canvasY) {
  const systems = sectorMapState.systems;
  const clickRadius = sectorMapState.HEX_SIZE * sectorMapState.scale * 0.5;

  for (const sys of systems) {
    const pos = hexToPixel(sys.hex);
    const dist = Math.sqrt((canvasX - pos.x) ** 2 + (canvasY - pos.y) ** 2);
    if (dist < clickRadius) return sys;
  }
  return null;
}

// AR-34: Calculate hex distance (parsecs) between two hex coordinates
function calculateHexDistance(hex1, hex2) {
  const col1 = parseInt(hex1.substring(0, 2), 10);
  const row1 = parseInt(hex1.substring(2, 4), 10);
  const col2 = parseInt(hex2.substring(0, 2), 10);
  const row2 = parseInt(hex2.substring(2, 4), 10);

  // Convert to axial coordinates for hex distance
  const x1 = col1;
  const z1 = row1 - Math.floor(col1 / 2);
  const y1 = -x1 - z1;

  const x2 = col2;
  const z2 = row2 - Math.floor(col2 / 2);
  const y2 = -x2 - z2;

  // Hex distance is max of absolute differences
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2));
}

// AR-34: Get all systems within jump range of a hex
function getSystemsInJumpRange(fromHex, jumpRange) {
  return sectorMapState.systems.filter(sys => {
    const dist = calculateHexDistance(fromHex, sys.hex);
    return dist > 0 && dist <= jumpRange;
  });
}

// AR-34: Set ship's current location
function setShipLocation(hex) {
  sectorMapState.currentShipHex = hex;
  renderSectorMap();
}

// AR-36: Center map on a specific hex
function centerOnHex(hex) {
  if (!hex || !sectorMapState.canvas) return;

  const scale = sectorMapState.scale;
  const size = sectorMapState.HEX_SIZE * scale;
  const width = size * Math.sqrt(3);
  const height = size * 2;

  // Parse hex (e.g., "0530" -> col=5, row=30)
  const col = parseInt(hex.substring(0, 2), 10);
  const row = parseInt(hex.substring(2, 4), 10);

  // Calculate hex position without current offset
  const hexX = col * width * 0.75 + 60 * scale;
  const hexY = row * height * 0.75 + (col % 2 === 0 ? 0 : height * 0.375) + 40 * scale;

  // Center the canvas on this position
  const canvasCenterX = sectorMapState.canvas.width / (2 * window.devicePixelRatio);
  const canvasCenterY = sectorMapState.canvas.height / (2 * window.devicePixelRatio);

  sectorMapState.offsetX = canvasCenterX - hexX;
  sectorMapState.offsetY = canvasCenterY - hexY;

  renderSectorMap();
}

// AR-34: Set jump range (based on ship's jump rating)
function setJumpRange(rating) {
  sectorMapState.jumpRange = Math.max(1, Math.min(6, rating));
  renderSectorMap();
}

// AR-34: Toggle jump circle display
function toggleJumpCircles(show) {
  sectorMapState.showJumpCircles = show !== undefined ? show : !sectorMapState.showJumpCircles;
  renderSectorMap();
}

// AR-34: Draw jump range circles showing reachable hexes
function drawJumpRangeCircles(ctx, sourceHex, scale) {
  const sourcePos = hexToPixel(sourceHex);
  const jumpRange = sectorMapState.jumpRange;

  // Draw concentric circles for each jump distance
  const colors = [
    'rgba(68, 255, 68, 0.15)',   // J1 - green
    'rgba(68, 136, 255, 0.12)',  // J2 - blue
    'rgba(255, 200, 68, 0.10)',  // J3 - yellow
    'rgba(255, 136, 68, 0.08)',  // J4 - orange
    'rgba(255, 68, 68, 0.06)',   // J5 - red
    'rgba(200, 68, 255, 0.05)'   // J6 - purple
  ];

  // Calculate hex distance in pixels (approximate)
  const hexWidth = sectorMapState.HEX_SIZE * scale * Math.sqrt(3);

  for (let dist = jumpRange; dist >= 1; dist--) {
    const radius = hexWidth * dist * 0.85;

    ctx.beginPath();
    ctx.arc(sourcePos.x, sourcePos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = colors[dist - 1] || 'rgba(100, 100, 100, 0.05)';
    ctx.fill();

    // Draw range label
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 - dist * 0.04})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Highlight reachable systems
  const reachable = getSystemsInJumpRange(sourceHex, jumpRange);
  for (const sys of reachable) {
    const pos = hexToPixel(sys.hex);
    const dist = calculateHexDistance(sourceHex, sys.hex);

    // Draw ring around reachable systems
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 12 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = colors[dist - 1]?.replace(/[\d.]+\)/, '0.8)') || 'rgba(100, 255, 100, 0.8)';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
  }

  // Draw ship marker at source
  ctx.beginPath();
  ctx.arc(sourcePos.x, sourcePos.y, 5 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#44ff44';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// AR-34: Draw distance measurement line between two systems
function drawDistanceLine(ctx, fromSys, toSys, scale) {
  const fromPos = hexToPixel(fromSys.hex);
  const toPos = hexToPixel(toSys.hex);
  const distance = calculateHexDistance(fromSys.hex, toSys.hex);

  // Draw line
  ctx.beginPath();
  ctx.moveTo(fromPos.x, fromPos.y);
  ctx.lineTo(toPos.x, toPos.y);
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw distance label at midpoint
  const midX = (fromPos.x + toPos.x) / 2;
  const midY = (fromPos.y + toPos.y) / 2;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  const labelWidth = 60 * scale;
  const labelHeight = 24 * scale;
  ctx.fillRect(midX - labelWidth / 2, midY - labelHeight / 2, labelWidth, labelHeight);
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(midX - labelWidth / 2, midY - labelHeight / 2, labelWidth, labelHeight);

  // Text
  ctx.fillStyle = '#ffff00';
  ctx.font = `bold ${Math.round(12 * scale)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${distance} pc`, midX, midY);
}

// AR-34: Start distance measurement from a system
function startMeasurement(system) {
  sectorMapState.measureFromSystem = system;
  renderSectorMap();
}

// AR-34: Clear distance measurement
function clearMeasurement() {
  sectorMapState.measureFromSystem = null;
  renderSectorMap();
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
function renderSectorMap() {
  const ctx = sectorMapState.ctx;
  const canvas = sectorMapState.canvas;
  if (!ctx || !canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;

  // Clear
  ctx.fillStyle = sectorMapState.colors.background;
  ctx.fillRect(0, 0, width, height);

  // Draw title
  if (sectorMapState.subsector) {
    ctx.fillStyle = sectorMapState.colors.label;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(sectorMapState.subsector.name, width / 2, 25);
  }

  const scale = sectorMapState.scale;
  const scaledHexSize = sectorMapState.HEX_SIZE * scale;

  // Draw hex grid
  for (let col = 1; col <= sectorMapState.HEX_WIDTH; col++) {
    for (let row = 1; row <= sectorMapState.HEX_HEIGHT; row++) {
      const hexCoord = `${String(col).padStart(2, '0')}${String(row).padStart(2, '0')}`;
      const pos = hexToPixel(hexCoord);

      // Highlight hovered hex
      const isHovered = sectorMapState.hoveredSystem?.hex === hexCoord;
      const fill = isHovered ? sectorMapState.colors.hexHover : null;

      drawHex(ctx, pos.x, pos.y, scaledHexSize, fill, sectorMapState.colors.hexOutline);

      // Draw hex number (scale font)
      ctx.fillStyle = 'rgba(80, 100, 120, 0.5)';
      ctx.font = `${Math.round(9 * scale)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(hexCoord, pos.x, pos.y - scaledHexSize + 12 * scale);
    }
  }

  // Draw jump routes
  ctx.strokeStyle = sectorMapState.colors.jumpRoute;
  ctx.lineWidth = 2 * scale;
  for (const route of sectorMapState.jumpRoutes) {
    const from = hexToPixel(route.from);
    const to = hexToPixel(route.to);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  // AR-34: Draw jump range circles
  const sourceHex = sectorMapState.currentShipHex ||
                    sectorMapState.selectedSystem?.hex;
  if (sectorMapState.showJumpCircles && sourceHex) {
    drawJumpRangeCircles(ctx, sourceHex, scale);
  }

  // AR-34: Draw distance measurement line
  if (sectorMapState.measureFromSystem && sectorMapState.hoveredSystem &&
      sectorMapState.measureFromSystem !== sectorMapState.hoveredSystem) {
    drawDistanceLine(ctx, sectorMapState.measureFromSystem, sectorMapState.hoveredSystem, scale);
  }

  // Draw systems
  for (const sys of sectorMapState.systems) {
    const pos = hexToPixel(sys.hex);
    const isHovered = sectorMapState.hoveredSystem === sys;
    const isSelected = sectorMapState.selectedSystem === sys;

    // System dot (scale radius)
    const baseRadius = isHovered || isSelected ? 8 : 6;
    const radius = baseRadius * scale;
    let color = sectorMapState.colors.systemDot;

    // Color by allegiance
    if (sys.allegiance === 'Im') color = sectorMapState.colors.imperial;
    else if (sys.allegiance === 'Na') color = sectorMapState.colors.nonAligned;

    // Zone colors
    if (sys.zone === 'A') color = sectorMapState.colors.amber;
    else if (sys.zone === 'R') color = sectorMapState.colors.red;

    if (isHovered || isSelected) color = sectorMapState.colors.systemHover;

    // Draw glow for hovered
    if (isHovered || isSelected) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 4 * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();
    }

    // Draw system dot
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw base indicators (scale positions and sizes)
    if (sys.bases && sys.bases.length > 0) {
      const baseY = pos.y - 12 * scale;
      if (sys.bases.includes('N')) {
        ctx.fillStyle = sectorMapState.colors.systemNaval;
        ctx.fillRect(pos.x - 10 * scale, baseY, 6 * scale, 4 * scale);
      }
      if (sys.bases.includes('S')) {
        ctx.fillStyle = sectorMapState.colors.systemScout;
        ctx.fillRect(pos.x + 4 * scale, baseY, 6 * scale, 4 * scale);
      }
    }

    // Draw system name (scale font)
    ctx.fillStyle = isHovered || isSelected ? sectorMapState.colors.labelHover : sectorMapState.colors.label;
    const baseFontSize = isHovered || isSelected ? 11 : 10;
    ctx.font = `${isHovered || isSelected ? 'bold ' : ''}${Math.round(baseFontSize * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(sys.name, pos.x, pos.y + 20 * scale);

    // Draw starport class (scale font)
    ctx.fillStyle = 'rgba(150, 180, 200, 0.7)';
    ctx.font = `${Math.round(9 * scale)}px monospace`;
    ctx.fillText(sys.starport, pos.x, pos.y + 30 * scale);
  }

  // Draw info panel for selected system
  if (sectorMapState.hoveredSystem) {
    drawSystemInfoPanel(ctx, sectorMapState.hoveredSystem, width, height);
  }
}

/**
 * Draw info panel for hovered system
 */
function drawSystemInfoPanel(ctx, sys, canvasWidth, canvasHeight) {
  // AR-34: Calculate jump distance and fuel if ship has a location
  const sourceHex = sectorMapState.currentShipHex || sectorMapState.selectedSystem?.hex;
  let jumpInfo = null;
  if (sourceHex && sourceHex !== sys.hex) {
    const distance = calculateHexDistance(sourceHex, sys.hex);
    const inRange = distance <= sectorMapState.jumpRange;
    // Estimate fuel (10% of hull per parsec - use 100t default)
    const estimatedFuel = distance * 10;
    jumpInfo = { distance, inRange, estimatedFuel };
  }

  const panelWidth = 180;
  const panelHeight = jumpInfo ? 130 : 100;
  const x = canvasWidth - panelWidth - 10;
  const y = 40;

  // Panel background
  ctx.fillStyle = 'rgba(20, 30, 40, 0.9)';
  ctx.fillRect(x, y, panelWidth, panelHeight);
  ctx.strokeStyle = sectorMapState.colors.hexOutline;
  ctx.strokeRect(x, y, panelWidth, panelHeight);

  // Content
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(sys.name, x + 10, y + 20);

  ctx.fillStyle = sectorMapState.colors.label;
  ctx.font = '10px monospace';
  ctx.fillText(`Hex: ${sys.hex}`, x + 10, y + 38);
  ctx.fillText(`UWP: ${sys.uwp}`, x + 10, y + 52);
  ctx.fillText(`TL: ${sys.techLevel}`, x + 10, y + 66);
  ctx.fillText(sys.remarks || '', x + 10, y + 80);

  if (sys.zone) {
    ctx.fillStyle = sys.zone === 'A' ? sectorMapState.colors.amber : sectorMapState.colors.red;
    ctx.fillText(`Zone: ${sys.zone === 'A' ? 'AMBER' : 'RED'}`, x + 100, y + 38);
  }

  // AR-34: Show jump info
  if (jumpInfo) {
    ctx.fillStyle = jumpInfo.inRange ? '#44ff44' : '#ff6666';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`Distance: ${jumpInfo.distance} parsecs`, x + 10, y + 98);

    ctx.fillStyle = jumpInfo.inRange ? sectorMapState.colors.label : '#ff6666';
    ctx.font = '10px monospace';
    const rangeText = jumpInfo.inRange
      ? `In range (J${sectorMapState.jumpRange})`
      : `Out of range (need J${jumpInfo.distance})`;
    ctx.fillText(rangeText, x + 10, y + 112);

    ctx.fillStyle = sectorMapState.colors.label;
    ctx.fillText(`Est. fuel: ~${jumpInfo.estimatedFuel}t`, x + 10, y + 126);
  }
}

// Event handlers
function handleSectorMapMouseMove(e) {
  const rect = sectorMapState.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (sectorMapState.isDragging) {
    const dx = x - sectorMapState.lastMouseX;
    const dy = y - sectorMapState.lastMouseY;
    sectorMapState.offsetX += dx;
    sectorMapState.offsetY += dy;
    sectorMapState.lastMouseX = x;
    sectorMapState.lastMouseY = y;
    renderSectorMap();
    return;
  }

  const sys = getSystemAtPosition(x, y);
  if (sys !== sectorMapState.hoveredSystem) {
    sectorMapState.hoveredSystem = sys;
    sectorMapState.canvas.style.cursor = sys ? 'pointer' : 'default';
    renderSectorMap();
  }
}

function handleSectorMapClick(e) {
  const rect = sectorMapState.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const sys = getSystemAtPosition(x, y);
  if (sys) {
    // AR-34: Shift+click starts measurement mode
    if (e.shiftKey) {
      if (sectorMapState.measureFromSystem) {
        // Calculate and display final distance
        const distance = calculateHexDistance(sectorMapState.measureFromSystem.hex, sys.hex);
        console.log(`[SectorMap] Distance: ${sectorMapState.measureFromSystem.name} → ${sys.name} = ${distance} parsecs`);

        // Dispatch measurement event
        const event = new CustomEvent('subsector:distanceMeasured', {
          detail: {
            from: sectorMapState.measureFromSystem,
            to: sys,
            distance: distance
          }
        });
        document.dispatchEvent(event);

        sectorMapState.measureFromSystem = null;
      } else {
        sectorMapState.measureFromSystem = sys;
        console.log(`[SectorMap] Measuring from: ${sys.name}`);
      }
      renderSectorMap();
      return;
    }

    // Regular click - select system
    sectorMapState.selectedSystem = sys;
    sectorMapState.measureFromSystem = null; // Clear measurement
    renderSectorMap();

    // Dispatch event for external handling (load into star system map)
    const event = new CustomEvent('subsector:systemSelected', {
      detail: { system: sys, hex: sys.hex, name: sys.name }
    });
    document.dispatchEvent(event);

    console.log(`[SectorMap] Selected system: ${sys.name} (${sys.hex})`);
  } else {
    // Click on empty space - clear selection and measurement
    sectorMapState.selectedSystem = null;
    sectorMapState.measureFromSystem = null;
    renderSectorMap();
  }
}

function handleSectorMapMouseDown(e) {
  const rect = sectorMapState.canvas.getBoundingClientRect();
  sectorMapState.isDragging = true;
  sectorMapState.lastMouseX = e.clientX - rect.left;
  sectorMapState.lastMouseY = e.clientY - rect.top;
}

function handleSectorMapMouseUp() {
  sectorMapState.isDragging = false;
}

/**
 * Handle mouse wheel for zoom
 */
function handleSectorMapWheel(e) {
  e.preventDefault();

  const rect = sectorMapState.canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Zoom factor
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(
    sectorMapState.minScale,
    Math.min(sectorMapState.maxScale, sectorMapState.scale * zoomFactor)
  );

  if (newScale !== sectorMapState.scale) {
    // Zoom toward cursor position
    const scaleChange = newScale / sectorMapState.scale;
    sectorMapState.offsetX = mouseX - (mouseX - sectorMapState.offsetX) * scaleChange;
    sectorMapState.offsetY = mouseY - (mouseY - sectorMapState.offsetY) * scaleChange;
    sectorMapState.scale = newScale;
    renderSectorMap();
  }
}

// Touch state
let touchState = {
  lastTouchX: 0,
  lastTouchY: 0,
  lastPinchDist: 0,
  isPinching: false
};

function handleSectorMapTouchStart(e) {
  e.preventDefault();

  if (e.touches.length === 1) {
    // Single touch - pan
    touchState.lastTouchX = e.touches[0].clientX;
    touchState.lastTouchY = e.touches[0].clientY;
    touchState.isPinching = false;
  } else if (e.touches.length === 2) {
    // Two touches - pinch zoom
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    touchState.lastPinchDist = Math.sqrt(dx * dx + dy * dy);
    touchState.isPinching = true;
  }
}

function handleSectorMapTouchMove(e) {
  e.preventDefault();

  if (e.touches.length === 1 && !touchState.isPinching) {
    // Pan
    const dx = e.touches[0].clientX - touchState.lastTouchX;
    const dy = e.touches[0].clientY - touchState.lastTouchY;
    sectorMapState.offsetX += dx;
    sectorMapState.offsetY += dy;
    touchState.lastTouchX = e.touches[0].clientX;
    touchState.lastTouchY = e.touches[0].clientY;
    renderSectorMap();
  } else if (e.touches.length === 2) {
    // Pinch zoom
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (touchState.lastPinchDist > 0) {
      const zoomFactor = dist / touchState.lastPinchDist;
      const newScale = Math.max(
        sectorMapState.minScale,
        Math.min(sectorMapState.maxScale, sectorMapState.scale * zoomFactor)
      );

      if (newScale !== sectorMapState.scale) {
        // Zoom toward center of pinch
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = sectorMapState.canvas.getBoundingClientRect();
        const canvasCenterX = centerX - rect.left;
        const canvasCenterY = centerY - rect.top;

        const scaleChange = newScale / sectorMapState.scale;
        sectorMapState.offsetX = canvasCenterX - (canvasCenterX - sectorMapState.offsetX) * scaleChange;
        sectorMapState.offsetY = canvasCenterY - (canvasCenterY - sectorMapState.offsetY) * scaleChange;
        sectorMapState.scale = newScale;
        renderSectorMap();
      }
    }
    touchState.lastPinchDist = dist;
  }
}

function handleSectorMapTouchEnd(e) {
  if (e.touches.length < 2) {
    touchState.isPinching = false;
    touchState.lastPinchDist = 0;
  }
  if (e.touches.length === 1) {
    touchState.lastTouchX = e.touches[0].clientX;
    touchState.lastTouchY = e.touches[0].clientY;
  }
}

/**
 * Zoom controls (for UI buttons)
 */
function zoomSectorMap(factor) {
  const newScale = Math.max(
    sectorMapState.minScale,
    Math.min(sectorMapState.maxScale, sectorMapState.scale * factor)
  );
  if (newScale !== sectorMapState.scale) {
    // Zoom toward center
    const canvas = sectorMapState.canvas;
    const dpr = window.devicePixelRatio || 1;
    const centerX = (canvas.width / dpr) / 2;
    const centerY = (canvas.height / dpr) / 2;

    const scaleChange = newScale / sectorMapState.scale;
    sectorMapState.offsetX = centerX - (centerX - sectorMapState.offsetX) * scaleChange;
    sectorMapState.offsetY = centerY - (centerY - sectorMapState.offsetY) * scaleChange;
    sectorMapState.scale = newScale;
    renderSectorMap();
  }
}

function resetSectorZoom() {
  sectorMapState.scale = 1.0;
  sectorMapState.offsetX = 0;
  sectorMapState.offsetY = 0;
  renderSectorMap();
}

/**
 * Show/hide subsector map
 */
function showSectorMap() {
  const overlay = document.getElementById('sector-map-container');
  const canvasContainer = document.getElementById('sector-map-canvas-container');
  if (overlay && canvasContainer) {
    overlay.style.display = 'flex';
    if (!sectorMapState.canvas) {
      initSectorMap(canvasContainer);
    }
    loadSectorData('district268');

    // AR-36: Center on ship's current location after a brief delay for rendering
    setTimeout(() => {
      if (sectorMapState.currentShipHex) {
        centerOnHex(sectorMapState.currentShipHex);
      }
    }, 100);
  }
}

function hideSectorMap() {
  const container = document.getElementById('sector-map-container');
  if (container) {
    container.style.display = 'none';
  }
}

function toggleSectorMap() {
  const container = document.getElementById('sector-map-container');
  if (container && container.style.display !== 'none') {
    hideSectorMap();
  } else {
    showSectorMap();
  }
}

// Expose to window
window.initSectorMap = initSectorMap;
window.loadSectorData = loadSectorData;
window.showSectorMap = showSectorMap;
window.hideSectorMap = hideSectorMap;
window.toggleSectorMap = toggleSectorMap;
window.zoomSectorMap = zoomSectorMap;
window.resetSectorZoom = resetSectorZoom;
window.sectorMapState = sectorMapState; // For debugging
// AR-34: Jump range and distance functions
window.setShipLocation = setShipLocation;
window.setJumpRange = setJumpRange;
window.centerOnHex = centerOnHex;
window.toggleJumpCircles = toggleJumpCircles;
window.startMeasurement = startMeasurement;
window.clearMeasurement = clearMeasurement;
window.calculateHexDistance = calculateHexDistance;
window.getSystemsInJumpRange = getSystemsInJumpRange;
