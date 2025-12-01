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

    console.log('[TutorialPlayer] Starting tutorial');
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

    // Set up a periodic check to ensure modal stays visible
    // This helps during screen transitions
    this.modalVisibilityChecker = setInterval(() => {
      if (this.modal && this.modal.modal && this.isPlaying && !this.isPaused) {
        const hasVisibleClass = this.modal.modal.classList.contains('visible');
        if (!hasVisibleClass && this.currentStep >= 0) {
          console.warn('[TutorialPlayer] Modal lost visible class! Re-adding it.');
          this.modal.modal.classList.add('visible');
          if (this.modal.backdrop) {
            this.modal.backdrop.classList.add('visible');
          }
        }
      }
    }, 500); // Check every 500ms

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
    console.log('[TutorialPlayer] playStep() called with index:', index);

    if (index >= this.scenario.steps.length) {
      console.log('[TutorialPlayer] No more steps, completing tutorial');
      this.complete();
      return;
    }

    if (this.isPaused) {
      console.log('[TutorialPlayer] Tutorial is paused, skipping step');
      return;
    }

    this.currentStep = index;
    const step = this.scenario.steps[index];
    console.log('[TutorialPlayer] Playing step:', {
      index,
      title: step.title,
      hasPointer: !!step.pointer,
      pointerTarget: step.pointer?.target,
      hasTooltip: !!step.tooltip
    });

    // Update step metadata
    step.index = index;
    step.total = this.scenario.steps.length;

    // Show modal with narration
    console.log('[TutorialPlayer] Showing modal for step', index);
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

    // Set up action validation if this step requires manual action
    if (step.pointer && step.pointer.target) {
      console.log('[TutorialPlayer] Step requires manual action - DISABLING Continue button initially');
      // ALWAYS disable Continue button for steps that require user action
      this.modal.disableContinue();

      console.log('[TutorialPlayer] Setting up action validation for target:', step.pointer.target);
      this.setupActionValidation(step);
    }

    // Move pointer if specified
    if (step.pointer) {
      console.log('[TutorialPlayer] Step has pointer directive, waiting for element:', step.pointer.target);
      // Wait up to 2 seconds for element to appear
      const element = await this.waitForElement(step.pointer.target, 2000);

      // Only move pointer if element was found
      if (element) {
        console.log('[TutorialPlayer] Element found! Moving pointer to:', step.pointer.target);
        console.log('[TutorialPlayer] Element details:', {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          rect: element.getBoundingClientRect(),
          computedStyle: {
            display: window.getComputedStyle(element).display,
            visibility: window.getComputedStyle(element).visibility,
            position: window.getComputedStyle(element).position
          }
        });

        // Small delay to ensure layout is stable after screen transition
        await new Promise(resolve => setTimeout(resolve, 100));

        await this.pointer.moveTo(
          step.pointer.target,
          step.pointer.duration || 500
        );

        // Show tooltip if specified
        if (step.tooltip) {
          console.log('[TutorialPlayer] Showing tooltip');
          await new Promise(resolve => setTimeout(resolve, 200));
          this.tooltip.show(step.tooltip.element, step.tooltip.text);
        }
      } else {
        // Element not found - hide pointer and show warning in modal
        console.warn('[TutorialPlayer] ⚠️ Element NOT FOUND:', step.pointer.target);
        console.warn('[TutorialPlayer] User may need to navigate first');
        this.pointer.hide();

        // Continue button already disabled above, now wait for element to appear
        console.log('[TutorialPlayer] Starting waitForActionCompletion to watch for element');
        this.waitForActionCompletion(step);
      }
    }

    // NOTE: Actions removed - tutorial now requires manual interaction
    // User must click buttons themselves and then click "Continue"

    // No auto-advance - wait for user to click Continue button
  }

  /**
   * Set up validation to detect when user completes the required action
   * @param {Object} step - Tutorial step
   */
  setupActionValidation(step) {
    console.log('[TutorialPlayer] setupActionValidation() called');

    // Clean up any existing validation listeners
    if (this.actionValidationListener) {
      console.log('[TutorialPlayer] Removing existing action validation listener');
      document.removeEventListener('click', this.actionValidationListener, true);
      this.actionValidationListener = null;
    }

    // Create listener that detects clicks on the target element
    this.actionValidationListener = (event) => {
      const target = step.pointer.target;
      const element = typeof target === 'string'
        ? document.querySelector(target)
        : target;

      console.log('[TutorialPlayer] Click detected:', {
        clickedElement: event.target,
        targetSelector: target,
        targetElement: element,
        matches: element && (event.target === element || element.contains(event.target))
      });

      // Check if the clicked element matches or is inside the target
      if (element && (event.target === element || element.contains(event.target))) {
        // User clicked the required element!
        console.log('[TutorialPlayer] ✓ User clicked the required element! Enabling Continue button');
        this.modal.enableContinue();

        // Remove listener
        document.removeEventListener('click', this.actionValidationListener, true);
        this.actionValidationListener = null;
        console.log('[TutorialPlayer] Action validation listener removed');
      }
    };

    // Add listener with capture phase to catch all clicks
    document.addEventListener('click', this.actionValidationListener, true);
    console.log('[TutorialPlayer] Action validation listener added (capture phase)');
  }

  /**
   * Wait for the target element to appear and action to be completed
   * Continuously checks for element and updates pointer/tooltip when found
   * @param {Object} step - Tutorial step
   */
  async waitForActionCompletion(step) {
    const target = step.pointer.target;
    let checkCount = 0;
    const maxChecks = 300; // 30 seconds (100ms intervals)

    console.log('[TutorialPlayer] waitForActionCompletion() started for:', target);
    console.log('[TutorialPlayer] Will check every 100ms for up to 30 seconds');

    const checkForElement = async () => {
      const element = document.querySelector(target);
      checkCount++;

      if (checkCount % 10 === 0) {
        // Log every second
        console.log(`[TutorialPlayer] Still waiting for element... (${checkCount}/300)`);
      }

      if (element) {
        // Element found! Move pointer and show tooltip
        console.log('[TutorialPlayer] ✓ Element appeared! Moving pointer');
        console.log('[TutorialPlayer] Element details:', {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          rect: element.getBoundingClientRect()
        });

        await this.pointer.moveTo(target, step.pointer.duration || 500);

        if (step.tooltip) {
          console.log('[TutorialPlayer] Showing tooltip after element appeared');
          await new Promise(resolve => setTimeout(resolve, 200));
          this.tooltip.show(step.tooltip.element, step.tooltip.text);
        }

        // Enable continue button
        console.log('[TutorialPlayer] Enabling continue button');
        this.modal.enableContinue();

        return true;
      }

      if (checkCount < maxChecks) {
        // Keep checking
        setTimeout(checkForElement, 100);
      } else {
        // Timeout - give up
        console.warn(`[TutorialPlayer] ⚠️ TIMEOUT: Gave up waiting for element after 30 seconds: ${target}`);
      }

      return false;
    };

    checkForElement();
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
    console.log('[TutorialPlayer] continue() called, current step:', this.currentStep);

    if (this.isPaused) {
      console.log('[TutorialPlayer] Was paused, resuming');
      this.isPaused = false;
    }

    this.tooltip.hide();

    // Advance to next step
    const nextStep = this.currentStep + 1;
    console.log('[TutorialPlayer] Advancing to next step:', nextStep);

    if (nextStep < this.scenario.steps.length) {
      await this.playStep(nextStep);
    } else {
      console.log('[TutorialPlayer] No more steps, completing tutorial');
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
    console.log('[TutorialPlayer] Cleaning up tutorial');

    this.modal.destroy();
    this.pointer.destroy();
    this.tooltip.destroy();
    this.chat.destroy();

    // Remove navigation handlers
    if (this.navigationHandler) {
      window.removeEventListener('popstate', this.navigationHandler);
      window.removeEventListener('beforeunload', this.navigationHandler);
    }

    // Remove action validation listener
    if (this.actionValidationListener) {
      document.removeEventListener('click', this.actionValidationListener, true);
      this.actionValidationListener = null;
    }

    // Stop modal visibility checker
    if (this.modalVisibilityChecker) {
      clearInterval(this.modalVisibilityChecker);
      this.modalVisibilityChecker = null;
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
