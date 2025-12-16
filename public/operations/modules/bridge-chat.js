/**
 * AR-151e: Bridge Chat Module
 * AR-97: Bridge Chat System - crew communication
 */

import { escapeHtml } from './utils.js';

/**
 * Send bridge chat message to all crew
 * @param {Object} state - Application state with socket
 */
export function sendBridgeChatMessage(state) {
  const input = document.getElementById('bridge-chat-input');
  const message = input?.value?.trim();

  if (!message) return;

  state.socket.emit('comms:sendTransmission', {
    message,
    channel: 'bridge'
  });

  input.value = '';
}

/**
 * Add message to bridge chat log
 * @param {Object} transmission - Message data
 */
export function addBridgeChatMessage(transmission) {
  const log = document.getElementById('bridge-chat-log');
  if (!log) return;

  // Remove placeholder if present
  const placeholder = log.querySelector('.chat-placeholder');
  if (placeholder) placeholder.remove();

  const time = new Date(transmission.timestamp || Date.now()).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const sender = escapeHtml(transmission.fromName || 'Unknown');
  const msg = escapeHtml(transmission.message || '');

  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message';
  msgEl.style.cssText = 'margin-bottom: 4px; line-height: 1.3;';
  msgEl.innerHTML = `<span style="color: #888;">[${time}]</span> <strong style="color: #4da6ff;">${sender}:</strong> ${msg}`;

  log.appendChild(msgEl);
  log.scrollTop = log.scrollHeight;

  // Keep only last 50 messages
  while (log.children.length > 50) {
    log.removeChild(log.firstChild);
  }
}
