/**
 * AR-153 Phase 2B: Sensor Operations Module
 * Sensor control, ECM/ECCM, stealth, and radar display
 *
 * Note: Uses global showNotification from notifications.js
 */

/**
 * Perform sensor scan
 * @param {Object} state - Application state
 * @param {Function} renderPanel - Panel render function
 * @param {string} scanType - Type of scan (passive/active)
 */
export function performScan(state, renderPanel, scanType = 'passive') {
  state.socket.emit('ops:sensorScan', { scanType });
  showNotification(`Initiating ${scanType} sensor scan...`, 'info');
}

/**
 * AR-208: Set sensor mode (passive/active)
 * Passive: Listen only, position hidden
 * Active: Full sweep, reveals position
 * @param {Object} state - Application state
 * @param {Function} renderPanel - Panel render function
 * @param {string} mode - Scan mode (passive/active)
 */
export function setScanMode(state, renderPanel, mode = 'passive') {
  if (!state.shipState) state.shipState = {};
  state.shipState.scanMode = mode;
  state.socket.emit('ops:setScanMode', { mode });

  const messages = {
    passive: 'PASSIVE MODE: Listening only. Position hidden.',
    active: 'ACTIVE MODE: Full sensor sweep. Position revealed!'
  };

  showNotification(messages[mode] || 'Scan mode changed', mode === 'passive' ? 'success' : 'warning');
  renderPanel('sensor_operator');
}

/**
 * Toggle ECM (Electronic Counter Measures)
 * @param {Object} state - Application state
 * @param {Function} renderPanel - Panel render function
 */
export function toggleECM(state, renderPanel) {
  const newState = !state.shipState?.ecm;
  state.socket.emit('ops:setEW', { type: 'ecm', active: newState });
  if (!state.shipState) state.shipState = {};
  state.shipState.ecm = newState;
  showNotification(`ECM ${newState ? 'ACTIVATED' : 'DEACTIVATED'} - Enemies get ${newState ? '-2 DM' : 'no penalty'} to sensors`, newState ? 'warning' : 'info');
  renderPanel('sensor_operator');
}

/**
 * Toggle ECCM (Electronic Counter-Counter Measures)
 * @param {Object} state - Application state
 * @param {Function} renderPanel - Panel render function
 */
export function toggleECCM(state, renderPanel) {
  const newState = !state.shipState?.eccm;
  state.socket.emit('ops:setEW', { type: 'eccm', active: newState });
  if (!state.shipState) state.shipState = {};
  state.shipState.eccm = newState;
  showNotification(`ECCM ${newState ? 'ACTIVATED' : 'DEACTIVATED'} - ${newState ? 'Countering enemy ECM' : 'Vulnerable to jamming'}`, newState ? 'success' : 'info');
  renderPanel('sensor_operator');
}

/**
 * AR-208: Prepare ECM Reaction
 * Allows using ECM as a reaction when attacked (-2 to incoming attack)
 * @param {Object} state - Application state
 * @param {Function} renderPanel - Panel render function
 */
export function prepareECMReaction(state, renderPanel) {
  if (!state.shipState) state.shipState = {};

  // Toggle the reaction preparation
  const newState = !state.shipState.ecmReactionReady;
  state.shipState.ecmReactionReady = newState;
  state.socket.emit('ops:prepareECMReaction', { ready: newState });

  if (newState) {
    showNotification('ECM Reaction READY - Will apply -2 DM to next incoming attack', 'warning');
  } else {
    showNotification('ECM Reaction cancelled', 'info');
  }
  renderPanel('sensor_operator');
}

/**
 * Acquire sensor lock on contact
 * @param {Object} state - Application state
 * @param {Function} renderPanel - Panel render function
 * @param {string} contactId - Contact ID to lock
 */
export function acquireSensorLock(state, renderPanel, contactId) {
  const contact = state.contacts?.find(c => c.id === contactId);
  if (!contact) return;

  // Check if target has ECM active (breaks lock attempt)
  if (contact.ecmActive) {
    showNotification('Lock failed - target ECM active', 'danger');
    return;
  }

  state.socket.emit('ops:setSensorLock', { contactId, locked: true });
  if (!state.shipState) state.shipState = {};
  state.shipState.sensorLock = {
    targetId: contactId,
    targetName: contact.name || contact.transponder || `Contact ${contactId.slice(0,4)}`,
    lockedAt: Date.now()
  };
  showNotification(`SENSOR LOCK acquired on ${state.shipState.sensorLock.targetName} (+2 Attack DM)`, 'success');
  renderPanel('sensor_operator');
}

/**
 * Break current sensor lock
 * @param {Object} state - Application state
 * @param {Function} renderPanel - Panel render function
 */
