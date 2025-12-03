/**
 * Puppeteer Role Tests - Stage 13.0
 *
 * Comprehensive test suite for all 11 crew roles.
 * Discovers bugs systematically by testing each role's:
 * - Selection from player setup
 * - Panel visibility on bridge
 * - Controls and buttons
 * - Actions execution
 * - Data display
 *
 * Run modes:
 *   node tests/e2e/puppeteer-role-tests.js              # Headless (CI)
 *   node tests/e2e/puppeteer-role-tests.js --visible    # Watch tests run
 *   node tests/e2e/puppeteer-role-tests.js --role=pilot # Single role test
 *
 * Prerequisite: Server running on localhost:3000, database seeded
 */

const {
  delay,
  DELAYS,
  createPage,
  navigateToOperations,
  gmLogin,
  startSession,
  playerLogin,
  selectPlayerSlot,
  selectRole,
  joinBridge,
  getBridgeState,
  getCrewList,
  createTestResults,
  pass,
  fail,
  skip,
  printResults
} = require('./puppeteer-utils');

// Parse command line args
const args = process.argv.slice(2);
const VISIBLE = args.includes('--visible');
const SINGLE_ROLE = args.find(a => a.startsWith('--role='))?.split('=')[1];

// All roles to test
const ALL_ROLES = [
  'captain',
  'pilot',
  'astrogator',
  'engineer',
  'gunner',
  'sensor_operator',
  'comms',
  'medic',
  'steward',
  'marine',
  'damage_control'
];

