/**
 * AR-291: Observer Role Smoke Test
 * Tests observer role: view-only access, can switch to other roles
 * Uses Solo Demo flow to access player setup with role selection
 */

const {
  createPage,
  navigateToOperations,
  clickButton,
  waitForScreen,
  delay,
  DELAYS,
  createTestResults,
  pass,
  fail,
  printResults,
  assertNoConsoleErrors
} = require('../puppeteer-utils');

async function runObserverRoleTest() {
  const results = createTestResults();
  let browser, page;

  console.log('\n🔥 SMOKE TEST: Observer Role\n');

  try {
    // Setup
    const setup = await createPage({ headless: true });
    browser = setup.browser;
    page = setup.page;

    // Step 1: Navigate and click Solo Demo button
    console.log('Step 1: Navigate and click Solo Demo...');
    await navigateToOperations(page);
    await clickButton(page, 'btn-solo-demo');
    await delay(DELAYS.SOCKET);
    pass(results, 'Solo Demo clicked');

    // Step 2: Wait for player setup screen with role selection
    console.log('Step 2: Wait for player setup screen...');
    try {
      await page.waitForSelector('#player-setup-screen.active, #role-select-list', { timeout: 5000 });
      await delay(DELAYS.MEDIUM); // Give time for roles to render
      pass(results, 'Player setup screen loaded');
    } catch (e) {
      fail(results, 'Player setup screen loaded', `Timeout: ${e.message}`);
      throw e;
    }

    // Step 3: Check observer is in available roles
    console.log('Step 3: Check observer role available...');

    // Role selection uses clickable divs with data-role-id, not a dropdown
    const observerAvailable = await page.evaluate(() => {
      const roleList = document.getElementById('role-select-list');
      if (!roleList) return { found: false, roleListExists: false, roles: [] };
      const observerOption = roleList.querySelector('[data-role-id="observer"]');
      const allRoles = Array.from(roleList.querySelectorAll('[data-role-id]')).map(r => r.dataset.roleId);
      return { found: !!observerOption, roleListExists: true, roles: allRoles };
    });

    console.log('  Role list status:', JSON.stringify(observerAvailable));

    if (observerAvailable.found) {
      pass(results, 'Observer role available in role list');
    } else {
      fail(results, 'Observer role available in role list',
        `Observer not found. Role list exists: ${observerAvailable.roleListExists}, Roles: ${observerAvailable.roles.join(', ')}`);
    }

    // Step 4: Select observer role
    console.log('Step 4: Select observer role...');
    await page.evaluate(() => {
      const roleList = document.getElementById('role-select-list');
      const observerOption = roleList?.querySelector('[data-role-id="observer"]');
      if (observerOption) {
        observerOption.click();
      }
    });
    await delay(DELAYS.MEDIUM);

    // Check role option has 'selected' class
    const observerSelected = await page.evaluate(() => {
      const roleList = document.getElementById('role-select-list');
      const observerOption = roleList?.querySelector('[data-role-id="observer"]');
      return observerOption?.classList.contains('selected') || false;
    });

    if (observerSelected) {
      pass(results, 'Observer role selected');
    } else {
      fail(results, 'Observer role selected', 'Observer not marked as selected');
    }

    // Step 5: Verify observer can switch to other roles (captain)
    console.log('Step 5: Test role switching from observer to captain...');
    await page.evaluate(() => {
      const roleList = document.getElementById('role-select-list');
      const captainOption = roleList?.querySelector('[data-role-id="captain"]');
      if (captainOption) {
        captainOption.click();
      }
    });
    await delay(DELAYS.MEDIUM);

    const captainSelected = await page.evaluate(() => {
      const roleList = document.getElementById('role-select-list');
      const captainOption = roleList?.querySelector('[data-role-id="captain"]');
      return captainOption?.classList.contains('selected') || false;
    });

    if (captainSelected) {
      pass(results, 'Can switch from observer to other roles');
    } else {
      fail(results, 'Can switch from observer to other roles', 'Role switch to captain failed');
    }

    // Step 6: Switch back to observer (verify unlimited role can be selected again)
    console.log('Step 6: Switch back to observer...');
    await page.evaluate(() => {
      const roleList = document.getElementById('role-select-list');
      const observerOption = roleList?.querySelector('[data-role-id="observer"]');
      if (observerOption) {
        observerOption.click();
      }
    });
    await delay(DELAYS.MEDIUM);

    const backToObserver = await page.evaluate(() => {
      const roleList = document.getElementById('role-select-list');
      const observerOption = roleList?.querySelector('[data-role-id="observer"]');
      return observerOption?.classList.contains('selected') || false;
    });

    if (backToObserver) {
      pass(results, 'Can switch back to observer');
    } else {
      fail(results, 'Can switch back to observer', 'Switch back to observer failed');
    }

    // Step 7: Check no JS errors
    assertNoConsoleErrors(page, results);

  } catch (error) {
    fail(results, 'Test execution', error.message);
    console.error('Error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  printResults(results);
  return results.failed === 0;
}

// Run if called directly
if (require.main === module) {
  runObserverRoleTest()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runObserverRoleTest };
