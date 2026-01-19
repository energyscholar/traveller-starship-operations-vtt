const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // Capture console logs
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto(fullUrl);
  await page.waitForSelector('#btn-gm-login', { timeout: 5000 });
  await page.click('#btn-gm-login');

  // Wait for campaign selection, click Select button
  await new Promise(r => setTimeout(r, 500));
  await page.click('.campaign-item button').catch(() => {});
  await new Promise(r => setTimeout(r, 500));

  // Click Start Session
  await page.click('#btn-start-session').catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  // Check for version string
  const versionLog = logs.find(l => l.includes('SystemMap'));
  console.log('Version log:', versionLog || 'NOT FOUND');

  // Screenshot 1: Bridge initial
  await page.screenshot({ path: 'Screenshots/AR-102-zoom-1-bridge.png' });
  console.log('Screenshot 1: Bridge initial');

  // Open System Map by clicking the System Map button
  const sysMapBtn = await page.$('#btn-pilot-destinations');
  if (sysMapBtn) {
    await sysMapBtn.click();
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'Screenshots/AR-102-zoom-2-modal.png' });
    console.log('Screenshot 2: System Map modal');
  } else {
    // Try calling showSystemMap() directly
    await page.evaluate(() => {
      if (typeof showSystemMap === 'function') showSystemMap();
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'Screenshots/AR-102-zoom-2-modal.png' });
    console.log('Screenshot 2: System Map via function');
  }

  // Look for Places button to open destinations panel
  const placesBtn = await page.$('#btn-places');
  if (placesBtn) {
    await placesBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'Screenshots/AR-102-zoom-3-places.png' });
    console.log('Screenshot 3: Places panel open');

    // Find destination items and click on them
    const destItems = await page.$$('.destination-item, .places-item, .place-item');
    console.log(`Found ${destItems.length} destination items`);

    if (destItems.length > 0) {
      // Click first destination (likely Highport)
      await destItems[0].click();
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: 'Screenshots/AR-102-zoom-4-dest1.png' });
      console.log('Screenshot 4: First destination selected');
    }

    if (destItems.length > 1) {
      // Click second destination (likely planet)
      await destItems[1].click();
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: 'Screenshots/AR-102-zoom-5-dest2.png' });
      console.log('Screenshot 5: Second destination selected');
    }
  } else {
    console.log('Places button not found');
    // List all buttons for debugging
    const btns = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => b.id || b.className || b.textContent.slice(0,30));
    });
    console.log('Available buttons:', btns.slice(0, 15).join(', '));
  }

  // Get console logs about zoom calculations
  console.log('\n=== ZOOM CALCULATION LOGS ===');
  const zoomLogs = logs.filter(l =>
    l.includes('EmbeddedMap') ||
    l.includes('Going to') ||
    l.includes('radius') ||
    l.includes('zoom') ||
    l.includes('calculateZoom') ||
    l.includes('SIZE-ZOOM')
  );
  zoomLogs.slice(-15).forEach(l => console.log(l));

  await browser.close();
  console.log('\nDone! Check Screenshots/AR-102-zoom-*.png');
})().catch(e => console.error('Error:', e.message));
