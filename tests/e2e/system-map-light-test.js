/**
 * System Map Light Test - Verify panel doesn't slide and component renders
 */

const puppeteer = require('puppeteer');
const path = require('path');

// BASE_URL from config
const SCREENSHOT_DIR = path.join(__dirname, '../../Screenshots');

// Helper for waiting (replaces deprecated waitForTimeout)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
  console.log('=== System Map Light Test ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('SystemMapLight')) {
        console.log(`[Browser] ${msg.text()}`);
      }
    });

    // Go to operations page
    console.log('1. Loading operations page...');
    await page.goto(`${BASE_URL}/operations`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Login as GM
    console.log('2. Logging in as GM...');
    await page.waitForSelector('#btn-gm-login', { timeout: 5000 });
    await page.click('#btn-gm-login');

    // Select campaign
    console.log('3. Selecting campaign...');
    await page.waitForSelector('.campaign-item', { timeout: 5000 });
    await page.click('.campaign-item');

    // Click Start Session
    console.log('4. Starting session...');
    await page.waitForSelector('#btn-start-session', { timeout: 5000 });
    await page.click('#btn-start-session');

    // Wait for bridge to load
    console.log('5. Waiting for bridge...');
    await page.waitForSelector('.bridge-main', { timeout: 10000 });
    await wait(1000);

    // Take initial screenshot
    const screenshot1 = path.join(SCREENSHOT_DIR, 'system-map-light-initial.png');
    await page.screenshot({ path: screenshot1, fullPage: false });
    console.log(`   Screenshot: ${screenshot1}`);

    // Get initial panel position
    const initialPos = await page.evaluate(() => {
      const panel = document.getElementById('compact-viewscreen');
      if (!panel) return null;
      const rect = panel.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: rect.height };
    });
    console.log(`   Initial position: top=${initialPos?.top}, height=${initialPos?.height}`);

    // Wait 3 seconds and check if panel slides
    console.log('6. Waiting 3 seconds to check for slide...');
    await wait(3000);

    // Get final position
    const finalPos = await page.evaluate(() => {
      const panel = document.getElementById('compact-viewscreen');
      if (!panel) return null;
      const rect = panel.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: rect.height };
    });
    console.log(`   Final position: top=${finalPos?.top}, height=${finalPos?.height}`);

    // Take final screenshot
    const screenshot2 = path.join(SCREENSHOT_DIR, 'system-map-light-after-wait.png');
    await page.screenshot({ path: screenshot2, fullPage: false });
    console.log(`   Screenshot: ${screenshot2}`);

    // Check for slide
    const slideAmount = Math.abs((finalPos?.top || 0) - (initialPos?.top || 0));
    if (slideAmount > 5) {
      console.log(`\n❌ FAIL: Panel slid by ${slideAmount}px`);
      process.exitCode = 1;
    } else {
      console.log(`\n✅ PASS: Panel stable (moved ${slideAmount}px)`);
    }

    // Check if System Map Light initialized
    const hasCanvas = await page.evaluate(() => {
      const light = document.querySelector('.system-map-light');
      const canvas = light?.querySelector('canvas');
      return { hasLight: !!light, hasCanvas: !!canvas };
    });
    console.log(`   System Map Light: ${hasCanvas.hasLight ? '✓' : '✗'}, Canvas: ${hasCanvas.hasCanvas ? '✓' : '✗'}`);

    // Check for console errors
    console.log('\n7. Checking for errors...');
    const errors = await page.evaluate(() => {
      return window.__consoleErrors || [];
    });
    if (errors.length > 0) {
      console.log(`   Found ${errors.length} console errors`);
    } else {
      console.log('   No console errors');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }

  console.log('\n=== Test Complete ===');
}

runTest();
