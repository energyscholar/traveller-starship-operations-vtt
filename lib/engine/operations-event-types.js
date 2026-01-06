/**
 * Operations Event Types - Extension for Non-Combat Operations
 *
 * Extends the core EventTypes for all game operations beyond combat.
 * Use these with EventBus for TUI/GUI adapter pattern.
 *
 * @module lib/engine/operations-event-types
 */

/**
 * Navigation events
 */
const NavigationEvents = {
  JUMP_INITIATED: 'nav:jumpInitiated',
  JUMP_COMPLETED: 'nav:jumpCompleted',
  COURSE_SET: 'nav:courseSet',
  RANGE_CHANGED: 'nav:rangeChanged',
  THRUST_APPLIED: 'nav:thrustApplied',
  ORBIT_ACHIEVED: 'nav:orbitAchieved'
};

/**
 * Sensor events
 */
const SensorEvents = {
  SCAN_COMPLETE: 'sensor:scanComplete',
  LOCK_ACQUIRED: 'sensor:lockAcquired',
  LOCK_LOST: 'sensor:lockLost',
  ECM_ACTIVATED: 'sensor:ecmActivated',
  ECM_DEACTIVATED: 'sensor:ecmDeactivated',
  ECCM_ACTIVATED: 'sensor:eccmActivated',
  CONTACT_DETECTED: 'sensor:contactDetected',
  CONTACT_LOST: 'sensor:contactLost',
  CONTACT_CLASSIFIED: 'sensor:contactClassified'
};

/**
 * Crew events
 */
const CrewEvents = {
  INJURY_APPLIED: 'crew:injuryApplied',
  TREATMENT_STARTED: 'crew:treatmentStarted',
  TREATMENT_COMPLETED: 'crew:treatmentCompleted',
  CREW_ASSIGNED: 'crew:assigned',
  CREW_INCAPACITATED: 'crew:incapacitated'
};

/**
 * Communications events
 */
const CommsEvents = {
  MESSAGE_RECEIVED: 'comms:messageReceived',
  TRANSMISSION_SENT: 'comms:transmissionSent',
  CHANNEL_OPENED: 'comms:channelOpened',
  CHANNEL_CLOSED: 'comms:channelClosed',
  JAMMING_DETECTED: 'comms:jammingDetected'
};

/**
 * Engineering events
 */
const EngineeringEvents = {
  POWER_ALLOCATED: 'eng:powerAllocated',
  REPAIR_STARTED: 'eng:repairStarted',
  REPAIR_COMPLETED: 'eng:repairCompleted',
  SYSTEM_OVERLOADED: 'eng:systemOverloaded',
  FUEL_CONSUMED: 'eng:fuelConsumed',
  FUEL_SCOOPED: 'eng:fuelScooped'
};

/**
 * Captain/Command events
 */
const CommandEvents = {
  ORDER_ISSUED: 'cmd:orderIssued',
  BATTLE_STATIONS: 'cmd:battleStations',
  STAND_DOWN: 'cmd:standDown',
  COURSE_ORDERED: 'cmd:courseOrdered',
  TACTICS_CHANGED: 'cmd:tacticsChanged'
};

/**
 * Gunnery events
 */
const GunneryEvents = {
  TARGET_SELECTED: 'gun:targetSelected',
  WEAPON_CHARGED: 'gun:weaponCharged',
  FIRE_SOLUTION: 'gun:fireSolution',
  RELOAD_STARTED: 'gun:reloadStarted',
  RELOAD_COMPLETED: 'gun:reloadCompleted'
};

/**
 * Role panel state events (for UI updates)
 */
const RolePanelEvents = {
  STATE_UPDATED: 'panel:stateUpdated',
  PANEL_REFRESHED: 'panel:refreshed',
  ACTION_AVAILABLE: 'panel:actionAvailable',
  ACTION_BLOCKED: 'panel:actionBlocked'
};

/**
 * Combined OperationEvents export
 */
const OperationEvents = {
  ...NavigationEvents,
  ...SensorEvents,
  ...CrewEvents,
  ...CommsEvents,
  ...EngineeringEvents,
  ...CommandEvents,
  ...GunneryEvents,
  ...RolePanelEvents
};

module.exports = {
  OperationEvents,
  NavigationEvents,
  SensorEvents,
  CrewEvents,
  CommsEvents,
  EngineeringEvents,
  CommandEvents,
  GunneryEvents,
  RolePanelEvents
};
