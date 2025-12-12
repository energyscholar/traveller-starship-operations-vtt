/**
 * Session Storage Module
 * Handles browser localStorage for session persistence
 *
 * AR-103 Phase 8: Extracted from app.js
 */

const SESSION_KEY = 'ops_session';

/**
 * Get stored session data from localStorage
 * @returns {Object|null} Session data or null if not found/invalid
 */
function getStoredSession() {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Clear stored session from localStorage
 */
function clearStoredSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    // Silently fail - localStorage might be unavailable
  }
}

/**
 * Save session data to localStorage
 * @param {Object} sessionData - Session data to save
 * @param {string} sessionData.campaignId - Campaign ID
 * @param {string} sessionData.accountId - Account ID
 * @param {string} sessionData.shipId - Ship ID
 * @param {string} sessionData.role - Role name
 * @param {boolean} sessionData.isGM - Is GM flag
 */
function saveSessionData(sessionData) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (e) {
    // Silently fail - localStorage might be unavailable
  }
}

// Browser globals (loaded before app.js)
window.getStoredSession = getStoredSession;
window.clearStoredSession = clearStoredSession;
window.saveSessionData = saveSessionData;
