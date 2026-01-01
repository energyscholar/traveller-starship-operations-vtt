#!/usr/bin/env node
/**
 * Combat Phases E2E Test
 *
 * Tests the combat phase system:
 * - GM enters combat mode
 * - Phase cycling: manoeuvre → attack → actions → round_end
 * - Round increment after round_end
 * - GM exits combat mode
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

// ==============================================
// Main Test
// ==============================================
(async () => {
  console.log('═'.repeat(50));
  console.log('COMBAT PHASES TEST');
  console.log('═'.repeat(50));

  let browser, page;

  try {
    // ===========================================
    // Step 1: Launch browser and start session
    // ===========================================
    console.log('\n--- Step 1: Setup ---');

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });
    page = await browser.newPage();
    page.on('dialog', async d => { await d.accept(); });

    await navigateToOperations(page);
    const { code } = await gmLogin(page);
    console.log(`  Campaign code: ${code}`);

    if (!code || code === '--------') {
      throw new Error('Failed to get campaign code');
    }

    await startSession(page);
    pass('GM session started');

    // ===========================================
    // Step 2: Add a hostile contact
    // ===========================================
    console.log('\n--- Step 2: Add hostile contact ---');

    const contactAdded = await page.evaluate(() => {
      if (window.state?.socket) {
        window.state.socket.emit('ops:godModeAddContact', {
          campaignId: window.state.campaign?.id,
          contact: {
            name: 'Test Pirate',
            type: 'ship',
            range_km: 500,
            bearing: 45,
            disposition: 'hostile',
            visible_to: 'all',
            signature: 'strong',
            is_targetable: true,
            weapons_free: true,
            health: 20,
            max_health: 20,
            armor: 0,
            gunner_skill: 1,
            weapons: [{ name: 'Pulse Laser', damage: '2d6', range: 'short' }]
          }
        });
        return true;
      }
      return false;
    });
    await delay(1000);

    if (contactAdded) pass('Hostile contact added'); else fail('Add contact', 'Socket not available');

    // ===========================================
    // Step 3: Enter combat mode
    // ===========================================
    console.log('\n--- Step 3: Enter combat mode ---');

    const combatStarted = await page.evaluate(() => {
      return new Promise((resolve) => {
        if (!window.state?.socket) {
          resolve({ error: 'No socket' });
          return;
        }

        const timeout = setTimeout(() => resolve({ error: 'timeout' }), 3000);

        window.state.socket.once('ops:combatStarted', (data) => {
          clearTimeout(timeout);
          resolve({
            success: true,
            phase: data.phase,
            round: data.round,
            inCombat: data.inCombat
          });
        });

        const targetable = window.state.contacts?.filter(c => c.is_targetable) || [];
        window.state.socket.emit('ops:enterCombat', {
          campaignId: window.state.campaign?.id,
          selectedContacts: targetable.map(c => c.id)
        });
      });
    });
    await delay(500);

    if (combatStarted.error) {
      fail('Enter combat', combatStarted.error);
    } else {
      if (combatStarted.phase === 'manoeuvre' && combatStarted.round === 1) {
        pass('Combat started at manoeuvre phase, round 1');
      } else {
        fail('Combat started', `Expected manoeuvre/1, got ${combatStarted.phase}/${combatStarted.round}`);
      }
    }

    // ===========================================
    // Step 4: Cycle through phases
    // ===========================================
    console.log('\n--- Step 4: Phase cycling ---');

    const expectedPhases = [
      { phase: 'attack', round: 1 },
      { phase: 'actions', round: 1 },
      { phase: 'round_end', round: 1 },
      { phase: 'manoeuvre', round: 2 }  // New round!
    ];

    for (const expected of expectedPhases) {
      const phaseResult = await page.evaluate(() => {
        return new Promise((resolve) => {
          if (!window.state?.socket) {
            resolve({ error: 'No socket' });
            return;
          }

          const timeout = setTimeout(() => resolve({ error: 'timeout' }), 3000);

          window.state.socket.once('ops:phaseChanged', (data) => {
            clearTimeout(timeout);
            resolve({
              success: true,
              phase: data.phase,
              round: data.round
            });
          });

          window.state.socket.emit('ops:advancePhase', {
            campaignId: window.state.campaign?.id
          });
        });
      });
      await delay(300);

      if (phaseResult.error) {
        fail(`Advance to ${expected.phase}`, phaseResult.error);
      } else if (phaseResult.phase === expected.phase && phaseResult.round === expected.round) {
        pass(`Phase: ${expected.phase} (round ${expected.round})`);
      } else {
        fail(`Advance to ${expected.phase}`, `Got ${phaseResult.phase}/${phaseResult.round}`);
      }
    }

    // ===========================================
    // Step 5: Exit combat mode
    // ===========================================
    console.log('\n--- Step 5: Exit combat mode ---');

    const combatEnded = await page.evaluate(() => {
      return new Promise((resolve) => {
        if (!window.state?.socket) {
          resolve({ error: 'No socket' });
          return;
        }

        const timeout = setTimeout(() => resolve({ error: 'timeout' }), 3000);

        window.state.socket.once('ops:combatEnded', (data) => {
          clearTimeout(timeout);
          resolve({ success: true, outcome: data.outcome });
        });

        window.state.socket.emit('ops:exitCombat', {
          campaignId: window.state.campaign?.id,
          outcome: 'test_complete'
        });
      });
    });
    await delay(500);

    if (combatEnded.error) {
      fail('Exit combat', combatEnded.error);
    } else {
      pass(`Combat ended: ${combatEnded.outcome}`);
    }

    // ===========================================
    // Step 6: Verify state after combat
    // ===========================================
    console.log('\n--- Step 6: Verify final state ---');

    const finalState = await page.evaluate(() => ({
      inCombat: window.state?.inCombat,
      combatPhase: window.state?.combatPhase,
      combatRound: window.state?.combatRound
    }));

    if (!finalState.inCombat) {
      pass('State shows not in combat');
    } else {
      fail('Final state', 'Still shows in combat');
    }

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
  console.log('\nClosing browser...');
  if (browser) await browser.close();

  process.exit(RESULTS.failed > 0 ? 1 : 0);
})();