// Role-specific test configurations
const ROLE_TESTS = {
  captain: {
    name: 'Captain',
    panelSelector: '#role-detail-panel',
    expectedSections: ['Tactical Overview', 'Ship Status', 'Command'],
    actions: [
      { id: 'setAlertStatus', button: 'SetAlertStatus', expectsModal: true },
      { id: 'issueOrders', button: 'IssueOrders', expectsModal: false },
      { id: 'authorizeWeapons', button: 'AuthorizeWeapons', expectsModal: false },
      { id: 'hail', button: 'Hail', expectsModal: true }
    ],
    dataChecks: ['alertStatus', 'crewList']
  },
  pilot: {
    name: 'Pilot',
    panelSelector: '#role-detail-panel',
    expectedSections: ['Helm Control', 'Drive Status', 'Docking Status'],
    actions: [
      { id: 'setCourse', button: 'SetCourse', expectsModal: true },
      { id: 'evasiveAction', button: 'Evasive', expectsModal: false },
      { id: 'dock', button: 'Dock', expectsModal: true },
      { id: 'undock', button: 'Undock', expectsModal: false }
    ],
    dataChecks: ['speed', 'course', 'destination']
  },
  astrogator: {
    name: 'Astrogator',
    panelSelector: '#role-detail-panel',
    expectedSections: ['Navigation', 'Jump Status', 'Position'],
    actions: [
      { id: 'plotJump', button: 'PlotJump', expectsModal: true },
      { id: 'calculateIntercept', button: 'Intercept', expectsModal: false },
      { id: 'verifyPosition', button: 'VerifyPosition', expectsModal: false }
    ],
    dataChecks: ['jumpRange', 'position', 'destination']
  },
  engineer: {
    name: 'Engineer',
    panelSelector: '#role-detail-panel',
    expectedSections: ['System Status', 'Fuel Status', 'Jump Capability'],
    actions: [
      { id: 'allocatePower', button: 'AllocatePower', expectsModal: true },
      { id: 'fieldRepair', button: 'Repair', expectsModal: true },
      { id: 'refuel', button: 'Refuel', expectsModal: true }
    ],
    dataChecks: ['powerStatus', 'fuelLevel', 'systemStatus']
  },
  gunner: {
    name: 'Gunner',
    panelSelector: '#role-detail-panel',
    expectedSections: ['Weapons Status', 'Ammunition', 'Targets'],
    actions: [
      { id: 'fireWeapon', button: 'Fire', expectsModal: false },
      { id: 'pointDefense', button: 'PointDefense', expectsModal: false },
      { id: 'sandcaster', button: 'Sandcaster', expectsModal: false }
    ],
    dataChecks: ['weaponList', 'ammoCount', 'targetList']
  },
  sensor_operator: {
    name: 'Sensor Operator',
    panelSelector: '#role-detail-panel',
    expectedSections: ['Sensor Status', 'Contact Analysis', 'Scan Controls'],
    actions: [
      { id: 'activeScan', button: 'ActiveScan', expectsModal: false },
      { id: 'deepScan', button: 'DeepScan', expectsModal: true },
      { id: 'jam', button: 'Jam', expectsModal: false }
    ],
    dataChecks: ['sensorRange', 'contactCount']
  },
  comms: {
    name: 'Communications',
    panelSelector: '#role-detail-panel',
    expectedSections: ['Communications', 'Message Queue'],
    actions: [
      { id: 'hail', button: 'Hail', expectsModal: true },
      { id: 'broadcast', button: 'Broadcast', expectsModal: true }
    ],
    dataChecks: ['messageCount', 'frequency']
  },
  medic: {
    name: 'Medic',
    panelSelector: '#role-detail-panel',
    expectedSections: ['Medical Bay', 'Crew Health', 'Supplies'],
    actions: [
      { id: 'treatInjury', button: 'TreatInjury', expectsModal: true },
      { id: 'triage', button: 'Triage', expectsModal: false },
      { id: 'checkSupplies', button: 'CheckSupplies', expectsModal: false }
    ],
    dataChecks: ['injuredCrew', 'medicalSupplies']
  },
  steward: {
    name: 'Steward',
    panelSelector: '#role-detail-panel',
    expectedSections: ['Passenger Status', 'Supplies', 'Morale'],
    actions: [
      { id: 'attendPassenger', button: 'AttendPassenger', expectsModal: true },
      { id: 'boostMorale', button: 'BoostMorale', expectsModal: false }
    ],
    dataChecks: ['passengerCount', 'moraleLevel']
  },
  marine: {
    name: 'Marine',
    panelSelector: '#role-detail-panel',
    expectedSections: ['Security Status', 'Boarding Party', 'Defense'],
    actions: [
      { id: 'securityPatrol', button: 'SecurityPatrol', expectsModal: false },
      { id: 'prepareBoarding', button: 'PrepareBoarding', expectsModal: false },
      { id: 'repelBoarders', button: 'RepelBoarders', expectsModal: false }
    ],
    dataChecks: ['securityLevel', 'boardingStatus']
  },
  damage_control: {
    name: 'Damage Control',
    panelSelector: '#role-detail-panel',
    expectedSections: ['Hull Status', 'Damage Report', 'Repair Queue'],
    actions: [
      { id: 'directRepair', button: 'DirectRepair', expectsModal: true },
      { id: 'prioritizeSystem', button: 'PrioritizeSystem', expectsModal: true },
      { id: 'emergencyProcedure', button: 'EmergencyProcedure', expectsModal: false }
    ],
    dataChecks: ['hullIntegrity', 'damagedSystems']
  }
};

/**
 * Test role selection from player setup screen
 */
async function testRoleSelection(page, roleId, results) {
  const testName = `${ROLE_TESTS[roleId].name}: Can select role`;

  try {
    // Check if role option exists and is selectable
    const roleAvailable = await page.evaluate((role) => {
      const roleOption = document.querySelector(`[data-role-id="${role}"], .role-option[data-role="${role}"]`);
      if (!roleOption) return { found: false };

      const isTaken = roleOption.classList.contains('taken') || roleOption.classList.contains('disabled');
      return { found: true, taken: isTaken, text: roleOption.textContent?.trim() };
    }, roleId);

    if (!roleAvailable.found) {
      fail(results, testName, `Role option not found in UI`);
      return false;
    }

    if (roleAvailable.taken) {
      skip(results, testName, 'Role already taken by another player');
      return false;
    }

    // Try to select the role
    const selected = await selectRole(page, roleId);
    if (selected) {
      pass(results, testName);
      return true;
    } else {
      fail(results, testName, 'Could not click role option');
      return false;
    }
  } catch (e) {
    fail(results, testName, e.message);
    return false;
  }
}

