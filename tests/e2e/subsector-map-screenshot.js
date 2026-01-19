/**
 * Quick test: Screenshot subsector map
 */
const puppeteer = require('puppeteer');
const { BASE_URL } = require('./config');
const path = require('path');
const fs = require('fs');

async function takeSubsectorScreenshot() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    // Go to login
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#btn-gm-login', { timeout: 5000 });

    // GM Login via evaluate
    await page.evaluate(() => document.getElementById('btn-gm-login').click());
    await new Promise(r => setTimeout(r, 1000));

    // Select first campaign via evaluate
    await page.waitForSelector('.campaign-item', { timeout: 5000 });
    await page.evaluate(() => document.querySelector('.campaign-item').click());
    await new Promise(r => setTimeout(r, 500));

    // Start session via evaluate
    await page.waitForSelector('#btn-start-session', { timeout: 5000 });
    await page.evaluate(() => document.getElementById('btn-start-session').click());

    // Wait for bridge
    await page.waitForSelector('#bridge-screen', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1500));

    // Click subsector button via evaluate
    const hasBtn = await page.evaluate(() => {
      const btn = document.getElementById('btn-subsector-map');
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!hasBtn) {
      console.log('Subsector button not found');
      await browser.close();
      return;
    }
    await new Promise(r => setTimeout(r, 1500)); // Wait for render

    // Screenshot
    const screenshotPath = path.join(__dirname, 'screenshots', 'subsector-map.png');
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Screenshot saved:', screenshotPath);

  } catch (err) {
    console.error('Error:', err.message);
  }

  await browser.close();
}

takeSubsectorScreenshot();
