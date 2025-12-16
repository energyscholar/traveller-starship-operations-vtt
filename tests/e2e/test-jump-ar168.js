const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1400,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('Opening localhost:3000...');
  await page.goto('http://localhost:3000/operations', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Click Player button
  console.log('Clicking Player...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const playerBtn = btns.find(b => b.textContent.includes('Player'));
    if (playerBtn) playerBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Enter campaign code
  console.log('Entering campaign code...');
  await page.type('#campaign-code', 'DFFFC87E');
  await new Promise(r => setTimeout(r, 500));

  // Click Join as Player
  console.log('Joining as Player...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const joinBtn = btns.find(b => b.textContent.includes('Join as Player'));
    if (joinBtn) joinBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Click Asao's Join button on slot selection page
  console.log('Clicking Asao Join button...');
  await page.evaluate(() => {
    // Find all Join buttons and click the first one (Asao's)
    const btns = Array.from(document.querySelectorAll('button'));
    const joinBtns = btns.filter(b => b.textContent.trim() === 'Join');
    if (joinBtns.length > 0) {
      joinBtns[0].click(); // First Join button is Asao's
      console.log('Clicked first Join button');
    }
  });
  await new Promise(r => setTimeout(r, 3000));

  // Select Astrogator role using data-role-id attribute
  console.log('Clicking Astrogator role card...');
  const roleInfo = await page.evaluate(() => {
    const allRoles = document.querySelectorAll('[data-role-id]');
    const roles = Array.from(allRoles).map(r => ({
      id: r.dataset.roleId,
      taken: r.classList.contains('taken'),
      selected: r.classList.contains('selected')
    }));
    console.log('Available roles:', JSON.stringify(roles));

    const astroCard = document.querySelector('[data-role-id="astrogator"]');
    if (astroCard) {
      const isTaken = astroCard.classList.contains('taken');
      console.log('Astrogator card found, taken:', isTaken);
      astroCard.click();
      return { found: true, taken: isTaken, roles };
    } else {
      console.log('Astrogator card not found');
      return { found: false, roles };
    }
  });
  console.log('Role selection result:', JSON.stringify(roleInfo));
  await new Promise(r => setTimeout(r, 1000));

  // Click Join Bridge button
  console.log('Clicking Join Bridge...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const joinBtn = btns.find(b => b.textContent.includes('Join Bridge'));
    if (joinBtn) joinBtn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  // Expand the Astrogator role panel to full screen
  console.log('Expanding Astrogator role panel...');
  await page.evaluate(() => {
    // Click full-screen expand button on role panel
    const expandBtn = document.getElementById('btn-expand-full');
    if (expandBtn) {
      expandBtn.click();
      console.log('Clicked btn-expand-full');
    } else {
      console.log('btn-expand-full not found');
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  // Take screenshot
  console.log('Taking screenshot 1...');
  await page.screenshot({ path: '/tmp/jump-test-1.png', fullPage: false });

  // Look for destinations list and click Asteltine
  console.log('Looking for Asteltine in destinations...');
  const destInfo = await page.evaluate(() => {
    const destItems = document.querySelectorAll('.destination-item');
    const dests = Array.from(destItems).map(d => ({
      name: d.dataset.name,
      hex: d.dataset.hex,
      text: d.textContent.trim().substring(0, 30)
    }));

    // Find and click Asteltine using selectJumpDestination
    let clicked = null;
    destItems.forEach(item => {
      if (item.textContent.includes('Asteltine') || item.dataset.name === 'Asteltine') {
        if (window.selectJumpDestination) {
          window.selectJumpDestination(item);
          clicked = item.dataset.name;
        } else {
          item.click();
          clicked = 'click-fallback';
        }
      }
    });
    return { count: destItems.length, dests: dests.slice(0, 5), clicked };
  });
  console.log('Destinations:', JSON.stringify(destInfo));
  await new Promise(r => setTimeout(r, 1000));

  // Check jump-destination input value
  const destInputVal = await page.evaluate(() => {
    const input = document.getElementById('jump-destination');
    return input ? { value: input.value, hex: input.dataset?.hex, sector: input.dataset?.sector } : null;
  });
  console.log('Destination input:', JSON.stringify(destInputVal));

  // Click Plot Course button
  console.log('Clicking Plot Course button...');
  const plotResult = await page.evaluate(() => {
    // Find button with "Plot Course" or "Plot" text
    const btns = Array.from(document.querySelectorAll('button'));
    const plotBtn = btns.find(b => b.textContent.includes('Plot Course') || b.textContent.trim() === 'Plot');
    if (plotBtn) {
      plotBtn.click();
      return 'clicked: ' + plotBtn.textContent.trim();
    }
    // Fallback to window function
    if (window.plotJumpCourse) {
      window.plotJumpCourse();
      return 'window-fn';
    }
    // List all buttons for debug
    return 'not-found, buttons: ' + btns.map(b => b.textContent.trim().substring(0, 20)).join(', ');
  });
  console.log('Plot result:', plotResult);
  await new Promise(r => setTimeout(r, 2000));

  // Check for Initiate Jump button in plot result
  console.log('Looking for Initiate Jump...');
  const initResult = await page.evaluate(() => {
    // Look in jump-plot-result div
    const plotResult = document.getElementById('jump-plot-result');
    if (plotResult) {
      const initBtn = plotResult.querySelector('button');
      if (initBtn) {
        console.log('Found init button:', initBtn.textContent);
        initBtn.click();
        return 'clicked-init';
      }
      return 'no-button-in-result: ' + plotResult.innerHTML.substring(0, 100);
    }
    // Try any Initiate Jump button
    const btns = Array.from(document.querySelectorAll('button'));
    const initBtn = btns.find(b => b.textContent.includes('Initiate Jump'));
    if (initBtn) { initBtn.click(); return 'found-btn'; }
    return 'not-found';
  });
  console.log('Initiate result:', initResult);
  await new Promise(r => setTimeout(r, 2000));

  // Helper function for jump sequence
  async function doJump(destName) {
    console.log(`\n=== Jumping to ${destName} ===`);

    // Select destination
    await page.evaluate((name) => {
      const destItems = document.querySelectorAll('.destination-item');
      destItems.forEach(item => {
        if (item.dataset.name === name || item.textContent.includes(name)) {
          window.selectJumpDestination(item);
        }
      });
    }, destName);
    await new Promise(r => setTimeout(r, 500));

    // Plot course
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const plotBtn = btns.find(b => b.textContent.includes('Plot Course'));
      if (plotBtn) plotBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // Initiate jump
    await page.evaluate(() => {
      const plotResult = document.getElementById('jump-plot-result');
      const initBtn = plotResult?.querySelector('button');
      if (initBtn) initBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // Skip to exit
    await page.evaluate(() => { if (window.skipToJumpExit) window.skipToJumpExit(); });
    await new Promise(r => setTimeout(r, 1500));

    // Complete jump
    await page.evaluate(() => { if (window.completeJump) window.completeJump(); });
    await new Promise(r => setTimeout(r, 1500));

    // Verify position
    await page.evaluate(() => { if (window.verifyPosition) window.verifyPosition(); });
    await new Promise(r => setTimeout(r, 1500));

    // Log current system
    const sys = await page.evaluate(() => {
      const el = document.querySelector('.stat-value');
      return el ? el.textContent : 'unknown';
    });
    console.log(`Current system: ${sys}`);
  }

  // Jump 1: Asteltine (already selected above)
  console.log('\n=== Jump 1: Asteltine ===');
  await page.evaluate(() => { if (window.skipToJumpExit) window.skipToJumpExit(); });
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => { if (window.completeJump) window.completeJump(); });
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => { if (window.verifyPosition) window.verifyPosition(); });
  await new Promise(r => setTimeout(r, 2000));

  let sys = await page.evaluate(() => document.querySelector('.stat-row .stat-value')?.textContent);
  console.log('After jump 1:', sys);
  await page.screenshot({ path: '/tmp/jump-test-1.png', fullPage: false });

  // Jump 2: Debarre
  await doJump('Debarre');
  await page.screenshot({ path: '/tmp/jump-test-2.png', fullPage: false });

  // Jump 3: Flammarion
  await doJump('Flammarion');
  await page.screenshot({ path: '/tmp/jump-test-3.png', fullPage: false });

  // Switch to J-2 range
  console.log('\n=== Switching to J-2 range ===');
  await page.evaluate(() => {
    const rangeSelect = document.getElementById('jump-map-range');
    if (rangeSelect) {
      rangeSelect.value = '2';
      rangeSelect.dispatchEvent(new Event('change'));
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  // Jump 4: 567-908
  await doJump('567-908');
  await page.screenshot({ path: '/tmp/jump-test-4.png', fullPage: false });

  console.log('\n=== All jumps complete! ===');

  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
})();
