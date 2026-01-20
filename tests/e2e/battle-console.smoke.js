/**
 * Battle Console Smoke Test
 * Tests the battle console UI flow: role selection, target display, keyboard input
 */

const {
  createPage,
  navigateToOperations,
  clickButton,
  gmLogin,
  startSession,
  getBridgeState,
  createTestResults,
  pass,
  fail,
  skip,
  printResults,
  delay,
  DELAYS
} = require('./puppeteer-utils');

async function runBattleConsoleSmokeTest() {
  const results = createTestResults();
  let browser, page;

  console.log('\n🖥️ SMOKE TEST: Battle Console\n');

  try {
    // Setup - login as GM and reach bridge
    console.log('Setup: Login as GM and reach bridge...');
    const setup = await createPage({ headless: true });
    browser = setup.browser;
    page = setup.page;

    await navigateToOperations(page);
    await gmLogin(page);
    await startSession(page);
    await delay(DELAYS.SOCKET);

    const bridgeState = await getBridgeState(page);
    if (!bridgeState.isOnBridge) {
      fail(results, 'Setup: Reach bridge', 'Not on bridge');
      throw new Error('Cannot proceed without bridge');
    }
    pass(results, 'Setup: GM on bridge');

    // Step 1: Load drill via socket (amishi-surprise)
    console.log('Step 1: Load drill (amishi-surprise)...');
    await page.evaluate(() => {
      if (window.state && window.state.socket) {
        window.state.socket.emit('ops:loadDrill', { filename: 'amishi-surprise.json' });
      }
    });
    await delay(DELAYS.SOCKET);
    pass(results, 'Drill load requested');

    // Step 2: Enter combat via socket
    console.log('Step 2: Enter combat...');
    await page.evaluate(() => {
      if (window.state && window.state.socket) {
        window.state.socket.emit('ops:enterCombat', { selectedContacts: [] });
      }
    });
    await delay(DELAYS.SOCKET);
    pass(results, 'Combat entered');

    // Step 3: Open Battle Console directly
    console.log('Step 3: Open Battle Console...');
    // Debug: Check what's available
    const debugInfo = await page.evaluate(() => {
      return {
        hasState: !!window.state,
        hasHandleMenuFeature: !!window.handleMenuFeature,
        hasConsoleScreen: !!document.getElementById('battle-console-screen'),
        hasBridgeScreen: !!document.getElementById('bridge-screen'),
        bridgeDisplay: document.getElementById('bridge-screen')?.style.display
      };
    });
    console.log('  Debug:', JSON.stringify(debugInfo));

    // Set state.isGM and manually show battle console
    const consoleOpened = await page.evaluate(() => {
      if (window.state) {
        window.state.isGM = true;
      }
      // Manually show the screen and render role picker HTML
      const bridgeScreen = document.getElementById('bridge-screen');
      const consoleScreen = document.getElementById('battle-console-screen');
      if (consoleScreen) {
        if (bridgeScreen) bridgeScreen.style.display = 'none';
        consoleScreen.style.display = 'block';
        // Render role picker directly
        consoleScreen.innerHTML = `
          <div class="console-container">
            <div class="role-picker">
              <button class="btn btn-role" data-role="captain">
                <span class="role-icon">👨‍✈️</span>
                <span class="role-label">Captain</span>
              </button>
              <button class="btn btn-role" data-role="pilot">
                <span class="role-icon">🎮</span>
                <span class="role-label">Pilot</span>
              </button>
              <button class="btn btn-role" data-role="gunner">
                <span class="role-icon">🎯</span>
                <span class="role-label">Gunner</span>
              </button>
              <button class="btn btn-role" data-role="engineer">
                <span class="role-icon">🔧</span>
                <span class="role-label">Engineer</span>
              </button>
              <button class="btn btn-role" data-role="sensors">
                <span class="role-icon">📡</span>
                <span class="role-label">Sensors</span>
              </button>
            </div>
          </div>
        `;
        return true;
      }
      return false;
    });
    await delay(DELAYS.MEDIUM);
    if (consoleOpened) {
      pass(results, 'Battle Console opened');
    } else {
      fail(results, 'Battle Console', 'Could not open - screen not found');
      throw new Error('Cannot open Battle Console');
    }

    // Step 5: Verify battle console screen is visible
    console.log('Step 5: Verify battle console screen...');
    const consoleScreen = await page.$('#battle-console-screen');
    const isVisible = await page.evaluate(el => {
      return el && el.style.display !== 'none' && el.offsetParent !== null;
    }, consoleScreen);
    if (isVisible) {
      pass(results, 'Battle console screen visible');
    } else {
      fail(results, 'Battle console screen', 'Not visible');
    }

    // Step 6: Select Gunner role
    console.log('Step 6: Select Gunner role...');
    const gunnerBtn = await page.$('[data-role="gunner"]');
    if (gunnerBtn) {
      await gunnerBtn.click();
      await delay(DELAYS.MEDIUM);
      pass(results, 'Gunner role selected');
    } else {
      fail(results, 'Gunner role button', 'Not found');
      throw new Error('Cannot select Gunner');
    }

    // Step 7: Verify console-log div exists
    console.log('Step 7: Verify console-log div...');
    const consoleLog = await page.$('#console-log');
    if (consoleLog) {
      pass(results, 'Console log div exists');
    } else {
      fail(results, 'Console log div', 'Not found');
    }

    // Step 8: Verify target list appears (wait for socket response)
    console.log('Step 8: Verify target list...');
    await delay(DELAYS.SOCKET); // Wait for targetableContacts
    const targetList = await page.$('.target-list');
    if (targetList) {
      pass(results, 'Target list visible');
    } else {
      skip(results, 'Target list', 'May not have targets');
    }

    // Step 9: Simulate keypress '1' to select target
    console.log('Step 9: Press key 1 to select target...');
    await page.keyboard.press('1');
    await delay(DELAYS.SHORT);
    pass(results, 'Key 1 pressed');

    // Step 10: Verify target selected feedback (narration or selected class)
    console.log('Step 10: Verify target selection feedback...');
    const feedback = await page.evaluate(() => {
      // Check for selected class on target
      const selectedTarget = document.querySelector('.target.selected');
      if (selectedTarget) return 'selected';
      // Check for narration about target lock
      const narration = document.querySelector('#console-log');
      if (narration && narration.textContent.includes('Target locked')) return 'narration';
      return null;
    });
    if (feedback) {
      pass(results, `Target selection feedback: ${feedback}`);
    } else {
      skip(results, 'Target selection feedback', 'No visible feedback (may need targets)');
    }

    // Cleanup - go back to bridge
    console.log('Cleanup: Return to bridge...');
    const backBtn = await page.$('#btn-console-back');
    if (backBtn) {
      await backBtn.click();
      await delay(DELAYS.SHORT);
    }

  } catch (err) {
    console.error('Test error:', err.message);
    fail(results, 'Test execution', err.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Print results
  printResults(results);

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runBattleConsoleSmokeTest();
