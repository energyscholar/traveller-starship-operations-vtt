/**
 * Quick test for poster proxy
 */
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('requestfailed', req => console.log('FAILED:', req.url(), req.failure().errorText));

  await page.goto(fullUrl + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    await fetch('/api/test/gm-login', { method: 'POST' });
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => showSharedMap());
  await new Promise(r => setTimeout(r, 4000));

  const info = await page.evaluate(() => {
    const img = document.getElementById('shared-map-image');
    if (!img) return { error: 'No image found' };
    return {
      src: img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete
    };
  });

  console.log('IMAGE:', JSON.stringify(info, null, 2));

  if (info.naturalWidth > 0 && info.complete) {
    console.log('SUCCESS: Poster proxy working!');
  } else {
    console.log('FAIL: Image not loaded');
  }

  await browser.close();
  process.exit(info.naturalWidth > 0 ? 0 : 1);
})();
