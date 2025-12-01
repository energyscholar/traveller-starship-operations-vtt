// Tutorial Modal Dialog Component - Session 8, Stage 14
// Purpose: Display tutorial narration and control flow

class TutorialModal {
  constructor() {
    this.backdrop = null;
    this.modal = null;
    this.currentStep = null;
    this.onContinue = null;
    this.onPause = null;
    this.onSkip = null;
  }

  /**
   * Create modal DOM elements
   */
  create() {
    // Remove existing modal if present
    this.destroy();

    // Create backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tutorial-modal-backdrop';
    document.body.appendChild(this.backdrop);

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'tutorial-modal';
    this.modal.innerHTML = `
      <div class="tutorial-modal-header">
        <h2 class="tutorial-modal-title">🎓 Tutorial</h2>
        <div class="tutorial-modal-progress">Step 1 of 1</div>
      </div>
      <div class="tutorial-modal-content">
        Loading tutorial...
      </div>
      <div class="tutorial-modal-controls">
        <button class="tutorial-modal-btn secondary" data-action="pause">⏸️ Pause</button>
        <button class="tutorial-modal-btn" data-action="continue">▶️ Continue</button>
        <button class="tutorial-modal-btn secondary" data-action="skip">⏭️ Skip</button>
      </div>
    `;
    document.body.appendChild(this.modal);

    // Attach event listeners
    this.modal.querySelector('[data-action="continue"]').addEventListener('click', (event) => {
      console.log('[TutorialModal] Continue button clicked!', {
        disabled: event.target.disabled,
        hasCallback: !!this.onContinue
      });
      if (this.onContinue) {
        console.log('[TutorialModal] Calling onContinue callback');
        this.onContinue();
      }
    });

    this.modal.querySelector('[data-action="pause"]').addEventListener('click', () => {
      if (this.onPause) this.onPause();
    });

    this.modal.querySelector('[data-action="skip"]').addEventListener('click', () => {
      if (this.onSkip) this.onSkip();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
  }

  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} event
   */
  handleKeyPress(event) {
    if (!this.modal || !this.modal.classList.contains('visible')) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (this.onContinue) this.onContinue();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (this.onPause) this.onPause();
    }
  }

  /**
   * Show modal with step content
   * @param {Object} step - Tutorial step data
   * @param {Object} options - Display options
   */
  show(step, options = {}) {
    console.log('[TutorialModal] show() called for step:', step.index, step.title);

    if (!this.modal) {
      console.log('[TutorialModal] Modal does not exist, creating it');
      this.create();
    }

    this.currentStep = step;

    // Update title
    const titleElement = this.modal.querySelector('.tutorial-modal-title');
    if (step.title) {
      titleElement.textContent = `🎓 ${step.title}`;
    }

    // Update progress
    const progressElement = this.modal.querySelector('.tutorial-modal-progress');
    if (typeof step.index === 'number' && step.total) {
      progressElement.textContent = `Step ${step.index + 1} of ${step.total}`;
    }

    // Update content
    const contentElement = this.modal.querySelector('.tutorial-modal-content');
    contentElement.textContent = step.narration || '';

    // Show with animation
    setTimeout(() => {
      this.backdrop.classList.add('visible');
      this.modal.classList.add('visible');
      console.log('[TutorialModal] Modal should now be visible:', {
        backdropVisible: this.backdrop.classList.contains('visible'),
        modalVisible: this.modal.classList.contains('visible'),
        modalOpacity: window.getComputedStyle(this.modal).opacity
      });
    }, 10);
  }

  /**
   * Hide modal
   */
  hide() {
    if (this.backdrop) this.backdrop.classList.remove('visible');
    if (this.modal) this.modal.classList.remove('visible');
  }

  /**
   * Remove modal from DOM
   */
  destroy() {
    if (this.backdrop) {
      this.backdrop.remove();
      this.backdrop = null;
    }
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  /**
   * Update button visibility and labels
   * @param {Object} buttons - Button configuration
   */
  updateButtons(buttons) {
    const continueBtn = this.modal.querySelector('[data-action="continue"]');
    const pauseBtn = this.modal.querySelector('[data-action="pause"]');
    const skipBtn = this.modal.querySelector('[data-action="skip"]');

    if (buttons.continue !== undefined) {
      continueBtn.style.display = buttons.continue ? 'block' : 'none';
      if (buttons.continueLabel) continueBtn.textContent = buttons.continueLabel;
    }

    if (buttons.pause !== undefined) {
      pauseBtn.style.display = buttons.pause ? 'block' : 'none';
    }

    if (buttons.skip !== undefined) {
      skipBtn.style.display = buttons.skip ? 'block' : 'none';
    }
  }

  /**
   * Disable the Continue button
   */
  disableContinue() {
    console.log('[TutorialModal] disableContinue() called');
    const continueBtn = this.modal?.querySelector('[data-action="continue"]');
    console.log('[TutorialModal] Continue button found:', !!continueBtn);
    if (continueBtn) {
      continueBtn.disabled = true;
      continueBtn.style.opacity = '0.5';
      continueBtn.style.cursor = 'not-allowed';
      continueBtn.title = 'Complete the required action first';
      console.log('[TutorialModal] Continue button DISABLED');
    }
  }

  /**
   * Enable the Continue button
   */
  enableContinue() {
    console.log('[TutorialModal] enableContinue() called');
    const continueBtn = this.modal?.querySelector('[data-action="continue"]');
    console.log('[TutorialModal] Continue button found:', !!continueBtn);
    if (continueBtn) {
      continueBtn.disabled = false;
      continueBtn.style.opacity = '1';
      continueBtn.style.cursor = 'pointer';
      continueBtn.title = '';
      console.log('[TutorialModal] Continue button ENABLED');
    }
  }
}
