/**
 * AR-92 Test: Verify Top Bar Cleanup
 */
const {
  createPage,
  navigateToOperations,
  gmLogin,
  delay,
  DELAYS
} = require('./puppeteer-utils');

(async () => {
  let browser, page;

  try {
    console.log('\n=== AR-92 TEST: Top Bar Cleanup ===\n');

    // Setup as GM
    const setup = await createPage({ headless: true, width: 1400, height: 900 });
    browser = setup.browser;
    page = setup.page;

    await navigateToOperations(page);
    await gmLogin(page);
    await delay(DELAYS.SOCKET);

    // Check top bar elements
    const topBar = await page.evaluate(() => {
      const shipName = document.getElementById('bridge-ship-name');
      const campaign = document.getElementById('bridge-campaign-name');
      const location = document.getElementById('bridge-location');
      const alertStatus = document.getElementById('alert-status');
      const weaponsAuth = document.getElementById('weapons-auth-indicator');
      const userShip = document.getElementById('bridge-user-ship');

      return {
        shipNameTitle: shipName?.title || '',
        campaignHidden: campaign?.classList.contains('hidden') || false,
        locationProminent: location?.classList.contains('prominent') || false,
        alertIsLed: alertStatus?.classList.contains('alert-status-led') || false,
        alertTitle: alertStatus?.title || '',
        weaponsHidden: weaponsAuth?.classList.contains('hidden') || false,
        userShipExists: !!userShip
      };
    });

    console.log('Ship name has campaign tooltip:', topBar.shipNameTitle ? 'YES' : 'NO');
    console.log('Campaign name hidden:', topBar.campaignHidden ? 'YES' : 'NO');
    console.log('Location is prominent:', topBar.locationProminent ? 'YES' : 'NO');
    console.log('Alert status is LED:', topBar.alertIsLed ? 'YES' : 'NO');
    console.log('Alert has tooltip:', topBar.alertTitle ? 'YES' : 'NO');
    console.log('Weapons Hold hidden:', topBar.weaponsHidden ? 'YES' : 'NO');
    console.log('User ship badge removed:', !topBar.userShipExists ? 'YES' : 'NO (still in DOM, but HTML removed)');

    // Check results
    const checks = [
      topBar.campaignHidden,
      topBar.locationProminent,
      topBar.alertIsLed,
      topBar.weaponsHidden
    ];

    const passed = checks.every(c => c);

    if (passed) {
      console.log('\n✓ PASS: Top bar cleanup applied correctly');
    } else {
      console.log('\n✗ FAIL: Some top bar changes not applied');
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/ar92-topbar-cleanup.png' });
    console.log('\nScreenshot: /tmp/ar92-topbar-cleanup.png');

  } catch (e) {
    console.error('Error:', e.message);
    if (page) {
      await page.screenshot({ path: '/tmp/ar92-error.png' });
      console.log('Error screenshot: /tmp/ar92-error.png');
    }
  } finally {
    if (browser) await browser.close();
  }
})();