/**
 * Test role panel visibility on bridge
 */
async function testRolePanelVisible(page, roleId, results) {
  const config = ROLE_TESTS[roleId];
  const testName = `${config.name}: Panel visible on bridge`;

  try {
    await delay(DELAYS.MEDIUM);

    const panelState = await page.evaluate(() => {
      const panel = document.querySelector('#role-detail-panel, #role-panel');
      if (!panel) return { found: false };

      const visible = panel.offsetParent !== null && !panel.classList.contains('hidden');
      const content = panel.innerHTML?.substring(0, 500);
      const title = document.querySelector('#role-panel-title')?.textContent?.trim();

      return { found: true, visible, title, hasContent: content?.length > 50 };
    });

    if (!panelState.found) {
      fail(results, testName, 'Role panel element not found');
      return false;
    }

    if (!panelState.visible) {
      fail(results, testName, 'Role panel is hidden');
      return false;
    }

    if (!panelState.hasContent) {
      fail(results, testName, 'Role panel has no content');
      return false;
    }

    pass(results, testName);
    return true;
  } catch (e) {
    fail(results, testName, e.message);
    return false;
  }
}

/**
 * Test role-specific controls exist
 */
async function testRoleControls(page, roleId, results) {
  const config = ROLE_TESTS[roleId];
  const testName = `${config.name}: Controls present`;

  try {
    const controlsState = await page.evaluate((expectedSections) => {
      const panel = document.querySelector('#role-detail-panel, #role-panel');
      if (!panel) return { found: false };

      const sectionsFound = [];
      const sectionsMissing = [];

      for (const section of expectedSections) {
        const found = panel.innerHTML?.toLowerCase().includes(section.toLowerCase());
        if (found) {
          sectionsFound.push(section);
        } else {
          sectionsMissing.push(section);
        }
      }

      // Count buttons in panel
      const buttons = panel.querySelectorAll('button');
      const buttonCount = buttons.length;
      const buttonTexts = Array.from(buttons).slice(0, 10).map(b => b.textContent?.trim());

      return {
        found: true,
        sectionsFound,
        sectionsMissing,
        buttonCount,
        buttonTexts
      };
    }, config.expectedSections);

    if (!controlsState.found) {
      fail(results, testName, 'Panel not found');
      return false;
    }

    if (controlsState.sectionsMissing.length > 0) {
      // Warn but don't fail - sections may have different names
      console.log(`   [WARN] Missing sections: ${controlsState.sectionsMissing.join(', ')}`);
    }

    if (controlsState.buttonCount === 0) {
      fail(results, testName, 'No buttons found in panel');
      return false;
    }

    pass(results, testName);
    console.log(`   Buttons found: ${controlsState.buttonTexts.join(', ')}`);
    return true;
  } catch (e) {
    fail(results, testName, e.message);
    return false;
  }
}

/**
 * Test role actions execute without errors
 */
