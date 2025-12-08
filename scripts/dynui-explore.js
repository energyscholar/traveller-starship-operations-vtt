#!/usr/bin/env node
/**
 * DYNUI Exploration Script
 * Systematically captures screenshots and analyzes UI for enhancement opportunities
 * Uses existing puppeteer-utils patterns
 */

const path = require('path');
const fs = require('fs');

const {
  createPage,
  navigateToOperations,
  getCurrentScreen,
  clickButton,
  waitForScreen,
  gmLogin,
  startSession,
  getBridgeState,
  delay,
  DELAYS
} = require('../tests/e2e/puppeteer-utils');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots', 'dynui-audit');
const PROGRESS_FILE = path.join(__dirname, '..', '.claude', 'DYNUI-PROGRESS.md');

// Ensure directories exist
['gm', 'player', 'shared'].forEach(dir => {
  fs.mkdirSync(path.join(SCREENSHOT_DIR, dir), { recursive: true });
});

const findings = [];

async function screenshot(page, category, name) {
  const filepath = path.join(SCREENSHOT_DIR, category, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  📸 ${category}/${name}.png`);
  return filepath;
}

async function analyzeLayout(page, screenName) {
  const analysis = await page.evaluate(() => {
    const body = document.body;
    const scrollHeight = body.scrollHeight;
    const viewportHeight = window.innerHeight;
    const needsScroll = scrollHeight > viewportHeight + 50;

    // Check for cramped panels
    const panels = document.querySelectorAll('.role-panel, .panel, .detail-section');
    const crampedPanels = [];
    panels.forEach(p => {
      const style = window.getComputedStyle(p);
      const padding = parseInt(style.padding) || 0;
      if (padding < 10) crampedPanels.push(p.className);
    });

    // Check button sizes
    const buttons = document.querySelectorAll('button');
    const smallButtons = [];
    buttons.forEach(b => {
      const rect = b.getBoundingClientRect();
      if (rect.height < 28 || rect.width < 44) {
        smallButtons.push({ text: b.textContent?.substring(0, 20), w: rect.width, h: rect.height });
      }
    });

    // Check for footer
    const footer = document.querySelector('.ops-footer, footer');
    const footerVisible = footer && footer.offsetParent !== null;

    return {
      scrollHeight,
      viewportHeight,
      needsScroll,
      scrollAmount: scrollHeight - viewportHeight,
      crampedPanels: crampedPanels.slice(0, 5),
      smallButtons: smallButtons.slice(0, 5),
      footerVisible
    };
  });

  if (analysis.needsScroll) {
    findings.push({
      screen: screenName,
      issue: 'SCROLL_REQUIRED',
      details: `Content ${analysis.scrollHeight}px exceeds viewport ${analysis.viewportHeight}px by ${analysis.scrollAmount}px`
    });
    console.log(`  ⚠️ SCROLL REQUIRED: ${analysis.scrollAmount}px overflow`);
  }

  if (analysis.smallButtons.length > 0) {
    findings.push({
      screen: screenName,
      issue: 'SMALL_BUTTONS',
      details: analysis.smallButtons
    });
    console.log(`  ⚠️ SMALL BUTTONS: ${analysis.smallButtons.length} buttons under 28px height`);
  }

  return analysis;
}

async function exploreGMFlow(browser) {
  console.log('\n=== GM ROLE EXPLORATION ===\n');
  const { browser: b, page } = await createPage({ headless: true });

  try {
    // 1. Login screen
    console.log('1. Login screen...');
    await navigateToOperations(page);
    await screenshot(page, 'shared', '01-login-screen');
    await analyzeLayout(page, 'login-screen');

    // 2. GM Login - Campaign selection
    console.log('2. Campaign selection...');
    await clickButton(page, 'btn-gm-login');
    await delay(DELAYS.LONG);
    await page.waitForSelector('#campaign-list .campaign-item', { timeout: 5000 }).catch(() => {});
    await screenshot(page, 'gm', '02-campaign-select');
    await analyzeLayout(page, 'campaign-select');

    // 3. Select campaign -> GM Setup
    console.log('3. GM Setup screen...');
    const selectBtn = await page.$('#campaign-list .campaign-item .btn-select');
    if (selectBtn) {
      await selectBtn.click();
      await delay(DELAYS.SOCKET);
    }
    await screenshot(page, 'gm', '03-gm-setup');
    await analyzeLayout(page, 'gm-setup');

    // 4. Start session -> Bridge
    console.log('4. Bridge screen...');
    await startSession(page);
    await delay(DELAYS.LONG);
    await screenshot(page, 'gm', '04-bridge-main');
    await analyzeLayout(page, 'bridge-gm');

    // 5. Scroll to bottom of bridge
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(DELAYS.SHORT);
    await screenshot(page, 'gm', '05-bridge-scrolled');

    // 6. Check for role panel
    console.log('5. Role panel content...');
    const rolePanel = await page.$('.role-panel');
    if (rolePanel) {
      const panelBox = await rolePanel.boundingBox();
      console.log(`  Role panel: ${panelBox?.height || 0}px height`);
    }

    // 7. Open shared map if available
    console.log('6. Shared map...');
    const mapOpened = await clickButton(page, 'btn-open-map');
    if (mapOpened) {
      await delay(DELAYS.LONG);
      await screenshot(page, 'gm', '06-shared-map');
      await analyzeLayout(page, 'shared-map');
      await clickButton(page, 'btn-close-map');
      await delay(DELAYS.SHORT);
    }

    // 8. Try system map
    console.log('7. System map...');
    const systemMapBtn = await page.$('[onclick*="toggleSystemMap"], #btn-system-map');
    if (systemMapBtn) {
      await systemMapBtn.click();
      await delay(DELAYS.LONG);
      await screenshot(page, 'gm', '07-system-map');
      await analyzeLayout(page, 'system-map');
    }

  } finally {
    await b.close();
  }
}

async function explorePlayerRole(roleName) {
  console.log(`\n--- Player Role: ${roleName} ---`);
  const { browser, page } = await createPage({ headless: true });

  try {
    await navigateToOperations(page);
    await delay(DELAYS.SHORT);

    // Player login flow
    await clickButton(page, 'btn-player-login');
    await delay(DELAYS.MEDIUM);

    // Enter campaign code
    const codeInput = await page.$('#join-code');
    if (codeInput) {
      await codeInput.type('DFFFC87E');
      await clickButton(page, 'btn-join');
      await delay(DELAYS.SOCKET);
    }

    // Enter player name
    const nameInput = await page.$('#player-name');
    if (nameInput) {
      await page.evaluate(() => {
        const input = document.querySelector('#player-name');
        if (input) input.value = '';
      });
      await nameInput.type(`Test_${roleName}`);
      await clickButton(page, 'btn-continue');
      await delay(DELAYS.SOCKET);
    }

    // Wait for role selection
    await page.waitForSelector('#role-select-screen.active', { timeout: 5000 }).catch(() => {});

    // Select role
    const roleBtn = await page.$(`[data-role="${roleName}"], button[onclick*="selectRole('${roleName}')"]`);
    if (roleBtn) {
      await roleBtn.click();
      await delay(DELAYS.SOCKET);

      // Screenshot main view
      await screenshot(page, 'player', `${roleName}-01-main`);
      const analysis = await analyzeLayout(page, `${roleName}-panel`);

      // If scrolling needed, capture scrolled view
      if (analysis.needsScroll) {
        await page.evaluate(() => window.scrollTo(0, 500));
        await delay(DELAYS.SHORT);
        await screenshot(page, 'player', `${roleName}-02-scrolled`);
      }
    }

  } catch (e) {
    console.log(`  Error exploring ${roleName}: ${e.message}`);
  } finally {
    await browser.close();
  }
}

function saveFindingsToProgress() {
  let content = fs.readFileSync(PROGRESS_FILE, 'utf8');

  // Add findings
  const findingsText = findings.map(f =>
    `- **${f.screen}**: ${f.issue} - ${typeof f.details === 'string' ? f.details : JSON.stringify(f.details)}`
  ).join('\n');

  content = content.replace('<!-- Each finding gets logged here with timestamp -->', `
**Run: ${new Date().toISOString()}**
${findingsText}
`);

  fs.writeFileSync(PROGRESS_FILE, content);
  console.log(`\n📝 Findings saved to DYNUI-PROGRESS.md`);
}

async function main() {
  console.log('='.repeat(50));
  console.log('DYNUI EXPLORATION - Operations VTT');
  console.log('='.repeat(50));

  try {
    // Explore GM flow
    await exploreGMFlow();

    // Explore first set of player roles
    const roles = ['captain', 'pilot', 'astrogator', 'engineer', 'sensors'];
    for (const role of roles) {
      await explorePlayerRole(role);
    }

    // Save findings
    saveFindingsToProgress();

    console.log('\n=== PHASE 1 EXPLORATION COMPLETE ===');
    console.log(`Screenshots: ${SCREENSHOT_DIR}`);
    console.log(`Findings: ${findings.length}`);

  } catch (e) {
    console.error('Exploration error:', e);
  }
}

main();
