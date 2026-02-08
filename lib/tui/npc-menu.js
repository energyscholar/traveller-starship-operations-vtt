/**
 * NPC Menu for TUI
 * List NPCs, dialogue, GM review queue
 */

const {
  formatNPCList,
  formatNPCDetail,
  formatDialoguePrompt,
  formatAIResponse,
  formatReviewQueue,
  formatReviewDetail,
  formatAIStatus
} = require('./formatters/npc-formatter');

const {
  generateNPCResponse,
  getPendingResponses,
  approveAndSend,
  isAIAvailable,
  hasAIKey,
  queueForReview
} = require('../operations/ai-npc');

const { getNPCDossiersByCampaign, getNPCDossier } = require('../operations/npc-dossiers');
const { getActiveSession } = require('./operations-menu');

const { ANSI, stripAnsi } = require('./ansi-utils');
const { BOLD, DIM, RESET, GREEN, YELLOW, RED, CYAN, WHITE, MAGENTA, CLEAR, HOME } = ANSI;

/**
 * Show NPC main menu
 * @param {TUISession} session - TUI session for I/O
 */
function showNPCMenu(session) {
  const { campaignId } = getActiveSession();
  let aiStatus = formatAIStatus(false);
  let npcCount = 0;

  if (campaignId) {
    try {
      aiStatus = formatAIStatus(hasAIKey(campaignId));
      const npcs = getNPCDossiersByCampaign(campaignId);
      npcCount = npcs?.length || 0;
    } catch (e) {
      // Ignore errors
    }
  }

  const countBadge = npcCount > 0 ? ` ${DIM}(${npcCount} NPCs)${RESET}` : '';

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}NPC CONTACTS${RESET}${countBadge}                                      ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[L]${RESET} ${WHITE}List NPCs${RESET}                                            ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}View all NPCs in campaign${RESET}                             ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[R]${RESET} ${WHITE}GM Review Queue${RESET}                                      ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}Review pending AI responses${RESET}                          ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  AI Status: ${aiStatus}                                       ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[B]${RESET} ${DIM}Back to main menu${RESET}                                      ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  session.write(out);
}

/**
 * Show NPC list screen
 * @param {TUISession} session - TUI session for I/O
 */
function showNPCListScreen(session) {
  const { campaignId } = getActiveSession();
  let content;
  let npcs = [];

  if (!campaignId) {
    content = `  ${YELLOW}No campaign selected.${RESET}\n  ${DIM}Use [A] Campaign to select one.${RESET}`;
  } else {
    try {
      npcs = getNPCDossiersByCampaign(campaignId) || [];
      content = formatNPCList(npcs);
    } catch (e) {
      content = `  ${YELLOW}Unable to load NPCs.${RESET}\n  ${DIM}${e.message}${RESET}`;
    }
  }

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}NPC LIST${RESET}                                                 ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  session.write(out);

  return npcs;
}

/**
 * Show NPC detail screen
 * @param {TUISession} session - TUI session for I/O
 * @param {Object} npc - NPC object
 * @param {boolean} isGM - Whether viewer is GM
 */
function showNPCDetailScreen(session, npc, isGM = true) {
  const content = formatNPCDetail(npc, isGM);

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}NPC DOSSIER${RESET}                                              ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[T]${RESET} Talk to ${npc.name}                                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[B]${RESET} Back to list                                             ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  session.write(out);
}

/**
 * Show review queue screen
 * @param {TUISession} session - TUI session for I/O
 */
function showReviewQueueScreen(session) {
  const { campaignId } = getActiveSession();
  let content;
  let pending = [];

  if (!campaignId) {
    content = `  ${YELLOW}No campaign selected.${RESET}`;
  } else {
    try {
      pending = getPendingResponses(campaignId) || [];
      content = formatReviewQueue(pending);
    } catch (e) {
      content = `  ${YELLOW}Unable to load queue.${RESET}\n  ${DIM}${e.message}${RESET}`;
    }
  }

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${MAGENTA}${BOLD}GM REVIEW QUEUE${RESET}                                          ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  session.write(out);

  return pending;
}

/**
 * Show dialogue screen
 * @param {TUISession} session - TUI session for I/O
 * @param {Object} npc - NPC object
 * @param {Object} response - AI response (optional)
 */
