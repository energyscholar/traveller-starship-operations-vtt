/**
 * AR-152 Maps Smoke Test
 *
 * Verifies that all map-related functions are exposed on window object
 * after extraction to modules.
 *
 * Risk mitigation: Ensures map onclick handlers work post-extraction.
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('../config');

const MAP_EXPORTS = [
  // Shared Map (AR-27)
  'showSharedMap',
  'closeSharedMap',
  'updateSharedMapIframe',
  'trackGMMapView',
  'updateSharedMapFrame',

  // System Map (AR-29.5)
  'showSystemMap',
  'closeSystemMap',

  // Embedded System Map (AR-94)
  'showEmbeddedSystemMap',
  'hideEmbeddedSystemMap'
];

async function runTest() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Collect JS errors
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    // Navigate to operations page
    await page.goto(fullUrl, {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    // Check all map exports
    const results = await page.evaluate((exports) => {
      const missing = [];
      const present = [];
      for (const name of exports) {
        if (typeof window[name] === 'function') {
          present.push(name);
        } else {
          missing.push(name);
        }
      }
      return { missing, present, total: exports.length };
    }, MAP_EXPORTS);

    // Report results
    console.log(`\n=== AR-152 Maps Smoke Test ===\n`);
    console.log(`Total exports checked: ${results.total}`);
    console.log(`Present: ${results.present.length}`);
    console.log(`Missing: ${results.missing.length}`);

    if (results.missing.length > 0) {
      console.log(`\nMissing exports:`);
      results.missing.forEach(name => console.log(`  - ${name}`));
    }

    if (jsErrors.length > 0) {
      console.log(`\nJS Errors: ${jsErrors.length}`);
      jsErrors.slice(0, 3).forEach(err => console.log(`  - ${err}`));
    }

    const passed = results.missing.length === 0 && jsErrors.length === 0;
    console.log(`\n${passed ? '✓ PASS' : '✗ FAIL'}`);

    await browser.close();
    return passed;

  } catch (err) {
    console.error(`Test error: ${err.message}`);
    if (browser) await browser.close();
    return false;
  }
}

// Run if executed directly
if (require.main === module) {
  runTest().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}

module.exports = { runTest, MAP_EXPORTS };
