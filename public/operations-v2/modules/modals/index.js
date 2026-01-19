/**
 * V2 Modal Registry
 * Central registry for modal handlers
 */

(function(window) {
  'use strict';

  const modalHandlers = new Map();

  const Modals = {
    /**
     * Register a modal handler
     * @param {string} modalId - Unique modal identifier
     * @param {Function} handler - Function that returns modal options
     */
    register(modalId, handler) {
      modalHandlers.set(modalId, handler);
    },

    /**
     * Get a registered modal handler
     * @param {string} modalId - Modal identifier
     * @returns {Function|undefined}
     */
    get(modalId) {
      return modalHandlers.get(modalId);
    },

    /**
     * Show a registered modal
     * @param {string} modalId - Modal identifier
     * @param {Object} context - Context passed to handler (state, helpers, etc.)
     */
    show(modalId, context = {}) {
      const handler = modalHandlers.get(modalId);
      if (!handler) {
        console.warn(`[Modals] No handler registered for: ${modalId}`);
        return;
      }

      const options = handler(context);
      if (options) {
        window.ModalBase.show(options);
      }
    },

    /**
     * Close the current modal
     * @param {*} result - Optional result to pass to callback
     */
    close(result) {
      window.ModalBase.close(result);
    },

    /**
     * List all registered modal IDs
     * @returns {string[]}
     */
    list() {
      return Array.from(modalHandlers.keys());
    }
  };

  // Export to window
  window.Modals = Modals;

})(window);
