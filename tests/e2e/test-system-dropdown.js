/**
 * Test: Verify system dropdown shows all 20 systems
 */
const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    if (msg.text().includes('[SystemMap]')) {
      logs.push(msg.text());
    }
  });

  try {
    await page.goto(fullUrl);
    await page.waitForSelector('#btn-gm-login', { timeout: 5000 });
    await page.click('#btn-gm-login');
    await new Promise(r => setTimeout(r, 500));
    await page.click('#btn-start-session');
    await new Promise(r => setTimeout(r, 2000));

    // Call showSystemMap() directly via window
    await page.evaluate(() => {
      if (window.showSystemMap) window.showSystemMap();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Get dropdown options
    const options = await page.evaluate(() => {
      const select = document.getElementById('test-system-select');
      if (!select) return { error: 'Select not found' };
      return Array.from(select.options).map(o => o.text);
    });

    console.log('=== DROPDOWN TEST ===');
    console.log('Options count:', Array.isArray(options) ? options.length : 'N/A');
    if (Array.isArray(options)) {
      console.log('First 5:', options.slice(0, 5).join(', '));
      console.log('Last 3:', options.slice(-3).join(', '));
    }
    console.log('\nConsole logs with [SystemMap]:');
    logs.forEach(l => console.log('  ' + l));

    // Pass/fail check
    const expected = 20;
    if (Array.isArray(options) && options.length === expected) {
      console.log('\n✓ PASS: All ' + expected + ' systems present');
    } else {
      console.log('\n✗ FAIL: Expected ' + expected + ', got ' + (Array.isArray(options) ? options.length : 'error'));
    }

  } catch (err) {
    console.error('Test error:', err.message);
  }

  await browser.close();
})();
