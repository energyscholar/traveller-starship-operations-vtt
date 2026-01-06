/**
 * AR-201: Role & Player Socket Handlers
 *
 * Handles all role and player-related socket events:
 * - Player join/leave
 * - Role assignment/clearing
 * - Character import
 * - Crew updates
 */

import { registerHandler } from './index.js';

// ==================== Player Join ====================

function handlePlayerJoined(data, state, helpers) {
  helpers.showNotification(`${data.slotName} joined the campaign`, 'info');
}

function handleSkillOverride(data, state, helpers) {
  state.guestSkill = data.skillLevel;
  helpers.showNotification(`GM set your ${data.role} skill to ${data.skillLevel}`, 'info');
}

// ==================== Role Management ====================

function handleRoleCleared(data, state, helpers) {
  const roleName = helpers.formatRoleName(data.previousRole);
  state.selectedRole = null;
  helpers.showNotification(`Left ${roleName} station - now off-duty`, 'info');
  // Return to player setup to select new role
  document.getElementById('gm-overlay')?.classList.add('hidden');
  helpers.showScreen('player-setup');
  helpers.renderPlayerSetup();
}

function handleRelievedFromDuty(data, state, helpers) {
  const roleName = helpers.formatRoleName(data.previousRole);
  state.selectedRole = null;
  const message = data.reason
    ? `You have been relieved of ${roleName} duty by ${data.byCaption}: ${data.reason}`
    : `You have been relieved of ${roleName} duty by ${data.byCaption}`;
  helpers.showNotification(message, 'warning');
  // Return to player setup to select new role
  document.getElementById('gm-overlay')?.classList.add('hidden');
  helpers.showScreen('player-setup');
  helpers.renderPlayerSetup();
}

function handleCrewMemberRelieved(data, state, helpers) {
  helpers.showNotification(`${data.slotName} has been relieved of ${helpers.formatRoleName(data.previousRole)} duty`, 'success');
  // Update local crew state - find the relieved crew member and clear their role
  const crewIdx = state.crewOnline.findIndex(c =>
    (c.id && c.id === data.accountId) || (c.accountId && c.accountId === data.accountId)
  );
  if (crewIdx >= 0) {
    state.crewOnline[crewIdx].role = null;
  }
  helpers.renderCrewList();
}

function handleGMRoleAssigned(data, state, helpers) {
  helpers.showNotification(`${data.slotName} assigned to ${helpers.formatRoleName(data.role)}`, 'success');
  helpers.renderCrewList();
}

function handleRoleAssignedByGM(data, state, helpers) {
  state.selectedRole = data.role;
  state.selectedRoleInstance = data.roleInstance || 1;
  helpers.showNotification(`GM assigned you to ${helpers.formatRoleName(data.role)}`, 'info');
  helpers.updateBridgeHeader();
  helpers.updateRoleClass();
  helpers.renderRolePanel();
}

// ==================== Character ====================

function handleCharacterImported(data, state, helpers) {
  if (state.player) {
    state.player.character_data = data.character;
  }
  helpers.renderPlayerSetup();
  helpers.closeModal();
  helpers.showNotification('Character saved', 'success');
}

function handleRolePersonalityUpdated(data, state, helpers) {
  if (state.player && state.player.id === data.playerId) {
    state.player.role_title = data.roleTitle;
    state.player.quirk_text = data.quirkText;
    state.player.quirk_icon = data.quirkIcon;
    helpers.updateRoleQuirkDisplay();
  }
  helpers.showNotification('Station personality saved', 'success');
}

// ==================== Ship & Role Selection ====================

function handleShipSelected(data, state, helpers) {
  state.ship = data.ship;
  state.ship.npcCrew = data.npcCrew || [];
  helpers.renderRoleSelection();
}

function handleRoleAssigned(data, state, helpers) {
  state.selectedRole = data.role;
  helpers.renderPlayerSetup();
}

function handleRoleBumped(data, state, helpers) {
  const { oldRole, newRole, message } = data;
  helpers.debugLog('[OPS] Role bumped:', data);

  state.selectedRole = newRole;
  helpers.showNotification(message || `You have been moved to ${newRole} role`, 'warning', 5000);

  if (state.currentScreen === 'bridge') {
    helpers.renderBridge();
  } else if (state.currentScreen === 'player-setup') {
    helpers.renderPlayerSetup();
  }
}

// ==================== Crew Updates ====================

function handleCrewUpdate(data, state, helpers) {
  helpers.debugLog('[OPS] Crew update received:', data);

  // Update role selection if on player-setup screen
  if (state.currentScreen === 'player-setup') {
    helpers.renderRoleSelection();
  }

  // Update bridge crew display if on bridge screen
  if (state.currentScreen === 'bridge') {
    // Skip GM entries - GM is an observer, not crew
    if (data.role === 'gm' || data.isGM) {
      return;
    }
    // Update crewOnline array with the change
    if (data.crew) {
      // Full crew list provided - filter out any GM entries
      state.crewOnline = data.crew.filter(c => c.role !== 'gm' && !c.isGM);
    } else if (data.action === 'joined' || data.role) {
      // Someone joined or took a role - add/update them
      const existingIdx = state.crewOnline.findIndex(c => c.accountId === data.accountId);
      if (existingIdx >= 0) {
        state.crewOnline[existingIdx].role = data.role;
        state.crewOnline[existingIdx].roleInstance = data.roleInstance;
      } else if (data.slotName || data.accountId) {
        state.crewOnline.push({
          accountId: data.accountId,
          name: data.slotName || data.playerName || 'Unknown',
          role: data.role,
          roleInstance: data.roleInstance,
          isNPC: false,
          character_data: data.character_data || null
        });
      }
    } else if (data.action === 'left' || data.action === 'disconnected' || data.action === 'relieved') {
      // Someone left, disconnected, or was relieved - remove them or clear their role
      const existingIdx = state.crewOnline.findIndex(c => c.accountId === data.accountId);
      if (existingIdx >= 0) {
        if (data.action === 'disconnected') {
          state.crewOnline.splice(existingIdx, 1);
        } else {
          state.crewOnline[existingIdx].role = null;
        }
      }
    }
    helpers.renderCrewList();
  }
}

// ==================== Register All Handlers ====================

registerHandler('ops:playerJoined', handlePlayerJoined);
registerHandler('ops:skillOverride', handleSkillOverride);
registerHandler('ops:roleCleared', handleRoleCleared);
registerHandler('ops:relievedFromDuty', handleRelievedFromDuty);
registerHandler('ops:crewMemberRelieved', handleCrewMemberRelieved);
registerHandler('ops:gmRoleAssigned', handleGMRoleAssigned);
registerHandler('ops:roleAssignedByGM', handleRoleAssignedByGM);
registerHandler('ops:characterImported', handleCharacterImported);
registerHandler('ops:rolePersonalityUpdated', handleRolePersonalityUpdated);
registerHandler('ops:shipSelected', handleShipSelected);
registerHandler('ops:roleAssigned', handleRoleAssigned);
registerHandler('ops:roleBumped', handleRoleBumped);
registerHandler('ops:crewUpdate', handleCrewUpdate);

// Export for testing
export {
  handlePlayerJoined,
  handleSkillOverride,
  handleRoleCleared,
  handleRelievedFromDuty,
  handleCrewMemberRelieved,
  handleGMRoleAssigned,
  handleRoleAssignedByGM,
  handleCharacterImported,
  handleRolePersonalityUpdated,
  handleShipSelected,
  handleRoleAssigned,
  handleRoleBumped,
  handleCrewUpdate
};
