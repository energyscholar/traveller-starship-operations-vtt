#!/usr/bin/env node
const puppeteer = require('puppeteer');
const { navigateToOperations, gmLogin, startSession, delay } = require('./puppeteer-utils');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('dialog', async d => await d.accept());

  await navigateToOperations(page);
  await gmLogin(page);
  await startSession(page);
  await delay(2000);

  const shipInfo = await page.evaluate(() => {
    const ship = window.state?.ship;
    return {
      name: ship?.name,
      template: ship?.template_id,
      shipData: ship?.ship_data,
      weapons: ship?.ship_data?.weapons,
      turrets: ship?.ship_data?.turrets,
      currentState: ship?.current_state
    };
  });

  console.log('=== SHIP INFO ===');
  console.log(JSON.stringify(shipInfo, null, 2));

  await browser.close();
})();
