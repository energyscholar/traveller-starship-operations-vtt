/**
 * AR-201: Modal Handler Registry
 *
 * Central registry for modal-specific handlers.
 * Modals register their setup functions which are called by showModal().
 */

const modalHandlers = new Map();

/**
 * Register a handler for a modal template
 * @param {string} templateId - The template ID (e.g., 'template-create-campaign')
 * @param {Function} handler - Setup function called when modal opens
 */
export function registerModalHandler(templateId, handler) {
  modalHandlers.set(templateId, handler);
}

/**
 * Get the handler for a modal template
 * @param {string} templateId - The template ID
 * @returns {Function|undefined} The handler function or undefined
 */
export function getModalHandler(templateId) {
  return modalHandlers.get(templateId);
}

/**
 * Get all registered modal template IDs
 * @returns {string[]} Array of registered template IDs
 */
export function getRegisteredModals() {
  return Array.from(modalHandlers.keys());
}
