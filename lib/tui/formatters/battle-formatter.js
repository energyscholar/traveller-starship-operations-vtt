/**
 * Battle Formatter for TUI
 * Displays: battle status, round-by-round output, experiment stats
 */

const { ANSI } = require('../ansi-utils');
const { BOLD, DIM, RESET, GREEN, YELLOW, RED, CYAN, WHITE, MAGENTA, BLUE } = ANSI;

/**
 * Format scenario selection menu
 * @param {Object} scenarios - Available scenarios
 * @returns {string} Formatted scenario list
 */
function formatScenarioList(scenarios) {
  const lines = [];

  lines.push(`${CYAN}${BOLD}SELECT SCENARIO${RESET}`);
  lines.push('');

  const scenarioList = [
    { key: '1', name: 'demo1', desc: 'Kimbly vs Pirate Corsair' },
    { key: '2', name: 'demo2', desc: 'Astral Queen vs Corvette' },
    { key: '3', name: 'demo3', desc: 'Q-Ship vs Destroyer (default)' },
    { key: '4', name: 'demo4', desc: 'Q-Ship vs Pirate Fleet' },
    { key: '5', name: 'demo5', desc: 'Amishi Fleet vs Blood Profit' },
    { key: '6', name: 'interactive1', desc: 'Q-Ship Ambush (Interactive)' },
    { key: '7', name: 'interactive2', desc: 'Fleet Assault (Interactive)' }
  ];

  scenarioList.forEach(s => {
    const highlight = s.key === '3' ? `${GREEN}(recommended)${RESET}` : '';
    lines.push(`  ${YELLOW}[${s.key}]${RESET} ${WHITE}${s.desc}${RESET} ${highlight}`);
    lines.push(`      ${DIM}Scenario: ${s.name}${RESET}`);
  });

  lines.push('');
  lines.push(`  ${DIM}Press number to select, [B] Back${RESET}`);

  return lines.join('\n');
}

/**
 * Format battle progress (single battle)
 * @param {Object} state - Current battle state
 * @param {number} round - Current round
 * @param {number} maxRounds - Maximum rounds
 * @returns {string} Formatted progress
 */
function formatBattleProgress(state, round, maxRounds) {
  const lines = [];

  const playerHull = state.playerHullPct || 100;
  const enemyHull = state.enemyHullPct || 100;

  lines.push(`${CYAN}${BOLD}BATTLE IN PROGRESS${RESET}`);
  lines.push('');
  lines.push(`  ${WHITE}Round:${RESET} ${round}/${maxRounds}`);
  lines.push('');
  lines.push(`  ${GREEN}Player Fleet:${RESET}  ${formatHealthBar(playerHull)} ${playerHull}%`);
  lines.push(`  ${RED}Enemy Fleet:${RESET}   ${formatHealthBar(enemyHull)} ${enemyHull}%`);

  if (state.flees > 0) {
    lines.push(`  ${YELLOW}Enemies Fled:${RESET}  ${state.flees}`);
  }
  if (state.surrenders > 0) {
    lines.push(`  ${MAGENTA}Surrendered:${RESET}   ${state.surrenders}`);
  }

  return lines.join('\n');
}

/**
 * Format health bar
 * @param {number} percent - Health percentage (0-100)
 * @returns {string} ASCII health bar
 */
function formatHealthBar(percent) {
  const width = 20;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  let color = GREEN;
  if (percent <= 25) color = RED;
  else if (percent <= 50) color = YELLOW;

  return `${color}[${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET}${color}]${RESET}`;
}

/**
 * Format battle result
 * @param {Object} result - Battle result
 * @returns {string} Formatted result
 */
function formatBattleResult(result) {
  const lines = [];

  const winnerColor = result.winner === 'player' ? GREEN : (result.winner === 'enemy' ? RED : YELLOW);

  lines.push(`${CYAN}${BOLD}BATTLE COMPLETE${RESET}`);
  lines.push('');
  lines.push(`  ${WHITE}Winner:${RESET}        ${winnerColor}${(result.winner || 'stalemate').toUpperCase()}${RESET}`);
  lines.push(`  ${WHITE}Rounds:${RESET}        ${result.rounds}`);
  lines.push('');
  lines.push(`  ${GREEN}Player Hull:${RESET}   ${result.playerHullPct}%`);
  lines.push(`  ${RED}Enemy Hull:${RESET}    ${result.enemyHullPct}%`);
  lines.push('');

  if (result.knockouts > 0) {
    lines.push(`  ${MAGENTA}Knockouts:${RESET}     ${result.knockouts}`);
  }

  if (result.flees > 0) {
    lines.push(`  ${YELLOW}Enemies Fled:${RESET}  ${result.flees}`);
  }

  if (result.surrenders > 0) {
    lines.push(`  ${CYAN}Surrendered:${RESET}   ${result.surrenders}`);
  }

  return lines.join('\n');
}

/**
 * Format experiment progress
 * @param {number} current - Current battle number
 * @param {number} total - Total battles
 * @returns {string} Progress bar
 */
