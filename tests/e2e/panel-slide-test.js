/**
 * Panel Slide Bug Detection Test
 *
 * Detects if panels slide down after load by comparing
 * DOM introspection profiles at initial load vs 2s later.
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

// Introspect an element and return profile
async function introspectElement(page, selector, label) {
  return await page.evaluate(({ selector, label }) => {
    const el = document.querySelector(selector);
    if (!el) return { error: `Element not found: ${selector}` };

    const rect = el.getBoundingClientRect();
    const computed = getComputedStyle(el);

    return {
      label,
      selector,
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right
      },
      offset: {
        top: el.offsetTop,
        left: el.offsetLeft,
        width: el.offsetWidth,
        height: el.offsetHeight
      },
      scroll: {
        top: el.scrollTop,
        left: el.scrollLeft
      },
      computed: {
        position: computed.position,
        transform: computed.transform,
        top: computed.top,
        left: computed.left,
        height: computed.height,
        maxHeight: computed.maxHeight
      }
    };
  }, { selector, label });
}

// Capture full profile of viewscreen hierarchy
async function captureProfile(page) {
  return {
    timestamp: Date.now(),
    viewscreen: await introspectElement(page, '#compact-viewscreen', 'compact-viewscreen'),
    parent: await introspectElement(page, '#status-panels', 'status-panels-row'),
    bridgeMain: await introspectElement(page, '.bridge-main', 'bridge-main'),
    frame: await introspectElement(page, '.viewscreen-frame', 'viewscreen-frame'),
    shipPanel: await introspectElement(page, '#ship-status-panel', 'ship-status-panel')
  };
}

// Compare two profiles and detect changes
function detectSlide(before, after) {
  const issues = [];

  function compareElement(name, b, a) {
    if (b.error || a.error) return;

    // Check if y position changed significantly (slide down)
    const yDiff = a.rect.y - b.rect.y;
    if (Math.abs(yDiff) > 5) {
      issues.push({
        element: name,
        issue: 'Y position changed',
        before: b.rect.y,
        after: a.rect.y,
        diff: yDiff
      });
    }

    // Check if height changed
    const hDiff = a.rect.height - b.rect.height;
    if (Math.abs(hDiff) > 5) {
      issues.push({
        element: name,
        issue: 'Height changed',
        before: b.rect.height,
        after: a.rect.height,
        diff: hDiff
      });
    }

    // Check if transform changed
    if (b.computed.transform !== a.computed.transform) {
      issues.push({
        element: name,
        issue: 'Transform changed',
        before: b.computed.transform,
        after: a.computed.transform
      });
    }

    // Check if top changed
    if (b.computed.top !== a.computed.top) {
      issues.push({
        element: name,
        issue: 'Computed top changed',
        before: b.computed.top,
        after: a.computed.top
      });
    }
  }

  compareElement('viewscreen', before.viewscreen, after.viewscreen);
  compareElement('parent', before.parent, after.parent);
  compareElement('bridgeMain', before.bridgeMain, after.bridgeMain);
  compareElement('frame', before.frame, after.frame);
  compareElement('shipPanel', before.shipPanel, after.shipPanel);

  return issues;
}

async function runTest() {
  console.log('Panel Slide Bug Detection Test');
  console.log('================================\n');

  const browser = await puppeteer.launch({
    headless: false,  // Visible browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 50  // Slow down for visibility
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Load the app
    console.log('Loading app...');
    await page.goto(BASE_URL + '/operations', { waitUntil: 'networkidle0' });

    // Login as GM
    console.log('Logging in as GM...');
    await page.waitForSelector('#btn-gm-login', { timeout: 5000 });
    await page.click('#btn-gm-login');

    // Wait for campaign list and select first campaign
    await page.waitForSelector('.campaign-item', { timeout: 5000 });
    console.log('Selecting campaign...');
    await page.click('.campaign-item');

    // Wait for GM setup screen and start session
    await page.waitForSelector('#btn-start-session', { timeout: 5000 });
    console.log('Starting session...');
    await page.click('#btn-start-session');

    // Wait for bridge screen
    await page.waitForSelector('.bridge-main', { timeout: 10000 });
    console.log('Bridge screen loaded');

    // Wait for panels to initialize
    await new Promise(r => setTimeout(r, 500));

    // Capture initial profile
    console.log('Capturing initial profile...');
    const initialProfile = await captureProfile(page);

    // Wait 2.5 seconds (after potential slide)
    console.log('Waiting 2.5s for potential slide...');
    await new Promise(r => setTimeout(r, 2500));

    // Capture second profile
    console.log('Capturing second profile...');
    const laterProfile = await captureProfile(page);

    // Compare profiles
    const issues = detectSlide(initialProfile, laterProfile);

    console.log('\n========================================');
    console.log('RESULTS');
    console.log('========================================\n');

    if (issues.length === 0) {
      console.log('✅ NO SLIDE DETECTED');
      console.log('All panels maintained their positions.\n');

      // Show current positions
      console.log('Viewscreen Y:', initialProfile.viewscreen.rect?.y?.toFixed(0));
      console.log('Ship Panel Y:', initialProfile.shipPanel.rect?.y?.toFixed(0));
    } else {
      console.log('❌ SLIDE DETECTED - ' + issues.length + ' issues\n');

      for (const issue of issues) {
        console.log(`[${issue.element}] ${issue.issue}`);
        console.log(`  Before: ${issue.before}`);
        console.log(`  After:  ${issue.after}`);
        if (issue.diff !== undefined) {
          console.log(`  Diff:   ${issue.diff > 0 ? '+' : ''}${issue.diff.toFixed(1)}px`);
        }
        console.log('');
      }
    }

    // Output detailed profiles for debugging
    if (process.env.VERBOSE) {
      console.log('\n--- Initial Profile ---');
      console.log(JSON.stringify(initialProfile, null, 2));
      console.log('\n--- Later Profile ---');
      console.log(JSON.stringify(laterProfile, null, 2));
    }

    return issues.length === 0;

  } catch (error) {
    console.error('Test error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  runTest()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runTest };
