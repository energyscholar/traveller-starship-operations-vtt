/**
 * NPC Formatter for TUI
 * Displays: NPC list, NPC details, dialogue, GM review queue
 */

// ANSI escape codes
const ESC = '\x1b';
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;
const GREEN = `${ESC}[32m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;
const WHITE = `${ESC}[37m`;
const RED = `${ESC}[31m`;
const MAGENTA = `${ESC}[35m`;

// Role colors
const ROLE_COLORS = {
  patron: GREEN,
  ally: CYAN,
  contact: WHITE,
  neutral: DIM,
  enemy: RED
};

// Role icons
const ROLE_ICONS = {
  patron: '$',
  ally: '+',
  contact: '~',
  neutral: '-',
  enemy: '!'
};

/**
 * Format NPC list for display
 * @param {Array} npcs - NPCs from getNPCDossiersByCampaign()
 * @returns {string} Formatted NPC list
 */
function formatNPCList(npcs) {
  const lines = [];

  lines.push(`${CYAN}${BOLD}NPC CONTACTS${RESET}`);
  lines.push('');

  if (!npcs || npcs.length === 0) {
    lines.push(`  ${DIM}No NPCs in this campaign.${RESET}`);
    return lines.join('\n');
  }

  lines.push(`  ${DIM}${npcs.length} NPC(s) available${RESET}`);
  lines.push('');

  npcs.forEach((npc, idx) => {
    const num = idx + 1;
    const name = npc.name || 'Unknown';
    const role = npc.role || 'neutral';
    const roleColor = ROLE_COLORS[role] || DIM;
    const roleIcon = ROLE_ICONS[role] || '?';

    const title = npc.title ? ` - ${npc.title}` : '';
    const location = npc.location_text ? ` @ ${npc.location_text}` : '';

    lines.push(`  ${YELLOW}[${num}]${RESET} ${roleColor}${roleIcon}${RESET} ${WHITE}${name}${RESET}${DIM}${title}${RESET}`);
    if (location) {
      lines.push(`      ${DIM}${location}${RESET}`);
    }
  });

  lines.push('');
  lines.push(`  ${DIM}Press number to view/talk, [R] Review queue, [B] Back${RESET}`);

  return lines.join('\n');
}

/**
 * Format NPC detail view
 * @param {Object} npc - NPC dossier object
 * @param {boolean} isGM - Whether viewer is GM (shows hidden info)
 * @returns {string} Formatted NPC detail
 */
function formatNPCDetail(npc, isGM = false) {
  const lines = [];

  if (!npc) {
    return `  ${YELLOW}NPC not found.${RESET}`;
  }

  const name = npc.name || 'Unknown';
  const role = npc.role || 'neutral';
  const roleColor = ROLE_COLORS[role] || DIM;

  lines.push(`${CYAN}${BOLD}${name}${RESET}`);
  if (npc.title) {
    lines.push(`${DIM}${npc.title}${RESET}`);
  }
  lines.push('');

  // Role and status
  lines.push(`  ${WHITE}Role:${RESET}     ${roleColor}${role.toUpperCase()}${RESET}`);
  if (npc.current_status && npc.current_status !== 'alive') {
    const statusColor = npc.current_status === 'dead' ? RED : YELLOW;
    lines.push(`  ${WHITE}Status:${RESET}   ${statusColor}${npc.current_status.toUpperCase()}${RESET}`);
  }

  // Location
  if (npc.location_text) {
    lines.push(`  ${WHITE}Location:${RESET} ${npc.location_text}`);
  }

  // Personality
  if (npc.personality) {
    lines.push('');
    lines.push(`  ${WHITE}Personality:${RESET}`);
    lines.push(`  ${DIM}${npc.personality}${RESET}`);
  }

  // Public motivation
  if (npc.motivation_public) {
    lines.push('');
    lines.push(`  ${WHITE}Known Goals:${RESET}`);
    lines.push(`  ${npc.motivation_public}`);
  }

  // Hidden motivation (GM only)
  if (isGM && npc.motivation_hidden) {
    lines.push('');
    lines.push(`  ${MAGENTA}Hidden Agenda (GM):${RESET}`);
    lines.push(`  ${MAGENTA}${npc.motivation_hidden}${RESET}`);
  }

  // Background
  if (npc.background) {
    lines.push('');
    lines.push(`  ${WHITE}Background:${RESET}`);
    lines.push(`  ${DIM}${npc.background}${RESET}`);
  }

  // GM notes
  if (isGM && npc.notes) {
    lines.push('');
    lines.push(`  ${MAGENTA}GM Notes:${RESET}`);
    lines.push(`  ${MAGENTA}${npc.notes}${RESET}`);
  }

  return lines.join('\n');
}

/**
 * Format dialogue prompt
 * @param {Object} npc - NPC object
 * @returns {string} Formatted dialogue prompt
 */
function formatDialoguePrompt(npc) {
  const lines = [];

  lines.push(`${CYAN}${BOLD}DIALOGUE WITH ${npc.name.toUpperCase()}${RESET}`);
  lines.push('');
  lines.push(`  ${DIM}Type your message to ${npc.name}.${RESET}`);
  lines.push(`  ${DIM}Press Enter to send, or type 'cancel' to abort.${RESET}`);
  lines.push('');
  lines.push(`  ${WHITE}You say:${RESET}`);

  return lines.join('\n');
}

/**
 * Format AI response
 * @param {Object} response - AI response object
 * @returns {string} Formatted response
 */
function formatAIResponse(response) {
  const lines = [];

  if (response.error) {
    lines.push(`  ${RED}Error: ${response.error}${RESET}`);
    return lines.join('\n');
  }

  if (response.fallback) {
    lines.push(`  ${YELLOW}AI not available.${RESET}`);
    lines.push(`  ${DIM}Configure API key in campaign settings.${RESET}`);
    return lines.join('\n');
  }

  lines.push('');
  lines.push(`  ${GREEN}${response.npcName || 'NPC'} responds:${RESET}`);
  lines.push('');

  // Wrap response text
  const words = (response.response || '').split(' ');
  let line = '  ';
  for (const word of words) {
    if (line.length + word.length > 58) {
      lines.push(line);
      line = '  ';
    }
    line += word + ' ';
  }
  if (line.trim()) {
    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Format GM review queue
 * @param {Array} pending - Pending AI responses
 * @returns {string} Formatted review queue
 */
function formatReviewQueue(pending) {
  const lines = [];

  lines.push(`${MAGENTA}${BOLD}GM REVIEW QUEUE${RESET}`);
  lines.push('');

  if (!pending || pending.length === 0) {
    lines.push(`  ${DIM}No pending AI responses to review.${RESET}`);
    return lines.join('\n');
  }

  lines.push(`  ${YELLOW}${pending.length} response(s) awaiting approval${RESET}`);
  lines.push('');

  pending.forEach((item, idx) => {
    const num = idx + 1;
    const npcName = item.npc_name || 'Unknown NPC';
    const preview = (item.response_text || '').substring(0, 40);

    lines.push(`  ${YELLOW}[${num}]${RESET} ${WHITE}${npcName}${RESET}`);
    lines.push(`      ${DIM}"${preview}..."${RESET}`);
  });

  lines.push('');
  lines.push(`  ${DIM}Press number to review, [B] Back${RESET}`);

  return lines.join('\n');
}

/**
 * Format review detail
 * @param {Object} item - Queue item
 * @returns {string} Formatted review detail
 */
function formatReviewDetail(item) {
  const lines = [];

  lines.push(`${MAGENTA}${BOLD}REVIEW: ${item.npc_name}${RESET}`);
  lines.push('');
  lines.push(`  ${WHITE}Generated Response:${RESET}`);
  lines.push('');

  // Wrap response text
  const words = (item.response_text || '').split(' ');
  let line = '  ';
  for (const word of words) {
    if (line.length + word.length > 58) {
      lines.push(line);
      line = '  ';
    }
    line += word + ' ';
  }
  if (line.trim()) {
    lines.push(line);
  }

  lines.push('');
  lines.push(`  ${GREEN}[A]${RESET} Approve and send`);
  lines.push(`  ${RED}[R]${RESET} Reject`);
  lines.push(`  ${YELLOW}[E]${RESET} Edit before sending`);
  lines.push(`  ${DIM}[B] Back to queue${RESET}`);

  return lines.join('\n');
}

/**
 * Format AI status indicator
 * @param {boolean} hasKey - Whether campaign has API key
 * @returns {string} Status indicator
 */
function formatAIStatus(hasKey) {
  if (hasKey) {
    return `${GREEN}AI Ready${RESET}`;
  }
  return `${DIM}AI Offline (no key)${RESET}`;
}

module.exports = {
  formatNPCList,
  formatNPCDetail,
  formatDialoguePrompt,
  formatAIResponse,
  formatReviewQueue,
  formatReviewDetail,
  formatAIStatus
};
