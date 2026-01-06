/**
 * AR-250: Observer Role State
 *
 * Pure state extraction for observer panel.
 * Observer aggregates other role states for read-only viewing.
 *
 * @module lib/engine/roles/observer-state
 */

const { getPilotState } = require('./pilot-state');
const { getEngineerState } = require('./engineer-state');
const { getAstrogatorState } = require('./astrogator-state');
const { getSensorsState } = require('./sensors-state');
const { getCaptainState } = require('./captain-state');
const { getGunnerState } = require('./gunner-state');

/**
 * Available roles to observe
 */
const OBSERVABLE_ROLES = [
  { id: 'pilot', name: 'Pilot' },
  { id: 'astrogator', name: 'Astrogator' },
  { id: 'engineer', name: 'Engineer' },
  { id: 'sensor_operator', name: 'Sensors' },
  { id: 'captain', name: 'Captain' },
  { id: 'gunner', name: 'Gunner' },
  { id: 'comms', name: 'Comms' }
];

/**
 * Get complete observer panel state
 * @param {string} watchRole - Role being observed
 * @param {object} context - Full context for role state
 * @returns {object} Pure state object
 */
function getObserverState(watchRole = 'pilot', context = {}) {
  const roleInfo = OBSERVABLE_ROLES.find(r => r.id === watchRole) || OBSERVABLE_ROLES[0];

  return {
    watchRole: roleInfo.id,
    watchRoleName: roleInfo.name,
    availableRoles: OBSERVABLE_ROLES,
    watchedState: getWatchedRoleState(roleInfo.id, context),
    isReadOnly: true
  };
}

/**
 * Get state for the currently watched role
 * @param {string} roleId - Role identifier
 * @param {object} context - Context with all necessary data
 * @returns {object|null} Role state or null if unavailable
 */
function getWatchedRoleState(roleId, context) {
  const {
    shipState = {},
    template = {},
    campaign = {},
    jumpStatus = {},
    contacts = [],
    systemStatus = {},
    damagedSystems = [],
    fuelStatus = {},
    repairQueue = [],
    crewOnline = [],
    shipWeapons = [],
    flightConditions = null,
    environmentalData = null
  } = context;

  try {
    switch (roleId) {
      case 'pilot':
        return getPilotState(shipState, template, campaign, jumpStatus, flightConditions);

      case 'astrogator':
        return getAstrogatorState(shipState, template, jumpStatus, campaign, systemStatus);

      case 'engineer':
        return getEngineerState(shipState, template, systemStatus, damagedSystems, fuelStatus, repairQueue);

      case 'sensor_operator':
        return getSensorsState(shipState, contacts, environmentalData);

      case 'captain':
        return getCaptainState(shipState, template, {}, crewOnline, contacts);

      case 'gunner':
        return getGunnerState(shipState, template, contacts, 1, shipWeapons);

      case 'comms':
        // Comms state not yet implemented - return basic
        return {
          channels: [],
          messages: [],
          hasMessages: false
        };

      default:
        return null;
    }
  } catch (err) {
    // Return error state if role state fails
    return {
      error: true,
      errorMessage: err.message,
      roleId
    };
  }
}

/**
 * Get basic ship info for fallback display
 * @param {object} shipState
 * @param {object} template
 * @param {object} campaign
 * @returns {object}
 */
function getBasicObserverInfo(shipState, template, campaign) {
  return {
    shipName: template?.name || 'Unknown Ship',
    location: shipState?.locationName || campaign?.current_system || 'Unknown',
    alertStatus: shipState?.alertStatus || 'NORMAL',
    fuel: shipState?.fuel ?? template?.fuel ?? 0,
    hull: shipState?.hull ?? template?.hull ?? 0
  };
}

module.exports = {
  getObserverState,
  getWatchedRoleState,
  getBasicObserverInfo,
  OBSERVABLE_ROLES
};
