/**
 * AR-204: Observer Role Panel
 * Extracted from role-panels.js for maintainability.
 */

import { escapeHtml } from '../utils.js';
import { getPilotPanel } from './pilot.js';
import { getEngineerPanel } from './engineer.js';
import { getAstrogatorPanel } from './astrogator.js';
import { getSensorOperatorPanel } from './sensors.js';
import { getCaptainPanel } from './captain.js';
import { getGunnerPanel } from './gunner.js';
import { getCommsPanel } from './comms.js';

/**
 * AR-69/AR-128: Enhanced Observer Panel with role-watching capability
 * Observer can watch any other role's panel (read-only, buttons hidden)
 * @param {Object} shipState - Current ship state
 * @param {Object} template - Ship template data
 * @param {Object} campaign - Campaign data
 * @param {Object} jumpStatus - Jump status
 * @param {Array} contacts - Sensor contacts
 * @param {Object} context - Full context for watched role rendering
 * @returns {string} Panel HTML
 */
export function getObserverPanel(shipState, template, campaign, jumpStatus = {}, contacts = [], context = {}) {
  // Get current watch role from global state (default: pilot)
  const watchRole = window.observerWatchRole || 'pilot';

  // Role selector dropdown
  const roleOptions = [
    { id: 'pilot', name: 'Pilot' },
    { id: 'astrogator', name: 'Astrogator' },
    { id: 'engineer', name: 'Engineer' },
    { id: 'sensor_operator', name: 'Sensors' },
    { id: 'captain', name: 'Captain' },
    { id: 'gunner', name: 'Gunner' },
    { id: 'comms', name: 'Comms' }
  ];

  const roleSelector = `
    <div class="detail-section observer-role-selector">
      <h4>Observing Role</h4>
      <select id="observer-watch-role" onchange="window.setObserverWatchRole(this.value)" style="width: 100%; padding: 8px; margin-bottom: 8px;">
        ${roleOptions.map(r => `<option value="${r.id}" ${watchRole === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
      </select>
    </div>
  `;

  // Try to render the watched role's panel
  let watchedPanel = '';
  try {
    watchedPanel = getWatchedRolePanel(watchRole, context);
  } catch (e) {
    // AR-128: Fallback to basic info on any error
    console.warn('Observer: Error rendering watched role panel:', e);
    watchedPanel = getBasicObserverInfo(shipState, template, campaign, jumpStatus, contacts);
  }

  return `
    ${roleSelector}
    <div class="observer-watched-panel" style="opacity: 0.9;">
      <div class="observer-watching-label" style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; font-size: 0.8em; color: var(--text-muted);">
        👁 Observing: ${roleOptions.find(r => r.id === watchRole)?.name || watchRole}
      </div>
      ${watchedPanel}
    </div>
    <div class="detail-section observer-note">
      <p style="color: #666; font-size: 0.75em; font-style: italic; margin: 8px 0 0 0;">
        Observer mode: View-only access. Select a crew role to take action.
      </p>
    </div>
  `;
}

/**
 * AR-128: Get watched role's panel with buttons completely hidden
 */
function getWatchedRolePanel(watchRole, context) {
  const { shipState = {}, template = {}, systemStatus = {}, damagedSystems = [],
          fuelStatus, jumpStatus = {}, campaign, contacts = [], crewOnline = [], ship,
          roleInstance = 1, shipWeapons = [], combatLog = [], environmentalData = null,
          repairQueue = [], rescueTargets = [], flightConditions = null } = context;

  let panelHtml = '';

  switch (watchRole) {
    case 'pilot':
      panelHtml = getPilotPanel(shipState, template, campaign, jumpStatus, flightConditions);
      break;
    case 'astrogator':
      panelHtml = getAstrogatorPanel(shipState, template, jumpStatus, campaign, systemStatus);
      break;
    case 'engineer':
      panelHtml = getEngineerPanel(shipState, template, systemStatus, damagedSystems, fuelStatus, repairQueue);
      break;
    case 'sensor_operator':
      panelHtml = getSensorOperatorPanel(shipState, contacts, environmentalData);
      break;
    case 'captain':
      panelHtml = getCaptainPanel(shipState, template, ship, crewOnline, contacts, rescueTargets);
      break;
    case 'gunner':
      panelHtml = getGunnerPanel(shipState, template, contacts, roleInstance, shipWeapons, combatLog);
      break;
    case 'comms':
      panelHtml = getCommsPanel(shipState, contacts, crewOnline);
      break;
    default:
      panelHtml = getPilotPanel(shipState, template, campaign, jumpStatus, flightConditions);
  }

  // AR-128: Strip all buttons and interactive elements completely (not gray)
  let stripped = stripInteractiveElements(panelHtml);

  // AR-298: Add GM-only "Free GM Refuel" button when observing Engineer
  if (watchRole === 'engineer' && window.state?.isGM) {
    const gmRefuelButton = `
      <div class="detail-section gm-controls" style="margin-top: 12px; border-top: 1px solid var(--border-color); padding-top: 12px;">
        <h4 style="color: var(--gm-accent, #ffc107);">GM Controls</h4>
        <button onclick="window.gmFreeRefuel && window.gmFreeRefuel()" class="btn btn-warning" title="Instantly refuel ship to maximum with refined fuel">
          Free GM Refuel
        </button>
      </div>
    `;
    stripped += gmRefuelButton;
  }

  return stripped;
}

/**
 * AR-128: Remove buttons, selects, inputs from panel HTML
 */
function stripInteractiveElements(html) {
  return html
    // Remove button elements completely
    .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '')
    // Remove input elements
    .replace(/<input[^>]*>/gi, '')
    // Remove select elements (but not their display text)
    .replace(/<select[^>]*>[\s\S]*?<\/select>/gi, '<span class="observer-disabled">[Select disabled]</span>')
    // Remove onclick handlers from remaining elements
    .replace(/\sonclick="[^"]*"/gi, '')
    .replace(/\sonchange="[^"]*"/gi, '');
}

/**
 * AR-128: Fallback basic observer info on error
 */
function getBasicObserverInfo(shipState, template, campaign, jumpStatus, contacts) {
  const currentSystem = campaign?.current_system || 'Unknown';
  const currentHex = campaign?.current_hex || '--';
  const fuel = shipState?.fuel ?? template?.fuel ?? 0;
  const fuelCapacity = template?.fuelCapacity || template?.fuel || 40;
  const hull = shipState?.hull ?? template?.hull ?? 0;
  const hullMax = template?.hull || 100;

  return `
    <div class="detail-section">
      <h4>Ship Status</h4>
      <div class="detail-stats">
        <div class="stat-row"><span>System:</span><span class="stat-value">${escapeHtml(currentSystem)} (${escapeHtml(currentHex)})</span></div>
        <div class="stat-row"><span>Hull:</span><span class="stat-value">${hull}/${hullMax}</span></div>
        <div class="stat-row"><span>Fuel:</span><span class="stat-value">${fuel}/${fuelCapacity} tons</span></div>
        ${jumpStatus?.inJump ? `<div class="stat-row"><span>In Jump:</span><span class="stat-value">${jumpStatus.destination}</span></div>` : ''}
      </div>
    </div>
    <div class="detail-section">
      <h4>Contacts (${contacts.length})</h4>
      ${contacts.length > 0 ? contacts.slice(0, 5).map(c => `<div>${escapeHtml(c.name || 'Unknown')}</div>`).join('') : '<p>No contacts</p>'}
    </div>
  `;
}
