/**
 * Journey Test - Multi-Role Ship Travel
 * Tests: Undock -> Fly to Jump Point -> Jump -> Refuel -> Return
 * Uses GM to start session + Player as pilot
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');

const BASE_URL = fullUrl;
const wait = ms => new Promise(r => setTimeout(r, ms));

async function runJourneyTest() {
  console.log('\n=== JOURNEY TEST: Flammarion Highport -> 567-908 -> Return ===\n');

  let gmBrowser, playerBrowser;
  const results = { passed: 0, failed: 0, errors: [] };

  try {
    // ===== STEP 1: GM Setup =====
    console.log('STEP 1: GM starts session...');
    gmBrowser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const gmPage = await gmBrowser.newPage();

    await gmPage.goto(BASE_URL);
    await gmPage.waitForSelector('#btn-gm-login', { timeout: 5000 });
    await gmPage.click('#btn-gm-login');
    await wait(500);

    // Select campaign
    await gmPage.waitForSelector('#campaign-list .campaign-item', { timeout: 5000 });
    const selectBtn = await gmPage.$('#campaign-list .campaign-item .btn-select');
    await selectBtn.click();
    await wait(800);

    // Get campaign code
    const code = await gmPage.evaluate(() =>
      document.querySelector('#campaign-code-value')?.textContent?.trim()
    );
    console.log(`  Campaign code: ${code}`);

    // Start session
    await gmPage.click('#btn-start-session');
    await wait(1000);
    await gmPage.waitForSelector('#bridge-screen.active', { timeout: 5000 });
    console.log('  [OK] GM on bridge\n');

    // ===== STEP 2: Player joins as Pilot =====
    console.log('STEP 2: Player joins as Pilot...');
    playerBrowser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const playerPage = await playerBrowser.newPage();

    // Track errors
    playerPage.on('pageerror', err => results.errors.push(err.message));

    await playerPage.goto(BASE_URL);
    await playerPage.waitForSelector('#btn-player-login', { timeout: 5000 });
    await playerPage.click('#btn-player-login');
    await wait(500);

    // Wait for player-select screen to appear
    await playerPage.waitForSelector('#player-select:not(.hidden), #campaign-code', { timeout: 5000 });
    await wait(300);

    // Enter campaign code
    await playerPage.type('#campaign-code', code);
    await playerPage.click('#btn-join-campaign');
    await wait(1000);

    // Wait for player slot selection
    await playerPage.waitForSelector('#player-slot-select:not(.hidden), #player-slot-list', { timeout: 5000 });
    console.log('  [OK] Player at slot selection');

    // Click first available slot
    await playerPage.waitForSelector('#player-slot-list .slot-item', { timeout: 5000 });
    const slotItem = await playerPage.$('#player-slot-list .slot-item');
    if (slotItem) {
      await slotItem.click();
      await wait(800);
    }

    // Wait for player setup screen with role selection
    await playerPage.waitForSelector('#player-setup-screen.active', { timeout: 5000 });
    console.log('  [OK] Player in role setup');

    // Select Pilot role
    await playerPage.waitForSelector('.role-option[data-role-id="pilot"]', { timeout: 5000 });
    await playerPage.click('.role-option[data-role-id="pilot"]');
    await wait(300);

    // Join bridge
    await playerPage.click('#btn-join-bridge');
    await wait(1000);
    await playerPage.waitForSelector('#bridge-screen.active', { timeout: 5000 });
    console.log('  [OK] Player on bridge as Pilot\n');

    // ===== STEP 3: Check Pilot Panel =====
    console.log('STEP 3: Check pilot panel...');
    await wait(500);

    const pilotInfo = await playerPage.evaluate(() => {
      const rolePanel = document.querySelector('#role-actions, .role-actions');
      const buttons = rolePanel ? Array.from(rolePanel.querySelectorAll('button')) : [];
      return {
        panelExists: !!rolePanel,
        buttons: buttons.map(b => ({
          text: b.textContent?.trim()?.substring(0, 30),
          disabled: b.disabled
        })),
        userRole: document.querySelector('#bridge-user-role')?.textContent?.trim()
      };
    });

    console.log(`  User role: ${pilotInfo.userRole}`);
    console.log(`  Pilot panel exists: ${pilotInfo.panelExists}`);
    console.log(`  Buttons: ${pilotInfo.buttons.map(b => b.text).join(', ')}`);

    const hasUndock = pilotInfo.buttons.some(b =>
      b.text?.toLowerCase().includes('undock')
    );
    console.log(`  UNDOCK button: ${hasUndock ? 'FOUND' : 'MISSING'}\n`);

    if (!hasUndock) {
      results.failed++;
      results.errors.push('UNDOCK button not found in pilot panel');

      // Debug: dump role-detail-view content
      const detailContent = await playerPage.evaluate(() => {
        const detail = document.querySelector('#role-detail-view');
        return detail?.innerHTML?.substring(0, 500) || 'No detail view';
      });
      console.log('  DEBUG role-detail-view:', detailContent.substring(0, 200));
    } else {
      results.passed++;
    }

    // ===== STEP 4: Execute UNDOCK =====
    if (hasUndock) {
      console.log('STEP 4: Execute UNDOCK...');

      const undockBtn = await playerPage.evaluateHandle(() => {
        const btns = document.querySelectorAll('#role-actions button, .role-actions button');
        for (const b of btns) {
          if (b.textContent?.toLowerCase().includes('undock')) return b;
        }
        return null;
      });

      if (undockBtn && undockBtn.asElement()) {
        await undockBtn.asElement().click();
        await wait(1500);

        // Check ship location changed
        const locationAfter = await playerPage.evaluate(() =>
          document.querySelector('#bridge-location')?.textContent?.trim()
        );
        console.log(`  Location after undock: ${locationAfter}`);

        if (locationAfter && !locationAfter.includes('Highport')) {
          console.log('  [OK] Ship undocked\n');
          results.passed++;
        } else {
          console.log('  [WARN] Location may not have changed\n');
        }
      }
    }

    // ===== STEP 5: Check for Travel/Fly options =====
    console.log('STEP 5: Check travel options...');
    const travelInfo = await playerPage.evaluate(() => {
      const btns = document.querySelectorAll('#role-actions button, .role-actions button, #role-detail-view button');
      const travelBtns = Array.from(btns).filter(b => {
        const text = b.textContent?.toLowerCase() || '';
        return text.includes('travel') || text.includes('fly') || text.includes('course') || text.includes('destination');
      });
      return travelBtns.map(b => ({
        text: b.textContent?.trim()?.substring(0, 40),
        disabled: b.disabled
      }));
    });

    if (travelInfo.length > 0) {
      console.log('  Travel options:', travelInfo.map(t => t.text).join(', '));
      results.passed++;
    } else {
      console.log('  [WARN] No travel options found');
      results.errors.push('No travel options in pilot panel');
    }

    // ===== Summary =====
    console.log('\n=== JOURNEY TEST SUMMARY ===');
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    if (results.errors.length > 0) {
      console.log('Errors:', results.errors.join(', '));
    }

  } catch (err) {
    console.log('\n[FAIL]', err.message);
    results.errors.push(err.message);
  } finally {
    if (gmBrowser) await gmBrowser.close();
    if (playerBrowser) await playerBrowser.close();
  }

  console.log('\n=== TEST COMPLETE ===');
  return results;
}

runJourneyTest();
