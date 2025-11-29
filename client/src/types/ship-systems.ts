/**
 * Ship System Tracking Types
 *
 * Comprehensive type definitions for tracking all ship subsystems and damage states.
 * Based on Traveller Core Rulebook critical hit tables.
 *
 * @see .claude/TODO-ship-system-tracking.md for full implementation plan
 */

/**
 * Critical hit effect flags
 */
export interface SystemEffects {
  /** System completely offline */
  disabled?: boolean;

  /** Operating at reduced capacity */
  reduced?: boolean;

  /** Permanently destroyed (beyond repair) */
  destroyed?: boolean;

  /** System on fire */
  fire?: boolean;

  /** Section exposed to vacuum */
  vented?: boolean;

  /** Crew casualties (for crew system) */
  casualties?: number;

  /** Injured crew (for crew system) */
  injured?: number;

  /** Radiation leak (for power plant) */
  radiation?: boolean;

  /** Ammunition explosion risk (for weapons) */
  ammunitionRisk?: boolean;
}

/**
 * Individual ship system tracking
 */
export interface ShipSystem {
  /** Display name (e.g., "M-Drive", "Power Plant") */
  name: string;

  /** Currently functional */
  operational: boolean;

  /** Has taken damage (may still be operational) */
  damaged: boolean;

  /** Critical damage - cannot be repaired mid-combat */
  critical: boolean;

  /** Damage level: 0=none, 1=minor, 2=major */
  damageLevel: 0 | 1 | 2;

  /** Operational efficiency 0.0-1.0 (for degraded performance) */
  efficiency?: number;

  /** Critical hit effects */
  effects?: SystemEffects;

  /** Number of repair attempts made */
  repairAttempts?: number;

  /** Can be repaired (false for critical/destroyed) */
  repairable?: boolean;
}

/**
 * Complete ship systems structure
 *
 * Standardized across all ship types for consistent damage tracking.
 * Optional systems (e.g., jDrive, shields) may be undefined for ships without them.
 */
export interface ShipSystems {
  // Propulsion
  /** Maneuver Drive (required) */
  mDrive: ShipSystem;

  /** Jump Drive (optional - only on jump-capable ships) */
  jDrive?: ShipSystem;

  // Power & Core
  /** Power Plant (required) */
  powerPlant: ShipSystem;

  /** Fusion Reactor (optional - redundant power) */
  reactor?: ShipSystem;

  // Combat Systems
  /** Sensors (required) */
  sensors: ShipSystem;

  /** Ship Computer (required) */
  computer: ShipSystem;

  /** Weapons (general tracking - or use per-turret) */
  weapons: ShipSystem;

  /** Individual turret tracking (optional) */
  turrets?: ShipSystem[];

  // Defense
  /** Armor plating (optional) */
  armor?: ShipSystem;

  /** Energy shields (optional - rare in Traveller) */
  shields?: ShipSystem;

  /** Point defense systems (optional) */
  pointDefense?: ShipSystem;

  // Life Support & Crew
  /** Life Support (required) */
  lifeSupport: ShipSystem;

  /** Artificial gravity (optional) */
  gravityPlates?: ShipSystem;

  /** Crew status tracking (injuries, casualties) */
  crew: ShipSystem;

  /** Medical facilities (optional) */
  medBay?: ShipSystem;

  // Fuel & Cargo
  /** Fuel storage (required) */
  fuelTanks: ShipSystem;

  /** Cargo bay (optional) */
  cargoHold?: ShipSystem;

  // Bridge & Control
  /** Ship's bridge (required) */
  bridge: ShipSystem;

  /** Communications array (optional) */
  communications?: ShipSystem;

  // Other
  /** Fighter/shuttle hangar (optional) */
  hangar?: ShipSystem;

  /** Missile storage (optional) */
  missileRacks?: ShipSystem;

  /** General ammunition storage (optional) */
  ammunition?: ShipSystem;
}

/**
 * Extended ship data with system tracking
 *
 * This extends the basic ShipData interface used in MultiShipDisplay
 * to include optional detailed system tracking.
 */
export interface ShipWithSystems {
  id: string;
  name: string;
  hull: { current: number; max: number };
  initiative?: number;
  isActive?: boolean;
  isDestroyed?: boolean;
  color?: string;

  /** Optional: Detailed system tracking */
  systems?: ShipSystems;
}

/**
 * Factory function to create default operational system
 */
export function createDefaultSystem(name: string): ShipSystem {
  return {
    name,
    operational: true,
    damaged: false,
    critical: false,
    damageLevel: 0,
    efficiency: 1.0,
    repairable: true,
    repairAttempts: 0
  };
}

/**
 * Factory function to create default ship systems for a standard ship
 *
 * Creates all required systems in operational state.
 * Caller can add optional systems as needed.
 */
export function createDefaultShipSystems(): ShipSystems {
  return {
    mDrive: createDefaultSystem('M-Drive'),
    powerPlant: createDefaultSystem('Power Plant'),
    sensors: createDefaultSystem('Sensors'),
    computer: createDefaultSystem('Ship Computer'),
    weapons: createDefaultSystem('Weapons'),
    lifeSupport: createDefaultSystem('Life Support'),
    crew: createDefaultSystem('Crew'),
    fuelTanks: createDefaultSystem('Fuel Tanks'),
    bridge: createDefaultSystem('Bridge')
  };
}

/**
 * Check if a system is completely disabled
 */
export function isSystemDisabled(system: ShipSystem): boolean {
  return !system.operational ||
         system.effects?.disabled === true ||
         system.effects?.destroyed === true;
}

/**
 * Check if a system can be repaired
 */
export function isSystemRepairable(system: ShipSystem): boolean {
  return system.damaged &&
         system.repairable !== false &&
         !system.critical &&
         system.effects?.destroyed !== true;
}

/**
 * Get visual status color for system
 */
export function getSystemStatusColor(system: ShipSystem): string {
  if (system.effects?.destroyed || (!system.operational && system.critical)) {
    return '#666'; // Gray - destroyed
  }
  if (!system.operational || system.effects?.disabled) {
    return '#ef4444'; // Red - disabled/critical
  }
  if (system.damaged || system.effects?.reduced) {
    return '#f59e0b'; // Amber - damaged but functional
  }
  return '#4ade80'; // Green - operational
}

/**
 * Get system status symbol for display
 */
export function getSystemStatusSymbol(system: ShipSystem): string {
  if (system.effects?.destroyed || (!system.operational && system.critical)) {
    return '×'; // Destroyed
  }
  if (!system.operational || system.effects?.disabled) {
    return '○'; // Disabled
  }
  if (system.damaged || system.effects?.reduced) {
    return '◐'; // Damaged
  }
  return '●'; // Operational
}
