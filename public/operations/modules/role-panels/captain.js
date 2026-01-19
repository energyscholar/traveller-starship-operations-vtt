/**
 * AR-204: Captain Role Panel
 * AR-270: UI cleanup with collapsible sections
 * Extracted from role-panels.js for maintainability.
 */

import { escapeHtml } from '../utils.js';
import { getPilotPanel } from './pilot.js';
import { getEngineerPanel } from './engineer.js';
import { getAstrogatorPanel } from './astrogator.js';

/**
 * AR-270: Helper to create collapsible section
 * @param {string} id - Unique section ID
 * @param {string} title - Section title
 * @param {string} content - Section HTML content
 * @param {boolean} defaultOpen - Whether section starts open (default true)
 * @param {string} badge - Optional badge text
 */
function collapsibleSection(id, title, content, defaultOpen = true, badge = '') {
  const storageKey = `captain-section-${id}`;
  // Check localStorage for saved state
  const savedState = localStorage.getItem(storageKey);
  const isOpen = savedState !== null ? savedState === 'open' : defaultOpen;
  const badgeHtml = badge ? `<span class="section-badge">${badge}</span>` : '';

  return `
    <div class="detail-section captain-section-${id} collapsible-section ${isOpen ? 'open' : 'collapsed'}">
      <h4 class="section-header" onclick="window.toggleCaptainSection('${id}')">
        <span class="toggle-icon">${isOpen ? '▼' : '▶'}</span>
        ${title}
        ${badgeHtml}
      </h4>
      <div class="section-content" style="${isOpen ? '' : 'display: none;'}">
        ${content}
      </div>
    </div>
  `;
}

// Expose toggle function
window.toggleCaptainSection = function(id) {
  const section = document.querySelector(`.captain-section-${id}`);
  if (!section) return;

  const content = section.querySelector('.section-content');
  const icon = section.querySelector('.toggle-icon');
  const isOpen = section.classList.contains('open');

  if (isOpen) {
    section.classList.remove('open');
    section.classList.add('collapsed');
    content.style.display = 'none';
    icon.textContent = '▶';
    localStorage.setItem(`captain-section-${id}`, 'closed');
  } else {
    section.classList.remove('collapsed');
    section.classList.add('open');
    content.style.display = '';
    icon.textContent = '▼';
    localStorage.setItem(`captain-section-${id}`, 'open');
  }
};

/**
 * Generate Captain role panel HTML
 * @param {object} shipState - Current ship state
 * @param {object} template - Ship template data
 * @param {object} ship - Full ship object
 * @param {array} crewOnline - Online crew list
 * @param {array} contacts - Sensor contacts
 * @param {array} rescueTargets - Rescue targets
 * @returns {string} HTML string
 */
