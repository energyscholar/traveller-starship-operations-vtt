/**
 * Puppeteer Test Utilities for Operations VTT
 * Shared utilities for e2e testing - DOM introspection based
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000/';
const TIMEOUT = 30000;

// Common delays - use FAST_TEST=1 for quicker runs
const FAST = process.env.FAST_TEST === '1';
const DELAYS = {
  SHORT: FAST ? 100 : 200,
  MEDIUM: FAST ? 200 : 350,
  LONG: FAST ? 400 : 700,
  PAGE_LOAD: FAST ? 500 : 1000,
  SOCKET: FAST ? 800 : 1500
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create and configure a browser page
 */
async function createPage(options = {}) {
  const browser = await puppeteer.launch({
    headless: options.headless !== false ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Track console errors for test assertions
  page._consoleErrors = [];

  // Patterns to ignore (expected errors)
  const IGNORED_ERROR_PATTERNS = [
    /favicon\.ico/i,
    /Failed to load resource.*404/i,
    /net::ERR_/i  // Network errors during test teardown
  ];

  // Capture console logs and track errors
  if (options.logConsole !== false) {
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();

      // Track fatal JS errors
      if (type === 'error') {
        const isIgnored = IGNORED_ERROR_PATTERNS.some(p => p.test(text));
        if (!isIgnored) {
          page._consoleErrors.push({ type, text, timestamp: Date.now() });
          console.log(`  ❌ [BROWSER ERROR] ${text}`);
        }
      } else if (text.includes('[OPS]') || text.includes('[SystemMap]') || options.verbose) {
        console.log(`  [BROWSER ${type}] ${text}`);
      }
    });
  }

  // Also capture page errors (uncaught exceptions, syntax errors)
  page.on('pageerror', error => {
    const errorText = error.message || error.toString();
    page._consoleErrors.push({ type: 'pageerror', text: errorText, timestamp: Date.now() });
    console.log(`  ❌ [PAGE ERROR] ${errorText}`);
  });

  return { browser, page };
}

/**
 * Get all console errors captured during test
 */
function getConsoleErrors(page) {
  return page._consoleErrors || [];
}

/**
 * Assert no console errors occurred - call this to fail test on JS errors
 */
function assertNoConsoleErrors(page, results) {
  const errors = getConsoleErrors(page);
  if (errors.length > 0) {
    const errorSummary = errors.map(e => e.text).join('\n  ');
    fail(results, 'No JavaScript errors', `${errors.length} error(s):\n  ${errorSummary}`);
    return false;
  }
  pass(results, 'No JavaScript errors');
  return true;
}

/**
 * Clear console errors (for tests that expect errors in specific sections)
 */
function clearConsoleErrors(page) {
  page._consoleErrors = [];
}

/**
 * Navigate to Operations VTT
 */
async function navigateToOperations(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await delay(DELAYS.LONG);
  return page.$('#login-screen.active');
}

/**
 * Get current screen info via DOM introspection
 */
async function getCurrentScreen(page) {
  return page.evaluate(() => {
    const screens = document.querySelectorAll('.screen.active, [id$="-screen"].active');
    return Array.from(screens).map(s => ({
      id: s.id,
      classes: s.className,
      buttons: Array.from(s.querySelectorAll('button')).map(b => ({
        id: b.id,
        text: b.textContent?.trim()?.substring(0, 30),
        visible: b.offsetParent !== null,
        disabled: b.disabled
      })).filter(b => b.visible).slice(0, 15)
    }));
  });
}

/**
 * Click button by ID, text content, or selector
 */
async function clickButton(page, identifier) {
  // Try ID first
  let btn = await page.$(`#${identifier}`);
  if (btn) {
    await btn.click();
    return true;
  }

  // Try selector
  btn = await page.$(identifier);
  if (btn) {
    await btn.click();
    return true;
  }

  // Try finding by text content
  btn = await page.evaluateHandle((text) => {
    const buttons = document.querySelectorAll('button');
    for (const b of buttons) {
      if (b.textContent?.includes(text) && b.offsetParent) {
        return b;
      }
    }
    return null;
  }, identifier);

  if (btn && btn.asElement()) {
    await btn.asElement().click();
    return true;
  }

  return false;
}

/**
 * Wait for screen transition
 */