function formatExperimentProgress(current, total) {
  const percent = Math.round((current / total) * 100);
  const barWidth = 40;
  const filled = Math.round((current / total) * barWidth);
  const empty = barWidth - filled;

  return `  ${CYAN}Progress:${RESET} [${GREEN}${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET}] ${current}/${total} (${percent}%)`;
}

/**
 * Format experiment stats summary
 * @param {Object} stats - Experiment stats
 * @returns {string} Formatted stats
 */
function formatExperimentStats(stats) {
  const lines = [];

  lines.push(`${CYAN}${BOLD}EXPERIMENT RESULTS${RESET}`);
  lines.push(`${DIM}${stats.runs} battles simulated${RESET}`);
  lines.push('');

  // Main stats table
  lines.push(`  ┌────────────────────┬───────────────┐`);
  lines.push(`  │ ${WHITE}Metric${RESET}             │ ${WHITE}Value${RESET}         │`);
  lines.push(`  ├────────────────────┼───────────────┤`);
  lines.push(`  │ Win Rate           │ ${formatStatValue(stats.winRate, '%', true)}│`);
  lines.push(`  │ Average Rounds     │ ${formatStatValue(stats.avgRounds, '', false)}│`);
  lines.push(`  │ Avg Player Hull    │ ${formatStatValue(stats.avgPlayerHull, '%', false)}│`);
  lines.push(`  │ Knockout Rate      │ ${formatStatValue(stats.knockoutRate, '%', false)}│`);

  // Captain AI stats
  if (stats.fleeRate !== undefined || stats.surrenderRate !== undefined) {
    lines.push(`  ├────────────────────┼───────────────┤`);
    lines.push(`  │ ${YELLOW}Captain AI${RESET}         │               │`);
    lines.push(`  │ Flee Rate          │ ${formatStatValue(stats.fleeRate || 0, '%', false)}│`);
    lines.push(`  │ Surrender Rate     │ ${formatStatValue(stats.surrenderRate || 0, '%', false)}│`);
    lines.push(`  │ Avg Flees/Battle   │ ${formatStatValue(stats.avgFlees || 0, '', false)}│`);
    lines.push(`  │ Avg Surrenders     │ ${formatStatValue(stats.avgSurrenders || 0, '', false)}│`);
  }

  lines.push(`  └────────────────────┴───────────────┘`);

  // Interpretation
  lines.push('');
  if (stats.winRate >= 80) {
    lines.push(`  ${GREEN}Strong advantage for player fleet.${RESET}`);
  } else if (stats.winRate >= 50) {
    lines.push(`  ${YELLOW}Evenly matched engagement.${RESET}`);
  } else {
    lines.push(`  ${RED}Enemy fleet has tactical advantage.${RESET}`);
  }

  if (stats.fleeRate > 50) {
    lines.push(`  ${CYAN}High flee rate - enemies avoid unfavorable combat.${RESET}`);
  }

  return lines.join('\n');
}

/**
 * Format stat value with padding
 */
function formatStatValue(value, suffix, highlight) {
  const str = `${value}${suffix}`;
  const padded = str.padEnd(13);
  if (highlight) {
    if (value >= 70) return `${GREEN}${padded}${RESET}`;
    if (value >= 40) return `${YELLOW}${padded}${RESET}`;
    return `${RED}${padded}${RESET}`;
  }
  return padded;
}

/**
 * Format battle simulation menu
 * @param {string} currentScenario - Currently selected scenario
 * @returns {string} Menu display
 */
function formatBattleMenu(currentScenario = 'demo3') {
  const lines = [];

  const scenarioNames = {
    demo1: 'Kimbly vs Pirate',
    demo2: 'Astral vs Corvette',
    demo3: 'Q-Ship vs Destroyer',
    demo4: 'Q-Ship vs Pirates',
    demo5: 'Amishi vs Blood Profit',
    interactive1: 'Q-Ship Ambush (Interactive)',
    interactive2: 'Fleet Assault (Interactive)'
  };

  lines.push(`${CYAN}${BOLD}BATTLE SIMULATION${RESET}`);
  lines.push(`${DIM}Current: ${scenarioNames[currentScenario] || currentScenario}${RESET}`);
  lines.push('');
  lines.push(`  ${YELLOW}[1]${RESET} ${WHITE}Run Single Battle${RESET}`);
  lines.push(`      ${DIM}Watch one battle unfold${RESET}`);
  lines.push('');
  lines.push(`  ${YELLOW}[2]${RESET} ${WHITE}Run Experiment${RESET}`);
  lines.push(`      ${DIM}Run N battles for statistics${RESET}`);
  lines.push('');
  lines.push(`  ${YELLOW}[3]${RESET} ${WHITE}Select Scenario${RESET}`);
  lines.push(`      ${DIM}Choose battle configuration${RESET}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Format runs prompt
 * @returns {string} Prompt text
 */
function formatRunsPrompt() {
  return `  ${WHITE}Enter number of battles (10-1000):${RESET} `;
}

module.exports = {
  formatScenarioList,
  formatBattleProgress,
  formatBattleResult,
  formatExperimentProgress,
  formatExperimentStats,
  formatBattleMenu,
  formatRunsPrompt,
  formatHealthBar
};