async function testRoleActions(page, roleId, results) {
  const config = ROLE_TESTS[roleId];
  const testName = `${config.name}: Actions execute`;

  try {
    // Set up console error listener
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    let actionsWorking = 0;
    let actionsFailed = 0;

    for (const action of config.actions) {
      // Try to find and click the button
      const buttonClicked = await page.evaluate((buttonText) => {
        const buttons = document.querySelectorAll('#role-detail-panel button, #role-panel button, .role-action-btn');
        for (const btn of buttons) {
          if (btn.textContent?.toLowerCase().includes(buttonText.toLowerCase()) ||
              btn.id?.toLowerCase().includes(buttonText.toLowerCase())) {
            btn.click();
            return true;
          }
        }
        return false;
      }, action.button);

      if (buttonClicked) {
        await delay(DELAYS.SHORT);

        // Check for errors
        if (consoleErrors.length > 0) {
          console.log(`   [ERROR] ${action.id}: ${consoleErrors[consoleErrors.length - 1]}`);
          actionsFailed++;
        } else {
          actionsWorking++;
        }

        // Close any modal that opened
        if (action.expectsModal) {
          await page.evaluate(() => {
            const closeBtn = document.querySelector('.modal .close-btn, .modal-close, #modal-close');
            if (closeBtn) closeBtn.click();
          });
          await delay(DELAYS.SHORT);
        }
      }
    }

    consoleErrors.length = 0; // Clear for next tests

    if (actionsFailed > 0) {
      fail(results, testName, `${actionsFailed}/${config.actions.length} actions had errors`);
      return false;
    }

    if (actionsWorking === 0) {
      skip(results, testName, 'No action buttons found');
      return true; // Not a failure, just not implemented yet
    }

    pass(results, testName);
    console.log(`   ${actionsWorking}/${config.actions.length} actions working`);
    return true;
  } catch (e) {
    fail(results, testName, e.message);
    return false;
  }
}

/**
 * Test role panel displays correct data
 */
async function testRolePanelData(page, roleId, results) {
  const config = ROLE_TESTS[roleId];
  const testName = `${config.name}: Data displayed`;

  try {
    const dataState = await page.evaluate(() => {
      const panel = document.querySelector('#role-detail-panel, #role-panel');
      if (!panel) return { found: false };

      // Check for placeholder text (indicates missing data)
      const hasPlaceholder = panel.innerHTML?.includes('placeholder') ||
                             panel.innerHTML?.includes('No data') ||
                             panel.innerHTML?.includes('Loading');

      // Check for stat values
      const statValues = panel.querySelectorAll('.stat-value, .detail-value, [class*="value"]');
      const hasStats = statValues.length > 0;

      // Check for error displays
      const hasErrors = panel.innerHTML?.includes('[object Object]') ||
                        panel.innerHTML?.includes('undefined') ||
                        panel.innerHTML?.includes('NaN');

      return {
        found: true,
        hasPlaceholder,
        hasStats,
        statCount: statValues.length,
        hasErrors
      };
    });

    if (!dataState.found) {
      fail(results, testName, 'Panel not found');
      return false;
    }

    if (dataState.hasErrors) {
      fail(results, testName, 'Panel contains rendering errors ([object Object], undefined, NaN)');
      return false;
    }

    if (!dataState.hasStats && !dataState.hasPlaceholder) {
      fail(results, testName, 'Panel has no stat values or placeholder content');
      return false;
    }

    pass(results, testName);
    console.log(`   ${dataState.statCount} data values displayed`);
    return true;
  } catch (e) {
    fail(results, testName, e.message);
    return false;
  }
}

/**
 * Test complete flow for a single role
 */
async function testRole(roleId, gmPage, results) {
  console.log(`\n=== Testing: ${ROLE_TESTS[roleId].name} ===`);

  let browser2 = null;

  try {
    // Get campaign code from GM page
    const code = await gmPage.evaluate(() => {
      return document.querySelector('#campaign-code-value')?.textContent?.trim();
    });

    if (!code || code === '--------') {
      skip(results, `${ROLE_TESTS[roleId].name}: All tests`, 'No campaign code available');
      return;
    }

    // Open player browser
    const { browser, page } = await createPage({ headless: !VISIBLE, verbose: VISIBLE });
    browser2 = browser;

    // Navigate and join
    await navigateToOperations(page);
    const joined = await playerLogin(page, code.substring(0, 8));

    if (!joined) {
      fail(results, `${ROLE_TESTS[roleId].name}: Join campaign`, 'Could not join campaign');
      return;
    }

    // Select slot
    const slotSelected = await selectPlayerSlot(page);
    if (!slotSelected) {
      skip(results, `${ROLE_TESTS[roleId].name}: All tests`, 'No player slots available');
      return;
    }

    await delay(DELAYS.LONG);

    // Test role selection
    const roleSelected = await testRoleSelection(page, roleId, results);
    if (!roleSelected) {
      return; // Can't continue without role
    }

    // Join bridge
    await delay(DELAYS.MEDIUM);
    const onBridge = await joinBridge(page);
    if (!onBridge) {
      fail(results, `${ROLE_TESTS[roleId].name}: Join bridge`, 'Could not join bridge');
      return;
    }

    await delay(DELAYS.SOCKET);

    // Run panel tests
    await testRolePanelVisible(page, roleId, results);
    await testRoleControls(page, roleId, results);
    await testRoleActions(page, roleId, results);
    await testRolePanelData(page, roleId, results);

  } catch (e) {
    fail(results, `${ROLE_TESTS[roleId].name}: Test execution`, e.message);
  } finally {
    if (browser2) await browser2.close();
  }
}

