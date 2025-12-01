// Tutorial Chat Placeholder - Session 8, Stage 14
// Purpose: Display tutorial messages as chat (placeholder for Stage 16 integration)

class TutorialChat {
  constructor() {
    this.chatBox = null;
    this.messagesContainer = null;
    this.messageQueue = [];
  }

  /**
   * Create chat box DOM elements
   */
  create() {
    if (this.chatBox) return;

    this.chatBox = document.createElement('div');
    this.chatBox.className = 'tutorial-chat';
    this.chatBox.innerHTML = `
      <div class="tutorial-chat-header">
        💬 Tutorial Chat
      </div>
      <div class="tutorial-chat-messages"></div>
      <div class="tutorial-chat-footer">
        Chat system coming in Stage 16
      </div>
    `;
    document.body.appendChild(this.chatBox);

    this.messagesContainer = this.chatBox.querySelector('.tutorial-chat-messages');
  }

  /**
   * Initialize chat (create if needed)
   */
  initialize() {
    if (!this.chatBox) this.create();
  }

  /**
   * Show chat box
   */
  show() {
    if (!this.chatBox) this.create();

    setTimeout(() => {
      this.chatBox.classList.add('visible');
    }, 10);
  }

  /**
   * Hide chat box
   */
  hide() {
    if (this.chatBox) {
      this.chatBox.classList.remove('visible');
    }
  }

  /**
   * Add a message to the chat
   * @param {string} sender - Sender name (e.g., "Instructor", "Narrator")
   * @param {string} text - Message text
   * @param {Object} options - Display options
   */
  addMessage(sender, text, options = {}) {
    if (!this.messagesContainer) this.create();

    // Remove typing indicator if present
    const typingIndicator = this.messagesContainer.querySelector('.tutorial-chat-typing');
    if (typingIndicator) {
      typingIndicator.remove();
    }

    // Create message element
    const message = document.createElement('div');
    message.className = 'tutorial-chat-message';
    message.innerHTML = `
      <strong>${sender}:</strong> ${text}
    `;

    // Add with fade-in animation
    message.style.opacity = '0';
    this.messagesContainer.appendChild(message);

    setTimeout(() => {
      message.style.transition = 'opacity 0.3s';
      message.style.opacity = '1';
    }, 10);

    // Auto-scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  /**
   * Show typing indicator
   * @param {string} sender - Who is typing
   */
  showTypingIndicator(sender) {
    if (!this.messagesContainer) return;

    // Remove existing typing indicator
    const existing = this.messagesContainer.querySelector('.tutorial-chat-typing');
    if (existing) existing.remove();

    // Add new typing indicator
    const indicator = document.createElement('div');
    indicator.className = 'tutorial-chat-typing';
    indicator.innerHTML = `
      <strong>${sender}:</strong> <span class="dots">...</span>
    `;

    this.messagesContainer.appendChild(indicator);

    // Auto-scroll
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  /**
   * Send message with optional typing animation
   * @param {string} sender - Sender name
   * @param {string} text - Message text
   * @param {Object} options - Options (delay, typing)
   */
  sendMessage(sender, text, options = {}) {
    const {
      delay = 0,
      typing = true
    } = options;

    setTimeout(() => {
      if (typing) {
        this.showTypingIndicator(sender);

        // Calculate typing duration based on message length
        const typingDuration = 1000 + text.length * 30;

        setTimeout(() => {
          this.addMessage(sender, text);
        }, typingDuration);
      } else {
        this.addMessage(sender, text);
      }
    }, delay);
  }

  /**
   * Clear all messages
   */
  clear() {
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }
  }

  /**
   * Remove chat box from DOM
   */
  destroy() {
    if (this.chatBox) {
      this.chatBox.remove();
      this.chatBox = null;
      this.messagesContainer = null;
    }
  }

  /**
   * Queue a message to be sent later
   * @param {string} sender - Sender name
   * @param {string} text - Message text
   * @param {Object} options - Options
   */
  queueMessage(sender, text, options = {}) {
    this.messageQueue.push({ sender, text, options });
  }

  /**
   * Process all queued messages
   */
  async processQueue() {
    for (const msg of this.messageQueue) {
      this.sendMessage(msg.sender, msg.text, msg.options);

      // Wait for message to appear
      const waitTime = (msg.options.typing !== false)
        ? 1000 + msg.text.length * 30 + (msg.options.delay || 0)
        : (msg.options.delay || 0) + 300;

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.messageQueue = [];
  }
}
