/**
 * AR-252: TUI Menu Stack
 *
 * Multi-level menu system for terminal UI combat interface.
 * Supports breadcrumb navigation, ESC to go back, and context preservation.
 *
 * @module lib/combat/menu-stack
 */

/**
 * Menu item structure
 * @typedef {Object} MenuItem
 * @property {string} label - Display label
 * @property {string} [key] - Keyboard shortcut (1-9, or letter)
 * @property {function} [action] - Action to execute when selected
 * @property {MenuItem[]} [submenu] - Nested menu items
 * @property {boolean} [disabled] - Whether item is disabled
 * @property {*} [data] - Additional data for the action
 */

/**
 * Menu state entry
 * @typedef {Object} MenuState
 * @property {string} title - Menu title
 * @property {MenuItem[]} items - Menu items
 * @property {number} selected - Selected index
 * @property {*} context - Context data (e.g., selected weapon)
 */

/**
 * Menu Stack class for managing nested menus
 */
class MenuStack {
  constructor() {
    /** @type {MenuState[]} */
    this.stack = [];
    this.onUpdate = null;
  }

  /**
   * Push a new menu onto the stack
   * @param {string} title - Menu title
   * @param {MenuItem[]} items - Menu items
   * @param {*} context - Context data to preserve
   */
  push(title, items, context = null) {
    this.stack.push({
      title,
      items: items.filter(item => !item.hidden),
      selected: 0,
      context
    });
    this._notify();
  }

  /**
   * Pop the top menu from the stack
   * @returns {MenuState|null} The popped menu state
   */
  pop() {
    if (this.stack.length <= 1) {
      return null; // Don't pop the root menu
    }
    const popped = this.stack.pop();
    this._notify();
    return popped;
  }

