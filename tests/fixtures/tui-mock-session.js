/**
 * TUI Mock Session
 *
 * Mock TUISession implementation for testing:
 * - Captures all output
 * - Allows input simulation
 * - Tracks state (rawMode, paused, etc.)
 */

const { EventEmitter } = require('events');
const { TUISession } = require('../../lib/tui/session');

/**
 * MockTUISession - Test double for TUISession
 * Captures output and allows input simulation without real I/O
 */
class MockTUISession extends TUISession {
  constructor() {
    super();
    this._output = [];
    this._rawMode = false;
    this._paused = false;
    this._encoding = 'utf8';
    this._inputQueue = [];
    this._emitter = new EventEmitter();
  }

  /**
   * Write output (captured for inspection)
   * @param {string} str - String to write
   */
  write(str) {
    this._output.push(str);
  }

  /**
   * Get all captured output
   * @returns {string[]} Array of output strings
   */
  getOutput() {
    return this._output;
  }

  /**
   * Get all output as single string
   * @returns {string} Concatenated output
   */
  getOutputText() {
    return this._output.join('');
  }

  /**
   * Clear captured output
   */
  clearOutput() {
    this._output = [];
  }

  /**
   * Simulate input from user
   * @param {string} data - Input data to simulate
   */
  simulateInput(data) {
    if (this._inputListener) {
      this._inputListener(data);
    }
    this._emitter.emit('data', data);
  }

  /**
   * Simulate key press
   * @param {string} key - Single character or escape sequence
   */
  simulateKey(key) {
    this.simulateInput(key);
  }

  /**
   * Simulate line input (adds newline)
   * @param {string} line - Line to input
   */
  simulateLine(line) {
    this.simulateInput(line + '\n');
  }

  /**
   * Register input handler
   * @param {Function} callback - Input handler
   */
  _registerInput(callback) {
    this._emitter.on('data', callback);
  }

  /**
   * Unregister input handler
   * @param {Function} callback - Input handler to remove
   */
  _unregisterInput(callback) {
    this._emitter.off('data', callback);
  }

  /**
   * Set raw mode (tracked for assertions)
   * @param {boolean} on - Enable raw mode
   */
  setRawMode(on) {
    this._rawMode = on;
  }

  /**
   * Check if in raw mode
   * @returns {boolean}
   */
  isRawMode() {
    return this._rawMode;
  }

  /**
   * Pause (tracked for assertions)
   */
  pause() {
    this._paused = true;
  }

  /**
   * Resume (tracked for assertions)
   */
  resume() {
    this._paused = false;
  }

  /**
   * Check if paused
   * @returns {boolean}
   */
  isPaused() {
    return this._paused;
  }

  /**
   * Set encoding (tracked for assertions)
   * @param {string} encoding - Encoding name
   */
  setEncoding(encoding) {
    this._encoding = encoding;
  }

  /**
   * Get current encoding
   * @returns {string}
   */
  getEncoding() {
    return this._encoding;
  }

  /**
   * Mock is always TTY
   * @returns {boolean}
   */
  isTTY() {
    return true;
  }

  /**
   * Create mock readline interface
   * @returns {Object} Mock readline
   */
  createReadline() {
    const self = this;
    return {
      _questionCallback: null,
      question(prompt, callback) {
        self.write(prompt);
        this._questionCallback = callback;
      },
      close() {
        this._questionCallback = null;
      },
      // Allow tests to simulate answer
      simulateAnswer(answer) {
        if (this._questionCallback) {
          const cb = this._questionCallback;
          this._questionCallback = null;
          cb(answer);
        }
      }
    };
  }

  /**
   * Check if output contains a string
   * @param {string} str - String to search for
   * @returns {boolean}
   */
  outputContains(str) {
    return this.getOutputText().includes(str);
  }

  /**
   * Check if output matches regex
   * @param {RegExp} pattern - Pattern to match
   * @returns {boolean}
   */
  outputMatches(pattern) {
    return pattern.test(this.getOutputText());
  }

  /**
   * Get last output item
   * @returns {string|undefined}
   */
  getLastOutput() {
    return this._output[this._output.length - 1];
  }

  /**
   * Reset all state
   */
  reset() {
    this._output = [];
    this._rawMode = false;
    this._paused = false;
    this._encoding = 'utf8';
    if (this._inputListener) {
      this.removeInput(this._inputListener);
    }
  }
}

module.exports = { MockTUISession };
