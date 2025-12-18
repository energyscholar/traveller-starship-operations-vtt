/**
 * AR-201: Character Import Modal Handler
 *
 * Handles file upload, drag-drop, parsing, and save for character import.
 */

import { registerModalHandler } from './index.js';

function setupCharacterImportModal(modal, state, helpers) {
  const { closeModal, parseCharacterText } = helpers;

  const dropZone = document.getElementById('char-file-drop');
  const fileInput = document.getElementById('char-file-input');
  const pasteArea = document.getElementById('char-paste');
  const statusEl = document.getElementById('parse-status');

  // Handle file selection
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      pasteArea.value = e.target.result;
      // Auto-trigger parse
      document.getElementById('btn-parse-character').click();
    };
    reader.onerror = () => {
      statusEl.textContent = 'Error reading file';
      statusEl.className = 'parse-status error';
    };
    reader.readAsText(file);
  };

  // File input change handler
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Drag and drop handlers
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // Click on drop zone opens file dialog
  dropZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'LABEL') {
      fileInput.click();
    }
  });

  // Parse button - extract data from pasted text
  document.getElementById('btn-parse-character').addEventListener('click', () => {
    const text = document.getElementById('char-paste').value.trim();
    const statusEl = document.getElementById('parse-status');

    if (!text) {
      statusEl.textContent = 'Please paste character data first';
      statusEl.className = 'parse-status warning';
      return;
    }

    // Parse the text
    const parsed = parseCharacterText(text);

    // Populate form fields
    if (parsed.name) {
      document.getElementById('char-name').value = parsed.name;
    }

    // Map skills to form fields
    const skillMap = {
      'Pilot': 'skill-pilot',
      'Astrogation': 'skill-astrogation',
      'Engineer': 'skill-engineer',
      'Gunnery': 'skill-gunnery',
      'Sensors': 'skill-sensors',
      'Electronics': 'skill-sensors',
      'Leadership': 'skill-leadership',
      'Tactics': 'skill-tactics'
    };

    for (const [skillName, inputId] of Object.entries(skillMap)) {
      if (parsed.skills[skillName] !== undefined) {
        const el = document.getElementById(inputId);
        if (el) el.value = parsed.skills[skillName];
      }
    }

    // Map stats
    if (parsed.stats.dex) document.getElementById('stat-dex').value = parsed.stats.dex;
    if (parsed.stats.int) document.getElementById('stat-int').value = parsed.stats.int;
    if (parsed.stats.edu) document.getElementById('stat-edu').value = parsed.stats.edu;

    // Show status
    const found = [];
    if (parsed.name) found.push('name');
    if (Object.keys(parsed.skills).length > 0) found.push(`${Object.keys(parsed.skills).length} skills`);
    if (parsed.stats.dex || parsed.stats.int || parsed.stats.edu) found.push('stats');

    if (found.length > 0) {
      statusEl.textContent = `Parsed: ${found.join(', ')}. Review and edit below.`;
      statusEl.className = 'parse-status success';
    } else {
      statusEl.textContent = 'Could not parse any data. Please enter manually.';
      statusEl.className = 'parse-status warning';
    }
  });

  // Save button
  document.getElementById('btn-save-character').addEventListener('click', () => {
    const character = {
      name: document.getElementById('char-name').value.trim(),
      skills: {
        pilot: parseInt(document.getElementById('skill-pilot').value) || 0,
        astrogation: parseInt(document.getElementById('skill-astrogation').value) || 0,
        engineer: parseInt(document.getElementById('skill-engineer').value) || 0,
        gunnery: parseInt(document.getElementById('skill-gunnery').value) || 0,
        sensors: parseInt(document.getElementById('skill-sensors').value) || 0,
        leadership: parseInt(document.getElementById('skill-leadership').value) || 0,
        tactics: parseInt(document.getElementById('skill-tactics').value) || 0
      },
      stats: {
        DEX: parseInt(document.getElementById('stat-dex').value) || 7,
        INT: parseInt(document.getElementById('stat-int').value) || 7,
        EDU: parseInt(document.getElementById('stat-edu').value) || 7
      }
    };

    if (character.name) {
      state.socket.emit('ops:importCharacter', {
        characterData: character
      });
      closeModal();
    }
  });
}

registerModalHandler('template-character-import', setupCharacterImportModal);

export { setupCharacterImportModal };
