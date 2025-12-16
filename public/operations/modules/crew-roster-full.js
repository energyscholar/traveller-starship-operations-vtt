/**
 * AR-151-7a: Full Crew Roster Module
 * Stage 11.4: NPC crew management with add/edit/delete
 */

/**
 * Get skill label from level
 * @param {number} level - Skill level
 * @returns {string} Skill label
 */
function getSkillLabel(level) {
  const labels = { 0: 'Green', 1: 'Average', 2: 'Veteran', 3: 'Elite' };
  return labels[level] || 'Average';
}

/**
 * Show full crew roster modal with management controls
 * @param {Object} state - Application state
 * @param {Function} showModalContent - Modal display function
 * @param {Function} showNotification - Notification function
 */
export function showCrewRoster(state, showModalContent, showNotification) {
  const npcCrew = state.ship?.npcCrew || [];
  const isGM = state.isGM;

  let html = `
    <div class="modal-header">
      <h2>Crew Roster</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body crew-roster-body">
  `;

  if (npcCrew.length === 0) {
    html += '<p class="text-muted">No NPC crew members assigned to this ship.</p>';
  } else {
    html += '<div class="crew-roster-list">';
    for (const crew of npcCrew) {
      const statusClass = crew.status === 'active' ? 'active' :
                         crew.status === 'relieved' ? 'relieved' :
                         crew.status === 'injured' ? 'injured' : '';
      html += `
        <div class="crew-roster-item ${statusClass}" data-crew-id="${crew.id}">
          <div class="crew-item-main">
            <span class="crew-name">${crew.name}</span>
            <span class="crew-role">${crew.role}</span>
          </div>
          <div class="crew-item-details">
            <span class="crew-skill">${getSkillLabel(crew.skill_level)}</span>
            ${crew.personality ? `<span class="crew-personality">${crew.personality}</span>` : ''}
            <span class="crew-status">${crew.status || 'active'}</span>
          </div>
          ${isGM ? `
            <div class="crew-item-actions">
              <button class="btn btn-sm btn-secondary" data-edit-crew="${crew.id}">Edit</button>
              <button class="btn btn-sm btn-danger" data-delete-crew="${crew.id}">Remove</button>
            </div>
          ` : ''}
        </div>
      `;
    }
    html += '</div>';
  }

  html += `
    </div>
    <div class="modal-footer">
      ${isGM ? '<button class="btn btn-primary" id="btn-add-crew">Add Crew Member</button>' : ''}
      <button class="btn btn-secondary" data-close-modal>Close</button>
    </div>
  `;

  showModalContent(html);

  // GM actions - use closures to pass dependencies
  if (isGM) {
    document.getElementById('btn-add-crew')?.addEventListener('click', () =>
      showAddCrewModal(state, showModalContent, showNotification));

    document.querySelectorAll('[data-edit-crew]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const crewId = e.target.dataset.editCrew;
        const crew = npcCrew.find(c => c.id === crewId);
        if (crew) showEditCrewModal(state, showModalContent, showNotification, crew);
      });
    });

    document.querySelectorAll('[data-delete-crew]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const crewId = e.target.dataset.deleteCrew;
        if (confirm('Remove this crew member?')) {
          state.socket.emit('ops:deleteNPCCrew', { crewId });
          showNotification('Crew member removed', 'info');
          setTimeout(() => showCrewRoster(state, showModalContent, showNotification), 500);
        }
      });
    });
  }
}

/**
 * Show add crew member modal
 * @param {Object} state - Application state
 * @param {Function} showModalContent - Modal display function
 * @param {Function} showNotification - Notification function
 */
