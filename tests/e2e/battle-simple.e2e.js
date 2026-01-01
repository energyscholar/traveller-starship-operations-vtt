#!/usr/bin/env node
/**
 * Simple Battle E2E Test - Q-Ship vs 1 Pirate
 *
 * 3 visible browsers arranged on screen:
 * - GM (top-left): Creates contact, fires as pirate
 * - Gunner (top-right): Fires at pirate
 * - Sensors (bottom-center): Scans pirate
 */

const puppeteer = require('puppeteer');
const {
  navigateToOperations,
  gmLogin,
  startSession,
  delay,
  DELAYS
} = require('./puppeteer-utils');

const RESULTS = { passed: 0, failed: 0, errors: [] };

function pass(name) {
  console.log(`  ✓ ${name}`);
  RESULTS.passed++;
}

function fail(name, reason) {
  console.log(`  ✗ ${name}: ${reason}`);
  RESULTS.failed++;
  RESULTS.errors.push(`${name}: ${reason}`);
}

/**
 * Join as a specific role
 */
async function joinAsRole(page, campaignCode, roleName, roleId) {
  await navigateToOperations(page);
  await delay(1000);

  await page.click('#btn-player-login');
  await delay(1000);

  await page.type('#campaign-code', campaignCode);
  await delay(500);

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.includes('Join as Player'));
    if (btn) btn.click();
  });
  await delay(2000);

  // Select first available slot
  await page.evaluate(() => {
    const joinBtn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.trim() === 'Join');
    if (joinBtn) joinBtn.click();
  });
  await delay(2000);

  // Select role
  await page.evaluate((rid) => {
    const roleBtn = document.querySelector(`[data-role-id="${rid}"]`);
    if (roleBtn) roleBtn.click();
  }, roleId);
  await delay(1000);

  // Join Bridge
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.includes('Join Bridge'));
    if (btn) btn.click();
  });
  await delay(3000);

  const onBridge = await page.$('#bridge-screen.active');
  return !!onBridge;
}

