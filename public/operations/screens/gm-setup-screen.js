/**
 * AR-201: GM Setup Screen Handler
 *
 * Handles GM setup screen initialization:
 * - Campaign code copy
 * - Player slot management
 * - Ship management
 * - Campaign settings
 * - Session start
 */

import { registerScreen } from './index.js';

function initGMSetupScreen(state, helpers) {
  const { showModal, showScreen, copyWithFeedback, openShipEditor, clearStoredSession } = helpers;

  // Copy campaign code button
  document.getElementById('btn-copy-code').addEventListener('click', () => {
    const codeEl = document.getElementById('campaign-code-value');
    const code = codeEl.textContent;
    if (code && code !== '--------') {
      copyWithFeedback(code, 'btn-copy-code');
    }
  });

  // Add player slot
  document.getElementById('btn-add-player-slot').addEventListener('click', () => {
    const name = document.getElementById('new-slot-name').value.trim();
    if (name) {
      state.socket.emit('ops:createPlayerSlot', {
        campaignId: state.campaign.id,
        slotName: name
      });
      document.getElementById('new-slot-name').value = '';
    }
  });

  // Add ship
  document.getElementById('btn-add-ship').addEventListener('click', () => {
    state.socket.emit('ops:getShipTemplates');
    showModal('template-add-ship');
  });

  // Custom ship (AR-17)
  document.getElementById('btn-custom-ship').addEventListener('click', () => {
    openShipEditor(null); // null = new ship
  });

  // Campaign settings
  document.getElementById('campaign-date').addEventListener('change', (e) => {
    state.socket.emit('ops:updateCampaign', {
      campaignId: state.campaign.id,
      current_date: e.target.value
    });
  });

  document.getElementById('campaign-system').addEventListener('change', (e) => {
    state.socket.emit('ops:updateCampaign', {
      campaignId: state.campaign.id,
      current_system: e.target.value
    });
  });

  document.getElementById('god-mode-toggle').addEventListener('change', (e) => {
    state.socket.emit('ops:updateCampaign', {
      campaignId: state.campaign.id,
      god_mode: e.target.checked ? 1 : 0
    });
  });

  // AR-124: Position verification toggle
  document.getElementById('position-verify-toggle').addEventListener('change', (e) => {
    state.socket.emit('ops:setRequirePositionVerification', { enabled: e.target.checked });
  });

  // AR-186: GM Roll Modifier
  document.getElementById('btn-gm-modifier-apply').addEventListener('click', () => {
    const dm = parseInt(document.getElementById('gm-modifier-dm').value) || 0;
    const reason = document.getElementById('gm-modifier-reason').value || '';
    const persistent = document.getElementById('gm-modifier-persistent').checked;
    state.socket.emit('ops:setGmModifier', { dm, reason, persistent });
  });

  document.getElementById('btn-gm-modifier-clear').addEventListener('click', () => {
    state.socket.emit('ops:clearGmModifier');
    document.getElementById('gm-modifier-dm').value = '';
    document.getElementById('gm-modifier-reason').value = '';
    document.getElementById('gm-modifier-persistent').checked = false;
  });

  // Start session
  document.getElementById('btn-start-session').addEventListener('click', () => {
    state.socket.emit('ops:startSession', { campaignId: state.campaign.id });
  });

  // Logout
  document.getElementById('btn-gm-logout').addEventListener('click', () => {
    state.campaign = null;
    state.isGM = false;
    clearStoredSession();
    showScreen('login');
    document.getElementById('campaign-select').classList.add('hidden');
    document.querySelector('.login-options').classList.remove('hidden');
  });
}

registerScreen('gm-setup', initGMSetupScreen);

export { initGMSetupScreen };
