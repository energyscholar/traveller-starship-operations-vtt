/**
 * Battle Viewer for TUI
 * Single battle view, experiment runner, scenario selection
 */

const {
  formatScenarioList,
  formatBattleProgress,
  formatBattleResult,
  formatExperimentProgress,
  formatExperimentStats,
  formatBattleMenu,
  formatRunsPrompt
} = require('./formatters/battle-formatter');

const { simulateBattle, runExperiment } = require('../../tests/e2e/helpers/combat-simulator');

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

// Current scenario selection
let currentScenario = 'demo3';

/**
 * Strip ANSI codes for length calculation
 */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Show battle simulation menu
 * @param {TUISession} session - TUI session for I/O
 */
function showBattleMenu(session) {
  const content = formatBattleMenu(currentScenario);

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}BATTLE SIMULATION${RESET}                                        ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[B]${RESET} ${DIM}Back to main menu${RESET}                                      ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  session.write(out);
}

/**
 * Show scenario selection screen
 * @param {TUISession} session - TUI session for I/O
 */
function showScenarioSelection(session) {
  const content = formatScenarioList();

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}SELECT SCENARIO${RESET}                                          ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  session.write(out);
}

/**
 * Show battle result screen
 * @param {TUISession} session - TUI session for I/O
 * @param {Object} result - Battle result
 */
function showBattleResult(session, result) {
  const content = formatBattleResult(result);

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}BATTLE RESULT${RESET}                                            ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press any key to continue${RESET}                                   ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  session.write(out);
}

/**
 * Show experiment stats screen
 * @param {TUISession} session - TUI session for I/O
 * @param {Object} stats - Experiment statistics
 */
function showExperimentStats(session, stats) {
  const content = formatExperimentStats(stats);

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}EXPERIMENT RESULTS${RESET}                                       ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press any key to continue${RESET}                                   ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  session.write(out);
}

/**
 * Show experiment progress
 * @param {TUISession} session - TUI session for I/O
 * @param {number} current - Current battle number
 * @param {number} total - Total battles
 */
function showExperimentProgressScreen(session, current, total) {
  const progress = formatExperimentProgress(current, total);

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}RUNNING EXPERIMENT${RESET}                                       ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET} ${progress}${' '.repeat(Math.max(0, 62 - stripAnsi(progress).length))}${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${DIM}Running scenario: ${currentScenario}${RESET}                              ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  session.write(out);
}

/**
 * Wait for battle menu selection
 * @param {TUISession} session - TUI session for I/O
 */
