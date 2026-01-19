/**
 * AR-104: Camera Angle Screenshot Test
 * Takes screenshots of various celestial objects with different camera angles
 */
const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(fullUrl);
  await page.waitForSelector('#gm-btn', { timeout: 8000 });
  await page.click('#gm-btn');
  await page.waitForSelector('.role-panel', { timeout: 5000 });

  // Open system map
  await page.click('button[data-action="system-map"]').catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot the overview
  await page.screenshot({ path: 'Screenshots/AR-104-01-overview.png' });
  console.log('1. Overview');

  // Click on places overlay items - each click should center/zoom
  const places = await page.$$('.places-item');
  console.log(`Found ${places.length} places`);

  // Test first 4 places with 3 camera cycles each
  const testPlaces = ['Star', 'Mainworld', 'Highport', 'Vestri'];
  let shotNum = 2;

  for (let i = 0; i < Math.min(4, places.length); i++) {
    const place = places[i];
    const name = await place.evaluate(el => el.textContent.trim().substring(0, 20));

    // First click - default camera
    await place.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: `Screenshots/AR-104-${String(shotNum++).padStart(2,'0')}-${name.replace(/[^a-z0-9]/gi,'')}-angle1.png` });
    console.log(`${shotNum-1}. ${name} - angle 1 (default)`);

    // Second click - cycle to next angle
    await place.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: `Screenshots/AR-104-${String(shotNum++).padStart(2,'0')}-${name.replace(/[^a-z0-9]/gi,'')}-angle2.png` });
    console.log(`${shotNum-1}. ${name} - angle 2 (wide)`);

    // Third click - cycle to orbital
    await place.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: `Screenshots/AR-104-${String(shotNum++).padStart(2,'0')}-${name.replace(/[^a-z0-9]/gi,'')}-angle3.png` });
    console.log(`${shotNum-1}. ${name} - angle 3 (orbital)`);
  }

  if (errors.length > 0) {
    console.log('JS Errors:', errors.slice(0, 3).join(', '));
  } else {
    console.log('No JS errors');
  }

  console.log(`\nTotal: ${shotNum - 1} screenshots in Screenshots/`);

  await browser.close();
})().catch(e => console.error('Error:', e.message));
