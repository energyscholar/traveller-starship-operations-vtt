#!/usr/bin/env node
/**
 * DYNUI Player Role Screenshot Capture
 * Captures screenshots of each player role panel
 */

const path = require('path');
const fs = require('fs');
const {
  createPage,
  navigateToOperations,
  clickButton,
  delay,
  DELAYS,
  gmLogin,
  startSession
} = require('../tests/e2e/puppeteer-utils');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots', 'dynui-audit', 'player');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const ROLES = ['captain', 'pilot', 'astrogator', 'engineer', 'sensors', 'gunner', 'medic', 'steward', 'cargo', 'damage_control'];

async function captureRoleScreenshot(roleName) {
  console.log(`\n📸 Capturing: ${roleName}`);
  const { browser, page } = await createPage({ headless: true });

  try {
    // Navigate and GM login to start session first
    await navigateToOperations(page);
    await gmLogin(page);
    await startSession(page);
    await delay(DELAYS.LONG);

    // Now select the role
    const roleBtn = await page.$(`[data-role="${roleName}"]`);
    if (roleBtn) {
      await roleBtn.click();
      await delay(DELAYS.SOCKET);

      // Capture screenshot
      const filepath = path.join(SCREENSHOT_DIR, `${roleName}-panel.png`);
      await page.screenshot({ path: filepath, fullPage: true });
      console.log(`  ✓ Saved: ${roleName}-panel.png`);

      // Analyze
      const analysis = await page.evaluate(() => {
        return {
          scrollHeight: document.body.scrollHeight,
          viewportHeight: window.innerHeight,
          needsScroll: document.body.scrollHeight > window.innerHeight + 50
        };
      });

      if (analysis.needsScroll) {
        console.log(`  ⚠️ SCROLL: ${analysis.scrollHeight - analysis.viewportHeight}px overflow`);
      } else {
        console.log(`  ✓ Single-page: fits viewport`);
      }
    } else {
      console.log(`  ✗ Role button not found for: ${roleName}`);
    }

  } catch (e) {
    console.log(`  Error: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('DYNUI Player Role Screenshots');
  console.log('='.repeat(50));

  for (const role of ROLES) {
    await captureRoleScreenshot(role);
  }

  console.log('\n✅ Done. Screenshots in:', SCREENSHOT_DIR);
}

main();
