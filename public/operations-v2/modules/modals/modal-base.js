/**
 * V2 Modal Base System
 * Provides show/hide/overlay logic for modals
 */

(function(window) {
  'use strict';

  const ModalBase = {
    container: null,
    overlay: null,
    currentModal: null,
    onCloseCallback: null,

    /**
     * Initialize modal system
     */
    init() {
      this.container = document.getElementById('modal-container');
      this.overlay = document.getElementById('modal-overlay');

      if (!this.container || !this.overlay) {
        console.warn('[Modals] Container or overlay not found');
        return;
      }

      // Close on overlay click
      this.overlay.addEventListener('click', () => this.close());

      // Close on container click (but not modal itself)
      this.container.addEventListener('click', (e) => {
        if (e.target === this.container) {
          this.close();
        }
      });

      // Close on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.currentModal) {
          this.close();
        }
      });
    },

    /**
     * Show a modal
     * @param {Object} options - Modal options
     * @param {string} options.title - Modal title
     * @param {string} options.content - Modal HTML content
     * @param {Function} options.onClose - Callback when modal closes
     * @param {Function} options.onSetup - Callback to setup event handlers
     * @param {string} options.size - Modal size: 'small', 'medium', 'large'
     */
    show(options) {
      if (!this.container || !this.overlay) {
        this.init();
      }

      const { title, content, onClose, onSetup, size = 'medium' } = options;

      // Build modal HTML
      const modalHTML = `
        <div class="modal modal-${size}">
          <div class="modal-header">
            <h2 class="modal-title">${title}</h2>
            <button class="modal-close" data-action="closeModal">&times;</button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
        </div>
      `;

      this.container.innerHTML = modalHTML;
      this.currentModal = this.container.querySelector('.modal');
      this.onCloseCallback = onClose;

      // Setup close button
      this.container.querySelector('[data-action="closeModal"]')
        .addEventListener('click', () => this.close());

      // Show overlay and container
      this.overlay.classList.remove('hidden');
      this.container.classList.remove('hidden');

      // Call setup callback for event handlers
      if (onSetup && typeof onSetup === 'function') {
        onSetup(this.currentModal);
      }

      // Focus first input if present
      const firstInput = this.currentModal.querySelector('input, select, textarea');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 50);
      }
    },

    /**
     * Close the current modal
     * @param {*} result - Optional result to pass to onClose callback
     */
    close(result) {
      if (!this.container || !this.overlay) return;

      this.overlay.classList.add('hidden');
      this.container.classList.add('hidden');
      this.container.innerHTML = '';

      if (this.onCloseCallback && typeof this.onCloseCallback === 'function') {
        this.onCloseCallback(result);
      }

      this.currentModal = null;
      this.onCloseCallback = null;
    },

    /**
     * Update modal content dynamically
     * @param {string} content - New HTML content for modal body
     */
    updateContent(content) {
      if (!this.currentModal) return;
      const body = this.currentModal.querySelector('.modal-body');
      if (body) {
        body.innerHTML = content;
      }
    },

    /**
     * Check if a modal is currently open
     * @returns {boolean}
     */
    isOpen() {
      return this.currentModal !== null;
    }
  };

  // Export to window
  window.ModalBase = ModalBase;

})(window);
