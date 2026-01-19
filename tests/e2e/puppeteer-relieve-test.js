/**
 * Puppeteer Test: GM Relieve Crew Member
 * Tests the GM's ability to relieve crew members from their roles
 *
 * Usage: node tests/e2e/puppeteer-relieve-test.js
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');

const BASE_URL = fullUrl + '/';
const TIMEOUT = 30000;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('\n=== Puppeteer Test: GM Relieve Crew Member ===\n');

  let browser = null;
  let passed = true;

  try {
    // Launch browser in visible mode for debugging
    browser = await puppeteer.launch({
      headless: 'new', // Use 'false' to see the browser
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Capture console logs from browser
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || text.includes('[PUPPETRY]') || text.includes('[OPS]')) {
        console.log(`  [BROWSER ${type}] ${text}`);
      }
    });

    // Navigate to operations
    console.log('1. Navigating to Operations VTT...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    await delay(1000);

    // Check we're on the login screen
    const loginScreen = await page.$('#login-screen.active');
    if (!loginScreen) {
      throw new Error('Login screen not displayed');
    }
    console.log('   Login screen displayed');

    // Click GM Login button
    console.log('2. Logging in as GM...');
    await page.click('#btn-gm-login');
    await delay(1000);

    // Wait for campaign select div to be visible
    await page.waitForSelector('#campaign-select:not(.hidden)', { timeout: 5000 });
    console.log('   Campaign selection visible');

    // Find and select the Dorannia campaign (first one in campaign list)
    console.log('3. Selecting campaign...');
    await delay(500);

    // Get campaign cards/buttons in the list
    const campaignCards = await page.$$('#campaign-list .campaign-card, #campaign-list .campaign-item, #campaign-list button');
    console.log(`   Found ${campaignCards.length} campaigns`);

    if (campaignCards.length === 0) {
      console.log('   Warning: No campaigns found - test needs seeded Dorannia campaign');
      console.log('   Run: npm run ops:reset to seed the database');
      throw new Error('No campaigns found - run npm run ops:reset first');
    }

    // Click the first campaign
    await campaignCards[0].click();
    console.log('   Campaign clicked');
    await delay(2000);

    // Introspect: What screen are we on now?
    const currentScreen = await page.evaluate(() => {
      const screens = document.querySelectorAll('.screen.active, [id$="-screen"].active');
      return Array.from(screens).map(s => ({
        id: s.id,
        classes: s.className,
        buttons: Array.from(s.querySelectorAll('button')).map(b => ({
          id: b.id,
          text: b.textContent.trim().substring(0, 30),
          visible: b.offsetParent !== null
        })).filter(b => b.visible)
      }));
    });
    console.log('   Current screen(s):', JSON.stringify(currentScreen, null, 2));

    // Check if we need to start a session
    const startSessionBtn = await page.$('#btn-start-session, button[id*="start"], button[id*="session"]');
    if (startSessionBtn) {
      console.log('4. Starting session...');
      await startSessionBtn.click();
      await delay(1000);
    }

    // Wait for bridge screen
    try {
      await page.waitForSelector('#bridge-screen.active', { timeout: 5000 });
      console.log('   Bridge screen displayed');
    } catch (e) {
      // Dump current screen state for debugging
      const screenHtml = await page.evaluate(() => {
        const active = document.querySelector('.screen.active, [id$="-screen"].active');
        return active ? { id: active.id, html: active.innerHTML.substring(0, 1500) } : null;
      });
      console.log('   Active screen:', screenHtml?.id);
      console.log('   Screen content:', screenHtml?.html?.substring(0, 500));
      throw e;
    }

    // Find crew list
    console.log('5. Looking for crew with roles...');
    await delay(500);

    // Get crew items with relieve buttons
    const relieveBtns = await page.$$('.crew-item .relieve-btn, .crew-relieve-btn, button[onclick*="relieveCrewMember"]');
    console.log(`   Found ${relieveBtns.length} relieve buttons`);

    if (relieveBtns.length === 0) {
      console.log('   No crew with roles to relieve - checking if there are assigned crew...');

      // Check the crew list HTML for debugging
      const crewListHtml = await page.evaluate(() => {
        const list = document.querySelector('.crew-list, #crew-list, .crew-panel');
        return list ? list.innerHTML.substring(0, 1000) : 'No crew list found';
      });
      console.log('   Crew list sample:', crewListHtml.substring(0, 200));

      console.log('   Test inconclusive - no crew assigned to roles');
      passed = false;
    } else {
      // Try to click the first relieve button
      console.log('6. Clicking relieve button for first crew member...');

      // Get info about the crew member we're relieving
      const crewInfo = await page.evaluate(() => {
        const btn = document.querySelector('.relieve-btn, button[onclick*="relieveCrewMember"]');
        if (!btn) return null;
        const crewItem = btn.closest('.crew-item');
        return {
          name: crewItem?.querySelector('.crew-name')?.textContent || 'Unknown',
          role: crewItem?.querySelector('.crew-role')?.textContent || 'Unknown',
          onclick: btn.getAttribute('onclick')
        };
      });

      if (crewInfo) {
        console.log(`   Relieving: ${crewInfo.name} (${crewInfo.role})`);
      }

      // Intercept the confirm dialog
      page.on('dialog', async dialog => {
        console.log(`   Confirm dialog: "${dialog.message()}"`);
        await dialog.accept(); // Click OK
      });

      // Click the relieve button
      await relieveBtns[0].click();
      await delay(2000);

      // Check for success notification or error
      const notification = await page.evaluate(() => {
        const notif = document.querySelector('.notification, .toast, .alert');
        return notif ? notif.textContent : null;
      });

      if (notification) {
        console.log(`   Notification: ${notification}`);
      }

      // Check server logs (via browser console) for success/error
      console.log('7. Checking result...');
      await delay(500);

      // If we got here without errors, test passed
      console.log('\nTest PASSED - No errors during relieve operation');
    }

  } catch (error) {
    console.error(`\nTest FAILED: ${error.message}`);
    passed = false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log('\n=== Test Complete ===\n');
  process.exit(passed ? 0 : 1);
}

runTest();