  /**
   * Get the current menu state
   * @returns {MenuState|null}
   */
  current() {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  /**
   * Get stack depth
   * @returns {number}
   */
  depth() {
    return this.stack.length;
  }

  /**
   * Check if at root menu
   * @returns {boolean}
   */
  isRoot() {
    return this.stack.length <= 1;
  }

  /**
   * Get breadcrumb trail
   * @returns {string[]}
   */
  getBreadcrumbs() {
    return this.stack.map(s => s.title);
  }

  /**
   * Get formatted breadcrumb string
   * @param {string} separator
   * @returns {string}
   */
  getBreadcrumbString(separator = ' > ') {
    return this.getBreadcrumbs().join(separator);
  }

  /**
   * Move selection up
   */
  selectPrev() {
    const menu = this.current();
    if (!menu || menu.items.length === 0) return;

    let newIndex = menu.selected - 1;
    if (newIndex < 0) newIndex = menu.items.length - 1;

    // Skip disabled items
    let attempts = menu.items.length;
    while (menu.items[newIndex]?.disabled && attempts > 0) {
      newIndex = newIndex - 1;
      if (newIndex < 0) newIndex = menu.items.length - 1;
      attempts--;
    }

    menu.selected = newIndex;
    this._notify();
  }

  /**
   * Move selection down
   */
  selectNext() {
    const menu = this.current();
    if (!menu || menu.items.length === 0) return;

    let newIndex = (menu.selected + 1) % menu.items.length;

    // Skip disabled items
    let attempts = menu.items.length;
    while (menu.items[newIndex]?.disabled && attempts > 0) {
      newIndex = (newIndex + 1) % menu.items.length;
      attempts--;
    }

    menu.selected = newIndex;
    this._notify();
  }

  /**
   * Select by index (1-based for keyboard)
   * @param {number} index - 1-based index
   * @returns {boolean} Whether selection was valid
   */
  selectByNumber(index) {
    const menu = this.current();
    if (!menu) return false;

    const zeroIndex = index - 1;
    if (zeroIndex >= 0 && zeroIndex < menu.items.length) {
      if (!menu.items[zeroIndex].disabled) {
        menu.selected = zeroIndex;
        this._notify();
        return true;
      }
    }
    return false;
  }

  /**
   * Get the currently selected item
   * @returns {MenuItem|null}
   */
  getSelectedItem() {
    const menu = this.current();
    if (!menu || menu.items.length === 0) return null;
    return menu.items[menu.selected] || null;
  }

  /**
   * Execute the selected item's action or enter submenu
   * @returns {*} Action result or null
   */
  executeSelected() {
    const item = this.getSelectedItem();
    if (!item || item.disabled) return null;

    // If has submenu, push it
    if (item.submenu && item.submenu.length > 0) {
      this.push(item.label, item.submenu, item.data);
      return { type: 'submenu', item };
    }

    // If has action, execute it
    if (item.action) {
      const result = item.action(item.data, this.getContext());
      return { type: 'action', item, result };
    }

    return null;
  }

  /**
   * Get accumulated context from stack
   * @returns {object}
   */
  getContext() {
    const context = {};
    for (const state of this.stack) {
      if (state.context) {
        Object.assign(context, state.context);
      }
    }
    return context;
  }

  /**
   * Handle keyboard input
   * @param {string} key - Key pressed
   * @returns {object} Result { handled, action, cancelled }
   */
  handleInput(key) {
    // Number keys 1-9
    if (key >= '1' && key <= '9') {
      if (this.selectByNumber(parseInt(key, 10))) {
        return { handled: true, action: this.executeSelected() };
      }
      return { handled: false };
    }

    switch (key) {
      case 'up':
      case 'k':
        this.selectPrev();
        return { handled: true };

      case 'down':
      case 'j':
        this.selectNext();
        return { handled: true };

      case 'enter':
      case 'return':
        return { handled: true, action: this.executeSelected() };

      case 'escape':
        if (this.isRoot()) {
          return { handled: true, cancelled: true };
        }
        this.pop();
        return { handled: true };

      case 'backspace':
        if (!this.isRoot()) {
          this.pop();
          return { handled: true };
        }
        return { handled: false };

      default:
        return { handled: false };
    }
  }

  /**
   * Clear the stack
   */
  clear() {
    this.stack = [];
    this._notify();
  }

  /**
   * Set update callback
   * @param {function} callback
   */
  setUpdateCallback(callback) {
    this.onUpdate = callback;
  }

  /**
   * Notify of state change
   * @private
   */
  _notify() {
    if (this.onUpdate) {
      this.onUpdate(this);
    }
  }
}

/**
 * Render a menu to ASCII
 * @param {MenuStack} menuStack - Menu stack instance
 * @param {object} options - Render options
 * @returns {string[]} Lines of rendered menu
 */
function renderMenu(menuStack, options = {}) {
  const { width = 40, showBreadcrumbs = true, showHelp = true } = options;
  const menu = menuStack.current();
  if (!menu) return ['(no menu)'];

  const lines = [];

  // Breadcrumbs
  if (showBreadcrumbs && menuStack.depth() > 1) {
    const crumbs = menuStack.getBreadcrumbString(' › ');
    lines.push('┌' + '─'.repeat(width - 2) + '┐');
    lines.push('│ ' + crumbs.slice(0, width - 4).padEnd(width - 4) + ' │');
    lines.push('├' + '─'.repeat(width - 2) + '┤');
  } else {
    lines.push('┌' + '─'.repeat(width - 2) + '┐');
  }

  // Title
  lines.push('│ ' + menu.title.slice(0, width - 4).padEnd(width - 4) + ' │');
  lines.push('├' + '─'.repeat(width - 2) + '┤');

  // Items
  menu.items.forEach((item, i) => {
    const selected = i === menu.selected;
    const marker = selected ? '▶' : ' ';
    const num = i < 9 ? `${i + 1}` : ' ';
    const disabled = item.disabled ? ' (disabled)' : '';
    const hasSubmenu = item.submenu?.length > 0 ? ' →' : '';

    let label = `${marker} ${num}. ${item.label}${disabled}${hasSubmenu}`;
    label = label.slice(0, width - 4).padEnd(width - 4);

    if (item.disabled) {
      label = label.replace(/./g, c => c === ' ' ? ' ' : '░');
    }

    lines.push('│ ' + label + ' │');
  });

  // Help line
  if (showHelp) {
    lines.push('├' + '─'.repeat(width - 2) + '┤');
    const escLabel = menuStack.isRoot() ? 'ESC:Cancel' : 'ESC:Back';
    const helpText = `↑↓:Navigate  Enter:Select  ${escLabel}`;
    lines.push('│ ' + helpText.slice(0, width - 4).padEnd(width - 4) + ' │');
  }

  lines.push('└' + '─'.repeat(width - 2) + '┘');

  return lines;
}

/**
 * Create a menu stack instance
 * @returns {MenuStack}
 */
function createMenuStack() {
  return new MenuStack();
}

module.exports = {
  MenuStack,
  createMenuStack,
  renderMenu
};
