/**
 * AR-201: Login Screen Handler
 *
 * Handles login screen initialization:
 * - GM/Player login selection
 * - Campaign code entry
 * - Solo Demo quick start
 * - Campaign import
 */

import { registerScreen } from './index.js';

function initLoginScreen(state, helpers) {
  const { showModal, showNotification } = helpers;

  // Restore saved campaign code from localStorage
  const savedCode = localStorage.getItem('ops_campaign_code');
  if (savedCode) {
    document.getElementById('campaign-code').value = savedCode;
  }

  // GM Login
  document.getElementById('btn-gm-login').addEventListener('click', () => {
    state.isGM = true;
    document.querySelector('.login-options').classList.add('hidden');
    document.getElementById('campaign-select').classList.remove('hidden');
    // AR-296: Campaigns response now includes feedback count
    state.socket.emit('ops:getCampaigns');
  });

  // Player Login
  document.getElementById('btn-player-login').addEventListener('click', () => {
    state.isGM = false;
    document.querySelector('.login-options').classList.add('hidden');
    document.getElementById('player-select').classList.remove('hidden');
    // Request campaign list to show join codes
    state.socket.emit('ops:getCampaigns');
  });

  // Handle campaign list for player join screen
  state.socket.on('ops:campaigns', (data) => {
    const codesList = document.getElementById('campaign-codes-list');
    if (!codesList) return;

    const campaigns = data.campaigns || [];
    if (campaigns.length === 0) {
      codesList.innerHTML = '<div style="color: #666;">No campaigns available</div>';
      return;
    }

    // Sort: Solo Demo first, then by name
    campaigns.sort((a, b) => {
      if (a.name.includes('Solo Demo')) return -1;
      if (b.name.includes('Solo Demo')) return 1;
      return a.name.localeCompare(b.name);
    });

    // Display each campaign with its join code (first 8 chars of ID)
    codesList.innerHTML = campaigns.map(c => {
      const code = c.id.substring(0, 8);
      const displayName = c.name.includes('Solo Demo') ? 'Solo Demo Campaign' :
                          c.name.includes('Spinward') ? 'Tuesday Spinward Marches Campaign' : c.name;
      return `<div style="margin: 4px 0;">
        <span style="color: var(--text-primary, #fff);">${displayName}:</span>
        <span style="color: var(--accent, #4ecdc4); cursor: pointer;"
              onclick="document.getElementById('campaign-code').value='${code}'"
              title="Click to use this code">${code}</span>
      </div>`;
    }).join('');
  });

  // AR-289: Solo Demo Campaign - Join pre-built demo campaign
  const btnSoloDemo = document.getElementById('btn-solo-demo');
  if (btnSoloDemo) {
    btnSoloDemo.addEventListener('click', () => {
      // Join the persistent solo demo campaign directly
      state.socket.emit('ops:joinSoloDemoCampaign');
    });
  }

  // Back buttons
  document.getElementById('btn-back-login').addEventListener('click', () => {
    document.getElementById('campaign-select').classList.add('hidden');
    document.querySelector('.login-options').classList.remove('hidden');
  });

  document.getElementById('btn-back-player').addEventListener('click', () => {
    document.getElementById('player-select').classList.add('hidden');
    document.querySelector('.login-options').classList.remove('hidden');
  });

  document.getElementById('btn-back-player-slot').addEventListener('click', () => {
    document.getElementById('player-slot-select').classList.add('hidden');
    document.getElementById('player-select').classList.remove('hidden');
  });

  // Create campaign
  document.getElementById('btn-create-campaign').addEventListener('click', () => {
    showModal('template-create-campaign');
  });

  // AR-21: Import campaign from JSON
  document.getElementById('btn-import-campaign').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });

  document.getElementById('import-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const campaignData = JSON.parse(event.target.result);
        const gmName = prompt('Enter GM name for imported campaign:', 'GM');
        if (gmName) {
          state.socket.emit('ops:importCampaign', { campaignData, gmName });
        }
      } catch (err) {
        showNotification('Invalid JSON file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset for re-import
  });

  // Join campaign (player)
  document.getElementById('btn-join-campaign').addEventListener('click', () => {
    const code = document.getElementById('campaign-code').value.trim();
    if (code) {
      // Save campaign code to localStorage for convenience
      localStorage.setItem('ops_campaign_code', code);
      state.socket.emit('ops:joinCampaignAsPlayer', { campaignId: code });
      document.getElementById('player-select').classList.add('hidden');
      document.getElementById('player-slot-select').classList.remove('hidden');
    }
  });

  // AR-58: ENTER hotkey for campaign code input
  document.getElementById('campaign-code')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      document.getElementById('btn-join-campaign').click();
    }
  });

}

registerScreen('login', initLoginScreen);

export { initLoginScreen };
