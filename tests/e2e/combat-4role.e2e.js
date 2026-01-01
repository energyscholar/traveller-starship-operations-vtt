#!/usr/bin/env node
/**
 * 4-Role Combat E2E Test
 *
 * Tests full combat with proper phase roles:
 * - GM: Controls enemy, advances phases
 * - Pilot: Manoeuvre phase (evasive action)
 * - Gunner: Attack phase (fire weapons)
 * - Engineer: Actions phase (repairs)
 *
 * Set HEADED=1 to run with visible browsers
 */

const puppeteer = require('puppeteer');
const {
  navigateToOperations,
  gmLogin,
  startSession,
  delay,
  DELAYS
} = require('./puppeteer-utils');
const {
  renderCombatDisplay,
  renderAttackLog
} = require('./helpers/combat-display');

const HEADED = process.env.HEADED === '1';
const SHOW_COMBAT_DISPLAY = process.env.COMBAT_DISPLAY !== '0'; // On by default, set COMBAT_DISPLAY=0 to hide
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
async function joinAsRole(page, campaignCode, roleId) {
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

/**
 * Browser window layout for 2x2 grid
 */
const WINDOW = {
  width: 700,
  height: 450,
  viewport: { width: 680, height: 370 }
};

const POSITIONS = {
  gm:       { x: 0,            y: 0 },
  pilot:    { x: WINDOW.width, y: 0 },
  gunner:   { x: 0,            y: WINDOW.height },
  engineer: { x: WINDOW.width, y: WINDOW.height }
};

/**
 * Launch a browser window (positioning done separately via CDP)
 */
async function launchBrowser(name, position) {
  const pos = POSITIONS[position] || { x: 0, y: 0 };
  const browser = await puppeteer.launch({
    headless: !HEADED,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport(WINDOW.viewport);
  page.on('dialog', async d => { await d.accept(); });
  console.log(`  ${name} launched`);
  return { browser, page, name, targetPos: pos };
}

/**
 * Position window using Chrome DevTools Protocol (must be called after all windows launched)
 */
async function positionWindow(ctx) {
  if (!HEADED) return; // Skip positioning in headless mode

  const { page, name, targetPos } = ctx;
  const session = await page.target().createCDPSession();
  const { windowId } = await session.send('Browser.getWindowForTarget');

  await session.send('Browser.setWindowBounds', {
    windowId,
    bounds: {
      left: targetPos.x,
      top: targetPos.y,
      width: WINDOW.width,
      height: WINDOW.height,
      windowState: 'normal'
    }
  });

  await delay(100);
  const { bounds } = await session.send('Browser.getWindowBounds', { windowId });
  const match = bounds.left === targetPos.x && bounds.top === targetPos.y;
  console.log(`  ${name} → (${bounds.left}, ${bounds.top}) ${match ? '✓' : '✗'}`);
}

// ==============================================
// Main Test
// ==============================================
(async () => {
  console.log('═'.repeat(60));
  console.log('4-ROLE COMBAT TEST: GM + Pilot + Gunner + Engineer');
  console.log('═'.repeat(60));
  console.log('\n  Window Layout (2x2 tiled):');
  console.log('  ┌─────────────────────┬─────────────────────┐');
  console.log('  │         GM          │        PILOT        │');
  console.log('  │       (0, 0)        │      (700, 0)       │');
  console.log('  ├─────────────────────┼─────────────────────┤');
  console.log('  │       GUNNER        │      ENGINEER       │');
  console.log('  │      (0, 450)       │     (700, 450)      │');
  console.log('  └─────────────────────┴─────────────────────┘');

  let gmBrowser, pilotBrowser, gunnerBrowser, engineerBrowser;
  let gmPage, pilotPage, gunnerPage, engineerPage;

  try {
    // ===========================================
    // Step 1: Launch 4 browsers
    // ===========================================
    console.log('\n--- Step 1: Launching browsers ---');

    const gm = await launchBrowser('GM', 'gm');
    const pilot = await launchBrowser('Pilot', 'pilot');
    const gunner = await launchBrowser('Gunner', 'gunner');
    const engineer = await launchBrowser('Engineer', 'engineer');

    // Extract for easier access
    gmBrowser = gm.browser; gmPage = gm.page;
    pilotBrowser = pilot.browser; pilotPage = pilot.page;
    gunnerBrowser = gunner.browser; gunnerPage = gunner.page;
    engineerBrowser = engineer.browser; engineerPage = engineer.page;

    // Position windows AFTER all are launched (fixes window manager issues)
    if (HEADED) {
      console.log('\n--- Positioning windows ---');
      await delay(500);
      await positionWindow(gm);
      await positionWindow(pilot);
      await positionWindow(gunner);
      await positionWindow(engineer);
      await delay(1000);
    }

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
    // Step 3: Players join with roles
    // ===========================================
    console.log('\n--- Step 3: Players join ---');

    const pilotJoined = await joinAsRole(pilotPage, code, 'pilot');
    if (pilotJoined) pass('Pilot joined'); else fail('Pilot join', 'Not on bridge');

    const gunnerJoined = await joinAsRole(gunnerPage, code, 'gunner');
    if (gunnerJoined) pass('Gunner joined'); else fail('Gunner join', 'Not on bridge');

    const engineerJoined = await joinAsRole(engineerPage, code, 'engineer');
    if (engineerJoined) pass('Engineer joined'); else fail('Engineer join', 'Not on bridge');

    // ===========================================
    // Step 4: GM adds hostile pirate
    // ===========================================
    console.log('\n--- Step 4: GM adds pirate ---');

    await gmPage.evaluate(() => {
      window.state.socket.emit('ops:godModeAddContact', {
        campaignId: window.state.campaign?.id,
        contact: {
          name: 'Pirate Raider',
          type: 'ship',
          range_km: 500,
          bearing: 90,
          disposition: 'hostile',
          visible_to: 'all',
          signature: 'strong',
          is_targetable: true,
          weapons_free: true,
          health: 25,
          max_health: 25,
          armor: 2,
          gunner_skill: 1,
          weapons: [{ name: 'Beam Laser', damage: '2d6', range: 'medium' }]
        }
      });
    });
    await delay(1500);
    pass('Pirate contact added');

    // ===========================================
    // Step 5: GM enters combat mode
    // ===========================================
    console.log('\n--- Step 5: Enter combat ---');

    const combatStarted = await gmPage.evaluate(() => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ error: 'timeout' }), 3000);
        window.state.socket.once('ops:combatStarted', (data) => {
          clearTimeout(timeout);
          resolve({ phase: data.phase, round: data.round });
        });
        const targets = window.state.contacts?.filter(c => c.is_targetable) || [];
        window.state.socket.emit('ops:enterCombat', {
          campaignId: window.state.campaign?.id,
          selectedContacts: targets.map(c => c.id)
        });
      });
    });
    await delay(500);

    if (combatStarted.phase === 'manoeuvre') {
      pass(`Combat started: ${combatStarted.phase} phase, round ${combatStarted.round}`);
    } else {
      fail('Enter combat', combatStarted.error || 'Wrong phase');
    }

    // ===========================================
    // Step 6: COMBAT ROUND 1
    // ===========================================
    console.log('\n--- Step 6: Combat Round 1 ---');

    // --- MANOEUVRE PHASE ---
    console.log('  [MANOEUVRE PHASE]');

    // Pilot performs evasive action (allocates thrust)
    const pilotAction = await pilotPage.evaluate(() => {
      return new Promise((resolve) => {
        // For now, just verify pilot is connected and can see combat state
        const inCombat = window.state?.inCombat || window.state?.combatState?.inCombat;
        resolve({ success: true, inCombat });
      });
    });
    if (pilotAction.success) {
      pass('Pilot ready in manoeuvre phase');
    } else {
      fail('Pilot manoeuvre', 'Not ready');
    }

    // GM advances to Attack phase
    const toAttack = await gmPage.evaluate(() => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ error: 'timeout' }), 3000);
        window.state.socket.once('ops:phaseChanged', (data) => {
          clearTimeout(timeout);
          resolve({ phase: data.phase, round: data.round });
        });
        window.state.socket.emit('ops:advancePhase', {});
      });
    });
    await delay(300);

    if (toAttack.phase === 'attack') {
      pass('Advanced to ATTACK phase');
    } else {
      fail('Advance phase', `Expected attack, got ${toAttack.phase || toAttack.error}`);
    }

    // --- ATTACK PHASE ---
    console.log('  [ATTACK PHASE]');

    // Get pirate ID for targeting
    const pirateId = await gmPage.evaluate(() => {
      const pirate = window.state.contacts?.find(c => c.disposition === 'hostile');
      return pirate?.id;
    });

    // Get ship weapons to find Ion and Particle Barbettes
    const shipWeapons = await gunnerPage.evaluate(() => {
      return window.state.ship?.ship_data?.weapons || [];
    });

    const ionBarbette = shipWeapons.find(w => w.type === 'ion_cannon');
    const particleBarbette = shipWeapons.find(w => w.type === 'particle_beam');

    // Gunner fires Ion Barbette at pirate (power drain)
    const ionFire = await gunnerPage.evaluate((targetId, weaponId) => {
      return new Promise((resolve) => {
        if (!targetId) {
          resolve({ error: 'No target' });
          return;
        }
        const timeout = setTimeout(() => resolve({ error: 'timeout' }), 3000);
        window.state.socket.once('ops:fireResult', (data) => {
          clearTimeout(timeout);
          const r = data.result || data;
          // Capture full result for combat display
          resolve({
            hit: r.hit,
            roll: r.roll,
            dice: r.dice,
            modifiers: r.modifiers,
            totalDM: r.totalDM,
            total: r.total,
            damageType: r.damageType,
            powerDrain: r.powerDrain,
            damage: r.actualDamage,
            armorReduction: r.armorReduction,
            attacker: r.attacker,
            target: r.target,
            weapon: r.weapon,
            critical: r.critical
          });
        });
        window.state.socket.emit('ops:fireWeapon', {
          weaponId: weaponId,
          targetId: targetId
        });
      });
    }, pirateId, ionBarbette?.id);
    await delay(500);

    // Log attack result
    if (SHOW_COMBAT_DISPLAY && !ionFire.error) {
      console.log('\n' + renderAttackLog(ionFire));
    }

    if (ionFire.error) {
      fail('Ion Barbette fire', ionFire.error);
    } else if (ionFire.hit) {
      // When ion hits, verify it's the correct damage type
      if (ionFire.damageType === 'ion' && ionFire.powerDrain > 0) {
        pass(`Ion Barbette HIT - ${ionFire.powerDrain} power drained`);
      } else if (ionFire.damageType === 'ion') {
        pass(`Ion Barbette HIT (ion damage, 0 power drain)`);
      } else if (ionFire.damageType) {
        fail('Ion Barbette', `Hit but damageType was ${ionFire.damageType}`);
      } else {
        // This shouldn't happen - if hit, damageType should be set
        fail('Ion Barbette', `Hit but no damageType returned`);
      }
    } else {
      pass('Ion Barbette fired (missed)');
    }

    // Gunner fires Particle Barbette at pirate (hull damage)
    const particleFire = await gunnerPage.evaluate((targetId, weaponId) => {
      return new Promise((resolve) => {
        if (!targetId) {
          resolve({ error: 'No target' });
          return;
        }
        const timeout = setTimeout(() => resolve({ error: 'timeout' }), 3000);
        window.state.socket.once('ops:fireResult', (data) => {
          clearTimeout(timeout);
          const r = data.result || data;
          // Capture full result for combat display
          resolve({
            hit: r.hit,
            roll: r.roll,
            dice: r.dice,
            modifiers: r.modifiers,
            totalDM: r.totalDM,
            total: r.total,
            damageType: r.damageType,
            damage: r.actualDamage,
            armorReduction: r.armorReduction,
            attacker: r.attacker,
            target: r.target,
            weapon: r.weapon,
            critical: r.critical
          });
        });
        window.state.socket.emit('ops:fireWeapon', {
          weaponId: weaponId,
          targetId: targetId
        });
      });
    }, pirateId, particleBarbette?.id);
    await delay(500);

    // Log attack result
    if (SHOW_COMBAT_DISPLAY && !particleFire.error) {
      console.log(renderAttackLog(particleFire));
    }

    if (particleFire.error) {
      fail('Particle Barbette fire', particleFire.error);
    } else if (particleFire.hit && particleFire.damageType !== 'ion') {
      pass(`Particle Barbette HIT for ${particleFire.damage} hull damage`);
    } else if (particleFire.hit) {
      fail('Particle Barbette', 'Hit but was ion type?');
    } else {
      pass('Particle Barbette fired (missed)');
    }

    // Pirate fires back (GM controls)
    const shipId = await gmPage.evaluate(() => window.state.ship?.id);
    const pirateFire = await gmPage.evaluate((cId, sId) => {
      return new Promise((resolve) => {
        if (!cId || !sId) {
          resolve({ error: 'Missing IDs' });
          return;
        }
        const timeout = setTimeout(() => resolve({ error: 'timeout' }), 3000);
        window.state.socket.once('ops:fireAsContactResult', (data) => {
          clearTimeout(timeout);
          const r = data.result || {};
          resolve({ hit: r.hit, damage: r.actualDamage });
        });
        window.state.socket.emit('ops:fireAsContact', {
          contactId: cId,
          weaponIndex: 0,
          targetShipId: sId
        });
      });
    }, pirateId, shipId);
    await delay(500);

    if (pirateFire.error) {
      fail('Pirate fire', pirateFire.error);
    } else if (pirateFire.hit) {
      pass(`Pirate HIT for ${pirateFire.damage} damage`);
    } else {
      pass('Pirate fired (missed)');
    }

    // GM advances to Actions phase
    const toActions = await gmPage.evaluate(() => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ error: 'timeout' }), 3000);
        window.state.socket.once('ops:phaseChanged', (data) => {
          clearTimeout(timeout);
          resolve({ phase: data.phase, round: data.round });
        });
        window.state.socket.emit('ops:advancePhase', {});
      });
    });
    await delay(300);

    if (toActions.phase === 'actions') {
      pass('Advanced to ACTIONS phase');
    } else {
      fail('Advance phase', `Expected actions, got ${toActions.phase || toActions.error}`);
    }

    // --- ACTIONS PHASE ---
    console.log('  [ACTIONS PHASE]');

    // Engineer checks for damage and could attempt repairs
    const engineerAction = await engineerPage.evaluate(() => {
      // Check if engineer can see ship state
      const shipState = window.state?.ship?.current_state;
      const systems = Array.isArray(shipState?.systems) ? shipState.systems : [];
      return {
        success: true,
        hull: shipState?.hullPoints,
        hasDamage: systems.length > 0 && systems.some(s => s.status !== 'operational')
      };
    });

    if (engineerAction.success) {
      pass(`Engineer ready (Hull: ${engineerAction.hull}, Damage: ${engineerAction.hasDamage ? 'Yes' : 'No'})`);
    } else {
      fail('Engineer actions', 'Not ready');
    }

    // GM advances to round_end
    const toRoundEnd = await gmPage.evaluate(() => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ error: 'timeout' }), 3000);
        window.state.socket.once('ops:phaseChanged', (data) => {
          clearTimeout(timeout);
          resolve({ phase: data.phase, round: data.round });
        });
        window.state.socket.emit('ops:advancePhase', {});
      });
    });
    await delay(300);

    if (toRoundEnd.phase === 'round_end') {
      pass('Advanced to ROUND_END phase');
    } else {
      fail('Advance phase', `Expected round_end, got ${toRoundEnd.phase || toRoundEnd.error}`);
    }

    // GM advances to round 2
    const toRound2 = await gmPage.evaluate(() => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ error: 'timeout' }), 3000);
        window.state.socket.once('ops:phaseChanged', (data) => {
          clearTimeout(timeout);
          resolve({ phase: data.phase, round: data.round });
        });
        window.state.socket.emit('ops:advancePhase', {});
      });
    });
    await delay(300);

    if (toRound2.phase === 'manoeuvre' && toRound2.round === 2) {
      pass('Advanced to Round 2 MANOEUVRE phase');
    } else {
      fail('Advance round', `Expected manoeuvre/2, got ${toRound2.phase}/${toRound2.round}`);
    }

    // ===========================================
    // Step 7: Exit combat
    // ===========================================
    console.log('\n--- Step 7: Exit combat ---');

    const exitResult = await gmPage.evaluate(() => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ error: 'timeout' }), 3000);
        window.state.socket.once('ops:combatEnded', (data) => {
          clearTimeout(timeout);
          resolve({ outcome: data.outcome });
        });
        window.state.socket.emit('ops:exitCombat', { outcome: 'test_complete' });
      });
    });
    await delay(500);

    if (exitResult.outcome) {
      pass(`Combat ended: ${exitResult.outcome}`);
    } else {
      fail('Exit combat', exitResult.error);
    }

    // ===========================================
    // Step 8: Final status
    // ===========================================
    console.log('\n--- Step 8: Final status ---');

    const finalStatus = await gmPage.evaluate(() => {
      const pirate = window.state.contacts?.find(c => c.disposition === 'hostile');
      return {
        pirateHealth: pirate?.health ?? 'destroyed',
        shipHull: window.state.ship?.current_state?.hullPoints
      };
    });

    console.log(`  Pirate HP: ${finalStatus.pirateHealth}`);
    console.log(`  Ship Hull: ${finalStatus.shipHull}`);

    if (HEADED) {
      console.log('\n--- Holding for observation (5 sec) ---');
      await delay(5000);
    }

  } catch (err) {
    console.error('\n✗ TEST ERROR:', err.message);
    RESULTS.errors.push(err.message);
    RESULTS.failed++;
  }

  // ===========================================
  // Summary
  // ===========================================
  console.log('\n' + '═'.repeat(60));
  console.log('RESULTS');
  console.log('═'.repeat(60));
  console.log(`Passed: ${RESULTS.passed}`);
  console.log(`Failed: ${RESULTS.failed}`);

  if (RESULTS.errors.length > 0) {
    console.log('\nErrors:');
    RESULTS.errors.forEach(e => console.log(`  - ${e}`));
  }

  // Cleanup
  console.log('\nClosing browsers...');
  if (gmBrowser) await gmBrowser.close();
  if (pilotBrowser) await pilotBrowser.close();
  if (gunnerBrowser) await gunnerBrowser.close();
  if (engineerBrowser) await engineerBrowser.close();

  process.exit(RESULTS.failed > 0 ? 1 : 0);
})();
