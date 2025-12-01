/**
 * UWP Decoder Module
 * Universal World Profile decoder for Traveller
 *
 * Extracted from app.js for modularization (Autorun 3, Stage 1)
 *
 * UWP Format: Starport Size Atmosphere Hydrographics Population Government Law-TechLevel
 * Example: A867943-D = Class A starport, Size 8, Atmo 6, Hydro 7, Pop 9, Gov 4, Law 3, TL D
 */

import { escapeHtml } from './utils.js';

// UWP Data Tables
export const UWP_DATA = {
  starport: {
    'A': { name: 'Excellent', desc: 'Excellent quality installation. Refined fuel, annual overhaul, shipyard (all sizes)' },
    'B': { name: 'Good', desc: 'Good quality installation. Refined fuel, annual overhaul, shipyard (spacecraft)' },
    'C': { name: 'Routine', desc: 'Routine quality installation. Unrefined fuel, reasonable repair facilities' },
    'D': { name: 'Poor', desc: 'Poor quality installation. Unrefined fuel, no repair facilities' },
    'E': { name: 'Frontier', desc: 'Frontier installation. No fuel, no facilities, just a marked spot' },
    'X': { name: 'None', desc: 'No starport. No provision for spacecraft' }
  },
  size: {
    '0': { name: 'Asteroid', desc: '< 1,000 km diameter, negligible gravity' },
    '1': { name: '1,600 km', desc: '~1,600 km (like Triton), 0.05g' },
    '2': { name: '3,200 km', desc: '~3,200 km (like Luna), 0.15g' },
    '3': { name: '4,800 km', desc: '~4,800 km (like Mercury), 0.25g' },
    '4': { name: '6,400 km', desc: '~6,400 km (like Mars), 0.35g' },
    '5': { name: '8,000 km', desc: '~8,000 km, 0.45g' },
    '6': { name: '9,600 km', desc: '~9,600 km, 0.7g' },
    '7': { name: '11,200 km', desc: '~11,200 km, 0.9g' },
    '8': { name: '12,800 km', desc: '~12,800 km (Earth-like), 1.0g' },
    '9': { name: '14,400 km', desc: '~14,400 km, 1.25g' },
    'A': { name: '16,000 km', desc: '~16,000 km, 1.4g' }
  },
  atmosphere: {
    '0': { name: 'None', desc: 'No atmosphere. Vacc suit required' },
    '1': { name: 'Trace', desc: 'Trace atmosphere. Vacc suit required' },
    '2': { name: 'Very Thin, Tainted', desc: 'Very thin, tainted. Respirator + filter required' },
    '3': { name: 'Very Thin', desc: 'Very thin atmosphere. Respirator required' },
    '4': { name: 'Thin, Tainted', desc: 'Thin, tainted. Filter required' },
    '5': { name: 'Thin', desc: 'Thin but breathable. No equipment needed at low altitudes' },
    '6': { name: 'Standard', desc: 'Standard breathable atmosphere' },
    '7': { name: 'Standard, Tainted', desc: 'Standard, tainted. Filter required' },
    '8': { name: 'Dense', desc: 'Dense but breathable atmosphere' },
    '9': { name: 'Dense, Tainted', desc: 'Dense, tainted. Filter required' },
    'A': { name: 'Exotic', desc: 'Exotic atmosphere. Air supply required' },
    'B': { name: 'Corrosive', desc: 'Corrosive atmosphere. Vacc suit required' },
    'C': { name: 'Insidious', desc: 'Insidious atmosphere. Hostile environment suit required' },
    'D': { name: 'Dense, High', desc: 'Dense, high pressure. Requires special equipment' },
    'E': { name: 'Thin, Low', desc: 'Thin, low pressure. Found at higher elevations' },
    'F': { name: 'Unusual', desc: 'Unusual atmospheric mix. Special conditions' }
  },
  hydrographics: {
    '0': { name: '0-5%', desc: 'Desert world. Less than 5% surface water' },
    '1': { name: '6-15%', desc: 'Dry world. 6-15% surface water' },
    '2': { name: '16-25%', desc: 'Few small seas. 16-25% surface water' },
    '3': { name: '26-35%', desc: 'Small seas and oceans. 26-35% surface water' },
    '4': { name: '36-45%', desc: 'Wet world. 36-45% surface water' },
    '5': { name: '46-55%', desc: 'Large oceans. 46-55% surface water' },
    '6': { name: '56-65%', desc: 'Large oceans. 56-65% surface water' },
    '7': { name: '66-75%', desc: 'Earth-like. 66-75% surface water' },
    '8': { name: '76-85%', desc: 'Water world. 76-85% surface water' },
    '9': { name: '86-95%', desc: 'Only small islands. 86-95% surface water' },
    'A': { name: '96-100%', desc: 'Almost entirely water. 96-100% surface' }
  },
  population: {
    '0': { name: 'None', desc: 'Unpopulated' },
    '1': { name: 'Few', desc: 'A handful (1-99 people)' },
    '2': { name: 'Hundreds', desc: 'Village (100-999)' },
    '3': { name: 'Thousands', desc: 'Small town (1,000-9,999)' },
    '4': { name: 'Tens of thousands', desc: 'Town (10,000-99,999)' },
    '5': { name: 'Hundreds of thousands', desc: 'City (100,000-999,999)' },
    '6': { name: 'Millions', desc: 'Large city (1-9 million)' },
    '7': { name: 'Tens of millions', desc: 'Megacity (10-99 million)' },
    '8': { name: 'Hundreds of millions', desc: 'Nation (100-999 million)' },
    '9': { name: 'Billions', desc: 'Major world (1-9 billion)' },
    'A': { name: 'Tens of billions', desc: 'Crowded (10-99 billion)' },
    'B': { name: 'Hundreds of billions', desc: 'Incredibly crowded (100B+)' },
    'C': { name: 'Trillions', desc: 'World-city (1T+)' }
  },
  government: {
    '0': { name: 'None', desc: 'No government structure. Family bonds or anarchy' },
    '1': { name: 'Company/Corporation', desc: 'Government by corporation or business entity' },
    '2': { name: 'Participating Democracy', desc: 'Direct democracy, citizens vote on issues' },
    '3': { name: 'Self-Perpetuating Oligarchy', desc: 'Small ruling class perpetuates itself' },
    '4': { name: 'Representative Democracy', desc: 'Elected representatives make decisions' },
    '5': { name: 'Feudal Technocracy', desc: 'Technical experts rule, loyalty-based hierarchy' },
    '6': { name: 'Captive Government', desc: 'Controlled by outside force or government' },
    '7': { name: 'Balkanization', desc: 'Multiple competing governments' },
    '8': { name: 'Civil Service Bureaucracy', desc: 'Government by professional civil servants' },
    '9': { name: 'Impersonal Bureaucracy', desc: 'Rigid, faceless bureaucratic structure' },
    'A': { name: 'Charismatic Dictator', desc: 'Rule by single popular leader' },
    'B': { name: 'Non-Charismatic Leader', desc: 'Rule by single unpopular/military leader' },
    'C': { name: 'Charismatic Oligarchy', desc: 'Rule by popular small group' },
    'D': { name: 'Religious Dictatorship', desc: 'Rule by religious organization' },
    'E': { name: 'Religious Autocracy', desc: 'Rule by single religious leader' },
    'F': { name: 'Totalitarian Oligarchy', desc: 'All-powerful small ruling group' }
  },
  law: {
    '0': { name: 'No restrictions', desc: 'No prohibitions. WMD legal' },
    '1': { name: 'Body pistols, explosives banned', desc: 'WMD, poison gas banned' },
    '2': { name: 'Portable energy weapons banned', desc: 'Machine guns, grenades restricted' },
    '3': { name: 'Military weapons banned', desc: 'SMGs, automatic weapons banned' },
    '4': { name: 'Light assault weapons banned', desc: 'Submachine guns banned' },
    '5': { name: 'Personal concealable weapons banned', desc: 'Handguns banned' },
    '6': { name: 'All firearms banned', desc: 'All firearms except shotguns' },
    '7': { name: 'Shotguns banned', desc: 'All guns banned' },
    '8': { name: 'Blade weapons banned', desc: 'All visible weapons banned' },
    '9': { name: 'All weapons banned', desc: 'Any weapon outside home banned' },
    'A': { name: 'All weapons banned', desc: 'All personal weapons banned' },
    'B': { name: 'Rigid control', desc: 'Continental passports, rigid movement control' },
    'C': { name: 'Unrestricted invasion of privacy', desc: 'Constant surveillance, no privacy' },
    'D': { name: 'Paramilitary law enforcement', desc: 'Military police everywhere' },
    'E': { name: 'Full-fledged police state', desc: 'Total control, routine executions' },
    'F': { name: 'Routine oppression', desc: 'Daily oppression, arbitrary punishment' },
    'G': { name: 'Legalized oppression', desc: 'Severe, codified oppression' },
    'H': { name: 'Severe oppression', desc: 'Most activities restricted' },
    'J': { name: 'Total control', desc: 'Only state activities permitted' }
  },
  tech: {
    '0': { name: 'Primitive', desc: 'Stone Age. No technology' },
    '1': { name: 'Bronze/Iron Age', desc: 'Basic metalworking' },
    '2': { name: 'Renaissance', desc: 'Printing press, sail ships' },
    '3': { name: 'Industrial Age', desc: 'Steam power, basic machinery' },
    '4': { name: 'Mechanized Age', desc: 'Internal combustion, electricity' },
    '5': { name: 'Broadcast Age', desc: 'Radio, television, early computers' },
    '6': { name: 'Atomic Age', desc: 'Fission power, early space' },
    '7': { name: 'Space Age', desc: 'Orbital satellites, basic computing' },
    '8': { name: 'Information Age', desc: 'Advanced computing, microsatellites' },
    '9': { name: 'Gravity Control', desc: 'Anti-gravity, fusion power' },
    'A': { name: 'Jump-capable', desc: 'Jump-1 drives, basic gravitic tech' },
    'B': { name: 'Early Stellar', desc: 'Jump-2, advanced gravitic tech' },
    'C': { name: 'Average Stellar', desc: 'Jump-3, plasma weapons' },
    'D': { name: 'High Stellar', desc: 'Jump-4, battle dress, fusion weapons' },
    'E': { name: 'Advanced Stellar', desc: 'Jump-5, black globes' },
    'F': { name: 'Maximum Stellar', desc: 'Jump-6, ultimate tech for Imperium' },
    'G': { name: 'Superscience', desc: 'Beyond standard Imperial tech' }
  }
};

