/**
 * AR-201 Phase 4: Renderer Registry
 *
 * Central exports for all renderer functions.
 * Renderers update DOM based on state changes.
 */

import {
  initBridgeRenderers,
  renderBridge,
  renderShipStatus,
  renderRoleActions,
  renderObserverPanel,
  renderRoleDetailPanel,
  handleRoleAction,
  renderCrewList,
  relieveCrewMember,
  gmAssignRole,
  renderContacts,
  updateRoleQuirkDisplay,
  initGMControls
} from './bridge-renderers.js';

import {
  initSetupRenderers,
  renderGMSetup,
  renderPlayerSetup,
  renderRoleSelection,
  renderPlayerSlots,
  renderQuickLocations
} from './setup-renderers.js';

import {
  initCampaignRenderers,
  renderCampaignList,
  showDeleteCampaignModal
} from './campaign-renderers.js';

/**
 * Initialize all renderers with state and helpers
 */
export function initRenderers(state, helpers) {
  initBridgeRenderers(state, helpers);
  initSetupRenderers(state, helpers);
  initCampaignRenderers(state, helpers);
}

// Re-export all renderers
export {
  // Bridge renderers
  renderBridge,
  renderShipStatus,
  renderRoleActions,
  renderObserverPanel,
  renderRoleDetailPanel,
  handleRoleAction,
  renderCrewList,
  relieveCrewMember,
  gmAssignRole,
  renderContacts,
  updateRoleQuirkDisplay,
  initGMControls,
  // Setup renderers
  renderGMSetup,
  renderPlayerSetup,
  renderRoleSelection,
  renderPlayerSlots,
  renderQuickLocations,
  // Campaign renderers
  renderCampaignList,
  showDeleteCampaignModal
};
