/**
 * AR-201: Player Setup Screen Handler
 *
 * Handles player setup screen initialization:
 * - Character import
 * - Quick character creation
 * - Bridge join
 * - Logout
 */

import { registerScreen } from './index.js';

function initPlayerSetupScreen(state, helpers) {
  const { showModal, showScreen, clearStoredSession } = helpers;

  // Import character
  document.getElementById('btn-import-character').addEventListener('click', () => {
    showModal('template-character-import');
  });

  // Quick character (minimal)
  document.getElementById('btn-quick-character').addEventListener('click', () => {
    const name = prompt('Character name:');
    if (name) {
      state.socket.emit('ops:importCharacter', {
        playerId: state.player.id,
        character: { name, skills: {}, stats: {} }
      });
    }
  });

  // Join bridge
  document.getElementById('btn-join-bridge').addEventListener('click', () => {
    if (state.selectedShipId && state.selectedRole) {
      state.socket.emit('ops:joinBridge', {
        playerId: state.player.id,
        shipId: state.selectedShipId,
        role: state.selectedRole
      });
    }
  });

  // Logout
  document.getElementById('btn-player-logout').addEventListener('click', () => {
    // AR-132: Release slot reservation on server before clearing local state
    state.socket.emit('ops:releaseSlot');
    state.player = null;
    clearStoredSession();
    showScreen('login');
    document.getElementById('player-slot-select').classList.add('hidden');
    document.getElementById('player-select').classList.add('hidden');
    document.querySelector('.login-options').classList.remove('hidden');
  });
}

registerScreen('player-setup', initPlayerSetupScreen);

export { initPlayerSetupScreen };