function showDialogueScreen(session, npc, response = null) {
  const promptContent = formatDialoguePrompt(npc);
  const responseContent = response ? formatAIResponse(response) : '';

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}DIALOGUE${RESET}                                                 ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    promptContent.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n';

  if (responseContent) {
    session.write(out +
      responseContent.split('\n').map(line =>
        `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
      ).join('\n') + '\n' +
      `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
      `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
      `${CYAN}║${RESET}  ${GREEN}Press any key to continue${RESET}                                   ${CYAN}║${RESET}\n` +
      `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`);
  } else {
    session.write(out +
      `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
      `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`);
  }
}

/**
 * Wait for NPC menu selection
 * @param {TUISession} session - TUI session for I/O
 */
async function waitForNPCMenuSelection(session) {
  return new Promise((resolve) => {
    if (session.isTTY()) {
      session.setRawMode(true);
    }
    session.resume();
    session.setEncoding('utf8');

    const onData = (key) => {
      if (key === '\u0003') {
        cleanup();
        session.write('\n');
        process.exit();
      }

      if (key === 'l' || key === 'L') {
        cleanup();
        resolve('list');
        return;
      }

      if (key === 'r' || key === 'R') {
        cleanup();
        resolve('review');
        return;
      }

      if (key === 'b' || key === 'B') {
        cleanup();
        resolve('back');
        return;
      }
    };

    const cleanup = () => {
      session.removeInput(onData);
      if (session.isTTY()) {
        session.setRawMode(false);
      }
      session.pause();
    };

    session.onInput(onData);
  });
}

/**
 * Wait for NPC list selection
 * @param {TUISession} session - TUI session for I/O
 * @param {number} maxNPC - Maximum NPC number
 */
async function waitForNPCListSelection(session, maxNPC) {
  return new Promise((resolve) => {
    if (session.isTTY()) {
      session.setRawMode(true);
    }
    session.resume();
    session.setEncoding('utf8');

    const onData = (key) => {
      if (key === '\u0003') {
        cleanup();
        session.write('\n');
        process.exit();
      }

      if (key === 'r' || key === 'R') {
        cleanup();
        resolve({ action: 'review' });
        return;
      }

      if (key === 'b' || key === 'B') {
        cleanup();
        resolve({ action: 'back' });
        return;
      }

      const num = parseInt(key, 10);
      if (num >= 1 && num <= maxNPC) {
        cleanup();
        resolve({ action: 'select', index: num - 1 });
        return;
      }
    };

    const cleanup = () => {
      session.removeInput(onData);
      if (session.isTTY()) {
        session.setRawMode(false);
      }
      session.pause();
    };

    session.onInput(onData);
  });
}

/**
 * Wait for NPC detail selection
 * @param {TUISession} session - TUI session for I/O
 */
async function waitForNPCDetailSelection(session) {
  return new Promise((resolve) => {
    if (session.isTTY()) {
      session.setRawMode(true);
    }
    session.resume();
    session.setEncoding('utf8');

    const onData = (key) => {
      if (key === '\u0003') {
        cleanup();
        session.write('\n');
        process.exit();
      }

      if (key === 't' || key === 'T') {
        cleanup();
        resolve('talk');
        return;
      }

      if (key === 'b' || key === 'B') {
        cleanup();
        resolve('back');
        return;
      }
    };

    const cleanup = () => {
      session.removeInput(onData);
      if (session.isTTY()) {
        session.setRawMode(false);
      }
      session.pause();
    };

    session.onInput(onData);
  });
}

/**
 * Wait for any key press
 * @param {TUISession} session - TUI session for I/O
 */
async function waitForAnyKey(session) {
  return new Promise((resolve) => {
    if (session.isTTY()) {
      session.setRawMode(true);
    }
    session.resume();
    session.setEncoding('utf8');

    const onData = (key) => {
      cleanup();
      if (key === '\u0003') {
        session.write('\n');
        process.exit();
      }
      resolve();
    };

    const cleanup = () => {
      session.removeInput(onData);
      if (session.isTTY()) {
        session.setRawMode(false);
      }
      session.pause();
    };

    session.onInput(onData);
  });
}

/**
 * Read line input (for dialogue)
 * @param {TUISession} session - TUI session for I/O
 * @param {string} prompt - Prompt to display
 */
