/**
 * Battle Console Module
 * Text-based combat interface for GM with ANSI-style rendering
 */

// Current selected role
let currentRole = null;

// Console state for role actions
const consoleState = {
  role: null,
  phase: null,
  evasive: false,
  targets: [],
  weapons: [],
  selectedTarget: null,
  selectedWeapon: 0
};

// Reference to keydown handler for cleanup
let keyHandler = null;

/**
 * Convert ANSI escape codes to HTML spans
 * @param {string} text - Text with ANSI codes
 * @returns {string} HTML with span classes
 */
export function ansiToHtml(text) {
  if (!text) return '';

  return text
    .replace(/\x1b\[1m/g, '<span class="ansi-bold">')
    .replace(/\x1b\[2m/g, '<span class="ansi-dim">')
    .replace(/\x1b\[31m/g, '<span class="ansi-red">')
    .replace(/\x1b\[32m/g, '<span class="ansi-green">')
    .replace(/\x1b\[33m/g, '<span class="ansi-yellow">')
    .replace(/\x1b\[34m/g, '<span class="ansi-blue">')
    .replace(/\x1b\[35m/g, '<span class="ansi-magenta">')
    .replace(/\x1b\[36m/g, '<span class="ansi-cyan">')
    .replace(/\x1b\[37m/g, '<span class="ansi-white">')
    .replace(/\x1b\[0m/g, '</span>')
    .replace(/\x1b\[\d+m/g, ''); // Remove any unhandled codes
}

/**
 * Render role picker buttons
 * @returns {string} HTML for role picker
 */
function renderRolePicker() {
  const roles = [
    { id: 'captain', label: 'Captain', icon: '👨‍✈️' },
    { id: 'pilot', label: 'Pilot', icon: '🎮' },
    { id: 'gunner', label: 'Gunner', icon: '🎯' },
    { id: 'engineer', label: 'Engineer', icon: '🔧' },
    { id: 'sensors', label: 'Sensors', icon: '📡' }
  ];

  return `
    <div class="role-picker">
      ${roles.map(role => `
        <button class="btn btn-role" data-role="${role.id}">
          <span class="role-icon">${role.icon}</span>
          <span class="role-label">${role.label}</span>
        </button>
      `).join('')}
    </div>
  `;
}

/**
 * Render console interface for a role
 * @param {string} role - Selected role id
 * @returns {string} HTML for console
 */
function renderConsole(role) {
  const roleLabels = {
    captain: 'CAPTAIN STATION',
    pilot: 'HELM CONTROL',
    gunner: 'WEAPONS STATION',
    engineer: 'ENGINEERING',
    sensors: 'SENSOR ARRAY'
  };

  return `
    <div class="console-container">
      <header class="console-header">
        <span class="console-title">${roleLabels[role] || 'BATTLE CONSOLE'}</span>
        <button class="btn btn-back" id="btn-console-back">← Back</button>
      </header>
      <div class="console-log" id="console-log">
        <div class="console-line ansi-dim">Awaiting combat data...</div>
      </div>
      <div class="console-prompt" id="console-prompt">
        <div class="prompt-label ansi-cyan">Ready for orders</div>
      </div>
    </div>
  `;
}

/**
 * Show battle console screen
 * @param {Object} state - Application state
 */
export function showBattleConsole(state) {
  const bridgeScreen = document.getElementById('bridge-screen');
  const consoleScreen = document.getElementById('battle-console-screen');

  if (bridgeScreen) bridgeScreen.style.display = 'none';
  if (consoleScreen) {
    consoleScreen.style.display = 'block';
    consoleScreen.innerHTML = renderRolePicker();

    // Add role picker event listeners
    consoleScreen.querySelectorAll('.btn-role').forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.dataset.role;
        currentRole = role;
        consoleState.role = role;
        consoleScreen.innerHTML = renderConsole(role);

        // Wire keydown handler for role actions
        if (keyHandler) {
          document.removeEventListener('keydown', keyHandler);
        }
        keyHandler = (e) => handleConsoleKey(e, state.socket);
        document.addEventListener('keydown', keyHandler);

        // Request targets for gunner
        if (role === 'gunner' && state.socket) {
          state.socket.emit('ops:getTargetableContacts');
        }

        // Add back button listener
        const backBtn = document.getElementById('btn-console-back');
        if (backBtn) {
          backBtn.addEventListener('click', () => {
            currentRole = null;
            consoleState.role = null;
            if (keyHandler) {
              document.removeEventListener('keydown', keyHandler);
              keyHandler = null;
            }
            consoleScreen.innerHTML = renderRolePicker();
            // Re-attach role picker listeners
            showBattleConsole(state);
          });
        }
      });
    });
  }
}

/**
 * Hide battle console, show bridge
 * @param {Object} state - Application state
 */
export function hideBattleConsole(state) {
  const bridgeScreen = document.getElementById('bridge-screen');
  const consoleScreen = document.getElementById('battle-console-screen');

  if (consoleScreen) consoleScreen.style.display = 'none';
  if (bridgeScreen) bridgeScreen.style.display = 'block';

  // Clean up keydown handler
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }

  currentRole = null;
  consoleState.role = null;
}

/**
 * Append narration text to console log
 * @param {string} text - Text to append (may contain ANSI codes)
 */
export function appendNarration(text) {
  const consoleLog = document.getElementById('console-log');
  if (!consoleLog) return;

  const line = document.createElement('div');
  line.className = 'console-line';
  line.innerHTML = ansiToHtml(text);
  consoleLog.appendChild(line);

  // Auto-scroll to bottom
  consoleLog.scrollTop = consoleLog.scrollHeight;
}

/**
 * Get current selected role
 * @returns {string|null} Current role id or null
 */
export function getCurrentRole() {
  return currentRole;
}

/**
 * Show turn prompt for role-specific actions
 * @param {string} role - Role this prompt is for ('pilot', 'gunner', 'all')
 * @param {string} message - Prompt message to display
 */
export function showTurnPrompt(role, message) {
  const consolePrompt = document.getElementById('console-prompt');
  if (!consolePrompt) return;

  // Only show if user's role matches or role is 'all'
  if (currentRole && role !== 'all' && role !== currentRole) {
    return;
  }

  // Highlight the prompt area
  consolePrompt.classList.add('prompt-active');
  consolePrompt.innerHTML = `
    <div class="prompt-role">${role.toUpperCase()}</div>
    <div class="prompt-message">${message}</div>
  `;

  // Remove highlight after a few seconds
  setTimeout(() => {
    consolePrompt.classList.remove('prompt-active');
  }, 5000);
}

/**
 * Handle keyboard input for role-specific actions
 * @param {KeyboardEvent} e - Keyboard event
 * @param {Object} socket - Socket.io socket
 */
export function handleConsoleKey(e, socket) {
  const key = e.key.toLowerCase();

  // Pilot: [E] toggle evasive
  if (consoleState.role === 'pilot' && key === 'e') {
    consoleState.evasive = !consoleState.evasive;
    socket.emit('ops:setEvasive', { enabled: consoleState.evasive });
    appendNarration(`Evasive: ${consoleState.evasive ? 'ON' : 'OFF'}`);
  }

  // Gunner: [1-9] select target, [F] fire
  if (consoleState.role === 'gunner') {
    if (key >= '1' && key <= '9') {
      const idx = parseInt(key) - 1;
      if (consoleState.targets[idx]) {
        consoleState.selectedTarget = consoleState.targets[idx].id;
        appendNarration(`Target locked: ${consoleState.targets[idx].name}`);
        renderTargetList();
      }
    }
    if (key === 'f' && consoleState.selectedTarget) {
      const weapon = consoleState.weapons[consoleState.selectedWeapon];
      if (weapon) {
        socket.emit('ops:fireWeapon', { weaponId: weapon.id, targetId: consoleState.selectedTarget });
        appendNarration(`Firing ${weapon.name}...`);
      } else {
        // Default weapon if none loaded
        socket.emit('ops:fireWeapon', { targetId: consoleState.selectedTarget });
        appendNarration('Firing...');
      }
    }
  }

  // Captain: [G/Y/R] set alert status
  if (consoleState.role === 'captain') {
    if (key === 'g') {
      socket.emit('ops:setAlertStatus', { alertStatus: 'NORMAL' });
      appendNarration('Alert status: NORMAL');
    }
    if (key === 'y') {
      socket.emit('ops:setAlertStatus', { alertStatus: 'YELLOW' });
      appendNarration('Alert status: YELLOW');
    }
    if (key === 'r') {
      socket.emit('ops:setAlertStatus', { alertStatus: 'RED' });
      appendNarration('Alert status: RED');
    }
  }
}

/**
 * Render target list for gunner
 */
function renderTargetList() {
  const promptArea = document.getElementById('console-prompt');
  if (!promptArea || consoleState.role !== 'gunner') return;

  let html = '<div class="target-list">';
  consoleState.targets.forEach((t, i) => {
    const selected = t.id === consoleState.selectedTarget ? ' selected' : '';
    html += `<div class="target${selected}">[${i + 1}] ${t.name} (${t.range_band || 'unknown'})</div>`;
  });
  html += '<div class="hint">[1-9] Select target, [F] Fire</div></div>';
  promptArea.innerHTML = html;
}

/**
 * Update console state with targets
 * @param {Array} contacts - Targetable contacts
 */
export function updateTargets(contacts) {
  consoleState.targets = contacts || [];
  if (consoleState.role === 'gunner') {
    renderTargetList();
  }
}

/**
 * Update console phase
 * @param {string} phase - Current combat phase
 */
export function updatePhase(phase) {
  consoleState.phase = phase;
}
