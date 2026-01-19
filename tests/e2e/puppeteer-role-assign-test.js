/**
 * Puppeteer Test: Player Role Assignment
 * Tests a player joining a campaign and assigning themselves to a role
 *
 * Usage: node tests/e2e/puppeteer-role-assign-test.js
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');

const BASE_URL = fullUrl + '/';
const TIMEOUT = 30000;
// First 8 chars of the Dorannia campaign ID (from seed)
const CAMPAIGN_CODE = 'dorannia'.substring(0, 8);

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('\n=== Puppeteer Test: Player Role Assignment ===\n');

  let browser = null;
  let passed = true;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Capture console logs
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || text.includes('[PUPPETRY]') || text.includes('[OPS]')) {
        console.log(`  [BROWSER ${type}] ${text}`);
      }
    });

    // Navigate to operations
    console.log('1. Navigating to Operations VTT...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    await delay(1000);

    // Check login screen
    const loginScreen = await page.$('#login-screen.active');
    if (!loginScreen) {
      throw new Error('Login screen not displayed');
    }
    console.log('   Login screen displayed');

    // Click Player Login button
    console.log('2. Clicking Player Login...');
    await page.click('#btn-player-login');
    await delay(500);

    // Check for campaign code input
    await page.waitForSelector('#campaign-code-input:not(.hidden), #campaign-code', { timeout: 5000 });
    console.log('   Campaign code input visible');

    // Introspect login screen state
    const loginState = await page.evaluate(() => {
      const codeInput = document.querySelector('#campaign-code');
      const joinBtn = document.querySelector('#btn-join-campaign');
      return {
        codeInputId: codeInput?.id,
        codeInputVisible: codeInput?.offsetParent !== null,
        joinBtnId: joinBtn?.id,
        joinBtnVisible: joinBtn?.offsetParent !== null
      };
    });
    console.log('   Login state:', JSON.stringify(loginState));

    // Enter campaign code - need to find the actual Dorannia campaign ID
    console.log('3. Getting campaign code from GM view first...');

    // We need to get the actual campaign ID - let's peek at the DB or get it from GM flow
    // For now, try common approaches

    // First let's see what campaigns exist by querying the DOM after a quick GM peek
    // Actually, let's introspect the page more to find any displayed campaign codes

    // Let's try entering a code - the Dorannia campaign should have been seeded
    console.log('   Entering campaign code...');
    await page.type('#campaign-code', 'dorannia');  // The seed uses 'dorannia' as ID prefix
    await delay(500);

    // Click join campaign button
    const joinBtn = await page.$('#btn-join-campaign');
    if (joinBtn) {
      await joinBtn.click();
    } else {
      // Try pressing Enter
      await page.keyboard.press('Enter');
    }
    await delay(1500);

    // Check if we got player slot selection or an error
    const postJoinState = await page.evaluate(() => {
      const slotList = document.querySelector('#player-slot-list');
      const errorMsg = document.querySelector('.error-message, .notification.error');
      const activeScreen = document.querySelector('.screen.active');
      return {
        activeScreenId: activeScreen?.id,
        slotListVisible: slotList?.offsetParent !== null,
        slotCount: slotList?.children?.length || 0,
        slotHTML: slotList?.innerHTML?.substring(0, 300),
        errorMsg: errorMsg?.textContent
      };
    });
    console.log('   Post-join state:', JSON.stringify(postJoinState, null, 2));

    if (postJoinState.errorMsg) {
      console.log('   Error joining: ' + postJoinState.errorMsg);
      // Try to get actual campaign code via an alternative method
      throw new Error('Campaign join failed - may need correct campaign code');
    }

    // If we have slots, select one
    if (postJoinState.slotCount > 0) {
      console.log('4. Selecting player slot...');
      const firstSlot = await page.$('#player-slot-list .slot-card, #player-slot-list button, #player-slot-list > div:first-child');
      if (firstSlot) {
        await firstSlot.click();
        await delay(1000);
      }
    }

    // Wait for player setup screen
    console.log('5. Waiting for player setup screen...');
    try {
      await page.waitForSelector('#player-setup-screen.active', { timeout: 5000 });
      console.log('   Player setup screen displayed');
    } catch (e) {
      // Introspect current state
      const currentState = await page.evaluate(() => {
        const active = document.querySelector('.screen.active');
        return {
          activeId: active?.id,
          buttons: Array.from(active?.querySelectorAll('button') || []).map(b => ({
            id: b.id,
            text: b.textContent?.trim()?.substring(0, 30)
          })).slice(0, 10)
        };
      });
      console.log('   Current state:', JSON.stringify(currentState, null, 2));
      throw e;
    }

    // Select ship if needed
    console.log('6. Checking ship selection...');
    const shipState = await page.evaluate(() => {
      const shipList = document.querySelector('#ship-select-list');
      const ships = shipList?.querySelectorAll('.ship-card, .ship-option, button');
      return {
        shipCount: ships?.length || 0,
        ships: Array.from(ships || []).map(s => ({
          text: s.textContent?.trim()?.substring(0, 30),
          selected: s.classList?.contains('selected')
        }))
      };
    });
    console.log('   Ships:', JSON.stringify(shipState));

    if (shipState.shipCount > 0) {
      const firstShip = await page.$('#ship-select-list .ship-card:not(.selected), #ship-select-list .ship-option:not(.selected)');
      if (firstShip) {
        await firstShip.click();
        await delay(500);
      }
    }

    // Select role
    console.log('7. Selecting crew role...');
    const roleState = await page.evaluate(() => {
      const roleList = document.querySelector('#role-select-list');
      const roles = roleList?.querySelectorAll('.role-option:not(.taken)');
      return {
        roleCount: roles?.length || 0,
        roles: Array.from(roles || []).map(r => ({
          roleId: r.dataset?.roleId,
          text: r.textContent?.trim()?.substring(0, 40),
          isTaken: r.classList?.contains('taken')
        })).slice(0, 5)
      };
    });
    console.log('   Available roles:', JSON.stringify(roleState));

    if (roleState.roleCount === 0) {
      console.log('   No available roles - all may be taken');
      throw new Error('No available roles to assign');
    }

    // Click first available role
    const roleOption = await page.$('#role-select-list .role-option:not(.taken)');
    if (roleOption) {
      await roleOption.click();
      await delay(1000);
      console.log('   Role selected');
    }

    // Check if Join Bridge button is enabled
    const joinBridgeState = await page.evaluate(() => {
      const btn = document.querySelector('#btn-join-bridge');
      return {
        exists: !!btn,
        disabled: btn?.disabled,
        text: btn?.textContent?.trim()
      };
    });
    console.log('   Join Bridge button:', JSON.stringify(joinBridgeState));

    if (joinBridgeState.disabled) {
      throw new Error('Join Bridge button still disabled after role selection');
    }

    // Click Join Bridge
    console.log('8. Joining bridge...');
    await page.click('#btn-join-bridge');
    await delay(2000);

    // Verify we're on bridge screen with assigned role
    const bridgeState = await page.evaluate(() => {
      const bridgeScreen = document.querySelector('#bridge-screen.active');
      const userRole = document.querySelector('#bridge-user-role');
      const userName = document.querySelector('#bridge-user-name');
      return {
        onBridge: !!bridgeScreen,
        userName: userName?.textContent?.trim(),
        userRole: userRole?.textContent?.trim()
      };
    });
    console.log('   Bridge state:', JSON.stringify(bridgeState));

    if (!bridgeState.onBridge) {
      throw new Error('Did not reach bridge screen');
    }

    if (!bridgeState.userRole || bridgeState.userRole === 'Role') {
      throw new Error('Role not assigned on bridge');
    }

    console.log(`\n   SUCCESS: Player "${bridgeState.userName}" assigned to role "${bridgeState.userRole}"`);
    console.log('\nTest PASSED - Player role assignment successful');

  } catch (error) {
    console.error(`\nTest FAILED: ${error.message}`);
    passed = false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log('\n=== Test Complete ===\n');
  process.exit(passed ? 0 : 1);
}

runTest();
