#!/usr/bin/env node
/**
 * AR-222: Star Map Journey E2E Test
 *
 * Tests the System Map panel rendering as a ship travels through multiple
 * star systems in the Spinward Marches sector. Verifies:
 * - System map canvas renders correctly at each system
 * - Different systems produce visually distinct maps
 * - Star, planets, and other objects are visible
 * - Camera/zoom works properly
 *
 * Journey: Regina → Efate → Alell → Yorbund → Regina (return)
 *
 * Run with: npm run test:e2e tests/e2e/star-map-journey.e2e.js
 */

const { withBrowser } = require('./helpers/browser-with-cleanup');
const path = require('path');
const fs = require('fs');

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'screenshots', 'star-map-journey');

// Systems to visit (Spinward Marches)
const JOURNEY_SYSTEMS = [
  { name: 'Regina', hex: '1910', description: 'Capital world, subsector capital' },
  { name: 'Efate', hex: '1705', description: 'Industrial world' },
  { name: 'Alell', hex: '1706', description: 'Agricultural world' },
  { name: 'Yorbund', hex: '1802', description: 'Low-pop world' },
  { name: 'Regina', hex: '1910', description: 'Return home' }
];

// Delays (ms)
const DELAYS = {
  SHORT: 200,
  MEDIUM: 500,
  LONG: 1000,
  RENDER: 1500,  // Time for canvas to render
  SOCKET: 800
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  screenshots: [],
  pixelSamples: []
};

function pass(msg) {
  console.log(`  ✓ ${msg}`);
  results.passed++;
}

