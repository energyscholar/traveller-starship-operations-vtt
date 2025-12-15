/**
 * AR-150: UI Control Status Registry
 *
 * Central tracking system for all UI controls functionality status.
 * Provides visual feedback via colored borders to indicate what works.
 *
 * Status levels:
 * - green: Fully functional (no border shown - default)
 * - yellow: Half-baked/partial functionality
 * - red: Stub/non-functional placeholder
 */

// ============================================================================
// UI CONTROL STATUS REGISTRY
// ============================================================================
// Format: 'selector-or-id': { status: 'green'|'yellow'|'red', note: 'description' }
//
// Only YELLOW and RED controls are listed here.
// GREEN is the default - any unlisted control is assumed fully functional.
// ============================================================================

export const UI_STATUS = {
  // ========================================================================
  // YELLOW (Half-Baked) - Partial functionality, known limitations
  // ========================================================================

  // --- Sensor Panel (AR-127) ---
  'sensor-filter': {
    status: 'yellow',
    note: 'AR-127: Filter dropdown exists but no handlers'
  },
  'sensor-sort': {
    status: 'yellow',
    note: 'AR-127: Sort dropdown exists but no handlers'
  },
  'btn-ecm': {
    status: 'yellow',
    note: 'AR-127: Socket mismatch - client sends wrong event'
  },
  'btn-eccm': {
    status: 'yellow',
    note: 'AR-127: Socket mismatch - client sends wrong event'
  },
  'btn-stealth': {
    status: 'yellow',
    note: 'AR-127: Socket mismatch - client sends wrong event'
  },
  'btn-break-lock': {
    status: 'yellow',
    note: 'AR-127: No server handler for ops:breakSensorLock'
  },

  // --- Astrogator Panel ---
  'btn-skip-jump': {
    status: 'yellow',
    note: 'Debug/test button exposed in production'
  },

  // --- Skill Checks ---
  'skill-check-pilot': {
    status: 'yellow',
    note: 'Always uses skill 0, not actual character skill'
  },
  'skill-check-engineer': {
    status: 'yellow',
    note: 'Always uses skill 0, not actual character skill'
  },
  'skill-check-astrogator': {
    status: 'yellow',
    note: 'Always uses skill 0, not actual character skill'
  },

  // --- Observer Panel (AR-128) ---
  'observer-watch-role': {
    status: 'yellow',
    note: 'AR-128L: Role selector added but watching not implemented'
  },

  // ========================================================================
  // RED (Stub/Non-functional) - UI exists but doesn't work
  // ========================================================================

  // --- Tactical Map (v81.6) ---
  'btn-tactical-map': {
    status: 'red',
    note: 'v81.6: Tactical ship map not implemented'
  },

  // --- Trade Mechanics ---
  'btn-cargo-trade': {
    status: 'red',
    note: 'Trade mechanics not implemented'
  },
  'btn-buy-cargo': {
    status: 'red',
    note: 'Cargo buying not implemented'
  },
  'btn-sell-cargo': {
    status: 'red',
    note: 'Cargo selling not implemented'
  },

  // --- Captain Solo Commands (AR-131) ---
  'btn-captain-solo-plot': {
    status: 'red',
    note: 'AR-131L: Captain solo command wireframe only'
  },
  'btn-captain-solo-verify': {
    status: 'red',
    note: 'AR-131L: Captain solo command wireframe only'
  },
  'btn-captain-solo-course': {
    status: 'red',
    note: 'AR-131L: Captain solo command wireframe only'
  },
  'btn-captain-solo-refuel': {
    status: 'red',
    note: 'AR-131L: Captain solo command wireframe only'
  },
  'btn-captain-solo-refine': {
    status: 'red',
    note: 'AR-131L: Captain solo command wireframe only'
  },

  // --- NPC Personae (AR-130) ---
  'btn-manage-npcs': {
    status: 'red',
    note: 'AR-130: NPC personae system not implemented'
  }
};

// ============================================================================
// STATUS INDICATOR FUNCTIONS
// ============================================================================

/**
 * Apply status indicators to all registered controls.
 * Call this after UI renders (e.g., in initApp or after panel switches).
 */
export function applyStatusIndicators() {
  // Ensure body class is set for visibility
  if (!document.body.classList.contains('show-ui-status')) {
    document.body.classList.add('show-ui-status');
  }

  // Apply status to all registered controls
  for (const [selector, info] of Object.entries(UI_STATUS)) {
    applyStatusToElement(selector, info);
  }
}

/**
 * Apply status to a single element by selector
 */
function applyStatusToElement(selector, info) {
  // Try ID first, then data-control attribute, then class
  const el = document.getElementById(selector)
    || document.querySelector(`[data-control="${selector}"]`)
    || document.querySelector(`.${selector}`);

  if (el) {
    el.dataset.uiStatus = info.status;
    if (info.note) {
      el.dataset.statusNote = info.note;
    }
  }
}

/**
 * Get status for a specific control
 * @param {string} id - Control ID or selector
 * @returns {Object} Status object with status and note, or green default
 */
export function getControlStatus(id) {
  return UI_STATUS[id] || { status: 'green', note: 'Fully functional' };
}

/**
 * Toggle visibility of status indicators
 * @param {boolean} show - Whether to show indicators
 */
export function toggleStatusIndicators(show) {
  if (show) {
    document.body.classList.add('show-ui-status');
  } else {
    document.body.classList.remove('show-ui-status');
  }
}

/**
 * Check if status indicators are currently visible
 * @returns {boolean}
 */
export function isStatusVisible() {
  return document.body.classList.contains('show-ui-status');
}

/**
 * Handler for stub/non-functional buttons
 * Shows toast notification and logs to console
 * @param {string} featureName - Name of the feature
 */
export function notImplemented(featureName) {
  console.log(`[STUB] ${featureName} not yet implemented`);

  // Use global showNotification if available
  if (typeof window.showNotification === 'function') {
    window.showNotification(`${featureName} - coming soon!`, 'info');
  }
}

// Make notImplemented available globally for onclick handlers
if (typeof window !== 'undefined') {
  window.notImplemented = notImplemented;
}
