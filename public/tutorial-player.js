// Tutorial Player Orchestrator - Session 8, Stage 14
// Purpose: Main controller that runs tutorial scenarios

class TutorialPlayer {
  constructor(scenario, debug = false) {
    this.scenario = scenario;
    this.currentStep = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.debug = debug;

    // Components
    this.modal = new TutorialModal();
    this.pointer = new AnimatedPointer(debug); // Enable debug mode for pointer
    this.tooltip = new TutorialTooltip();
    this.chat = new TutorialChat();
  }

  /**
   * Start the tutorial
   */
  async start() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.isPaused = false;

    // Initialize components
    this.modal.create();
    this.pointer.create();
    this.tooltip.create();
    this.chat.initialize();

    // Set up modal callbacks
    this.modal.onContinue = () => this.continue();
    this.modal.onPause = () => this.pause();
    this.modal.onSkip = () => this.skip();

    // Handle browser navigation (back/forward buttons)
    this.navigationHandler = () => {
      if (this.isPlaying) {
        this.cleanup();
      }
    };
    window.addEventListener('popstate', this.navigationHandler);
    window.addEventListener('beforeunload', this.navigationHandler);

    // Show chat
    this.chat.show();

    // Start first step
    await this.playStep(0);
  }

  /**
   * Play a specific step
   * @param {number} index - Step index
   */
  async playStep(index) {
    if (index >= this.scenario.steps.length) {
      this.complete();
      return;
    }

    if (this.isPaused) return;

    this.currentStep = index;
    const step = this.scenario.steps[index];

    // Update step metadata
    step.index = index;
    step.total = this.scenario.steps.length;

    // Show modal with narration
    this.modal.show(step);

    // Send chat message if specified
    if (step.chatMessage) {
      this.chat.sendMessage(
        step.chatMessage.sender,
        step.chatMessage.text,
        {
          delay: step.chatMessage.delay || 0,
          typing: true
        }
      );
    }

    // Move pointer if specified
    if (step.pointer) {
      await this.waitForElement(step.pointer.target);

      await this.pointer.moveTo(
        step.pointer.target,
        step.pointer.duration || 500
      );

      // Show tooltip if specified
      if (step.tooltip) {
        await new Promise(resolve => setTimeout(resolve, 200));
        this.tooltip.show(step.tooltip.element, step.tooltip.text);
      }
    }

    // NOTE: Actions removed - tutorial now requires manual interaction
    // User must click buttons themselves and then click "Continue"

    // No auto-advance - wait for user to click Continue button
  }

  /**
   * Execute a tutorial action
   * @param {Object} action - Action definition
   */
  async executeAction(action) {
    const element = document.querySelector(action.target);
    if (!element) {
      console.warn('Tutorial action target not found:', action.target);
      return;
    }

    if (action.type === 'click') {
      await this.pointer.moveAndClick(element, {
        moveDuration: 300,
        pauseBeforeClick: 300,
        pauseAfterClick: 200
      });
    } else if (action.type === 'select') {
      await this.pointer.moveTo(element, 300);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Select the value
      if (element.tagName === 'SELECT') {
        element.value = action.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      await this.pointer.click();
    } else if (action.type === 'type') {
      await this.pointer.moveTo(element, 300);
      element.focus();

      // Type text character by character
      for (const char of action.text) {
        element.value += char;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Wait for a condition to be met
   * @param {Object} condition - Wait condition
   */
  async waitFor(condition) {
    if (condition.selector) {
      return this.waitForElement(condition.selector, condition.timeout);
    } else if (condition.timeout) {
      return new Promise(resolve => setTimeout(resolve, condition.timeout));
    }
  }

  /**
   * Wait for an element to appear in DOM
   * @param {string} selector - CSS selector
   * @param {number} timeout - Max wait time in ms (default: 10000)
   */
  async waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkElement = () => {
        const element = document.querySelector(selector);

        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          console.warn(`Tutorial timeout waiting for: ${selector}`);
          resolve(null);
        } else {
          setTimeout(checkElement, 100);
        }
      };

      checkElement();
    });
  }

  /**
   * Continue to next step (manual advancement)
   */
  async continue() {
    if (this.isPaused) {
      this.isPaused = false;
    }

    this.tooltip.hide();

    // Advance to next step
    const nextStep = this.currentStep + 1;
    if (nextStep < this.scenario.steps.length) {
      await this.playStep(nextStep);
    } else {
      this.complete();
    }
  }

  /**
   * Pause the tutorial
   */
  pause() {
    this.isPaused = true;
    this.modal.hide();
    this.pointer.hide();
    this.tooltip.hide();

    // Show pause menu
    alert('Tutorial paused. Refresh the page to exit tutorial mode.');
  }

  /**
   * Skip tutorial - clean exit to main screen
   */
  skip() {
    this.cleanup();
    window.location.href = '/';
  }

  /**
   * Complete the tutorial
   */
  complete() {
    this.isPlaying = false;

    // Show completion modal
    this.modal.show({
      index: this.scenario.steps.length,
      total: this.scenario.steps.length,
      title: '🎉 Tutorial Complete!',
      narration: `Congratulations! You've completed the "${this.scenario.title}" tutorial.

You've learned:
${this.scenario.learningObjectives.map(obj => `• ${obj}`).join('\n')}

Ready for more? Try another tutorial or jump into a real battle!`
    });

    // Update buttons for completion
    this.modal.updateButtons({
      continue: true,
      continueLabel: '✓ Done',
      pause: false,
      skip: false
    });

    // Override continue to close tutorial
    this.modal.onContinue = () => {
      this.cleanup();
      window.location.href = '/';
    };

    // Hide other components
    this.pointer.hide();
    this.tooltip.hide();

    // Send final chat message
    this.chat.sendMessage(
      '🎉 Tutorial System',
      'Tutorial complete! Great job, Captain!',
      { delay: 500, typing: false }
    );

    // Hide chat after a moment
    setTimeout(() => {
      this.chat.hide();
    }, 5000);
  }

  /**
   * Clean up all tutorial components
   */
  cleanup() {
    this.modal.destroy();
    this.pointer.destroy();
    this.tooltip.destroy();
    this.chat.destroy();

    // Remove navigation handlers
    if (this.navigationHandler) {
      window.removeEventListener('popstate', this.navigationHandler);
      window.removeEventListener('beforeunload', this.navigationHandler);
    }

    // Clear active tutorial reference
    window.activeTutorial = null;
  }
}

