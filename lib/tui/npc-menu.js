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

// ANSI escape codes
const ESC = '\x1b';
const CLEAR = `${ESC}[2J`;
const HOME = `${ESC}[H`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;
const GREEN = `${ESC}[32m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;
const WHITE = `${ESC}[37m`;
const RED = `${ESC}[31m`;
const MAGENTA = `${ESC}[35m`;

/**
 * Strip ANSI codes for length calculation
 */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Show NPC main menu
 */
function showNPCMenu() {
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

  process.stdout.write(out);
}

/**
 * Show NPC list screen
 */
function showNPCListScreen() {
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

  process.stdout.write(out);

  return npcs;
}

/**
 * Show NPC detail screen
 */
function showNPCDetailScreen(npc, isGM = true) {
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

  process.stdout.write(out);
}

/**
 * Show review queue screen
 */
function showReviewQueueScreen() {
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

  process.stdout.write(out);

  return pending;
}

/**
 * Show dialogue screen
 */
function showDialogueScreen(npc, response = null) {
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
    process.stdout.write(out +
      responseContent.split('\n').map(line =>
        `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
      ).join('\n') + '\n' +
      `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
      `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
      `${CYAN}║${RESET}  ${GREEN}Press any key to continue${RESET}                                   ${CYAN}║${RESET}\n` +
      `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`);
  } else {
    process.stdout.write(out +
      `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
      `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`);
  }
}

/**
 * Wait for NPC menu selection
 */
async function waitForNPCMenuSelection() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
      if (key === '\u0003') {
        cleanup();
        process.stdout.write('\n');
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
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    process.stdin.on('data', onData);
  });
}

/**
 * Wait for NPC list selection
 */
async function waitForNPCListSelection(maxNPC) {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
      if (key === '\u0003') {
        cleanup();
        process.stdout.write('\n');
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
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    process.stdin.on('data', onData);
  });
}

/**
 * Wait for NPC detail selection
 */
async function waitForNPCDetailSelection() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
      if (key === '\u0003') {
        cleanup();
        process.stdout.write('\n');
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
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    process.stdin.on('data', onData);
  });
}

/**
 * Wait for any key press
 */
async function waitForAnyKey() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
      cleanup();
      if (key === '\u0003') {
        process.stdout.write('\n');
        process.exit();
      }
      resolve();
    };

    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    process.stdin.on('data', onData);
  });
}

/**
 * Read line input (for dialogue)
 */
async function readLine(prompt = '') {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Run NPC menu loop
 */
async function runNPCMenu() {
  while (true) {
    showNPCMenu();
    const selection = await waitForNPCMenuSelection();

    switch (selection) {
      case 'list':
        await runNPCListLoop();
        break;

      case 'review':
        await runReviewQueueLoop();
        break;

      case 'back':
        return;
    }
  }
}

/**
 * Run NPC list loop
 */
async function runNPCListLoop() {
  while (true) {
    const npcs = showNPCListScreen();

    if (!npcs || npcs.length === 0) {
      await waitForAnyKey();
      return;
    }

    const result = await waitForNPCListSelection(Math.min(npcs.length, 9));

    if (result.action === 'back') {
      return;
    }

    if (result.action === 'review') {
      await runReviewQueueLoop();
      continue;
    }

    if (result.action === 'select') {
      const npc = npcs[result.index];
      await runNPCDetailLoop(npc);
    }
  }
}

/**
 * Run NPC detail loop
 */
async function runNPCDetailLoop(npc) {
  while (true) {
    showNPCDetailScreen(npc, true);
    const selection = await waitForNPCDetailSelection();

    if (selection === 'back') {
      return;
    }

    if (selection === 'talk') {
      await runDialogue(npc);
    }
  }
}

/**
 * Run dialogue with NPC
 */
async function runDialogue(npc) {
  const { campaignId } = getActiveSession();

  showDialogueScreen(npc);

  // Read player message
  process.stdout.write(`  ${WHITE}>${RESET} `);
  const message = await readLine();

  if (!message || message.toLowerCase() === 'cancel') {
    return;
  }

  // Generate AI response
  process.stdout.write(`\n  ${DIM}Generating response...${RESET}\n`);

  try {
    const response = await generateNPCResponse(npc.id, message, {
      campaignId
    });

    showDialogueScreen(npc, response);
    await waitForAnyKey();
  } catch (e) {
    showDialogueScreen(npc, { error: e.message });
    await waitForAnyKey();
  }
}

/**
 * Run review queue loop
 */
async function runReviewQueueLoop() {
  while (true) {
    const pending = showReviewQueueScreen();

    if (!pending || pending.length === 0) {
      await waitForAnyKey();
      return;
    }

    const result = await waitForNPCListSelection(Math.min(pending.length, 9));

    if (result.action === 'back') {
      return;
    }

    if (result.action === 'select') {
      const item = pending[result.index];
      await runReviewDetail(item);
    }
  }
}

/**
 * Run review detail
 */
async function runReviewDetail(item) {
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

  process.stdout.write(out);

  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
      if (key === '\u0003') {
        cleanup();
        process.stdout.write('\n');
        process.exit();
      }

      if (key === 'a' || key === 'A') {
        cleanup();
        // Approve and send
        try {
          approveAndSend(item.id);
          process.stdout.write(`  ${GREEN}Response approved and sent.${RESET}\n`);
        } catch (e) {
          process.stdout.write(`  ${RED}Error: ${e.message}${RESET}\n`);
        }
        setTimeout(resolve, 1000);
        return;
      }

      if (key === 'r' || key === 'R') {
        cleanup();
        // Reject (just return, item stays in queue for now)
        process.stdout.write(`  ${YELLOW}Response rejected.${RESET}\n`);
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
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    process.stdin.on('data', onData);
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
