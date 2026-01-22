/**
 * ProcessSession - Terminal implementation of TUISession
 * Wraps process.stdin/stdout for local terminal TUI
 */

const readline = require('readline');
const { TUISession } = require('./session');

class ProcessSession extends TUISession {
  constructor(stdin = process.stdin, stdout = process.stdout) {
    super();
    this._stdin = stdin;
    this._stdout = stdout;
  }

  /**
   * Write to stdout
   * @param {string} str - String to write
   */
  write(str) {
    this._stdout.write(str);
  }

  /**
   * Register input listener on stdin
   * @param {Function} callback - Called with input data
   */
  _registerInput(callback) {
    this._stdin.on('data', callback);
  }

  /**
   * Remove input listener from stdin
   * @param {Function} callback - The callback to remove
   */
  _unregisterInput(callback) {
    this._stdin.off('data', callback);
  }

  /**
   * Set raw mode on stdin
   * @param {boolean} on - Enable or disable raw mode
   */
  setRawMode(on) {
    if (this._stdin.setRawMode) {
      this._stdin.setRawMode(on);
    }
  }

  /**
   * Pause stdin
   */
  pause() {
    this._stdin.pause();
  }

  /**
   * Resume stdin
   */
  resume() {
    this._stdin.resume();
  }

  /**
   * Set stdin encoding
   * @param {string} encoding - Encoding name
   */
  setEncoding(encoding) {
    this._stdin.setEncoding(encoding);
  }

  /**
   * Check if stdin is a TTY
   * @returns {boolean}
   */
  isTTY() {
    return this._stdin.isTTY || false;
  }

  /**
   * Create readline interface using process streams
   * @returns {readline.Interface}
   */
  createReadline() {
    return readline.createInterface({
      input: this._stdin,
      output: this._stdout
    });
  }

  /**
   * Get the underlying stdin stream
   * Used for edge cases requiring direct access
   * @returns {stream.Readable}
   */
  get stdin() {
    return this._stdin;
  }

  /**
   * Get the underlying stdout stream
   * Used for edge cases requiring direct access
   * @returns {stream.Writable}
   */
  get stdout() {
    return this._stdout;
  }
}

module.exports = { ProcessSession };
