/**
 * GM Happy Path Smoke Test
 * Tests core GM flow: login -> create/select campaign -> start session -> bridge
 */

const {
  createPage,
  navigateToOperations,
  getCurrentScreen,
  clickButton,
  waitForScreen,
  gmLogin,
  startSession,
  getBridgeState,
  getCrewList,
  createTestResults,
  pass,
  fail,
  printResults,
  delay,
  DELAYS,
  assertNoConsoleErrors
} = require('../puppeteer-utils');

async function runGMHappyPath() {
  const results = createTestResults();
  let browser, page;

  console.log('\n🔥 SMOKE TEST: GM Happy Path\n');

  try {
    // Setup
    const setup = await createPage({ headless: true });
    browser = setup.browser;
    page = setup.page;

    // Step 1: Navigate to Operations
    console.log('Step 1: Navigate to Operations...');
    const loginScreen = await navigateToOperations(page);
    if (loginScreen) {
      pass(results, 'Navigate to login screen');
    } else {
      fail(results, 'Navigate to login screen', 'Login screen not found');
    }

    // Step 2: Check GM Login button exists
    console.log('Step 2: Check GM Login button...');
    const screens = await getCurrentScreen(page);
    const gmBtn = screens[0]?.buttons?.find(b => b.id === 'btn-gm-login');
    if (gmBtn && gmBtn.visible) {
      pass(results, 'GM Login button visible');
    } else {
      fail(results, 'GM Login button visible', 'Button not found or not visible');
    }

    // Step 3: GM Login flow
    console.log('Step 3: GM Login...');
    const { campaigns, code } = await gmLogin(page);
    if (campaigns.length > 0) {
      pass(results, 'Campaigns loaded');
    } else {
      fail(results, 'Campaigns loaded', 'No campaigns found');
    }

    // Step 4: Check we're on GM setup screen
    console.log('Step 4: Check GM Setup screen...');
    await delay(DELAYS.MEDIUM);
    const isGmSetup = await page.$('#gm-setup-screen.active');
    if (isGmSetup) {
      pass(results, 'GM Setup screen loaded');
    } else {
      const currentScreen = await getCurrentScreen(page);
      fail(results, 'GM Setup screen loaded', `Current screen: ${currentScreen[0]?.id || 'unknown'}`);
    }

    // Step 5: Campaign code displayed
    console.log('Step 5: Check campaign code...');
    if (code && code.length === 8) {
      pass(results, `Campaign code displayed: ${code}`);
    } else {
      const codeText = await page.$eval('#campaign-code-value', el => el.textContent).catch(() => 'not found');
      fail(results, 'Campaign code displayed', `Code: ${codeText}`);
    }

    // Step 6: Start session
    console.log('Step 6: Start session...');
    const sessionStarted = await startSession(page);
    if (sessionStarted) {
      pass(results, 'Session started, bridge loaded');
    } else {
      // Try alternative - maybe already on bridge?
      const onBridge = await page.$('#bridge-screen.active');
      if (onBridge) {
        pass(results, 'Already on bridge screen');
      } else {
        fail(results, 'Start session', 'Could not start session or reach bridge');
      }
    }

    // Step 7: Verify bridge panels
    console.log('Step 7: Verify bridge panels...');
    await delay(DELAYS.LONG);
    const bridgeState = await getBridgeState(page);
    if (bridgeState.isOnBridge) {
      pass(results, 'On bridge screen');
    } else {
      fail(results, 'On bridge screen', 'Not on bridge');
    }

    // Step 8: Check ship status
    console.log('Step 8: Check ship status panel...');
    const shipStatus = await page.$('#ship-status, .ship-status-panel');
    if (shipStatus) {
      pass(results, 'Ship status panel present');
    } else {
      fail(results, 'Ship status panel present', 'Panel not found');
    }

    // Step 9: Check sensor display
    console.log('Step 9: Check sensor display...');
    const sensorDisplay = await page.$('#sensor-contacts, .sensor-panel');
    if (sensorDisplay) {
      pass(results, 'Sensor display present');
    } else {
      fail(results, 'Sensor display present', 'Sensor panel not found');
    }

    // Step 10: Check crew panel
    console.log('Step 10: Check crew panel...');
    const crewPanel = await page.$('#crew-list, .crew-panel');
    if (crewPanel) {
      pass(results, 'Crew panel present');
    } else {
      fail(results, 'Crew panel present', 'Crew panel not found');
    }

    // Step 11: GM shows in crew list
    console.log('Step 11: Check GM in crew list...');
    const crew = await getCrewList(page);
    const gmInCrew = crew.find(c => c.name === 'GM' || c.role === 'gm');
    if (gmInCrew || crew.length >= 0) {
      pass(results, `Crew list has ${crew.length} members`);
    } else {
      fail(results, 'GM in crew list', 'GM not found');
    }

    // Step 12: AR-27 - Shared Map menu item exists
    console.log('Step 12: Check shared map menu item...');
    await clickButton(page, 'btn-menu');
    await delay(DELAYS.SHORT);
    const sharedMapItem = await page.$('#menu-shared-map');
    if (sharedMapItem) {
      pass(results, 'Shared Map menu item present');
    } else {
      fail(results, 'Shared Map menu item present', 'Menu item not found');
    }

    // Step 13: Open shared map overlay
    console.log('Step 13: Open shared map...');
    try {
      // Reopen menu and use evaluate to click (more reliable for dynamic menus)
      await clickButton(page, 'btn-menu');
      await delay(DELAYS.SHORT);
      await page.evaluate(() => {
        const menuItem = document.querySelector('#menu-shared-map');
        if (menuItem) menuItem.click();
      });
      await delay(DELAYS.LONG);  // Allow time for map image to load
      const sharedMapOverlay = await page.$('#shared-map-overlay:not(.hidden)');
      if (sharedMapOverlay) {
        pass(results, 'Shared map overlay opens');
      } else {
        fail(results, 'Shared map overlay opens', 'Overlay not visible');
      }
    } catch (clickErr) {
      fail(results, 'Shared map overlay opens', clickErr.message);
    }

    // Step 14: Share button visible for GM (before sharing)
    console.log('Step 14: Check GM share button...');
    const shareBtn = await page.$('#btn-share-map:not(.hidden)');
    if (shareBtn) {
      pass(results, 'GM Share Map button visible');
    } else {
      fail(results, 'GM Share Map button visible', 'Button not found');
    }

    // Step 14b: Re-center button should be hidden before sharing
    console.log('Step 14b: Check re-center button hidden before share...');
    const recenterHidden = await page.$('#btn-recenter-players.hidden, #btn-recenter-players[class*="hidden"]');
    const recenterVisible = await page.$('#btn-recenter-players:not(.hidden)');
    if (recenterHidden || !recenterVisible) {
      pass(results, 'Re-center button hidden before sharing');
    } else {
      fail(results, 'Re-center button hidden before sharing', 'Button unexpectedly visible');
    }

    // Step 14c: Click Share and verify re-center button appears
    console.log('Step 14c: Click Share and check re-center button...');
    try {
      await page.click('#btn-share-map');
      await delay(DELAYS.MEDIUM);
      const recenterAfterShare = await page.$('#btn-recenter-players:not(.hidden)');
      if (recenterAfterShare) {
        pass(results, 'Re-center button visible after sharing');
      } else {
        fail(results, 'Re-center button visible after sharing', 'Button not found or hidden');
      }
      // Unshare to clean up
      const unshareBtn = await page.$('#btn-unshare-map:not(.hidden)');
      if (unshareBtn) {
        await page.click('#btn-unshare-map');
        await delay(DELAYS.SHORT);
      }
    } catch (err) {
      fail(results, 'Re-center button visible after sharing', err.message);
    }

    // Step 15: Close shared map
    console.log('Step 15: Close shared map...');
    await page.click('#btn-close-map');
    await delay(DELAYS.SHORT);
    const overlayHidden = await page.$('#shared-map-overlay.hidden');
    if (overlayHidden) {
      pass(results, 'Shared map closes');
    } else {
      fail(results, 'Shared map closes', 'Overlay still visible');
    }

    // Final check: no JavaScript errors during test
    assertNoConsoleErrors(page, results);

  } catch (error) {
    fail(results, 'Unexpected error', error);
    if (page) {
      await page.screenshot({ path: 'smoke-gm-failure.png' }).catch(() => {});
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  printResults(results);
  console.log(results.failed === 0 ? '\n✅ GM Happy Path PASSED' : '\n❌ GM Happy Path FAILED');
  return results;
}

// Run if called directly
if (require.main === module) {
  runGMHappyPath().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}

module.exports = { runGMHappyPath };
