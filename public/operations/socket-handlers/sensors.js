/**
 * AR-201: Sensor Socket Handlers
 *
 * Handles sensor scan events:
 * - Contacts replaced (jump arrival)
 * - Scan results
 * - Targeted scan results
 */

import { registerHandler } from './index.js';

// ==================== Contact Updates ====================

function handleContactsReplaced(data, state, helpers) {
  state.contacts = data.contacts || [];
  helpers.showNotification(`Sensor contacts updated: ${state.contacts.length} objects detected`, 'info');
  helpers.renderRoleDetailPanel(state.selectedRole);
  helpers.renderCombatContactsList(); // Autorun 14
}

// ==================== Scan Results ====================

function handleScanResult(data, state, helpers) {
  helpers.handleScanResult(data);
}

function handleScanContactResult(data, state, helpers) {
  if (data.success) {
    // Update contact in state
    const idx = state.contacts.findIndex(c => c.id === data.contactId);
    if (idx >= 0 && data.contact) {
      state.contacts[idx] = data.contact;
    }
    helpers.renderContacts();
    helpers.renderRoleDetailPanel(state.selectedRole);
    // AR-70: Show roll details if available
    const rollInfo = data.roll ? ` (${data.roll.join('+')}=${data.total})` : '';
    helpers.showNotification(data.message + rollInfo || 'Scan complete', 'success');
  } else {
    // AR-70: Failed scan shows roll details
    const rollInfo = data.roll ? ` (Roll: ${data.roll.join('+')}=${data.total})` : '';
    helpers.showNotification(data.message + rollInfo || 'Scan inconclusive', 'warning');
  }
}

// ==================== Register All Handlers ====================

registerHandler('ops:contactsReplaced', handleContactsReplaced);
registerHandler('ops:scanResult', handleScanResult);
registerHandler('ops:scanContactResult', handleScanContactResult);

// Export for testing
export {
  handleContactsReplaced,
  handleScanResult,
  handleScanContactResult
};
