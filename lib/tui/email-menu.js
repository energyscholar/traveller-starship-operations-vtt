/**
 * Email Menu for TUI
 * Inbox, read message, compose, drafts
 */

const {
  formatInbox,
  formatMessage,
  formatDrafts,
  formatCompose,
  formatDeliveryEstimate
} = require('./formatters/email-formatter');

const {
  getMailForPlayer,
  getMailByCampaign,
  getMail,
  getUnreadMailCount,
  markMailRead,
  sendMail,
  saveDraft,
  getDrafts,
  calculateDeliveryDate
} = require('../operations/mail');

const { getCampaign } = require('../operations/accounts');
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
 * Show email main menu
 */
function showEmailMenu() {
  const { campaignId } = getActiveSession();
  let unreadCount = 0;

  if (campaignId) {
    try {
      const campaign = getCampaign(campaignId);
      unreadCount = getUnreadMailCount(campaignId, null, campaign?.current_date);
    } catch (e) {
      // Ignore errors
    }
  }

  const unreadBadge = unreadCount > 0 ? ` ${YELLOW}(${unreadCount} unread)${RESET}` : '';

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}MAIL${RESET}${unreadBadge}                                               ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[I]${RESET} ${WHITE}Inbox${RESET}                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}View received messages${RESET}                                  ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[C]${RESET} ${WHITE}Compose${RESET}                                              ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}Write a new message${RESET}                                     ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[D]${RESET} ${WHITE}Drafts${RESET}                                               ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}View saved drafts${RESET}                                       ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[B]${RESET} ${DIM}Back to main menu${RESET}                                      ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Show inbox screen
 */
function showInboxScreen() {
  const { campaignId } = getActiveSession();
  let content;
  let messages = [];
  let unreadCount = 0;

  if (!campaignId) {
    content = `  ${YELLOW}No campaign selected.${RESET}\n  ${DIM}Use [A] Campaign to select one.${RESET}`;
  } else {
    try {
      const campaign = getCampaign(campaignId);
      messages = getMailByCampaign(campaignId);
      unreadCount = getUnreadMailCount(campaignId, null, campaign?.current_date);
      content = formatInbox(messages, unreadCount);
    } catch (e) {
      content = `  ${YELLOW}Unable to load inbox.${RESET}\n  ${DIM}${e.message}${RESET}`;
    }
  }

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}INBOX${RESET}                                                    ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press number to read, any other key to return${RESET}               ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);

  return messages;
}

/**
 * Show message detail screen
 */
function showMessageScreen(message) {
  // Mark as read
  if (message && !message.is_read) {
    try {
      markMailRead(message.id);
    } catch (e) {
      // Ignore errors
    }
  }

  const content = formatMessage(message);

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}MESSAGE${RESET}                                                  ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press any key to return${RESET}                                     ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Show drafts screen
 */
function showDraftsScreen() {
  const { campaignId } = getActiveSession();
  let content;
  let drafts = [];

  if (!campaignId) {
    content = `  ${YELLOW}No campaign selected.${RESET}\n  ${DIM}Use [A] Campaign to select one.${RESET}`;
  } else {
    try {
      drafts = getDrafts(campaignId);
      content = formatDrafts(drafts);
    } catch (e) {
      content = `  ${YELLOW}Unable to load drafts.${RESET}\n  ${DIM}${e.message}${RESET}`;
    }
  }

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}DRAFTS${RESET}                                                   ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press number to edit, any other key to return${RESET}               ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);

  return drafts;
}

/**
 * Show compose screen (simplified - TUI compose is limited)
 */
function showComposeScreen(draft = {}, parsecs = 0) {
  const deliveryEstimate = formatDeliveryEstimate(parsecs);
  const content = formatCompose(draft, deliveryEstimate);

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}COMPOSE MESSAGE${RESET}                                          ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${DIM}TUI compose is limited. Use GUI for full compose.${RESET}           ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press any key to return${RESET}                                     ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Wait for email menu selection
 * @returns {Promise<string>} 'inbox', 'compose', 'drafts', or 'back'
 */
async function waitForEmailSelection() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
      // Ctrl+C
      if (key === '\u0003') {
        cleanup();
        process.stdout.write('\n');
        process.exit();
      }

      if (key === 'i' || key === 'I') {
        cleanup();
        resolve('inbox');
        return;
      }

      if (key === 'c' || key === 'C') {
        cleanup();
        resolve('compose');
        return;
      }

      if (key === 'd' || key === 'D') {
        cleanup();
        resolve('drafts');
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
 * Wait for message selection or any key
 * @param {number} maxMessage - Maximum message number
 * @returns {Promise<number|null>} Message number (1-based) or null
 */
async function waitForMessageSelection(maxMessage) {
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

      // Check for number key
      const num = parseInt(key, 10);
      if (num >= 1 && num <= maxMessage) {
        resolve(num);
        return;
      }

      resolve(null);
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
 * Run email menu loop
 * @returns {Promise<void>} Resolves when user selects [B] Back
 */
async function runEmailMenu() {
  while (true) {
    showEmailMenu();
    const selection = await waitForEmailSelection();

    switch (selection) {
      case 'inbox':
        const messages = showInboxScreen();
        if (messages && messages.length > 0) {
          const msgNum = await waitForMessageSelection(Math.min(messages.length, 9));
          if (msgNum !== null) {
            const message = messages[msgNum - 1];
            showMessageScreen(message);
            await waitForAnyKey();
          }
        } else {
          await waitForAnyKey();
        }
        break;

      case 'compose':
        // TUI compose is simplified - just show the screen
        showComposeScreen({}, 3); // Default 3 parsecs for estimate demo
        await waitForAnyKey();
        break;

      case 'drafts':
        const drafts = showDraftsScreen();
        if (drafts && drafts.length > 0) {
          const draftNum = await waitForMessageSelection(Math.min(drafts.length, 9));
          if (draftNum !== null) {
            const draft = drafts[draftNum - 1];
            showComposeScreen(draft, 3);
            await waitForAnyKey();
          }
        } else {
          await waitForAnyKey();
        }
        break;

      case 'back':
        return;
    }
  }
}

module.exports = {
  showEmailMenu,
  showInboxScreen,
  showMessageScreen,
  showDraftsScreen,
  showComposeScreen,
  waitForEmailSelection,
  waitForMessageSelection,
  runEmailMenu
};