async function waitForScreen(page, screenId, timeout = 5000) {
  try {
    await page.waitForSelector(`#${screenId}.active`, { timeout });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * GM Login flow - returns campaign code
 */
async function gmLogin(page) {
  // Click GM Login
  await clickButton(page, 'btn-gm-login');
  await delay(DELAYS.LONG);

  // Wait for campaign selection screen
  await page.waitForSelector('#campaign-select:not(.hidden), #campaign-list', { timeout: 5000 });

  // Wait for campaigns to load via socket (campaign-item elements appear)
  try {
    await page.waitForSelector('#campaign-list .campaign-item, #campaign-list .campaign-card', { timeout: 5000 });
  } catch {
    // Check if "No campaigns yet" placeholder is shown
    const placeholder = await page.$eval('#campaign-list', el => el.textContent).catch(() => '');
    if (placeholder.includes('No campaigns')) {
      throw new Error('No campaigns found - run npm run ops:reset first');
    }
  }
  await delay(DELAYS.SHORT);

  // Get campaigns (campaign-item is the current class)
  const campaigns = await page.evaluate(() => {
    const cards = document.querySelectorAll('#campaign-list .campaign-item, #campaign-list .campaign-card');
    return Array.from(cards).map(c => ({
      text: c.textContent?.trim()?.substring(0, 50),
      id: c.dataset?.campaignId || c.id
    }));
  });

  if (campaigns.length === 0) {
    throw new Error('No campaigns found - run npm run ops:reset first');
  }

  // Click first campaign's select button
  const selectBtn = await page.$('#campaign-list .campaign-item .btn-select, #campaign-list .campaign-card');
  if (selectBtn) {
    await selectBtn.click();
    await delay(DELAYS.SOCKET);
  }

  // Wait for GM setup screen where campaign code is displayed
  await page.waitForSelector('#gm-setup-screen.active, #campaign-code-value', { timeout: 5000 });
  await delay(DELAYS.MEDIUM);

  // Get campaign code from the GM setup screen
  const code = await page.evaluate(() => {
    const codeEl = document.querySelector('#campaign-code-value');
    const text = codeEl?.textContent?.trim();
    // Return null if it's the placeholder
    return text && text !== '--------' ? text : null;
  });

  return { campaigns, code };
}

/**
 * Start session (from GM setup screen)
 */
async function startSession(page) {
  // Look for start session button
  const startBtn = await page.$('#btn-start-session, button[id*="start"]');
  if (startBtn) {
    await startBtn.click();
    await delay(DELAYS.SOCKET);
    return waitForScreen(page, 'bridge-screen');
  }
  return false;
}

/**
 * Get bridge state
 */
async function getBridgeState(page) {
  return page.evaluate(() => {
    return {
      isOnBridge: !!document.querySelector('#bridge-screen.active'),
      shipName: document.querySelector('#bridge-ship-name')?.textContent?.trim(),
      campaignName: document.querySelector('#bridge-campaign-name')?.textContent?.trim(),
      date: document.querySelector('#bridge-date')?.textContent?.trim(),
      location: document.querySelector('#bridge-location')?.textContent?.trim(),
      alertStatus: document.querySelector('#alert-status .alert-text')?.textContent?.trim(),
      userName: document.querySelector('#bridge-user-name')?.textContent?.trim(),
      userRole: document.querySelector('#bridge-user-role')?.textContent?.trim()
    };
  });
}

/**
 * Get crew list from bridge
 */
async function getCrewList(page) {
  return page.evaluate(() => {
    const container = document.querySelector('#crew-list, .crew-panel, [id*="crew"]');
    const members = container?.querySelectorAll('.crew-member') || [];
    return Array.from(members).map(m => ({
      name: m.querySelector('.crew-name')?.textContent?.trim(),
      role: m.querySelector('.crew-role')?.textContent?.trim(),
      isNPC: m.classList.contains('npc'),
      isYou: m.classList.contains('is-you'),
      hasRelieveBtn: !!m.querySelector('.btn-relieve')
    }));
  });
}

/**
 * Get contacts list from bridge
 */
async function getContactsList(page) {
  return page.evaluate(() => {
    const container = document.querySelector('#sensor-contacts, .contacts-panel');
    const contacts = container?.querySelectorAll('.contact-item, .contact') || [];
    return Array.from(contacts).map(c => ({
      name: c.querySelector('.contact-name, [class*="name"]')?.textContent?.trim(),
      type: c.querySelector('.contact-type, [class*="type"]')?.textContent?.trim(),
      range: c.querySelector('.contact-range, [class*="range"]')?.textContent?.trim()
    }));
  });
}

/**
 * Get ship log entries
 */
async function getLogEntries(page, limit = 10) {
  return page.evaluate((max) => {
    const container = document.querySelector('#ship-log, .log-panel');
    const entries = container?.querySelectorAll('.log-entry') || [];
    return Array.from(entries).slice(0, max).map(e => ({
      message: e.querySelector('.log-message, [class*="message"]')?.textContent?.trim(),
      time: e.querySelector('.log-time, [class*="time"]')?.textContent?.trim(),
      type: e.dataset?.type || e.className
    }));
  }, limit);
}

/**
 * Relieve a crew member (GM/Captain/Medic action)
 */
async function relieveCrewMember(page, crewName = null) {
  // Set up dialog handler
  page.once('dialog', async dialog => {
    await dialog.accept();
  });

  // Find relieve button
  let btn;
  if (crewName) {
    // Find specific crew member's button
    btn = await page.evaluateHandle((name) => {
      const members = document.querySelectorAll('.crew-member');
      for (const m of members) {
        if (m.querySelector('.crew-name')?.textContent?.includes(name)) {
          return m.querySelector('.btn-relieve');
        }
      }
      return null;
    }, crewName);
  } else {
    // Find first available
    btn = await page.$('.btn-relieve');
  }

  if (btn && (btn.asElement ? btn.asElement() : btn)) {
    await (btn.asElement ? btn.asElement() : btn).click();
    await delay(DELAYS.SOCKET);
    return true;
  }
  return false;
}

/**
 * Advance game time (GM action)
 */
async function advanceTime(page, hours = 0, minutes = 0) {
  // This typically requires opening a menu or modal
  const advanceBtn = await page.$('#btn-advance-time, button[id*="advance"]');
  if (advanceBtn) {
    await advanceBtn.click();
    await delay(DELAYS.MEDIUM);
    // Would need to interact with time input modal
    return true;
  }
  return false;
}

/**
 * Change alert status (GM action)
 */
async function setAlertStatus(page, status) {
  // Look for alert control
  const alertEl = await page.$('#alert-status, .alert-status');
  if (alertEl) {
    await alertEl.click();
    await delay(DELAYS.MEDIUM);
    // Find the status option
    const option = await page.$(`[data-status="${status}"], button[id*="${status.toLowerCase()}"]`);
    if (option) {
      await option.click();
      await delay(DELAYS.SOCKET);
      return true;
    }
  }
  return false;
}

/**
 * Player login flow
 */
async function playerLogin(page, campaignCode) {
  await clickButton(page, 'btn-player-login');
  await delay(DELAYS.MEDIUM);

  // Enter campaign code
  await page.type('#campaign-code', campaignCode);
  await delay(DELAYS.SHORT);

  // Join
  await clickButton(page, 'btn-join-campaign');
  await delay(DELAYS.SOCKET);

  // Check for slot list
  const hasSlots = await page.evaluate(() => {
    const slots = document.querySelector('#player-slot-list');
    return slots && slots.children.length > 0;
  });

  return hasSlots;
}

/**
 * Select player slot
 */
async function selectPlayerSlot(page, slotName = null) {
  let slot;
  if (slotName) {
    slot = await page.evaluateHandle((name) => {
      const slots = document.querySelectorAll('#player-slot-list .slot-item, #player-slot-list .slot-card, #player-slot-list button');
      for (const s of slots) {
        if (s.textContent?.includes(name)) {
          return s;
        }
      }
      return slots[0];
    }, slotName);
  } else {
    slot = await page.$('#player-slot-list .slot-item, #player-slot-list .slot-card, #player-slot-list button, #player-slot-list > div:first-child');
  }

  if (slot && (slot.asElement ? slot.asElement() : slot)) {
    await (slot.asElement ? slot.asElement() : slot).click();
    await delay(DELAYS.LONG);
    return true;
  }
  return false;
}

/**
 * Select ship in player setup
 */
async function selectShip(page, shipName = null) {
  let ship;
  if (shipName) {
    ship = await page.evaluateHandle((name) => {
      const ships = document.querySelectorAll('#ship-select-list .ship-card, #ship-select-list .ship-option');
      for (const s of ships) {
        if (s.textContent?.includes(name)) {
          return s;
        }
      }
      return ships[0];
    }, shipName);
  } else {
    ship = await page.$('#ship-select-list .ship-card:not(.selected), #ship-select-list .ship-option');
  }

  if (ship && (ship.asElement ? ship.asElement() : ship)) {
    await (ship.asElement ? ship.asElement() : ship).click();
    await delay(DELAYS.MEDIUM);
    return true;
  }
  return false;
}

/**
 * Select role in player setup
 */
async function selectRole(page, roleName = null) {
  let role;
  if (roleName) {
    role = await page.evaluateHandle((name) => {
      const roles = document.querySelectorAll('#role-select-list .role-option:not(.taken)');
      for (const r of roles) {
        if (r.dataset?.roleId === name.toLowerCase() || r.textContent?.toLowerCase().includes(name.toLowerCase())) {
          return r;
        }
      }
      return roles[0];
    }, roleName);
  } else {
    role = await page.$('#role-select-list .role-option:not(.taken)');
  }

  if (role && (role.asElement ? role.asElement() : role)) {
    await (role.asElement ? role.asElement() : role).click();
    await delay(DELAYS.SOCKET);
    return true;
  }
  return false;
}

/**
 * Join bridge (player action)
 */
async function joinBridge(page) {
  const btn = await page.$('#btn-join-bridge:not([disabled])');
  if (btn) {
    await btn.click();
    await delay(DELAYS.SOCKET);
    return waitForScreen(page, 'bridge-screen');
  }
  return false;
}

/**
 * Test result helpers
 */
function createTestResults() {
  return { passed: 0, failed: 0, tests: [] };
}

function pass(results, testName) {
  results.passed++;
  results.tests.push({ name: testName, status: 'PASS' });
  console.log(`\x1b[32m✓\x1b[0m ${testName}`);
}

function fail(results, testName, error) {
  results.failed++;
  results.tests.push({ name: testName, status: 'FAIL', error: error?.message || String(error) });
  console.log(`\x1b[31m✗\x1b[0m ${testName}: ${error?.message || error}`);
}

function skip(results, testName, reason) {
  results.tests.push({ name: testName, status: 'SKIP', reason });
  console.log(`\x1b[33m⊘\x1b[0m ${testName}: ${reason}`);
}

function printResults(results) {
  console.log('\n=== Results ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total: ${results.tests.length}`);
}

/**
 * AR-26: Screenshot on failure utility
 * Saves screenshot with timestamp and test name
 */
async function screenshotOnFailure(page, testName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = testName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = `screenshots/fail-${safeName}-${timestamp}.png`;

  // Ensure screenshots directory exists
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname, '../../screenshots');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    await page.screenshot({ path: path.join(dir, `fail-${safeName}-${timestamp}.png`), fullPage: true });
    console.log(`  📸 Screenshot saved: ${filename}`);
    return filename;
  } catch (err) {
    console.log(`  ⚠ Screenshot failed: ${err.message}`);
    return null;
  }
}

/**
 * AR-26: Fail with screenshot
 */
async function failWithScreenshot(page, results, testName, error) {
  results.failed++;
  results.tests.push({ name: testName, status: 'FAIL', error: error?.message || String(error) });
  console.log(`\x1b[31m✗\x1b[0m ${testName}: ${error?.message || error}`);
  if (page) {
    await screenshotOnFailure(page, testName);
  }
}

module.exports = {
  BASE_URL,
  TIMEOUT,
  DELAYS,
  delay,
  createPage,
  navigateToOperations,
  getCurrentScreen,
  clickButton,
  waitForScreen,
  gmLogin,
  startSession,
  getBridgeState,
  getCrewList,
  getContactsList,
  getLogEntries,
  relieveCrewMember,
  advanceTime,
  setAlertStatus,
  playerLogin,
  selectPlayerSlot,
  selectShip,
  selectRole,
  joinBridge,
  createTestResults,
  pass,
  fail,
  skip,
  printResults,
  screenshotOnFailure,
  failWithScreenshot,
  // Console error tracking
  getConsoleErrors,
  assertNoConsoleErrors,
  clearConsoleErrors
};