/**
 * Decode a UWP string into component parts
 * @param {string} uwp - Universal World Profile (e.g., "A867943-D")
 * @returns {Object|null} Decoded UWP or null if invalid
 */
export function decodeUWP(uwp) {
  if (!uwp || typeof uwp !== 'string') return null;

  // UWP format: XNNNNNN-N (starport + 6 digits + hyphen + tech)
  const match = uwp.toUpperCase().match(/^([A-EX])([0-9A])([0-9A-F])([0-9A])([0-9A-C])([0-9A-F])([0-9A-J])-([0-9A-G])$/);
  if (!match) return null;

  const [, starport, size, atmo, hydro, pop, gov, law, tech] = match;

  return {
    raw: uwp.toUpperCase(),
    starport: { code: starport, ...UWP_DATA.starport[starport] },
    size: { code: size, ...UWP_DATA.size[size] },
    atmosphere: { code: atmo, ...UWP_DATA.atmosphere[atmo] },
    hydrographics: { code: hydro, ...UWP_DATA.hydrographics[hydro] },
    population: { code: pop, ...UWP_DATA.population[pop] },
    government: { code: gov, ...UWP_DATA.government[gov] },
    law: { code: law, ...UWP_DATA.law[law] },
    tech: { code: tech, ...UWP_DATA.tech[tech] }
  };
}

