/**
 * AR-251: GUI Adapters Index
 *
 * Centralized exports for all role GUI adapters.
 * These adapters provide pure state functions for role panels.
 *
 * @module adapters
 */

export * from './gunner-adapter.js';
export * from './pilot-adapter.js';
export * from './captain-adapter.js';

// Re-export named for convenience
export { getGunnerState, canEngageTarget, getRangeDM, calculateHitChance } from './gunner-adapter.js';
export { getPilotState, canNavigate, getDriveStatus, getJumpStatus } from './pilot-adapter.js';
export { getCaptainState, getAlertState, analyzeContacts, getRecommendedAlert } from './captain-adapter.js';
