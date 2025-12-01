/**
 * Tooltips Module
 * Character tooltip functionality for Operations VTT
 *
 * Extracted from app.js for modularization (Autorun 3, Stage 1)
 */

import { escapeHtml } from './utils.js';

/**
 * Format skill name (capitalize, replace underscores)
 * @param {string} skill - Skill identifier
 * @returns {string} Formatted skill name
 */
export function formatSkillName(skill) {
  return skill.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

/**
 * Format character data as HTML tooltip content
 * @param {Object} charData - Character data object
 * @returns {string} HTML string for tooltip
 */
export function formatCharacterTooltip(charData) {
  if (!charData) return 'No character data';

  const name = charData.name || 'Unknown';
  const skills = charData.skills || {};
  const stats = charData.stats || {};

  // Format stats (STR, DEX, END, INT, EDU, SOC)
  const statLabels = ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'];
  const statsHtml = statLabels.map(stat => {
    const value = stats[stat] || stats[stat.toLowerCase()] || '-';
    return `<span class="char-stat"><span class="stat-label">${stat}</span><span class="stat-value">${value}</span></span>`;
  }).join('');

  // Format skills (sorted by value descending, then alphabetically)
  const skillEntries = Object.entries(skills)
    .filter(([, v]) => v >= 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const skillsHtml = skillEntries.length > 0
    ? skillEntries.map(([skill, level]) =>
        `<span class="char-skill">${formatSkillName(skill)}-${level}</span>`
      ).join('')
    : '<span class="no-skills">No skills</span>';

  return `<div class="character-tooltip">
    <div class="char-header">
      <span class="char-portrait">&#128100;</span>
      <span class="char-name">${escapeHtml(name)}</span>
    </div>
    <div class="char-stats">${statsHtml}</div>
    <div class="char-skills-section">
      <div class="char-skills-label">Skills</div>
      <div class="char-skills">${skillsHtml}</div>
    </div>
  </div>`;
}

/**
 * Initialize character tooltip system
 * Uses event delegation for elements with data-character attribute
 */
export function initCharacterTooltips() {
  const container = document.getElementById('character-tooltip-container');
  if (!container) return;

  let hideTimeout = null;

  function showCharacterTooltip(element) {
    try {
      const charData = JSON.parse(element.dataset.character);
      if (!charData) return;

      container.innerHTML = formatCharacterTooltip(charData);
      container.classList.add('visible');

      const rect = element.getBoundingClientRect();
      const tooltipWidth = 280;
      const tooltipHeight = 200;

      let left = rect.left;
      let top = rect.bottom + 8;

      if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 16;
      }
      if (top + tooltipHeight > window.innerHeight) {
        top = rect.top - tooltipHeight - 8;
      }

      container.style.left = `${Math.max(8, left)}px`;
      container.style.top = `${Math.max(8, top)}px`;
    } catch {
      // Invalid JSON, ignore
    }
  }

  function hideCharacterTooltip() {
    container.classList.remove('visible');
  }

  document.addEventListener('mouseover', (e) => {
    const charElement = e.target.closest('[data-character]');
    if (charElement) {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      showCharacterTooltip(charElement);
    }
  });

  document.addEventListener('mouseout', (e) => {
    const charElement = e.target.closest('[data-character]');
    if (charElement) {
      hideTimeout = setTimeout(hideCharacterTooltip, 150);
    }
  });
}
