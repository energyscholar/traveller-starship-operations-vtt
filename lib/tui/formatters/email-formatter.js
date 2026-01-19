/**
 * Email Formatter for TUI
 * Displays: inbox, message details, compose preview, drafts
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

// Priority colors
const PRIORITY_COLORS = {
  urgent: RED,
  high: YELLOW,
  normal: WHITE,
  low: DIM
};

// Priority icons
const PRIORITY_ICONS = {
  urgent: '!!',
  high: '!',
  normal: ' ',
  low: ' '
};

/**
 * Format inbox for display
 * @param {Array} messages - Messages from getMailForPlayer or getMailByCampaign
 * @param {number} unreadCount - Unread count
 * @returns {string} Formatted inbox
 */
function formatInbox(messages, unreadCount = 0) {
  const lines = [];

  lines.push(`${CYAN}${BOLD}INBOX${RESET}`);
  lines.push('');

  if (unreadCount > 0) {
    lines.push(`  ${YELLOW}${unreadCount} unread message(s)${RESET}`);
    lines.push('');
  }

  if (!messages || messages.length === 0) {
    lines.push(`  ${DIM}No messages.${RESET}`);
    return lines.join('\n');
  }

  messages.slice(0, 9).forEach((msg, idx) => {
    const num = idx + 1;
    const isRead = msg.is_read ? ' ' : '*';
    const priority = msg.priority || 'normal';
    const prioColor = PRIORITY_COLORS[priority] || WHITE;
    const prioIcon = PRIORITY_ICONS[priority] || ' ';

    const from = truncate(msg.sender_name || 'Unknown', 15);
    const subject = truncate(msg.subject || '(no subject)', 30);
    const date = formatMailDate(msg.sent_date || msg.delivery_date);

    const readColor = msg.is_read ? DIM : WHITE;

    lines.push(`  ${YELLOW}[${num}]${RESET} ${prioColor}${prioIcon}${RESET}${isRead} ${readColor}${from}${RESET}`);
    lines.push(`       ${readColor}${subject}${RESET} ${DIM}${date}${RESET}`);
  });

  if (messages.length > 9) {
    lines.push('');
    lines.push(`  ${DIM}...and ${messages.length - 9} more messages${RESET}`);
  }

  return lines.join('\n');
}

/**
 * Format single message for display
 * @param {Object} message - Mail message object
 * @returns {string} Formatted message
 */
function formatMessage(message) {
  const lines = [];

  if (!message) {
    return `  ${YELLOW}Message not found.${RESET}`;
  }

  const priority = message.priority || 'normal';
  const prioColor = PRIORITY_COLORS[priority] || WHITE;

  lines.push(`${CYAN}${BOLD}MESSAGE${RESET}`);
  lines.push('');
  lines.push(`  ${WHITE}From:${RESET}     ${message.sender_name || 'Unknown'}`);
  lines.push(`  ${WHITE}To:${RESET}       ${formatRecipient(message)}`);
  lines.push(`  ${WHITE}Subject:${RESET}  ${message.subject || '(no subject)'}`);
  lines.push(`  ${WHITE}Date:${RESET}     ${formatMailDate(message.sent_date)}`);

  if (message.delivery_date && message.delivery_date !== message.sent_date) {
    lines.push(`  ${WHITE}Arrived:${RESET}  ${formatMailDate(message.delivery_date)}`);
  }

  if (priority !== 'normal') {
    lines.push(`  ${WHITE}Priority:${RESET} ${prioColor}${priority.toUpperCase()}${RESET}`);
  }

  lines.push('');
  lines.push(`  ${DIM}${'─'.repeat(50)}${RESET}`);
  lines.push('');

  // Word-wrap body
  const body = message.body || '(empty message)';
  const wrappedBody = wordWrap(body, 55);
  wrappedBody.forEach(line => {
    lines.push(`  ${line}`);
  });

  return lines.join('\n');
}

/**
 * Format drafts list for display
 * @param {Array} drafts - Drafts from getDrafts
 * @returns {string} Formatted drafts list
 */
