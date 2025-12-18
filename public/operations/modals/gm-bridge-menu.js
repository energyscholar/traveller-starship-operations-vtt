/**
 * AR-201: GM Bridge Menu Modal Handler
 *
 * Handles God mode controls, ship state editing, contact management.
 */

import { registerModalHandler } from './index.js';

function setupGMBridgeMenuModal(modal, state, helpers) {
  const { showNotification } = helpers;

  // Copy campaign code
  document.getElementById('btn-gm-copy-code').addEventListener('click', () => {
    const codeEl = document.getElementById('gm-menu-campaign-code');
    const code = codeEl?.textContent;
    if (code && code !== '--------') {
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('btn-gm-copy-code');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('btn-copy-success');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('btn-copy-success');
        }, 2000);
      }).catch(() => {
        showNotification('Failed to copy code', 'error');
      });
    }
  });

  // GM-3: God Mode Handlers
  // Populate current ship values
  if (state.ship?.current_state) {
    const cs = state.ship.current_state;
    document.getElementById('god-ship-hull').value = cs.hullPoints || 0;
    document.getElementById('god-ship-fuel').value = cs.fuel || 0;
    document.getElementById('god-ship-power').value = cs.power || 100;
    document.getElementById('god-ship-alert').value = cs.alertStatus || 'NORMAL';
  }

  // Apply Ship Changes
  document.getElementById('btn-god-apply-ship').addEventListener('click', () => {
    const updates = {
      hullPoints: parseInt(document.getElementById('god-ship-hull').value) || 0,
      fuel: parseInt(document.getElementById('god-ship-fuel').value) || 0,
      power: parseInt(document.getElementById('god-ship-power').value) || 100,
      alertStatus: document.getElementById('god-ship-alert').value
    };
    state.socket.emit('ops:godModeUpdateShip', {
      shipId: state.ship?.id,
      updates
    });
    showNotification('Ship state updated', 'success');
  });

  // Add Contact
  document.getElementById('btn-god-add-contact').addEventListener('click', () => {
    const name = document.getElementById('god-contact-name').value || 'Unknown Contact';
    const type = document.getElementById('god-contact-type').value;
    const range = parseInt(document.getElementById('god-contact-range').value) || 50000;
    const bearing = parseInt(document.getElementById('god-contact-bearing').value) || 0;
    state.socket.emit('ops:godModeAddContact', {
      campaignId: state.campaign?.id,
      contact: { name, type, range_km: range, bearing, visible_to: 'all', signature: 'normal' }
    });
    document.getElementById('god-contact-name').value = '';
    showNotification('Contact added', 'success');
  });

  // Quick Commands
  document.getElementById('btn-god-repair-all').addEventListener('click', () => {
    state.socket.emit('ops:godModeRepairAll', { shipId: state.ship?.id });
    showNotification('All systems repaired', 'success');
  });

  document.getElementById('btn-god-refuel').addEventListener('click', () => {
    state.socket.emit('ops:godModeRefuel', { shipId: state.ship?.id });
    showNotification('Ship fully refueled', 'success');
  });

  document.getElementById('btn-god-clear-contacts').addEventListener('click', () => {
    if (confirm('Clear all contacts?')) {
      state.socket.emit('ops:godModeClearContacts', { campaignId: state.campaign?.id });
      showNotification('All contacts cleared', 'success');
    }
  });

  // AR-194: Break System
  document.getElementById('btn-god-break-system').addEventListener('click', () => {
    const system = document.getElementById('god-break-system').value;
    const severityStr = document.getElementById('god-break-severity').value;
    const severity = severityStr ? parseInt(severityStr, 10) : null;
    state.socket.emit('ops:breakSystem', {
      shipId: state.ship?.id,
      system,
      severity
    });
  });
}

registerModalHandler('template-gm-bridge-menu', setupGMBridgeMenuModal);

export { setupGMBridgeMenuModal };
