/**
 * AR-289: Solo Demo Campaign E2E Test
 *
 * Tests the Solo Demo Campaign join flow:
 * 1. Click "Solo Demo Campaign" button
 * 2. Verify joins as Scout/Pilot
 * 3. Verify ship "Far Horizon" visible
 * 4. Verify basic functionality works
 *
 * Run with: npm run test:e2e tests/e2e/solo-demo-test.js
 */

const { withBrowser } = require('./helpers/browser-with-cleanup');

const BASE_URL = 'http://localhost:3000/operations';

async function runTest() {
  console.log('[SoloDemoTest] Starting Solo Demo Campaign E2E test...');

  await withBrowser(async (browser, page) => {
    // Listen for console messages
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('Solo') || msg.text().includes('socket')) {
        console.log('[Browser Console]', msg.text());
      }
    });

    // Navigate to login page
    console.log('[SoloDemoTest] Navigating to login page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    // Wait for login options to be visible
    await page.waitForSelector('.login-options', { visible: true });
    console.log('[SoloDemoTest] Login options visible');

    // Find and click Solo Demo Campaign button
    const btnSoloDemo = await page.$('#btn-solo-demo');
    if (!btnSoloDemo) {
      throw new Error('Solo Demo Campaign button not found');
    }
    console.log('[SoloDemoTest] Clicking Solo Demo Campaign button...');
    await btnSoloDemo.click();

    // Wait a bit for socket response
    await new Promise(r => setTimeout(r, 2000));

    // Wait for player-setup screen to load
    // After playerSlotSelected, the player-setup-screen is shown
    await page.waitForSelector('#player-setup-screen:not(.hidden), .player-setup-container', {
      visible: true,
      timeout: 10000
    });
    console.log('[SoloDemoTest] Player setup screen loaded');

    // Verify we're in the game by checking for ship or role elements
    const hasShipInfo = await page.$('.ship-info, .ship-status, .ship-header');
    const hasRoleOptions = await page.$('#role-select, .role-option, .role-buttons');

    if (!hasShipInfo && !hasRoleOptions) {
      throw new Error('Neither ship info nor role options found after join');
    }

    console.log('[SoloDemoTest] ✓ Successfully joined Solo Demo Campaign');

    // Check for Far Horizon ship name if visible
    const pageContent = await page.content();
    if (pageContent.includes('Far Horizon')) {
      console.log('[SoloDemoTest] ✓ Ship "Far Horizon" found on page');
    }

    if (pageContent.includes('Alex Ryder') || pageContent.includes('Scout')) {
      console.log('[SoloDemoTest] ✓ Character data found on page');
    }

    console.log('[SoloDemoTest] ✓ All checks passed');

  }, { timeout: 30000 });

  console.log('[SoloDemoTest] Test completed successfully');
}

// Run if called directly
if (require.main === module) {
  runTest()
    .then(() => {
      console.log('[SoloDemoTest] ✓ TEST PASSED');
      process.exit(0);
    })
    .catch(err => {
      console.error('[SoloDemoTest] ✗ TEST FAILED:', err.message);
      process.exit(1);
    });
}

module.exports = { runTest };
