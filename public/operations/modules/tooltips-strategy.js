/**
 * Tooltip Strategy Module
 * AR-15.1: Hybrid tooltip system with performance monitoring
 *
 * Provides both native (title attr) and rich (custom div) tooltips
 * with automatic selection based on content complexity.
 */

// Performance threshold (ms)
const PERF_THRESHOLD = 16;

// Active rich tooltip element
let activeTooltip = null;
let tooltipTimeout = null;

// Performance stats (debug only)
const perfStats = {
  renders: 0,
  slowRenders: 0,
  avgRenderTime: 0,
  totalRenderTime: 0
};

/**
 * Simple tooltip using native title attribute
 * Best for: single-line hints, button descriptions
 * @param {HTMLElement} el - Element to add tooltip to
 * @param {string} text - Tooltip text
 */
export function simple(el, text) {
  if (!el || !text) return;
  el.setAttribute('title', text);
  el.setAttribute('data-tooltip-type', 'simple');
}

/**
 * Rich tooltip using custom styled div
 * Best for: multi-line content, character sheets, ship stats
 * @param {HTMLElement} el - Element to add tooltip to
 * @param {string|Function} content - HTML content or function returning HTML
 * @param {Object} options - Tooltip options
 * @param {string} options.position - 'top' | 'bottom' | 'left' | 'right' (default: 'bottom')
 * @param {number} options.delay - Show delay in ms (default: 200)
 * @param {string} options.className - Additional CSS class
 */
export function rich(el, content, options = {}) {
  if (!el) return;

  const { position = 'bottom', delay = 200, className = '' } = options;

  el.setAttribute('data-tooltip-type', 'rich');
  el.setAttribute('data-tooltip-position', position);
  if (className) el.setAttribute('data-tooltip-class', className);

  // Store content (string or function)
  el._tooltipContent = content;
  el._tooltipDelay = delay;

  // Add event listeners if not already added
  if (!el._tooltipInitialized) {
    el.addEventListener('mouseenter', handleRichTooltipEnter);
    el.addEventListener('mouseleave', handleRichTooltipLeave);
    el.addEventListener('focus', handleRichTooltipEnter);
    el.addEventListener('blur', handleRichTooltipLeave);
    el._tooltipInitialized = true;
  }
}

/**
 * Auto-select tooltip type based on content complexity
 * @param {HTMLElement} el - Element to add tooltip to
 * @param {string|Object} content - Content (string for simple, object for rich)
 * @param {Object} options - Options for rich tooltips
 */
export function choose(el, content, options = {}) {
  if (!el || !content) return;

  // If content is a plain string under 60 chars, use simple
  if (typeof content === 'string' && content.length < 60 && !content.includes('\n')) {
    simple(el, content);
  } else {
    rich(el, content, options);
  }
}

/**
 * Remove tooltip from element
 * @param {HTMLElement} el - Element to remove tooltip from
 */
export function remove(el) {
  if (!el) return;

  el.removeAttribute('title');
  el.removeAttribute('data-tooltip-type');
  el.removeAttribute('data-tooltip-position');
  el.removeAttribute('data-tooltip-class');

  if (el._tooltipInitialized) {
    el.removeEventListener('mouseenter', handleRichTooltipEnter);
    el.removeEventListener('mouseleave', handleRichTooltipLeave);
    el.removeEventListener('focus', handleRichTooltipEnter);
    el.removeEventListener('blur', handleRichTooltipLeave);
    el._tooltipInitialized = false;
  }

  delete el._tooltipContent;
  delete el._tooltipDelay;
}

// === Private handlers ===

function handleRichTooltipEnter(e) {
  const el = e.currentTarget;
  const delay = el._tooltipDelay || 200;

  if (tooltipTimeout) clearTimeout(tooltipTimeout);

  tooltipTimeout = setTimeout(() => {
    showRichTooltip(el);
  }, delay);
}

function handleRichTooltipLeave() {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
  }
  hideRichTooltip();
}

function showRichTooltip(el) {
  const startTime = performance.now();

  // Get content
  let content = el._tooltipContent;
  if (typeof content === 'function') {
    content = content();
  }
  if (!content) return;

  // Hide existing
  hideRichTooltip();

  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'rich-tooltip';
  tooltip.setAttribute('role', 'tooltip');

  const position = el.getAttribute('data-tooltip-position') || 'bottom';
  tooltip.classList.add(`tooltip-${position}`);

  const extraClass = el.getAttribute('data-tooltip-class');
  if (extraClass) tooltip.classList.add(extraClass);

  tooltip.innerHTML = content;
  document.body.appendChild(tooltip);

  // Position tooltip
  positionTooltip(tooltip, el, position);

  // Show with animation
  requestAnimationFrame(() => {
    tooltip.classList.add('visible');
  });

  activeTooltip = tooltip;

  // Performance tracking
  const renderTime = performance.now() - startTime;
  trackPerformance(renderTime);
}

