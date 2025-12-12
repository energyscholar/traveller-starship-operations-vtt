/**
 * AR-103 Phase 2: Notification system
 * Extracted from app.js for modular refactor
 *
 * Provides toast-style notifications for user feedback.
 * Load this script BEFORE app.js in index.html
 */

// ==================== Debug Configuration ====================
// SECURITY: Debug logging only enabled on localhost
const NOTIFICATIONS_DEBUG = ['localhost', '127.0.0.1'].includes(location.hostname);
const notificationsDebugLog = (...args) => NOTIFICATIONS_DEBUG && console.log(...args);

// ==================== Notification Container ====================
let notificationContainer = null;

/**
 * Get or create the notification container element
 * @returns {HTMLElement} The notification container
 */
function getNotificationContainer() {
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
  }
  return notificationContainer;
}

/**
 * Display a toast notification to the user
 * @param {string} message - The message to display
 * @param {string} type - Notification type: 'info', 'success', 'warning', 'error'
 * @param {number} duration - Duration in ms before auto-dismiss (default: 4000)
 */
function showNotification(message, type = 'info', duration = 4000) {
  notificationsDebugLog(`[${type.toUpperCase()}] ${message}`);

  const container = getNotificationContainer();

  // Icon based on type
  const icons = {
    info: 'i',
    success: '✓',
    warning: '⚠',
    error: '✕'
  };

  const toast = document.createElement('div');
  toast.className = `notification-toast ${type}`;
  toast.innerHTML = `
    <span class="notification-icon">${icons[type] || icons.info}</span>
    <span class="notification-message">${message}</span>
  `;

  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// AR-103: These functions are now global (loaded before app.js)
