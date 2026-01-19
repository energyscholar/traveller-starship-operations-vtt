const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  await page.goto(fullUrl);
  await page.waitForSelector('#btn-gm-login', { timeout: 8000 });
  await page.click('#btn-gm-login');
  await new Promise(r => setTimeout(r, 500));
  await page.click('#btn-start-session');
  await new Promise(r => setTimeout(r, 2000));

  // Open system map
  await page.evaluate(() => showSystemMap());
  await new Promise(r => setTimeout(r, 1000));

  // Check for zoom buttons
  const result = await page.evaluate(() => {
    const zoomIn = document.getElementById('btn-zoom-in');
    const zoomOut = document.getElementById('btn-zoom-out');
    return {
      hasZoomIn: !!zoomIn,
      hasZoomOut: !!zoomOut,
      zoomInText: zoomIn ? zoomIn.textContent : null,
      zoomOutText: zoomOut ? zoomOut.textContent : null,
      container: !!document.querySelector('.system-map-zoom-controls')
    };
  });

  console.log('AR-87 Verification:');
  console.log('  Zoom In Button:', result.hasZoomIn ? '✅' : '❌', result.zoomInText || '');
  console.log('  Zoom Out Button:', result.hasZoomOut ? '✅' : '❌', result.zoomOutText || '');
  console.log('  Container:', result.container ? '✅' : '❌');
  console.log('  Overall:', result.hasZoomIn && result.hasZoomOut ? '✅ AR-87 COMPLETE' : '❌ NEEDS FIX');

  await browser.close();
})().catch(e => console.error('Error:', e.message));