function hideRichTooltip() {
  if (activeTooltip) {
    activeTooltip.classList.remove('visible');
    setTimeout(() => {
      if (activeTooltip && activeTooltip.parentNode) {
        activeTooltip.parentNode.removeChild(activeTooltip);
      }
      activeTooltip = null;
    }, 150);
  }
}

function positionTooltip(tooltip, target, position) {
  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const padding = 8;

  let left, top;

  switch (position) {
    case 'top':
      left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
      top = targetRect.top - tooltipRect.height - padding;
      break;
    case 'bottom':
      left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
      top = targetRect.bottom + padding;
      break;
    case 'left':
      left = targetRect.left - tooltipRect.width - padding;
      top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      break;
    case 'right':
      left = targetRect.right + padding;
      top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      break;
    default:
      left = targetRect.left;
      top = targetRect.bottom + padding;
  }

  // Keep on screen
  const margin = 8;
  left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin));

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function trackPerformance(renderTime) {
  perfStats.renders++;
  perfStats.totalRenderTime += renderTime;
  perfStats.avgRenderTime = perfStats.totalRenderTime / perfStats.renders;

  if (renderTime > PERF_THRESHOLD) {
    perfStats.slowRenders++;
    // Debug warning only on localhost
    if (['localhost', '127.0.0.1'].includes(location.hostname)) {
      console.warn(`[Tooltip] Slow render: ${renderTime.toFixed(2)}ms (threshold: ${PERF_THRESHOLD}ms)`);
    }
  }
}

/**
 * Get performance statistics (for debug panel)
 * @returns {Object} Performance stats
 */
export function getPerformanceStats() {
  return {
    ...perfStats,
    avgRenderTime: perfStats.avgRenderTime.toFixed(2)
  };
}

/**
 * Initialize tooltip system - adds CSS and global handlers
 */
export function init() {
  // Add tooltip styles if not present
  if (!document.getElementById('tooltip-strategy-styles')) {
    const style = document.createElement('style');
    style.id = 'tooltip-strategy-styles';
    style.textContent = `
      .rich-tooltip {
        position: fixed;
        z-index: 10000;
        background: var(--bg-dark, #1a1a2e);
        border: 1px solid var(--border-color, #333);
        border-radius: 4px;
        padding: 8px 12px;
        color: var(--text-primary, #e0e0e0);
        font-size: 0.85rem;
        max-width: 320px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.15s ease, transform 0.15s ease;
        pointer-events: none;
      }

      .rich-tooltip.visible {
        opacity: 1;
        transform: translateY(0);
      }

      .rich-tooltip.tooltip-top {
        transform: translateY(-4px);
      }
      .rich-tooltip.tooltip-top.visible {
        transform: translateY(0);
      }

      .rich-tooltip.tooltip-left {
        transform: translateX(-4px);
      }
      .rich-tooltip.tooltip-left.visible {
        transform: translateX(0);
      }

      .rich-tooltip.tooltip-right {
        transform: translateX(4px);
      }
      .rich-tooltip.tooltip-right.visible {
        transform: translateX(0);
      }

      /* Tooltip content styles */
      .rich-tooltip h4 {
        margin: 0 0 4px 0;
        font-size: 0.9rem;
        color: var(--accent-color, #4a9eff);
      }

      .rich-tooltip .tooltip-row {
        display: flex;
        justify-content: space-between;
        margin: 2px 0;
      }

      .rich-tooltip .tooltip-label {
        color: var(--text-secondary, #888);
      }

      .rich-tooltip .tooltip-value {
        color: var(--text-primary, #e0e0e0);
        font-weight: 500;
      }

      .rich-tooltip .tooltip-hint {
        font-style: italic;
        color: var(--text-secondary, #888);
        font-size: 0.8rem;
        margin-top: 4px;
      }
    `;
    document.head.appendChild(style);
  }
}

// Export default object for convenient import
export default {
  simple,
  rich,
  choose,
  remove,
  init,
  getPerformanceStats
};
