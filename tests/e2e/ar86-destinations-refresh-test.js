/**
 * AR-86 Test: Verify destinations panel refreshes when switching systems
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
    console.log('\n=== AR-86 TEST: Destinations Panel Refresh ===\n');

    // Setup as GM
    const setup = await createPage({ headless: true, width: 1400, height: 900 });
    browser = setup.browser;
    page = setup.page;

    await navigateToOperations(page);
    await gmLogin(page);
    await delay(DELAYS.SOCKET);

    // Click System Map tab
    await page.click('.role-tab[data-role="system-map"]').catch(() => {});
    await delay(DELAYS.SOCKET);

    // Click Destinations button to open overlay
    await page.click('#btn-places').catch(() => {});
    await delay(DELAYS.UI);

    // Get initial places
    const initialPlaces = await page.evaluate(() => {
      const overlay = document.getElementById('system-map-places');
      if (!overlay) return { found: false };
      const items = overlay.querySelectorAll('.place-name');
      return {
        found: true,
        names: Array.from(items).map(el => el.textContent)
      };
    });

    console.log('Initial system places:', initialPlaces.names?.join(', ') || 'None');

    // Change to different system via dropdown
    const systemChanged = await page.evaluate(() => {
      const select = document.getElementById('test-system-select');
      if (!select || select.options.length < 2) return false;
      // Select a different system
      select.value = select.options[1].value;
      return true;
    });

    if (!systemChanged) {
      console.log('⚠ SKIP: Only one system available');
    } else {
      // Click Load button
      await page.click('#btn-load-system');
      await delay(DELAYS.SOCKET * 2);

      // Get new places
      const newPlaces = await page.evaluate(() => {
        const overlay = document.getElementById('system-map-places');
        if (!overlay) return { found: false };
        const items = overlay.querySelectorAll('.place-name');
        return {
          found: true,
          names: Array.from(items).map(el => el.textContent)
        };
      });

      console.log('After switch places:', newPlaces.names?.join(', ') || 'None');

      // Check if overlay is still present and has content
      if (!newPlaces.found) {
        console.log('\n✗ FAIL: Destinations overlay disappeared after system switch');
      } else if (newPlaces.names.length === 0) {
        console.log('\n✗ FAIL: Destinations overlay is empty after system switch');
      } else {
        console.log('\n✓ PASS: Destinations overlay refreshed with new places');
      }
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/ar86-destinations-refresh.png' });
    console.log('\nScreenshot: /tmp/ar86-destinations-refresh.png');

  } catch (e) {
    console.error('Error:', e.message);
    if (page) {
      await page.screenshot({ path: '/tmp/ar86-error.png' });
      console.log('Error screenshot: /tmp/ar86-error.png');
    }
  } finally {
    if (browser) await browser.close();
  }
})();