// ==============================================
// Main Test
// ==============================================
(async () => {
  console.log('═'.repeat(50));
  console.log('SIMPLE BATTLE TEST: Q-Ship vs 1 Pirate');
  console.log('═'.repeat(50));
  console.log('3 browsers: GM (top-left), Gunner (top-right), Sensors (bottom)\n');

  let gmBrowser, gunnerBrowser, sensorsBrowser;
  let gmPage, gunnerPage, sensorsPage;

  try {
    // ===========================================
    // Step 1: Launch 3 browsers (tiled)
    // ===========================================
    console.log('--- Step 1: Launching browsers ---');
    console.log('  ┌─────────────┬─────────────┐');
    console.log('  │     GM      │   GUNNER    │');
    console.log('  ├─────────────┴─────────────┤');
    console.log('  │         SENSORS           │');
    console.log('  └───────────────────────────┘');

    // Launch browsers in VISIBLE mode for demo
    // GM - top left (0, 0)
    gmBrowser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--window-size=620,350', '--window-position=0,0']
    });
    gmPage = await gmBrowser.newPage();
    await gmPage.setViewport({ width: 620, height: 350 });
    gmPage.on('dialog', async d => { await d.accept(); });
    console.log('  GM browser launched');
    await delay(500);

    // Gunner - top right
    gunnerBrowser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--window-size=620,350', '--window-position=640,0']
    });
    gunnerPage = await gunnerBrowser.newPage();
    await gunnerPage.setViewport({ width: 620, height: 350 });
    gunnerPage.on('dialog', async d => { console.log(`  [GUNNER] ${d.message().slice(0,30)}...`); await d.accept(); });
    console.log('  Gunner browser launched');
    await delay(500);

    // Sensors - bottom center
    sensorsBrowser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--window-size=620,350', '--window-position=320,380']
    });
    sensorsPage = await sensorsBrowser.newPage();
    await sensorsPage.setViewport({ width: 620, height: 350 });
    sensorsPage.on('dialog', async d => { await d.accept(); });
    console.log('  Sensors browser launched');
    await delay(1000);

    console.log('  >>> ARRANGE WINDOWS NOW IF NEEDED <<<');
    await delay(3000);

    // ===========================================
    // Step 2: GM starts session
    // ===========================================
    console.log('\n--- Step 2: GM starts session ---');
    await navigateToOperations(gmPage);
    const { code } = await gmLogin(gmPage);
    console.log(`  Campaign code: ${code}`);

    if (!code || code === '--------') {
      throw new Error('Failed to get campaign code');
    }

    await startSession(gmPage);
    pass('GM session started');

    // ===========================================
    // Step 3: Players join
    // ===========================================
    console.log('\n--- Step 3: Players join ---');

    const gunnerJoined = await joinAsRole(gunnerPage, code, 'Gunner', 'gunner');
    if (gunnerJoined) pass('Gunner joined'); else fail('Gunner joined', 'Not on bridge');

    const sensorsJoined = await joinAsRole(sensorsPage, code, 'Sensors', 'sensors');
    if (sensorsJoined) pass('Sensors joined'); else fail('Sensors joined', 'Not on bridge');

    // ===========================================
    // Step 4: GM adds pirate contact via socket
    // ===========================================
    console.log('\n--- Step 4: GM adds pirate contact ---');

    // Add contact directly via socket - CLOSE RANGE for easier hits
    const contactAdded = await gmPage.evaluate(() => {
      if (window.state?.socket) {
        window.state.socket.emit('ops:godModeAddContact', {
          campaignId: window.state.campaign?.id,
          contact: {
            name: 'Pirate Corsair',
            type: 'ship',
            range_km: 500,  // Close range - easier to hit
            bearing: 45,
            disposition: 'hostile',
            visible_to: 'all',
            signature: 'strong',  // Easy to target
            is_targetable: true,
            weapons_free: true,  // Armed and dangerous!
            health: 15,  // Weaker hull
            max_health: 15,
            armor: 0,  // No armor
            gunner_skill: 1,
            weapons: [{ name: 'Pulse Laser', damage: '2d6', range: 'short' }]
          }
        });
        return true;
      }
      return false;
    });
    await delay(2000);

    if (contactAdded) pass('Pirate contact added via socket'); else fail('Pirate contact added', 'Socket not available');

    // ===========================================
    // Step 5: Sensors scans contact
    // ===========================================
    console.log('\n--- Step 5: Sensors scans contact ---');

    // Open sensors panel (hotkey 5)
    await sensorsPage.keyboard.press('5');
    await delay(1000);

    // Check if contacts visible
    const contactsVisible = await sensorsPage.evaluate(() => {
      const contacts = document.querySelectorAll('.contact-item, .sensor-contact, [data-contact-id]');
      return contacts.length > 0;
    });

    if (contactsVisible) pass('Contacts visible to Sensors'); else fail('Contacts visible', 'No contacts shown');

    // ===========================================
    // Step 6: BATTLE LOOP - Trade shots until destroyed
    // ===========================================
    console.log('\n--- Step 6: BATTLE LOOP ---');
    console.log('  Trading shots until someone is destroyed...\n');

    let round = 0;
    let battleOver = false;
    const MAX_ROUNDS = 20;

    while (!battleOver && round < MAX_ROUNDS) {
      round++;
      console.log(`  === ROUND ${round} ===`);

      // Get current status
      const status = await gmPage.evaluate(() => {
        const contacts = window.state?.contacts || [];
        const pirate = contacts.find(c => c.name === 'Pirate Corsair' || c.disposition === 'hostile');
        const shipHull = window.state?.ship?.current_state?.hullPoints;
        const shipMaxHull = window.state?.ship?.hull;
        return {
          pirateHealth: pirate?.health,
          pirateMaxHealth: pirate?.max_health,
          pirateName: pirate?.name,
          pirateId: pirate?.id,
          pirateRange: pirate?.range_km,
          shipHull,
          shipMaxHull,
          shipId: window.state?.ship?.id
        };
      });

      console.log(`    Pirate: ${status.pirateHealth}/${status.pirateMaxHealth} HP @ ${status.pirateRange}km`);
      console.log(`    PC Ship: ${status.shipHull}/${status.shipMaxHull} Hull`);

      // Check for victory/defeat
      if (!status.pirateId || status.pirateHealth === undefined || status.pirateHealth <= 0) {
        console.log('\n  🎉 VICTORY! Pirate destroyed!');
        pass('Battle won - pirate destroyed');
        battleOver = true;
        break;
      }
      if (status.shipHull <= 0) {
        console.log('\n  💀 DEFEAT! Ship destroyed!');
        pass('Battle ended - ship destroyed');
        battleOver = true;
        break;
      }

      // Gunner fires at pirate
      const fireResult = await gunnerPage.evaluate((pirateId) => {
        return new Promise((resolve) => {
          if (!window.state?.socket || !pirateId) {
            resolve({ error: 'No socket or pirateId' });
            return;
          }

          // Listen for result or error
          const timeout = setTimeout(() => resolve({ error: 'timeout' }), 1200);

          window.state.socket.once('ops:fireResult', (data) => {
            clearTimeout(timeout);
            resolve({ success: true, hit: data.result?.hit, damage: data.result?.actualDamage });
          });
          window.state.socket.once('ops:error', (data) => {
            clearTimeout(timeout);
            resolve({ error: data.message });
          });

          window.state.socket.emit('ops:fireWeapon', {
            weaponId: null,
            targetId: pirateId
          });
        });
      }, status.pirateId);

      if (fireResult.error) {
        console.log(`    → Gunner fire ERROR: ${fireResult.error}`);
      } else if (fireResult.hit) {
        console.log(`    → Gunner HIT for ${fireResult.damage} damage!`);
      } else {
        console.log(`    → Gunner MISSED`);
      }
      await delay(800);

      // GM fires back as pirate
      const pirateFireResult = await gmPage.evaluate((pirateId, shipId) => {
        return new Promise((resolve) => {
          if (!window.state?.socket || !pirateId || !shipId) {
            resolve({ error: 'No socket/pirate/ship' });
            return;
          }

          const timeout = setTimeout(() => resolve({ error: 'timeout' }), 1200);

          window.state.socket.once('ops:fireAsContactResult', (data) => {
            clearTimeout(timeout);
            const r = data.result || {};
            resolve({ success: true, hit: r.hit, damage: r.actualDamage, shipDamage: r.shipDamage });
          });
          window.state.socket.once('ops:error', (data) => {
            clearTimeout(timeout);
            resolve({ error: data.message });
          });

          window.state.socket.emit('ops:fireAsContact', {
            contactId: pirateId,
            weaponIndex: 0,
            targetShipId: shipId
          });
        });
      }, status.pirateId, status.shipId);

      if (pirateFireResult.error) {
        console.log(`    ← Pirate fire ERROR: ${pirateFireResult.error}`);
      } else if (pirateFireResult.hit) {
        console.log(`    ← Pirate HIT ship for ${pirateFireResult.damage} damage!`);
      } else {
        console.log(`    ← Pirate MISSED`);
      }
      await delay(800);
    }

    if (round >= MAX_ROUNDS) {
      console.log(`\n  ⏱ Battle timeout after ${MAX_ROUNDS} rounds`);
      fail('Battle completion', 'Max rounds reached');
    }

    // ===========================================
    // Step 7: Final Battle Status
    // ===========================================
    console.log('\n--- Step 7: Final Battle Status ---');

    const finalStatus = await gmPage.evaluate(() => {
      const contacts = window.state?.contacts || [];
      const pirate = contacts.find(c => c.name === 'Pirate Corsair' || c.disposition === 'hostile');
      return {
        pirateHealth: pirate?.health ?? 'destroyed',
        shipHull: window.state?.ship?.current_state?.hullPoints ?? 'destroyed'
      };
    });

    console.log(`  Final Pirate HP: ${finalStatus.pirateHealth}`);
    console.log(`  Final Ship Hull: ${finalStatus.shipHull}`);
    console.log(`  Rounds fought: ${round}`);

    // Hold to observe
    console.log('\n--- Holding for observation (5 sec) ---');
    await delay(5000);

  } catch (err) {
    console.error('\n✗ TEST ERROR:', err.message);
    RESULTS.errors.push(err.message);
    RESULTS.failed++;
  }

  // ===========================================
  // Summary
  // ===========================================
  console.log('\n' + '═'.repeat(50));
  console.log('RESULTS');
  console.log('═'.repeat(50));
  console.log(`Passed: ${RESULTS.passed}`);
  console.log(`Failed: ${RESULTS.failed}`);

  if (RESULTS.errors.length > 0) {
    console.log('\nErrors:');
    RESULTS.errors.forEach(e => console.log(`  - ${e}`));
  }

  // Cleanup
  console.log('\nClosing browsers...');
  if (gmBrowser) await gmBrowser.close();
  if (gunnerBrowser) await gunnerBrowser.close();
  if (sensorsBrowser) await sensorsBrowser.close();

  process.exit(RESULTS.failed > 0 ? 1 : 0);
})();