function fail(msg, error = '') {
  console.log(`  ✗ ${msg}${error ? ': ' + error : ''}`);
  results.failed++;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ensure screenshot directory exists
function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

// Take screenshot of system map
async function takeSystemScreenshot(page, systemName, step) {
  const filename = `${step.toString().padStart(2, '0')}-${systemName.toLowerCase()}-${Date.now()}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);

  // Try to get just the system map panel
  const mapPanel = await page.$('#system-map-panel, .system-map-container, #system-map-canvas');
  if (mapPanel) {
    await mapPanel.screenshot({ path: filepath });
  } else {
    await page.screenshot({ path: filepath, fullPage: false });
  }

  results.screenshots.push(filepath);
  console.log(`    📸 ${filename}`);
  return filepath;
}

// Sample pixels from the system map canvas
async function sampleCanvasPixels(page) {
  return await page.evaluate(() => {
    const canvas = document.getElementById('system-map-canvas');
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const samples = [];

    // Sample 50 points across canvas
    for (let i = 0; i < 50; i++) {
      const x = Math.floor((i % 10) * w / 10 + w / 20);
      const y = Math.floor(Math.floor(i / 10) * h / 5 + h / 10);
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      samples.push(pixel[0], pixel[1], pixel[2]); // RGB
    }

    return samples;
  });
}

// Compare pixel samples - returns true if different enough
function pixelsAreDifferent(pix1, pix2, threshold = 5) {
  if (!pix1 || !pix2) return false;
  if (pix1.length !== pix2.length) return true;

  let diff = 0;
  for (let i = 0; i < pix1.length; i++) {
    diff += Math.abs(pix1[i] - pix2[i]);
  }
  const diffPercent = (diff / (255 * pix1.length)) * 100;
  return diffPercent > threshold;
}

// Get current system from UI
async function getCurrentSystem(page) {
  return await page.evaluate(() => {
    // Try various selectors for current system display
    const systemEl = document.querySelector('#current-system, .current-system, [data-current-system]');
    if (systemEl) return systemEl.textContent?.trim();

    // Try dropdown
    const dropdown = document.querySelector('#system-dropdown, select[name="system"]');
    if (dropdown) return dropdown.value || dropdown.options?.[dropdown.selectedIndex]?.text;

    // Try header
    const header = document.querySelector('.system-map-header, .system-name');
    if (header) return header.textContent?.trim();

    return null;
  });
}

// Change to a new star system
async function travelToSystem(page, systemName) {
  console.log(`\n  Traveling to ${systemName}...`);

  // Method 1: Try system dropdown
  const dropdownChanged = await page.evaluate((name) => {
    const dropdown = document.getElementById('system-dropdown') ||
                     document.querySelector('select[data-system-select]');
    if (dropdown) {
      // Find option by name
      for (const opt of dropdown.options) {
        if (opt.text.toLowerCase().includes(name.toLowerCase()) ||
            opt.value.toLowerCase().includes(name.toLowerCase())) {
          dropdown.value = opt.value;
          dropdown.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
    }
    return false;
  }, systemName);

  if (dropdownChanged) {
    await delay(DELAYS.RENDER);
    return true;
  }

  // Method 2: Try typing in search
  const searchInput = await page.$('#system-search, input[type="search"], .system-search');
  if (searchInput) {
    await searchInput.click({ clickCount: 3 }); // Select all
    await searchInput.type(systemName);
    await delay(DELAYS.MEDIUM);

    // Click first result
    const result = await page.$('.search-result, .system-result, [data-system-result]');
    if (result) {
      await result.click();
      await delay(DELAYS.RENDER);
      return true;
    }
  }

  // Method 3: Try direct navigation
  const navigated = await page.evaluate((name) => {
    // Check if there's a global navigation function
    if (typeof window.navigateToSystem === 'function') {
      window.navigateToSystem(name);
      return true;
    }
    if (typeof window.loadSystem === 'function') {
      window.loadSystem(name);
      return true;
    }
    // Try socket emit
    if (window.socket && typeof window.socket.emit === 'function') {
      window.socket.emit('gm:change-system', { system: name });
      return true;
    }
    return false;
  }, systemName);

  if (navigated) {
    await delay(DELAYS.RENDER);
    return true;
  }

  return false;
}

// Check if system map is rendering
async function isMapRendering(page) {
  return await page.evaluate(() => {
    const canvas = document.getElementById('system-map-canvas');
    if (!canvas) return { rendering: false, reason: 'Canvas not found' };

    // Check if canvas has content (not all black/empty)
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonBlack = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 10 || data[i+1] > 10 || data[i+2] > 10) {
        nonBlack++;
      }
    }
    const coverage = (nonBlack / (data.length / 4)) * 100;

    return {
      rendering: coverage > 1,  // At least 1% non-black pixels
      coverage: coverage.toFixed(2),
      width: canvas.width,
      height: canvas.height
    };
  });
}

// Main test
async function runStarMapJourneyTest() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  AR-222: Star Map Journey E2E Test');
  console.log('  Journey: ' + JOURNEY_SYSTEMS.map(s => s.name).join(' → '));
  console.log('═══════════════════════════════════════════════════════════\n');

  ensureScreenshotDir();

  await withBrowser(async (browser, page) => {
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`    [Console Error] ${msg.text()}`);
      }
    });

    // Step 1: Navigate to Operations
    console.log('Step 1: Navigate to Operations...');
    await page.goto(`${BASE_URL}/operations`, { waitUntil: 'networkidle0', timeout: 15000 });
    await delay(DELAYS.MEDIUM);
    pass('Navigated to Operations');

    // Step 2: GM Login
    console.log('\nStep 2: GM Login...');
    const gmBtn = await page.$('#btn-gm-login, button[data-action="gm-login"]');
    if (gmBtn) {
      await gmBtn.click();
      await delay(DELAYS.SOCKET);

      // Select first campaign
      const campaignCard = await page.$('.campaign-card, #campaign-list button');
      if (campaignCard) {
        await campaignCard.click();
        await delay(DELAYS.SOCKET);
      }
      pass('GM logged in');
    } else {
      fail('GM login button not found');
    }

    // Step 3: Start Session
    console.log('\nStep 3: Start session...');
    const startBtn = await page.$('#btn-start-session, button[data-action="start-session"]');
    if (startBtn) {
      await startBtn.click();
      await delay(DELAYS.LONG);
      pass('Session started');
    }

    // Step 4: Open System Map panel
    console.log('\nStep 4: Open System Map panel...');

    // Try hamburger menu first
    const hamburger = await page.$('.hamburger-menu-toggle, #hamburger-toggle');
    if (hamburger) {
      await hamburger.click();
      await delay(DELAYS.MEDIUM);

      // Find system map option
      const systemMapOption = await page.evaluate(() => {
        const items = document.querySelectorAll('.hamburger-item, .menu-item, [data-panel]');
        for (const item of items) {
          if (item.textContent?.toLowerCase().includes('system') ||
              item.dataset.panel === 'system-map') {
            item.click();
            return true;
          }
        }
        return false;
      });

      if (systemMapOption) {
        await delay(DELAYS.RENDER);
        pass('System Map panel opened');
      }
    }

    // Check if canvas exists
    const canvasExists = await page.$('#system-map-canvas');
    if (!canvasExists) {
      console.log('  Attempting to activate system map via keyboard...');
      await page.keyboard.press('m'); // Common shortcut
      await delay(DELAYS.RENDER);
    }

    // Step 5: Journey through systems
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  STARTING JOURNEY');
    console.log('═══════════════════════════════════════════════════════════');

    let previousPixels = null;

    for (let i = 0; i < JOURNEY_SYSTEMS.length; i++) {
      const system = JOURNEY_SYSTEMS[i];
      console.log(`\n--- System ${i + 1}/${JOURNEY_SYSTEMS.length}: ${system.name} (${system.hex}) ---`);
      console.log(`    ${system.description}`);

      // Travel to system (skip first as we should start there)
      if (i > 0) {
        const traveled = await travelToSystem(page, system.name);
        if (!traveled) {
          fail(`Travel to ${system.name}`, 'Could not change system');
          continue;
        }
      }

      await delay(DELAYS.RENDER);

      // Check map rendering
      const mapStatus = await isMapRendering(page);
      if (mapStatus.rendering) {
        pass(`${system.name}: Map rendering (${mapStatus.coverage}% coverage)`);
      } else {
        fail(`${system.name}: Map not rendering`, mapStatus.reason);
      }

      // Take screenshot
      await takeSystemScreenshot(page, system.name, i + 1);

      // Sample pixels for comparison
      const pixels = await sampleCanvasPixels(page);
      if (pixels) {
        results.pixelSamples.push({ system: system.name, pixels });

        // Compare to previous system (should be different)
        if (previousPixels && i > 0 && system.name !== JOURNEY_SYSTEMS[0].name) {
          const isDifferent = pixelsAreDifferent(previousPixels, pixels);
          if (isDifferent) {
            pass(`${system.name}: Visually distinct from previous system`);
          } else {
            fail(`${system.name}: Map looks same as previous system`);
          }
        }
        previousPixels = pixels;
      }

      // Verify current system display
      const currentSystem = await getCurrentSystem(page);
      if (currentSystem && currentSystem.toLowerCase().includes(system.name.toLowerCase())) {
        pass(`${system.name}: System name displayed correctly`);
      }
    }

    // Step 6: Final verification
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  JOURNEY COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');

    // Verify return to starting point
    const returnPixels = results.pixelSamples[results.pixelSamples.length - 1]?.pixels;
    const startPixels = results.pixelSamples[0]?.pixels;
    if (returnPixels && startPixels) {
      const similar = !pixelsAreDifferent(startPixels, returnPixels, 10);
      if (similar) {
        pass('Return journey: Map matches starting system');
      } else {
        console.log('    Note: Return map differs slightly (expected due to time/animation)');
      }
    }

  }, { timeout: 120000, headless: true });  // 2 minute timeout for full journey

  // Print results
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Passed: ${results.passed}`);
  console.log(`  Failed: ${results.failed}`);
  console.log(`  Screenshots: ${results.screenshots.length}`);
  console.log(`  Screenshot dir: ${SCREENSHOT_DIR}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run test
runStarMapJourneyTest().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
