/**
 * V2 Viewscreen E2E Test
 * Tests viewscreen structure and system map module
 */

const { withBrowser, wait } = require('../helpers/browser-with-cleanup');
const assert = require('assert');

async function testV2Viewscreen() {
  console.log('=== V2 Viewscreen E2E Test ===\n');

  await withBrowser(async (browser, page) => {
    // Navigate to V2 app (served from root /)
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await wait(500);
    await page.waitForSelector('.login-options', { timeout: 5000 });
    console.log('✓ V2 app loaded');

    // Check viewscreen elements exist in DOM (hidden on login screen but present in HTML)
    const viewscreen = await page.$('#viewscreen');
    assert(viewscreen, 'Viewscreen container should exist in DOM');
    console.log('✓ Viewscreen container exists in DOM');

    // Check viewscreen toolbar exists
    const toolbar = await page.$('.viewscreen-toolbar');
    assert(toolbar, 'Viewscreen toolbar should exist in DOM');
    console.log('✓ Viewscreen toolbar exists in DOM');

    // Check System view button exists and has active class
    const systemBtn = await page.$('#btn-view-system');
    assert(systemBtn, 'System view button should exist');
    const systemBtnClass = await page.$eval('#btn-view-system', el => el.className);
    assert(systemBtnClass.includes('active'), 'System view button should have active class');
    console.log('✓ System view button exists with active class');

    // Check Parsec view button exists and is disabled
    const parsecBtn = await page.$('#btn-view-parsec');
    assert(parsecBtn, 'Parsec view button should exist');
    const parsecDisabled = await page.$eval('#btn-view-parsec', el => el.disabled);
    assert(parsecDisabled, 'Parsec view button should be disabled');
    console.log('✓ Parsec view button exists and is disabled');

    // Check viewscreen content area exists
    const content = await page.$('#viewscreen-content');
    assert(content, 'Viewscreen content area should exist');
    console.log('✓ Viewscreen content area exists');

    // Check v2SystemMap state object is available
    const systemMapState = await page.evaluate(() => typeof window.v2SystemMap !== 'undefined');
    assert(systemMapState, 'v2SystemMap state should be defined');
    console.log('✓ v2SystemMap state object available');

    // Check v2SystemMapEvents is available
    const systemMapEvents = await page.evaluate(() => typeof window.v2SystemMapEvents !== 'undefined');
    assert(systemMapEvents, 'v2SystemMapEvents should be defined');
    console.log('✓ v2SystemMapEvents available');

    // Check initV2Viewscreen function is available
    const initFn = await page.evaluate(() => typeof window.initV2Viewscreen === 'function');
    assert(initFn, 'initV2Viewscreen function should be defined');
    console.log('✓ initV2Viewscreen function available');

    // Check updateV2SystemData function is available
    const updateFn = await page.evaluate(() => typeof window.updateV2SystemData === 'function');
    assert(updateFn, 'updateV2SystemData function should be defined');
    console.log('✓ updateV2SystemData function available');

    console.log('\n=== All V2 Viewscreen Tests Passed ===');
  }, { timeout: 30000 });
}

// Run test
testV2Viewscreen().then(() => {
  console.log('\nPASSED: 10/10');
  process.exit(0);
}).catch(err => {
  console.error('\nTest failed:', err.message);
  process.exit(1);
});
