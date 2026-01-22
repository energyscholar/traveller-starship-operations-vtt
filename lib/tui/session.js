/**
 * TUISession - Base class for terminal I/O abstraction
 *
 * Allows TUI menus to run over different transports:
 * - ProcessSession: Terminal (process.stdin/stdout)
 * - WebSocketSession: Browser (future Phase 2)
 */

class TUISession {
  constructor() {
    this._inputListener = null;
  }

  /**
   * Write output to the session
   * @param {string} str - String to write
   */
  write(str) {
    throw new Error('TUISession.write() must be implemented by subclass');
  }

  /**
   * Register input listener
   * SINGLE LISTENER ENFORCED - throws if already registered
   * @param {Function} callback - Called with input data
   */
  onInput(callback) {
    if (this._inputListener !== null) {
      throw new Error('Input listener already registered. Call removeInput() first.');
    }
    this._inputListener = callback;
    this._registerInput(callback);
  }

  /**
   * Remove input listener
   * @param {Function} callback - The callback to remove
   */
  removeInput(callback) {
    if (this._inputListener === callback) {
      this._unregisterInput(callback);
      this._inputListener = null;
    }
  }

  /**
   * Check if input listener is registered
   * @returns {boolean}
   */
  hasInputListener() {
    return this._inputListener !== null;
  }

  // Subclass hooks for actual input registration
  _registerInput(callback) {
    throw new Error('TUISession._registerInput() must be implemented by subclass');
  }

  _unregisterInput(callback) {
    throw new Error('TUISession._unregisterInput() must be implemented by subclass');
  }

  /**
   * Set raw mode for character-at-a-time input
   * @param {boolean} on - Enable or disable raw mode
   */
  setRawMode(on) {
    // Default no-op, override in subclass
  }

  /**
   * Pause input stream
   */
  pause() {
    // Default no-op, override in subclass
  }

  /**
   * Resume input stream
   */
  resume() {
    // Default no-op, override in subclass
  }

  /**
   * Set input encoding
   * @param {string} encoding - Encoding name (e.g., 'utf8')
   */
  setEncoding(encoding) {
    // Default no-op, override in subclass
  }

  /**
   * Check if session is a TTY
   * @returns {boolean}
   */
  isTTY() {
    return false;
  }

  /**
   * Create a readline interface for line-based input
   * Used by battle-viewer and npc-menu for numeric/text input
   * @returns {readline.Interface}
   */
  createReadline() {
    throw new Error('TUISession.createReadline() must be implemented by subclass');
  }

  /**
   * Close the session and clean up resources
   */
  close() {
    if (this._inputListener) {
      this.removeInput(this._inputListener);
    }
  }
}

module.exports = { TUISession };
