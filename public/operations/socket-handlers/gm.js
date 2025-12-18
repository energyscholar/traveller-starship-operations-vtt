/**
 * AR-201: GM Socket Handlers
 *
 * Handles GM-specific events:
 * - Roll modifiers
 */

import { registerHandler } from './index.js';

// ==================== GM Roll Modifiers ====================

function handleGMModifierSet(data, state, helpers) {
  state.gmModifier = data;
  const statusEl = document.getElementById('gm-modifier-status');
  if (statusEl) {
    const dmText = data.dm >= 0 ? `+${data.dm}` : data.dm;
    statusEl.textContent = `Active: ${dmText}${data.reason ? ` (${data.reason})` : ''}${data.persistent ? ' [persistent]' : ''}`;
    statusEl.classList.remove('hidden');
  }
  helpers.showNotification(`GM Modifier: ${data.dm >= 0 ? '+' : ''}${data.dm}${data.reason ? ` (${data.reason})` : ''}`, 'info');
}

function handleGMModifierCleared(data, state, helpers) {
  state.gmModifier = null;
  const statusEl = document.getElementById('gm-modifier-status');
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.classList.add('hidden');
  }
  helpers.showNotification('GM Modifier cleared', 'info');
}

function handleGMModifierState(data, state, helpers) {
  state.gmModifier = data;
  if (data) {
    const dmEl = document.getElementById('gm-modifier-dm');
    const reasonEl = document.getElementById('gm-modifier-reason');
    const persistentEl = document.getElementById('gm-modifier-persistent');
    if (dmEl) dmEl.value = data.dm;
    if (reasonEl) reasonEl.value = data.reason || '';
    if (persistentEl) persistentEl.checked = data.persistent;
    const statusEl = document.getElementById('gm-modifier-status');
    if (statusEl) {
      const dmText = data.dm >= 0 ? `+${data.dm}` : data.dm;
      statusEl.textContent = `Active: ${dmText}${data.reason ? ` (${data.reason})` : ''}`;
      statusEl.classList.remove('hidden');
    }
  }
}

// ==================== Register All Handlers ====================

registerHandler('ops:gmModifierSet', handleGMModifierSet);
registerHandler('ops:gmModifierCleared', handleGMModifierCleared);
registerHandler('ops:gmModifierState', handleGMModifierState);

// Export for testing
export {
  handleGMModifierSet,
  handleGMModifierCleared,
  handleGMModifierState
};
