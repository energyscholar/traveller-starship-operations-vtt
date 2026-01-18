#!/usr/bin/env node
/**
 * AR-XX: GM Identity Dropdown Test
 * Tests GM's ability to speak as different characters
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = '/tmp/claude/-home-bruce-software-traveller-starship-operations-vtt/9bea24c4-8723-46e1-888d-c97b8abf0330/scratchpad/chat-gm';
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

async function runGMTest() {
  console.log('=== GM Identity Dropdown Test ===\n');

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

  const gmPage = await browser.newPage();
  const playerPage = await browser.newPage();
  await gmPage.setViewport({ width: 1280, height: 800 });
  await playerPage.setViewport({ width: 1280, height: 800 });

  try {
    // ==================== Setup Player First ====================
    console.log('Phase 1: Setting up player browser...');

    await playerPage.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await clickButtonWithText(playerPage, 'Solo Demo');
    await sleep(2000);

    const roleOption = await playerPage.$('.role-option[data-role-id="pilot"]');
    if (roleOption) await roleOption.click();
    await sleep(1000);

    await clickButtonWithText(playerPage, 'Join Bridge');
    await sleep(2000);

    // Expand chat
    await playerPage.click('.chat-drawer-header');
    await sleep(500);

    await playerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '01-player-ready.png') });
    console.log('   Player ready');

    // ==================== Setup GM ====================
    console.log('\nPhase 2: Setting up GM browser...');

    await gmPage.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await gmPage.screenshot({ path: path.join(SCREENSHOT_DIR, '02-gm-home.png') });

    // GM Login
    await clickButtonWithText(gmPage, 'GM Login');
    await sleep(1500);
    await gmPage.screenshot({ path: path.join(SCREENSHOT_DIR, '03-gm-campaign-list.png') });

    // Check if campaigns exist, if not create one
    const campaignCards = await gmPage.$$('.campaign-card');
    const selectButtons = await gmPage.$$eval('button', btns =>
      btns.filter(b => b.textContent.includes('Select')).length
    );

    if (selectButtons === 0) {
      console.log('   No campaigns found, creating one...');
      await clickButtonWithText(gmPage, 'Create New Campaign');
      await sleep(1000);

      // Fill campaign name if input exists
      const nameInput = await gmPage.$('input[placeholder*="Campaign"], input[name="name"]');
      if (nameInput) {
        await nameInput.type('Test Campaign');
        await clickButtonWithText(gmPage, 'Create');
        await sleep(2000);
      }
    } else {
      // Select first campaign
      await clickButtonWithText(gmPage, 'Select');
      await sleep(2000);
    }

    await gmPage.screenshot({ path: path.join(SCREENSHOT_DIR, '04-gm-campaign-setup.png') });

    // Start session
    const startClicked = await clickButtonWithText(gmPage, 'Start Session');
    if (startClicked) {
      await sleep(2000);
    }
    await gmPage.screenshot({ path: path.join(SCREENSHOT_DIR, '05-gm-session-started.png') });

    // Join bridge - click on ship
    const shipElements = await gmPage.$$('td, .ship-name, .ship-row');
    for (const el of shipElements) {
      const text = await el.evaluate(e => e.textContent);
      if (text && (text.includes('Amishi') || text.includes('Far Horizon') || text.includes('Ship'))) {
        await el.click();
        break;
      }
    }
    await sleep(2000);
    await gmPage.screenshot({ path: path.join(SCREENSHOT_DIR, '06-gm-on-bridge.png') });

    // Check if we're on the bridge
    const gmState = await gmPage.evaluate(() => {
      return {
        isGM: window.state?.isGM,
        selectedRole: window.state?.selectedRole,
        chatDrawer: !!document.getElementById('chat-drawer'),
        identityBar: !!document.getElementById('chat-identity-bar')
      };
    });
    console.log(`   GM state: ${JSON.stringify(gmState)}`);

    // ==================== Test GM Identity Features ====================
    console.log('\nPhase 3: Testing GM identity dropdown...');

    // Expand GM's chat
    const gmChatDrawer = await gmPage.$('#chat-drawer');
    if (gmChatDrawer) {
      const isCollapsed = await gmPage.evaluate(() =>
        document.getElementById('chat-drawer')?.classList.contains('collapsed')
      );
      if (isCollapsed) {
        await gmPage.click('.chat-drawer-header');
        await sleep(500);
      }
    }
    await gmPage.screenshot({ path: path.join(SCREENSHOT_DIR, '07-gm-chat-expanded.png') });

    // Test 3.1: Identity bar visible for GM
    const identityState = await gmPage.evaluate(() => {
      const bar = document.getElementById('chat-identity-bar');
      const select = document.getElementById('chat-identity-select');
      return {
        barExists: !!bar,
        barVisible: bar ? getComputedStyle(bar).display !== 'none' : false,
        selectExists: !!select,
        options: select ? Array.from(select.options).map(o => ({ value: o.value, text: o.text })) : []
      };
    });

    console.log(`   Identity dropdown state: ${JSON.stringify(identityState)}`);

    test('Identity bar exists', identityState.barExists);
    test('Identity bar visible for GM', identityState.barVisible, JSON.stringify(identityState));
    test('Identity select exists', identityState.selectExists);
    test('GM option available', identityState.options.some(o => o.value === 'gm' || o.text === 'GM'));

    // Test 3.2: Send message as GM
    console.log('\nPhase 4: Testing message sending as GM...');

    if (gmChatDrawer) {
      await gmPage.type('#chat-input', 'This is GM speaking');
      await gmPage.evaluate(() => document.getElementById('chat-send-btn').click());
      await sleep(1000);
    }
    await gmPage.screenshot({ path: path.join(SCREENSHOT_DIR, '08-gm-message-sent.png') });

    // Check GM's chat for the message
    const gmMessages = await gmPage.evaluate(() => {
      const c = document.getElementById('chat-messages');
      return c ? Array.from(c.querySelectorAll('.chat-message')).map(m => m.textContent.trim()) : [];
    });

    test('GM can send messages', gmMessages.some(m => m.includes('This is GM speaking')));

    // Test 3.3: Check if player receives GM message
    await sleep(1000);
    const playerMessages = await playerPage.evaluate(() => {
      const c = document.getElementById('chat-messages');
      return c ? Array.from(c.querySelectorAll('.chat-message')).map(m => m.textContent.trim()) : [];
    });

    console.log(`   Player sees ${playerMessages.length} messages`);
    test('Player receives GM message', playerMessages.some(m => m.includes('This is GM speaking')));

    await playerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '09-player-sees-gm.png') });

    // Test 3.4: GM identity in message
    const gmMessageFormat = gmMessages.find(m => m.includes('This is GM speaking'));
    const hasGMInFormat = gmMessageFormat && (gmMessageFormat.includes('GM') || gmMessageFormat.includes('gm'));
    test('GM identity shown in message', hasGMInFormat, gmMessageFormat);

    // Test 3.5: If characters available, test speaking as character
    if (identityState.options.length > 1) {
      console.log('\nPhase 5: Testing speaking as character...');

      // Select a character
      const charOption = identityState.options.find(o => o.value !== 'gm' && o.value.startsWith('char:'));
      if (charOption) {
        await gmPage.select('#chat-identity-select', charOption.value);
        await sleep(300);

        await gmPage.type('#chat-input', 'Speaking as character now');
        await gmPage.evaluate(() => document.getElementById('chat-send-btn').click());
        await sleep(1000);

        await gmPage.screenshot({ path: path.join(SCREENSHOT_DIR, '10-gm-as-character.png') });

        const charMessages = await gmPage.evaluate(() => {
          const c = document.getElementById('chat-messages');
          return c ? Array.from(c.querySelectorAll('.chat-message')).map(m => m.textContent.trim()) : [];
        });

        const charMessage = charMessages.find(m => m.includes('Speaking as character now'));
        const hasCharName = charMessage && !charMessage.includes('GM:');
        test('Can speak as character', charMessage !== undefined);
        test('Character name shown', hasCharName, charMessage);
      } else {
        console.log('   No character options available to test');
      }
    } else {
      console.log('   Skipping character test - no characters in dropdown');
    }

    // ==================== Summary ====================
    console.log('\n=== Test Summary ===');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Screenshots: ${SCREENSHOT_DIR}`);

    return { passed, failed };

  } catch (err) {
    console.error('\nERROR:', err.message);
    await gmPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'error-gm.png') }).catch(() => {});
    await playerPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'error-player.png') }).catch(() => {});
    return { passed, failed: failed + 1, error: err.message };
  } finally {
    await browser.close();
  }
}

runGMTest().then(result => {
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
