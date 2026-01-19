#!/usr/bin/env node
/**
 * AR-260: E2E Tests for AR-251-259 Features
 *
 * Tests GUI adapters, ECM mechanics, critical hits, crew roster,
 * medical records, and sensor display compression.
 *
 * Run: npm run test:e2e tests/e2e/ar-251-260.e2e.js
 */

const { withBrowser } = require('./helpers/browser-with-cleanup');

// BASE_URL from config
const OPERATIONS_URL = `${BASE_URL}/operations`;

let testsPassed = 0;
let testsFailed = 0;

function log(status, name, detail = '') {
  const symbol = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '○';
  const color = status === 'pass' ? '\x1b[32m' : status === 'fail' ? '\x1b[31m' : '\x1b[33m';
  console.log(`${color}${symbol}\x1b[0m ${name}${detail ? ` - ${detail}` : ''}`);
  if (status === 'pass') testsPassed++;
  if (status === 'fail') testsFailed++;
}

// =====================================================
// AR-251: GUI ADAPTER WIRING
// =====================================================

async function testAdaptersLoad() {
  await withBrowser(async (browser, page) => {
    await page.goto(OPERATIONS_URL, { waitUntil: 'networkidle2' });

    // Check that adapters module loads without error
    const hasError = await page.evaluate(() => {
      return window._adapterLoadError || false;
    });

    if (!hasError) {
      log('pass', 'AR-251: GUI adapters load without error');
    } else {
      log('fail', 'AR-251: GUI adapters failed to load');
    }
  }, { timeout: 15000 });
}

// =====================================================
// AR-252: TUI MENU STACK (Unit tests exist)
// =====================================================

async function testMenuStackUnit() {
  // Menu stack tested via unit tests in tests/unit/menu-stack.test.js
  // Just verify the module exports correctly
  try {
    const { MenuStack, createMenuStack, renderMenu } = require('../../lib/combat/menu-stack');
    const stack = createMenuStack();
    stack.push('Test', [{ label: 'A' }]);
    if (stack.depth() === 1 && stack.current().title === 'Test') {
      log('pass', 'AR-252: Menu stack module exports correctly');
    } else {
      log('fail', 'AR-252: Menu stack module exports incorrect');
    }
  } catch (err) {
    log('fail', 'AR-252: Menu stack module import failed', err.message);
  }
}

// =====================================================
// AR-255: ECM/ECCM MECHANICS (Unit tests exist)
// =====================================================

async function testECMMechanicsUnit() {
  try {
    const sensors = require('../../lib/engine/roles/sensors-state');

    // Test ECM penalty
    const ecmPenalty = sensors.calculateECMPenalty({ ecm: true }, { eccm: false });
    if (ecmPenalty !== -2) {
      log('fail', 'AR-255: ECM penalty should be -2', `got ${ecmPenalty}`);
      return;
    }

    // Test ECCM counter
    const partialCounter = sensors.calculateECMPenalty({ ecm: true }, { eccm: true });
    if (partialCounter !== -1) {
      log('fail', 'AR-255: ECCM should partially counter to -1', `got ${partialCounter}`);
      return;
    }

    // Test sensor lock bonus
    const lockBonus = sensors.calculateSensorLockBonus({ sensorLock: 'target1' }, 'target1', true);
    if (lockBonus !== 1) {
      log('fail', 'AR-255: Sensor lock guided weapon bonus should be 1', `got ${lockBonus}`);
      return;
    }

    log('pass', 'AR-255: ECM/ECCM mechanics calculate correctly');
  } catch (err) {
    log('fail', 'AR-255: ECM mechanics test failed', err.message);
  }
}

// =====================================================
// AR-256: CRITICAL HITS HULL THRESHOLD
// =====================================================

