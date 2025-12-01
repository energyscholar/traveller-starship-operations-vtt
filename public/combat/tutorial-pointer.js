// Animated Tutorial Pointer - Session 8, Stage 14
// Purpose: Visual cursor that shows where tutorial is "clicking"

class AnimatedPointer {
  constructor(debug = false) {
    this.pointer = null;
    this.currentTarget = null;
    this.debug = debug;
    console.log('[TutorialPointer] Constructor called, debug =', debug);
  }

  /**
   * Log debug information
   */
  log(...args) {
    // ALWAYS log for debugging session
    console.log('[TutorialPointer]', ...args);
  }

  /**
   * Create pointer DOM element
   */
  create() {
    if (this.pointer) {
      this.log('create() called but pointer already exists');
      return;
    }

    this.log('Creating pointer element');
    this.pointer = document.createElement('div');
    this.pointer.className = 'tutorial-pointer';
    document.body.appendChild(this.pointer);
    this.log('Pointer element created and added to body');
  }

  /**
   * Move pointer to element with smooth animation
   * @param {HTMLElement|string} target - Element or selector to move to
   * @param {number} duration - Animation duration in ms (default: 500)
   * @returns {Promise} Resolves when animation completes
   */
  async moveTo(target, duration = 500) {
    if (!this.pointer) this.create();

    const element = typeof target === 'string'
      ? document.querySelector(target)
      : target;

    if (!element) {
      console.warn('Tutorial pointer target not found:', target);
      this.log('Target not found:', target);
      // Hide pointer if target doesn't exist
      this.hide();
      return;
    }

    this.currentTarget = element;

    // Get element position
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    this.log('Moving to:', {
      target: typeof target === 'string' ? target : element.tagName,
      element: element,
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      },
      pointerPosition: { x, y },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      }
    });

    // Show pointer
    this.pointer.classList.add('visible');

    // Move to position
    this.pointer.style.left = `${x}px`;
    this.pointer.style.top = `${y}px`;

    // Trigger native mouseover event on the target element
    this.triggerMouseover(element);

    // Wait for animation
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * Trigger native mouseover event on an element
   * @param {HTMLElement} element - Element to trigger mouseover on
   */
  triggerMouseover(element) {
    if (!element) return;

    // Create and dispatch mouseover event
    const mouseoverEvent = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    element.dispatchEvent(mouseoverEvent);

    // Also trigger mouseenter for good measure
    const mouseenterEvent = new MouseEvent('mouseenter', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    element.dispatchEvent(mouseenterEvent);
  }

  /**
   * Simulate a click animation
   * @returns {Promise} Resolves when click animation completes
   */
  async click() {
    if (!this.pointer) return;

    this.pointer.classList.add('clicking');

    await new Promise(resolve => setTimeout(resolve, 150));

    this.pointer.classList.remove('clicking');

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Move to element and simulate click
   * @param {HTMLElement|string} target - Element or selector
   * @param {Object} options - Options for movement and click
   * @returns {Promise} Resolves when complete
   */
  async moveAndClick(target, options = {}) {
    const {
      moveDuration = 500,
      pauseBeforeClick = 300,
      pauseAfterClick = 200
    } = options;

    // Move to target
    await this.moveTo(target, moveDuration);

    // Pause before clicking
    await new Promise(resolve => setTimeout(resolve, pauseBeforeClick));

    // Click animation
    await this.click();

    // Actually click the element
    const element = typeof target === 'string'
      ? document.querySelector(target)
      : target;

    if (element) {
      element.click();
    }

    // Pause after clicking
    await new Promise(resolve => setTimeout(resolve, pauseAfterClick));
  }

  /**
   * Highlight element by moving pointer to it and hovering
   * @param {HTMLElement|string} target - Element or selector
   * @param {number} duration - How long to highlight (ms)
   * @returns {Promise} Resolves when highlight ends
   */
  async highlight(target, duration = 2000) {
    await this.moveTo(target);

    // Add highlight class to element
    const element = typeof target === 'string'
      ? document.querySelector(target)
      : target;

    if (element) {
      element.classList.add('tutorial-highlight');

      setTimeout(() => {
        element.classList.remove('tutorial-highlight');
      }, duration);
    }

    return new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * Hide pointer
   */
  hide() {
    this.log('hide() called, pointer exists:', !!this.pointer);
    if (this.pointer) {
      this.pointer.classList.remove('visible');
      const style = window.getComputedStyle(this.pointer);
      this.log('Pointer hidden. Current position:', {
        left: this.pointer.style.left,
        top: this.pointer.style.top,
        opacity: style.opacity
      });
    }
  }

  /**
   * Show pointer
   */
  show() {
    this.log('show() called, pointer exists:', !!this.pointer);
    if (!this.pointer) this.create();
    this.pointer.classList.add('visible');
    this.log('Pointer shown at position:', {
      left: this.pointer.style.left,
      top: this.pointer.style.top
    });
  }

  /**
   * Remove pointer from DOM
   */
  destroy() {
    if (this.pointer) {
      this.pointer.remove();
      this.pointer = null;
    }
    this.currentTarget = null;
  }

  /**
   * Get current pointer position
   * @returns {Object} {x, y} coordinates
   */
  getPosition() {
    if (!this.pointer) return { x: 0, y: 0 };

    const rect = this.pointer.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top
    };
  }
}
