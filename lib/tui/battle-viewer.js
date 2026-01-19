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
 */
function showBattleMenu() {
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

  process.stdout.write(out);
}

/**
 * Show scenario selection screen
 */
function showScenarioSelection() {
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

  process.stdout.write(out);
}

/**
 * Show battle result screen
 */
function showBattleResult(result) {
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

  process.stdout.write(out);
}

/**
 * Show experiment stats screen
 */
function showExperimentStats(stats) {
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

  process.stdout.write(out);
}

/**
 * Show experiment progress
 */
function showExperimentProgressScreen(current, total) {
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

  process.stdout.write(out);
}

/**
 * Wait for battle menu selection
 */
async function waitForBattleMenuSelection() {
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
 * Wait for scenario selection
 */
async function waitForScenarioSelection() {
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
 * Read number input for experiment runs
 */
async function readRunCount() {
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

    // Show prompt
    process.stdout.write(CLEAR + HOME);
    process.stdout.write(`${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n`);
    process.stdout.write(`${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}RUN EXPERIMENT${RESET}                                           ${CYAN}${BOLD}║${RESET}\n`);
    process.stdout.write(`${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n`);
    process.stdout.write(`${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n`);
    process.stdout.write(`${CYAN}║${RESET}  ${WHITE}How many battles? (10-1000, default 100)${RESET}                   ${CYAN}║${RESET}\n`);
    process.stdout.write(`${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n`);
    process.stdout.write(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`);
    process.stdout.write('\n  > ');

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
 */
async function runSingleBattle() {
  process.stdout.write(CLEAR + HOME);
  process.stdout.write(`\n  ${CYAN}Running battle...${RESET}\n\n`);

  const result = await simulateBattle({
    scenario: currentScenario,
    maxRounds: 10
  });

  showBattleResult(result);
  await waitForAnyKey();
}

/**
 * Run experiment with progress display
 */
async function runExperimentWithProgress(runCount) {
  const results = [];

  for (let i = 0; i < runCount; i++) {
    // Update progress every 5 battles or for small counts
    if (i % 5 === 0 || runCount <= 20) {
      showExperimentProgressScreen(i, runCount);
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

  showExperimentStats(stats);
  await waitForAnyKey();
}

/**
 * Run battle menu loop
 */
async function runBattleMenu() {
  while (true) {
    showBattleMenu();
    const selection = await waitForBattleMenuSelection();

    switch (selection) {
      case 'single':
        await runSingleBattle();
        break;

      case 'experiment':
        const runCount = await readRunCount();
        await runExperimentWithProgress(runCount);
        break;

      case 'scenario':
        showScenarioSelection();
        const newScenario = await waitForScenarioSelection();
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