async function testCriticalHitsThreshold() {
  try {
    const combat = require('../../lib/operations/combat');

    // Test threshold crossing
    // Ship with 100 hull, taking 15 damage from 100 to 85 crosses 1 threshold (90%)
    const crossed1 = combat.countThresholdsCrossed(85, 100, 100);
    if (crossed1 !== 1) {
      log('fail', 'AR-256: 100→85 should cross 1 threshold', `got ${crossed1}`);
      return;
    }

    // 100 to 75 crosses 2 thresholds (90% and 80%)
    const crossed2 = combat.countThresholdsCrossed(75, 100, 100);
    if (crossed2 !== 2) {
      log('fail', 'AR-256: 100→75 should cross 2 thresholds', `got ${crossed2}`);
      return;
    }

    // No damage = no thresholds
    const crossedNone = combat.countThresholdsCrossed(100, 100, 100);
    if (crossedNone !== 0) {
      log('fail', 'AR-256: No damage should cross 0 thresholds', `got ${crossedNone}`);
      return;
    }

    log('pass', 'AR-256: Hull threshold critical hits calculate correctly');
  } catch (err) {
    log('fail', 'AR-256: Critical hits test failed', err.message);
  }
}

// =====================================================
// AR-257: CREW ROSTER DISPLAY
// =====================================================

async function testCrewRosterModal() {
  await withBrowser(async (browser, page) => {
    await page.goto(OPERATIONS_URL, { waitUntil: 'networkidle2' });

    // Wait for app to initialize
    await page.waitForSelector('#hamburger-btn', { timeout: 5000 }).catch(() => null);

    // Check crew roster menu module exists
    const hasCrewRoster = await page.evaluate(() => {
      return typeof window.showCrewRosterMenu === 'function';
    });

    if (hasCrewRoster) {
      log('pass', 'AR-257: Crew roster modal function available');
    } else {
      log('fail', 'AR-257: Crew roster modal function not found');
    }
  }, { timeout: 15000 });
}

// =====================================================
// AR-258: MEDICAL RECORDS PANEL
// =====================================================

async function testMedicalRecordsModal() {
  await withBrowser(async (browser, page) => {
    await page.goto(OPERATIONS_URL, { waitUntil: 'networkidle2' });

    await page.waitForSelector('#hamburger-btn', { timeout: 5000 }).catch(() => null);

    const hasMedicalRecords = await page.evaluate(() => {
      return typeof window.showMedicalRecords === 'function';
    });

    if (hasMedicalRecords) {
      log('pass', 'AR-258: Medical records modal function available');
    } else {
      log('fail', 'AR-258: Medical records modal function not found');
    }
  }, { timeout: 15000 });
}

// =====================================================
// AR-259: SENSOR DISPLAY COMPRESSION
// =====================================================

async function testSensorDisplayCompression() {
  await withBrowser(async (browser, page) => {
    await page.goto(OPERATIONS_URL, { waitUntil: 'networkidle2' });

    // Check for compact contact CSS class existence
    const hasCompactStyles = await page.evaluate(() => {
      // Check if stylesheet has sensor-contact-compact class
      const sheets = document.styleSheets;
      for (const sheet of sheets) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          for (const rule of rules) {
            if (rule.selectorText && rule.selectorText.includes('sensor-contact-compact')) {
              return true;
            }
          }
        } catch (e) {
          // Cross-origin stylesheet, skip
        }
      }
      return false;
    });

    if (hasCompactStyles) {
      log('pass', 'AR-259: Sensor compact display CSS loaded');
    } else {
      log('fail', 'AR-259: Sensor compact display CSS not found');
    }
  }, { timeout: 15000 });
}

// =====================================================
// MAIN TEST RUNNER
// =====================================================

async function runTests() {
  console.log('\n=== AR-251 to AR-260 E2E Tests ===\n');

  // Unit-based tests (no browser needed)
  console.log('--- Module Tests ---\n');
  await testMenuStackUnit();
  await testECMMechanicsUnit();
  await testCriticalHitsThreshold();

  // Browser-based tests
  console.log('\n--- Browser Tests ---\n');
  try {
    await testAdaptersLoad();
    await testCrewRosterModal();
    await testMedicalRecordsModal();
    await testSensorDisplayCompression();
  } catch (err) {
    console.error('Browser test error:', err.message);
    testsFailed++;
  }

  // Summary
  console.log('\n========================================');
  console.log(`RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('========================================\n');

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
