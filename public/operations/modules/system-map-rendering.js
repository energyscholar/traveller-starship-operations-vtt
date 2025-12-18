/**
 * AR-201 Phase 5: System Map Rendering
 *
 * Canvas drawing functions for system map visualization.
 * Extracted from system-map.js for maintainability.
 */

// State and helpers injected via init
let state = null;
let helpers = null;

/**
 * Initialize rendering module with state and helpers
 * @param {Object} mapState - systemMapState object
 * @param {Object} mapHelpers - Helper functions { getYScale, getDate }
 */
export function initSystemMapRendering(mapState, mapHelpers) {
  state = mapState;
  helpers = mapHelpers;
}

/**
 * Draw twinkling background stars
 */
export function drawBackgroundStars(ctx, width, height) {
  const starCount = 200;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';

  for (let i = 0; i < starCount; i++) {
    const x = ((i * 7919) % width);
    const y = ((i * 104729) % height);
    const size = ((i * 31) % 3) * 0.5 + 0.5;
    const twinkle = Math.sin(state.time * 2 + i) * 0.3 + 0.7;

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
export function drawStar(ctx, x, y, size, stellarClass, glowColor) {
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
    const angle = i * Math.PI / 2 + state.time * 0.1;
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
export function drawOrbitPath(ctx, centerX, centerY, radius) {
  ctx.strokeStyle = state.colors.orbitPath;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 10]);

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radius, radius * helpers.getYScale(), 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);
}

/**
 * Draw planetary rings
 */
export function drawRings(ctx, x, y, planetSize) {
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
 * Draw a planet
 * @param {string} type - 'rocky', 'gas', 'ice', 'habitable'
 */
export function drawPlanet(ctx, x, y, size, type) {
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
 * Draw moons around a planet
 */
export function drawMoons(ctx, planetX, planetY, planet, zoom) {
  const getYScale = helpers.getYScale;
  for (let i = 0; i < planet.moons.length; i++) {
    const moon = planet.moons[i];
    const moonOrbitRadius = Math.max(15, (moon.orbitRadius / 50000) * zoom);
    const moonAngle = state.time * 2 + i * Math.PI / 3;
    const moonX = planetX + Math.cos(moonAngle) * moonOrbitRadius;
    const moonY = planetY + Math.sin(moonAngle) * moonOrbitRadius * getYScale();
    const moonSize = Math.max(2, (moon.size / 2000) * zoom);

    // Moon orbit path
    ctx.strokeStyle = 'rgba(100, 100, 120, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.ellipse(planetX, planetY, moonOrbitRadius, moonOrbitRadius * getYScale(), 0, 0, Math.PI * 2);
    ctx.stroke();

    // Moon
    ctx.fillStyle = state.colors.moon;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw asteroid belt
 */
export function drawAsteroidBelt(ctx, centerX, centerY, belt, auToPixels) {
  const getYScale = helpers.getYScale;
  const innerRadius = belt.innerRadius * auToPixels;
  const outerRadius = belt.outerRadius * auToPixels;

  // Belt zone as gradient
  ctx.strokeStyle = `rgba(120, 100, 80, ${belt.density * 0.3})`;
  ctx.lineWidth = outerRadius - innerRadius;
  ctx.setLineDash([2, 4]);

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, (innerRadius + outerRadius) / 2, (innerRadius + outerRadius) / 2 * getYScale(), 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);

  // Scattered asteroids
  const asteroidCount = 30;
  ctx.fillStyle = 'rgba(150, 130, 110, 0.6)';
  for (let i = 0; i < asteroidCount; i++) {
    const r = innerRadius + (i * 7919) % (outerRadius - innerRadius);
    const angle = (i * 104729) % 360 * Math.PI / 180 + state.time * 0.01;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r * getYScale();
    const size = 1 + (i % 3);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw the full star system
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} zoom - Current zoom level
 * @param {Object} system - System data from generateSystem
 */
export function drawFullSystem(ctx, centerX, centerY, zoom, system) {
  const getYScale = helpers.getYScale;
  const auToPixels = state.AU_TO_PIXELS * zoom;

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
    const angle = state.time * orbitSpeed;
    const planetX = centerX + Math.cos(angle) * orbitRadius;
    const planetY = centerY + Math.sin(angle) * orbitRadius * getYScale(); // Isometric ellipse

    // Size scales with zoom but has min/max for visibility
    // Guard against undefined size - use default 5000
    const planetSize = Math.max(3, Math.min(50, ((planet.size || 5000) / 5000) * zoom * 2));

    drawPlanet(ctx, planetX, planetY, planetSize, planet.type);

    // Draw planet label at higher zoom
    // AR-124: Celestial labels hidden until position verified (immersive)
    if (zoom > 0.5 && planetSize > 5) {
      const isVerified = typeof window.getShipState === 'function'
        ? window.getShipState()?.positionVerified !== false
        : true;
      // AR-199: Only draw labels if enabled
      if (state.showLabels) {
        const labelText = isVerified ? planet.name : '???';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(labelText, planetX, planetY + planetSize + 12);
      }
    }

    // Draw moons at high zoom
    if (zoom > 2 && planet.moons.length > 0) {
      drawMoons(ctx, planetX, planetY, planet, zoom);
    }
  }
}

/**
 * Draw zoom indicator
 */
export function drawZoomIndicator(ctx, width, height, zoom) {
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
export function drawDateDisplay(ctx, width, height) {
  const date = helpers.getDate();
  const dateStr = `${date.year}.${date.day.toString().padStart(3, '0')}`;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Date: ${dateStr}`, 10, height - 10);
}
