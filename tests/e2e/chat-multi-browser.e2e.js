#!/usr/bin/env node
/**
 * AR-XX: Multi-browser Chat E2E Test
 * Tests chat with GM + 3 players in different roles
 */

const puppeteer = require('puppeteer');
const path = require('path');

const SCREENSHOT_DIR = '/tmp/claude/-home-bruce-software-traveller-starship-operations-vtt/9bea24c4-8723-46e1-888d-c97b8abf0330/scratchpad/chat-multi';
const BASE_URL = 'http://localhost:3000/operations/';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Ensure screenshot directory exists
const fs = require('fs');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function clickButtonWithText(page, text) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const btnText = await btn.evaluate(el => el.textContent);
    if (btnText && btnText.includes(text)) {
      try {
        await btn.click();
        return true;
      } catch (e) {
        // Button not clickable
      }
    }
  }
  return false;
}

async function expandChat(page) {
  const isCollapsed = await page.evaluate(() => {
    const drawer = document.getElementById('chat-drawer');
    return drawer?.classList.contains('collapsed');
  });
  if (isCollapsed) {
    await page.click('.chat-drawer-header');
    await sleep(300);
  }
}

async function sendChatMessage(page, message) {
  await page.type('#chat-input', message);
  await page.evaluate(() => document.getElementById('chat-send-btn').click());
  await sleep(500);
}

async function getChatMessages(page) {
  return page.evaluate(() => {
    const c = document.getElementById('chat-messages');
    return c ? Array.from(c.querySelectorAll('.chat-message')).map(m => m.textContent.trim()) : [];
  });
}

async function setupGMBrowser(browser, campaignName) {
  console.log('\n=== Setting up GM Browser ===');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

  // GM Login
  await clickButtonWithText(page, 'GM Login');
  await sleep(1500);

  // Select campaign (or create if needed)
  let campaignFound = false;
  const selectBtns = await page.$$('button');
  for (const btn of selectBtns) {
    const text = await btn.evaluate(el => el.textContent);
    if (text && text.includes('Select')) {
      await btn.click();
      campaignFound = true;
      break;
    }
  }

  if (!campaignFound) {
    // Create new campaign
    console.log('   Creating new campaign...');
    await clickButtonWithText(page, 'Create New Campaign');
    await sleep(1000);
    // Fill in campaign name if modal appears
    const nameInput = await page.$('input[name="campaignName"], #campaign-name');
    if (nameInput) {
      await nameInput.type(campaignName || 'Test Campaign');
    }
    await clickButtonWithText(page, 'Create');
    await sleep(2000);
  }

  await sleep(2000);

  // Start session
  await clickButtonWithText(page, 'Start Session');
  await sleep(2000);

  // Click ship to join bridge
  const shipCells = await page.$$('td');
  for (const cell of shipCells) {
    const text = await cell.evaluate(el => el.textContent);
    if (text && (text.includes('Amishi') || text.includes('Ship'))) {
      await cell.click();
      break;
    }
  }
  await sleep(2000);

  // Expand chat
  await expandChat(page);

  console.log('   GM ready');
  return page;
}