export function breakSensorLock(state, renderPanel) {
  state.socket.emit('ops:setSensorLock', { contactId: null, locked: false });
  if (state.shipState) {
    state.shipState.sensorLock = null;
  }
  showNotification('Sensor lock released', 'info');
  renderPanel('sensor_operator');
}

/**
 * Toggle stealth mode
 * @param {Object} state - Application state
 * @param {Function} renderPanel - Panel render function
 */
export function toggleStealth(state, renderPanel) {
  const newState = !state.shipState?.stealth;
  state.socket.emit('ops:setEW', { type: 'stealth', active: newState });
  if (!state.shipState) state.shipState = {};
  state.shipState.stealth = newState;
  showNotification(`Stealth mode ${newState ? 'ENGAGED' : 'disengaged'} - ${newState ? 'Reduced sensor signature' : 'Normal signature'}`, newState ? 'warning' : 'info');
  renderPanel('sensor_operator');
}

/**
 * Set sensor lock on contact (alternative entry point)
 * @param {Object} state - Application state
 * @param {Function} renderPanel - Panel render function
 * @param {string} contactId - Contact ID to lock (null to break lock)
 */
export function setSensorLock(state, renderPanel, contactId) {
  if (contactId) {
    acquireSensorLock(state, renderPanel, contactId);
  } else {
    breakSensorLock(state, renderPanel);
  }
}

/**
 * Toggle sensor panel display mode
 * @param {Object} state - Application state
 * @param {Function} renderPanel - Panel render function
 * @param {string} mode - Panel mode (collapsed/expanded/combat)
 */
export function toggleSensorPanelMode(state, renderPanel, mode) {
  if (mode) {
    state.sensorPanelMode = mode;
  } else {
    // Cycle: collapsed → expanded → collapsed
    state.sensorPanelMode = state.sensorPanelMode === 'collapsed' ? 'expanded' : 'collapsed';
  }
  renderPanel('sensor_operator');
}

/**
 * Check for threats and auto-expand sensor panel
 * @param {Object} state - Application state
 * @param {Function} renderPanel - Panel render function
 */
export function checkSensorThreats(state, renderPanel) {
  const threats = state.contacts?.filter(c =>
    !c.celestial && (c.marking === 'hostile' || (c.type === 'Ship' && c.marking === 'unknown'))
  ) || [];

  if (threats.length > 0 && state.sensorPanelMode === 'collapsed') {
    state.sensorPanelMode = 'combat';
    renderPanel('sensor_operator');
    showNotification(`⚠ ${threats.length} potential threat(s) detected!`, 'danger');
  }
}

/**
 * Render mini radar canvas
 * @param {Array} contacts - Array of contacts
 * @param {number} range - Radar range in km
 */
export function renderMiniRadar(contacts, range = 50000) {
  const canvas = document.getElementById('sensor-mini-radar');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const scale = (w / 2 - 10) / range;

  // Clear and fill background
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, w, h);

  // Draw range rings
  ctx.strokeStyle = 'rgba(100, 150, 100, 0.3)';
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75, 1].forEach(r => {
    ctx.beginPath();
    ctx.arc(cx, cy, r * (w / 2 - 10), 0, Math.PI * 2);
    ctx.stroke();
  });

  // Draw crosshairs
  ctx.strokeStyle = 'rgba(100, 150, 100, 0.2)';
  ctx.beginPath();
  ctx.moveTo(cx, 5);
  ctx.lineTo(cx, h - 5);
  ctx.moveTo(5, cy);
  ctx.lineTo(w - 5, cy);
  ctx.stroke();

  // Draw ship at center (triangle pointing up)
  ctx.fillStyle = '#4a9';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx - 4, cy + 4);
  ctx.lineTo(cx + 4, cy + 4);
  ctx.closePath();
  ctx.fill();

  // Draw contacts
  contacts.forEach(c => {
    const angle = ((c.bearing || 0) - 90) * Math.PI / 180;  // -90 to put 0° at top
    const dist = Math.min(c.range_km || range, range);
    const x = cx + Math.cos(angle) * dist * scale;
    const y = cy + Math.sin(angle) * dist * scale;

    // Color by marking
    const colors = {
      friendly: '#4f4',
      hostile: '#f44',
      neutral: '#48f',
      unknown: '#ff4'
    };
    ctx.fillStyle = colors[c.marking] || '#ff4';

    // Draw contact dot
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw bearing line for hostile
    if (c.marking === 'hostile') {
      ctx.strokeStyle = 'rgba(255, 68, 68, 0.3)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  });

  // Draw range label
  ctx.fillStyle = 'rgba(150, 170, 150, 0.6)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${(range / 1000).toFixed(0)}k km`, cx, h - 4);
}
