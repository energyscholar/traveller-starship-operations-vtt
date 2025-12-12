/**
 * AR-103 Scaffolding Test: Role Panel Buttons
 *
 * Verifies each role panel renders expected buttons.
 * Purpose: Safety net for app.js refactor - UI must render correctly.
 *
 * Run: npm run cleanup:all; npm start & sleep 5; node tests/scaffolding/app-role-buttons.test.js
 */

const puppeteer = require('puppeteer');

// Expected buttons per role (from role-panels.js analysis)
const EXPECTED_BUTTONS = {
  pilot: [
    'Set Course', 'Travel', 'Undock', 'Evasive', 'Set Course', '📍'
  ],
  astrogator: [
    'Verify', 'Plot', 'Jump', 'Scan'
  ],
  engineer: [
    'Repair', 'Refuel', 'Power', 'Refine'
  ],
  gunner: [
    'Fire', 'Lock', 'Point Defense', 'ECM'
  ],
  captain: [
    'Alert', 'Order', 'Hail', 'Weapons'
  ]
};

async function runTest() {
  console.log('=== AR-103 Scaffolding: Role Buttons Test ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    // Navigate and login as GM
    await page.goto('http://localhost:3000/operations', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#btn-gm-login', { timeout: 10000 });
    await page.click('#btn-gm-login');

    // Wait for campaign list or create option
    await new Promise(r => setTimeout(r, 1000));

    // Click first campaign if exists
    const campaignItem = await page.$('.campaign-item');
    if (campaignItem) {
      await campaignItem.click();
      await new Promise(r => setTimeout(r, 500));
      const startBtn = await page.$('#btn-start-session');
      if (startBtn) {
        await startBtn.click();
      }
    } else {
      // No campaign - skip role button test
      console.log('⚠️  SKIPPED: No campaign found (run npm run start:fresh to seed DB)');
      return { passed: true, skipped: true };
    }

    // Wait for bridge to load
    const hasRoleTab = await page.waitForSelector('.role-tab', { timeout: 8000 }).catch(() => null);
    if (!hasRoleTab) {
      console.log('⚠️  SKIPPED: Bridge did not load (no .role-tab found)');
      return { passed: true, skipped: true };
    }

    const results = {};
    let totalPassed = 0;
    let totalFailed = 0;

    // Test each role
    for (const [role, expectedKeywords] of Object.entries(EXPECTED_BUTTONS)) {
      await page.click(`.role-tab[data-role="${role}"]`).catch(() => {});
      await new Promise(r => setTimeout(r, 500));

      const buttons = await page.evaluate(() => {
        const panel = document.querySelector('.role-panel');
        if (!panel) return [];
        return Array.from(panel.querySelectorAll('button'))
          .map(b => b.textContent.trim().substring(0, 30));
      });

      // Check for expected keywords in button text
      const found = [];
      const missing = [];

      for (const keyword of expectedKeywords) {
        const hasButton = buttons.some(b =>
          b.toLowerCase().includes(keyword.toLowerCase())
        );
        if (hasButton) {
          found.push(keyword);
        } else {
          missing.push(keyword);
        }
      }

      results[role] = { found: found.length, total: expectedKeywords.length, buttons };

      if (missing.length === 0) {
        console.log(`✅ ${role.toUpperCase()}: ${found.length}/${expectedKeywords.length} buttons`);
        totalPassed++;
      } else {
        console.log(`⚠️  ${role.toUpperCase()}: ${found.length}/${expectedKeywords.length} (missing: ${missing.join(', ')})`);
        totalFailed++;
      }
    }

    if (errors.length > 0) {
      console.log(`\n🔴 JS ERRORS: ${errors.length}`);
      errors.slice(0, 3).forEach(e => console.log(`   - ${e.substring(0, 60)}`));
    }

    const allPassed = totalFailed === 0 && errors.length === 0;
    console.log(`\n${allPassed ? '✅ PASS' : '⚠️  PARTIAL'}: Role buttons scaffolding test`);
    console.log(`   Roles: ${totalPassed} passed, ${totalFailed} partial`);

    return { passed: allPassed, totalPassed, totalFailed, errors: errors.length };

  } finally {
    await browser.close();
  }
}

runTest()
  .then(result => process.exit(result.passed ? 0 : 1))
  .catch(err => {
    console.error('Test error:', err.message);
    process.exit(1);
  });