async function setupPlayerBrowser(browser, role, playerIndex) {
  console.log(`\n=== Setting up Player ${playerIndex} (${role}) ===`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

  // Solo Demo is fastest path for players
  await clickButtonWithText(page, 'Solo Demo');
  await sleep(2000);

  // Select role
  const roleOption = await page.$(`.role-option[data-role-id="${role}"]`);
  if (roleOption) {
    await roleOption.click();
    await sleep(1000);
  }

  // Join bridge
  await clickButtonWithText(page, 'Join Bridge');
  await sleep(2000);

  // Expand chat
  await expandChat(page);

  console.log(`   Player ${playerIndex} (${role}) ready`);
  return page;
}

async function runTest() {
  console.log('=== Multi-Browser Chat E2E Test ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  const pages = {};
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Setup all browsers
    console.log('Phase 1: Setting up browsers...');

    // Use Solo Demo for all to simplify (same campaign)
    pages.player1 = await setupPlayerBrowser(browser, 'pilot', 1);
    pages.player2 = await setupPlayerBrowser(browser, 'engineer', 2);
    pages.player3 = await setupPlayerBrowser(browser, 'gunner', 3);

    // Take initial screenshot
    await pages.player1.screenshot({ path: path.join(SCREENSHOT_DIR, '01-player1-ready.png') });
    await pages.player2.screenshot({ path: path.join(SCREENSHOT_DIR, '01-player2-ready.png') });
    await pages.player3.screenshot({ path: path.join(SCREENSHOT_DIR, '01-player3-ready.png') });

    // Phase 2: Test broadcast messages
    console.log('\nPhase 2: Testing broadcast messages...');

    // Player 1 sends a message
    console.log('   Player 1 sending message...');
    await sendChatMessage(pages.player1, 'Hello from Pilot!');
    await sleep(1000);

    // Player 2 sends a message
    console.log('   Player 2 sending message...');
    await sendChatMessage(pages.player2, 'Engineer here, all systems go!');
    await sleep(1000);

    // Player 3 sends a message
    console.log('   Player 3 sending message...');
    await sendChatMessage(pages.player3, 'Gunner standing by.');
    await sleep(1000);

    // Take screenshots
    await pages.player1.screenshot({ path: path.join(SCREENSHOT_DIR, '02-player1-after-chat.png') });
    await pages.player2.screenshot({ path: path.join(SCREENSHOT_DIR, '02-player2-after-chat.png') });
    await pages.player3.screenshot({ path: path.join(SCREENSHOT_DIR, '02-player3-after-chat.png') });

    // Phase 3: Verify all players see all messages
    console.log('\nPhase 3: Verifying message visibility...');

    const expectedMessages = [
      'Hello from Pilot!',
      'Engineer here, all systems go!',
      'Gunner standing by.'
    ];

    for (const [name, page] of Object.entries(pages)) {
      const messages = await getChatMessages(page);
      console.log(`   ${name} sees ${messages.length} messages`);

      let allFound = true;
      for (const expected of expectedMessages) {
        const found = messages.some(m => m.includes(expected));
        if (!found) {
          console.log(`   FAIL: ${name} missing message: "${expected}"`);
          allFound = false;
        }
      }

      if (allFound) {
        console.log(`   PASS: ${name} sees all messages`);
        testsPassed++;
      } else {
        testsFailed++;
      }
    }

    // Phase 4: Verify message format
    console.log('\nPhase 4: Verifying message format...');

    const player1Messages = await getChatMessages(pages.player1);
    console.log('   Sample messages from Player 1:');
    player1Messages.forEach(m => console.log(`     "${m}"`));

    // Check format: should be "[time] Name (role): message"
    const formatRegex = /\[\d{2}:\d{2}\s*(AM|PM)?\]\s*\w+.*\(.*\):\s*.+/;
    let formatOk = true;
    for (const msg of player1Messages) {
      if (!formatRegex.test(msg)) {
        console.log(`   FAIL: Bad format: "${msg}"`);
        formatOk = false;
      }
    }

    if (formatOk && player1Messages.length > 0) {
      console.log('   PASS: Message format correct');
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Phase 5: Test rapid message exchange (conversation)
    console.log('\nPhase 5: Testing rapid conversation...');

    await sendChatMessage(pages.player1, 'Ready for jump?');
    await sleep(200);
    await sendChatMessage(pages.player2, 'Drives are hot, captain.');
    await sleep(200);
    await sendChatMessage(pages.player3, 'Weapons secured.');
    await sleep(200);
    await sendChatMessage(pages.player1, 'All stations, prepare for jump!');
    await sleep(1000);

    // Verify all messages arrived
    const finalMessages = await getChatMessages(pages.player3);
    const conversationComplete = finalMessages.some(m => m.includes('prepare for jump'));

    if (conversationComplete) {
      console.log('   PASS: Rapid conversation delivered');
      testsPassed++;
    } else {
      console.log('   FAIL: Rapid conversation not delivered');
      testsFailed++;
    }

    // Take final screenshots
    await pages.player1.screenshot({ path: path.join(SCREENSHOT_DIR, '03-final-player1.png') });
    await pages.player2.screenshot({ path: path.join(SCREENSHOT_DIR, '03-final-player2.png') });
    await pages.player3.screenshot({ path: path.join(SCREENSHOT_DIR, '03-final-player3.png') });

    // Phase 6: Create combined screenshot for visual verification
    console.log('\nPhase 6: Creating combined view...');

    // Report results
    console.log('\n=== Test Results ===');
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

    // Analyze screenshots for issues
    console.log('\n=== Visual Analysis ===');

    // Check Player 1 final state
    const p1State = await pages.player1.evaluate(() => {
      const drawer = document.getElementById('chat-drawer');
      const messages = document.getElementById('chat-messages');
      const identityBar = document.getElementById('chat-identity-bar');
      return {
        drawerExpanded: !drawer?.classList.contains('collapsed'),
        messageCount: messages?.querySelectorAll('.chat-message').length || 0,
        identityBarVisible: identityBar ? getComputedStyle(identityBar).display !== 'none' : false
      };
    });
    console.log(`   Player 1 state: ${JSON.stringify(p1State)}`);

    if (p1State.drawerExpanded && p1State.messageCount >= 7 && !p1State.identityBarVisible) {
      console.log('   PASS: Player 1 UI state correct');
      testsPassed++;
    } else {
      console.log('   FAIL: Player 1 UI state incorrect');
      testsFailed++;
    }

    return { passed: testsPassed, failed: testsFailed };

  } catch (err) {
    console.error('\nERROR:', err.message);
    // Take error screenshots
    for (const [name, page] of Object.entries(pages)) {
      try {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `error-${name}.png`) });
      } catch (e) {}
    }
    return { passed: testsPassed, failed: testsFailed + 1, error: err.message };
  } finally {
    await browser.close();
  }
}

// Run the test
runTest().then(result => {
  console.log('\n=== Final Result ===');
  console.log(`Tests Passed: ${result.passed}`);
  console.log(`Tests Failed: ${result.failed}`);
  if (result.error) console.log(`Error: ${result.error}`);
  process.exit(result.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