export function showAddCrewModal(state, showModalContent, showNotification) {
  const html = `
    <div class="modal-header">
      <h2>Add Crew Member</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="crew-name" class="form-control" placeholder="Crew member name">
      </div>
      <div class="form-group">
        <label>Role</label>
        <select id="crew-role" class="form-control">
          <option value="pilot">Pilot</option>
          <option value="astrogator">Astrogator</option>
          <option value="engineer">Engineer</option>
          <option value="medic">Medic</option>
          <option value="gunner">Gunner</option>
          <option value="sensor_operator">Sensor Operator</option>
          <option value="steward">Steward</option>
          <option value="marine">Marine</option>
          <option value="deckhand">Deckhand</option>
        </select>
      </div>
      <div class="form-group">
        <label>Skill Level</label>
        <select id="crew-skill" class="form-control">
          <option value="0">Green (+0)</option>
          <option value="1" selected>Average (+1)</option>
          <option value="2">Veteran (+2)</option>
          <option value="3">Elite (+3)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Personality (optional)</label>
        <input type="text" id="crew-personality" class="form-control" placeholder="Brief personality">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="btn-back-roster">Back</button>
      <button class="btn btn-primary" id="btn-save-crew">Add Crew</button>
    </div>
  `;

  showModalContent(html);

  document.getElementById('btn-back-roster').addEventListener('click', () =>
    showCrewRoster(state, showModalContent, showNotification));
  document.getElementById('btn-save-crew').addEventListener('click', () => {
    const name = document.getElementById('crew-name').value.trim();
    const role = document.getElementById('crew-role').value;
    const skillLevel = parseInt(document.getElementById('crew-skill').value);
    const personality = document.getElementById('crew-personality').value.trim();

    if (!name) {
      showNotification('Please enter a name', 'error');
      return;
    }

    state.socket.emit('ops:addNPCCrew', {
      shipId: state.ship.id,
      name,
      role,
      skillLevel,
      personality
    });

    showNotification('Crew member added', 'success');
    setTimeout(() => showCrewRoster(state, showModalContent, showNotification), 500);
  });
}

/**
 * Show edit crew member modal
 * @param {Object} state - Application state
 * @param {Function} showModalContent - Modal display function
 * @param {Function} showNotification - Notification function
 * @param {Object} crew - Crew member data
 */
export function showEditCrewModal(state, showModalContent, showNotification, crew) {
  const html = `
    <div class="modal-header">
      <h2>Edit Crew: ${crew.name}</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="crew-name" class="form-control" value="${crew.name}">
      </div>
      <div class="form-group">
        <label>Role</label>
        <select id="crew-role" class="form-control">
          <option value="pilot" ${crew.role === 'pilot' ? 'selected' : ''}>Pilot</option>
          <option value="astrogator" ${crew.role === 'astrogator' ? 'selected' : ''}>Astrogator</option>
          <option value="engineer" ${crew.role === 'engineer' ? 'selected' : ''}>Engineer</option>
          <option value="medic" ${crew.role === 'medic' ? 'selected' : ''}>Medic</option>
          <option value="gunner" ${crew.role === 'gunner' ? 'selected' : ''}>Gunner</option>
          <option value="sensor_operator" ${crew.role === 'sensor_operator' ? 'selected' : ''}>Sensor Operator</option>
          <option value="steward" ${crew.role === 'steward' ? 'selected' : ''}>Steward</option>
          <option value="marine" ${crew.role === 'marine' ? 'selected' : ''}>Marine</option>
          <option value="deckhand" ${crew.role === 'deckhand' ? 'selected' : ''}>Deckhand</option>
        </select>
      </div>
      <div class="form-group">
        <label>Skill Level</label>
        <select id="crew-skill" class="form-control">
          <option value="0" ${crew.skill_level === 0 ? 'selected' : ''}>Green (+0)</option>
          <option value="1" ${crew.skill_level === 1 ? 'selected' : ''}>Average (+1)</option>
          <option value="2" ${crew.skill_level === 2 ? 'selected' : ''}>Veteran (+2)</option>
          <option value="3" ${crew.skill_level === 3 ? 'selected' : ''}>Elite (+3)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Personality</label>
        <input type="text" id="crew-personality" class="form-control" value="${crew.personality || ''}">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="crew-status" class="form-control">
          <option value="active" ${crew.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="relieved" ${crew.status === 'relieved' ? 'selected' : ''}>Relieved</option>
          <option value="injured" ${crew.status === 'injured' ? 'selected' : ''}>Injured</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="btn-back-roster">Back</button>
      <button class="btn btn-primary" id="btn-update-crew">Update</button>
    </div>
  `;

  showModalContent(html);

  document.getElementById('btn-back-roster').addEventListener('click', () =>
    showCrewRoster(state, showModalContent, showNotification));
  document.getElementById('btn-update-crew').addEventListener('click', () => {
    const name = document.getElementById('crew-name').value.trim();
    const role = document.getElementById('crew-role').value;
    const skillLevel = parseInt(document.getElementById('crew-skill').value);
    const personality = document.getElementById('crew-personality').value.trim();
    const status = document.getElementById('crew-status').value;

    if (!name) {
      showNotification('Please enter a name', 'error');
      return;
    }

    state.socket.emit('ops:updateNPCCrew', {
      crewId: crew.id,
      updates: { name, role, skill_level: skillLevel, personality, status }
    });

    showNotification('Crew member updated', 'success');
    setTimeout(() => showCrewRoster(state, showModalContent, showNotification), 500);
  });
}
