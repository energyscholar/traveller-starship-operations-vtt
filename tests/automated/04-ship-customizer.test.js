/**
 * Stage 12.4: Ship Customizer Test
 * Automated tests for ship customization panels
 */

const { launchBrowser, createPage, TIMEOUTS } = require('./setup');
const { screenshotOnFailure, takeScreenshot } = require('./helpers/screenshots');

describe('04 - Ship Customizer Tests', () => {
  let browser;
  let page;

  // Launch browser before all tests
  beforeAll(async () => {
    browser = await launchBrowser();
  });

  // Close browser after all tests
  afterAll(async () => {
    if (browser) {
      await browser.close();
      console.log('✅ Browser closed');
    }
  });

  // Create fresh page before each test
  beforeEach(async () => {
    page = await createPage(browser);
  });

  // Close page after each test
  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('Can navigate to ship customizer', async () => {
    try {
      // Navigate directly to ship customizer
      await page.goto('http://localhost:3000?mode=customize', {
        waitUntil: 'networkidle0',
        timeout: TIMEOUTS.long
      });

      // Wait for customizer to load
      await page.waitForSelector('#ship-customizer-container', {
        timeout: TIMEOUTS.medium
      });

      await takeScreenshot(page, 'ship-customizer-loaded');

      // Verify key elements are present
      const title = await page.$('#ship-schematic-title');
      expect(title).toBeDefined();

      const shipDisplay = await page.$('#ship-schematic-display');
      expect(shipDisplay).toBeDefined();

      const componentPanel = await page.$('#component-panel-content');
      expect(componentPanel).toBeDefined();

      console.log('✅ Ship customizer loaded successfully');
    } catch (error) {
      await screenshotOnFailure(page, 'ship-customizer-nav-failed');
      throw error;
    }
  });

  test('Can click on ship component', async () => {
    try {
      await page.goto('http://localhost:3000?mode=customize', {
        waitUntil: 'networkidle0',
        timeout: TIMEOUTS.long
      });

      await page.waitForSelector('.clickable-component', {
        timeout: TIMEOUTS.medium
      });

      // Click on first turret
      await page.click('.clickable-component[data-component="turret"]');

      // Wait for panel to open
      await page.waitForSelector('.component-panel-active', {
        timeout: TIMEOUTS.short
      });

      await takeScreenshot(page, 'turret-panel-opened');

      // Verify panel has content
      const panelTitle = await page.$('.panel-title');
      expect(panelTitle).toBeDefined();

      const titleText = await page.evaluate(el => el.textContent, panelTitle);
      expect(titleText).toContain('TURRET');

      console.log('✅ Component panel opened successfully');
    } catch (error) {
      await screenshotOnFailure(page, 'component-click-failed');
      throw error;
    }
  });

  test('Turret panel has correct controls', async () => {
    try {
      await page.goto('http://localhost:3000?mode=customize', {
        waitUntil: 'networkidle0',
        timeout: TIMEOUTS.long
      });

      await page.waitForSelector('.clickable-component[data-component="turret"]');
      await page.click('.clickable-component[data-component="turret"]');
      await page.waitForSelector('.component-panel-active');

      // Check for turret type selector
      const turretTypeSelect = await page.$('select[id^="turret-type-"]');
      expect(turretTypeSelect).toBeDefined();

      // Check for weapon selector
      const weaponSelect = await page.$('select[id^="weapon-"]');
      expect(weaponSelect).toBeDefined();

      // Check for apply button
      const applyButton = await page.$('button.action-button.primary');
      expect(applyButton).toBeDefined();

      await takeScreenshot(page, 'turret-panel-controls');

      console.log('✅ Turret panel has all controls');
    } catch (error) {
      await screenshotOnFailure(page, 'turret-controls-check-failed');
      throw error;
    }
  });

  test('Can change turret type', async () => {
    try {
      await page.goto('http://localhost:3000?mode=customize', {
        waitUntil: 'networkidle0',
        timeout: TIMEOUTS.long
      });

      await page.waitForSelector('.clickable-component[data-component="turret"]');
      await page.click('.clickable-component[data-component="turret"]');
      await page.waitForSelector('.component-panel-active');

      // Find turret type dropdown
      const turretTypeSelect = await page.$('select[id^="turret-type-"]');

      // Change to triple turret
      await page.select('select[id^="turret-type-"]', 'triple');

      // Wait a moment for UI to update
      await page.waitForTimeout(500);

      // Check that weapon slots increased (should have 3 weapon selects)
      const weaponSelects = await page.$$('select[id^="weapon-"]');
      expect(weaponSelects.length).toBe(3);

      await takeScreenshot(page, 'turret-type-changed-to-triple');

      console.log('✅ Turret type change updates weapon slots');
    } catch (error) {
      await screenshotOnFailure(page, 'turret-type-change-failed');
      throw error;
    }
  });

  test('Can click M-Drive component', async () => {
    try {
      await page.goto('http://localhost:3000?mode=customize', {
        waitUntil: 'networkidle0',
        timeout: TIMEOUTS.long
      });

      await page.waitForSelector('.clickable-component[data-component="m-drive"]');
      await page.click('.clickable-component[data-component="m-drive"]');
      await page.waitForSelector('.component-panel-active');

      // Check for thrust slider
      const thrustSlider = await page.$('#thrust-slider');
      expect(thrustSlider).toBeDefined();

      // Check for thrust value display
      const thrustValue = await page.$('#thrust-value');
      expect(thrustValue).toBeDefined();

      await takeScreenshot(page, 'mdrive-panel-opened');

      console.log('✅ M-Drive panel opened with controls');
    } catch (error) {
      await screenshotOnFailure(page, 'mdrive-panel-failed');
      throw error;
    }
  });

  test('Can adjust thrust slider', async () => {
    try {
      await page.goto('http://localhost:3000?mode=customize', {
        waitUntil: 'networkidle0',
        timeout: TIMEOUTS.long
      });

      await page.waitForSelector('.clickable-component[data-component="m-drive"]');
      await page.click('.clickable-component[data-component="m-drive"]');
      await page.waitForSelector('#thrust-slider');

      // Get initial value
      const initialValue = await page.$eval('#thrust-value', el => el.textContent);

      // Change slider value
      await page.$eval('#thrust-slider', el => {
        el.value = '6';
        el.dispatchEvent(new Event('input'));
      });

      // Wait for UI update
      await page.waitForTimeout(300);

      // Check value updated
      const newValue = await page.$eval('#thrust-value', el => el.textContent);
      expect(newValue).toBe('6');
      expect(newValue).not.toBe(initialValue);

      await takeScreenshot(page, 'thrust-slider-adjusted');

      console.log('✅ Thrust slider updates display');
    } catch (error) {
      await screenshotOnFailure(page, 'thrust-slider-failed');
      throw error;
    }
  });

  test('Can click J-Drive component', async () => {
    try {
      await page.goto('http://localhost:3000?mode=customize', {
        waitUntil: 'networkidle0',
        timeout: TIMEOUTS.long
      });

      await page.waitForSelector('.clickable-component[data-component="j-drive"]');
      await page.click('.clickable-component[data-component="j-drive"]');
      await page.waitForSelector('.component-panel-active');

      // Check for jump slider
      const jumpSlider = await page.$('#jump-slider');
      expect(jumpSlider).toBeDefined();

      await takeScreenshot(page, 'jdrive-panel-opened');

      console.log('✅ J-Drive panel opened with controls');
    } catch (error) {
      await screenshotOnFailure(page, 'jdrive-panel-failed');
      throw error;
    }
  });

  test('Can click cargo component', async () => {
    try {
      await page.goto('http://localhost:3000?mode=customize', {
        waitUntil: 'networkidle0',
        timeout: TIMEOUTS.long
      });

      await page.waitForSelector('.clickable-component[data-component="cargo"]');
      await page.click('.clickable-component[data-component="cargo"]');
      await page.waitForSelector('.component-panel-active');

      // Check for cargo slider
      const cargoSlider = await page.$('#cargo-slider');
      expect(cargoSlider).toBeDefined();

      // Check for fuel slider (both should be present)
      const fuelSlider = await page.$('#fuel-slider');
      expect(fuelSlider).toBeDefined();

      await takeScreenshot(page, 'cargo-panel-opened');

      console.log('✅ Cargo panel opened with cargo/fuel controls');
    } catch (error) {
      await screenshotOnFailure(page, 'cargo-panel-failed');
      throw error;
    }
  });

  test('Cost display updates when components change', async () => {
    try {
      await page.goto('http://localhost:3000?mode=customize', {
        waitUntil: 'networkidle0',
        timeout: TIMEOUTS.long
      });

      // Get initial cost
      const initialCost = await page.$eval('#total-cost', el => el.textContent);

      // Click turret and change it
      await page.waitForSelector('.clickable-component[data-component="turret"]');
      await page.click('.clickable-component[data-component="turret"]');
      await page.waitForSelector('.component-panel-active');

      // Change to triple turret
      await page.select('select[id^="turret-type-"]', 'triple');

      // Add a weapon
      const weaponSelects = await page.$$('select[id^="weapon-"]');
      if (weaponSelects.length > 0) {
        await page.select('select[id^="weapon-turret"]', 'pulse_laser');
      }

      // Click apply
      await page.click('button.action-button.primary');

      // Wait for cost update
      await page.waitForTimeout(500);

      // Check cost changed
      const newCost = await page.$eval('#total-cost', el => el.textContent);

      // Cost should be different (we added expensive components)
      expect(newCost).not.toBe(initialCost);

      await takeScreenshot(page, 'cost-updated-after-changes');

      console.log('✅ Cost display updates after modifications');
    } catch (error) {
      await screenshotOnFailure(page, 'cost-update-failed');
      throw error;
    }
  });

  test('Back to menu button works', async () => {
    try {
      await page.goto('http://localhost:3000?mode=customize', {
        waitUntil: 'networkidle0',
        timeout: TIMEOUTS.long
      });

      await page.waitForSelector('#back-to-menu');
      await page.click('#back-to-menu');

      // Wait for navigation
      await page.waitForNavigation({ timeout: TIMEOUTS.medium });

      // Should be back at main menu
      const menuTitle = await page.$('.menu-title');
      expect(menuTitle).toBeDefined();

      await takeScreenshot(page, 'back-to-menu');

      console.log('✅ Back to menu navigation works');
    } catch (error) {
      await screenshotOnFailure(page, 'back-to-menu-failed');
      throw error;
    }
  });
});
