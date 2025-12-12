/**
 * AR-96 Test: Verify Astrogation Map defaults to Poster style
 */
const {
  createPage,
  navigateToOperations,
  playerLogin,
  selectPlayerSlot,
  selectRole,
  joinBridge,
  delay,
  DELAYS
} = require('./puppeteer-utils');

(async () => {
  let browser, page;

  try {
    console.log('\n=== AR-96 TEST: Astrogation Map Default Style ===\n');

    // Setup
    const setup = await createPage({ headless: true, width: 1400, height: 900 });
    browser = setup.browser;
    page = setup.page;

    await navigateToOperations(page);

    // Player login flow
    const hasSlots = await playerLogin(page, 'DFFFC87E');
    if (hasSlots) {
      await selectPlayerSlot(page, 'James');
      await delay(DELAYS.SOCKET);
    }

    // Select Astrogator role
    await selectRole(page, 'Astrogator');
    await delay(DELAYS.SOCKET);

    // Join bridge
    await joinBridge(page);
    await delay(DELAYS.SOCKET * 2);

    // Check the jump-map-style dropdown value
    const styleDropdown = await page.evaluate(() => {
      const sel = document.getElementById('jump-map-style');
      if (!sel) return { found: false };
      return {
        found: true,
        value: sel.value,
        selectedText: sel.options[sel.selectedIndex]?.text,
        firstOption: sel.options[0]?.value,
        firstOptionText: sel.options[0]?.text,
        allOptions: Array.from(sel.options).map(o => ({ value: o.value, text: o.text }))
      };
    });

    console.log('Dropdown found:', styleDropdown.found);
    console.log('Current value:', styleDropdown.value);
    console.log('Selected text:', styleDropdown.selectedText);
    console.log('First option:', styleDropdown.firstOptionText, '(' + styleDropdown.firstOption + ')');
    console.log('All options:', JSON.stringify(styleDropdown.allOptions));

    if (styleDropdown.value === 'poster') {
      console.log('\n✓ PASS: Default style is "poster"');
    } else if (!styleDropdown.found) {
      console.log('\n⚠ SKIP: Dropdown not found - may not be on Astrogator panel');
    } else {
      console.log('\n✗ FAIL: Expected "poster" but got "' + styleDropdown.value + '"');
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/ar96-astrogation-poster-style.png' });
    console.log('\nScreenshot: /tmp/ar96-astrogation-poster-style.png');

  } catch (e) {
    console.error('Error:', e.message);
    if (page) {
      await page.screenshot({ path: '/tmp/ar96-error.png' });
      console.log('Error screenshot: /tmp/ar96-error.png');
    }
  } finally {
    if (browser) await browser.close();
  }
})();
