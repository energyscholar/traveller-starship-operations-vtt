#!/usr/bin/env node
/**
 * Captain Solo E2E Test Suite
 *
 * Tests: AR-171, AR-172, AR-173
 * Use Cases: CS-1 through CS-4
 *
 * Verifies Captain can operate all ship functions without changing roles.
 */

const {
  createPage,
  navigateToOperations,
  gmLogin,
  startSession,
  delay,
  DELAYS,
  createTestResults,
  pass,
  fail,
  printResults
} = require('./puppeteer-utils');

const RESULTS = { passed: 0, failed: 0, errors: [] };

/**
 * Join as player with campaign code and select Captain role
 */
async function joinAsCaptain(page, campaignCode) {
  await navigateToOperations(page);
  await delay(1000);

  // Click Player Login
  console.log('  Clicking Player Login...');
  await page.click('#btn-player-login');
  await delay(1000);

  // Enter campaign code
  console.log(`  Entering code: ${campaignCode}`);
  await page.type('#campaign-code', campaignCode);
  await delay(500);

  // Click Join as Player
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.includes('Join as Player'));
    if (btn) btn.click();
  });
  await delay(2000);

  // Select first available slot
  console.log('  Selecting player slot...');
  await page.evaluate(() => {
    const joinBtn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.trim() === 'Join');
    if (joinBtn) joinBtn.click();
  });
  await delay(2000);

  // Select Captain role
  console.log('  Selecting Captain role...');
  await page.evaluate(() => {
    const captainBtn = document.querySelector('[data-role-id="captain"]');
    if (captainBtn) captainBtn.click();
  });
  await delay(1000);

  // Join Bridge
  console.log('  Joining bridge...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.includes('Join Bridge'));
    if (btn) btn.click();
  });
  await delay(3000);

  // Verify we're on bridge
  const onBridge = await page.$('#bridge-screen.active');
  return !!onBridge;
}

// ==============================================
// CS-1: Captain Pilot Sub-Panel
// ==============================================
async function testCS1_PilotSubPanel(page) {
  console.log('\n--- CS-1: Captain → Pilot Sub-Panel ---');

  // Open role panel with hotkey 2
  await page.keyboard.press('2');
  await delay(1000);

  // Switch to pilot sub-panel
  const switched = await page.evaluate(() => {
    if (typeof window.switchCaptainPanel === 'function') {
      window.switchCaptainPanel('pilot');
      return true;
    }
    return false;
  });
  await delay(1500);

  if (!switched) {
    RESULTS.failed++;
    RESULTS.errors.push('CS-1: switchCaptainPanel not available');
    console.log('  ✗ CS-1 FAILED - switchCaptainPanel not available');
    return false;
  }

  // Verify pilot controls visible
  const controls = await page.evaluate(() => ({
    hasSetCourse: !!Array.from(document.querySelectorAll('button'))
                    .find(b => b.textContent.includes('Set Course')) ||
                  !!document.getElementById('btn-set-course') ||
                  !!document.querySelector('[onclick*="showPlacesOverlay"]'),
    hasEvasive: !!document.getElementById('evasive-toggle') ||
                !!Array.from(document.querySelectorAll('button'))
                  .find(b => b.textContent.includes('Evasive')),
    noErrors: !document.body.textContent.includes('Error') &&
              !document.body.textContent.includes('undefined')
  }));

  console.log('  Pilot controls found:', controls);

  if (controls.noErrors && (controls.hasSetCourse || controls.hasEvasive)) {
    console.log('  ✓ CS-1 PASSED');
    RESULTS.passed++;
    return true;
  } else {
    console.log('  ✗ CS-1 FAILED - Missing pilot controls or errors detected');
    RESULTS.failed++;
    RESULTS.errors.push('CS-1: Pilot sub-panel missing controls');
    return false;
  }
}

// ==============================================
// CS-2: Captain Astrogator Sub-Panel
// ==============================================
async function testCS2_AstrogatorSubPanel(page) {
  console.log('\n--- CS-2: Captain → Astrogator Sub-Panel ---');

  await page.evaluate(() => window.switchCaptainPanel('astrogator'));
  await delay(1500);

  const controls = await page.evaluate(() => ({
    hasDestInput: !!document.getElementById('jump-destination'),
    hasPlotButton: !!Array.from(document.querySelectorAll('button'))
                     .find(b => b.textContent.includes('Plot')),
    noErrors: !document.body.textContent.includes('Error')
  }));

  console.log('  Astrogator controls found:', controls);

  if (controls.hasDestInput || controls.hasPlotButton) {
    console.log('  ✓ CS-2 PASSED');
    RESULTS.passed++;
    return true;
  } else {
    console.log('  ✗ CS-2 FAILED');
    RESULTS.failed++;
    return false;
  }
}

