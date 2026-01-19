/**
 * Test iframe embedding of TravellerMap
 */
const puppeteer = require('puppeteer');

async function testIframe() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']  // Match real browser security - no --disable-web-security
  });
  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => console.log('BROWSER:', msg.text()));

  console.log('1. Loading page...');
  await page.goto(fullUrl + '/', { waitUntil: 'networkidle0' });

  console.log('2. GM login via UI...');
  await page.click('#btn-gm-login');
  await new Promise(r => setTimeout(r, 1000));
  // Create or select campaign
  const createBtn = await page.$('#btn-create-campaign');
  if (createBtn) {
    await createBtn.click();
    await new Promise(r => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 1000));

  console.log('3. Opening shared map...');
  await page.evaluate(() => showSharedMap());
  await new Promise(r => setTimeout(r, 5000));

  console.log('4. Checking iframe...');
  const info = await page.evaluate(() => {
    const iframe = document.getElementById('shared-map-frame');
    if (!iframe) return { error: 'No iframe found' };

    let iframeContent = 'cannot access (cross-origin)';
    try {
      iframeContent = iframe.contentDocument?.body?.innerHTML?.substring(0, 500) || 'empty or null';
    } catch(e) {
      iframeContent = 'cross-origin blocked: ' + e.message;
    }

    return {
      src: iframe.src,
      hidden: iframe.classList.contains('hidden'),
      contentLength: iframeContent.length,
      content: iframeContent
    };
  });

  console.log('IFRAME INFO:', JSON.stringify(info, null, 2));

  // Take screenshot
  await page.screenshot({ path: 'shared-map-test.png', fullPage: true });
  console.log('Screenshot saved to shared-map-test.png');

  await browser.close();
}

testIframe().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
