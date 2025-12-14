/**
 * E2E Test: Ship Indicator on Maps
 * Verifies ship indicators appear on both Subsector and System maps
 */

const { withBrowser } = require('./helpers/browser-with-cleanup');

const BASE_URL = 'http://localhost:3000';

async function runTest() {
  console.log('=== Ship Indicator E2E Test ===\n');

  await withBrowser(async (browser, page) => {
    // 1. Go to operations and login as GM
    console.log('1. Loading operations page...');
    await page.goto(`${BASE_URL}/operations/`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'tests/e2e/screenshots/01-landing.png' });

    // Click GM Login
    console.log('2. Clicking GM Login...');
    await page.waitForSelector('#btn-gm-login', { timeout: 5000 });
    await page.click('#btn-gm-login');
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'tests/e2e/screenshots/02-after-gm-login.png' });

    // 3. Select campaign (click Select button)
    console.log('3. Selecting campaign...');
    const campaignClicked = await page.evaluate(() => {
      const btn = document.querySelector('.btn-select');
      if (btn) { btn.click(); return true; }
      return false;
    });
    console.log('   Campaign selected:', campaignClicked);
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'tests/e2e/screenshots/03-after-campaign.png' });

    // 4. Select ship (click first ship's Select button)
    console.log('4. Selecting ship...');
    const shipClicked = await page.evaluate(() => {
      const btns = document.querySelectorAll('.btn-select');
      if (btns.length > 0) { btns[0].click(); return true; }
      return false;
    });
    console.log('   Ship selected:', shipClicked);
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'tests/e2e/screenshots/04-after-ship.png' });

    // 5. Start Session (GM flow)
    console.log('5. Starting session...');
    const sessionStarted = await page.evaluate(() => {
      const btn = document.getElementById('btn-start-session');
      if (btn) { btn.click(); return true; }
      return false;
    });
    console.log('   Session started:', sessionStarted);
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'tests/e2e/screenshots/05-session-started.png' });

    // 6. Select role (GM selects a role to observe)
    console.log('6. Selecting GM observer role...');
    const roleClicked = await page.evaluate(() => {
      const pilotBtn = document.querySelector('[data-role="pilot"], .role-btn, .role-card');
      if (pilotBtn) { pilotBtn.click(); return true; }
      // Try clicking any role selection button
      const anyRole = document.querySelector('button[class*="role"]');
      if (anyRole) { anyRole.click(); return true; }
      return false;
    });
    console.log('   Role selected:', roleClicked);
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'tests/e2e/screenshots/06-after-role.png' });

    // 7. Join bridge
    console.log('7. Joining bridge...');
    const joinClicked = await page.evaluate(() => {
      const btn = document.querySelector('#btn-join-bridge, .btn-join-bridge, button.btn-primary');
      if (btn) { btn.click(); return true; }
      return false;
    });
    console.log('   Join clicked:', joinClicked);
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: 'tests/e2e/screenshots/07-bridge.png' });

    // 8. Check global state
    console.log('\n8. Checking state...');
    const stateInfo = await page.evaluate(() => {
      return {
        hasCampaign: !!window.state?.campaign,
        campaignHex: window.state?.campaign?.current_hex || 'NOT SET',
        campaignSystem: window.state?.campaign?.current_system || 'NOT SET',
        shipStateHex: window.state?.shipState?.systemHex || 'NOT SET',
        shipLocationId: window.state?.shipState?.locationId || 'NOT SET',
        sectorMapExists: !!window.sectorMapState,
        sectorMapHex: window.sectorMapState?.currentShipHex || 'NOT SET',
        shipMapExists: !!window.shipMapState,
        hasPartyShip: !!window.shipMapState?.partyShip
      };
    });
    console.log('State:', JSON.stringify(stateInfo, null, 2));

    // 9. Try to open Known Space / Subsector Map
    console.log('\n9. Opening Subsector Map...');
    const subsectorOpened = await page.evaluate(() => {
      const btn = document.querySelector('#btn-subsector-map, button[title*="Known"]');
      if (btn) { btn.click(); return true; }
      if (typeof window.showSectorMap === 'function') {
        window.showSectorMap();
        return 'via function';
      }
      return false;
    });
    console.log('   Subsector opened:', subsectorOpened);

    // Wait for systems to load (promise-based wait)
    try {
      await page.waitForFunction(
        () => window.sectorMapState?.systems?.length > 0,
        { timeout: 5000 }
      );
      console.log('   Systems loaded');
    } catch (e) {
      console.log('   Timeout waiting for systems:', e.message);
    }

    const sectorStateAfter = await page.evaluate(() => ({
      currentShipHex: window.sectorMapState?.currentShipHex || 'NOT SET',
      hasCanvas: !!window.sectorMapState?.canvas,
      systemsCount: window.sectorMapState?.systems?.length || 0,
      campaignSystem: window.state?.campaign?.current_system || 'NOT SET',
      campaignHex: window.state?.campaign?.current_hex || 'NOT SET',
      containerVisible: document.getElementById('sector-map-container')?.style.display
    }));
    console.log('Subsector state after open:', JSON.stringify(sectorStateAfter, null, 2));
    await page.screenshot({ path: 'tests/e2e/screenshots/07-subsector-map.png' });

    // Close subsector map
    await page.evaluate(() => {
      const close = document.querySelector('#btn-sector-map-close, .sector-map-overlay .btn-close');
      if (close) close.click();
      else if (typeof window.hideSectorMap === 'function') window.hideSectorMap();
    });
    await new Promise(r => setTimeout(r, 500));

    // 10. Open System Map
    console.log('\n10. Opening System Map...');
    await page.evaluate(() => {
      if (typeof window.showSystemMap === 'function') {
        window.showSystemMap();
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    const systemStateAfter = await page.evaluate(() => ({
      hasPartyShip: !!window.shipMapState?.partyShip,
      partyShipName: window.shipMapState?.partyShip?.name || 'NOT SET',
      partyShipPos: window.shipMapState?.partyShip?.position || 'NOT SET',
      systemName: window.systemMapState?.system?.name || 'NOT SET'
    }));
    console.log('System map state:', JSON.stringify(systemStateAfter, null, 2));
    await page.screenshot({ path: 'tests/e2e/screenshots/08-system-map.png' });

    console.log('\n=== Test Complete ===');
    console.log('Screenshots in tests/e2e/screenshots/');

  }, { timeout: 60000 });
}

runTest().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
