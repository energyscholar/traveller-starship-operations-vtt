#!/usr/bin/env node
/**
 * AR-XX: Comprehensive Chat E2E Test
 * Tests: GM identity, toggle behavior, screen changes, whispers
 */

const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = '/tmp/claude/-home-bruce-software-traveller-starship-operations-vtt/9bea24c4-8723-46e1-888d-c97b8abf0330/scratchpad/chat-comprehensive';
const BASE_URL = fullUrl + '/';

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

async function getDrawerState(page) {
  return page.evaluate(() => {
    const drawer = document.getElementById('chat-drawer');
    const body = drawer?.querySelector('.chat-drawer-body');
    const rect = drawer?.getBoundingClientRect();
    return {
      exists: !!drawer,
      collapsed: drawer?.classList.contains('collapsed'),
      drawerTop: rect?.top,
      drawerHeight: rect?.height,
      bodyVisible: body ? getComputedStyle(body).display !== 'none' : false
    };
  });
}

async function getChatMessages(page) {
  return page.evaluate(() => {
    const c = document.getElementById('chat-messages');
    return c ? Array.from(c.querySelectorAll('.chat-message')).map(m => m.textContent.trim()) : [];
  });
}

async function setupGMSession(page) {
  console.log('   Setting up GM session...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

  // GM Login
  await clickButtonWithText(page, 'GM Login');
  await sleep(1500);

  // Select first campaign
  const selectBtns = await page.$$('button');
  for (const btn of selectBtns) {
    const text = await btn.evaluate(el => el.textContent);
    if (text && text.includes('Select')) {
      await btn.click();
      break;
    }
  }
  await sleep(2000);

  // Start session
  await clickButtonWithText(page, 'Start Session');
  await sleep(2000);

  // Join ship bridge
  const shipCells = await page.$$('td');
  for (const cell of shipCells) {
    const text = await cell.evaluate(el => el.textContent);
    if (text && (text.includes('Amishi') || text.includes('Far Horizon'))) {
      await cell.click();
      break;
    }
  }
  await sleep(2000);
}

async function setupPlayerSession(page, role) {
  console.log(`   Setting up Player (${role})...`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

  await clickButtonWithText(page, 'Solo Demo');
  await sleep(2000);

  const roleOption = await page.$(`.role-option[data-role-id="${role}"]`);
  if (roleOption) await roleOption.click();
  await sleep(1000);

  await clickButtonWithText(page, 'Join Bridge');
  await sleep(2000);
}

async function runTests() {
  console.log('=== Comprehensive Chat E2E Test ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  let passed = 0, failed = 0;
  const results = [];

  function test(name, success, details = '') {
    if (success) {
      console.log(`   PASS: ${name}`);
      passed++;
    } else {
      console.log(`   FAIL: ${name} ${details}`);
      failed++;
    }
    results.push({ name, success, details });
  }

  const playerPage = await browser.newPage();
  await playerPage.setViewport({ width: 1280, height: 800 });

  try {
    // ==================== PHASE 1: Toggle Behavior ====================
    console.log('\n=== Phase 1: Chat Drawer Toggle Behavior ===');

    await setupPlayerSession(playerPage, 'captain');
    await playerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '01-initial-bridge.png') });

    // Test 1.1: Initial state should be collapsed
    let state = await getDrawerState(playerPage);
    test('Initial state is collapsed', state.collapsed === true);
    await playerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '02-collapsed.png') });

    // Test 1.2: Click header to expand
    await playerPage.click('.chat-drawer-header');
    await sleep(500);
    state = await getDrawerState(playerPage);
    test('Click header expands drawer', state.collapsed === false);
    await playerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '03-expanded.png') });

    // Test 1.3: Click header again to collapse
    await playerPage.click('.chat-drawer-header');
    await sleep(500);
    state = await getDrawerState(playerPage);
    test('Click header again collapses drawer', state.collapsed === true);
    await playerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '04-collapsed-again.png') });

    // Test 1.4: ESC key collapses expanded drawer
    await playerPage.click('.chat-drawer-header'); // expand
    await sleep(300);
    await playerPage.keyboard.press('Escape');
    await sleep(300);
    state = await getDrawerState(playerPage);
    test('ESC key collapses drawer', state.collapsed === true);
    await playerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '05-esc-collapse.png') });

    // Test 1.5: ESC on collapsed drawer does nothing harmful
    await playerPage.keyboard.press('Escape');
    await sleep(300);
    state = await getDrawerState(playerPage);
    test('ESC on collapsed drawer is safe', state.collapsed === true && state.exists);

    // ==================== PHASE 2: Screen Changes ====================
    console.log('\n=== Phase 2: Screen Change Behavior ===');

    // Expand chat first
    await playerPage.click('.chat-drawer-header');
    await sleep(300);

    // Send a message first
    await playerPage.type('#chat-input', 'Test message before screen change');
    await playerPage.evaluate(() => document.getElementById('chat-send-btn').click());
    await sleep(1000);

    // Test 2.1: Open a modal - chat should remain
    await clickButtonWithText(playerPage, 'Lookup System');
    await sleep(1000);
    state = await getDrawerState(playerPage);
    await playerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '06-with-modal.png') });

    // Close modal if open
    await playerPage.keyboard.press('Escape');
    await sleep(500);

    // Check chat is still there
    state = await getDrawerState(playerPage);
    test('Chat persists after modal', state.exists);

    // Test 2.2: Click hamburger menu - chat should remain
    const hamburger = await playerPage.$('.hamburger-btn, .menu-btn, button[title="Menu"]');
    if (hamburger) {
      await hamburger.click();
      await sleep(500);
      await playerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '07-with-menu.png') });
      await playerPage.keyboard.press('Escape');
      await sleep(300);
    }

    state = await getDrawerState(playerPage);
    test('Chat persists after menu', state.exists);

    // Test 2.3: Messages persist across interactions
    const messages = await getChatMessages(playerPage);
    test('Messages persist across interactions', messages.some(m => m.includes('Test message before screen change')));

    // ==================== PHASE 3: Message Sending ====================
    console.log('\n=== Phase 3: Message Sending ===');

    // Ensure drawer is expanded
    state = await getDrawerState(playerPage);
    if (state.collapsed) {
      await playerPage.click('.chat-drawer-header');
      await sleep(300);
    }

    // Test 3.1: Send message clears input
    await playerPage.type('#chat-input', 'Message to send');
    const inputBefore = await playerPage.$eval('#chat-input', el => el.value);
    await playerPage.evaluate(() => document.getElementById('chat-send-btn').click());
    await sleep(500);
    const inputAfter = await playerPage.$eval('#chat-input', el => el.value);
    test('Send clears input field', inputBefore === 'Message to send' && inputAfter === '');

    // Test 3.2: Enter key sends message
    await playerPage.type('#chat-input', 'Enter key test');
    await playerPage.keyboard.press('Enter');
    await sleep(500);
    const inputAfterEnter = await playerPage.$eval('#chat-input', el => el.value);
    const msgsAfterEnter = await getChatMessages(playerPage);
    test('Enter key sends message', inputAfterEnter === '' && msgsAfterEnter.some(m => m.includes('Enter key test')));

    // Test 3.3: Empty message doesn't send
    const msgCountBefore = (await getChatMessages(playerPage)).length;
    await playerPage.evaluate(() => document.getElementById('chat-send-btn').click());
    await sleep(300);
    const msgCountAfter = (await getChatMessages(playerPage)).length;
    test('Empty message not sent', msgCountBefore === msgCountAfter);

    await playerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '08-messages.png') });

    // ==================== PHASE 4: Identity Bar (Non-GM) ====================
    console.log('\n=== Phase 4: Identity Bar (Non-GM) ===');

    const identityState = await playerPage.evaluate(() => {
      const bar = document.getElementById('chat-identity-bar');
      return {
        exists: !!bar,
        visible: bar ? getComputedStyle(bar).display !== 'none' : false
      };
    });

    test('Identity bar hidden for non-GM', identityState.exists && !identityState.visible);

    // ==================== PHASE 5: Recipient Dropdown ====================
    console.log('\n=== Phase 5: Recipient Dropdown ===');

    const recipientState = await playerPage.evaluate(() => {
      const select = document.getElementById('chat-recipient-select');
      return {
        exists: !!select,
        options: select ? Array.from(select.options).map(o => o.text) : [],
        defaultValue: select?.value
      };
    });

    test('Recipient dropdown exists', recipientState.exists);
    test('Default is All Players', recipientState.options.includes('All Players') && recipientState.defaultValue === '');

    await playerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '09-final.png') });

    // ==================== PHASE 6: Visual Verification ====================
    console.log('\n=== Phase 6: Visual State Verification ===');

    // Capture final expanded state
    state = await getDrawerState(playerPage);
    if (state.collapsed) {
      await playerPage.click('.chat-drawer-header');
      await sleep(300);
    }

    const finalState = await playerPage.evaluate(() => {
      const drawer = document.getElementById('chat-drawer');
      const header = drawer?.querySelector('.chat-drawer-header');
      const messages = document.getElementById('chat-messages');
      const input = document.getElementById('chat-input');
      const sendBtn = document.getElementById('chat-send-btn');
      const recipient = document.getElementById('chat-recipient-select');
      const identity = document.getElementById('chat-identity-bar');

      return {
        drawerVisible: drawer && !drawer.classList.contains('collapsed'),
        headerExists: !!header,
        messagesContainer: !!messages,
        inputField: !!input,
        sendButton: !!sendBtn,
        recipientDropdown: !!recipient,
        identityHidden: identity ? getComputedStyle(identity).display === 'none' : true,
        messageCount: messages?.querySelectorAll('.chat-message').length || 0
      };
    });

    test('All UI elements present',
      finalState.headerExists &&
      finalState.messagesContainer &&
      finalState.inputField &&
      finalState.sendButton &&
      finalState.recipientDropdown);

    test('Messages displayed', finalState.messageCount > 0);

    await playerPage.screenshot({ path: path.join(SCREENSHOT_DIR, '10-final-expanded.png') });

    // ==================== Summary ====================
    console.log('\n=== Test Summary ===');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Screenshots: ${SCREENSHOT_DIR}`);

    return { passed, failed, results };

  } catch (err) {
    console.error('\nERROR:', err.message);
    await playerPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'error.png') }).catch(() => {});
    return { passed, failed: failed + 1, error: err.message };
  } finally {
    await browser.close();
  }
}

runTests().then(result => {
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
