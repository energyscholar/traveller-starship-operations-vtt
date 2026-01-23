/**
 * WebSocketSession - Browser implementation of TUISession
 * Relays TUI I/O over Socket.io for web-based terminal
 */

const { TUISession } = require('./session');
const { EventEmitter } = require('events');

/**
 * Adapter that provides readline-like interface over websocket
 * Used by menus that need line-based input (question/answer)
 */
class WebSocketReadline extends EventEmitter {
  constructor(session) {
    super();
    this._session = session;
    this._questionCallback = null;
    this._inputBuffer = '';
    this._closed = false;
  }

  /**
   * Ask a question and wait for line input
   * @param {string} prompt - Prompt to display
   * @param {Function} callback - Called with answer
   */
  question(prompt, callback) {
    if (this._closed) return;
    this._session.write(prompt);
    this._questionCallback = callback;
  }

  /**
   * Handle raw input from websocket
   * @param {string} data - Input data
   */
  handleInput(data) {
    if (this._closed) return;

    for (const char of data) {
      if (char === '\r' || char === '\n') {
        // Line complete
        this._session.write('\r\n');
        const line = this._inputBuffer;
        this._inputBuffer = '';
        if (this._questionCallback) {
          const cb = this._questionCallback;
          this._questionCallback = null;
          cb(line);
        }
        this.emit('line', line);
      } else if (char === '\x7f' || char === '\b') {
        // Backspace
        if (this._inputBuffer.length > 0) {
          this._inputBuffer = this._inputBuffer.slice(0, -1);
          this._session.write('\b \b');
        }
      } else if (char >= ' ') {
        // Printable character
        this._inputBuffer += char;
        this._session.write(char);
      }
    }
  }

  /**
   * Close the readline interface
   */
  close() {
    this._closed = true;
    this._questionCallback = null;
    this._inputBuffer = '';
    this.emit('close');
  }

  /**
   * Set prompt (no-op for websocket)
   */
  setPrompt() {}

  /**
   * Prompt (no-op for websocket)
   */
  prompt() {}
}

class WebSocketSession extends TUISession {
  constructor(socket) {
    super();
    this._socket = socket;
    this._readline = null;
    this._rawMode = false;
  }

  /**
   * Write output to client via socket
   * @param {string} str - String to write
   */
  write(str) {
    this._socket.emit('tui:output', str);
  }

  /**
   * Register input listener
   * @param {Function} callback - Called with input data
   */
  _registerInput(callback) {
    this._inputHandler = (data) => {
      // In raw mode, pass directly to callback
      // In line mode, buffer is handled by readline
      if (this._rawMode && !this._readline) {
        callback(data);
      }
    };
    this._socket.on('tui:input', this._inputHandler);
  }

  /**
   * Remove input listener
   * @param {Function} callback - The callback to remove
   */
  _unregisterInput(callback) {
    if (this._inputHandler) {
      this._socket.off('tui:input', this._inputHandler);
      this._inputHandler = null;
    }
  }

  /**
   * Set raw mode
   * @param {boolean} on - Enable raw mode
   */
  setRawMode(on) {
    this._rawMode = on;
    // Notify client of mode change
    this._socket.emit('tui:mode', { raw: on });
  }

  /**
   * Check if session is a TTY (always true for xterm)
   * @returns {boolean}
   */
  isTTY() {
    return true;
  }

  /**
   * Create readline interface for line-based input
   * @returns {WebSocketReadline}
   */
  createReadline() {
    if (this._readline) {
      this._readline.close();
    }
    this._readline = new WebSocketReadline(this);

    // Forward socket input to readline
    const readlineHandler = (data) => {
      if (this._readline) {
        this._readline.handleInput(data);
      }
    };
    this._socket.on('tui:input', readlineHandler);

    // Store handler for cleanup
    this._readlineHandler = readlineHandler;

    return this._readline;
  }

  /**
   * Close the session and clean up
   */
  close() {
    if (this._readline) {
      this._readline.close();
      this._readline = null;
    }
    if (this._readlineHandler) {
      this._socket.off('tui:input', this._readlineHandler);
      this._readlineHandler = null;
    }
    super.close();
    this._socket.emit('tui:closed');
  }

  /**
   * Get the underlying socket
   * @returns {Socket}
   */
  get socket() {
    return this._socket;
  }
}

module.exports = { WebSocketSession, WebSocketReadline };
