/**
 * Battle Console Module for V2
 * Text-based combat interface with socket event handling
 */

(function() {
  'use strict';

  /**
   * Convert ANSI escape codes to HTML spans
   * @param {string} text - Text with ANSI codes
   * @returns {string} HTML with span classes
   */
  function ansiToHtml(text) {
    if (!text) return '';

    return text
      .replace(/\x1b\[1m/g, '<span class="ansi-bold">')
      .replace(/\x1b\[2m/g, '<span class="ansi-dim">')
      .replace(/\x1b\[31m/g, '<span class="ansi-red">')
      .replace(/\x1b\[32m/g, '<span class="ansi-green">')
      .replace(/\x1b\[33m/g, '<span class="ansi-yellow">')
      .replace(/\x1b\[34m/g, '<span class="ansi-blue">')
      .replace(/\x1b\[35m/g, '<span class="ansi-magenta">')
      .replace(/\x1b\[36m/g, '<span class="ansi-cyan">')
      .replace(/\x1b\[37m/g, '<span class="ansi-white">')
      .replace(/\x1b\[0m/g, '</span>')
      .replace(/\x1b\[\d+m/g, ''); // Remove unhandled codes
  }

  /**
   * Append narration text to console output
   * @param {string} text - Text to append (may contain ANSI codes)
   */
  function appendNarration(text) {
    const output = document.getElementById('battle-console-output');
    if (!output) return;

    const line = document.createElement('div');
    line.className = 'console-line';
    line.innerHTML = ansiToHtml(text);
    output.appendChild(line);

    // Auto-scroll to bottom
    output.scrollTop = output.scrollHeight;
  }

  /**
   * Update phase display
   * @param {string} phase - Current combat phase
   */
  function updatePhase(phase) {
    const phaseEl = document.getElementById('console-phase');
    if (phaseEl) {
      phaseEl.textContent = 'Phase: ' + (phase || '--');
    }
  }

  /**
   * Update round display
   * @param {number} round - Current combat round
   */
  function updateRound(round) {
    const roundEl = document.getElementById('console-round');
    if (roundEl) {
      roundEl.textContent = 'Round: ' + (round || '--');
    }
  }

  /**
   * Show battle console screen
   * @param {Object} socket - Socket.io socket
   */
  function showBattleConsole(socket) {
    const screen = document.getElementById('battle-console-screen');
    if (!screen) return;

    screen.classList.add('active');

    // Clear previous output
    const output = document.getElementById('battle-console-output');
    if (output) {
      output.innerHTML = '<div class="console-line ansi-dim">Battle console active. Awaiting combat data...</div>';
    }

    // Set up socket listeners
    if (socket) {
      socket.on('ops:combatNarration', function(data) {
        appendNarration(data.message);
      });
      socket.on('ops:combatStarted', function(data) {
        appendNarration('COMBAT STARTED');
        if (data && data.round) updateRound(data.round);
      });
      socket.on('ops:phaseChanged', function(data) {
        appendNarration('Phase: ' + data.phase);
        updatePhase(data.phase);
        if (data.round) updateRound(data.round);
      });
      socket.on('ops:turnPrompt', function(data) {
        appendNarration(data.role + ': ' + data.message);
      });
      socket.on('ops:combatEnded', function() {
        appendNarration('COMBAT ENDED');
        updatePhase('--');
        updateRound('--');
      });
    }

    // Close button handler
    const closeBtn = document.getElementById('btn-close-battle-console');
    if (closeBtn) {
      closeBtn.onclick = function() {
        hideBattleConsole(socket);
      };
    }
  }

  /**
   * Hide battle console screen
   * @param {Object} socket - Socket.io socket
   */
  function hideBattleConsole(socket) {
    const screen = document.getElementById('battle-console-screen');
    if (screen) {
      screen.classList.remove('active');
    }

    // Clean up socket listeners
    if (socket) {
      socket.off('ops:combatNarration');
      socket.off('ops:combatStarted');
      socket.off('ops:phaseChanged');
      socket.off('ops:turnPrompt');
      socket.off('ops:combatEnded');
    }
  }

  // Export to window for V2 app.js access
  window.BattleConsole = {
    show: showBattleConsole,
    hide: hideBattleConsole,
    appendNarration: appendNarration,
    updatePhase: updatePhase,
    updateRound: updateRound
  };

})();
