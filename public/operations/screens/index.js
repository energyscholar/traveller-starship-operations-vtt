/**
 * AR-201: Screen Handler Registry
 *
 * Central registry for screen initialization functions.
 * Screens register their init functions which are called by showScreen().
 */

const screenHandlers = new Map();

/**
 * Register an initializer for a screen
 * @param {string} screenId - The screen ID (e.g., 'login', 'bridge')
 * @param {Function} handler - Init function called when screen is shown
 */
export function registerScreen(screenId, handler) {
  screenHandlers.set(screenId, handler);
}

/**
 * Get the initializer for a screen
 * @param {string} screenId - The screen ID
 * @returns {Function|undefined} The handler function or undefined
 */
export function getScreenHandler(screenId) {
  return screenHandlers.get(screenId);
}

/**
 * Get all registered screen IDs
 * @returns {string[]} Array of registered screen IDs
 */
export function getRegisteredScreens() {
  return Array.from(screenHandlers.keys());
}