/**
 * Format decoded UWP as HTML tooltip content
 * @param {Object} decoded - Decoded UWP object from decodeUWP()
 * @returns {string} HTML string for tooltip
 */
export function formatUWPTooltip(decoded) {
  if (!decoded) return 'Invalid UWP';

  return `<div class="uwp-tooltip">
    <div class="uwp-header">${decoded.raw}</div>
    <table class="uwp-table">
      <tr><td class="uwp-label">Starport</td><td class="uwp-code">${decoded.starport.code}</td><td>${decoded.starport.name}</td></tr>
      <tr><td class="uwp-label">Size</td><td class="uwp-code">${decoded.size.code}</td><td>${decoded.size.name}</td></tr>
      <tr><td class="uwp-label">Atmosphere</td><td class="uwp-code">${decoded.atmosphere.code}</td><td>${decoded.atmosphere.name}</td></tr>
      <tr><td class="uwp-label">Hydrographics</td><td class="uwp-code">${decoded.hydrographics.code}</td><td>${decoded.hydrographics.name}</td></tr>
      <tr><td class="uwp-label">Population</td><td class="uwp-code">${decoded.population.code}</td><td>${decoded.population.name}</td></tr>
      <tr><td class="uwp-label">Government</td><td class="uwp-code">${decoded.government.code}</td><td>${decoded.government.name}</td></tr>
      <tr><td class="uwp-label">Law Level</td><td class="uwp-code">${decoded.law.code}</td><td>${decoded.law.name}</td></tr>
      <tr><td class="uwp-label">Tech Level</td><td class="uwp-code">${decoded.tech.code}</td><td>${decoded.tech.name}</td></tr>
    </table>
    <div class="uwp-detail">${decoded.starport.desc}</div>
  </div>`;
}

