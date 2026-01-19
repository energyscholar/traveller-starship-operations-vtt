const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function captureVersion(version, basePath) {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const prefix = version;
  const url = `http://localhost:3000${basePath}`;
  console.log(`\n=== Capturing ${version} from ${url} ===`);

  try {
    // Login screen
    await page.goto(url);
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${prefix}-1-login.png`) });
    console.log(`${prefix}: Login screen captured`);

    // GM Login
    await page.evaluate(() => document.getElementById('btn-gm-login')?.click());
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${prefix}-2-campaign-select.png`) });
    console.log(`${prefix}: Campaign select captured`);

    // Wait for campaigns and select first one
    await page.waitForSelector('.campaign-item, .campaign-card', { timeout: 5000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 500));

    // Click select button on campaign with NPC crew (Travelling the Spinward Marches)
    await page.evaluate(() => {
      // Look for "Travelling" campaign, or fall back to any campaign
      const items = document.querySelectorAll('.campaign-item, .campaign-card');
      for (const item of items) {
        if (item.textContent.includes('Travelling') || item.textContent.includes('Spinward')) {
          const btn = item.querySelector('button, .btn');
          if (btn) { btn.click(); return; }
        }
      }
      // Fallback: click first campaign
      const btn = document.querySelector('.campaign-item button, .campaign-item .btn, .campaign-card');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${prefix}-3-gm-setup.png`) });
    console.log(`${prefix}: GM setup captured`);

    // Start session
    await page.evaluate(() => {
      const btn = document.getElementById('btn-start-session');
      if (btn && !btn.disabled) btn.click();
    });
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${prefix}-4-bridge.png`) });
    console.log(`${prefix}: Bridge captured`);

    // Open menu
    await page.evaluate(() => {
      const btn = document.getElementById('btn-menu');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${prefix}-5-menu.png`) });
    console.log(`${prefix}: Menu captured`);

    // Open shared map
    await page.evaluate(() => {
      const item = document.getElementById('menu-shared-map');
      if (item) item.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${prefix}-6-shared-map.png`) });
    console.log(`${prefix}: Shared map captured`);

  } catch (err) {
    console.error(`${prefix} error:`, err.message);
  }

  await browser.close();
}

(async () => {
  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Capture V1 (legacy)
  await captureVersion('v1', '/operations/legacy');

  // Capture V2 (current /operations)
  await captureVersion('v2', '/operations');

  console.log('\n=== Screenshots saved to tests/e2e/screenshots/ ===');
  console.log('Compare v1-*.png with v2-*.png');
})();
