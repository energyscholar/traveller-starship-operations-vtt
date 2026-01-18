#!/usr/bin/env node
/**
 * AR-XX: Whisper Message E2E Test
 * Tests that whispers are only visible to sender + recipient
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = '/tmp/claude/-home-bruce-software-traveller-starship-operations-vtt/9bea24c4-8723-46e1-888d-c97b8abf0330/scratchpad/chat-whisper';
const BASE_URL = 'http://localhost:3000/operations/';

const sleep = ms => new Promise(r => setTimeout(r, ms));

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function clickButtonWithText(page, text) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const btnText = await btn.evaluate(el => el.textContent);
    if (btnText && btnText.includes(text)) {
      try { await btn.click(); return true; } catch (e) {}
    }
  }
  return false;
}

async function setupPlayer(browser, role) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await clickButtonWithText(page, 'Solo Demo');
  await sleep(2000);

  const roleOption = await page.$(`.role-option[data-role-id="${role}"]`);
  if (roleOption) await roleOption.click();
  await sleep(1000);

  await clickButtonWithText(page, 'Join Bridge');
  await sleep(2000);

  // Expand chat
  await page.click('.chat-drawer-header');
  await sleep(500);

  return page;
}

async function getChatMessages(page) {
  return page.evaluate(() => {
    const c = document.getElementById('chat-messages');
    return c ? Array.from(c.querySelectorAll('.chat-message')).map(m => m.textContent.trim()) : [];
  });
}

async function sendMessage(page, message) {
  await page.type('#chat-input', message);
  await page.click('#chat-send-btn');
  await sleep(500);
}

async function getRecipientOptions(page) {
  return page.evaluate(() => {
    const select = document.getElementById('chat-recipient-select');
    return select ? Array.from(select.options).map(o => ({ value: o.value, text: o.text })) : [];
  });
}

async function run() {
  console.log('=== Whisper Message E2E Test ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  let passed = 0, failed = 0;
  function test(name, success, details = '') {
    if (success) {
      console.log(`   PASS: ${name}`);
      passed++;
    } else {
      console.log(`   FAIL: ${name} ${details}`);
      failed++;
    }
  }

  try {
    // === Setup 3 players ===
    console.log('Phase 1: Setting up players...');
    const pilot = await setupPlayer(browser, 'pilot');
    const engineer = await setupPlayer(browser, 'engineer');
    const gunner = await setupPlayer(browser, 'gunner');

    console.log('   All players ready');
    await pilot.screenshot({ path: path.join(SCREENSHOT_DIR, '01-pilot.png') });

    // === Check recipient dropdown ===
    console.log('\nPhase 2: Checking recipient dropdown...');
    await sleep(1000); // Wait for player list

    const recipients = await getRecipientOptions(pilot);
    console.log(`   Pilot sees ${recipients.length} recipient options:`, recipients.map(r => r.text).join(', '));

    test('Recipient dropdown has All Players', recipients.some(r => r.text === 'All Players'));
    test('Recipient dropdown has other players', recipients.length > 1);

    // === Send broadcast first ===
    console.log('\nPhase 3: Sending broadcast message...');
    await sendMessage(pilot, 'Broadcast from Pilot');
    await sleep(1000);

    const pilotMsgs1 = await getChatMessages(pilot);
    const engineerMsgs1 = await getChatMessages(engineer);
    const gunnerMsgs1 = await getChatMessages(gunner);

    test('Pilot sees broadcast', pilotMsgs1.some(m => m.includes('Broadcast from Pilot')));
    test('Engineer sees broadcast', engineerMsgs1.some(m => m.includes('Broadcast from Pilot')));
    test('Gunner sees broadcast', gunnerMsgs1.some(m => m.includes('Broadcast from Pilot')));

    // === Send whisper to Engineer only ===
    console.log('\nPhase 4: Sending whisper to Engineer...');

    // Find engineer in dropdown (might be by name or role)
    const engineerOption = recipients.find(r =>
      r.text.toLowerCase().includes('engineer') ||
      r.text.toLowerCase().includes('alex') ||  // Solo demo player name
      (r.value && r.value !== '')
    );

    if (engineerOption && engineerOption.value) {
      // Select engineer as recipient
      await pilot.select('#chat-recipient-select', engineerOption.value);
      await sleep(300);

      await sendMessage(pilot, 'SECRET: This is a whisper to Engineer');
      await sleep(1000);

      await pilot.screenshot({ path: path.join(SCREENSHOT_DIR, '02-pilot-whisper-sent.png') });
      await engineer.screenshot({ path: path.join(SCREENSHOT_DIR, '03-engineer-whisper-received.png') });
      await gunner.screenshot({ path: path.join(SCREENSHOT_DIR, '04-gunner-no-whisper.png') });

      const pilotMsgs2 = await getChatMessages(pilot);
      const engineerMsgs2 = await getChatMessages(engineer);
      const gunnerMsgs2 = await getChatMessages(gunner);

      console.log(`   Pilot messages: ${pilotMsgs2.length}`);
      console.log(`   Engineer messages: ${engineerMsgs2.length}`);
      console.log(`   Gunner messages: ${gunnerMsgs2.length}`);

      // Log actual messages for debugging
      console.log('   Pilot sees:');
      pilotMsgs2.forEach(m => console.log(`     "${m}"`));

      const whisperText = 'SECRET: This is a whisper to Engineer';
      const pilotSeesWhisper = pilotMsgs2.some(m => m.includes('SECRET'));
      const engineerSeesWhisper = engineerMsgs2.some(m => m.includes('SECRET'));
      const gunnerSeesWhisper = gunnerMsgs2.some(m => m.includes('SECRET'));

      test('Sender (Pilot) sees whisper', pilotSeesWhisper);
      test('Recipient (Engineer) sees whisper', engineerSeesWhisper);
      test('Non-recipient (Gunner) does NOT see whisper', !gunnerSeesWhisper);

      // Check whisper styling
      const hasWhisperStyling = pilotMsgs2.some(m => m.includes('→') || m.includes('whisper'));
      console.log(`   Whisper styling detected: ${hasWhisperStyling}`);

    } else {
      console.log('   WARNING: Could not find Engineer in recipient dropdown');
      console.log('   Recipients:', recipients);
      failed += 3;
    }

    // === Reset to All Players and send another broadcast ===
    console.log('\nPhase 5: Reset to broadcast...');
    await pilot.select('#chat-recipient-select', '');
    await sleep(300);

    await sendMessage(pilot, 'Back to broadcast mode');
    await sleep(1000);

    const gunnerMsgs3 = await getChatMessages(gunner);
    test('Gunner sees new broadcast', gunnerMsgs3.some(m => m.includes('Back to broadcast mode')));

    // === Summary ===
    console.log('\n=== Test Summary ===');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Screenshots: ${SCREENSHOT_DIR}`);

    return { passed, failed };

  } catch (err) {
    console.error('\nERROR:', err.message);
    return { passed, failed: failed + 1, error: err.message };
  } finally {
    await browser.close();
  }
}

run().then(result => {
  console.log('\n=== Final Result ===');
  if (result.failed === 0) {
    console.log('ALL TESTS PASSED!');
  } else {
    console.log(`${result.failed} tests failed`);
  }
  process.exit(result.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
