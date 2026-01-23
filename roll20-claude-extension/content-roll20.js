/**
 * Roll20 Claude Extension - Content Script
 *
 * Runs in the context of Roll20 editor pages.
 * Observes chat for /claude commands and injects responses.
 */

(function() {
  'use strict';

  // Track processed message IDs to avoid duplicates
  const processedMessages = new Set();
  let lastMessageCount = 0;

  /**
   * Extract chat messages from Roll20 chat log
   * @returns {Array<{sender: string, text: string, timestamp: number}>}
   */
  function extractChatMessages() {
    const messages = [];
    const chatContainer = document.querySelector('#textchat .content');

    if (!chatContainer) {
      return messages;
    }

    const messageElements = chatContainer.querySelectorAll('.message');

    messageElements.forEach((el, index) => {
      const messageId = el.getAttribute('data-messageid') || `msg-${index}`;

      // Skip already processed messages
      if (processedMessages.has(messageId)) {
        return;
      }

      const senderEl = el.querySelector('.by');
      const textEl = el.querySelector('.message-content') || el.querySelector('.spacer');

      if (textEl) {
        const sender = senderEl ? senderEl.textContent.trim().replace(/:$/, '') : 'Unknown';
        const text = textEl.textContent.trim();
        const timestamp = Date.now();

        messages.push({
          sender,
          text,
          timestamp,
          id: messageId
        });

        processedMessages.add(messageId);
      }
    });

    return messages;
  }

  /**
   * Send a message to Roll20 chat as GM
   * @param {string} text - Message to send
   */
  function sendToChatAsGM(text) {
    const chatInput = document.querySelector('#textchat-input textarea');

    if (!chatInput) {
      console.error('[Roll20 Claude] Chat input not found');
      return;
    }

    // Set the value
    chatInput.value = `/w gm ${text}`;

    // Trigger input event for Roll20 to detect change
    chatInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Simulate Enter key press to send
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
    });
    chatInput.dispatchEvent(enterEvent);

    console.log('[Roll20 Claude] Sent message:', text.substring(0, 50) + '...');
  }

  /**
   * Handle messages from background script
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SEND_CHAT') {
      sendToChatAsGM(message.text);
      sendResponse({ success: true });
    }
    return true; // Keep channel open for async response
  });

  /**
   * Observe chat for new messages
   */
  function setupChatObserver() {
    const chatContainer = document.querySelector('#textchat .content');

    if (!chatContainer) {
      // Retry if chat not loaded yet
      setTimeout(setupChatObserver, 1000);
      return;
    }

    console.log('[Roll20 Claude] Chat observer initialized');

    const observer = new MutationObserver((mutations) => {
      // Check for new messages
      const currentCount = chatContainer.querySelectorAll('.message').length;

      if (currentCount > lastMessageCount) {
        lastMessageCount = currentCount;

        const newMessages = extractChatMessages();

        if (newMessages.length > 0) {
          // Send to background script
          chrome.runtime.sendMessage({
            type: 'CHAT_UPDATE',
            messages: newMessages
          });
        }
      }
    });

    observer.observe(chatContainer, {
      childList: true,
      subtree: true
    });

    // Initial extraction
    const initialMessages = extractChatMessages();
    if (initialMessages.length > 0) {
      chrome.runtime.sendMessage({
        type: 'CHAT_UPDATE',
        messages: initialMessages
      });
    }

    lastMessageCount = chatContainer.querySelectorAll('.message').length;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupChatObserver);
  } else {
    setupChatObserver();
  }

  console.log('[Roll20 Claude] Content script loaded');
})();