async function readLine(session, prompt = '') {
  return new Promise((resolve) => {
    if (session.isTTY()) {
      session.setRawMode(false);
    }
    session.resume();
    session.setEncoding('utf8');

    const rl = session.createReadline();

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Run NPC menu loop
 * @param {TUISession} session - TUI session for I/O
 */
async function runNPCMenu(session) {
  while (true) {
    showNPCMenu(session);
    const selection = await waitForNPCMenuSelection(session);

    switch (selection) {
      case 'list':
        await runNPCListLoop(session);
        break;

      case 'review':
        await runReviewQueueLoop(session);
        break;

      case 'back':
        return;
    }
  }
}

/**
 * Run NPC list loop
 * @param {TUISession} session - TUI session for I/O
 */
async function runNPCListLoop(session) {
  while (true) {
    const npcs = showNPCListScreen(session);

    if (!npcs || npcs.length === 0) {
      await waitForAnyKey(session);
      return;
    }

    const result = await waitForNPCListSelection(session, Math.min(npcs.length, 9));

    if (result.action === 'back') {
      return;
    }

    if (result.action === 'review') {
      await runReviewQueueLoop(session);
      continue;
    }

    if (result.action === 'select') {
      const npc = npcs[result.index];
      await runNPCDetailLoop(session, npc);
    }
  }
}

/**
 * Run NPC detail loop
 * @param {TUISession} session - TUI session for I/O
 * @param {Object} npc - NPC object
 */
async function runNPCDetailLoop(session, npc) {
  while (true) {
    showNPCDetailScreen(session, npc, true);
    const selection = await waitForNPCDetailSelection(session);

    if (selection === 'back') {
      return;
    }

    if (selection === 'talk') {
      await runDialogue(session, npc);
    }
  }
}

/**
 * Run dialogue with NPC
 * @param {TUISession} session - TUI session for I/O
 * @param {Object} npc - NPC object
 */
async function runDialogue(session, npc) {
  const { campaignId } = getActiveSession();

  showDialogueScreen(session, npc);

  // Read player message
  session.write(`  ${WHITE}>${RESET} `);
  const message = await readLine(session);

  if (!message || message.toLowerCase() === 'cancel') {
    return;
  }

  // Generate AI response
  session.write(`\n  ${DIM}Generating response...${RESET}\n`);

  try {
    const response = await generateNPCResponse(npc.id, message, {
      campaignId
    });

    showDialogueScreen(session, npc, response);
    await waitForAnyKey(session);
  } catch (e) {
    showDialogueScreen(session, npc, { error: e.message });
    await waitForAnyKey(session);
  }
}

/**
 * Run review queue loop
 * @param {TUISession} session - TUI session for I/O
 */
async function runReviewQueueLoop(session) {
  while (true) {
    const pending = showReviewQueueScreen(session);

    if (!pending || pending.length === 0) {
      await waitForAnyKey(session);
      return;
    }

    const result = await waitForNPCListSelection(session, Math.min(pending.length, 9));

    if (result.action === 'back') {
      return;
    }

    if (result.action === 'select') {
      const item = pending[result.index];
      await runReviewDetail(session, item);
    }
  }
}

/**
 * Run review detail
 * @param {TUISession} session - TUI session for I/O
 * @param {Object} item - Review item
 */
async function runReviewDetail(session, item) {
  const content = formatReviewDetail(item);

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${MAGENTA}${BOLD}REVIEW RESPONSE${RESET}                                          ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  session.write(out);

  return new Promise((resolve) => {
    if (session.isTTY()) {
      session.setRawMode(true);
    }
    session.resume();
    session.setEncoding('utf8');

    const onData = (key) => {
      if (key === '\u0003') {
        cleanup();
        session.write('\n');
        process.exit();
      }

      if (key === 'a' || key === 'A') {
        cleanup();
        // Approve and send
        try {
          approveAndSend(item.id);
          session.write(`  ${GREEN}Response approved and sent.${RESET}\n`);
        } catch (e) {
          session.write(`  ${RED}Error: ${e.message}${RESET}\n`);
        }
        setTimeout(resolve, 1000);
        return;
      }

      if (key === 'r' || key === 'R') {
        cleanup();
        // Reject (just return, item stays in queue for now)
        session.write(`  ${YELLOW}Response rejected.${RESET}\n`);
        setTimeout(resolve, 1000);
        return;
      }

      if (key === 'b' || key === 'B') {
        cleanup();
        resolve();
        return;
      }
    };

    const cleanup = () => {
      session.removeInput(onData);
      if (session.isTTY()) {
        session.setRawMode(false);
      }
      session.pause();
    };

    session.onInput(onData);
  });
}

module.exports = {
  showNPCMenu,
  showNPCListScreen,
  showNPCDetailScreen,
  showReviewQueueScreen,
  showDialogueScreen,
  runNPCMenu
};
