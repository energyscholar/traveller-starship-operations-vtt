/**
 * AR-27: Shared Map State Management
 * In-memory session state for shared TravellerMap viewing
 */

// Map of campaignId -> map state
const mapStates = new Map();

/**
 * Default map state
 */
function defaultState() {
  return {
    shared: false,
    center: null,      // System name or hex
    sector: null,      // Sector name
    hex: null,         // Hex coordinates
    zoom: 64,          // TravellerMap scale (legacy)
    scale: 64,         // TravellerMap scale
    style: 'poster',   // TravellerMap style
    sharedBy: null,    // GM socket id who shared
    sharedAt: null     // Timestamp
  };
}

/**
 * Share map with all players in campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} options - { center, sector, hex, zoom }
 * @returns {Object} Updated state
 */
function shareMap(campaignId, options = {}) {
  const state = {
    shared: true,
    center: options.center || null,
    sector: options.sector || null,
    hex: options.hex || null,
    zoom: options.zoom || 64,
    sharedBy: options.sharedBy || null,
    sharedAt: new Date().toISOString()
  };
  mapStates.set(campaignId, state);
  return state;
}

/**
 * Get current map state for campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Current state or default
 */
function getMapState(campaignId) {
  return mapStates.get(campaignId) || defaultState();
}

/**
 * Stop sharing map
 * @param {string} campaignId - Campaign ID
 */
function unshareMap(campaignId) {
  const state = defaultState();
  mapStates.set(campaignId, state);
  return state;
}

/**
 * Update map view (pan/zoom)
 * @param {string} campaignId - Campaign ID
 * @param {Object} options - { center, sector, hex, scale, style, zoom }
 * @returns {Object} Updated state
 */
function updateMapView(campaignId, options = {}) {
  const current = mapStates.get(campaignId) || defaultState();
  const updated = {
    ...current,
    center: options.center !== undefined ? options.center : current.center,
    sector: options.sector !== undefined ? options.sector : current.sector,
    hex: options.hex !== undefined ? options.hex : current.hex,
    scale: options.scale !== undefined ? options.scale : current.scale,
    style: options.style !== undefined ? options.style : current.style,
    zoom: options.zoom !== undefined ? options.zoom : current.zoom
  };
  mapStates.set(campaignId, updated);
  return updated;
}

/**
 * Clear state for campaign (on cleanup)
 * @param {string} campaignId - Campaign ID
 */
function clearCampaignState(campaignId) {
  mapStates.delete(campaignId);
}

/**
 * Check if map is currently shared
 * @param {string} campaignId - Campaign ID
 * @returns {boolean}
 */
function isMapShared(campaignId) {
  const state = mapStates.get(campaignId);
  return state?.shared || false;
}

module.exports = {
  shareMap,
  getMapState,
  unshareMap,
  updateMapView,
  clearCampaignState,
  isMapShared
};
