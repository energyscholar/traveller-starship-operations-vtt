/**
 * AR-103 Scaffolding Test: app.js Window Exports
 *
 * This test verifies all window.X functions exist in the browser after app.js loads.
 * Purpose: Safety net for app.js modular refactor - these exports must survive.
 *
 * Run: npm run cleanup:all; npm start & sleep 5; node tests/scaffolding/app-window-exports.test.js
 */

const puppeteer = require('puppeteer');

// Complete list of window exports from app.js (lines 4565-10759)
const EXPECTED_WINDOW_EXPORTS = [
  // Captain actions (lines 4565-4575)
  'captainSetAlert',
  'captainQuickOrder',
  'captainNavOrder',
  'captainContactOrder',
  'captainIssueOrder',
  'captainMarkContact',
  'captainWeaponsAuth',
  'captainRequestStatus',
  'captainLeadershipCheck',
  'captainTacticsCheck',
  'acknowledgeOrder',

  // System map (lines 8141-8260)
  'showSystemMap',
  'closeSystemMap',
  'showEmbeddedSystemMap',
  'hideEmbeddedSystemMap',
  'zoomEmbeddedMap',
  'expandEmbeddedMap',
  'showPilotDestinations',

  // Session storage (session-storage.js module)
  'getStoredSession',
  'clearStoredSession',
  'saveSessionData',

  // Engineer/Jump (lines 10648-10659)
  'attemptRepair',
  'openRefuelModal',
  'processFuel',
  'updatePower',
  'executeRefuel',
  'completeJump',
  'initiateJump',
  'plotJumpCourse',
  'verifyPosition',
  'initiateJumpFromPlot',
  'performScan',

  // ECM/Sensors (lines 10659-10665)
  'toggleECM',
  'toggleECCM',
  'toggleStealth',
  'setSensorLock',
  'acquireSensorLock',
  'breakSensorLock',
  'calculateSensorDM',

  // Weapons (lines 10666-10677)
  'authorizeWeapons',
  'fireAtTarget',
  'fireWeapon',
  'fireAllWeapons',
  'lockTarget',
  'selectWeapon',
  'selectWeaponByIndex',
  'togglePointDefense',
  'updateFireButton',
  'showWeaponsReference',
  'showRangeChart',

  // Library (lines 10679-10682)
  'showLibraryComputer',
  'searchLibrary',
  'showLibraryTab',
  'decodeUWPLibrary',

  // Menus (lines 10684-10686)
  'showCrewRosterMenu',
  'showShipConfiguration',
  'showMedicalRecords',

  // Combat contacts (lines 10688-10692)
  'showAddCombatContactModal',
  'submitCombatContact',
  'renderCombatContactsList',
  'toggleWeaponsFree',
  'removeCombatContact',

  // Misc (lines 10693-10759)
  'skipToJumpExit',
  'showNewsMailModal',
  'closeNewsMailModal',
  'updateFuelEstimate',
  'setRefuelMax',
  'setProcessMax',
  'executeProcessFuel',
  'updateJumpMap',
  'selectJumpDestination',
  'setMapSize',
  'showAddNPCContactForm',
  'submitNPCContact',
  'hailContact',
  'scanContact',
  'hailSelectedContact',
  'broadcastMessage',
  'sendCommsMessage',
  'copyShipLog',
  'copySensorPanel',
  'copyRolePanel',
  'closeModal',
  'relieveCrewMember',
  'submitFeedback',
  'showFeedbackReview',
  'copyLogAsTodo',
  'revealToPlayers',
  'editReveal',
  'updateReveal',
  'deleteReveal',
  'submitReveal',
  'revealNpc',
  'hideNpc',
  'showNpcDetail',
  'revealLocation',
  'hideLocation',
  'triggerEvent',
  'showEventDetail',
  'sendEmailNow',
  'queueEmail',
  'shareHandout',
  'hideHandout',
  'showHandoutDetail',
  'expandRolePanel',
  'collapseRolePanel',
  'restoreRolePanelExpansion',
  'toggleEvasive',
  'changeRange',
  'setCourse',
  'clearCourse',
  'advanceTime',
  'travel',
  'getPendingTravel',
  'undock',
  'setPowerPreset'
];

async function runTest() {
  console.log('=== AR-103 Scaffolding: Window Exports Test ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Collect JS errors
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    // Navigate and wait for app to load
    await page.goto('http://localhost:3000/operations', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#btn-gm-login', { timeout: 10000 });

    // Check all expected window exports
    const results = await page.evaluate((exports) => {
      const found = [];
      const missing = [];
      const wrongType = [];

      for (const name of exports) {
        if (typeof window[name] === 'function') {
          found.push(name);
        } else if (window[name] !== undefined) {
          wrongType.push({ name, type: typeof window[name] });
        } else {
          missing.push(name);
        }
      }

      return { found, missing, wrongType };
    }, EXPECTED_WINDOW_EXPORTS);

    // Report results
    console.log(`✅ Found: ${results.found.length}/${EXPECTED_WINDOW_EXPORTS.length} exports`);

    if (results.missing.length > 0) {
      console.log(`\n❌ MISSING (${results.missing.length}):`);
      results.missing.forEach(name => console.log(`   - ${name}`));
    }

    if (results.wrongType.length > 0) {
      console.log(`\n⚠️  WRONG TYPE (${results.wrongType.length}):`);
      results.wrongType.forEach(({ name, type }) =>
        console.log(`   - ${name}: expected function, got ${type}`)
      );
    }

    if (errors.length > 0) {
      console.log(`\n🔴 JS ERRORS (${errors.length}):`);
      errors.slice(0, 5).forEach(e => console.log(`   - ${e.substring(0, 80)}`));
    }

    // Final verdict
    const passed = results.missing.length === 0 && results.wrongType.length === 0 && errors.length === 0;
    console.log(`\n${passed ? '✅ PASS' : '❌ FAIL'}: Window exports scaffolding test`);

    return {
      passed,
      found: results.found.length,
      missing: results.missing.length,
      wrongType: results.wrongType.length,
      jsErrors: errors.length
    };

  } finally {
    await browser.close();
  }
}

// Run test
runTest()
  .then(result => {
    process.exit(result.passed ? 0 : 1);
  })
  .catch(err => {
    console.error('Test error:', err.message);
    process.exit(1);
  });
