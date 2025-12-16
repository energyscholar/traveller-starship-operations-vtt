/**
 * AR-151-3b: Crew Roster Menu Module
 * AR-48: Display crew roster from hamburger menu
 */

import { escapeHtml } from './utils.js';

/**
 * Show crew roster menu modal
 * @param {Object} state - Application state
 * @param {Function} showModalContent - Function to show modal content
 */
export function showCrewRosterMenu(state, showModalContent) {
  const ship = state.ship || {};
  const template = state.shipTemplate || {};
  const npcCrew = ship.npc_crew || template.npcCrew || [];
  const connectedPlayers = state.connectedPlayers || [];

  let html = `
    <div class="modal-header">
      <h2>📋 Crew Roster - ${template.name || 'Ship'}</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body crew-roster">
      <div class="roster-section">
        <h4>Online Crew (${connectedPlayers.length})</h4>
        <div class="roster-list">
  `;

  if (connectedPlayers.length === 0) {
    html += '<div class="roster-empty">No crew currently online</div>';
  } else {
    for (const p of connectedPlayers) {
      const roleLabel = p.role ? p.role.charAt(0).toUpperCase() + p.role.slice(1).replace('_', ' ') : 'Unassigned';
      html += `
        <div class="roster-item online">
          <span class="roster-status">●</span>
          <span class="roster-name">${escapeHtml(p.slotName || p.username || 'Unknown')}</span>
          <span class="roster-role">${roleLabel}</span>
        </div>
      `;
    }
  }

  html += `
        </div>
      </div>
      <div class="roster-section">
        <h4>Ship's Complement (${npcCrew.length} NPC)</h4>
        <div class="roster-list">
  `;

  if (npcCrew.length === 0) {
    html += '<div class="roster-empty">No NPC crew assigned</div>';
  } else {
    for (const npc of npcCrew) {
      html += `
        <div class="roster-item npc">
          <span class="roster-status npc">◆</span>
          <span class="roster-name">${escapeHtml(npc.name || 'NPC')}</span>
          <span class="roster-role">${npc.role || npc.position || 'Crew'}</span>
        </div>
      `;
    }
  }

  html += `
        </div>
      </div>
      <div class="roster-summary" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--border-color);">
        <small>Crew Capacity: ${template.staterooms || '?'} staterooms | Low Berths: ${template.lowBerths || 0}</small>
      </div>
    </div>
  `;

  showModalContent(html);
}
