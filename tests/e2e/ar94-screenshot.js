const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // Navigate to operations and login as GM (same flow as gm-happy-path.smoke.js)
  await page.goto('http://localhost:3000/operations');
  await page.waitForSelector('#btn-gm-login', { timeout: 10000 });
  await page.click('#btn-gm-login');

  // Wait for campaign list and click first campaign
  await page.waitForSelector('.campaign-item', { timeout: 5000 });
  await page.click('.campaign-item');
  await page.waitForSelector('#btn-start-session', { timeout: 5000 });
  await page.click('#btn-start-session');

  // Wait for bridge to load
  await page.waitForSelector('.role-panel', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 500));

  // Click pilot tab to trigger the pilot-map layout
  await page.click('.role-tab[data-role="pilot"]').catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  // Take screenshot
  await page.screenshot({
    path: 'Screenshots/AR-94-pilot-map-layout.png',
    fullPage: false
  });

  console.log('Screenshot saved to Screenshots/AR-94-pilot-map-layout.png');

  if (errors.length > 0) {
    console.log('JS Errors:', errors.slice(0, 3).join(', '));
  } else {
    console.log('No JS errors');
  }

  await browser.close();
})().catch(e => console.error('Error:', e.message));
