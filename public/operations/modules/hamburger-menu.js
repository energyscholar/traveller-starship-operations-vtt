/**
 * AR-151-8a: Hamburger Menu Module
 * Autorun 6: Side menu with feature navigation
 */

import { escapeHtml } from './utils.js';

/**
 * Open hamburger menu
 */
export function openHamburgerMenu() {
  const menu = document.getElementById('hamburger-menu');
  const overlay = document.getElementById('hamburger-menu-overlay');
  if (menu) {
    menu.classList.add('open');
    overlay?.classList.remove('hidden');
    overlay?.classList.add('visible');

    // Initialize settings from localStorage
    const animateCameraCheckbox = document.getElementById('setting-animate-camera');
    if (animateCameraCheckbox) {
      animateCameraCheckbox.checked = localStorage.getItem('ops-setting-animate-camera') !== 'false';
      animateCameraCheckbox.onchange = (e) => {
        localStorage.setItem('ops-setting-animate-camera', e.target.checked ? 'true' : 'false');
      };
    }

    // Show GM section only for GMs (uses window.state from app.js)
    const gmSection = document.getElementById('menu-section-gm');
    if (gmSection && typeof window.state !== 'undefined') {
      gmSection.style.display = window.state.isGM ? 'block' : 'none';
    }
  }
}

/**
 * Close hamburger menu
 */
export function closeHamburgerMenu() {
  const menu = document.getElementById('hamburger-menu');
  const overlay = document.getElementById('hamburger-menu-overlay');
  if (menu) {
    menu.classList.remove('open');
    overlay?.classList.add('hidden');
    overlay?.classList.remove('visible');
  }
}

/**
 * Handle menu feature selection
 * @param {Object} state - Application state
 * @param {Object} handlers - Feature handler functions
 * @param {string} feature - Selected feature
 */
export function handleMenuFeature(state, handlers, feature) {
  closeHamburgerMenu();

  switch (feature) {
    case 'ship-log':
      if (state.logs && state.logs.length > 0) {
        handlers.showLogModal();
      } else {
        handlers.showNotification('No log entries yet', 'info');
      }
      break;

    case 'mail':
      state.socket.emit('ops:getMail');
      handlers.showNotification('Loading mail...', 'info');
      break;

    case 'contacts':
      state.socket.emit('ops:getNPCContacts');
      handlers.showNotification('Loading contacts...', 'info');
      break;

    case 'ship-config':
      handlers.showNotification('Ship Configuration - Planned for Autorun 7', 'info');
      break;

    case 'cargo':
      handlers.showNotification('Cargo Manifest - Planned feature', 'info');
      break;

    case 'finances':
      handlers.showNotification('Ship Finances - Planned feature', 'info');
      break;

    case 'crew-roster':
      handlers.showCrewRoster();
      break;

    case 'medical':
      handlers.showMedicalRecords();
      break;

    case 'library':
      handlers.showNotification('Ship\'s Library - Planned feature', 'info');
      break;

    case 'feedback':
      if (state.isGM) {
        handlers.showFeedbackReview();
      } else {
        handlers.showFeedbackForm();
      }
      break;

    case 'shared-map':
      handlers.showSharedMap();
      break;

    case 'system-map':
      handlers.showSystemMap();
      break;

    case 'enter-combat':
      if (state.isGM) {
        const targets = (state.contacts || []).filter(c => c.is_targetable !== false).map(c => c.id);
        state.socket.emit('ops:enterCombat', { selectedContacts: targets });
        handlers.showNotification('Entering combat...', 'info');
      }
      break;

    case 'load-drill':
      if (state.isGM) {
        state.socket.emit('ops:getAvailableDrills');
        handlers.showNotification('Loading drills...', 'info');
      }
      break;

    case 'battle-console':
      if (state.isGM) {
        handlers.showBattleConsole();
      }
      break;

    default:
      handlers.showNotification(`Feature "${feature}" not yet implemented`, 'info');
  }
}

/**
 * Show ship log modal
 * @param {Object} state - Application state
 */
export function showLogModal(state) {
  const logs = state.logs || [];
  const recentLogs = logs.slice(-50); // Show last 50 entries

  let html = `
    <div class="modal-header">
      <h2>Ship Log</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body log-modal-body">
      <div class="log-entries">
  `;

  if (recentLogs.length === 0) {
    html += '<p class="text-muted">No log entries recorded.</p>';
  } else {
    for (const log of recentLogs.reverse()) {
      const typeClass = log.entry_type === 'sensor' ? 'sensor' :
                       log.entry_type === 'combat' ? 'combat' :
                       log.entry_type === 'navigation' ? 'navigation' : '';
      html += `
        <div class="log-entry ${typeClass}">
          <span class="log-timestamp">${log.game_date || ''} ${log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span>
          <span class="log-type">[${log.entry_type || 'system'}]</span>
          <span class="log-message">${log.message}</span>
          ${log.actor ? `<span class="log-actor">- ${log.actor}</span>` : ''}
        </div>
      `;
    }
  }

  html += `
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close-modal>Close</button>
    </div>
  `;

  const modalContent = document.getElementById('modal-content');
  const modalOverlay = document.getElementById('modal-overlay');
  modalContent.innerHTML = html;
  modalOverlay.classList.remove('hidden');

  // Setup close handlers
  modalContent.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => modalOverlay.classList.add('hidden'));
  });
}
