const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  
  page.on('console', msg => {
    if (msg.text().includes('SystemMap') || msg.text().includes('Ship')) {
      console.log('CONSOLE:', msg.text());
    }
  });
  
  // Go to operations
  await page.goto('http://localhost:3000/operations/', { waitUntil: 'networkidle0' });
  
  // Open system map directly (before login, uses demo system)
  await page.evaluate(() => {
    if (typeof showSystemMap === 'function') showSystemMap();
  });
  await new Promise(r => setTimeout(r, 2000));
  
  // Manually set ship position for testing
  await page.evaluate(() => {
    if (typeof updateShipPosition === 'function') {
      updateShipPosition({
        name: 'Test Ship',
        position: { x: 1.3, y: 0.01, z: 0 }, // Near Flammarion orbit
        heading: 0
      });
    }
  });
  await new Promise(r => setTimeout(r, 500));
  
  // Screenshot at default zoom
  await page.screenshot({ path: 'tests/e2e/screenshots/zoom-default.png' });
  console.log('Screenshot 1: default zoom');
  
  const state1 = await page.evaluate(() => ({
    zoom: window.systemMapState?.zoom,
    AU_TO_PIXELS: window.systemMapState?.AU_TO_PIXELS,
    offsetX: window.systemMapState?.offsetX,
    offsetY: window.systemMapState?.offsetY,
    shipPos: window.shipMapState?.partyShip?.position
  }));
  console.log('State 1:', JSON.stringify(state1, null, 2));
  
  // Zoom out
  await page.evaluate(() => {
    if (typeof zoomSystemMap === 'function') {
      zoomSystemMap(0.5); // zoom out
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'tests/e2e/screenshots/zoom-out.png' });
  console.log('Screenshot 2: zoomed out');
  
  const state2 = await page.evaluate(() => ({
    zoom: window.systemMapState?.zoom,
    offsetX: window.systemMapState?.offsetX,
    offsetY: window.systemMapState?.offsetY
  }));
  console.log('State 2:', JSON.stringify(state2, null, 2));
  
  // Zoom in
  await page.evaluate(() => {
    if (typeof zoomSystemMap === 'function') {
      zoomSystemMap(2); // zoom in
      zoomSystemMap(2); // zoom in more
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'tests/e2e/screenshots/zoom-in.png' });
  console.log('Screenshot 3: zoomed in');
  
  const state3 = await page.evaluate(() => ({
    zoom: window.systemMapState?.zoom,
    offsetX: window.systemMapState?.offsetX,
    offsetY: window.systemMapState?.offsetY
  }));
  console.log('State 3:', JSON.stringify(state3, null, 2));
  
  await browser.close();
  console.log('Done');
})();
