const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  await page.goto('http://localhost:3000/operations');
  await page.waitForSelector('#btn-gm-login', { timeout: 5000 });
  await page.click('#btn-gm-login');
  await new Promise(r => setTimeout(r, 500));

  // Select campaign
  await page.waitForSelector('#campaign-list .campaign-item', { timeout: 5000 });
  const selectBtn = await page.$('#campaign-list .campaign-item .btn-select');
  if (selectBtn) await selectBtn.click();
  await new Promise(r => setTimeout(r, 800));

  // Start session
  await page.click('#btn-start-session');
  await new Promise(r => setTimeout(r, 1000));
  await page.waitForSelector('#bridge-screen.active', { timeout: 5000 });

  // Check available roles
  const roles = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.role-tab')).map(t => ({
      role: t.dataset.role,
      text: t.textContent.trim()
    }));
  });
  console.log('Available role tabs:', roles.map(r => r.role).join(', '));

  // Look for observer role tab
  const observerTab = await page.$('.role-tab[data-role="observer"]');
  if (observerTab) {
    console.log('Observer tab found! Clicking...');
    await observerTab.click();
    await new Promise(r => setTimeout(r, 500));
  } else {
    console.log('No dedicated observer tab - trying to trigger observer fallback...');
    // Try clicking a non-existent role to trigger default/observer fallback
  }

  // Take screenshot of bridge
  await page.screenshot({ path: '/tmp/observer-panel.png' });
  console.log('Screenshot saved to /tmp/observer-panel.png');

  // Also capture the role panel content
  const panelContent = await page.evaluate(() => {
    const panel = document.querySelector('#role-detail-view');
    return panel ? panel.innerHTML.substring(0, 500) : 'No panel found';
  });
  console.log('Panel content preview:', panelContent.substring(0, 200));

  await browser.close();
})().catch(e => console.error('Error:', e.message));