// ==============================================
// CS-3: Captain Engineer Sub-Panel
// ==============================================
async function testCS3_EngineerSubPanel(page) {
  console.log('\n--- CS-3: Captain → Engineer Sub-Panel ---');

  await page.evaluate(() => window.switchCaptainPanel('engineer'));
  await delay(1500);

  const controls = await page.evaluate(() => {
    const bodyText = document.body.textContent;
    return {
      hasFuelStatus: !!document.querySelector('.fuel-status, .fuel-display'),
      hasPowerControls: !!document.querySelector('.power-allocation, .power-controls'),
      hasSystemStatus: !!document.querySelector('.system-status, .systems-grid'),
      hasRepairButton: !!Array.from(document.querySelectorAll('button'))
                         .find(b => b.textContent.includes('Repair')),
      noErrors: !bodyText.includes('Error') && !bodyText.includes('undefined')
    };
  });

  console.log('  Engineer controls found:', controls);

  if (controls.noErrors && (controls.hasFuelStatus || controls.hasPowerControls)) {
    console.log('  ✓ CS-3 PASSED');
    RESULTS.passed++;
    return true;
  } else {
    console.log('  ✗ CS-3 FAILED');
    RESULTS.failed++;
    RESULTS.errors.push('CS-3: Engineer sub-panel missing controls');
    return false;
  }
}

// ==============================================
// CS-4: Full Solo Journey
// ==============================================
async function testCS4_FullSoloJourney(page) {
  console.log('\n--- CS-4: Full Solo Journey ---');

  // Rotate through all panels
  await page.evaluate(() => window.switchCaptainPanel('pilot'));
  await delay(500);
  await page.evaluate(() => window.switchCaptainPanel('engineer'));
  await delay(500);
  await page.evaluate(() => window.switchCaptainPanel('astrogator'));
  await delay(500);
  await page.evaluate(() => window.switchCaptainPanel('captain'));
  await delay(500);

  const state = await page.evaluate(() => ({
    panel: window.state?.captainActivePanel,
    errors: window.state?.lastError
  }));

  if (!state.errors) {
    console.log('  ✓ CS-4 PASSED - Full panel rotation complete');
    RESULTS.passed++;
    return true;
  } else {
    console.log('  ✗ CS-4 FAILED');
    RESULTS.failed++;
    return false;
  }
}

// ==============================================
// Main
// ==============================================
(async () => {
  console.log('═'.repeat(50));
  console.log('CAPTAIN SOLO E2E TEST SUITE');
  console.log('═'.repeat(50));

  let gmBrowser, gmPage, playerBrowser, playerPage;

  try {
    // Step 1: Start GM session
    console.log('\n--- Step 1: Starting GM Session ---');
    const gmSetup = await createPage({ headless: false });
    gmBrowser = gmSetup.browser;
    gmPage = gmSetup.page;

    // Auto-accept dialogs (role replacement confirmations, etc.)
    gmPage.on('dialog', async dialog => {
      console.log(`  [GM DIALOG] ${dialog.message().substring(0, 50)}`);
      await dialog.accept();
    });

    await navigateToOperations(gmPage);
    const { code } = await gmLogin(gmPage);
    console.log(`  Campaign code: ${code}`);

    if (!code || code === '--------') {
      throw new Error('Failed to get campaign code');
    }

    const sessionStarted = await startSession(gmPage);
    if (!sessionStarted) {
      throw new Error('Failed to start GM session');
    }
    console.log('  ✓ GM session started');

    // Step 2: Join as Captain
    console.log('\n--- Step 2: Joining as Captain ---');
    const playerSetup = await createPage({ headless: false });
    playerBrowser = playerSetup.browser;
    playerPage = playerSetup.page;

    // Auto-accept dialogs (role replacement confirmations, etc.)
    playerPage.on('dialog', async dialog => {
      console.log(`  [PLAYER DIALOG] ${dialog.message().substring(0, 50)}`);
      await dialog.accept();
    });

    const joined = await joinAsCaptain(playerPage, code);
    if (!joined) {
      throw new Error('Failed to join as Captain');
    }
    console.log('  ✓ Joined as Captain');

    // Step 3: Run tests
    await testCS1_PilotSubPanel(playerPage);
    await testCS2_AstrogatorSubPanel(playerPage);
    await testCS3_EngineerSubPanel(playerPage);
    await testCS4_FullSoloJourney(playerPage);

  } catch (err) {
    console.error('\n✗ SUITE ERROR:', err.message);
    RESULTS.errors.push(err.message);
    RESULTS.failed++;
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('RESULTS');
  console.log('═'.repeat(50));
  console.log(`Passed: ${RESULTS.passed}`);
  console.log(`Failed: ${RESULTS.failed}`);

  if (RESULTS.errors.length > 0) {
    console.log('\nErrors:');
    RESULTS.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
  }

  // Cleanup
  if (gmBrowser) await gmBrowser.close();
  if (playerBrowser) await playerBrowser.close();

  process.exit(RESULTS.failed > 0 ? 1 : 0);
})();
