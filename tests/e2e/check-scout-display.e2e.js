#!/usr/bin/env node
/**
 * Quick test to verify Scout ship displays correctly
 */

const { withBrowser, wait } = require('./helpers/browser-with-cleanup');
const path = require('path');
const { fullUrl } = require('./config');

const BASE_URL = fullUrl;

async function checkScoutDisplay() {
  console.log('Checking Scout ship display...\n');

  await withBrowser(async (browser, page) => {
    // Log console for debugging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Ship') || text.includes('ship') || text.includes('ASCII') || text.includes('SVG') || text.includes('Bridge')) {
        console.log('[Console]', text);
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForSelector('.login-options', { timeout: 10000 });

    // Join Solo Demo as Captain
    await page.click('#btn-solo-demo');
    await wait(2000);

    // Select Captain role to see ship status panel
    await page.evaluate(() => {
      const sel = document.querySelector('#role-select');
      if (sel) { sel.value = 'captain'; sel.dispatchEvent(new Event('change')); }
    });
    console.log('Selected Captain role');

    // Wait for setup screen to fully load
    await wait(1000);

    // Click Join Bridge button
    await page.click('#btn-join-bridge');
    await wait(3000);

    await page.waitForSelector('#bridge-screen:not(.hidden)', { timeout: 10000 });
    console.log('Bridge screen visible');

    // Take screenshot
    const screenshotPath = path.join(__dirname, 'screenshots', 'scout-check.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);

    // Check what ship is displayed
    const shipName = await page.$eval('#bridge-ship-name', el => el.textContent);
    console.log(`Ship name displayed: ${shipName}`);

    // Check ship panel content
    const panel = await page.$('#ship-status-panel');
    let panelContent = '';
    if (panel) {
      panelContent = await panel.evaluate(el => el.innerHTML);
      console.log(`Panel content preview: ${panelContent.substring(0, 300)}...`);
    } else {
      console.log('Ship status panel not found on this screen');
    }

    // Check the SVG being loaded
    const svgInfo = await page.evaluate(() => {
      const svg = document.querySelector('#ship-status-panel svg');
      if (svg) {
        return {
          viewBox: svg.getAttribute('viewBox'),
          hasScoutElements: svg.innerHTML.includes('scout') || svg.innerHTML.includes('Scout'),
          firstPath: svg.querySelector('path')?.getAttribute('d')?.substring(0, 50)
        };
      }
      return null;
    });
    console.log('SVG info:', svgInfo);

    // Check for Q-ship or Scout in page
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasQship = pageText.includes('Q-Ship') || pageText.includes('q_ship');
    const hasScout = pageText.includes('Scout');

    console.log(`\nResults:`);
    console.log(`  Ship name: ${shipName}`);
    console.log(`  Page has Q-ship text: ${hasQship}`);
    console.log(`  Page has Scout text: ${hasScout}`);

    if (shipName !== 'Far Horizon') {
      console.log('\n❌ WRONG SHIP! Expected Far Horizon');
    } else {
      console.log('\n✓ Correct ship: Far Horizon');
    }

  }, { timeout: 60000, headless: false });
}

if (require.main === module) {
  checkScoutDisplay()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Test failed:', err.message);
      process.exit(1);
    });
}