function formatDrafts(drafts) {
  const lines = [];

  lines.push(`${MAGENTA}${BOLD}DRAFTS${RESET}`);
  lines.push('');

  if (!drafts || drafts.length === 0) {
    lines.push(`  ${DIM}No drafts.${RESET}`);
    return lines.join('\n');
  }

  drafts.slice(0, 9).forEach((draft, idx) => {
    const num = idx + 1;
    const to = truncate(formatRecipient(draft), 15);
    const subject = truncate(draft.subject || '(no subject)', 30);

    lines.push(`  ${YELLOW}[${num}]${RESET} ${WHITE}To: ${to}${RESET}`);
    lines.push(`       ${DIM}${subject}${RESET}`);
  });

  return lines.join('\n');
}

/**
 * Format compose preview
 * @param {Object} draft - Draft being composed
 * @param {string} deliveryEstimate - Estimated delivery time
 * @returns {string} Formatted compose screen
 */
function formatCompose(draft, deliveryEstimate) {
  const lines = [];

  lines.push(`${GREEN}${BOLD}COMPOSE MESSAGE${RESET}`);
  lines.push('');
  lines.push(`  ${WHITE}To:${RESET}       ${draft.recipientName || draft.recipientId || '(not set)'}`);
  lines.push(`  ${WHITE}Subject:${RESET}  ${draft.subject || '(not set)'}`);
  lines.push('');
  lines.push(`  ${WHITE}Body:${RESET}`);

  if (draft.body) {
    const wrappedBody = wordWrap(draft.body, 50);
    wrappedBody.forEach(line => {
      lines.push(`    ${line}`);
    });
  } else {
    lines.push(`    ${DIM}(empty)${RESET}`);
  }

  lines.push('');
  lines.push(`  ${DIM}${'─'.repeat(50)}${RESET}`);

  if (deliveryEstimate) {
    lines.push('');
    lines.push(`  ${YELLOW}Delivery estimate: ${deliveryEstimate}${RESET}`);
  }

  return lines.join('\n');
}

/**
 * Format delivery estimate
 * @param {number} parsecs - Distance in parsecs
 * @returns {string} Human-readable delivery estimate
 */
function formatDeliveryEstimate(parsecs) {
  if (!parsecs || parsecs <= 0) {
    return 'Instant (same system)';
  }

  const weeks = parsecs * 2; // 2 weeks per parsec
  if (weeks === 2) {
    return '~2 weeks';
  } else if (weeks < 8) {
    return `~${weeks} weeks`;
  } else {
    const months = Math.round(weeks / 4);
    return `~${months} month${months > 1 ? 's' : ''}`;
  }
}

/**
 * Format mail date for display
 * @param {string} dateStr - Imperial date string (YYYY-DDD or YYYY-DDD HH:MM)
 * @returns {string} Formatted date
 */
function formatMailDate(dateStr) {
  if (!dateStr) return 'Unknown';

  // Match YYYY-DDD or YYYY-DDD HH:MM
  const match = dateStr.match(/^(\d{4})-(\d{3})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return dateStr;

  const year = match[1];
  const day = match[2];

  return `${year}-${day}`;
}

/**
 * Format recipient for display
 * @param {Object} message - Mail message
 * @returns {string} Formatted recipient
 */
function formatRecipient(message) {
  if (!message) return 'Unknown';

  switch (message.recipient_type) {
    case 'all':
      return 'All Crew';
    case 'ship':
      return 'Ship Crew';
    case 'role':
      return `Role: ${message.recipient_id || 'Unknown'}`;
    case 'player':
    default:
      return message.recipient_id || 'Unknown';
  }
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLen - Maximum length
 * @returns {string} Truncated string
 */
function truncate(str, maxLen) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

/**
 * Word wrap text to specified width
 * @param {string} text - Text to wrap
 * @param {number} width - Maximum line width
 * @returns {Array<string>} Wrapped lines
 */
function wordWrap(text, width) {
  if (!text) return [];

  const lines = [];
  const paragraphs = text.split('\n');

  paragraphs.forEach(para => {
    if (para.length <= width) {
      lines.push(para);
      return;
    }

    const words = para.split(' ');
    let currentLine = '';

    words.forEach(word => {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
  });

  return lines;
}

module.exports = {
  formatInbox,
  formatMessage,
  formatDrafts,
  formatCompose,
  formatDeliveryEstimate,
  formatMailDate,
  formatRecipient,
  truncate,
  wordWrap
};