/**
 * Show tutorial selection menu
 */
function showTutorialMenu() {
  // Check if we're already in a tutorial
  if (window.activeTutorial) {
    alert('A tutorial is already running. Please complete or close it first.');
    return;
  }

  // Create modal backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'tutorial-modal-backdrop visible';
  document.body.appendChild(backdrop);

  // Create selection modal
  const modal = document.createElement('div');
  modal.className = 'tutorial-selection-modal';
  modal.innerHTML = `
    <h1 class="tutorial-selection-title">🎓 Choose a Tutorial</h1>
    <div class="tutorial-selection-grid"></div>
    <div style="text-align: center; margin-top: 20px;">
      <button class="tutorial-modal-btn secondary" onclick="closeTutorialMenu()">Cancel</button>
    </div>
  `;
  document.body.appendChild(modal);

  // Add tutorial cards
  const grid = modal.querySelector('.tutorial-selection-grid');

  Object.values(TUTORIAL_SCENARIOS).forEach(scenario => {
    const card = document.createElement('div');
    card.className = 'tutorial-card';
    card.innerHTML = `
      <div class="tutorial-card-title">${scenario.title}</div>
      <div class="tutorial-card-description">${scenario.description}</div>
      <div class="tutorial-card-meta">
        <span class="tutorial-card-difficulty ${scenario.difficulty}">${scenario.difficulty}</span>
        <span>⏱️ ${scenario.duration}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      closeTutorialMenu();
      startTutorial(scenario.id);
    });

    grid.appendChild(card);
  });

  // Store references for cleanup
  window.tutorialMenuBackdrop = backdrop;
  window.tutorialMenuModal = modal;
}

/**
 * Close tutorial selection menu
 */
function closeTutorialMenu() {
  if (window.tutorialMenuBackdrop) {
    window.tutorialMenuBackdrop.remove();
    window.tutorialMenuBackdrop = null;
  }
  if (window.tutorialMenuModal) {
    window.tutorialMenuModal.remove();
    window.tutorialMenuModal = null;
  }
}

/**
 * Start a tutorial by ID
 * @param {string} tutorialId - Tutorial scenario ID
 * @param {boolean} debug - Enable debug logging (default: false)
 */
function startTutorial(tutorialId, debug = false) {
  const scenario = TUTORIAL_SCENARIOS[tutorialId];

  if (!scenario) {
    alert(`Tutorial not found: ${tutorialId}`);
    return;
  }

  // Check URL parameters for debug mode
  const urlParams = new URLSearchParams(window.location.search);
  const debugMode = debug || urlParams.has('tutorial_debug');

  // Create and start tutorial player
  window.activeTutorial = new TutorialPlayer(scenario, debugMode);

  if (debugMode) {
    console.log('[Tutorial] Debug mode enabled. Add ?tutorial_debug to URL to enable.');
  }

  window.activeTutorial.start();
}
