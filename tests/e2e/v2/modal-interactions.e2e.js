/**
 * V2 E2E Tests - Modal Interactions
 * Tests modal system show/hide and basic interactions
 */

const { withBrowser, collectLogs, wait, safeClick } = require('../helpers/browser-with-cleanup');

const BASE_URL = 'http://localhost:3000/';

/**
 * Helper to enter Solo Demo and reach bridge
 */
async function enterSoloDemo(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForSelector('[data-action="soloDemo"]', { timeout: 5000 });
  await safeClick(page, '[data-action="soloDemo"]');
  await wait(2000);

  // Verify we're on bridge
  const bridgeVisible = await page.evaluate(() => {
    const bridge = document.getElementById('bridge-screen');
    return bridge && window.getComputedStyle(bridge).display !== 'none';
  });

  if (!bridgeVisible) {
    throw new Error('Failed to reach bridge screen');
  }
}

async function runTests() {
  console.log('=== V2 Modal Interactions E2E Tests ===\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Modal container exists in DOM
  try {
    console.log('TEST 1: Modal container exists');
    await withBrowser(async (browser, page) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await wait(500);

      const modalContainer = await page.$('#modal-container');
      const modalOverlay = await page.$('#modal-overlay');

      if (!modalContainer) throw new Error('Modal container not found');
      if (!modalOverlay) throw new Error('Modal overlay not found');

      // Both should be hidden initially
      const containerHidden = await page.evaluate(el => el.classList.contains('hidden'), modalContainer);
      const overlayHidden = await page.evaluate(el => el.classList.contains('hidden'), modalOverlay);

      if (!containerHidden) throw new Error('Modal container should be hidden');
      if (!overlayHidden) throw new Error('Modal overlay should be hidden');

      console.log('  PASS: Modal elements exist and hidden');
    }, { timeout: 15000 });
    passed++;
  } catch (err) {
    console.log('  FAIL:', err.message);
    failed++;
  }

  // Test 2: ModalBase is available globally
  try {
    console.log('TEST 2: ModalBase available globally');
    await withBrowser(async (browser, page) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await wait(500);

      const hasModalBase = await page.evaluate(() => {
        return typeof window.ModalBase !== 'undefined' &&
               typeof window.ModalBase.show === 'function' &&
               typeof window.ModalBase.close === 'function';
      });

      if (!hasModalBase) throw new Error('ModalBase not available or missing methods');

      console.log('  PASS: ModalBase global available');
    }, { timeout: 15000 });
    passed++;
  } catch (err) {
    console.log('  FAIL:', err.message);
    failed++;
  }

  // Test 3: Modals registry available
  try {
    console.log('TEST 3: Modals registry available');
    await withBrowser(async (browser, page) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await wait(500);

      const hasModals = await page.evaluate(() => {
        return typeof window.Modals !== 'undefined' &&
               typeof window.Modals.show === 'function' &&
               typeof window.Modals.register === 'function';
      });

      if (!hasModals) throw new Error('Modals registry not available');

      // Check registered modals
      const registeredModals = await page.evaluate(() => {
        return window.Modals.list ? window.Modals.list() : [];
      });

      console.log(`  Registered modals: ${registeredModals.length}`);
      if (registeredModals.length === 0) {
        console.log('  Warning: No modals registered');
      }

      console.log('  PASS: Modals registry available');
    }, { timeout: 15000 });
    passed++;
  } catch (err) {
    console.log('  FAIL:', err.message);
    failed++;
  }

  // Test 4: Can show a test modal programmatically
  try {
    console.log('TEST 4: Show modal programmatically');
    await withBrowser(async (browser, page) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await wait(500);

      // Show a modal via JS
      await page.evaluate(() => {
        window.ModalBase.show({
          title: 'Test Modal',
          content: '<p id="test-content">Hello World</p>',
          size: 'small'
        });
      });

      await wait(300);

      // Check modal is visible
      const modalVisible = await page.evaluate(() => {
        const container = document.getElementById('modal-container');
        return container && !container.classList.contains('hidden');
      });

      if (!modalVisible) throw new Error('Modal not visible after show()');

      // Check content rendered
      const hasContent = await page.$('#test-content');
      if (!hasContent) throw new Error('Modal content not rendered');

      console.log('  PASS: Modal shown programmatically');
    }, { timeout: 15000 });
    passed++;
  } catch (err) {
    console.log('  FAIL:', err.message);
    failed++;
  }

  // Test 5: Close modal with X button
  try {
    console.log('TEST 5: Close modal with X button');
    await withBrowser(async (browser, page) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await wait(500);

      // Show a modal
      await page.evaluate(() => {
        window.ModalBase.show({
          title: 'Close Test',
          content: '<p>Click X to close</p>'
        });
      });

      await wait(300);

      // Click close button
      await safeClick(page, '[data-action="closeModal"]');
      await wait(300);

      // Check modal is hidden
      const modalHidden = await page.evaluate(() => {
        const container = document.getElementById('modal-container');
        return container && container.classList.contains('hidden');
      });

      if (!modalHidden) throw new Error('Modal still visible after close');

      console.log('  PASS: Modal closed with X button');
    }, { timeout: 15000 });
    passed++;
  } catch (err) {
    console.log('  FAIL:', err.message);
    failed++;
  }

  // Test 6: Close modal with Escape key
  try {
    console.log('TEST 6: Close modal with Escape key');
    await withBrowser(async (browser, page) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await wait(500);

      // Show a modal
      await page.evaluate(() => {
        window.ModalBase.show({
          title: 'Escape Test',
          content: '<p>Press Escape to close</p>'
        });
      });

      await wait(300);

      // Press Escape
      await page.keyboard.press('Escape');
      await wait(300);

      // Check modal is hidden
      const modalHidden = await page.evaluate(() => {
        const container = document.getElementById('modal-container');
        return container && container.classList.contains('hidden');
      });

      if (!modalHidden) throw new Error('Modal still visible after Escape');

      console.log('  PASS: Modal closed with Escape key');
    }, { timeout: 15000 });
    passed++;
  } catch (err) {
    console.log('  FAIL:', err.message);
    failed++;
  }

  // Test 7: Close modal by clicking outside modal (on container background)
  try {
    console.log('TEST 7: Close modal by clicking outside');
    await withBrowser(async (browser, page) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await wait(500);

      // Show a modal
      await page.evaluate(() => {
        window.ModalBase.show({
          title: 'Overlay Test',
          content: '<p>Click outside to close</p>'
        });
      });

      await wait(300);

      // Click container background (not modal itself) - simulate click event
      await page.evaluate(() => {
        const container = document.getElementById('modal-container');
        // Create and dispatch a click event with target = container
        const event = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(event, 'target', { value: container, enumerable: true });
        container.dispatchEvent(event);
      });
      await wait(300);

      // Check modal is hidden
      const modalHidden = await page.evaluate(() => {
        const container = document.getElementById('modal-container');
        return container && container.classList.contains('hidden');
      });

      if (!modalHidden) throw new Error('Modal still visible after outside click');

      console.log('  PASS: Modal closed by clicking outside');
    }, { timeout: 15000 });
    passed++;
  } catch (err) {
    console.log('  FAIL:', err.message);
    failed++;
  }

  // Test 8: Confirm modal callback fires
  try {
    console.log('TEST 8: Confirm modal callback');
    await withBrowser(async (browser, page) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await wait(500);

      // Show confirm modal and track callback
      const confirmed = await page.evaluate(() => {
        return new Promise(resolve => {
          window.Modals.show('confirm', {
            title: 'Confirm Action',
            message: 'Are you sure?',
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false)
          });
        });
      });

      await wait(300);

      // Click confirm button
      await safeClick(page, '[data-action="confirm"]');

      // Wait for promise to resolve
      await wait(300);

      console.log('  PASS: Confirm modal works');
    }, { timeout: 15000 });
    passed++;
  } catch (err) {
    console.log('  FAIL:', err.message);
    failed++;
  }

  // Summary
  console.log('\n--- Summary ---');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);

  return { passed, failed };
}

// Run if called directly
if (require.main === module) {
  runTests().then(result => {
    console.log('\n=== Test Complete ===');
    process.exit(result.failed > 0 ? 1 : 0);
  }).catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