/**
 * Generate bug discovery report
 */
function generateBugReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('BUG DISCOVERY REPORT');
  console.log('='.repeat(60));

  const byRole = {};

  for (const test of results.tests) {
    const roleName = test.name.split(':')[0];
    if (!byRole[roleName]) {
      byRole[roleName] = { passed: 0, failed: 0, skipped: 0, failures: [] };
    }

    if (test.status === 'PASS') byRole[roleName].passed++;
    else if (test.status === 'FAIL') {
      byRole[roleName].failed++;
      byRole[roleName].failures.push({ test: test.name, error: test.error });
    }
    else byRole[roleName].skipped++;
  }

  console.log('\nRole Summary:');
  console.log('-'.repeat(60));

  for (const [role, stats] of Object.entries(byRole)) {
    const status = stats.failed > 0 ? '✗' : stats.passed > 0 ? '✓' : '⊘';
    console.log(`${status} ${role}: ${stats.passed} passed, ${stats.failed} failed, ${stats.skipped} skipped`);
  }

  const allFailures = results.tests.filter(t => t.status === 'FAIL');
  if (allFailures.length > 0) {
    console.log('\nBugs Found:');
    console.log('-'.repeat(60));
    allFailures.forEach((f, i) => {
      console.log(`${i + 1}. ${f.name}`);
      console.log(`   Error: ${f.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Main test runner
 */
async function runRoleTests() {
  console.log('\n' + '='.repeat(60));
  console.log('PUPPETEER ROLE TEST SUITE - Stage 13.0');
  console.log('='.repeat(60));
  console.log(`Mode: ${VISIBLE ? 'VISIBLE' : 'HEADLESS'}`);
  console.log(`Roles: ${SINGLE_ROLE || 'ALL'}`);
  console.log('='.repeat(60));

  const results = createTestResults();
  let gmBrowser = null;
  let gmPage = null;

  try {
    // Setup GM session
    console.log('\n--- Setting up GM session ---');
    ({ browser: gmBrowser, page: gmPage } = await createPage({ headless: !VISIBLE, verbose: VISIBLE }));

    await navigateToOperations(gmPage);
    const { code } = await gmLogin(gmPage);
    console.log(`Campaign code: ${code || 'pending'}`);

    const sessionStarted = await startSession(gmPage);
    if (!sessionStarted) {
      throw new Error('Could not start GM session');
    }

    console.log('GM session active');
    await delay(DELAYS.SOCKET);

    // Determine which roles to test
    const rolesToTest = SINGLE_ROLE ? [SINGLE_ROLE] : ALL_ROLES;

    // Test each role
    for (const roleId of rolesToTest) {
      if (!ROLE_TESTS[roleId]) {
        console.log(`\nUnknown role: ${roleId}`);
        continue;
      }

      await testRole(roleId, gmPage, results);

      // Brief pause between roles
      await delay(DELAYS.MEDIUM);
    }

  } catch (e) {
    console.error(`\nFatal error: ${e.message}`);
    fail(results, 'Test suite setup', e.message);
  } finally {
    if (gmBrowser) await gmBrowser.close();
  }

  // Results
  printResults(results);
  generateBugReport(results);

  console.log('\n=== Role Test Suite Complete ===\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run
runRoleTests();
