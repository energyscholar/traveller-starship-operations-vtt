#!/usr/bin/env node
/**
 * AR-261: Unified TUI Menu
 *
 * Main entry point for ALL TUI modes:
 *   [C] Combat Demos (6 scenarios)
 *   [E] Ship Editor (stub)
 *   [M] System Map Browser (stub)
 *
 * Run: node bin/tui-menu.js
 *      npm run tui
 */

const { spawn } = require('child_process');
const path = require('path');

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

const VERSION = '1.0.0';

// ════════════════════════════════════════════════════════════════════
// MAIN MENU
// ════════════════════════════════════════════════════════════════════

function showMainMenu() {
  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}      ${WHITE}${BOLD}TRAVELLER OPERATIONS VTT - TUI MODE${RESET}                   ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}      ${DIM}v${VERSION}${RESET}                                                ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}${BOLD}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[C]${RESET} ${WHITE}Combat Demos${RESET}                                         ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}6 combat scenarios - AUTO and MANUAL modes${RESET}             ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}Fleet battles, called shots, engine architecture${RESET}       ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[E]${RESET} ${DIM}Ship Editor${RESET}                                          ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}Coming soon - Design and modify ships${RESET}                  ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[M]${RESET} ${DIM}System Map Browser${RESET}                                   ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}Coming soon - Browse Spinward Marches systems${RESET}          ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press a key to select${RESET}                                      ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${DIM}Press Q or Ctrl+C to quit${RESET}                                   ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

// ════════════════════════════════════════════════════════════════════
// STUB SCREENS
// ════════════════════════════════════════════════════════════════════

function showStubScreen(title, description) {
  const out = CLEAR + HOME +
    `${YELLOW}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${YELLOW}${BOLD}║${RESET}  ${WHITE}${BOLD}${title}${RESET}${' '.repeat(60 - title.length)}${YELLOW}${BOLD}║${RESET}\n` +
    `${YELLOW}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${YELLOW}║${RESET}                                                                ${YELLOW}║${RESET}\n` +
    `${YELLOW}║${RESET}  ${description}${' '.repeat(60 - description.length)}${YELLOW}║${RESET}\n` +
    `${YELLOW}║${RESET}                                                                ${YELLOW}║${RESET}\n` +
    `${YELLOW}║${RESET}  ${DIM}This feature is planned for a future release.${RESET}               ${YELLOW}║${RESET}\n` +
    `${YELLOW}║${RESET}  ${DIM}Check AR-261-270 roadmap for timeline.${RESET}                      ${YELLOW}║${RESET}\n` +
    `${YELLOW}║${RESET}                                                                ${YELLOW}║${RESET}\n` +
    `${YELLOW}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${YELLOW}║${RESET}  ${GREEN}Press any key to return to main menu${RESET}                       ${YELLOW}║${RESET}\n` +
    `${YELLOW}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

async function waitForAnyKey() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
      cleanup();
      // Ctrl+C
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

// ════════════════════════════════════════════════════════════════════
// COMBAT DEMO LAUNCHER
// ════════════════════════════════════════════════════════════════════

async function launchCombatDemo() {
  // Clear screen and run combat demo as child process
  process.stdout.write(CLEAR + HOME);

  const combatDemoPath = path.join(__dirname, '..', 'tests', 'e2e', 'helpers', 'combat-demo.js');

  return new Promise((resolve, reject) => {
    const child = spawn('node', [combatDemoPath], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    child.on('close', (code) => {
      resolve(code);
    });

    child.on('error', (err) => {
      process.stdout.write(`${RED}Error launching combat demo: ${err.message}${RESET}\n`);
      reject(err);
    });
  });
}

// ════════════════════════════════════════════════════════════════════
// MAIN SELECTION HANDLER
// ════════════════════════════════════════════════════════════════════

async function waitForMainSelection() {
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

      // Q to quit
      if (key === 'q' || key === 'Q') {
        cleanup();
        process.stdout.write(`${CLEAR}${HOME}${DIM}Goodbye, Traveller.${RESET}\n`);
        process.exit(0);
      }

      // C for Combat Demos
      if (key === 'c' || key === 'C') {
        cleanup();
        resolve('combat');
        return;
      }

      // E for Ship Editor (stub)
      if (key === 'e' || key === 'E') {
        cleanup();
        resolve('editor');
        return;
      }

      // M for System Map Browser (stub)
      if (key === 'm' || key === 'M') {
        cleanup();
        resolve('map');
        return;
      }

      // Ignore other keys
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

// ════════════════════════════════════════════════════════════════════
// MAIN LOOP
// ════════════════════════════════════════════════════════════════════

async function main() {
  while (true) {
    showMainMenu();
    const selection = await waitForMainSelection();

    switch (selection) {
      case 'combat':
        await launchCombatDemo();
        break;

      case 'editor':
        showStubScreen('SHIP EDITOR', 'Design and modify starship configurations');
        await waitForAnyKey();
        break;

      case 'map':
        showStubScreen('SYSTEM MAP BROWSER', 'Browse Spinward Marches stellar systems');
        await waitForAnyKey();
        break;
    }
  }
}

main().catch((err) => {
  console.error(`${RED}Fatal error: ${err.message}${RESET}`);
  process.exit(1);
});
