/**
 * AR-201: Bridge Screen Handler
 *
 * Handles bridge screen initialization:
 * - Ship status panels
 * - Sensor display controls
 * - Contact sort/filter
 * - Role panel expansion
 * - Keyboard shortcuts
 * - Menu handling
 * - Logout
 */

import { registerScreen } from './index.js';

function initBridgeScreen(state, helpers) {
  const {
    showModal, showScreen, showNotification, renderContacts, formatRoleName,
    initShipStatusPanel, initSystemMapLight, expandRolePanel, collapseRolePanel,
    toggleBrowserFullscreen, toggleShipSystemsPanel, hideShipSystemsPanel,
    collapseExpandedPanel, togglePanelExpand, showShipStatusModal,
    openHamburgerMenu, closeHamburgerMenu, handleMenuFeature,
    renderPlayerSetup, clearStoredSession, initGMControls, initPrepPanel,
    applyStatusIndicators, DEBUG
  } = helpers;

  // AR-164: Initialize Ship Status Panels
  // AR-289: Pass ship type for correct diagram
  const shipStatusContainer = document.getElementById('ship-status-panel');
  if (shipStatusContainer) {
    // Ship type can be in ship_data.type, template_data.type, or template_id
    const shipType = state.ship?.ship_data?.type ||
                     state.ship?.template_data?.type ||
                     state.ship?.template_id ||
                     state.ship?.type ||
                     'q_ship';
    console.log('[BridgeScreen] Ship panel init:', {
      shipName: state.ship?.name,
      shipDataType: state.ship?.ship_data?.type,
      templateDataType: state.ship?.template_data?.type,
      templateId: state.ship?.template_id,
      resolvedType: shipType
    });
    initShipStatusPanel(shipStatusContainer, shipType);
  }

  // NUCLEAR FIX: System Map Light replaces compact-viewscreen
  const viewscreenContainer = document.getElementById('compact-viewscreen');
  if (viewscreenContainer) {
    initSystemMapLight(viewscreenContainer);
  }

  // DEBUG: Monitor parent container of both panels - sends to server via socket
  const statusPanelsRow = document.getElementById('status-panels');
  if (statusPanelsRow) {
    const sendLog = (level, message, meta) => {
      console.warn(message, meta);
      if (state.socket) {
        state.socket.emit('client:log', { level, message, meta });
      }
    };

    statusPanelsRow.addEventListener('scroll', () => {
      sendLog('warn', '[BridgeScreen] STATUS PANELS ROW SCROLL', {
        scrollTop: statusPanelsRow.scrollTop,
        scrollLeft: statusPanelsRow.scrollLeft
      });
    });

    const parentMutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          sendLog('warn', '[BridgeScreen] STATUS PANELS ROW ATTR CHANGED', {
            attr: mutation.attributeName,
            value: statusPanelsRow.getAttribute(mutation.attributeName)
          });
        }
      }
    });
    parentMutationObserver.observe(statusPanelsRow, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    sendLog('info', '[BridgeScreen] Debug monitor installed on status-panels row', {});
  }

  // AR-164: Sensor panel toggle handlers
  document.getElementById('btn-show-sensors')?.addEventListener('click', () => {
    const statusPanels = document.getElementById('status-panels');
    const sensorPanel = document.getElementById('sensor-display');
    if (statusPanels) statusPanels.classList.add('hidden');
    if (sensorPanel) sensorPanel.classList.remove('sensor-panel-hidden');
  });

  document.getElementById('btn-hide-sensors')?.addEventListener('click', () => {
    const statusPanels = document.getElementById('status-panels');
    const sensorPanel = document.getElementById('sensor-display');
    if (statusPanels) statusPanels.classList.remove('hidden');
    if (sensorPanel) sensorPanel.classList.add('sensor-panel-hidden');
  });

  // AR-25: Contact sort/filter controls
  document.getElementById('contact-sort')?.addEventListener('change', (e) => {
    state.contactSort = e.target.value;
    localStorage.setItem('ops_contact_sort', state.contactSort);
    renderContacts();
  });

  document.getElementById('contact-filter')?.addEventListener('change', (e) => {
    state.contactFilter = e.target.value;
    localStorage.setItem('ops_contact_filter', state.contactFilter);
    renderContacts();
  });

  // Restore saved sort/filter preferences
  const savedSort = localStorage.getItem('ops_contact_sort');
  const savedFilter = localStorage.getItem('ops_contact_filter');
  if (savedSort) {
    state.contactSort = savedSort;
    const sortEl = document.getElementById('contact-sort');
    if (sortEl) sortEl.value = savedSort;
  }
  if (savedFilter) {
    state.contactFilter = savedFilter;
    const filterEl = document.getElementById('contact-filter');
    if (filterEl) filterEl.value = savedFilter;
  }

  // Toggle detail view
  document.getElementById('btn-toggle-detail').addEventListener('click', () => {
    const detail = document.getElementById('role-detail-view');
    const btn = document.getElementById('btn-toggle-detail');
    detail.classList.toggle('hidden');
    btn.textContent = detail.classList.contains('hidden') ? 'Show Details ▼' : 'Hide Details ▲';
  });

  // Expandable Role Panel Controls (Stage 13.3)
  document.getElementById('btn-expand-half')?.addEventListener('click', () => {
    expandRolePanel('half');
  });

  document.getElementById('btn-expand-full')?.addEventListener('click', () => {
    expandRolePanel('full');
  });

  document.getElementById('btn-collapse-panel')?.addEventListener('click', () => {
    collapseRolePanel();
  });

  // AR-15.9: Browser fullscreen toggle
  document.getElementById('btn-fullscreen')?.addEventListener('click', toggleBrowserFullscreen);

  // Ship Systems panel toggle
  document.getElementById('btn-ship-systems')?.addEventListener('click', toggleShipSystemsPanel);
  document.getElementById('btn-close-ship-systems')?.addEventListener('click', hideShipSystemsPanel);

  // Keyboard shortcuts for panel expansion
  document.addEventListener('keydown', (e) => {
    if (state.currentScreen !== 'bridge') return;
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    // Escape collapses any expanded panel
    if (e.key === 'Escape') {
      collapseRolePanel();
      collapseExpandedPanel();
    }

    // F key for fullscreen toggle
    if (e.key === 'f' || e.key === 'F') {
      const rolePanel = document.getElementById('role-panel');
      if (rolePanel.classList.contains('expanded-full')) {
        collapseRolePanel();
      } else {
        expandRolePanel('full');
      }
    }

    // Number keys 1-4 toggle panel expansion
    const panelKeys = { '1': 'sensor-display', '2': 'role-panel', '3': 'crew-panel', '4': 'log-panel' };
    if (panelKeys[e.key]) {
      togglePanelExpand(panelKeys[e.key]);
    }

    // AR-150: 'u' key toggles UI status indicators (dev mode only)
    if ((e.key === 'u' || e.key === 'U') && DEBUG) {
      const isVisible = document.body.classList.toggle('show-ui-status');
      showNotification(`UI Status Indicators: ${isVisible ? 'ON' : 'OFF'}`, 'info');
      if (isVisible) applyStatusIndicators();
    }

    // AR-189: Role action hotkeys
    const roleHotkeys = {
      'p': () => document.querySelector('[onclick*="plotJumpCourse"]')?.click(),
      'c': () => document.querySelector('#btn-set-course, [onclick*="showPlacesOverlay"]')?.click(),
      't': () => document.querySelector('#btn-travel')?.click(),
      'r': () => document.querySelector('[onclick*="attemptRepair"]')?.click()
    };
    const key = e.key.toLowerCase();
    if (roleHotkeys[key] && !e.ctrlKey && !e.altKey && !e.metaKey) {
      roleHotkeys[key]();
      e.preventDefault();
    }
  });

  // Panel expand button click handlers
  document.querySelectorAll('.btn-panel-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const panelId = btn.dataset.panel;
      togglePanelExpand(panelId);
    });
  });

  // Add log note
  document.getElementById('btn-add-log').addEventListener('click', () => {
    const note = prompt('Log entry:');
    if (note) {
      state.socket.emit('ops:addLogEntry', {
        shipId: state.ship.id,
        message: note,
        entryType: 'manual'
      });
    }
  });

  // TIP-2: Click ship name to show status modal
  document.getElementById('bridge-ship-name').addEventListener('click', showShipStatusModal);
  document.getElementById('bridge-ship-name').style.cursor = 'pointer';

  // Menu button - show hamburger menu (Autorun 6)
  document.getElementById('btn-bridge-menu').addEventListener('click', () => {
    openHamburgerMenu();
  });

  // Close hamburger menu
  document.getElementById('btn-close-menu')?.addEventListener('click', closeHamburgerMenu);
  document.getElementById('hamburger-menu-overlay')?.addEventListener('click', closeHamburgerMenu);

  // Hamburger menu item clicks
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const feature = item.dataset.feature;
      handleMenuFeature(feature);
    });
  });

  // Change role button (NAV-1)
  document.getElementById('btn-change-role').addEventListener('click', () => {
    if (state.isGM) {
      showNotification('GMs cannot change roles', 'info');
      return;
    }
    // Return to player setup screen for role selection
    state.selectedRole = null;
    document.getElementById('gm-overlay')?.classList.add('hidden');
    showScreen('player-setup');
    renderPlayerSetup();
  });

  // NAV-4: Leave role (go off-duty)
  document.getElementById('btn-leave-role').addEventListener('click', () => {
    if (state.isGM) {
      showNotification('GMs cannot leave roles', 'info');
      return;
    }
    if (!state.selectedRole) {
      showNotification('No role assigned', 'info');
      return;
    }
    // Confirm before leaving
    if (confirm(`Leave ${formatRoleName(state.selectedRole)} station? NPC will take over.`)) {
      state.socket.emit('ops:leaveRole');
    }
  });

  // Stage 2: Edit role personality (quirk/title)
  document.getElementById('btn-edit-role-personality').addEventListener('click', () => {
    if (!state.selectedRole || state.selectedRole === 'observer') {
      showNotification('No role to customize', 'info');
      return;
    }
    showModal('template-edit-role-personality');
  });

  // Bridge logout
  document.getElementById('btn-bridge-logout').addEventListener('click', () => {
    // AR-132: Release slot reservation on server before clearing local state
    state.socket.emit('ops:releaseSlot');
    // Reset all state
    state.ship = null;
    state.selectedShipId = null;
    state.selectedRole = null;
    state.player = null;
    state.campaign = null;
    state.isGM = false;
    state.isGuest = false;
    clearStoredSession();
    // Hide GM overlay if visible
    document.getElementById('gm-overlay')?.classList.add('hidden');
    showScreen('login');
  });

  // GM controls
  initGMControls();

  // AUTORUN-8: GM Prep Panel
  initPrepPanel();
}

registerScreen('bridge', initBridgeScreen);

export { initBridgeScreen };