/**
 * Get short UWP summary for inline display
 * @param {string} uwp - UWP string
 * @returns {string} Short summary
 */
export function getUWPSummary(uwp) {
  const decoded = decodeUWP(uwp);
  if (!decoded) return uwp;
  return `${decoded.starport.name} Starport, TL${decoded.tech.code}, Pop: ${decoded.population.name}`;
}

/**
 * Create a UWP span with tooltip data attribute
 * @param {string} uwp - UWP string
 * @returns {string} HTML span element
 */
export function createUWPSpan(uwp) {
  if (!uwp) return '';
  const decoded = decodeUWP(uwp);
  if (!decoded) return escapeHtml(uwp);
  return `<span class="uwp-code" data-uwp="${escapeHtml(uwp)}">${escapeHtml(uwp)}</span>`;
}

/**
 * Initialize UWP tooltip system with event delegation
 * Uses mouseover/mouseout on document for elements with data-uwp attribute
 */
export function initUWPTooltips() {
  const container = document.getElementById('uwp-tooltip-container');
  if (!container) return;

  let hideTimeout = null;

  // Show tooltip
  function showUWPTooltip(element, uwp) {
    const decoded = decodeUWP(uwp);
    if (!decoded) return;

    container.innerHTML = formatUWPTooltip(decoded);
    container.classList.add('visible');

    // Position tooltip near cursor/element
    const rect = element.getBoundingClientRect();
    const tooltipWidth = 350;
    const tooltipHeight = 280;

    let left = rect.left;
    let top = rect.bottom + 8;

    // Keep tooltip on screen
    if (left + tooltipWidth > window.innerWidth) {
      left = window.innerWidth - tooltipWidth - 16;
    }
    if (top + tooltipHeight > window.innerHeight) {
      top = rect.top - tooltipHeight - 8;
    }

    container.style.left = `${Math.max(8, left)}px`;
    container.style.top = `${Math.max(8, top)}px`;
  }

  // Hide tooltip
  function hideUWPTooltip() {
    container.classList.remove('visible');
  }

  // Event delegation for mouseover
  document.addEventListener('mouseover', (e) => {
    const uwpElement = e.target.closest('[data-uwp]');
    if (uwpElement) {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      showUWPTooltip(uwpElement, uwpElement.dataset.uwp);
    }
  });

  // Event delegation for mouseout
  document.addEventListener('mouseout', (e) => {
    const uwpElement = e.target.closest('[data-uwp]');
    if (uwpElement) {
      hideTimeout = setTimeout(hideUWPTooltip, 150);
    }
  });
}
