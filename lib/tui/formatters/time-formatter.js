/**
 * Time Status Formatter for TUI
 * Displays: current game date/time, time advance options, lock status
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

/**
 * Format time state for display
 * @param {Object} campaign - Campaign data with current_date
 * @param {Object} timeState - State from timeRegistry.getCampaignState()
 * @returns {string} Formatted time display
 */
function formatTimeState(campaign, timeState) {
  const lines = [];

  lines.push(`${CYAN}${BOLD}TIME STATUS${RESET}`);
  lines.push('');

  // Current date
  const currentDate = campaign?.current_date || 'Unknown';
  lines.push(`  ${WHITE}Current Date:${RESET}  ${GREEN}${formatImperialDate(currentDate)}${RESET}`);

  // Parse date for additional info
  const parsed = parseImperialDate(currentDate);
  if (parsed) {
    lines.push(`  ${WHITE}Year:${RESET}          ${parsed.year}`);
    lines.push(`  ${WHITE}Day:${RESET}           ${parsed.day} of 365`);
    lines.push(`  ${WHITE}Time:${RESET}          ${parsed.time}`);
  }

  // Time lock status
  lines.push('');
  if (timeState?.timeLocked) {
    lines.push(`  ${RED}${BOLD}TIME LOCKED${RESET}`);
    lines.push(`  ${DIM}GM has paused time advancement${RESET}`);
  } else {
    lines.push(`  ${GREEN}Time Unlocked${RESET}`);
    lines.push('');
    lines.push(`  ${WHITE}${BOLD}Advance Time:${RESET}`);
    lines.push(`    ${YELLOW}[1]${RESET} +1 hour`);
    lines.push(`    ${YELLOW}[2]${RESET} +6 hours`);
    lines.push(`    ${YELLOW}[3]${RESET} +1 day (24 hours)`);
    lines.push(`    ${YELLOW}[4]${RESET} +1 week (168 hours)`);
  }

  // Pending events if advancing
  if (timeState?.isAdvancing) {
    lines.push('');
    lines.push(`  ${YELLOW}Time advancement in progress...${RESET}`);
  }

  return lines.join('\n');
}

/**
 * Format Imperial date for display
 * Format: YYYY-DDD HH:MM -> "Day DDD, YYYY at HH:MM"
 * @param {string} dateStr - Imperial date string
 * @returns {string} Formatted date
 */
function formatImperialDate(dateStr) {
  if (!dateStr) return 'Unknown';

  const parsed = parseImperialDate(dateStr);
  if (!parsed) return dateStr;

  return `Day ${parsed.day}, ${parsed.year} at ${parsed.time}`;
}

/**
 * Parse Imperial date string
 * Format: YYYY-DDD HH:MM
 * @param {string} dateStr - Imperial date string
 * @returns {Object|null} { year, day, time, hours, minutes }
 */
function parseImperialDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const match = dateStr.match(/^(\d{4})-(\d{3})\s+(\d{2}):(\d{2})$/);
  if (!match) {
    // Try simpler format YYYY-DDD
    const simpleMatch = dateStr.match(/^(\d{4})-(\d{3})$/);
    if (simpleMatch) {
      return {
        year: parseInt(simpleMatch[1]),
        day: parseInt(simpleMatch[2]),
        time: '00:00',
        hours: 0,
        minutes: 0
      };
    }
    return null;
  }

  return {
    year: parseInt(match[1]),
    day: parseInt(match[2]),
    time: `${match[3]}:${match[4]}`,
    hours: parseInt(match[3]),
    minutes: parseInt(match[4])
  };
}

/**
 * Format time advancement preview
 * @param {string} currentDate - Current Imperial date
 * @param {number} hours - Hours to advance
 * @returns {string} Preview of new date
 */
function formatTimeAdvancePreview(currentDate, hours) {
  const parsed = parseImperialDate(currentDate);
  if (!parsed) return `+${hours} hours`;

  let newMinutes = parsed.minutes;
  let newHours = parsed.hours + hours;
  let newDay = parsed.day + Math.floor(newHours / 24);
  newHours = newHours % 24;
  let newYear = parsed.year + Math.floor((newDay - 1) / 365);
  newDay = ((newDay - 1) % 365) + 1;

  const newTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  return `Day ${newDay}, ${newYear} at ${newTime}`;
}

/**
 * Format brief time status (one line)
 * @param {Object} campaign - Campaign data with current_date
 * @param {Object} timeState - State from timeRegistry.getCampaignState()
 * @returns {string} Brief status line
 */
function formatTimeBrief(campaign, timeState) {
  const date = campaign?.current_date || 'Unknown';
  const locked = timeState?.timeLocked ? ` ${RED}[LOCKED]${RESET}` : '';
  return `${formatImperialDate(date)}${locked}`;
}

module.exports = {
  formatTimeState,
  formatImperialDate,
  parseImperialDate,
  formatTimeAdvancePreview,
  formatTimeBrief
};
