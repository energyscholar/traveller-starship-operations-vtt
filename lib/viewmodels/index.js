/**
 * ViewModel Factory
 * Central facade for creating role ViewModels.
 *
 * Usage:
 *   const { createRoleViewModel } = require('./viewmodels');
 *   const vm = createRoleViewModel('pilot', context);
 *
 * @module lib/viewmodels/index
 */

const { createPilotViewModel } = require('./role-viewmodels/pilot-viewmodel');
const { createEngineerViewModel } = require('./role-viewmodels/engineer-viewmodel');
const { createGunnerViewModel } = require('./role-viewmodels/gunner-viewmodel');
const { createCaptainViewModel } = require('./role-viewmodels/captain-viewmodel');
const { createSensorsViewModel } = require('./role-viewmodels/sensors-viewmodel');
const { createAstrogatorViewModel } = require('./role-viewmodels/astrogator-viewmodel');
const { createDamageControlViewModel } = require('./role-viewmodels/damage-control-viewmodel');
const { createObserverViewModel } = require('./role-viewmodels/observer-viewmodel');
const { createViewModel } = require('./base-viewmodel');

/**
 * Create a role-specific ViewModel
 * @param {string} role - Role identifier
 * @param {object} context - Context object with ship, campaign, contacts, etc.
 * @returns {object} ViewModel or null if role not supported
 */
function createRoleViewModel(role, context = {}) {
  const {
    shipState = {},
    template = {},
    campaign = {},
    jumpStatus = {},
    ship = {},
    contacts = [],
    crewOnline = [],
    systemStatus = {},
    damagedSystems = [],
    fuelStatus = {},
    repairQueue = [],
    roleInstance = 1,
    shipWeapons = [],
    activeFires = [],
    breaches = [],
    environmentalData = null,
    flightConditions = null,
    pendingTravel = null,
    rescueTargets = [],
    activePanel = 'captain',
    watchRole = 'pilot'
  } = context;

  switch (role) {
    case 'pilot':
      return createPilotViewModel(shipState, template, campaign, jumpStatus, flightConditions, pendingTravel);

    case 'engineer':
      return createEngineerViewModel(shipState, template, systemStatus, damagedSystems, fuelStatus, repairQueue);

    case 'gunner':
      return createGunnerViewModel(shipState, template, contacts, roleInstance, shipWeapons);

    case 'captain':
      return createCaptainViewModel(shipState, template, ship, crewOnline, contacts, rescueTargets, activePanel);

    case 'sensors':
      return createSensorsViewModel(shipState, contacts, environmentalData);

    case 'astrogator':
      return createAstrogatorViewModel(shipState, template, jumpStatus, campaign, systemStatus);

    case 'damage-control':
      return createDamageControlViewModel(shipState, template, damagedSystems, activeFires, breaches);

    case 'observer':
      return createObserverViewModel(watchRole, context);

    case 'gm':
      // GM sees captain view by default
      return createCaptainViewModel(shipState, template, ship, crewOnline, contacts, rescueTargets, 'gm');

    // Placeholder ViewModels for roles without dedicated state modules
    case 'comms':
      return createViewModel('comms', { shipState }, {
        statusBadge: 'STANDBY',
        statusClass: 'standby',
        channelText: 'Standard Comm',
        messageCountText: '0 pending'
      }, {
        hail: { enabled: true, reason: null },
        broadcast: { enabled: true, reason: null }
      });

    case 'medic':
      return createViewModel('medic', { shipState }, {
        statusBadge: 'ON CALL',
        statusClass: 'on-call',
        patientCountText: '0 patients',
        suppliesText: 'Adequate'
      }, {
        treatPatient: { enabled: false, reason: 'No patients' },
        checkSupplies: { enabled: true, reason: null }
      });

    case 'marines':
      return createViewModel('marines', { shipState }, {
        statusBadge: 'READY',
        statusClass: 'ready',
        squadStatusText: 'All units ready',
        armorText: 'Combat'
      }, {
        deploy: { enabled: false, reason: 'No boarding action' },
        drill: { enabled: true, reason: null }
      });

    case 'steward':
      return createViewModel('steward', { shipState }, {
        statusBadge: 'ACTIVE',
        statusClass: 'active',
        passengerCountText: '0 passengers',
        suppliesText: 'Stocked'
      }, {
        servePassengers: { enabled: false, reason: 'No passengers' },
        checkInventory: { enabled: true, reason: null }
      });

    default:
      // Return a minimal observer-like ViewModel for unknown roles
      return createObserverViewModel(role, context);
  }
}

/**
 * Build context object from operations data
 * @param {object} operations - Operations module instance
 * @param {string} shipId - Ship ID
 * @param {string} campaignId - Campaign ID
 * @param {string} role - Role
 * @param {number} roleInstance - Role instance
 * @returns {object} Context object for ViewModel creation
 */
function buildViewModelContext(operations, shipId, campaignId, role, roleInstance = 1) {
  const ship = operations.getShip(shipId);
  const campaign = operations.getCampaign(campaignId);
  const shipState = ship?.current_state || {};
  const template = ship?.template || {};

  // Get contacts
  let contacts = [];
  try {
    contacts = operations.getVisibleContacts(campaignId, shipId) || [];
  } catch (e) {
    // Contacts module might not be loaded
  }

  // Get crew
  const crew = operations.getPlayersByShip(shipId) || [];
  const crewOnline = crew.filter(c => c.role);

  // Get damaged systems
  let damagedSystems = [];
  let systemStatus = {};
  if (shipState.systems) {
    systemStatus = shipState.systems;
    damagedSystems = Object.entries(shipState.systems)
      .filter(([, status]) => status && status.damaged)
      .map(([name]) => name);
  }

  // Get fuel status
  const fuelStatus = shipState.fuel || {};

  // Get jump status
  const jumpStatus = shipState.jumpStatus || {};

  // Get weapons
  const shipWeapons = template.weapons || [];

  return {
    shipState,
    template,
    campaign,
    jumpStatus,
    ship,
    contacts,
    crewOnline,
    systemStatus,
    damagedSystems,
    fuelStatus,
    repairQueue: [],
    roleInstance,
    shipWeapons,
    activeFires: shipState.fires || [],
    breaches: shipState.breaches || [],
    environmentalData: null,
    flightConditions: shipState.flightConditions || null,
    pendingTravel: shipState.pendingTravel || null,
    rescueTargets: [],
    activePanel: role,
    watchRole: 'pilot'
  };
}

module.exports = {
  createRoleViewModel,
  buildViewModelContext,
  // Re-export individual creators for direct use
  createPilotViewModel,
  createEngineerViewModel,
  createGunnerViewModel,
  createCaptainViewModel,
  createSensorsViewModel,
  createAstrogatorViewModel,
  createDamageControlViewModel,
  createObserverViewModel
};