export function getCaptainPanel(shipState, template, ship, crewOnline, contacts, rescueTargets = []) {
  // AR-131+: Get active sub-panel for captain's role switching
  const activePanel = window.state?.captainActivePanel || 'captain';

  // AR-131+: Tab bar for role switching (always show at top)
  const tabBar = `
    <div class="captain-tab-bar" style="display: flex; gap: 4px; margin-bottom: 12px; padding: 4px; background: var(--bg-tertiary); border-radius: 6px;">
      <button onclick="window.switchCaptainPanel('captain')" class="btn btn-tiny ${activePanel === 'captain' ? 'btn-primary' : 'btn-secondary'}" title="Captain orders and status">
        Captain
      </button>
      <button onclick="window.switchCaptainPanel('astrogator')" class="btn btn-tiny ${activePanel === 'astrogator' ? 'btn-primary' : 'btn-secondary'}" title="Plot jumps and navigation">
        Astrogator
      </button>
      <button onclick="window.switchCaptainPanel('pilot')" class="btn btn-tiny ${activePanel === 'pilot' ? 'btn-primary' : 'btn-secondary'}" title="Ship maneuvering">
        Pilot
      </button>
      <button onclick="window.switchCaptainPanel('engineer')" class="btn btn-tiny ${activePanel === 'engineer' ? 'btn-primary' : 'btn-secondary'}" title="Systems and repairs">
        Engineer
      </button>
    </div>
  `;

  // AR-131+: If showing a different role's panel, delegate to that panel function
  if (activePanel === 'astrogator') {
    // AR-168: Get jumpStatus from window.state for proper IN JUMP display
    const jumpStatus = window.state?.jumpStatus || {};
    const campaign = window.state?.campaign || {};
    const systemStatus = ship?.current_state?.systemStatus || {};
    return tabBar + getAstrogatorPanel(shipState, template, jumpStatus, campaign, systemStatus);
  }
  if (activePanel === 'pilot') {
    // AR-171: Fix signature - getPilotPanel expects (shipState, template, campaign, jumpStatus, flightConditions)
    const campaign = window.state?.campaign || {};
    const jumpStatus = window.state?.jumpStatus || {};
    const flightConditions = window.state?.flightConditions || null;
    return tabBar + getPilotPanel(shipState, template, campaign, jumpStatus, flightConditions);
  }
  if (activePanel === 'engineer') {
    // AR-172: Fix signature - getEngineerPanel expects (shipState, template, systemStatus, damagedSystems, fuelStatus, repairQueue)
    const systemStatus = window.state?.systemStatus || ship?.current_state?.systemStatus || {};
    const damagedSystems = window.state?.damagedSystems || [];
    const fuelStatus = window.state?.fuelStatus || { total: 0, max: 0, breakdown: {} };
    const repairQueue = window.state?.repairQueue || [];
    return tabBar + getEngineerPanel(shipState, template, systemStatus, damagedSystems, fuelStatus, repairQueue);
  }

  // Captain panel content below
  // Count contacts by marking
  const hostileCount = contacts?.filter(c => c.marking === 'hostile').length || 0;
  const unknownCount = contacts?.filter(c => !c.marking || c.marking === 'unknown').length || 0;

  return tabBar + `
    <div class="detail-section captain-contacts-section">
      <h4>Tactical Overview</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Total Contacts:</span>
          <span class="stat-value">${contacts?.length || 0}</span>
        </div>
        <div class="stat-row">
          <span>Hostile:</span>
          <span class="stat-value ${hostileCount > 0 ? 'text-danger' : ''}">${hostileCount}</span>
        </div>
        <div class="stat-row">
          <span>Unknown:</span>
          <span class="stat-value ${unknownCount > 0 ? 'text-warning' : ''}">${unknownCount}</span>
        </div>
      </div>
      ${contacts?.length > 0 ? `
        <div class="contact-marking" style="margin-top: 10px;">
          <label for="mark-contact-select">Mark Contact:</label>
          <select id="mark-contact-select" class="mark-select" style="width: 100%; margin-top: 5px;">
            ${contacts.map(c => `
              <option value="${c.id}">${escapeHtml(c.name || 'Unknown')} - ${c.marking || 'unknown'}</option>
            `).join('')}
          </select>
          <div class="marking-buttons" style="margin-top: 5px; display: flex; gap: 5px;">
            <button onclick="window.captainMarkContact('friendly')" class="btn btn-small btn-success" title="Mark as friendly">Friendly</button>
            <button onclick="window.captainMarkContact('neutral')" class="btn btn-small btn-secondary" title="Mark as neutral">Neutral</button>
            <button onclick="window.captainMarkContact('hostile')" class="btn btn-small btn-danger" title="Mark as hostile">Hostile</button>
          </div>
        </div>
      ` : ''}
    </div>

    <div class="detail-section captain-crew-section">
      <h4>Crew Status</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Online:</span>
          <span class="stat-value">${crewOnline?.length || 0}</span>
        </div>
        <div class="stat-row">
          <span>NPC Crew:</span>
          <span class="stat-value">${ship?.npcCrew?.length || 0}</span>
        </div>
      </div>
      <button onclick="window.captainRequestStatus()" class="btn btn-small btn-secondary" style="margin-top: 10px;" title="Request status from all stations">
        Request Status Report
      </button>
    </div>

    <div class="detail-section captain-leadership-section">
      <h4>Command Actions</h4>
      <div class="leadership-buttons" style="display: flex; gap: 5px; flex-wrap: wrap;">
        <button onclick="window.captainLeadershipCheck()" class="btn btn-small btn-primary" title="Roll Leadership to give DM to next crew action">
          Leadership Check
        </button>
        <button onclick="window.captainTacticsCheck()" class="btn btn-small btn-primary" title="Roll Tactics for initiative bonus">
          Tactics Check
        </button>
      </div>
      <div id="leadership-result" class="leadership-result" style="margin-top: 10px;"></div>
    </div>

    <div class="detail-section captain-nav-orders-section">
      <h4>Navigation Quick Orders</h4>
      <div class="nav-order-buttons" style="display: flex; gap: 5px; flex-wrap: wrap;">
        <button onclick="window.captainNavOrder('emergency_break')" class="btn btn-small btn-danger" title="Emergency braking! All hands brace!">
          Emergency Break
        </button>
        <button onclick="window.captainNavOrder('full_speed')" class="btn btn-small btn-warning" title="Full speed ahead! Maximum thrust!">
          Full Speed
        </button>
        <button onclick="window.captainNavOrder('run_silent')" class="btn btn-small btn-secondary" title="Running silent. Minimize emissions.">
          Run Silent
        </button>
      </div>
      ${contacts?.length > 0 ? `
        <div class="pursue-order" style="margin-top: 8px; display: flex; gap: 5px; align-items: center;">
          <select id="pursue-contact-select" class="pursue-select" style="flex: 1;">
            ${contacts.filter(c => c.marking !== 'friendly').map(c => `
              <option value="${c.id}">${escapeHtml(c.name || 'Unknown')} - ${c.marking || 'unknown'}</option>
            `).join('')}
          </select>
          <button onclick="window.captainNavOrder('pursue')" class="btn btn-small btn-warning" title="Pursue designated contact">
            Pursue
          </button>
        </div>
      ` : ''}
      <div id="nav-order-status" style="margin-top: 8px; font-size: 0.85em; color: var(--text-muted);"></div>
    </div>

    <div class="detail-section captain-orders-section">
      <h4>Standard Orders</h4>
      <div class="order-template-controls" style="display: flex; gap: 5px; align-items: center;">
        <select id="order-template-select" class="order-template-select" style="flex: 1;">
          <option value="battle_stations" data-target="all" data-priority="high">All hands to battle stations!</option>
          <option value="stand_down" data-target="all" data-priority="normal">Stand down. Resume normal operations.</option>
          <option value="hold_fire" data-target="gunner" data-priority="high">Hold fire! Weapons tight!</option>
          <option value="weapons_free" data-target="gunner" data-priority="high">Weapons free! Engage at will!</option>
        </select>
        <button onclick="window.captainIssueOrder()" class="btn btn-small btn-primary" title="Issue selected order">
          Issue
        </button>
      </div>
      <div class="custom-order" style="margin-top: 8px;">
        <input type="text" id="custom-order-text" placeholder="Custom order..." style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-secondary);">
        <div style="display: flex; gap: 5px; margin-top: 5px;">
          <select id="custom-order-target" style="flex: 1;">
            <option value="all">All Crew</option>
            <option value="pilot">Pilot</option>
            <option value="engineer">Engineer</option>
            <option value="gunner">Gunner</option>
            <option value="sensors">Sensors</option>
            <option value="medic">Medic</option>
          </select>
          <button onclick="window.captainIssueCustomOrder()" class="btn btn-small btn-secondary" title="Issue custom order">
            Send
          </button>
        </div>
      </div>
      <div id="order-status" style="margin-top: 8px; font-size: 0.85em; color: var(--text-muted);"></div>
    </div>

    ${rescueTargets.length > 0 ? `
    <div class="detail-section captain-rescue-section">
      <h4>Rescue Priorities (${rescueTargets.length})</h4>
      <div class="rescue-list">
        ${rescueTargets.sort((a, b) => (a.eta || 999) - (b.eta || 999)).map((r, i) => `
          <div class="rescue-item ${r.eta && r.eta < 10 ? 'urgent' : ''}" style="padding: 6px 8px; background: ${i === 0 ? 'rgba(220,53,69,0.15)' : 'var(--bg-secondary)'}; border-radius: 4px; margin: 4px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="rescue-name">${escapeHtml(r.name || 'Unknown')}</span>
              <span class="rescue-count" style="font-weight: bold;">${r.count || '?'} souls</span>
            </div>
            <div style="font-size: 0.85em; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span>${escapeHtml(r.location || '')}</span>
              ${r.eta ? `<span class="${r.eta < 10 ? 'text-danger' : 'text-warning'}">ETA: ${r.eta}m</span>` : ''}
            </div>
            ${r.notes ? `<div style="font-size: 0.8em; font-style: italic; color: var(--text-muted);">${escapeHtml(r.notes)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <div class="detail-section captain-solo-section">
      <h4>Ship Operations (Solo Mode)</h4>
      <p style="color: var(--text-muted); font-size: 0.8em; margin-bottom: 8px;">
        Command all ship functions directly. Skill: Captain=0, Filled Role=1, Skilled Crew=their skill.
      </p>
      <div class="solo-controls" style="display: flex; flex-direction: column; gap: 8px;">
        <div class="solo-group">
          <label style="font-size: 0.85em; color: var(--text-secondary);">Navigation</label>
          <div style="display: flex; gap: 5px; margin-top: 4px;">
            <button id="btn-captain-solo-plot" onclick="window.captainSoloCommand('plotJump')" class="btn btn-small btn-secondary" title="Plot jump course to destination">
              Plot Jump
            </button>
            <button id="btn-captain-solo-verify" onclick="window.captainSoloCommand('verifyPosition')" class="btn btn-small btn-secondary" title="Verify position after jump exit">
              Verify Position
            </button>
          </div>
        </div>
        <div class="solo-group">
          <label style="font-size: 0.85em; color: var(--text-secondary);">Helm</label>
          <div style="display: flex; gap: 5px; margin-top: 4px;">
            <button id="btn-captain-solo-course" onclick="window.captainSoloCommand('setCourse')" class="btn btn-small btn-secondary" title="Set course to destination">
              Set Course
            </button>
          </div>
        </div>
        <div class="solo-group">
          <label style="font-size: 0.85em; color: var(--text-secondary);">Engineering</label>
          <div style="display: flex; gap: 5px; margin-top: 4px;">
            <button id="btn-captain-solo-refuel" onclick="window.captainSoloCommand('refuel')" class="btn btn-small btn-secondary" title="Begin refueling">
              Refuel
            </button>
            <button id="btn-captain-solo-refine" onclick="window.captainSoloCommand('refineFuel')" class="btn btn-small btn-secondary" title="Process unrefined fuel">
              Refine Fuel
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
