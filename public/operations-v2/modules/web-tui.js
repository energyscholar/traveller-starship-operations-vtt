/**
 * Web TUI Module
 * Connects xterm.js terminal to server TUI via Socket.io
 */

const WebTUI = {
  terminal: null,
  fitAddon: null,
  socket: null,
  isConnected: false,
  overlay: null,

  /**
   * Initialize the Web TUI module
   * @param {Socket} socket - Socket.io instance
   */
  init(socket) {
    this.socket = socket;
    this.setupSocketHandlers();
  },

  /**
   * Setup socket event handlers
   */
  setupSocketHandlers() {
    if (!this.socket) return;

    this.socket.on('tui:connected', () => {
      console.log('[WebTUI] Connected to server TUI');
      this.isConnected = true;
    });

    this.socket.on('tui:output', (data) => {
      if (this.terminal) {
        this.terminal.write(data);
      }
    });

    this.socket.on('tui:mode', (data) => {
      console.log('[WebTUI] Mode change:', data);
    });

    this.socket.on('tui:closed', () => {
      console.log('[WebTUI] Server TUI closed');
      this.isConnected = false;
      this.close();
    });

    this.socket.on('tui:error', (data) => {
      console.error('[WebTUI] Error:', data.message);
      if (this.terminal) {
        this.terminal.write(`\r\n\x1b[31mError: ${data.message}\x1b[0m\r\n`);
      }
    });
  },

  /**
   * Load xterm.js scripts dynamically
   * @returns {Promise}
   */
  async loadXterm() {
    // Check if already loaded
    if (window.Terminal) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // Load CSS
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.css';
      document.head.appendChild(css);

      // Load xterm.js
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js';
      script.onload = () => {
        // Load fit addon
        const fitScript = document.createElement('script');
        fitScript.src = 'https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js';
        fitScript.onload = resolve;
        fitScript.onerror = reject;
        document.head.appendChild(fitScript);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  /**
   * Create the TUI overlay
   */
  createOverlay() {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.id = 'web-tui-overlay';
    this.overlay.className = 'web-tui-overlay';
    this.overlay.innerHTML = `
      <div class="web-tui-header">
        <span class="web-tui-title">TUI Terminal</span>
        <button class="web-tui-close" onclick="WebTUI.close()">&times;</button>
      </div>
      <div id="web-tui-terminal" class="web-tui-terminal"></div>
    `;
    document.body.appendChild(this.overlay);
  },

  /**
   * Open the TUI terminal
   */
  async open() {
    // Check for mobile
    if (this.isMobile()) {
      if (!confirm('TUI mode works best on desktop. Continue anyway?')) {
        return;
      }
    }

    try {
      // Load xterm if needed
      await this.loadXterm();

      // Create overlay
      this.createOverlay();
      this.overlay.classList.add('visible');

      // Create terminal
      const termContainer = document.getElementById('web-tui-terminal');
      this.terminal = new window.Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#0a0a1a',
          foreground: '#eee',
          cursor: '#00d4ff',
          cursorAccent: '#0a0a1a',
          selection: 'rgba(0, 212, 255, 0.3)',
          black: '#000000',
          red: '#ff4444',
          green: '#00ff88',
          yellow: '#ffdd00',
          blue: '#00d4ff',
          magenta: '#ff44ff',
          cyan: '#00d4ff',
          white: '#ffffff',
          brightBlack: '#666666',
          brightRed: '#ff6666',
          brightGreen: '#88ff88',
          brightYellow: '#ffff00',
          brightBlue: '#66ccff',
          brightMagenta: '#ff88ff',
          brightCyan: '#88ffff',
          brightWhite: '#ffffff'
        }
      });

      // Setup fit addon
      if (window.FitAddon) {
        this.fitAddon = new window.FitAddon.FitAddon();
        this.terminal.loadAddon(this.fitAddon);
      }

      // Open terminal
      this.terminal.open(termContainer);

      // Fit to container
      if (this.fitAddon) {
        this.fitAddon.fit();
      }

      // Handle keyboard input
      this.terminal.onData((data) => {
        if (this.socket && this.isConnected) {
          this.socket.emit('tui:input', data);
        }
      });

      // Handle resize
      window.addEventListener('resize', this.handleResize.bind(this));

      // Connect to server TUI
      this.socket.emit('tui:connect');

      // Focus terminal
      this.terminal.focus();

    } catch (err) {
      console.error('[WebTUI] Failed to open:', err);
      alert('Failed to load terminal. Please try again.');
    }
  },

  /**
   * Close the TUI terminal
   */
  close() {
    // Disconnect from server
    if (this.socket && this.isConnected) {
      this.socket.emit('tui:disconnect');
      this.isConnected = false;
    }

    // Remove resize handler
    window.removeEventListener('resize', this.handleResize.bind(this));

    // Dispose terminal
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }
    this.fitAddon = null;

    // Hide overlay
    if (this.overlay) {
      this.overlay.classList.remove('visible');
    }
  },

  /**
   * Handle window resize
   */
  handleResize() {
    if (this.fitAddon && this.terminal) {
      this.fitAddon.fit();
    }
  },

  /**
   * Check if on mobile device
   * @returns {boolean}
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
};

// Export for global access
window.WebTUI = WebTUI;
