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
        consoleScreen.innerHTML = renderConsole(role);

        // Add back button listener
        const backBtn = document.getElementById('btn-console-back');
        if (backBtn) {
          backBtn.addEventListener('click', () => {
            currentRole = null;
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

  currentRole = null;
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
