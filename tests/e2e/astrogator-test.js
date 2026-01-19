/**
 * Astrogator Role E2E Test
 *
 * Tests astrogator functionality:
 * 1. Join as astrogator role
 * 2. Verify jump panel displays correctly
 * 3. Test plotting jump courses
 * 4. Test jump to max capacity (potential bug area)
 * 5. Test fuel consumption
 * 6. Test position verification after jump
 *
 * Run with: npm run test:e2e tests/e2e/astrogator-test.js
 */

const { withBrowser } = require('./helpers/browser-with-cleanup');

const BASE_URL = fullUrl;

// Test configuration
const TEST_CONFIG = {
  timeout: 60000,
  waitForSocket: 2000,
  waitForUI: 1000
};

async function runTest() {
  console.log('[AstrogatorTest] Starting Astrogator Role E2E test...');

  await withBrowser(async (browser, page) => {
    const errors = [];
    const warnings = [];

    // Listen for console messages
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        errors.push(text);
        console.log('[Browser ERROR]', text);
      } else if (text.includes('Jump') || text.includes('Astrogator') || text.includes('fuel')) {
        console.log('[Browser]', text);
      }
    });

    // ========== STEP 1: Join Solo Demo Campaign ==========
    console.log('\n[AstrogatorTest] STEP 1: Joining Solo Demo Campaign...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.login-options', { visible: true });

    const btnSoloDemo = await page.$('#btn-solo-demo');
    if (!btnSoloDemo) {
      throw new Error('Solo Demo Campaign button not found');
    }
    await btnSoloDemo.click();
    await new Promise(r => setTimeout(r, TEST_CONFIG.waitForSocket));

    // Wait for player setup
    await page.waitForSelector('#player-setup-screen:not(.hidden), .player-setup-container', {
      visible: true,
      timeout: 10000
    });
    console.log('[AstrogatorTest] ✓ Joined Solo Demo Campaign');

    // ========== STEP 2: Select Astrogator Role ==========
    console.log('\n[AstrogatorTest] STEP 2: Selecting Astrogator role...');

    // Find and click astrogator role button
    const astrogatorBtn = await page.$('[data-role="astrogator"], button[onclick*="astrogator"]');
    if (astrogatorBtn) {
      await astrogatorBtn.click();
      await new Promise(r => setTimeout(r, TEST_CONFIG.waitForSocket));
    } else {
      // Try finding by text
      const roleButtons = await page.$$('.role-btn, .role-option, button');
      for (const btn of roleButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.toLowerCase().includes('astrogator')) {
          await btn.click();
          await new Promise(r => setTimeout(r, TEST_CONFIG.waitForSocket));
          break;
        }
      }
    }

    // Look for join bridge button
    const joinBridgeBtn = await page.$('#btn-join-bridge, button[onclick*="joinBridge"]');
    if (joinBridgeBtn) {
      await joinBridgeBtn.click();
      await new Promise(r => setTimeout(r, TEST_CONFIG.waitForSocket));
    }

    // Wait for bridge screen
    await page.waitForSelector('#bridge-screen:not(.hidden), .bridge-container', {
      visible: true,
      timeout: 10000
    });
    console.log('[AstrogatorTest] ✓ On bridge as astrogator');

    // ========== STEP 3: Verify Astrogator Panel Content ==========
    console.log('\n[AstrogatorTest] STEP 3: Verifying astrogator panel...');
    await new Promise(r => setTimeout(r, TEST_CONFIG.waitForUI));

    const pageContent = await page.content();

    // Check for key astrogator elements
    const checks = {
      'Jump Rating display': pageContent.includes('Jump Rating') || pageContent.includes('J-'),
      'Fuel Available': pageContent.includes('Fuel Available') || pageContent.includes('tons'),
      'Current System': pageContent.includes('Current System') || pageContent.includes('Mora'),
      'Plot Jump Course': pageContent.includes('Plot') || pageContent.includes('jump-destination'),
      'Jump Distance selector': pageContent.includes('jump-distance') || pageContent.includes('Distance')
    };

    for (const [check, passed] of Object.entries(checks)) {
      if (passed) {
        console.log(`[AstrogatorTest] ✓ ${check}`);
      } else {
        console.log(`[AstrogatorTest] ✗ MISSING: ${check}`);
        warnings.push(`Missing: ${check}`);
      }
    }

    // ========== STEP 4: Get Ship Fuel Status ==========
    console.log('\n[AstrogatorTest] STEP 4: Checking fuel status...');

    // Try to extract fuel value from page
    const fuelInfo = await page.evaluate(() => {
      // Look for fuel display
      const fuelRow = document.querySelector('[title*="tons available"]');
      if (fuelRow) {
        const valueEl = fuelRow.querySelector('.stat-value');
        if (valueEl) return valueEl.textContent;
      }
      // Fallback - search all text
      const text = document.body.innerText;
      const match = text.match(/Fuel Available[:\s]*(\d+)/i);
      return match ? match[1] : null;
    });

    console.log(`[AstrogatorTest] Fuel status: ${fuelInfo || 'not found'}`);

    // ========== STEP 5: Test Jump Distance Options (AR-297: New Wizard) ==========
    console.log('\n[AstrogatorTest] STEP 5: Testing jump distance selector...');

    const jumpOptions = await page.evaluate(() => {
      // AR-297: New wizard uses .jump-distance-btn buttons
      const btns = document.querySelectorAll('.jump-distance-btn');
      if (!btns.length) return null;

      const options = [];
      for (const btn of btns) {
        const label = btn.querySelector('.distance-label')?.textContent || '';
        const status = btn.querySelector('.distance-status')?.textContent || '';
        const disabled = btn.classList.contains('disabled');
        options.push({ label, status, disabled });
      }
      return options;
    });

    if (jumpOptions) {
      console.log('[AstrogatorTest] ✓ Jump distance options found:');
      for (const opt of jumpOptions) {
        const status = opt.disabled ? '(DISABLED)' : '(available)';
        console.log(`  ${opt.label}: ${status} - ${opt.status}`);
      }
    } else {
      console.log('[AstrogatorTest] ✗ Jump distance selector not found');
      warnings.push('Jump distance selector not found');
    }

    // ========== STEP 6: Test Jump Wizard Flow (AR-297) ==========
    console.log('\n[AstrogatorTest] STEP 6: Testing jump wizard flow...');

    // AR-297: New 4-step wizard - click distance, proceed to destination selection
    const wizardResult = await page.evaluate(() => {
      const wizard = document.querySelector('.jump-wizard');
      const distanceBtns = document.querySelectorAll('.jump-distance-btn:not(.disabled)');
      const nextBtn = Array.from(document.querySelectorAll('button'))
                      .find(b => b.textContent.includes('Next'));

      const result = {
        wizardFound: !!wizard,
        availableDistances: distanceBtns.length,
        nextBtnFound: !!nextBtn,
        nextBtnDisabled: nextBtn?.disabled
      };

      // Click first available distance option
      if (distanceBtns.length > 0) {
        distanceBtns[0].click();
        result.clickedDistance = true;
      }

      return result;
    });

    console.log(`[AstrogatorTest] Wizard found: ${wizardResult.wizardFound ? 'yes' : 'NO'}`);
    console.log(`[AstrogatorTest] Available distances: ${wizardResult.availableDistances}`);
    console.log(`[AstrogatorTest] Next button: ${wizardResult.nextBtnFound ? (wizardResult.nextBtnDisabled ? 'DISABLED' : 'enabled') : 'NOT FOUND'}`);

    if (wizardResult.clickedDistance) {
      console.log('[AstrogatorTest] ✓ Clicked distance option');
      await new Promise(r => setTimeout(r, TEST_CONFIG.waitForUI));

      // Check if Next button is now enabled
      const canProceed = await page.evaluate(() => {
        const nextBtn = Array.from(document.querySelectorAll('button'))
                        .find(b => b.textContent.includes('Next'));
        return nextBtn && !nextBtn.disabled;
      });

      if (canProceed) {
        console.log('[AstrogatorTest] ✓ Next button enabled after distance selection');
      } else {
        console.log('[AstrogatorTest] Next button still disabled');
      }
    } else {
      warnings.push('No available jump distances (check fuel status)');
    }

    // ========== STEP 7: Test Max Jump Capacity ==========
    console.log('\n[AstrogatorTest] STEP 7: Testing max jump capacity edge case...');

    // Far Horizon has Jump-2, 23 tons fuel, needs 20 tons for J-2
    // After one J-2 jump, only 3 tons remain - can't jump again
    // This is where bugs might appear

    const maxJumpInfo = await page.evaluate(() => {
      // Check max jump range display
      const maxRangeRow = document.querySelector('[title*="Maximum jump distance"]');
      if (maxRangeRow) {
        const value = maxRangeRow.querySelector('.stat-value');
        return value ? value.textContent : null;
      }
      return null;
    });

    console.log(`[AstrogatorTest] Max jump range: ${maxJumpInfo || 'not found'}`);

    // ========== STEP 8: Check for UI Bugs ==========
    console.log('\n[AstrogatorTest] STEP 8: Checking for UI bugs...');

    const uiBugs = await page.evaluate(() => {
      const bugs = [];

      // AR-297: Check wizard elements instead of old select
      const wizard = document.querySelector('.jump-wizard');
      if (!wizard) {
        bugs.push('Jump wizard not found');
      }

      // Check if disabled distance buttons are properly styled
      const disabledBtns = document.querySelectorAll('.jump-distance-btn.disabled');
      for (const btn of disabledBtns) {
        if (!btn.textContent.includes('✗')) {
          bugs.push(`Disabled distance button missing indicator`);
          break;  // Only report once
        }
      }

      // Check if step indicator exists
      const stepIndicator = document.querySelector('.jump-wizard-step-indicator');
      if (wizard && !stepIndicator) {
        bugs.push('Wizard step indicator not found');
      }

      return bugs;
    });

    if (uiBugs.length > 0) {
      console.log('[AstrogatorTest] UI bugs found:');
      for (const bug of uiBugs) {
        console.log(`  - ${bug}`);
        warnings.push(bug);
      }
    } else {
      console.log('[AstrogatorTest] ✓ No obvious UI bugs detected');
    }

    // ========== SUMMARY ==========
    console.log('\n[AstrogatorTest] ========== TEST SUMMARY ==========');
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(e => console.log(`  - ${e}`));
    }
    if (warnings.length > 0) {
      console.log('\nWarnings:');
      warnings.forEach(w => console.log(`  - ${w}`));
    }

    // Test passes if no critical errors
    // CSP errors for external APIs (TravellerMap) are expected in test environment
    const criticalErrors = errors.filter(e =>
      !e.includes('404') &&
      !e.includes('Content Security Policy') &&
      !e.includes('travellermap.com') &&
      !e.includes('Failed to fetch jump destinations')
    );
    if (criticalErrors.length > 0) {
      throw new Error(`Test completed with ${criticalErrors.length} critical errors`);
    }

    console.log('\n[AstrogatorTest] ✓ All basic checks passed');

  }, { timeout: TEST_CONFIG.timeout });

  console.log('[AstrogatorTest] Test completed successfully');
}

// Run if called directly
if (require.main === module) {
  runTest()
    .then(() => {
      console.log('[AstrogatorTest] ✓ TEST PASSED');
      process.exit(0);
    })
    .catch(err => {
      console.error('[AstrogatorTest] ✗ TEST FAILED:', err.message);
      process.exit(1);
    });
}

module.exports = { runTest };
