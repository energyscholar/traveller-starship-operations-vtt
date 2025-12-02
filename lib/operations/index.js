/**
 * Operations Module Index
 * Exports all operations-related functionality
 */

const accounts = require('./accounts');
const campaign = require('./campaign');
const contacts = require('./contacts');
const shipSystems = require('./ship-systems');
const jump = require('./jump');
const refueling = require('./refueling');
const mail = require('./mail');
const npcContacts = require('./npc-contacts');
const feedback = require('./feedback');
const reveals = require('./reveals');
const npcDossiers = require('./npc-dossiers');
const locations = require('./locations');
const events = require('./events');
const handouts = require('./handouts');
const adventureIO = require('./adventure-io');
const { seedSystemContacts, getSystemData } = require('./seed-systems');
const { db, generateId, DB_PATH } = require('./database');

module.exports = {
  // Re-export all account functions
  ...accounts,

  // Re-export all campaign functions
  ...campaign,

  // Re-export all contact functions
  ...contacts,

  // Re-export all ship systems functions
  ...shipSystems,

  // Re-export all jump functions
  ...jump,

  // Re-export all refueling functions
  ...refueling,

  // Re-export all mail functions (Autorun 6)
  ...mail,

  // Re-export all NPC contacts functions (Autorun 6)
  ...npcContacts,

  // Re-export all feedback functions (Autorun 6)
  ...feedback,

  // Re-export all reveals functions (Autorun 7)
  ...reveals,

  // Re-export all NPC dossiers functions (Autorun 7)
  ...npcDossiers,

  // Re-export all locations functions (Autorun 7)
  ...locations,

  // Re-export all events functions (Autorun 7)
  ...events,

  // Re-export all handouts functions (Autorun 7)
  ...handouts,

  // Re-export adventure I/O functions (Autorun 7)
  ...adventureIO,

  // Database utilities
  db,
  generateId,
  DB_PATH,

  // System data seeding (for jump arrivals)
  seedSystemContacts,
  getSystemData,

  // Role-specific view configurations
  // Each role has a detailed view with extra controls
  ROLE_VIEWS: {
    pilot: {
      name: 'Helm Control',
      description: 'Navigation, course plotting, docking procedures',
      detailPanels: ['navigation', 'docking', 'thrust'],
      actions: ['setCourse', 'dock', 'undock', 'evasiveAction', 'land']
    },
    captain: {
      name: 'Command',
      description: 'Ship-wide status, crew management, tactical overview',
      detailPanels: ['crewStatus', 'tacticalOverview', 'comms'],
      actions: ['setAlertStatus', 'issueOrders', 'authorizeWeapons', 'hail'],
      // Captain has limited access to all other role panels
      canAccessOtherRoles: true,
      otherRoleAccessLevel: 'view' // 'view' or 'limited_control'
    },
    astrogator: {
      name: 'Navigation',
      description: 'Jump plotting, course calculations, position tracking',
      detailPanels: ['jumpPlot', 'systemMap', 'courseCalc'],
      actions: ['plotJump', 'calculateIntercept', 'verifyPosition', 'emergencyJump']
    },
    engineer: {
      name: 'Engineering',
      description: 'Power management, drive status, system maintenance',
      detailPanels: ['powerGrid', 'driveStatus', 'fuelStatus', 'systemHealth'],
      actions: ['allocatePower', 'fieldRepair', 'overloadSystem', 'bypassSystem']
    },
    sensor_operator: {
      name: 'Sensors & Comms',
      description: 'Contact detection, scanning, communications',
      detailPanels: ['contacts', 'scanResults', 'commsLog', 'ewStatus'],
      actions: ['passiveScan', 'activeScan', 'deepScan', 'hail', 'jam', 'spoof']
    },
    gunner: {
      name: 'Weapons',
      description: 'Turret control, targeting, ammunition status',
      detailPanels: ['turretStatus', 'targetingData', 'ammoStatus'],
      actions: ['fireWeapon', 'pointDefense', 'sandcaster', 'selectTarget']
    },
    damage_control: {
      name: 'Damage Control',
      description: 'Detailed system status, repair coordination, emergency procedures',
      detailPanels: ['systemDamage', 'repairTeams', 'emergencyStatus', 'hullIntegrity'],
      actions: ['directRepair', 'prioritizeSystem', 'emergencyProcedure', 'isolateSection']
    },
    marines: {
      name: 'Security',
      description: 'Ship security, boarding operations, prisoner management',
      detailPanels: ['securityStatus', 'boardingPrep', 'personnelLocations'],
      actions: ['securityPatrol', 'prepareBoarding', 'repelBoarders', 'detainPersonnel']
    },
    medic: {
      name: 'Medical Bay',
      description: 'Crew health status, treatment, medical supplies',
      detailPanels: ['crewHealth', 'medbayStatus', 'supplies'],
      actions: ['treatInjury', 'triage', 'quarantine', 'checkSupplies']
    },
    steward: {
      name: 'Passenger Services',
      description: 'Passenger management, supplies, morale',
      detailPanels: ['passengerManifest', 'supplyStatus', 'moraleStatus'],
      actions: ['attendPassenger', 'checkSupplies', 'boostMorale', 'prepareFood']
    },
    cargo_master: {
      name: 'Cargo Operations',
      description: 'Cargo manifest, loading operations, hold status',
      detailPanels: ['cargoManifest', 'holdStatus', 'loadingBay'],
      actions: ['checkManifest', 'loadCargo', 'unloadCargo', 'secureCargo']
    },
    observer: {
      name: 'Observer',
      description: 'Spectator view of bridge operations (no controls)',
      detailPanels: [],
      actions: [],
      isObserver: true,
      unlimitedSlots: true
    },
    gm: {
      name: 'Game Master',
      description: 'Full control and visibility of all systems',
      detailPanels: ['*'],
      actions: ['*'],
      isGM: true
    }
  },

  // Alert status levels
  ALERT_STATUS: {
    NORMAL: {
      name: 'Normal',
      color: 'green',
      description: 'Standard operations, no threats detected'
    },
    YELLOW: {
      name: 'Yellow Alert',
      color: 'yellow',
      description: 'Heightened awareness, possible threat'
    },
    RED: {
      name: 'Red Alert',
      color: 'red',
      description: 'Combat stations, immediate threat'
    }
  }
};
