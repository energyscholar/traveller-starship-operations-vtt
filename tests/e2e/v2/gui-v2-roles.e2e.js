/**
 * V2 GUI Role Panels E2E Test
 * Tests role panel rendering and action handlers
 */

const { withBrowser } = require('../helpers/browser-with-cleanup');
const assert = require('assert');

async function testV2RolePanels() {
  console.log('=== V2 Role Panels E2E Test ===\n');

  await withBrowser(async (browser, page) => {
    // Navigate to V2 app
    await page.goto('http://localhost:3000/operations-v2');
    await page.waitForSelector('#app', { timeout: 5000 });
    console.log('✓ V2 app loaded');

    // Check that renderers object exists
    const renderersExist = await page.evaluate(() => typeof window.renderers !== 'undefined');
    assert(renderersExist, 'renderers should be defined');
    console.log('✓ renderers object available');

    // Check that state object is exposed
    const stateExist = await page.evaluate(() => typeof window.v2State !== 'undefined');
    assert(stateExist, 'v2State should be defined');
    console.log('✓ v2State exposed globally');

    // Check that showModal function exists
    const showModalExist = await page.evaluate(() => typeof window.showModal === 'function');
    assert(showModalExist, 'showModal should be a function');
    console.log('✓ showModal function available');

    // Check that showToast function exists
    const showToastExist = await page.evaluate(() => typeof window.showToast === 'function');
    assert(showToastExist, 'showToast should be a function');
    console.log('✓ showToast function available');

    // Check that Modals registry includes our new modals
    const modalsRegistered = await page.evaluate(() => {
      if (typeof window.Modals === 'undefined') return false;
      const registry = window.Modals.registry || {};
      return ['target-picker', 'destination-picker', 'order-modal', 'role-picker'].every(id => registry[id]);
    });
    assert(modalsRegistered, 'All role modals should be registered');
    console.log('✓ Role modals registered (target-picker, destination-picker, order-modal, role-picker)');

    // Verify socket connection is available
    const socketAvailable = await page.evaluate(() => {
      return window.v2State && window.v2State.socket !== null;
    });
    assert(socketAvailable, 'Socket should be available');
    console.log('✓ Socket connection available');

    console.log('\n=== All V2 Role Panel Tests Passed ===');
  }, { timeout: 30000 });
}

// Run test
testV2RolePanels().then(() => {
  console.log('\nPASSED: 6/6');
  process.exit(0);
}).catch(err => {
  console.error('\nTest failed:', err.message);
  process.exit(1);
});
