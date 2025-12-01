// Tutorial Tooltip System - Session 8, Stage 14
// Purpose: Show contextual help when tutorial hovers over elements

class TutorialTooltip {
  constructor() {
    this.tooltip = null;
    this.currentElement = null;
  }

  /**
   * Create tooltip DOM element
   */
  create() {
    if (this.tooltip) return;

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tutorial-tooltip';
    this.tooltip.innerHTML = `
      <div class="tutorial-tooltip-arrow"></div>
      <div class="tutorial-tooltip-content"></div>
    `;
    document.body.appendChild(this.tooltip);
  }

  /**
   * Show tooltip near an element
   * @param {HTMLElement|string} target - Element or selector
   * @param {string|Object} content - Tooltip content (string or {title, text})
   * @param {Object} options - Display options
   */
  show(target, content, options = {}) {
    if (!this.tooltip) this.create();

    const element = typeof target === 'string'
      ? document.querySelector(target)
      : target;

    if (!element) {
      console.warn('Tutorial tooltip target not found:', target);
      return;
    }

    this.currentElement = element;

    // Parse content
    let tooltipHTML = '';
    if (typeof content === 'string') {
      tooltipHTML = content;
    } else if (content.title || content.text) {
      if (content.title) {
        tooltipHTML += `<div class="tutorial-tooltip-title">${content.title}</div>`;
      }
      if (content.text) {
        tooltipHTML += content.text;
      }
    }

    // Update content
    const contentElement = this.tooltip.querySelector('.tutorial-tooltip-content');
    if (contentElement) {
      contentElement.innerHTML = tooltipHTML;
    }

    // Position tooltip
    this.position(element, options);

    // Show with animation
    setTimeout(() => {
      this.tooltip.classList.add('visible');
    }, 10);
  }

  /**
   * Position tooltip relative to target element
   * @param {HTMLElement} element - Target element
   * @param {Object} options - Positioning options
   */
  position(element, options = {}) {
    const {
      placement = 'auto', // auto, top, bottom, left, right
      offset = 10
    } = options;

    const rect = element.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const arrow = this.tooltip.querySelector('.tutorial-tooltip-arrow');

    // Calculate best placement
    let finalPlacement = placement;
    if (placement === 'auto') {
      // Choose based on available space
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      finalPlacement = spaceBelow > spaceAbove ? 'bottom' : 'top';
    }

    // Position based on placement
    let x, y;

    if (finalPlacement === 'bottom') {
      x = rect.left + rect.width / 2 - tooltipRect.width / 2;
      y = rect.bottom + offset;
      arrow.className = 'tutorial-tooltip-arrow bottom';
    } else if (finalPlacement === 'top') {
      x = rect.left + rect.width / 2 - tooltipRect.width / 2;
      y = rect.top - tooltipRect.height - offset;
      arrow.className = 'tutorial-tooltip-arrow top';
    } else if (finalPlacement === 'left') {
      x = rect.left - tooltipRect.width - offset;
      y = rect.top + rect.height / 2 - tooltipRect.height / 2;
      arrow.className = 'tutorial-tooltip-arrow left';
    } else if (finalPlacement === 'right') {
      x = rect.right + offset;
      y = rect.top + rect.height / 2 - tooltipRect.height / 2;
      arrow.className = 'tutorial-tooltip-arrow right';
    }

    // Keep tooltip on screen
    x = Math.max(10, Math.min(x, window.innerWidth - tooltipRect.width - 10));
    y = Math.max(10, Math.min(y, window.innerHeight - tooltipRect.height - 10));

    // Apply position
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  /**
   * Hide tooltip
   */
  hide() {
    if (this.tooltip) {
      this.tooltip.classList.remove('visible');
    }
    this.currentElement = null;
  }

  /**
   * Remove tooltip from DOM
   */
  destroy() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
    this.currentElement = null;
  }

  /**
   * Update tooltip content without hiding
   * @param {string|Object} content - New content
   */
  update(content) {
    if (!this.tooltip) return;

    const contentElement = this.tooltip.querySelector('.tutorial-tooltip-content');
    if (!contentElement) return;

    if (typeof content === 'string') {
      contentElement.innerHTML = content;
    } else if (content.title || content.text) {
      let html = '';
      if (content.title) {
        html += `<div class="tutorial-tooltip-title">${content.title}</div>`;
      }
      if (content.text) {
        html += content.text;
      }
      contentElement.innerHTML = html;
    }

    // Reposition if we have a current element
    if (this.currentElement) {
      this.position(this.currentElement);
    }
  }
}
