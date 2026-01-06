/**
 * Role Panels Module
 * Generates role-specific detail panel HTML for Operations VTT
 *
 * AR-204: Refactored to use per-role modules in role-panels/ directory
 */

import { escapeHtml, formatRoleName, formatSystemName } from './utils.js';

// Import all panel functions from extracted modules
import {
  renderSystemStatusItem,
  getSystemTooltip,
  getPilotPanel,
  getEngineerPanel,
  getGunnerPanel,
  getCaptainPanel,
  getSensorOperatorPanel,
  getAstrogatorPanel,
  getDamageControlPanel,
  getMedicPanel,
  getMarinesPanel,
  getCommsPanel,
  getStewardPanel,
  getObserverPanel,
  getRoleDetailContent
} from './role-panels/index.js';

/**
 * Action log messages for each role action
 */
export const ROLE_ACTION_MESSAGES = {
  // Pilot
  setCourse: (name) => `${name} plotting new course`,
  evasiveAction: (name) => `${name} initiating evasive maneuvers`,
  dock: (name) => `${name} beginning docking sequence`,
  undock: (name) => `${name} releasing docking clamps`,
  // Captain - actions removed (served no purpose)
  // Astrogator
  plotJump: (name) => `${name} calculating jump coordinates`,
  calculateIntercept: (name) => `${name} plotting intercept course`,
  verifyPosition: (name) => `${name} confirming current position`,
  // Engineer
  allocatePower: (name) => `${name} reallocating power grid`,
  fieldRepair: (name) => `${name} performing field repairs`,
  overloadSystem: (name) => `${name} overloading system capacitors`,
  // Sensors
  activeScan: (name) => `${name} initiating active sensor sweep`,
  deepScan: (name) => `${name} performing deep scan analysis`,
  jam: (name) => `${name} activating electronic countermeasures`,
  // Gunner
  fireWeapon: (name) => `${name} firing weapons`,
  pointDefense: (name) => `${name} activating point defense`,
  sandcaster: (name) => `${name} deploying sandcaster screen`,
  // Damage Control
  directRepair: (name) => `${name} directing repair teams`,
  prioritizeSystem: (name) => `${name} prioritizing system repairs`,
  emergencyProcedure: (name) => `${name} executing emergency procedure`,
  // Marines
  securityPatrol: (name) => `${name} initiating security patrol`,
  prepareBoarding: (name) => `${name} preparing boarding party`,
  repelBoarders: (name) => `${name} coordinating defense against boarders`,
  // Medic
  treatInjury: (name) => `${name} treating injured crew member`,
  triage: (name) => `${name} performing triage assessment`,
  checkSupplies: (name) => `${name} checking medical supplies`,
  // Steward
  attendPassenger: (name) => `${name} attending to passengers`,
  boostMorale: (name) => `${name} boosting crew morale`,
  // Cargo
  checkManifest: (name) => `${name} reviewing cargo manifest`,
  loadCargo: (name) => `${name} supervising cargo loading`,
  unloadCargo: (name) => `${name} coordinating cargo unloading`
};

/**
 * Get action log message for a role action
 * @param {string} action - Action identifier
 * @param {string} playerName - Player name
 * @param {string} roleName - Role name for fallback
 * @returns {string} Log message
 */
export function getActionMessage(action, playerName, roleName) {
  const messageFn = ROLE_ACTION_MESSAGES[action];
  if (messageFn) {
    return messageFn(playerName);
  }
  return `${playerName} (${roleName}): ${action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`;
}

// Re-export all panel functions for backwards compatibility
export {
  renderSystemStatusItem,
  getSystemTooltip,
  getPilotPanel,
  getEngineerPanel,
  getGunnerPanel,
  getCaptainPanel,
  getSensorOperatorPanel,
  getAstrogatorPanel,
  getDamageControlPanel,
  getMedicPanel,
  getMarinesPanel,
  getCommsPanel,
  getStewardPanel,
  getObserverPanel,
  getRoleDetailContent
};
