/**
 * AR-153 Major Refactor Smoke Test
 *
 * Verifies that extracted functions are exposed on window object
 * after module extraction phases.
 */

const puppeteer = require('puppeteer');

const PHASE1_EXPORTS = [
  // Phase 1A: Power Management
  'setPowerPreset',
  'updatePower',
  'requestPowerStatus',

  // Phase 1B: Transit Calculator
  'updateTransitCalculator',
  'showPhysicsExplanation',
  'setupTransitCalculator',

  // Phase 1C: Copy/Export
  'copyShipLog',
  'copySensorPanel',
  'copyRolePanel',

  // Phase 1D: Jump Travel
  'requestJumpStatus',
  'updateFuelEstimate',
  'plotJumpCourse',
  'verifyPosition',
  'handleJumpPlotted',
  'initiateJumpFromPlot',
  'initiateJump',
  'completeJump',
  'skipToJumpExit'
];

const PHASE2_EXPORTS = [
  // Phase 2A: Jump Map
  'updateJumpMap',
  'fetchJumpDestinations',
  'selectJumpDestination',
  'initJumpMapIfNeeded',
  'setMapSize',
  'restoreMapSize',
  'initMapInteractions',

  // Phase 2B: Sensor Operations
  'performScan',
  'toggleECM',
  'toggleECCM',
  'acquireSensorLock',
  'breakSensorLock',
  'toggleStealth',
  'setSensorLock',
  'toggleSensorPanelMode',
  'checkSensorThreats',
  'renderMiniRadar',

  // Phase 2C: Panel Management
  'expandRolePanel',
  'collapseRolePanel',
  'togglePanelExpand',
  'expandPanel',
  'collapseExpandedPanel',
  'updateRoleClass'
];

const PHASE3_EXPORTS = [
  // Phase 3: Refueling Operations
  'openRefuelModal',
  'processFuel',
  'populateRefuelModal',
  'updateRefuelAmountPreview',
  'updateRefuelPreview',
  'executeRefuel',
  'setRefuelMax',
  'executeProcessFuel',
  'setProcessMax',
  'requestFuelStatus'
];

async function runTest() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    await page.goto('http://localhost:3000/operations', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    const ALL_EXPORTS = [...PHASE1_EXPORTS, ...PHASE2_EXPORTS, ...PHASE3_EXPORTS];
    const results = await page.evaluate((exports) => {
      const missing = [];
      const present = [];
      for (const name of exports) {
        if (typeof window[name] === 'function') {
          present.push(name);
        } else {
          missing.push(name);
        }
      }
      return { missing, present, total: exports.length };
    }, ALL_EXPORTS);

    console.log(`\n=== AR-153 Extraction Smoke Test ===\n`);
    console.log(`Total exports checked: ${results.total}`);
    console.log(`Present: ${results.present.length}`);
    console.log(`Missing: ${results.missing.length}`);

    if (results.missing.length > 0) {
      console.log(`\nMissing exports:`);
      results.missing.forEach(name => console.log(`  - ${name}`));
    }

    if (jsErrors.length > 0) {
      console.log(`\nJS Errors: ${jsErrors.length}`);
      jsErrors.slice(0, 3).forEach(err => console.log(`  - ${err}`));
    }

    const passed = results.missing.length === 0 && jsErrors.length === 0;
    console.log(`\n${passed ? '✓ PASS' : '✗ FAIL'}`);

    await browser.close();
    return passed;

  } catch (err) {
    console.error(`Test error: ${err.message}`);
    if (browser) await browser.close();
    return false;
  }
}

if (require.main === module) {
  runTest().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}

module.exports = { runTest, PHASE1_EXPORTS };
