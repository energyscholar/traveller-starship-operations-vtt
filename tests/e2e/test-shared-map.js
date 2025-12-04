/**
 * Quick test for shared map functionality
 */

const puppeteer = require('puppeteer');

async function testSharedMap() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  console.log('1. Navigate and use test API...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

  // Use test API to login
  const resp = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/test/gm-login', { method: 'POST' });
      return await res.json();
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log('  Login response:', JSON.stringify(resp));

  await new Promise(r => setTimeout(r, 2000));
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('2. Open shared map directly...');
  const opened = await page.evaluate(() => {
    if (typeof showSharedMap === 'function') {
      showSharedMap();
      return true;
    }
    return false;
  });
  console.log('  showSharedMap called:', opened);

  await new Promise(r => setTimeout(r, 5000));

  console.log('3. Check map state...');
  const mapInfo = await page.evaluate(() => {
    const overlay = document.getElementById('shared-map-overlay');
    const iframe = document.getElementById('shared-map-frame');
    const error = document.querySelector('#shared-map-error:not(.hidden)');
    const loading = document.querySelector('#shared-map-loading:not(.hidden)');
    return {
      overlayExists: Boolean(overlay),
      iframeExists: Boolean(iframe),
      iframeSrc: iframe ? iframe.src : null,
      iframeHidden: iframe ? iframe.classList.contains('hidden') : null,
      errorVisible: Boolean(error),
      loadingVisible: Boolean(loading)
    };
  });
  console.log('  Map info:', JSON.stringify(mapInfo, null, 2));

  await browser.close();
  console.log('\nDone!');
}

testSharedMap().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