async function waitForBattleMenuSelection(session) {
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

      if (key === '1') {
        cleanup();
        resolve('single');
        return;
      }

      if (key === '2') {
        cleanup();
        resolve('experiment');
        return;
      }

      if (key === '3') {
        cleanup();
        resolve('scenario');
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
 * Wait for scenario selection
 * @param {TUISession} session - TUI session for I/O
 */
async function waitForScenarioSelection(session) {
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

      const scenarios = { '1': 'demo1', '2': 'demo2', '3': 'demo3', '4': 'demo4', '5': 'demo5' };

      if (scenarios[key]) {
        cleanup();
        resolve(scenarios[key]);
        return;
      }

      if (key === 'b' || key === 'B') {
        cleanup();
        resolve(null);
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
 * Read number input for experiment runs
 * @param {TUISession} session - TUI session for I/O
 */
async function readRunCount(session) {
  return new Promise((resolve) => {
    if (session.isTTY()) {
      session.setRawMode(false);
    }
    session.resume();
    session.setEncoding('utf8');

    // Show prompt
    session.write(CLEAR + HOME);
    session.write(`${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n`);
    session.write(`${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}RUN EXPERIMENT${RESET}                                           ${CYAN}${BOLD}║${RESET}\n`);
    session.write(`${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n`);
    session.write(`${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n`);
    session.write(`${CYAN}║${RESET}  ${WHITE}How many battles? (10-1000, default 100)${RESET}                   ${CYAN}║${RESET}\n`);
    session.write(`${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n`);
    session.write(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`);
    session.write('\n  > ');

    const rl = session.createReadline();

    rl.question('', (answer) => {
      rl.close();
      const num = parseInt(answer, 10);
      if (isNaN(num) || num < 1) {
        resolve(100); // Default
      } else {
        resolve(Math.min(1000, Math.max(10, num)));
      }
    });
  });
}

/**
 * Run a single battle with display
 * @param {TUISession} session - TUI session for I/O
 */
async function runSingleBattle(session) {
  session.write(CLEAR + HOME);
  session.write(`\n  ${CYAN}Running battle...${RESET}\n\n`);

  const result = await simulateBattle({
    scenario: currentScenario,
    maxRounds: 10
  });

  showBattleResult(session, result);
  await waitForAnyKey(session);
}

/**
 * Run experiment with progress display
 * @param {TUISession} session - TUI session for I/O
 * @param {number} runCount - Number of battles to run
 */
async function runExperimentWithProgress(session, runCount) {
  const results = [];

  for (let i = 0; i < runCount; i++) {
    // Update progress every 5 battles or for small counts
    if (i % 5 === 0 || runCount <= 20) {
      showExperimentProgressScreen(session, i, runCount);
    }

    const result = await simulateBattle({
      scenario: currentScenario,
      maxRounds: 10
    });
    results.push(result);
  }

  // Aggregate stats (similar to runExperiment but we already have results)
  const wins = results.filter(r => r.winner === 'player').length;
  const knockouts = results.reduce((sum, r) => sum + r.knockouts, 0);
  const calledShotsAttempted = results.reduce((sum, r) => sum + r.calledShotsAttempted, 0);
  const calledShotsHit = results.reduce((sum, r) => sum + r.calledShotsHit, 0);
  const avgRounds = results.reduce((sum, r) => sum + r.rounds, 0) / runCount;
  const avgPlayerHull = results.reduce((sum, r) => sum + r.playerHullPct, 0) / runCount;
  const totalFlees = results.reduce((sum, r) => sum + (r.flees || 0), 0);
  const totalSurrenders = results.reduce((sum, r) => sum + (r.surrenders || 0), 0);

  const stats = {
    runs: runCount,
    scenario: currentScenario,
    winRate: Math.round((wins / runCount) * 100),
    knockoutRate: Math.round((knockouts / runCount) * 100),
    calledShotAccuracy: calledShotsAttempted > 0 ? Math.round((calledShotsHit / calledShotsAttempted) * 100) : 0,
    avgRounds: Math.round(avgRounds * 10) / 10,
    avgPlayerHull: Math.round(avgPlayerHull),
    flees: totalFlees,
    surrenders: totalSurrenders,
    avgFlees: Math.round((totalFlees / runCount) * 10) / 10,
    avgSurrenders: Math.round((totalSurrenders / runCount) * 10) / 10,
    fleeRate: Math.round((results.filter(r => (r.flees || 0) > 0).length / runCount) * 100),
    surrenderRate: Math.round((results.filter(r => (r.surrenders || 0) > 0).length / runCount) * 100)
  };

  showExperimentStats(session, stats);
  await waitForAnyKey(session);
}

/**
 * Run battle menu loop
 * @param {TUISession} session - TUI session for I/O
 */
async function runBattleMenu(session) {
  while (true) {
    showBattleMenu(session);
    const selection = await waitForBattleMenuSelection(session);

    switch (selection) {
      case 'single':
        await runSingleBattle(session);
        break;

      case 'experiment':
        const runCount = await readRunCount(session);
        await runExperimentWithProgress(session, runCount);
        break;

      case 'scenario':
        showScenarioSelection(session);
        const newScenario = await waitForScenarioSelection(session);
        if (newScenario) {
          currentScenario = newScenario;
        }
        break;

      case 'back':
        return;
    }
  }
}

module.exports = {
  showBattleMenu,
  showScenarioSelection,
  showBattleResult,
  showExperimentStats,
  runBattleMenu,
  runSingleBattle,
  runExperimentWithProgress
};
