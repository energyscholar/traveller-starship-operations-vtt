/**
 * AR-151 Window Exports Smoke Test
 *
 * Verifies that all critical functions are exposed on window object
 * for onclick handlers to work after modular extraction.
 *
 * Risk mitigation: Ensures MEDIUM-risk extractions don't break onclick handlers.
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('../config');

const CRITICAL_EXPORTS = [
  // Phase 5: GM Prep (already extracted)
  'renderPrepReveals',
  'showAddRevealModal',
  'submitReveal',
  'revealToPlayers',
  'editReveal',
  'updateReveal',
  'deleteReveal',
  'showPlayerRevealModal',
  'renderPrepNpcs',
  'revealNpc',
  'hideNpc',
  'showNpcDetail',
  'renderPrepLocations',
  'revealLocation',
  'hideLocation',

  // Phase 9 targets: Expandable Role Panel
  'expandRolePanel',
  'collapseRolePanel',

  // Phase 9 targets: Shared Map
  'showSharedMap',

  // Phase 9 targets: System Map
  'showSystemMap',

  // Core utilities that must remain
  'showModalContent',
  'closeModal',
  'showNotification',
  'escapeHtml'
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

    // Check all critical exports
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
    }, CRITICAL_EXPORTS);

    // Report results
    console.log(`\n=== AR-151 Window Exports Smoke Test ===\n`);
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

module.exports = { runTest, CRITICAL_EXPORTS };
